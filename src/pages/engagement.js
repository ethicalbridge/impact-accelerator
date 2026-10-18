import { locale, getLang, t } from "../i18n.js";
import { db, state, result, e, toast, go, withForm, val } from "../core.js";
import { icon, eyebrow, back, status, pill, field, check, formEnd, btn, empty, avatar } from "../ui.js";
import { date, today, safeURL } from "../utils.js";
import { notFound } from "./public.js";
import { CONTRIBUTION_VERSION, contributionSections, contributionText, contributionHtml } from "../agreement.js";

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
  const sig = (who, name, at, g) => `<div class="sig"><span class="small muted">${who}</span><strong>${e(name || "Not yet signed")}</strong>${g?.signer_role ? `<span class="small muted" data-no-i18n>${e(g.signer_role)}</span>` : ""}<span class="small" style="color:${at ? "var(--teal)" : "var(--ochre-ink)"};font-weight:600;display:inline-flex;gap:6px;align-items:center">${icon(at ? "check" : "clock", 16)}${at ? "Signed " + when(at) : "Signature needed"}</span>${g?.text_sha256 ? `<span class="small muted">Reference ${e(g.text_sha256.slice(0, 12))}</span>` : ""}</div>`;
  const idSt = state.profile?.id_status || "";
  const needsId = isTalent && state.idRequired && idSt !== "approved";
  const signForm = needsId && x.status === "awaiting_signatures" && !mySigned ? `<div class="stack" style="--gap:10px">${["in_review", "name_mismatch"].includes(idSt) ? `<p class="small"><strong>Your identity check is being reviewed.</strong> You can sign as soon as it is confirmed; we will notify you.</p>` : `<p class="small"><strong>Verify your identity first.</strong> It takes about three minutes and is required before you sign your first contribution agreement.</p><button type="button" class="btn sm" data-action="verify-id">Verify my identity</button>`}</div>` : x.status === "awaiting_signatures" && (isTalent || isOrg) && !mySigned ? `<form class="form" data-form="sign" data-id="${e(id)}" data-version="${e(x.terms_version)}">
      ${check("scope", "I agree to the scope, output, hours and working languages above.", false, true)}
      ${check("confidentiality", "I will follow the confidentiality, minimum-access and data rules, and never share passwords, card details, PINs or access codes on the platform.", false, true)}
      ${check("read_all", "I have read every section, including ownership of the work, safeguarding, ending early and Handova’s role.", false, true)}
      ${check("no_conflict", "I have no conflict of interest with the other party, or I have declared it in Messages.", false, true)}
      ${isOrg && !isTalent ? `${check("authority", `I am 18 or over and authorised to sign this agreement on behalf of ${e(s.organisation)}.`, false, true)}
      ${field("role", "Your role in the organisation", { required: true, value: state.user?.user_metadata?.org_role || "", attrs: 'minlength="2" maxlength="120" placeholder="e.g. Director"' })}
      ${field("focal_name", "Safeguarding focal point for this contribution", { required: true, attrs: 'minlength="2" maxlength="120"', hint: "The person in your organisation who receives safeguarding concerns. It can be you." })}
      ${field("focal_contact", "How to reach them", { required: true, attrs: 'minlength="5" maxlength="200" placeholder="Email or phone"' })}` : ""}
      ${field("name", "Type your full name to sign", { required: true, attrs: 'minlength="2" maxlength="120" autocomplete="name"' })}
      ${formEnd("Sign agreement")}<p class="small muted">Signatures are final. We keep the signed text, your name, email, signing time and IP address as the record of this agreement. Hours can be logged once both parties have signed.</p></form>` : "";
  const hourRows = hours.map((h) => `<div class="list-row"><div class="stack" style="--gap:4px"><strong>${date(h.work_date)} · ${Number(h.hours)} hours</strong><p class="small">${e(h.description)}</p>${h.review_note ? `<p class="small muted">Review note: ${e(h.review_note)}</p>` : ""}${safeURL(h.evidence) ? `<a class="small" href="${e(h.evidence)}" target="_blank" rel="noopener noreferrer">Supporting link</a>` : ""}</div><div class="row">${(h.status === "pending" ? pill(isOrg ? "Waiting for your review" : "Waiting for review", "ochre") : h.status === "changes_requested" ? pill("Changes asked", "clay") : pill("Approved"))}${isOrg && h.status === "pending" ? `<button class="btn sm" type="button" data-action="hours-approve" data-id="${h.id}">Approve</button><button class="btn secondary sm" type="button" data-action="hours-changes" data-id="${h.id}">Ask for changes</button>` : ""}</div></div>`).join("");
  const logForm = isTalent && x.status === "active" ? `<form class="form card" data-form="log-hours" data-id="${e(id)}"><h3>Log time</h3>${x.first_call_at ? "" : `<p class="small muted">Not had your first call yet? Agree the basics in Messages before you start. The call itself counts as time on this contribution.</p>`}<div class="form-grid">${field("work_date", "Date", { type: "date", value: today(), required: true, attrs: `max="${today()}"` })}${field("hours", "Hours", { type: "number", value: "1", required: true, attrs: 'min="0.25" max="12" step="0.25"' })}${field("description", "What you did", { type: "textarea", required: true, full: true, attrs: 'minlength="10" maxlength="2000"' })}${field("evidence", "Supporting link (optional)", { type: "url", full: true, attrs: 'maxlength="500" placeholder="https://"', hint: "Only share links the organisation has agreed to. Nothing confidential." })}</div>${formEnd("Submit for review")}</form>` : "";
  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="split">
    <article class="agreement-doc">
      <div class="row between">${eyebrow(`Contribution agreement · ${e(x.terms_version)}`)}${status(x.status)}</div>
      <h1 style="font-size:clamp(2rem,3.6vw,3rem);margin:12px 0 8px" data-no-i18n>${e(s.need_title)}</h1>
      <p class="muted">Between <strong>${e(s.organisation)}</strong>${s.organisation_country ? ` (${e(s.organisation_country)})` : ""} and <strong>${e(s.talent)}</strong>${s.talent_country ? ` (${e(s.talent_country)})` : ""}. Built from the need as it stood when the match was accepted; it cannot be changed after signing.</p>${getLang() === "en" || x.terms_version === CONTRIBUTION_VERSION ? "" : `<p class="small muted binding-note">This translation is provided for convenience. If it differs from the English version, the English version prevails.</p>`}
      <div class="facts"><div><span>Estimated hours</span><strong>${e(s.hours)}</strong></div><div><span>Working languages</span><strong>${e((s.languages || []).map(t).join(", "))}</strong></div><div><span>Delivery date</span><strong>${x.terms_version === CONTRIBUTION_VERSION ? "Agreed in your first call" : s.deadline ? date(s.deadline) : "None fixed"}</strong></div><div><span>Payment</span><strong>None · voluntary</strong></div></div>
      ${orgSig?.focal_point_name ? `<div class="banner">${icon("shield", 22, "#0f6f63")}<p><strong>Safeguarding focal point:</strong> <span data-no-i18n>${e(orgSig.focal_point_name)} · ${e(orgSig.focal_point_contact || "")}</span></p></div>` : ""}
      ${x.terms_version === CONTRIBUTION_VERSION && getLang() !== "en" ? `<p class="small muted">The agreement text below is in English, which is the binding version. A translation is coming soon.</p><div data-no-i18n lang="en">${contributionHtml(contributionSections(s, x.terms_version), e)}</div>` : contributionHtml(contributionSections(s, x.terms_version), e)}
      <div class="row no-print" style="margin-top:20px"><button class="btn secondary sm" type="button" data-action="print">${icon("download", 16)} Print or save as PDF</button></div>
    </article>
    <aside class="stack sticky" style="--gap:18px">
      <div class="side-card"><span class="serif" style="font-size:1.6rem">Signatures</span>${sig("Organisation", x.org_signed_name, x.org_signed_at, orgSig)}${sig("Professional", x.talent_signed_name, x.talent_signed_at, proSig)}${signForm}${mySigned && x.status === "awaiting_signatures" ? `<p class="small muted">You have signed. We will notify you when the other party signs.</p>` : ""}</div>
      ${x.status !== "awaiting_signatures" ? `<div class="side-card"><span class="serif" style="font-size:1.4rem">Progress</span><p><strong>${approved}</strong> of ${e(s.hours)} estimated hours approved</p><p class="small">${x.first_call_at ? `First call: ${x.first_call_written ? "agreed in writing" : "held"} ${date(x.first_call_at)}` : "First call: not recorded yet"}</p>${x.status === "active" && !x.first_call_at ? `<button class="btn sm" type="button" data-action="first-call" data-id="${e(id)}">Record what we agreed</button>` : ""}${x.status === "completed" ? `<p class="small">Completed ${date(x.completed_at)}.</p>` : ""}</div>` : ""}
      <div class="row">${btn(`${icon("chat", 18)} Messages`, `#conversation-for/${x.need_id}/${x.user_id}`, "secondary sm")}${isOrg && x.status === "active" ? `<button class="btn sm" type="button" data-action="complete" data-id="${e(id)}">Mark complete and endorse</button>` : ""}</div>
      ${["awaiting_signatures", "active"].includes(x.status) ? `<button class="link-btn" type="button" data-action="end-engagement" data-id="${e(id)}" style="color:var(--clay-ink)">End this contribution</button>` : ""}
      ${isOrg ? back("Back to the need", `#org/needs/${e(x.need_id)}`) : back("Back to workspace", "#workspace")}
    </aside></div>
    ${x.status !== "awaiting_signatures" ? `<section class="stack" style="--gap:18px;margin-top:40px"><h2 style="font-size:2rem">Time log</h2>${logForm}<div class="card">${hourRows || empty("No time logged yet", isTalent ? "Log your time as you work. The organisation reviews each entry." : "Time the professional logs will appear here for your review.")}</div></section>` : ""}
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
    if (m.kind === "system") { prevSender = ""; return `${sep}<div class="chat-system"><span class="small"><strong>Handova</strong> · ${e(timeOf(m.created_at))}</span><p style="white-space:pre-line">${linkCalls(e(m.body))}</p></div>`; }
    const mine = m.sender_id === state.user.id;
    const name = m.kind === "former" ? "Former member" : m.sender_id === c.user_id ? personName : orgName;
    const cont = prevSender === (m.sender_id || m.kind);
    prevSender = m.sender_id || m.kind;
    return `${sep}<div class="chat-row ${mine ? "mine" : "theirs"}${cont ? " cont" : ""}">${mine ? "" : `<span class="chat-av">${cont ? "" : avatar(name, 32)}</span>`}<div class="chat-col">${!mine && !cont ? `<span class="chat-name" data-no-i18n>${e(name)}</span>` : ""}<div class="bubble"><p data-no-i18n>${linkCalls(e(m.body))}</p></div><time class="chat-time" datetime="${e(m.created_at)}">${e(timeOf(m.created_at))}</time></div></div>`;
  }).join("");
}
export async function conversation(id) {
  if (!state.user) return { redirect: `#signin?next=${encodeURIComponent("#conversation/" + id)}` };
  const c = await result(db.from("conversations").select("*, need:needs(id,title,organisation_id,organisation:organisations(name)), person:profiles(user_id,name)").eq("id", id).maybeSingle()).catch(() => null);
  if (!c) return notFound("Conversation not found", "It may belong to someone else.");
  const msgs = await result(db.from("messages").select("*").eq("conversation_id", id).order("created_at"));
  const eng = await result(db.from("engagements").select("id,status,first_call_at").eq("need_id", c.need_id).eq("user_id", c.user_id).in("status", ["awaiting_signatures", "active"]).maybeSingle()).catch(() => null);
  const live = !!eng;
  const isTalent = c.user_id === state.user.id;
  const other = isTalent ? c.need?.organisation?.name || "Organisation" : c.person?.name || "Professional";
  const html = `<div class="wrap" style="max-width:860px;padding-block:40px 80px"><div class="stack" style="--gap:20px">
    ${isTalent ? back("Back to workspace", "#workspace") : back("Back to the need", `#org/needs/${e(c.need_id)}`)}
    <div class="row between"><div>${eyebrow("Conversation")}<h1 style="font-size:clamp(1.9rem,3.4vw,2.8rem)">${e(other)}</h1><p class="muted">About: <a href="#need/${e(c.need_id)}">${e(c.need?.title)}</a></p></div>${status(c.status)}</div>
    <div class="banner">${icon("lock", 22, "#0f6f63")}<p class="small"><span>Who can read this: you, the people who manage ${e(c.need?.organisation?.name || "the organisation")}’s Handova account, and Handova’s safeguarding lead only if someone here reports a concern.</span> <span>Keep it about the work. Video-call links are fine to share here. Never share passwords, card details or access codes, or personal information about the people the organisation supports.</span></p></div>
    ${eng?.status === "awaiting_signatures" || (!eng && c.status === "open") ? `<p class="small muted">Please keep phone numbers and personal emails out of Messages until you have both signed the agreement.</p>` : ""}
    ${eng?.status === "active" && !eng.first_call_at ? `<details class="card fold-card"><summary><h2 class="card-title">Tips for your first call</h2></summary><div class="stack" style="--gap:8px;margin-top:10px"><p>Use any video tool you both already use and post the link here. You don’t need to swap phone numbers to have a call. Audio only is fine if data is limited.</p><p>Talk anywhere, but write any decision or change to the output, hours or deadline here in Messages, so you both have it in writing.</p><p>Don’t record the call or use AI note-takers unless everyone agrees at the start. Introduce everyone who joins. Don’t show or discuss names, photos or files about the people the organisation supports, and close other windows before sharing your screen.</p><p>You can leave a call at any time if you feel uncomfortable. If something worrying happens on a call, by phone or on another app, you can still report it on Handova. If someone is in immediate danger, contact local emergency services first.</p><div class="row" style="--gap:8px">${btn("Record what we agreed", `#agreement/${e(eng.id)}`, "sm")}</div></div></details>` : ""}
    <section class="chat card">
      <div class="chat-head">${avatar(other, 40)}<div class="stack" style="--gap:2px;min-width:0"><strong data-no-i18n>${e(other)}</strong><span class="small muted">${isTalent ? "" : `<span data-no-i18n>${e(c.need?.organisation?.name || "")}</span> · `}<span>${live ? (eng.status === "active" ? "Contribution in progress" : "Waiting for signatures") : c.status === "open" ? "Application" : "Closed"}</span></span></div></div>
      <div class="chat-log" id="messages" aria-live="polite" data-count="${msgs.length}">${chatHtml(msgs, c, c.need?.organisation?.name || "Organisation", c.person?.name || "Professional")}</div>
      ${c.status === "open" ? `<form class="chat-compose" data-form="message" data-id="${e(id)}"><label class="visually-hidden" for="f-body">Message</label><textarea id="f-body" name="body" rows="1" maxlength="4000" required placeholder="Write a message…"></textarea><button class="btn chat-send" type="submit" aria-label="Send message">${icon("send", 18)}<span>Send</span></button><p class="form-error small" role="alert"></p></form><p class="small muted chat-hint">Press Ctrl + Enter to send. Messages stay here for both of you.</p>` : `<p class="chat-closed muted">This conversation is closed${c.closed_reason ? ": " + e(c.closed_reason.toLowerCase()) : ""}.</p>`}
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
    const timer = setInterval(async () => {
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
  const msgs = await result(db.from("messages").select("*").eq("conversation_id", id).order("created_at"));
  if (String(msgs.length) === log.dataset.count) return;
  const c = await result(db.from("conversations").select("user_id, need:needs(organisation:organisations(name)), person:profiles(user_id,name)").eq("id", id).maybeSingle());
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 80;
  log.innerHTML = chatHtml(msgs, c, c?.need?.organisation?.name || "Organisation", c?.person?.name || "Professional");
  log.dataset.count = String(msgs.length);
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
