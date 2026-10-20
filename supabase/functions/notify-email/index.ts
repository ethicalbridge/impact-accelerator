// Sends one email per in-app notification: the title, a one-line summary and a link, never what people write in Messages.
// Notifications that carry a reason someone wrote (ending a contribution, a correction request, a removal) are sent
// without that text: the email asks people to open Handova to read it.
// Called by the notifications_email database trigger with {"id": "<notification id>"}.
// Sends through the same mailbox as the sign-up emails (hello@handova.org on Hostinger, port 465).
// Inactive until the SMTP_PASS secret is set (Supabase → Edge Functions → Secrets). Optional secrets:
// SMTP_HOST, SMTP_PORT, SMTP_USER, NOTIFY_FROM.
import { createClient } from "jsr:@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const SITE = Deno.env.get("SITE_URL") ?? "https://handova.org/";
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  let id: unknown;
  try { ({ id } = await req.json()); } catch { return json({ error: "Invalid body" }, 400); }
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return json({ error: "Invalid id" }, 400);

  const smtpPass = Deno.env.get("SMTP_PASS");
  const smtpUser = Deno.env.get("SMTP_USER") ?? "hello@handova.org";
  const from = Deno.env.get("NOTIFY_FROM") ?? `Handova <${smtpUser}>`;
  if (!smtpPass) return json({ skipped: "Email sending is not configured yet" });

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: n } = await db.from("notifications")
    .select("id,user_id,kind,title,body,link,created_at,emailed_at").eq("id", id).maybeSingle();
  // Only fresh, unsent notifications: a caller cannot choose the recipient or the text, or resend old ones.
  if (!n || n.emailed_at) return json({ skipped: "Not found or already sent" });
  if (Date.now() - Date.parse(n.created_at) > 15 * 60 * 1000) return json({ skipped: "Too old" });

  const { data: pref } = await db.from("user_settings").select("email_notifications").eq("user_id", n.user_id).maybeSingle();
  if (pref && pref.email_notifications === false) return json({ skipped: "Opted out" });

  if (n.kind === "message") { // at most one message email per person every 30 minutes
    const since = new Date(Date.now() - 30 * 60 * 1000).toISOString();
    const { count } = await db.from("notifications").select("id", { count: "exact", head: true })
      .eq("user_id", n.user_id).eq("kind", "message").gte("emailed_at", since);
    if (count) return json({ skipped: "Throttled" });
  }

  const { data: u } = await db.auth.admin.getUserById(n.user_id);
  const to = u?.user?.email;
  if (!to || !u.user.email_confirmed_at) return json({ skipped: "No confirmed email" });

  const { data: claimed } = await db.from("notifications").update({ emailed_at: new Date().toISOString() })
    .eq("id", id).is("emailed_at", null).select("id");
  if (!claimed?.length) return json({ skipped: "Already claimed" });

  const link = new URL(n.link || "#notifications", SITE).toString();
  const settings = new URL("#account", SITE).toString();
  const cta = n.link === "#org/need" ? "Post your first need" : "Open Handova";
  const subject = `${n.title} · Handova`;
  // Free text written by people (reasons, notes) stays inside Handova.
  const PRIVATE_BODY = new Set(["ended", "contribution_removed", "correction_requested", "report_outcome"]);
  if (PRIVATE_BODY.has(n.kind)) n.body = "Open Handova to read the details.";
  const text = `${n.title}${n.body ? `\n${n.body}` : ""}\n\n${cta}: ${link}\n\nYou receive this because you have a Handova account. Turn emails off in Account and privacy: ${settings}`;
  const html = `<!doctype html><html><body style="margin:0;background:#f6f3ec;font-family:Arial,Helvetica,sans-serif;color:#10302c">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fffdf8;border:1px solid #e3ded2;border-radius:16px">
<tr><td style="padding:28px 32px 8px;font:600 18px Georgia,serif;color:#123e3a">Handova <span style="font:400 13px Arial,Helvetica,sans-serif;color:#0f6f63">· Skills handed over. Capability that stays.</span></td></tr>
<tr><td style="padding:8px 32px 0;font:400 24px/1.3 Georgia,serif">${esc(n.title)}</td></tr>
${n.body ? `<tr><td style="padding:10px 32px 0;font-size:16px;line-height:1.5;color:#4b605c">${esc(n.body)}</td></tr>` : ""}
<tr><td style="padding:24px 32px 28px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#0f6f63" style="background:#0f6f63;border-radius:999px;mso-padding-alt:12px 24px"><a href="${esc(link)}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:bold;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:20px;border-radius:999px">${cta}</a></td></tr></table></td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #e3ded2;font-size:12px;line-height:1.5;color:#6b7d79">For your privacy, this email never includes what people write in Messages. You receive it because you have a Handova account. <a href="${esc(settings)}" style="color:#0f6f63">Turn emails off</a>. Handova is run by Ethical Bridge LLC.</td></tr>
</table></td></tr></table></body></html>`;

  let ok = false, detail = "";
  const port = Number(Deno.env.get("SMTP_PORT") ?? 465);
  const mail = nodemailer.createTransport({
    host: Deno.env.get("SMTP_HOST") ?? "smtp.hostinger.com", port, secure: port === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });
  // A short retry covers a busy mailbox or a dropped connection.
  for (let attempt = 0; attempt < 3 && !ok; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, 2000 * attempt));
    try { await mail.sendMail({ from, to, subject, html, text }); ok = true; }
    catch (err) { detail = String((err as Error)?.message || err).slice(0, 200); }
  }
  if (!ok) {
    await db.from("notifications").update({ emailed_at: null }).eq("id", id);
    return json({ error: "Send failed", detail }, 502);
  }
  return json({ sent: true });
});
