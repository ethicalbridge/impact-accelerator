// Identity checks with Didit (hosted passport/ID document + live selfie + face match).
//
//   POST {"action":"start"}  (signed-in user)  -> creates a Didit session and returns {url} to send the person to
//   POST {"action":"check"}  (signed-in user)  -> refreshes the person's latest session from Didit
//   POST <Didit webhook>     (no user)         -> refreshes the session named in the webhook
//
// We never trust a status sent to us: every update fetches the decision from Didit with our secret key.
// Only the outcome and the name on the document are stored. Images, document numbers and dates of birth stay with Didit.
// Needs the secrets DIDIT_API_KEY and DIDIT_WORKFLOW_ID (Supabase → Edge Functions → Secrets).
import { createClient } from "jsr:@supabase/supabase-js@2";

const SITE = Deno.env.get("SITE_URL") ?? "https://handova.org/";
const API = "https://verification.didit.me/v3";
const KEY = Deno.env.get("DIDIT_API_KEY") ?? "";
const WORKFLOW = Deno.env.get("DIDIT_WORKFLOW_ID") ?? "";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Names match when the profile's first and last names both appear on the document (accents and case ignored).
const words = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z]+/).filter((w) => w.length > 1);
function namesMatch(profileName: string, docName: string) {
  const p = words(profileName), d = new Set(words(docName));
  if (!p.length || !d.size) return false;
  return d.has(p[0]) && d.has(p[p.length - 1]);
}

async function refresh(sessionId: string) {
  const { data: row } = await db.from("id_verifications").select("id,user_id").eq("session_id", sessionId).maybeSingle();
  if (!row) return { error: "Unknown session" };
  const r = await fetch(`${API}/session/${encodeURIComponent(sessionId)}/decision/`, { headers: { "x-api-key": KEY } });
  if (!r.ok) return { error: "Could not reach the identity service", status: r.status };
  const d = await r.json();
  const status: string = d.status ?? "";
  const idv = Array.isArray(d.id_verifications) ? d.id_verifications[0] : null;
  const docName: string = (idv?.full_name || [idv?.first_name, idv?.last_name].filter(Boolean).join(" ") || "").toString().slice(0, 160);
  await db.from("id_verifications").update({ status, document_name: docName, updated_at: new Date().toISOString() }).eq("id", row.id);

  const { data: prof } = await db.from("profiles").select("name,id_status").eq("user_id", row.user_id).maybeSingle();
  if (prof?.id_status === "approved") return { status: "approved" }; // never downgrade a confirmed check
  let idStatus = "started";
  if (status === "Approved") idStatus = prof && namesMatch(prof.name, docName) ? "approved" : "name_mismatch";
  else if (status === "Declined") idStatus = "declined";
  else if (status === "In Review") idStatus = "in_review";
  if (prof && prof.id_status !== idStatus) {
    await db.from("profiles").update({ id_status: idStatus, id_document_name: docName, id_verified_at: idStatus === "approved" ? new Date().toISOString() : null }).eq("user_id", row.user_id);
    const msg: Record<string, [string, string]> = {
      approved: ["Your identity is verified", "Thank you. Your profile now shows ID verified."],
      declined: ["We could not verify your identity", "Please try again with a clear photo of a valid passport or ID card, or write to hello@handova.org."],
      in_review: ["Your identity check is being reviewed", "This usually takes less than a day. We will let you know."],
      name_mismatch: ["We are checking your identity", "The name on your document differs from your profile name. An administrator will review it shortly."],
    };
    if (msg[idStatus]) await db.from("notifications").insert({ user_id: row.user_id, kind: "id_check", title: msg[idStatus][0], body: msg[idStatus][1], link: "#workspace/profile" });
    if (idStatus === "name_mismatch" || idStatus === "in_review") await db.rpc("notify_admins", { k: "id_check", t: "Identity check to review", b: prof.name, l: "#admin" });
  }
  return { status: idStatus };
}

async function userFrom(req: Request) {
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data?.user ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!KEY || !WORKFLOW) return json({ error: "Identity checks are not switched on yet." }, 503);
  let body: Record<string, unknown> = {};
  try { body = await req.json(); } catch { return json({ error: "Invalid body" }, 400); }

  // Webhook from Didit: use it only as a signal, then fetch the real decision ourselves.
  if (!body.action && typeof body.session_id === "string") {
    const out = await refresh(body.session_id);
    return json({ ok: !("error" in out) });
  }

  const user = await userFrom(req);
  if (!user) return json({ error: "Please sign in first." }, 401);

  if (body.action === "start") {
    const { data: prof } = await db.from("profiles").select("name,id_status").eq("user_id", user.id).maybeSingle();
    if (!prof) return json({ error: "Create your professional profile first." }, 400);
    if (prof.id_status === "approved") return json({ error: "Your identity is already verified." }, 400);
    // At most 3 new checks a day per person.
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count } = await db.from("id_verifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
    if ((count ?? 0) >= 3) return json({ error: "You have started three checks today. Please try again tomorrow or write to hello@handova.org." }, 429);
    const r = await fetch(`${API}/session/`, {
      method: "POST",
      headers: { "x-api-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ workflow_id: WORKFLOW, vendor_data: user.id, callback: new URL("#verify-done", SITE).toString(), contact_details: { email: user.email, send_notification_emails: false } }),
    });
    if (!r.ok) return json({ error: "The identity service is not available right now. Please try again later." }, 502);
    const s = await r.json();
    await db.from("id_verifications").upsert({ user_id: user.id, session_id: s.session_id, status: s.status ?? "Not Started" }, { onConflict: "session_id" });
    if (!prof.id_status) await db.from("profiles").update({ id_status: "started" }).eq("user_id", user.id);
    return json({ url: s.url });
  }

  if (body.action === "check") {
    const { data: last } = await db.from("id_verifications").select("session_id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!last) return json({ status: "" });
    return json(await refresh(last.session_id));
  }
  return json({ error: "Unknown action" }, 400);
});
