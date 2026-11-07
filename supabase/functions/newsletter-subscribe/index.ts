// Adds a confirmed Handova account that ticked "Send me the Ethical Bridge and Handova newsletter" to the Brevo list.
// Called by the database (trigger on email confirmation, and an hourly retry) with {"user_id": "<uuid>"}.
// A caller can't choose the email address or add anyone who didn't opt in: everything is read from the account.
// Inactive until the secret BREVO_API_KEY is set; the list is "Ethical Bridge Newsletter" (ID 3) unless BREVO_LIST_ID is set (Supabase → Edge Functions → Secrets).
import { createClient } from "jsr:@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  let uid: unknown;
  try { ({ user_id: uid } = await req.json()); } catch { return json({ error: "Invalid body" }, 400); }
  if (typeof uid !== "string" || !/^[0-9a-f-]{36}$/i.test(uid)) return json({ error: "Invalid id" }, 400);

  const key = Deno.env.get("BREVO_API_KEY"), list = Number(Deno.env.get("BREVO_LIST_ID") || 3); // 3 = "Ethical Bridge Newsletter" in Brevo
  if (!key || !list) return json({ skipped: "Brevo is not configured yet" });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: row } = await db.from("newsletter_signups").select("user_id,subscribed_at,tries").eq("user_id", uid).maybeSingle();
  if (!row || row.subscribed_at) return json({ skipped: "Nothing to do" });

  const { data: u } = await db.auth.admin.getUserById(uid);
  const user = u?.user, meta = (user?.user_metadata || {}) as Record<string, unknown>;
  if (!user?.email || !user.email_confirmed_at || meta.newsletter !== true) return json({ skipped: "No confirmed opt-in" });

  const name = String(meta.full_name || "").trim().split(/\s+/);
  const attributes: Record<string, string> = {};
  if (name[0]) attributes.FIRSTNAME = name[0];
  if (name.length > 1) attributes.LASTNAME = name.slice(1).join(" ");

  let ok = false, detail = "";
  try {
    const r = await fetch("https://api.brevo.com/v3/contacts", {
      method: "POST",
      headers: { "api-key": key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ email: user.email, attributes, listIds: [list], updateEnabled: true }),
    });
    ok = r.ok; // 201 created, 204 existing contact updated and added to the list
    if (!ok) detail = `${r.status} ${(await r.text()).slice(0, 200)}`;
  } catch (err) { detail = String((err as Error)?.message || err).slice(0, 200); }

  await db.from("newsletter_signups").update(ok
    ? { subscribed_at: new Date().toISOString(), last_error: null, tries: row.tries + 1 }
    : { last_error: detail, tries: row.tries + 1 }).eq("user_id", uid);
  return ok ? json({ subscribed: true }) : json({ error: "Brevo refused", detail }, 502);
});
