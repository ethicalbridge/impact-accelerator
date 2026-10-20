import { locale, getLang, t, tf } from "../i18n.js";
import { db, state, result, e, toast, go, withForm, val } from "../core.js";
import { icon, eyebrow, back, status, pill, field, check, formEnd, btn, empty, avatar } from "../ui.js";
import { date, today, safeURL } from "../utils.js";
import { notFound } from "./public.js";
import { CONTRIBUTION_VERSION, contributionSections, contributionText, contributionHtml, contributionView } from "../agreement.js";
import { needsResign, loadPersonState, idVideoText } from "./account.js";

export async function agreement(id) {
  if (!state.user) return { redirect: `#signin?next=${encodeURIComponent("#agreement/" + id)}` };
  const x = await result(db.from("engagements").select("*, organisation:organisations(name,country)").eq("id", id).maybeSingle()).catch(() => null);
  if (!x) return notFound("Agreement not found", "It may belong to someone else, or the link may be wrong.");
  const s = x.scope || {};
  const isTalent = x.user_id === state.user.id;
  const isOrg = state.memberships.some((m) => m.organisation_id === x.organisation_id);
  const mySigned = isTalent ? x.talent_signed_at : x.org_signed_at;
  const sigs = await result(db.from("contribution_signatures").select("party,full_name,signer_role,focal_point_name,focal_point_contact,signed_at,version,text_sha256,language").eq("engagement_id", id)).catch(() => []);
  const orgSig = sigs.find((g) => g.party === "organisation"), proSig = sigs.find((g) => g.party === "professional");
  const when = (d) => new Date(d).toLocaleString(locale(), { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });
  const hours = x.status === "awaiting_signatures" ? [] : await result(db.from("hours").select("*").eq("engagement_id", id).order("work_date", { ascending: false }));
  const approved = hours.filter((h) => h.status === "approved").reduce((a, h) => a + Number(h.hours), 0);
  const pendingHours = hours.some((h) => h.status === "pending");
  const allApproved = Number(s.hours) > 0 && approved >= Number(s.hours);
  const sig = (who, name, at, g) => `<div class="sig"><span class="small muted">${who}</span><strong>${e(name || "Not yet signed")}</strong>${g?.signer_role ? `<span class="small muted" data-no-i18n>${e(g.signer_role)}</span>` : ""}<span class="small" style="color:${at ? "var(--teal)" : "var(--ochre-ink)"};font-weight:600;display:inline-flex;gap:6px;align-items:center">${icon(at ? "check" : "clock", 16)}${at ? "Signed " + when(at) : "Signature needed"}</span>${g?.text_sha256 ? `<span class="small muted">Reference ${e(g.text_sha256.slice(0, 12))}</span>` : ""}</div>`;
  const idSt = state.profile?.id_status || "";
  const needsId = isTalent && state.idRequired && idSt !== "approved";
  const toSignNow = x.status === "awaiting_signatures" && !mySigned;
  if (isTalent && toSignNow) await loadPersonState().catch(() => {});
  // A professional on an older professional agreement signs the new one first, on its own page (T13).
  const resignFirst = isTalent && toSignNow && needsResign();
  const resignBox = resignFirst ? `<div class="stack" style="--gap:10px"><p class="small"><strong>Sign the updated Handova agreement first.</strong> We updated the Handova professional agreement. Read and sign it, then come back here to sign this contribution agreement.</p><div>${btn("Read and sign the new agreement", `#workspace/agreement?next=${encodeURIComponent("#agreement/" + id)}`, "sm")}</div></div>` : "";
  const idBox = ["in_review", "name_mismatch"].includes(idSt) ? `<p class="small"><strong>Your identity check is being reviewed.</strong> You can sign as soon as it is confirmed; we will notify you.</p>`
    : state.idVideo ? `<div class="stack small" style="--gap:6px">${idVideoText()}</div>`
    : `<p class="small"><strong>Verify your identity first.</strong> It takes about three minutes and is required before you sign your first contribution agreement.</p><button type="button" class="btn sm" data-action="verify-id">Verify my identity</button>`;
  // The organisation's role, focal point and contact from its last contribution, so they aren't retyped every time (O15).
  const lastOrgSig = isOrg && !isTalent && toSignNow ? await result(db.from("contribution_signatures").select("signer_role,focal_point_name,focal_point_contact,signed_at").eq("organisation_id", x.organisation_id).eq("party", "organisation").order("signed_at", { ascending: false }).limit(1).maybeSingle()).catch(() => null) : null;
  const v3 = x.terms_version === CONTRIBUTION_VERSION;
  const signForm = resignFirst || (needsId && toSignNow) ? `<div class="stack" style="--gap:14px">${resignBox}${needsId ? `<div class="stack" style="--gap:10px">${idBox}</div>` : ""}</div>` : toSignNow && (isTalent || isOrg) ? `<form class="form" data-form="sign" data-id="${e(id)}" data-version="${e(x.terms_version)}">
      ${check("scope", "I agree to the scope, output, hours and working languages above.", false, true)}
      ${check("confidentiality", "I will follow the confidentiality, minimum-access and data rules, and never share passwords, card details, PINs or access codes on the platform.", false, true)}
      ${check("read_all", v3 ? "I have read every section, including use of the work, safeguarding, ending early and Handova’s role." : "I have read every section, including ownership of the work, safeguarding, ending early and Handova’s role.", false, true)}
      ${check("no_conflict", "I have no conflict of interest with the other party, or I declared it when applying or inviting, or in Messages.", false, true)}
      ${isOrg && !isTalent ? `${check("authority", `I am 18 or over and authorised to sign this agreement on behalf of ${e(s.organisation)}.`, false, true)}
      ${lastOrgSig ? `<p class="small muted">We filled in your role and safeguarding focal point from your last contribution agreement. Change them if needed.</p>` : ""}
      ${field("role", "Your role in the organisation", { required: true, value: lastOrgSig?.signer_role || state.user?.user_metadata?.org_role || "", attrs: 'minlength="2" maxlength="120" placeholder="e.g. Director"' })}
      ${field("focal_name", "Who in your team should hear about any safety concern?", { required: true, value: lastOrgSig?.focal_point_name || "", attrs: 'minlength="2" maxlength="120"', hint: "Your safeguarding focal point for this contribution. It can be you." })}
      ${field("focal_contact", "How to reach them", { required: true, value: lastOrgSig?.focal_point_contact || "", attrs: 'minlength="5" maxlength="200" placeholder="Email or phone"' })}` : ""}
      ${field("name", "Type your full name to sign", { required: true, value: (isTalent ? state.profile?.name : state.memberships.find((m) => m.organisation_id === x.organisation_id)?.full_name) || "", attrs: 'minlength="2" maxlength="120" autocomplete="name"' })}
      ${formEnd("Sign agreement")}<p class="small muted">Signatures are final. As the record of this agreement we keep the signed text, your name, email, role and confirmations, the language shown, the signing time, your IP address and browser, for six years after your account closes. Only you and Handova can see your email, IP address and browser. Hours can be logged once both parties have signed.</p></form>` : "";
  const hourRows = hours.map((h) => `<div class="list-row"><div class="stack" style="--gap:4px"><strong>${date(h.work_date)} · ${Number(h.hours)} hours</strong><p class="small">${e(h.description)}</p>${h.review_note ? `<p class="small muted">Review note: ${e(h.review_note)}</p>` : ""}${safeURL(h.evidence) ? `<a class="small" href="${e(h.evidence)}" target="_blank" rel="noopener noreferrer">Supporting link</a>` : ""}</div><div class="row">${(h.status === "pending" ? pill(isOrg ? "Waiting for your review" : "Waiting for review", "ochre") : h.status === "changes_requested" ? pill("Changes asked", "clay") : pill("Approved"))}${isOrg && h.status === "pending" ? `<button class="btn sm" type="button" data-action="hours-approve" data-id="${h.id}">Approve</button><button class="btn secondary sm" type="button" data-action="hours-changes" data-id="${h.id}">Ask for changes</button>` : ""}${isTalent && h.status === "changes_requested" && x.status === "active" ? `<button class="btn sm" type="button" data-action="hours-amend" data-id="${h.id}" data-date="${e(h.work_date)}" data-hours="${e(h.hours)}" data-desc="${e(h.description)}" data-evidence="${e(h.evidence || "")}">Correct this entry</button>` : ""}</div></div>`).join("");
  const logForm = isTalent && x.status === "active" ? `<form class="form card" id="log-form" tabindex="-1" data-form="log-hours" data-id="${e(id)}"><h3>Log time</h3><p class="small muted">${tf("Logged so far: {logged} of {agreed} agreed hours.", { logged: String(hours.filter((h) => h.status !== "changes_requested").reduce((a, h) => a + Number(h.hours), 0)), agreed: String(s.hours) })} ${t("Agree any extra time in Messages first.")}${(s.languages || []).length ? ` ${e(tf("Describe your work in {langs}, the language you agreed with the organisation.", { langs: (s.languages || []).map(t).join(" or ") }))}` : ""}</p>${x.first_call_at ? "" : `<p class="small muted">Not had your first call yet? Agree the basics in Messages before you start. The call itself counts as time on this contribution.</p>`}<div class="form-grid">${field("work_date", "Date", { type: "date", value: today(), required: true, attrs: `max="${today()}"` })}${field("hours", "Hours", { type: "number", value: "1", required: true, attrs: 'min="0.25" max="12" step="0.25"' })}${field("description", "What you did", { type: "textarea", required: true, full: true, attrs: 'minlength="10" maxlength="2000"' })}${field("evidence", "Supporting link (optional)", { type: "url", full: true, attrs: 'maxlength="500" placeholder="https://"', hint: "Only share links the organisation has agreed to. Nothing confidential." })}</div>${formEnd("Submit for review")}</form>` : "";
  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="split">
    <article class="agreement-doc">
      <div class="row between">${eyebrow(`Contribution agreement · ${e(x.terms_version)}`)}${status(x.status)}</div>
      <h1 style="font-size:clamp(2rem,3.6vw,3rem);margin:12px 0 8px" data-no-i18n>${e(s.need_title)}</h1>
      <p class="muted" data-no-i18n>${tf("Between {org} and {pro}.", { org: `<strong>${e(s.organisation)}</strong>${s.organisation_country ? ` (${e(t(s.organisation_country))})` : ""}`, pro: `<strong>${e(s.talent)}</strong>${s.talent_country ? ` (${e(t(s.talent_country))})` : ""}` })} ${e(t("Built from the need as it stood when the match was accepted; it cannot be changed after signing."))}</p>${getLang() === "en" || x.terms_version === CONTRIBUTION_VERSION ? "" : `<p class="small muted binding-note">This translation is here to help you read the agreement. The English text is the one that was signed, and it is the binding version.</p>`}
      <div class="facts"><div><span>Estimated hours</span><strong>${e(s.hours)}</strong></div><div><span>Working languages</span><strong>${e((s.languages || []).map(t).join(", "))}</strong></div><div><span>Delivery date</span><strong>${x.terms_version === CONTRIBUTION_VERSION ? "Agreed in your first call" : s.deadline ? date(s.deadline) : "None fixed"}</strong></div><div><span>Payment</span><strong>None · voluntary</strong></div></div>
      ${x.status === "ended" ? `<div class="banner warn">${icon("alert", 22, "#9a4a2e")}<p><strong>${x.ended_at ? tf("This contribution ended on {date}.", { date: date(x.ended_at) }) : t("This contribution ended early.")}</strong> ${x.ended_by ? (x.ended_by === x.user_id ? t("Ended by the professional.") : t("Ended by the organisation.")) : ""}${x.end_reason ? ` <span>${t("Reason:")}</span> <span data-no-i18n>${e(x.end_reason)}</span>` : ""}</p></div>` : ""}
      ${orgSig?.focal_point_name ? `<div class="banner">${icon("shield", 22, "#0f6f63")}<p><strong>Safeguarding focal point:</strong> <span data-no-i18n>${e(orgSig.focal_point_name)} · ${e(orgSig.focal_point_contact || "")}</span></p></div>` : ""}
      ${(() => { const body = x.terms_version === CONTRIBUTION_VERSION ? contributionView(s, x.terms_version, e, t) : contributionHtml(contributionSections(s, x.terms_version), e);
        // Once signed, the full text folds away so the time log and next steps are easy to reach (it still prints in full).
        return x.status === "awaiting_signatures" ? body : `<details class="agreement-full"><summary><strong>Read the full agreement</strong> <span class="small muted">signed by both of you</span></summary>${body}</details>`; })()}
      <div class="row no-print" style="margin-top:20px"><button class="btn secondary sm" type="button" data-action="print">${icon("download", 16)} Print or save as PDF</button></div>
    </article>
    <aside class="stack sticky" style="--gap:18px">
      <div class="side-card"><span class="serif" style="font-size:1.6rem">Signatures</span>${sig("Organisation", x.org_signed_name, x.org_signed_at, orgSig)}${sig("Professional", x.talent_signed_name, x.talent_signed_at, proSig)}${signForm}${mySigned && x.status === "awaiting_signatures" ? `<p class="small muted">You have signed. We will notify you when the other party signs.</p>` : ""}</div>
      ${x.status !== "awaiting_signatures" ? `<div class="side-card no-print"><span class="serif" style="font-size:1.4rem">Progress</span><p><strong>${approved}</strong> of ${e(s.hours)} estimated hours approved</p><p class="small">${x.first_call_at ? `First call: ${x.first_call_written ? "agreed in writing" : "held"} ${date(x.first_call_at)}` : "First call: not recorded yet"}</p>${x.status === "active" && !x.first_call_at ? `<button class="btn sm" type="button" data-action="first-call" data-id="${e(id)}">Record what we agreed</button>` : ""}${x.status === "completed" ? `<p class="small">Completed ${date(x.completed_at)}.</p>` : ""}${isTalent && x.status === "active" ? `<p class="small muted silent-org">Organisation not replying for 2 weeks? Write to hello@handova.org and we can close it, keeping the hours they approved.</p>` : ""}</div>` : ""}
      <div class="row no-print">${x.user_id ? btn(`${icon("chat", 18)} Messages`, `#conversation-for/${x.need_id}/${x.user_id}`, "secondary sm") : ""}${isOrg && x.status === "active" && !pendingHours ? `<button class="btn sm" type="button" data-action="complete" data-id="${e(id)}">Mark complete and endorse</button>` : ""}</div>
      ${isOrg && x.status === "active" && pendingHours ? `<p class="small muted no-print">Review the waiting time entries first, then you can finish and endorse.</p>` : ""}
      ${["awaiting_signatures", "active"].includes(x.status) && !(isOrg && allApproved) ? `<button class="link-btn no-print" type="button" data-action="end-engagement" data-id="${e(id)}" style="color:var(--clay-ink)">End this contribution</button>` : ""}
      <div class="no-print">${isOrg ? back("Back to the need", `#org/needs/${e(x.need_id)}`) : back("Back to workspace", "#workspace")}</div>
    </aside></div>
    ${x.status !== "awaiting_signatures" ? `<section class="stack no-print" style="--gap:18px;margin-top:40px"><h2 style="font-size:2rem">Time log</h2>${logForm}<div class="card">${hourRows || empty("No time logged yet", isTalent ? "Log your time as you work. The organisation reviews each entry." : "Time the professional logs will appear here for your review.")}</div></section>` : ""}
  </div>`;
  return { title: `Agreement · ${s.need_title}`, html };
}

export async function conversationFor(needId, userId) {
  const c = await result(db.from("conversations").select("id").eq("need_id", needId).eq("user_id", userId).maybeSingle()).catch(() => null);
  return c ? { redirect: `#conversation/${c.id}` } : notFound("Conversation not found", "Conversations open when someone applies or is invited.");
}

// Only links from well-known call services become clickable; everything else stays plain text.
const CALL_HOSTS = ["meet.google.com", "zoom.us", "teams.microsoft.com", "teams.live.com", "meet.jit.si", "whereby.com"];
function linkCalls(escaped) {
  return escaped.replace(/https:\/\/[^\s<]+/g, (url) => {
    try { const h = new URL(url.replace(/&amp;/g, "&")).hostname; if (CALL_HOSTS.some((c) => h === c || h.endsWith("." + c))) return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`; } catch {}
    return url;
  });
}
// Chat view: bubbles left and right, a date line for each day, time under each message.
const dayKey = (d) => new Date(d).toDateString();
function dayLabel(d) {
  const x = new Date(d), now = new Date(), y = new Date(now); y.setDate(now.getDate() - 1);
  if (x.toDateString() === now.toDateString()) return t("Today");
  if (x.toDateString() === y.toDateString()) return t("Yesterday");
  return x.toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short", ...(x.getFullYear() !== now.getFullYear() ? { year: "numeric" } : {}) });
}
const timeOf = (d) => new Date(d).toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
function chatHtml(msgs, c, orgName, personName) {
  if (!msgs.length) return `<div class="chat-empty">${icon("chat", 28, "#0f6f63")}<strong>Start the conversation</strong><span class="small muted">Say hello, and suggest a time for a short first call.</span></div>`;
  let last = "", prevSender = "";
  return msgs.map((m) => {
    const day = dayKey(m.created_at), sep = day !== last ? `<div class="chat-day"><span>${e(dayLabel(m.created_at))}</span></div>` : "";
    if (day !== last) prevSender = "";
    last = day;
    if (m.kind === "system") { prevSender = ""; return `${sep}<div class="chat-system"><span class="small"><strong>Handova</strong> · ${e(timeOf(m.created_at))}</span><p style="white-space:pre-line">${String(m.body || "").split("\n").map((l) => `<span>${linkCalls(e(l))}</span>`).join("\n")}</p></div>`; }
    const mine = m.sender_id === state.user.id;
    const name = m.kind === "former" ? t("Former member") : m.sender_id === c?.user_id ? personName : orgName;
    const cont = prevSender === (m.sender_id || m.kind);
    prevSender = m.sender_id || m.kind;
    return `${sep}<div class="chat-row ${mine ? "mine" : "theirs"}${cont ? " cont" : ""}">${mine ? "" : `<span class="chat-av">${cont ? "" : avatar(name, 32)}</span>`}<div class="chat-col">${!mine && !cont ? `<span class="chat-name" data-no-i18n>${e(name)}</span>` : ""}<div class="bubble"><p data-no-i18n>${linkCalls(e(m.body))}</p></div><time class="chat-time" datetime="${e(m.created_at)}">${e(timeOf(m.created_at))}</time></div></div>`;
  }).join("");
}
export async function conversation(id) {
  if (!state.user) return { redirect: `#signin?next=${encodeURIComponent("#conversation/" + id)}` };
  const c = await result(db.from("conversations").select("*, need:needs(id,title,languages,organisation_id,organisation:organisations(name)), person:profiles(user_id,name)").eq("id", id).maybeSingle()).catch(() => null);
  if (!c) return notFound("Conversation not found", "It may belong to someone else.");
  const msgs = await result(db.from("messages").select("*").eq("conversation_id", id).order("created_at"));
  const eng = await result(db.from("engagements").select("id,status,first_call_at").eq("need_id", c.need_id).eq("user_id", c.user_id).in("status", ["awaiting_signatures", "active"]).maybeSingle()).catch(() => null);
  const live = !!eng;
  const isTalent = c.user_id === state.user.id;
  const other = isTalent ? c.need?.organisation?.name || "Organisation" : c.person?.name || (c.user_id ? "Professional" : t("Former member"));
  const html = `<div class="wrap" style="max-width:860px;padding-block:40px 80px"><div class="stack" style="--gap:20px">
    ${isTalent ? back("Back to workspace", "#workspace") : back("Back to the need", `#org/needs/${e(c.need_id)}`)}
    <div class="row between"><div>${eyebrow("Conversation")}<h1 style="font-size:clamp(1.9rem,3.4vw,2.8rem)">${e(other)}</h1><p class="muted">About: <a href="#need/${e(c.need_id)}">${e(c.need?.title)}</a></p></div>${status(c.status)}</div>
    <details class="chat-privacy"><summary>${icon("lock", 18, "#0f6f63")}<span>Who can read this, and what not to share</span></summary><p class="small"><span>Who can read this: you, the people who manage ${e(c.need?.organisation?.name || "the organisation")}’s Handova account, and Handova’s safeguarding lead only if someone here reports a concern.</span> <span>${live && eng.status === "active" ? "Keep it about the work. Video-call links are fine to share here." : "Keep it about the work. Until you have both signed, keep phone numbers, personal emails and other apps out of Messages; a short video call through a link posted here is fine."} Never share passwords, card details or access codes, or personal information about the people the organisation supports.</span></p></details>
    ${eng?.status === "active" && !eng.first_call_at ? `<details class="card fold-card"><summary><h2 class="card-title">Tips for your first call</h2></summary><div class="stack" style="--gap:8px;margin-top:10px"><p>Use Google Meet, Zoom, Microsoft Teams, Jitsi or Whereby and post the link here; links from these services open directly. You don’t need to swap phone numbers to have a call. Audio only is fine if data is limited.</p><p>Talk anywhere, but write any decision or change to the output, hours or deadline here in Messages, so you both have it in writing.</p><p>Don’t record the call or use AI note-takers unless everyone agrees at the start. Introduce everyone who joins. Don’t show or discuss names, photos or files about the people the organisation supports, and close other windows before sharing your screen.</p><p>You can leave a call at any time if you feel uncomfortable. If something worrying happens on a call, by phone or on another app, you can still report it on Handova. If someone is in immediate danger, contact local emergency services first.</p><div class="row" style="--gap:8px">${btn("Record what we agreed", `#agreement/${e(eng.id)}`, "sm")}</div></div></details>` : ""}
    <section class="chat card">
      <div class="chat-head">${avatar(other, 40)}<div class="stack" style="--gap:2px;min-width:0"><strong data-no-i18n>${e(other)}</strong><span class="small muted">${isTalent ? "" : `<span data-no-i18n>${e(c.need?.organisation?.name || "")}</span> · `}<span>${live ? (eng.status === "active" ? "Contribution in progress" : "Waiting for signatures") : c.status === "open" ? "Application" : "Closed"}</span></span></div></div>
      <div class="chat-log" id="messages" role="log" aria-label="Messages" aria-live="off" data-count="${msgs.length}" data-last="${e(msgs[msgs.length - 1]?.created_at || "")}">${chatHtml(msgs, c, c.need?.organisation?.name || "Organisation", c.person?.name || (c.user_id ? "Professional" : t("Former member")))}</div><p class="visually-hidden" id="chat-announce" aria-live="polite"></p>
      ${c.status === "open" ? `<form class="chat-compose" data-form="message" data-id="${e(id)}"><label class="visually-hidden" for="f-body">Message</label><textarea id="f-body" name="body" rows="1" maxlength="4000" required placeholder="Write a message…"></textarea><button class="btn chat-send" type="submit" aria-label="Send message">${icon("send", 18)}<span>Send</span></button><p class="form-error small" role="alert"></p></form><p class="small muted chat-hint">Press Ctrl + Enter to send. Messages stay here for both of you.${(c.need?.languages || []).length ? ` ${e(tf("Working languages: {langs}.", { langs: c.need.languages.map(t).join(", ") }))}` : ""}</p>` : `<p class="chat-closed muted">${c.closed_reason ? `<span>This conversation is closed.</span> <span>${e(c.closed_reason)}.</span>` : "This conversation is closed."}</p>`}
    </section>
    ${c.status === "open" ? (live ? `<p class="small muted">Messages stay open while the contribution is live. To stop the work, use End this contribution on the agreement. If you feel unsafe, Report a concern.</p>` : `<div class="row"><button class="btn secondary sm" type="button" data-action="close-conversation" data-id="${e(id)}">End conversation</button></div>`) : ""}
    <button class="link-btn" type="button" data-action="report" data-type="conversation" data-id="${e(id)}" style="color:var(--muted);display:inline-flex;gap:8px;align-items:center">${icon("flag", 18)}Report this conversation</button>
  </div></div>`;
  const after = () => {
    const log = document.getElementById("messages"), ta = document.getElementById("f-body");
    if (log) log.scrollTop = log.scrollHeight;
    if (ta) {
      const grow = () => { ta.style.height = "auto"; ta.style.height = Math.min(ta.scrollHeight, 200) + "px"; };
      ta.addEventListener("input", grow);
      ta.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); ta.form.requestSubmit(); } });
    }
    // New messages appear without reloading: check every 15 seconds while this chat is open.
    const here = location.hash;
    clearInterval(window.__hvChatTimer);
    const timer = window.__hvChatTimer = setInterval(async () => {
      if (location.hash !== here || !document.getElementById("messages")) return clearInterval(timer);
      if (document.hidden) return;
      try { await refreshChat(id); } catch {}
    }, 15000);
  };
  return { title: `Conversation · ${other}`, html, after };
}
async function refreshChat(id) {
  const log = document.getElementById("messages");
  if (!log) return;
  // Ask only whether anything new arrived; download the conversation again only when it did.
  if (log.dataset.last) {
    const fresh = await result(db.from("messages").select("id").eq("conversation_id", id).gt("created_at", log.dataset.last)).catch(() => null);
    if (fresh && !fresh.length) return;
  }
  const msgs = await result(db.from("messages").select("*").eq("conversation_id", id).order("created_at"));
  if (msgs.length) log.dataset.last = msgs[msgs.length - 1].created_at;
  if (String(msgs.length) === log.dataset.count) return;
  const c = await result(db.from("conversations").select("user_id, need:needs(organisation:organisations(name)), person:profiles(user_id,name)").eq("id", id).maybeSingle());
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  const orgName = c?.need?.organisation?.name || "Organisation", personName = c?.person?.name || (c?.user_id ? "Professional" : t("Former member"));
  const before = Number(log.dataset.count) || 0;
  log.innerHTML = chatHtml(msgs, c, orgName, personName);
  log.dataset.count = String(msgs.length);
  // Screen readers hear only the new messages from the other side, not the whole conversation again.
  const fresh = msgs.slice(before).filter((m) => m.sender_id !== state.user?.id);
  const say = document.getElementById("chat-announce");
  if (say && fresh.length) say.textContent = fresh.map((m) => `${m.kind === "system" ? "Handova" : m.kind === "former" ? "Former member" : m.sender_id === c?.user_id ? personName : orgName}: ${String(m.body || "").slice(0, 300)}`).join(" · ");
  if (atBottom) log.scrollTop = log.scrollHeight;
}

export async function submitEngagement(kind, form) {
  if (kind === "sign") return withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error("Tick every confirmation and complete the fields to sign."); }
    const x = await result(db.from("engagements").select("scope,terms_version").eq("id", form.dataset.id).single());
    const confirmations = Object.fromEntries(["scope", "confidentiality", "read_all", "no_conflict", "authority"].filter((k) => form.querySelector(`[name="${k}"]`)).map((k) => [k, fd.has(k)]));
    const s = await result(db.rpc("sign_engagement", { p_id: form.dataset.id, p_name: val(fd, "name"), p_text: contributionText(x.scope || {}, x.terms_version), p_version: x.terms_version, p_lang: getLang(), p_confirmations: confirmations, p_role: val(fd, "role") || null, p_focal_name: val(fd, "focal_name") || null, p_focal_contact: val(fd, "focal_contact") || null }));
    toast(s === "active" ? "Signed by both. Next step: plan your first call in Messages." : "Signed. We will notify you when the other party signs.");
    go(location.hash);
  });
  if (kind === "log-hours") return withForm(form, async (fd) => {
    const ev = val(fd, "evidence");
    if (ev && !safeURL(ev, true)) throw Error("Use a full https:// link, or leave it empty.");
    await result(db.from("hours").insert({ engagement_id: form.dataset.id, user_id: state.user.id, work_date: val(fd, "work_date"), hours: Number(val(fd, "hours")), description: val(fd, "description"), evidence: safeURL(ev, true) }));
    toast("Time submitted for review.");
    go(location.hash);
  });
  if (kind === "message") return withForm(form, async (fd) => {
    const body = val(fd, "body");
    if (!body) throw Error("Write a message first.");
    await result(db.from("messages").insert({ conversation_id: form.dataset.id, sender_id: state.user.id, body }));
    const ta = form.querySelector("textarea"); ta.value = ""; ta.style.height = "auto";
    await refreshChat(form.dataset.id);
    const log = document.getElementById("messages"); if (log) log.scrollTop = log.scrollHeight;
    ta.focus();
  });
}
