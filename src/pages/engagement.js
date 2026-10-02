import { db, state, result, e, toast, go, withForm, val } from "../core.js";
import { icon, eyebrow, back, status, pill, field, check, formEnd, btn, empty } from "../ui.js";
import { date, today, safeURL } from "../utils.js";
import { notFound } from "./public.js";

export async function agreement(id) {
  if (!state.user) return { redirect: `#signin?next=${encodeURIComponent("#agreement/" + id)}` };
  const x = await result(db.from("engagements").select("*, organisation:organisations(name,country)").eq("id", id).maybeSingle()).catch(() => null);
  if (!x) return notFound("Agreement not found", "It may belong to someone else, or the link may be wrong.");
  const s = x.scope || {};
  const isTalent = x.user_id === state.user.id;
  const isOrg = state.memberships.some((m) => m.organisation_id === x.organisation_id);
  const mySigned = isTalent ? x.talent_signed_at : x.org_signed_at;
  const hours = x.status === "awaiting_signatures" ? [] : await result(db.from("hours").select("*").eq("engagement_id", id).order("work_date", { ascending: false }));
  const approved = hours.filter((h) => h.status === "approved").reduce((a, h) => a + Number(h.hours), 0);
  const sig = (who, name, when) => `<div class="sig"><span class="small muted">${who}</span><strong>${e(name || "Not yet signed")}</strong><span class="small" style="color:${when ? "var(--teal)" : "var(--ochre-ink)"};font-weight:600;display:inline-flex;gap:6px;align-items:center">${icon(when ? "check" : "clock", 16)}${when ? "Signed " + date(when) : "Signature needed"}</span></div>`;
  const idSt = state.profile?.id_status || "";
  const needsId = isTalent && state.idRequired && idSt !== "approved";
  const signForm = needsId && x.status === "awaiting_signatures" && !mySigned ? `<div class="stack" style="--gap:10px">${["in_review", "name_mismatch"].includes(idSt) ? `<p class="small"><strong>Your identity check is being reviewed.</strong> You can sign as soon as it is confirmed; we will notify you.</p>` : `<p class="small"><strong>Verify your identity first.</strong> It takes about three minutes and is required before you sign your first contribution agreement.</p><button type="button" class="btn sm" data-action="verify-id">Verify my identity</button>`}</div>` : x.status === "awaiting_signatures" && (isTalent || isOrg) && !mySigned ? `<form class="form" data-form="sign" data-id="${e(id)}">
      ${check("c1", "I agree to the scope, output, hours and working languages above.", false, true)}
      ${check("c2", "I will follow the confidentiality, minimum-access and data rules, and never share passwords, card details, PINs or access codes on the platform.", false, true)}
      ${check("c3", "I have read every section, including safeguarding and the platform’s role and limits.", false, true)}
      ${field("name", "Type your full name to sign", { required: true, attrs: 'minlength="2" maxlength="120" autocomplete="name"' })}
      ${formEnd("Sign agreement")}<p class="small muted">Signatures are final. Hours can be logged once both parties have signed.</p></form>` : "";
  const hourRows = hours.map((h) => `<div class="list-row"><div class="stack" style="--gap:4px"><strong>${date(h.work_date)} · ${Number(h.hours)} hours</strong><p class="small">${e(h.description)}</p>${h.review_note ? `<p class="small muted">Review note: ${e(h.review_note)}</p>` : ""}${safeURL(h.evidence) ? `<a class="small" href="${e(h.evidence)}" target="_blank" rel="noopener noreferrer">Supporting link</a>` : ""}</div><div class="row">${status(h.status)}${isOrg && h.status === "pending" ? `<button class="btn sm" type="button" data-action="hours-approve" data-id="${h.id}">Approve</button><button class="btn secondary sm" type="button" data-action="hours-changes" data-id="${h.id}">Request changes</button>` : ""}</div></div>`).join("");
  const logForm = isTalent && x.status === "active" ? `<form class="form card" data-form="log-hours" data-id="${e(id)}"><h3>Log time</h3><div class="form-grid">${field("work_date", "Date", { type: "date", value: today(), required: true, attrs: `max="${today()}"` })}${field("hours", "Hours", { type: "number", value: "1", required: true, attrs: 'min="0.25" max="12" step="0.25"' })}${field("description", "What you did", { type: "textarea", required: true, full: true, attrs: 'minlength="10" maxlength="2000"' })}${field("evidence", "Supporting link (optional)", { type: "url", full: true, attrs: 'maxlength="500" placeholder="https://"', hint: "Only share links the organisation has agreed to. Nothing confidential." })}</div>${formEnd("Submit for review")}</form>` : "";
  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="split">
    <article class="agreement-doc">
      <div class="row between">${eyebrow(`Contribution agreement · ${e(x.terms_version)}`)}${status(x.status)}</div>
      <h1 style="font-size:clamp(2rem,3.6vw,3rem);margin:12px 0 8px">${e(s.need_title)}</h1>
      <p class="muted">Between <strong>${e(s.talent)}</strong> and <strong>${e(s.organisation)}</strong>. Built from the need as it stood when the match was accepted; it cannot be changed after signing.</p>
      <div class="facts"><div><span>Estimated hours</span><strong>${e(s.hours)}</strong></div><div><span>Arrangement</span><strong>${e(s.arrangement)}</strong></div><div><span>Working languages</span><strong>${e((s.languages || []).join(", "))}</strong></div><div><span>Payment</span><strong>None · voluntary</strong></div></div>
      <section><h3>1. Agreed contribution</h3><p class="prose" style="font-size:1rem">${e(s.output)}</p><p class="small muted" style="margin-top:8px">Context: ${e(s.description)}</p></section>
      <section><h3>2. Scope and communication</h3><p>Both parties confirm timing, points of contact, review steps and what is out of scope before work begins. Changes need both parties’ agreement. Messages stay on Handova; personal contact details are shared only once both have signed, and only if both want to.</p></section>
      <section><h3>3. Confidentiality, data and access</h3><p>Each party uses confidential information only for this contribution and shares the minimum necessary, through an agreed secure channel. <strong>Passwords, payment-card details, PINs and access codes are never shared through Handova.</strong> Any system access uses individual, limited accounts that are removed when the work ends. Confidential or personal information is never put into AI tools or personal accounts without the organisation’s written permission, and is returned or deleted at handover. A suspected data breach is reported to the other party and to Handova within 24 hours.</p></section>
      <section><h3>4. Ownership and public evidence</h3><p>${e(s.organisation)} owns the deliverables and its own information unless you agree otherwise in writing. Nothing confidential appears on a public impact CV. The professional decides whether the reviewed record is published.</p></section>
      <section><h3>5. Safeguarding</h3><p>This contribution is remote and involves no direct contact with children or adults at risk and no access to their personal information. Both parties follow the safeguarding and protection from sexual exploitation and abuse standards in the agreements they signed with Handova, and the organisation’s own safeguarding policy; where they differ, the stricter rule applies. The organisation names its safeguarding focal point. Either party pauses the work and reports any concern within 24 hours to the other party and to Handova.</p></section>
      <section><h3>6. Relationship and responsibility</h3><p>This is a voluntary professional contribution. It creates no employment, payment, partnership or agency. Any expenses need separate written terms. Handova provides matching and record-keeping tools and is not a party to the work. It verifies professionals’ identity but does not check qualifications or outcomes. Work that is legal, medical, financial or otherwise regulated needs appropriate qualifications and separate terms.</p></section>
      <section><h3>7. Ending the contribution</h3><p>Either party can end the engagement at any time from this page. Completed work is reviewed by the organisation before it counts.</p></section>
    </article>
    <aside class="stack sticky" style="--gap:18px">
      <div class="side-card"><span class="serif" style="font-size:1.6rem">Signatures</span>${sig("Organisation", x.org_signed_name, x.org_signed_at)}${sig("Professional", x.talent_signed_name, x.talent_signed_at)}${signForm}${mySigned && x.status === "awaiting_signatures" ? `<p class="small muted">You have signed. We will notify you when the other party signs.</p>` : ""}</div>
      ${x.status !== "awaiting_signatures" ? `<div class="side-card"><span class="serif" style="font-size:1.4rem">Progress</span><p><strong>${approved}</strong> of ${e(s.hours)} estimated hours reviewed</p>${x.status === "completed" ? `<p class="small">Completed ${date(x.completed_at)}.</p>` : ""}</div>` : ""}
      <div class="row">${btn(`${icon("chat", 18)} Messages`, `#conversation-for/${x.need_id}/${x.user_id}`, "secondary sm")}${isOrg && x.status === "active" ? `<button class="btn sm" type="button" data-action="complete" data-id="${e(id)}">Mark complete</button>` : ""}</div>
      ${["awaiting_signatures", "active"].includes(x.status) ? `<button class="link-btn" type="button" data-action="end-engagement" data-id="${e(id)}" style="color:var(--clay-ink)">End this engagement</button>` : ""}
      ${back("Back to workspace", isOrg ? "#org" : "#workspace")}
    </aside></div>
    ${x.status !== "awaiting_signatures" ? `<section class="stack" style="--gap:18px;margin-top:40px"><h2 style="font-size:2rem">Time log</h2>${logForm}<div class="card">${hourRows || empty("No time logged yet", isTalent ? "Log your time as you work. The organisation reviews each entry." : "Time the professional logs will appear here for your review.")}</div></section>` : ""}
  </div>`;
  return { title: `Agreement · ${s.need_title}`, html };
}

export async function conversationFor(needId, userId) {
  const c = await result(db.from("conversations").select("id").eq("need_id", needId).eq("user_id", userId).maybeSingle()).catch(() => null);
  return c ? { redirect: `#conversation/${c.id}` } : notFound("Conversation not found", "Conversations open when someone applies or is invited.");
}

export async function conversation(id) {
  if (!state.user) return { redirect: `#signin?next=${encodeURIComponent("#conversation/" + id)}` };
  const c = await result(db.from("conversations").select("*, need:needs(id,title,organisation_id,organisation:organisations(name)), person:profiles(user_id,name)").eq("id", id).maybeSingle()).catch(() => null);
  if (!c) return notFound("Conversation not found", "It may belong to someone else.");
  const msgs = await result(db.from("messages").select("*").eq("conversation_id", id).order("created_at"));
  const isTalent = c.user_id === state.user.id;
  const other = isTalent ? c.need?.organisation?.name || "Organisation" : c.person?.name || "Professional";
  const html = `<div class="wrap" style="max-width:860px;padding-block:40px 80px"><div class="stack" style="--gap:20px">
    ${back("Back to workspace", isTalent ? "#workspace" : "#org")}
    <div class="row between"><div>${eyebrow("Conversation")}<h1 style="font-size:clamp(1.9rem,3.4vw,2.8rem)">${e(other)}</h1><p class="muted">About: <a href="#need/${e(c.need_id)}">${e(c.need?.title)}</a></p></div>${status(c.status)}</div>
    <div class="banner">${icon("lock", 22, "#0f6f63")}<p class="small">Keep conversations about the work. Don’t share passwords, card details or access codes, or personal information about the people an organisation supports.</p></div>
    <div class="card"><div class="messages" id="messages" aria-live="polite">${msgs.length ? msgs.map((m) => `<div class="message ${m.sender_id === state.user.id ? "mine" : ""}"><small>${m.sender_id === state.user.id ? "You" : e(other)} · ${e(new Date(m.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}</small><p class="prose" style="font-size:1rem">${e(m.body)}</p></div>`).join("") : `<p class="muted">No messages yet. Use this space to agree timing and next steps.</p>`}</div></div>
    ${c.status === "open" ? `<form class="form" data-form="message" data-id="${e(id)}">${field("body", "Message", { type: "textarea", required: true, attrs: 'maxlength="4000"' })}${formEnd("Send message", `<button class="btn secondary" type="button" data-action="close-conversation" data-id="${e(id)}">End conversation</button>`)}</form>` : `<p class="muted">This conversation is closed${c.closed_reason ? ": " + e(c.closed_reason.toLowerCase()) : ""}.</p>`}
    <button class="link-btn" type="button" data-action="report" data-type="conversation" data-id="${e(id)}" style="color:var(--muted);display:inline-flex;gap:8px;align-items:center">${icon("flag", 18)}Report this conversation</button>
  </div></div>`;
  return { title: `Conversation · ${other}`, html, after: () => { const m = document.getElementById("messages"); if (m) m.scrollTop = m.scrollHeight; } };
}

export async function submitEngagement(kind, form) {
  if (kind === "sign") return withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error("Tick all three confirmations and type your name."); }
    const s = await result(db.rpc("sign_engagement", { p_id: form.dataset.id, p_name: val(fd, "name") }));
    toast(s === "active" ? "Signed by both. The work can begin." : "Signed. We will notify you when the other party signs.");
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
    await result(db.from("messages").insert({ conversation_id: form.dataset.id, sender_id: state.user.id, body: val(fd, "body") }));
    go(location.hash);
  });
}
