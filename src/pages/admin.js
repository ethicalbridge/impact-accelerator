import { db, state, result, e, toast, go, withForm, val, loadSession, PROFILE_COLS, openDialog, closeDialog } from "../core.js";
import { icon, eyebrow, status, pill, field, select, check, formEnd, btn, empty, avatarFor } from "../ui.js";
import { date, safeURL } from "../utils.js";
import { decisionDialog } from "./workspace.js";

export async function notifications() {
  if (!state.user) return { redirect: "#signin?next=%23notifications" };
  const rows = await result(db.from("notifications").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(100));
  const html = `<div class="wrap" style="max-width:860px;padding-block:48px 80px"><div class="stack" style="--gap:20px">
    <div class="row between">${`<div>${eyebrow("Notifications")}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">What’s new</h1></div>`}${rows.some((r) => !r.read_at) ? `<button class="btn secondary sm" type="button" data-action="read-all">Mark all as read</button>` : ""}</div>
    <div class="card" style="padding-block:6px">${rows.length ? rows.map((r) => `<a class="notif ${r.read_at ? "" : "unread"}" href="${e(r.link || "#home")}" data-action="read-one" data-id="${r.id}">${icon("bell", 22, "#0f6f63")}<div class="stack" style="--gap:2px"><strong>${e(r.title)}</strong>${r.body ? `<span class="muted">${e(r.body)}</span>` : ""}<span class="small muted">${date(r.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div></a>`).join("") : empty("Nothing yet", "Applications, decisions, agreements and messages will appear here.")}</div>
    <p class="small muted">We also send you a short email for each notification (never the content of messages). You can turn emails off in <a href="#account">Account and privacy</a>.</p>
  </div></div>`;
  return { title: "Notifications", html };
}

// The need's safety answers as a checklist for review (Safeguarding Policy, section 7; Fraud Policy).
function safetyReview(sg = {}) {
  if (!sg || !Object.keys(sg).length) return `<p class="small" style="color:var(--clay-ink);font-weight:600">No safety answers: sent before the safety questions existed. Check the need yourself.</p>`;
  const ok = (v) => (v ? "✓" : "✗");
  const ticks = [["remote", "Remote"], ["no_contact", "No contact with people served"], ["no_child_images", "No images of children"], ["no_money", "No fees or money handling"]];
  const flags = [];
  if (sg.personal_data === "exception") flags.push(`<strong>Personal data needed:</strong> ${e(sg.personal_data_note || "")}`);
  if (sg.leak_risk === "yes") flags.push(`<strong>Risk if leaked:</strong> ${e(sg.leak_risk_note || "")}`);
  if (sg.distressing === "yes") flags.push(`<strong>Distressing content</strong> (professionals are warned)`);
  if (sg.regulated === "yes") flags.push(`<strong>Regulated advice:</strong> ${e(sg.regulated_note || "")}`);
  return `<div class="sg-review small"><span class="sg-flags">${ticks.map(([k, l]) => `<span class="pill ${sg[k] === "yes" ? "" : "clay"}">${ok(sg[k] === "yes")} ${l}</span>`).join("")}</span>${flags.length ? `<ul class="bullets">${flags.map((f) => `<li>${f}</li>`).join("")}</ul>` : `<span class="muted">No personal data, leak risk, distressing content or regulated advice.</span>`}</div>`;
}

export async function admin() {
  if (!state.user) return { redirect: "#signin?next=%23admin" };
  if (!state.isAdmin && state.needsMfa) return { title: "Admin", html: `<div class="wrap page-head">${eyebrow("Admin")}<h1>Enter your sign-in code</h1><p class="lead">Admin access needs the code from your authenticator app.</p><div class="row"><button class="btn" type="button" data-action="mfa-code">Enter code</button></div></div>` };
  if (!state.isAdmin) return { title: "Admin", html: `<div class="wrap page-head">${eyebrow("Admin")}<h1>Administrators only</h1><p class="lead">Your account doesn’t have admin access.</p></div>` };
  const [orgs, profiles, reports, engagements, needs, allOrgs, allProfiles, sigs, idQueue, idDocs, needQueue] = await Promise.all([
    result(db.from("organisations").select("*").in("status", ["pending", "changes_requested"]).order("created_at")),
    result(db.from("profiles").select(PROFILE_COLS).eq("review_status", "pending").order("updated_at")),
    result(db.from("reports").select("*").neq("status", "resolved").order("created_at", { ascending: false })),
    result(db.from("engagements").select("id,status,scope,created_at,completed_at,followup_due,followup_in_use,organisation_id,user_id").order("created_at", { ascending: false }).limit(200)),
    result(db.from("needs").select("id,status,created_at,organisation_id")),
    result(db.from("organisations").select("id,status")).catch(() => []),
    result(db.from("profiles").select("user_id,review_status,published")),
    result(db.from("agreement_signatures").select("user_id,kind,organisation_id,signer_role,version,full_name,signed_at,hours_committed,ip,email").order("signed_at", { ascending: false }).limit(1000)).catch(() => []),
    // Identity checks waiting for a person, whatever the profile's review status.
    result(db.from("profiles").select(PROFILE_COLS).in("id_status", ["name_mismatch", "in_review"]).order("updated_at")).catch(() => []),
    result(db.from("id_verifications").select("user_id,document_name,status,updated_at").order("updated_at", { ascending: false }).limit(500)).catch(() => []),
    // Needs sent for review. A need can only open once its organisation is approved.
    result(db.from("needs").select("id,title,description,output,skills,languages,hours,places,deadline,updated_at,organisation_id,safeguarding,organisation:organisations(name,status,country)").eq("status", "pending").order("updated_at")).catch(() => []),
  ]);
  // Safety tools: integrity signals, video-call ID requests and current suspensions (policies v1.0).
  const [signals, videoReqs, suspended] = await Promise.all([
    result(db.rpc("admin_integrity_signals")).catch(() => []),
    result(db.from("id_video_requests").select("user_id,requested_at,status").eq("status", "requested").order("requested_at")).catch(() => []),
    result(db.from("user_suspensions").select("user_id,reason,removed,suspended_at").is("lifted_at", null).order("suspended_at", { ascending: false })).catch(() => []),
  ]);
  const peopleIds = [...new Set([...videoReqs, ...suspended].map((x) => x.user_id))];
  const people = peopleIds.length ? await result(db.from("profiles").select("user_id,name").in("user_id", peopleIds)).catch(() => []) : [];
  const nameOf = (id) => people.find((p) => p.user_id === id)?.name || "Unknown";
  const safetyNotes = needQueue.length ? await result(db.from("need_safety_notes").select("need_id,personal_data_note,leak_risk_note").in("need_id", needQueue.map((n) => n.id))).catch(() => []) : [];
  // Changes approved organisations made to their public details, waiting for Handova (B5).
  const orgChanges = (await result(db.from("organisation_changes").select("organisation_id,changes,since,updated_at").order("since")).catch(() => [])).filter((c) => c.changes && Object.keys(c.changes).length);
  const changedOrgs = orgChanges.length ? await result(db.from("organisations").select("id,name,country,city,website,summary,org_type,ethical_bridge_url,logo_url").in("id", orgChanges.map((c) => c.organisation_id))).catch(() => []) : [];
  // Finished work still waiting for the organisation's endorsement.
  const waitingEndorse = await result(db.rpc("admin_endorsements_waiting")).catch(() => []);
  const docName = (uid) => idDocs.find((x) => x.user_id === uid && x.document_name)?.document_name || "";
  const sigFor = (uid) => sigs.find((x) => x.user_id === uid && x.kind === "professional");
  const orgSig = (oid) => sigs.find((x) => x.organisation_id === oid);
  const when = (d) => date(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const count = (arr, f) => arr.filter(f).length;
  const orgCard = (o) => `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${e(o.name)}</strong><span class="small muted">${e([o.city, o.country].filter(Boolean).join(", "))} · ${e(o.org_type)} · submitted ${date(o.created_at)}</span><p class="small">${e(o.summary)}</p>${o.website ? `<a class="small" href="${e(safeURL(o.website))}" target="_blank" rel="noopener noreferrer">${e(o.website)}</a>` : `<span class="small muted">No website given</span>`}${o.ethical_bridge_url ? `<a class="small" href="${e(safeURL(o.ethical_bridge_url))}" target="_blank" rel="noopener noreferrer">Ethical Bridge directory page</a>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No Ethical Bridge directory page given</span>`}${(() => { const g = orgSig(o.id); return g ? `<span class="small muted">Agreement ${e(g.version)} signed by ${e(g.full_name)} (${e(g.signer_role)}) on ${when(g.signed_at)}${g.ip ? ` from ${e(g.ip)}` : ""}</span>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No signed organisation agreement</span>`; })()}${(() => { const g = orgSig(o.id); if (!g?.email) return ""; const dom = String(g.email).split("@")[1]?.toLowerCase() || ""; const site = (() => { try { return new URL(safeURL(o.website) || "http://x.invalid").hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } })(); const match = dom && site && (dom === site || dom.endsWith("." + site)); return match ? `<span class="small" style="color:var(--teal);font-weight:600">Signer’s email is at the organisation’s own web address (${e(dom)}).</span>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">Confirm the signer’s authority: their email (${e(dom || "unknown")}) isn’t at the organisation’s web address. Write to the contact in its Ethical Bridge directory entry.</span>`; })()}<span class="small muted">Check: locally led, registered or fiscally hosted, real presence online or by reference. (The safeguarding focal point is named when they sign each contribution.)</span></div><div class="review-actions">${status(o.status)}<button class="btn sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="approved">Approve</button><button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="changes_requested">Ask for details</button><button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="rejected">Reject</button></div></div>`;
  const profCard = (p) => `<div class="list-row review-row"><div class="review-main">${avatarFor(p, 56)}<div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${p.user_id}" style="font-weight:700">${e(p.name)}</a><span class="small muted">${e(p.headline)} · ${e(p.country || "No country")} · 18+ ${p.age_confirmed ? "confirmed" : "not confirmed"}</span>${(p.experience_items || []).length ? `<span class="small">${(p.experience_items || []).slice(0, 3).map((x) => e([x.title, x.organisation, x.country].filter(Boolean).join(" · "))).join("<br>")}</span>` : ""}<p class="small">${e((p.bio || "").slice(0, 280))}${(p.bio || "").length > 280 ? "…" : ""}</p>${p.linkedin ? `<a class="small" style="font-weight:700" href="${e(safeURL(p.linkedin))}" target="_blank" rel="noopener noreferrer">Check LinkedIn: does the name, experience and photo match?</a>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No LinkedIn given: ask for changes</span>`}${(() => { const st = p.id_status || ""; const label = { "": "Identity not checked yet", started: "Identity check started, not finished", in_review: "Identity check in review at Didit", approved: "ID verified", declined: "Identity check declined", name_mismatch: "Identity check passed, but the name differs" }[st] || st;
          return `<span class="small" style="font-weight:600;color:${st === "approved" ? "var(--teal)" : st === "name_mismatch" || st === "declined" ? "var(--clay-ink)" : "var(--muted)"}">${e(label)}${docName(p.user_id) ? ` · name on document: “${e(docName(p.user_id))}”` : ""}</span>${st === "name_mismatch" || st === "in_review" ? `<span class="row" style="--gap:8px"><button class="btn sm" type="button" data-action="admin-id" data-id="${p.user_id}" data-ok="1">Confirm identity</button><button class="btn secondary sm" type="button" data-action="admin-id" data-id="${p.user_id}" data-ok="0">Decline</button></span>` : ""}`; })()}${(() => { const g = sigFor(p.user_id); return g ? `<span class="small muted">Agreement ${e(g.version)} signed as “${e(g.full_name)}” on ${date(g.signed_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}${g.ip ? ` from ${e(g.ip)}` : ""} · commits ${Number(p.hours_available) || 0} hours a month</span>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No signed agreement</span>`; })()}</div></div><div class="review-actions"><button class="btn sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="approved">Approve</button><button class="btn secondary sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="changes_requested">Ask for changes</button><button class="btn secondary sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="rejected">Reject</button></div></div>`;
  const needCard = (n) => { const orgOk = n.organisation?.status === "approved"; return `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${e(n.title)}</strong><span class="small muted">${e(n.organisation?.name || "")}${n.organisation?.country ? " · " + e(n.organisation.country) : ""} · ${n.hours} hours · ${n.places || 1} ${(n.places || 1) === 1 ? "person" : "people"} ${n.updated_at ? ` · sent ${date(n.updated_at)}` : ""}</span><p class="small">${e((n.description || "").slice(0, 400))}${(n.description || "").length > 400 ? "…" : ""}</p><p class="small" style="white-space:pre-line"><strong>What they will receive:</strong> ${e(n.output)}</p><span class="small muted">${e([(n.skills || []).join(", "), (n.languages || []).join(", ")].filter(Boolean).join(" · "))}</span>${safetyReview({ ...(n.safeguarding || {}), ...(safetyNotes.find((x) => x.need_id === n.id) || {}) })}<a class="small" href="#need/${n.id}">Open the full need</a>${orgOk ? "" : `<span class="small" style="color:var(--clay-ink);font-weight:600">The organisation is not approved yet. Approve it first; then this need can go live.</span>`}</div><div class="review-actions">${orgOk ? `<button class="btn sm" type="button" data-action="admin-need" data-id="${n.id}" data-decision="approved">Approve</button>` : `<button class="btn sm" type="button" disabled title="Approve the organisation first">Approve</button>`}<button class="btn secondary sm" type="button" data-action="admin-need" data-id="${n.id}" data-decision="changes_requested">Ask for changes</button></div></div>`; };
  const targetLink = (r) => r.target_type === "need" ? `#need/${r.target_id}` : r.target_type === "profile" ? `#profile/${r.target_id}` : r.target_type === "conversation" ? `#conversation/${r.target_id}` : r.target_type === "contribution" ? `#agreement/${r.target_id}` : "";
  const REASONS = { safety: "Safety or safeguarding", exploitation: "Sexual exploitation or abuse", harassment: "Harassment or inappropriate behaviour", fraud: "Fraud, payment requests or false hours", misleading: "Misleading or false information", privacy: "Privacy or data", spam: "Spam", other: "Something else" };
  const reportCard = (r) => `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${e(REASONS[r.reason] || r.reason)} · ${e(r.target_type)}</strong><span class="small muted">Reported ${date(r.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span><p class="small">${e(r.details)}</p>${r.admin_note ? `<p class="small muted">Handova note: ${e(r.admin_note)}</p>` : ""}${targetLink(r) ? `<a class="small" href="${targetLink(r)}">Open what was reported</a>` : ""}</div><div class="review-actions">${pill(r.status, r.status === "open" ? "clay" : "ochre")}<button class="btn sm" type="button" data-action="admin-report" data-id="${r.id}" data-status="reviewing">Reviewing</button><button class="btn secondary sm" type="button" data-action="admin-case" data-id="${r.id}">Case record…</button>${protectBtns(r)}<button class="btn secondary sm" type="button" data-action="admin-report-resolve" data-id="${r.id}">Resolve…</button></div></div>`;
  // Protective actions for what was reported (Safeguarding Policy, section 12). Each asks for a reason.
  const protectBtns = (r) => {
    const b = (act, label, id) => `<button class="btn secondary sm" type="button" data-action="${act}" data-id="${e(id)}">${label}</button>`;
    if (!r.target_id) return "";
    if (r.target_type === "profile") return b("admin-suspend", "Suspend person…", r.target_id) + b("admin-remove", "Remove person…", r.target_id);
    if (r.target_type === "conversation") return b("admin-freeze", "Pause conversation…", r.target_id) + b("admin-unfreeze", "Reopen…", r.target_id);
    if (r.target_type === "need") return b("admin-takedown", "Take down need…", r.target_id);
    if (r.target_type === "contribution") return `<button class="btn secondary sm" type="button" data-action="admin-contrib-close" data-id="${e(r.target_id)}" data-title="this contribution">Close contribution…</button>` + b("admin-hide-cv", "Hide CV entry…", r.target_id);
    return "";
  };
  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="stack" style="--gap:26px">
    <div class="row between" style="align-items:flex-end"><div>${eyebrow("Admin")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">What needs your attention</h1></div>${btn(`${icon("chart", 16)} Questionnaire answers`, "#admin-responses", "secondary sm")}</div>
    <div class="grid-4 admin-stats"><div class="stat"><strong>${orgs.filter((o) => o.status === "pending").length}</strong><span>organisations to review${orgs.some((o) => o.status === "changes_requested") ? ` (+${orgs.filter((o) => o.status === "changes_requested").length} waiting for details)` : ""}</span></div><div class="stat"><strong>${needQueue.length}</strong><span>needs to review</span></div><div class="stat"><strong>${profiles.length}</strong><span>profiles to review</span></div><div class="stat"><strong>${reports.length}</strong><span>open reports</span></div><div class="stat"><strong>${count(engagements, (x) => x.status === "active")}</strong><span>contributions in progress</span></div></div>
    ${videoReqs.length ? `<section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Video-call identity checks</h2><p class="small muted">These professionals asked to show their ID on a video call instead of using Didit. Email them to agree a time, then confirm here.</p>${videoReqs.map((v) => `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${v.user_id}" style="font-weight:700" data-no-i18n>${e(nameOf(v.user_id))}</a><span class="small muted">asked ${date(v.requested_at)}</span></div><div class="review-actions"><button class="btn sm" type="button" data-action="admin-id-video" data-id="${v.user_id}">Confirm identity…</button></div></div>`).join("")}</section>` : ""}
    ${signals.length ? `<section class="card" style="border-color:var(--ochre-line)"><h2 style="font-size:1.7rem;margin-bottom:8px">Integrity signals</h2><p class="small muted">Patterns worth a look, not findings: the same identity on two accounts, both sides signing from one internet address, hours above the estimate, or an organisation acting against a professional after they reported a concern.</p>${signals.map((g) => `<div class="list-row"><div class="stack" style="--gap:2px;min-width:0"><strong>${e(g.title)}</strong><span class="small muted" data-no-i18n>${e(g.detail || "")}</span></div>${g.link ? `<a class="btn secondary sm" href="${e(g.link)}">Open</a>` : ""}</div>`).join("")}</section>` : ""}
    ${suspended.length ? `<section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Suspended or removed</h2>${suspended.map((x) => `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${x.user_id}" style="font-weight:700" data-no-i18n>${e(nameOf(x.user_id))}</a><span class="small muted">${x.removed ? "Removed" : "Suspended"} ${date(x.suspended_at)} · <span data-no-i18n>${e(x.reason)}</span></span></div><div class="review-actions"><button class="btn secondary sm" type="button" data-action="admin-lift" data-id="${x.user_id}">Lift…</button></div></div>`).join("")}</section>` : ""}
    ${reports.length ? `<section class="card" style="border-color:#e6b9a6"><h2 style="font-size:1.7rem;margin-bottom:8px">Reports</h2>${reports.map(reportCard).join("")}</section>` : ""}
    ${waitingEndorse.length ? `<section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Endorsements waiting</h2><p class="small muted">The work is delivered (all agreed hours approved, or the professional said so) but the organisation hasn’t finished and endorsed it. Reminders go out at 7 and 14 days; after 14 days the organisation can’t send new needs.</p>${waitingEndorse.map((w) => { const d = Math.floor((Date.now() - Date.parse(w.since)) / 864e5); return `<div class="list-row"><span class="stack" style="--gap:2px"><strong>${e(w.organisation || "")} · ${e(w.talent || "")}</strong><span class="small muted">${e(w.need_title || "")}${w.talent_delivered ? ` · <span>the professional said it’s delivered</span>` : ""}</span></span>${pill(d === 1 ? "1 day" : `${d} days`, d > 30 ? "clay" : d > 14 ? "ochre" : "grey")}</div>`; }).join("")}</section>` : ""}
    ${orgChanges.length ? `<section class="card" style="border-color:var(--ochre-line)"><h2 style="font-size:1.7rem;margin-bottom:8px">Organisation changes to approve</h2><p class="small muted">Approved organisations edited their public details. The current version stays public until you approve.</p>${orgChanges.map((c) => { const o = changedOrgs.find((x) => x.id === c.organisation_id) || {}; const LBL = { name: "Name", country: "Country", city: "City", website: "Website", summary: "Summary", org_type: "Type", ethical_bridge_url: "Ethical Bridge page", logo_url: "Logo" };
      return `<div class="list-row review-row"><div class="stack" style="--gap:6px;min-width:0"><strong data-no-i18n>${e(o.name || "Organisation")}</strong><span class="small muted">waiting since ${date(c.since)}</span>${Object.entries(c.changes).map(([k, v]) => `<div class="small"><strong>${e(LBL[k] || k)}:</strong> <span data-no-i18n style="text-decoration:line-through;color:var(--muted)">${e(o[k] ?? "—")}</span> → <span data-no-i18n>${e(v ?? "—")}</span></div>`).join("")}</div>
        <div class="row" style="--gap:8px"><button class="btn sm" type="button" data-action="org-changes" data-id="${e(c.organisation_id)}" data-approve="1">Approve</button><button class="btn secondary sm" type="button" data-action="org-changes" data-id="${e(c.organisation_id)}" data-approve="">Decline…</button></div></div>`; }).join("")}</section>` : ""}
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Organisations awaiting review</h2>${orgs.length ? orgs.map(orgCard).join("") : empty("All caught up", "New organisations appear here.")}</section>
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Needs awaiting review</h2>${needQueue.length ? needQueue.map(needCard).join("") : empty("All caught up", "Needs appear here when an organisation sends one for review.")}</section>
    ${idQueue.filter((q) => !profiles.some((x) => x.user_id === q.user_id)).length ? `<section class="card" style="border-color:var(--ochre-line)"><h2 style="font-size:1.7rem;margin-bottom:8px">Identity checks to review</h2><p class="small muted">The check passed at Didit but needs a person: the name differs from the profile, or Didit is reviewing it.</p>${idQueue.filter((q) => !profiles.some((x) => x.user_id === q.user_id)).map(profCard).join("")}</section>` : ""}
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Profiles waiting for review</h2>${profiles.length ? profiles.map(profCard).join("") : empty("All caught up", "Profiles appear here when someone publishes or changes a published profile.")}</section>
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:6px">Handova in numbers</h2><p class="small muted" style="margin-bottom:10px">Live figures. Open any line to see the records behind it.</p><div class="al-numbers">
      ${[["Registered organisations", allOrgs.length, `${count(allOrgs, (o) => o.status === "approved")} approved · ${count(allOrgs, (o) => o.status === "pending")} under review${count(allOrgs, (o) => o.status === "suspended") ? ` · ${count(allOrgs, (o) => o.status === "suspended")} suspended` : ""}`, "#admin-list/organisations"],
        ["Registered professionals", allProfiles.length, `${count(allProfiles, (p) => p.review_status === "approved" && p.published)} approved and public`, "#admin-list/professionals"],
        ["Approved professionals", count(allProfiles, (p) => p.review_status === "approved" && p.published), "", "#admin-list/professionals?show=approved"],
        ["Open needs", count(needs, (n) => n.status === "open"), `${needs.length} needs in total`, "#admin-list/needs?show=open"],
        ["Contributions started", engagements.length, "", "#admin-list/contributions"],
        ["Contributions completed", count(engagements, (x) => x.status === "completed"), "", "#admin-list/contributions?show=completed"],
        ["Ended early", count(engagements, (x) => x.status === "ended"), "", "#admin-list/contributions?show=ended"],
        ["Six-month follow-ups answered “still in use”", `${count(engagements, (x) => x.followup_in_use === true)} of ${count(engagements, (x) => x.followup_in_use !== null && x.followup_in_use !== undefined)}`, "", "#admin-list/followups"], ["Activity log", "", "Every admin decision, with the time and the note", "#admin-list/activity"]]
        .map(([label, n, sub, href]) => `<a class="al-num" href="${href}"><span class="stack" style="--gap:2px"><span class="al-num-l">${label}</span>${sub ? `<span class="small muted">${sub}</span>` : ""}</span><strong>${n}</strong>${icon("arrow", 18)}</a>`).join("")}
    </div></section>
  </div></div>`;
  return { title: "Admin", html };
}

export function adminDecision(kind, id, decision) {
  const labels = { approved: "Approve", changes_requested: "Ask for changes", rejected: "Reject", suspended: "Suspend" };
  if (kind === "need") return decisionDialog(decision === "approved" ? "Approve this need?" : "Ask for changes?", decision === "approved" ? "It goes live straight away and the organisation is notified. You can add a short note." : "The need goes back to draft. The organisation sees your note on the need and in their notifications.", "admin-need", id,
    `${field("note", "Note", { type: "textarea", required: decision !== "approved", attrs: 'maxlength="1000"' })}<input type="hidden" name="decision" value="${decision}">`, decision === "approved" ? "Approve" : "Ask for changes");
  // Name who the decision is about in the title, so it is never a bare "Approve?".
  const who = document.querySelector(`[data-id="${CSS.escape(String(id))}"]`)?.closest(".list-row")?.querySelector("strong, a")?.textContent?.trim();
  decisionDialog(who ? `${labels[decision]}: ${who}?` : `${labels[decision]}?`, decision === "approved" ? "They will be notified. You can add a short welcome note." : decision === "suspended" ? "Its page and open needs go offline and its team can’t post new needs. Anyone waiting on an open need is told. Explain why; the team sees this note." : "Explain what they need to change or why. They will see this note in their notifications.", kind === "org" ? "admin-org" : "admin-profile", id,
    `${field("note", "Note", { type: "textarea", required: decision !== "approved", attrs: 'maxlength="1000"' })}<input type="hidden" name="decision" value="${decision}">`, labels[decision], decision === "rejected" || decision === "suspended");
}

export async function submitAdmin(kind, form) {
  await withForm(form, async (fd) => {
    if (kind === "admin-need") { if (val(fd, "decision") !== "approved" && !val(fd, "note")) throw Error("Write a note so the organisation knows what to change."); await result(db.rpc("admin_review_need", { p_need: form.dataset.id, p_decision: val(fd, "decision"), p_note: val(fd, "note") })); }
    else if (kind === "admin-org") await result(db.rpc("admin_review_organisation", { p_org: form.dataset.id, p_decision: val(fd, "decision"), p_note: val(fd, "note") }));
    else await result(db.rpc("admin_review_profile", { p_user: form.dataset.id, p_decision: val(fd, "decision"), p_note: val(fd, "note") }));
    document.getElementById("dialog").close();
    toast("Decision saved and sent.");
    go(location.hash.startsWith("#admin") ? location.hash : "#admin");
  });
}

// Case record for a report (Safeguarding Policy, section 16). Only admins can read it; the reporter can't.
export async function caseDialog(reportId) {
  const c = await result(db.from("report_cases").select("*").eq("report_id", reportId).maybeSingle()).catch(() => null) || {};
  const ta = (name, label, hint = "") => `<div class="field"><label for="f-c-${name}">${label}</label><textarea id="f-c-${name}" name="${name}" rows="2" maxlength="2000">${e(c[name] || "")}</textarea>${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  openDialog("Case record", `<form class="form" data-form="admin-case" data-id="${e(reportId)}"><p class="small muted">Only Handova admins see this. Keep it factual: what was done, when and by whom.</p>
    ${select("severity", "Severity", [["", "Not set"], ["urgent", "Urgent: immediate danger, a child, sexual exploitation or abuse, a credible threat"], ["high", "High: harassment, contact with people served, data shared outside the rules"], ["standard", "Standard: other breaches with no apparent harm"]], c.severity || "")}
    ${check("child_case", "This case involves a child (kept until the child turns 25 or for 6 years after closure, whichever is later)", !!c.child_case)}
    ${ta("protective_actions", "Protective actions", "For example: profile suspended on 20 Oct, conversation paused.")}
    ${ta("informed", "Who was told, and when", "Focal point, the people involved, the independent contact, authorities.")}
    ${ta("referral", "Referral to authorities, or why not")}
    ${ta("wishes", "Wishes of the person affected")}
    ${ta("decision", "Decision and reasons")}
    ${ta("outcome", "Outcome and what each side was told")}
    ${formEnd("Save case record", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitCase(form) {
  await withForm(form, async (fd) => {
    const row = { report_id: form.dataset.id, updated_at: new Date().toISOString(), updated_by: state.user.id };
    for (const k of ["severity", "protective_actions", "informed", "referral", "wishes", "decision", "outcome"]) row[k] = val(fd, k);
    row.child_case = fd.has("child_case");
    await result(db.from("report_cases").upsert(row));
    closeDialog();
    toast("Case record saved.");
  });
}
