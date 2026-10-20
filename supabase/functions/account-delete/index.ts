// Delete a member's verification sessions and profile photos before removing
// the Supabase account. The signed agreement evidence remains until its expiry.
// A Handova admin can call it with { user_id } to delete someone else's account (for example a profile closed
// for 24 months): the same steps run for that person, then admin_delete_account() runs their delete_my_account().
import { createClient } from "jsr:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const diditKey = Deno.env.get("DIDIT_API_KEY") ?? "";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!url || !serviceKey || !anonKey) return json({ error: "Account deletion is temporarily unavailable." }, 503);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Please sign in first." }, 401);
  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth, error: authError } = await admin.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Please sign in first." }, 401);
  // Use the caller's JWT for the SQL functions, so they can check auth.uid() and admin access.
  const member = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const body = await req.json().catch(() => ({})) as { user_id?: string; reason?: string };
  const target = typeof body?.user_id === "string" && body.user_id !== auth.user.id ? body.user_id : "";
  if (target) {
    const { data: isAdmin } = await member.rpc("is_admin");
    if (isAdmin !== true) return json({ error: "Only Handova admins can delete another account." }, 403);
    const { data: blocker, error: blockerError } = await member.rpc("admin_account_deletion_blocker", { p_user: target });
    if (blockerError) return json({ error: "Could not check this account. Please try again." }, 502);
    if (blocker) return json({ error: String(blocker) }, 409);
  }
  const userId = target || auth.user.id;

  const sessions: Array<{ session_id: string }> = [];
  for (let offset = 0; offset <= 10000; offset += 500) {
    const { data: page, error: sessionsError } = await admin.from("id_verifications")
      .select("session_id").eq("user_id", userId).order("created_at")
      .range(offset, offset + 499);
    if (sessionsError || !page) return json({ error: "Could not check identity records. Please try again." }, 502);
    sessions.push(...page);
    if (page.length < 500) break;
    if (offset === 10000) return json({ error: "Please write to hello@handova.org to remove your identity records." }, 502);
  }
  if (sessions.length && !diditKey) return json({ error: "Identity records cannot be removed right now. Please write to hello@handova.org." }, 503);
  for (const row of sessions) {
    const response = await fetch(`https://verification.didit.me/v3/session/${encodeURIComponent(row.session_id)}/delete/`, {
      method: "DELETE", headers: { "x-api-key": diditKey },
    }).catch(() => null);
    if (!response || (response.status !== 204 && response.status !== 404))
      return json({ error: "Could not remove an identity check. Your account is still active; please try again or write to hello@handova.org." }, 502);
  }

  const storage = admin.storage.from("avatars");
  const { data: objects, error: listError } = await storage.list(userId, { limit: 1000 });
  if (listError || !objects || objects.length === 1000)
    return json({ error: "Could not check your uploaded photos. Your account is still active; please write to hello@handova.org." }, 502);
  const photoPaths = objects
    .filter((item) => item.id && /\.(?:jpe?g|png|webp)$/i.test(item.name) && !item.name.includes("/"))
    .map((item) => `${userId}/${item.name}`);
  // Logos uploaded for experience entries live in a subfolder. An organisation's logo is kept (other members, records).
  const { data: logos } = await storage.list(`${userId}/logos`, { limit: 1000 });
  const { data: orgLogos } = await admin.from("organisations").select("logo_url").like("logo_url", `%/${userId}/logos/%`);
  const inUse = (orgLogos ?? []).map((o) => String(o.logo_url || "")).join(" ");
  for (const item of logos ?? []) {
    const stem = item.name.replace(/-original\.png$/i, ".png");
    if (item.id && /\.(?:jpe?g|png|webp)$/i.test(item.name) && !inUse.includes(`/${userId}/logos/${stem}`)) photoPaths.push(`${userId}/logos/${item.name}`);
  }
  if (photoPaths.length) {
    const { error: removeError } = await storage.remove(photoPaths);
    if (removeError) return json({ error: "Could not remove your uploaded photos. Your account is still active; please write to hello@handova.org." }, 502);
  }

  const { error: authorizationError } = await admin.from("account_deletion_authorizations")
    .upsert({ user_id: userId, verified_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (authorizationError) return json({ error: "Could not finish checking account deletion. Please write to hello@handova.org." }, 502);

  const { error: deleteError } = target
    ? await member.rpc("admin_delete_account", { p_user: target, p_reason: String(body?.reason ?? "").slice(0, 600) })
    : await member.rpc("delete_my_account");
  if (deleteError) return json({ error: "Could not finish deleting your account. Please write to hello@handova.org." }, 502);
  return json({ ok: true });
});
