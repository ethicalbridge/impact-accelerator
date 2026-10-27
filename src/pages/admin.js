import { db, state, result, e, toast, go, withForm, val, loadSession, PROFILE_COLS, openDialog, closeDialog, errorMessage } from "../core.js";
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
  const [orgs, profiles, reportsAll, engagements, needs, allOrgs, allProfiles, sigs, idQueue, idDocs, needQueue, orgMembers] = await Promise.all([
    result(db.from("organisations").select("*").in("status", ["pending", "changes_requested"]).order("created_at")),
    result(db.from("profiles").select(PROFILE_COLS).eq("review_status", "pending").order("updated_at")),
    loadReports(),
    result(db.from("engagements").select("id,status,scope,created_at,completed_at,followup_due,followup_in_use,organisation_id,user_id").order("created_at", { ascending: false }).limit(200)),
    result(db.from("needs").select("id,status,created_at,organisation_id")),
    result(db.from("organisations").select("id,status")).catch(() => []),
    result(db.from("profiles").select("user_id,review_status,published")),
    result(db.from("agreement_signatures").select("user_id,kind,organisation_id,signer_role,version,full_name,signed_at,hours_committed,email").order("signed_at", { ascending: false }).limit(1000)).catch(() => []),
    // Identity checks waiting for a person, whatever the profile's review status.
    result(db.from("profiles").select(PROFILE_COLS).in("id_status", ["name_mismatch", "in_review"]).order("updated_at")).catch(() => []),
    result(db.from("id_verifications").select("user_id,document_name,status,updated_at").order("updated_at", { ascending: false }).limit(500)).catch(() => []),
    // Needs sent for review. A need can only open once its organisation is approved.
    result(db.from("needs").select("id,title,description,output,skills,languages,hours,places,deadline,updated_at,organisation_id,safeguarding,organisation:organisations(name,status,country)").eq("status", "pending").order("updated_at")).catch(() => []),
    result(db.from("organisation_members").select("organisation_id,full_name,role")).catch(() => []),
  ]);
  const reports = reportsAll.filter((r) => r.status !== "resolved");
  // Safety tools: integrity signals, video-call ID requests and current suspensions (policies v1.0).
  const [signals, videoReqs, suspended] = await Promise.all([
    result(db.rpc("admin_integrity_signals")).catch(() => []),
    result(db.from("id_video_requests").select("user_id,requested_at,status").eq("status", "requested").order("requested_at")).catch(() => []),
    result(db.from("user_suspensions").select("user_id,removed,suspended_at").is("lifted_at", null).order("suspended_at", { ascending: false })).catch(() => []),
  ]);
  // The suspended person can read their own suspension row, so the reason lives only in the activity log (admins only).
  const suspensionLog = suspended.length ? await result(db.from("admin_actions").select("target_id,detail,created_at").in("action", ["person_suspended", "person_removed"]).in("target_id", suspended.map((x) => x.user_id)).order("created_at", { ascending: false })).catch(() => []) : [];
  suspended.forEach((x) => { x.reason = suspensionLog.find((l) => l.target_id === x.user_id)?.detail?.reason || ""; });
  // Handova's notes on open reports live in the admin-only case records (the reporter can read their own report row).
  const reportNotes = reports.length ? await result(db.from("report_cases").select("report_id,admin_note").in("report_id", reports.map((r) => r.id))).catch(() => []) : [];
  reports.forEach((r) => { r.admin_note = reportNotes.find((c) => c.report_id === r.id)?.admin_note || ""; });
  const peopleIds = [...new Set([...videoReqs, ...suspended].map((x) => x.user_id))];
  const [people, emails, hiddenCv, declared, browserErrors] = await Promise.all([
    peopleIds.length ? result(db.from("profiles").select("user_id,name").in("user_id", peopleIds)).catch(() => []) : [],
    // Emails only for the people Handova must write to (video-call checks). Admin-only server function (A21).
    videoReqs.length ? result(db.rpc("admin_user_emails", { p_users: videoReqs.map((v) => v.user_id) })).catch(() => []) : [],
    // Impact CV entries hidden by a removal, so lifting it can ask whether to restore them (A24).
    suspended.length ? result(db.from("engagements").select("id,user_id,hidden_by_handova").in("user_id", suspended.map((x) => x.user_id))).catch(() => []) : [],
    declaredLinks(),
    // Errors caught in visitors' browsers in the last 7 days (W8). Only the text, page and app version are kept.
    result(db.from("client_errors").select("id").gte("created_at", new Date(Date.now() - 7 * 864e5).toISOString()).limit(1000)).then((x) => x.length).catch(() => null),
  ]);
  const nameOf = (id) => people.find((p) => p.user_id === id)?.name || "Unknown";
  const emailOf = (id) => emails.find((x) => x.user_id === id)?.email || "";
  const safetyNotes = needQueue.length ? await result(db.from("need_safety_notes").select("need_id,personal_data_note,leak_risk_note").in("need_id", needQueue.map((n) => n.id))).catch(() => []) : [];
  // Changes approved organisations made to their public details, waiting for Handova (B5).
  const orgChanges = (await result(db.from("organisation_changes").select("organisation_id,changes,since,updated_at").order("since")).catch(() => [])).filter((c) => c.changes && Object.keys(c.changes).length);
  const changedOrgs = orgChanges.length ? await result(db.from("organisations").select("id,name,country,city,website,summary,org_type,ethical_bridge_url,logo_url").in("id", orgChanges.map((c) => c.organisation_id))).catch(() => []) : [];
  // Later apply-by dates organisations asked for on live needs (27 Oct 2026).
  const deadlineAsks = await result(db.from("needs").select("id,title,deadline,requested_deadline,organisation:organisations(name)").not("requested_deadline", "is", null)).catch(() => []);
  // Everyone who signed up and the stage they are at (27 Oct 2026).
  const everyone = await result(db.rpc("admin_people")).catch(() => []);
  const { PEOPLE_GROUPS } = await import("./adminlists.js");
  // Finished work still waiting for the organisation's endorsement.
  const waitingEndorse = await result(db.rpc("admin_endorsements_waiting")).catch(() => []);
  const docName = (uid) => idDocs.find((x) => x.user_id === uid && x.document_name)?.document_name || "";
  const sigFor = (uid) => sigs.find((x) => x.user_id === uid && x.kind === "professional");
  const orgSig = (oid) => sigs.find((x) => x.organisation_id === oid);
  const when = (d) => date(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const count = (arr, f) => arr.filter(f).length;
  const STAFF = { none: "Volunteers only", "1-5": "1–5 paid staff", "6-20": "6–20 paid staff", "21-50": "21–50 paid staff", "50+": "More than 50 paid staff" };
  // Everything the organisation filled in, so the decision can be made from this card.
  const orgFacts = (o) => {
    const team = (orgMembers || []).filter((m) => m.organisation_id === o.id);
    const g = orgSig(o.id);
    const rows = [
      ["Type", o.org_type], ["Location", [o.city, o.country].filter(Boolean).join(", ")], ["Team size", STAFF[o.staff_size] || o.staff_size || "Not given yet"],
      ["Account holder", team.map((m) => [m.full_name, m.role && m.role !== "owner" ? m.role : ""].filter(Boolean).join(", ")).join("; ") || "—"],
      ["Signed by", g ? `${g.full_name}${g.signer_role ? `, ${g.signer_role}` : ""}${g.email ? ` · ${g.email}` : ""}` : "Not signed"],
      ["Locally led", o.locally_led_confirmed ? "Confirmed by the organisation" : "Not confirmed"],
    ];
    return `<dl class="org-facts">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd data-no-i18n>${e(v || "—")}</dd></div>`).join("")}</dl>`;
  };
  const orgCard = (o) => `<div class="list-row review-row"><div class="stack" style="--gap:6px;min-width:0"><div class="row" style="--gap:12px;flex-wrap:nowrap;align-items:center">${o.logo_url && safeURL(o.logo_url) ? `<img class="org-review-logo" src="${e(safeURL(o.logo_url))}" alt="" referrerpolicy="no-referrer">` : ""}<a href="#admin-org/${e(o.id)}" style="font-weight:700" data-no-i18n>${e(o.name)}</a></div><span class="small muted">submitted ${date(o.created_at)}</span><p class="small" style="white-space:pre-line" data-no-i18n>${e(o.summary)}</p>${orgFacts(o)}<span class="row small" style="--gap:14px"><a href="#admin-org/${e(o.id)}" style="font-weight:700">All details and edit</a><a href="#organisations/${e(o.id)}" style="font-weight:700">Preview their public page</a></span>${o.website ? `<a class="small" href="${e(safeURL(o.website))}" target="_blank" rel="noopener noreferrer">${e(o.website)} <span class="visually-hidden">(opens in a new tab)</span></a>` : `<span class="small muted">No website given</span>`}${o.ethical_bridge_url ? `<a class="small" href="${e(safeURL(o.ethical_bridge_url))}" target="_blank" rel="noopener noreferrer">Ethical Bridge directory page <span class="visually-hidden">(opens in a new tab)</span></a>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No Ethical Bridge directory page given</span>`}${(() => { const g = orgSig(o.id); return g ? `<span class="small muted">Agreement ${e(g.version)} signed by ${e(g.full_name)} (${e(g.signer_role)}) on ${when(g.signed_at)}</span>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No signed organisation agreement</span>`; })()}${(() => { const g = orgSig(o.id); if (!g?.email) return ""; const dom = String(g.email).split("@")[1]?.toLowerCase() || ""; const site = (() => { try { return new URL(safeURL(o.website) || "http://x.invalid").hostname.replace(/^www\./, "").toLowerCase(); } catch { return ""; } })(); const match = dom && site && (dom === site || dom.endsWith("." + site)); return match ? `<span class="small" style="color:var(--teal);font-weight:600">Signer’s email is at the organisation’s own web address (${e(dom)}).</span>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">Confirm the signer’s authority: their email (${e(dom || "unknown")}) isn’t at the organisation’s web address. Write to the contact in its Ethical Bridge directory entry.</span>`; })()}<span class="small muted">Check: locally led, registered or fiscally hosted, real presence online or by reference. (The safeguarding focal point is named when they sign each contribution.)</span></div><div class="review-actions">${status(o.status)}<button class="btn sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="approved">Approve</button><button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="changes_requested">Ask for details</button><button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="rejected">Reject</button></div></div>`;
  const profCard = (p) => `<div class="list-row review-row"><div class="review-main">${avatarFor(p, 56)}<div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${p.user_id}" style="font-weight:700">${e(p.name)}</a><span class="small muted">${e(p.headline)} · ${e(p.country || "No country")} · 18+ ${p.age_confirmed ? "confirmed" : "not confirmed"}</span>${(p.experience_items || []).length ? `<span class="small">${(p.experience_items || []).slice(0, 3).map((x) => e([x.title, x.organisation, x.country].filter(Boolean).join(" · "))).join("<br>")}</span>` : ""}<p class="small">${e((p.bio || "").slice(0, 280))}${(p.bio || "").length > 280 ? "…" : ""}</p>${p.linkedin ? `<a class="small" style="font-weight:700" href="${e(safeURL(p.linkedin))}" target="_blank" rel="noopener noreferrer">Check LinkedIn: does the name, experience and photo match? <span class="visually-hidden">(opens in a new tab)</span></a>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No LinkedIn given: ask for changes</span>`}${(() => { const st = p.id_status || ""; const label = { "": "Identity not checked yet", started: "Identity check started, not finished", in_review: "Identity check in review at Didit", approved: "ID verified", declined: "Identity check declined", name_mismatch: "Identity check passed, but the name differs" }[st] || st;
          return `<span class="small" style="font-weight:600;color:${st === "approved" ? "var(--teal)" : st === "name_mismatch" || st === "declined" ? "var(--clay-ink)" : "var(--muted)"}">${e(label)}${docName(p.user_id) ? ` · name on document: “${e(docName(p.user_id))}”` : ""}</span>${st === "name_mismatch" || st === "in_review" ? `<span class="row" style="--gap:8px"><button class="btn sm" type="button" data-action="admin-id" data-id="${p.user_id}" data-ok="1">Confirm identity</button><button class="btn secondary sm" type="button" data-action="admin-id" data-id="${p.user_id}" data-ok="0">Decline</button></span>` : ""}`; })()}${(() => { const g = sigFor(p.user_id); return g ? `<span class="small muted">Agreement ${e(g.version)} signed as “${e(g.full_name)}” on ${date(g.signed_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })} · commits ${Number(p.hours_available) || 0} hours a month</span>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No signed agreement</span>`; })()}</div></div><div class="review-actions"><button class="btn sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="approved">Approve</button><button class="btn secondary sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="changes_requested">Ask for changes</button><button class="btn secondary sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="rejected">Reject</button></div></div>`;
  const needCard = (n) => { const orgOk = n.organisation?.status === "approved"; return `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${e(n.title)}</strong><span class="small muted">${e(n.organisation?.name || "")}${n.organisation?.country ? " · " + e(n.organisation.country) : ""} · ${n.hours} hours · ${n.places || 1} ${(n.places || 1) === 1 ? "person" : "people"} ${n.updated_at ? ` · sent ${date(n.updated_at)}` : ""}</span>${deadlineWarn(n)}<p class="small">${e((n.description || "").slice(0, 400))}${(n.description || "").length > 400 ? "…" : ""}</p><p class="small" style="white-space:pre-line"><strong>What they will receive:</strong> ${e(n.output)}</p><span class="small muted">${e([(n.skills || []).join(", "), (n.languages || []).join(", ")].filter(Boolean).join(" · "))}</span>${safetyReview({ ...(n.safeguarding || {}), ...(safetyNotes.find((x) => x.need_id === n.id) || {}) })}<a class="small" href="#need/${n.id}">Open the full need</a>${orgOk ? "" : `<span class="small" style="color:var(--clay-ink);font-weight:600">The organisation is not approved yet. Approve it first; then this need can go live.</span>`}</div><div class="review-actions">${orgOk ? `<button class="btn sm" type="button" data-action="admin-need" data-id="${n.id}" data-decision="approved">Approve</button>` : `<button class="btn sm" type="button" disabled title="Approve the organisation first">Approve</button>`}<button class="btn secondary sm" type="button" data-action="admin-need" data-id="${n.id}" data-decision="changes_requested">Ask for changes</button></div></div>`; };
  const reportCard = (r) => `<div class="list-row review-row"><div class="stack" style="--gap:6px;min-width:0">${reportSummary(r)}${r.admin_note ? `<p class="small muted" style="white-space:pre-line"><span>Handova note:</span> <span data-no-i18n>${e(r.admin_note)}</span></p>` : ""}${targetLink(r) ? `<a class="small" href="${targetLink(r)}">Open what was reported</a>` : ""}</div><div class="review-actions">${r.status === "open" ? `<button class="btn sm" type="button" data-action="admin-report" data-id="${r.id}" data-status="reviewing">Reviewing</button>` : ""}<button class="btn secondary sm" type="button" data-action="admin-case" data-id="${r.id}">Case record…</button>${protectBtns(r)}<button class="btn secondary sm" type="button" data-action="admin-report-resolve" data-id="${r.id}">Resolve…</button></div></div>`;
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
    <div class="row between" style="align-items:flex-end"><div>${eyebrow("Admin")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">What needs your attention</h1></div></div>
    <nav class="admin-shortcuts" aria-label="Admin lists">${[["people", "Organisations", "#admin-list/organisations"], ["user", "Professionals", "#admin-list/professionals"], ["user", "Everyone who signed up", "#admin-list/people"], ["doc", "Needs", "#admin-list/needs"], ["check", "Contributions", "#admin-list/contributions"], ["flag", "Reports", "#admin-list/reports"], ["chart", "Questionnaire answers", "#admin-responses"]].map(([ic, label, href]) => `<a class="btn secondary sm" href="${href}">${icon(ic, 16)}<span>${label}</span></a>`).join("")}</nav>
    <div class="grid-4 admin-stats"><div class="stat"><strong>${orgs.filter((o) => o.status === "pending").length}</strong><span>organisations to review${orgs.some((o) => o.status === "changes_requested") ? ` (+${orgs.filter((o) => o.status === "changes_requested").length} waiting for details)` : ""}</span></div><div class="stat"><strong>${needQueue.length}</strong><span>needs to review</span></div><div class="stat"><strong>${profiles.length}</strong><span>profiles to review</span></div><div class="stat"><strong>${reports.length}</strong><span>open reports</span></div><div class="stat"><strong>${count(engagements, (x) => x.status === "active")}</strong><span>contributions in progress</span></div></div>
    ${videoReqs.length ? `<section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Video-call identity checks</h2><p class="small muted">These professionals asked to show their ID on a video call instead of using Didit. Email them to agree a time, then confirm here.</p>${videoReqs.map((v) => `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${v.user_id}" style="font-weight:700" data-no-i18n>${e(nameOf(v.user_id))}</a>${emailOf(v.user_id) ? `<a class="small" href="mailto:${e(emailOf(v.user_id))}?subject=${encodeURIComponent("Handova identity check: video call")}" data-no-i18n>${e(emailOf(v.user_id))}</a>` : ""}<span class="small muted">asked ${date(v.requested_at)}</span></div><div class="review-actions"><button class="btn sm" type="button" data-action="admin-id-video" data-id="${v.user_id}">Confirm identity…</button><button class="btn secondary sm" type="button" data-action="admin-id-video-decline" data-id="${v.user_id}" data-name="${e(nameOf(v.user_id))}">Couldn’t verify…</button></div></div>`).join("")}</section>` : ""}
    ${signals.length ? `<section class="card" style="border-color:var(--ochre-line)"><h2 style="font-size:1.7rem;margin-bottom:8px">Integrity signals</h2><p class="small muted">Patterns worth a look, not findings: the same identity on two accounts, both sides signing from one internet address, hours above the estimate, or an organisation acting against a professional after they reported a concern. Once you mark one as checked, it stays hidden unless something new happens.</p>${signals.map((g) => `<div class="list-row"><div class="stack" style="--gap:2px;min-width:0"><strong>${e(g.title)}</strong><span class="small muted" data-no-i18n>${e(g.detail || "")}</span></div><div class="row" style="--gap:8px">${g.link ? `<a class="btn secondary sm" href="${e(g.link)}">Open</a>` : ""}${g.signal_key ? `<button class="btn secondary sm" type="button" data-action="admin-signal-ok" data-id="${e(g.signal_key)}" data-title="${e(g.title)}">Checked, nothing wrong…</button>` : ""}</div></div>`).join("")}</section>` : ""}
    ${suspended.length ? `<section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Suspended or removed</h2>${suspended.map((x) => { const hidden = hiddenCv.filter((h) => h.user_id === x.user_id && h.hidden_by_handova).length; return `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${x.user_id}" style="font-weight:700" data-no-i18n>${e(nameOf(x.user_id))}</a><span class="small muted">${x.removed ? "Removed" : "Suspended"} ${date(x.suspended_at)} · <span data-no-i18n>${e(x.reason)}</span></span>${hidden ? `<span class="small muted">${hidden === 1 ? "1 impact CV entry hidden" : `${hidden} impact CV entries hidden`}</span>` : ""}</div><div class="review-actions"><button class="btn secondary sm" type="button" data-action="admin-lift" data-id="${x.user_id}" data-hidden="${hidden}" data-removed="${x.removed ? "1" : ""}">Lift…</button></div></div>`; }).join("")}</section>` : ""}
    <section class="card" style="${reports.length ? "border-color:#e6b9a6" : ""}"><div class="row between" style="align-items:flex-end;margin-bottom:8px"><h2 style="font-size:1.7rem">Reports</h2><div class="row" style="--gap:8px"><button class="btn secondary sm" type="button" data-action="admin-record-report">Record an emailed report</button>${btn("All reports", "#admin-list/reports", "secondary sm")}</div></div>${reports.length ? `<p class="small muted">Urgent reasons (sexual exploitation or abuse, and safety or safeguarding) are pinned to the top. Read them today.</p>${sortReports(reports).map(reportCard).join("")}` : empty("No open reports", "Reports from the site appear here. Record concerns that reach you by email so they get a reference and a case record.")}</section>
    ${declared.length ? `<section class="card" style="border-color:var(--ochre-line)"><h2 style="font-size:1.7rem;margin-bottom:8px">Declared links</h2><p class="small muted">Applications and invitations where someone declared a personal, family, financial or work link with the organisation. Agree with the organisation how it is managed (Code of Conduct, Fraud Policy).</p>${declared.map(declaredRow).join("")}</section>` : ""}
    ${waitingEndorse.length ? `<section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Endorsements waiting</h2><p class="small muted">The work is delivered (all agreed hours approved, or the professional said so) but the organisation hasn’t finished and endorsed it. Reminders go out at 7 and 14 days; after 14 days the organisation can’t send new needs.</p>${waitingEndorse.map((w) => { const d = Math.floor((Date.now() - Date.parse(w.since)) / 864e5); return `<div class="list-row"><span class="stack" style="--gap:2px"><strong>${e(w.organisation || "")} · ${e(w.talent || "")}</strong><span class="small muted">${e(w.need_title || "")}${w.talent_delivered ? ` · <span>the professional said it’s delivered</span>` : ""}</span></span>${pill(d === 1 ? "1 day" : `${d} days`, d > 30 ? "clay" : d > 14 ? "ochre" : "grey")}</div>`; }).join("")}</section>` : ""}
    ${deadlineAsks.length ? `<section class="card" style="border-color:var(--ochre-line)"><h2 style="font-size:1.7rem;margin-bottom:8px">New apply-by dates to approve</h2><p class="small muted">Organisations asked for more time on a live need. Once you approve, the need is open until the new date.</p>${deadlineAsks.map((n) => `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><a href="#need/${e(n.id)}" style="font-weight:700" data-no-i18n>${e(n.title)}</a><span class="small muted" data-no-i18n>${e(n.organisation?.name || "")}</span><span class="small"><span style="text-decoration:line-through;color:var(--muted)">${n.deadline ? date(n.deadline) : "—"}</span> → <strong>${date(n.requested_deadline)}</strong></span></div><div class="row" style="--gap:8px"><button class="btn sm" type="button" data-action="admin-need-deadline" data-id="${e(n.id)}" data-approve="1">Approve</button><button class="btn secondary sm" type="button" data-action="admin-need-deadline" data-id="${e(n.id)}" data-approve="">Decline…</button></div></div>`).join("")}</section>` : ""}
    ${orgChanges.length ? `<section class="card" style="border-color:var(--ochre-line)"><h2 style="font-size:1.7rem;margin-bottom:8px">Organisation changes to approve</h2><p class="small muted">Approved organisations edited their public details. The current version stays public until you approve.</p>${orgChanges.map((c) => { const o = changedOrgs.find((x) => x.id === c.organisation_id) || {}; const LBL = { name: "Name", country: "Country", city: "City", website: "Website", summary: "Summary", org_type: "Type", ethical_bridge_url: "Ethical Bridge page", logo_url: "Logo" };
      return `<div class="list-row review-row"><div class="stack" style="--gap:6px;min-width:0"><a href="#admin-org/${e(c.organisation_id)}" style="font-weight:700" data-no-i18n>${e(o.name || "Organisation")}</a><span class="small muted">waiting since ${date(c.since)}</span>${Object.entries(c.changes).map(([k, v]) => `<div class="small"><strong>${e(LBL[k] || k)}:</strong> <span data-no-i18n style="text-decoration:line-through;color:var(--muted)">${e(o[k] ?? "—")}</span> → <span data-no-i18n>${e(v ?? "—")}</span></div>`).join("")}</div>
        <div class="row" style="--gap:8px"><button class="btn sm" type="button" data-action="org-changes" data-id="${e(c.organisation_id)}" data-approve="1">Approve</button><button class="btn secondary sm" type="button" data-action="org-changes" data-id="${e(c.organisation_id)}" data-approve="">Decline…</button></div></div>`; }).join("")}</section>` : ""}
    <section class="card"><div class="row between" style="align-items:baseline;margin-bottom:8px"><h2 style="font-size:1.7rem">Organisations awaiting review</h2><a href="#admin-list/organisations" style="font-weight:700">All registered organisations</a></div>${orgs.length ? orgs.map(orgCard).join("") : empty("All caught up", "New organisations appear here.")}</section>
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Needs awaiting review</h2>${needQueue.length ? needQueue.map(needCard).join("") : empty("All caught up", "Needs appear here when an organisation sends one for review.")}</section>
    ${idQueue.filter((q) => !profiles.some((x) => x.user_id === q.user_id)).length ? `<section class="card" style="border-color:var(--ochre-line)"><h2 style="font-size:1.7rem;margin-bottom:8px">Identity checks to review</h2><p class="small muted">The check passed at Didit but needs a person: the name differs from the profile, or Didit is reviewing it.</p>${idQueue.filter((q) => !profiles.some((x) => x.user_id === q.user_id)).map(profCard).join("")}</section>` : ""}
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Profiles waiting for review</h2>${profiles.length ? profiles.map(profCard).join("") : empty("All caught up", "Profiles appear here when someone publishes or changes a published profile.")}</section>
    ${everyone.length ? `<section class="card"><div class="row between" style="align-items:baseline;margin-bottom:6px"><h2 style="font-size:1.7rem">Where everyone is</h2><a href="#admin-list/people" style="font-weight:700">Everyone who signed up (${everyone.length})</a></div><p class="small muted" style="margin-bottom:10px">Every account by stage, from sign-up to contributing. Open a line to see who and what they still need to do.</p><div class="al-numbers">${Object.entries(PEOPLE_GROUPS).map(([k, [label, f]]) => `<a class="al-num" href="#admin-list/people?show=${k}"><span class="al-num-l">${label}</span><strong>${everyone.filter(f).length}</strong>${icon("arrow", 18)}</a>`).join("")}</div></section>` : ""}
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:6px">Handova in numbers</h2><p class="small muted" style="margin-bottom:10px">Live figures. Open any line to see the records behind it.</p><div class="al-numbers">
      ${[["Registered organisations", allOrgs.length, `${count(allOrgs, (o) => o.status === "approved")} approved · ${count(allOrgs, (o) => o.status === "pending")} under review${count(allOrgs, (o) => o.status === "suspended") ? ` · ${count(allOrgs, (o) => o.status === "suspended")} suspended` : ""}`, "#admin-list/organisations"],
        ["Registered professionals", allProfiles.length, `${count(allProfiles, (p) => p.review_status === "approved" && p.published)} approved and public`, "#admin-list/professionals"],
        ["Approved professionals", count(allProfiles, (p) => p.review_status === "approved" && p.published), "", "#admin-list/professionals?show=approved"],
        ["Open needs", count(needs, (n) => n.status === "open"), `${needs.length} needs in total`, "#admin-list/needs?show=open"],
        ["Contributions started", engagements.length, "", "#admin-list/contributions"],
        ["Contributions completed", count(engagements, (x) => x.status === "completed"), "", "#admin-list/contributions?show=completed"],
        ["Ended early", count(engagements, (x) => x.status === "ended"), "", "#admin-list/contributions?show=ended"],
        ["Six-month follow-ups answered “still in use”", `${count(engagements, (x) => x.followup_in_use === true)} of ${count(engagements, (x) => x.followup_in_use !== null && x.followup_in_use !== undefined)}`, "", "#admin-list/followups"], ["Reports", reportsAll.length, `${count(reportsAll, (r) => r.status !== "resolved")} open · ${count(reportsAll, (r) => r.child_case)} child cases`, "#admin-list/reports"],
        ["Activity log", "", "Every admin decision, with the time and the note", "#admin-list/activity"]]
        .map(([label, n, sub, href]) => `<a class="al-num" href="${href}"><span class="stack" style="--gap:2px"><span class="al-num-l">${label}</span>${sub ? `<span class="small muted">${sub}</span>` : ""}</span><strong>${n}</strong>${icon("arrow", 18)}</a>`).join("")}
      <div class="al-num"><span class="stack" style="--gap:2px"><span class="al-num-l">Browser errors, last 7 days</span><span class="small muted">${browserErrors === null ? "Not set up yet" : "Only the error text, page and app version are kept"}</span></span><strong>${browserErrors ?? "–"}</strong><span></span></div>
    </div></section>
  </div></div>`;
  return { title: "Admin", html };
}

// Professionals need at least two weeks to apply (27 Oct 2026): flag a close or passed apply-by date before approving.
function deadlineWarn(n) {
  if (!n.deadline) return `<span class="small muted">No fixed apply-by date</span>`;
  const left = Math.round((Date.parse(n.deadline) - Date.parse(new Date().toISOString().slice(0, 10))) / 864e5);
  if (left >= 14) return `<span class="small muted"><span>Apply by</span> ${date(n.deadline)} (${left} <span>days left</span>)</span>`;
  return `<span class="small" style="font-weight:600;color:var(--clay-ink)">${left < 0 ? `<span>The apply-by date has passed:</span> ${date(n.deadline)}.` : `<span>Only</span> ${left} <span>days left to apply (until</span> ${date(n.deadline)}).`} <span>Ask for changes so the organisation gives at least two weeks; you can’t open it with fewer than 7 days left.</span></span>`;
}
export function deadlineDeclineDialog(id) {
  openDialog("Decline the new date?", `<form class="form" data-form="admin-need-deadline-decline" data-id="${e(id)}"><p>The need keeps its current apply-by date and the organisation is told.</p>${field("note", "Note to the organisation (optional)", { type: "textarea", attrs: 'maxlength="600"' })}${formEnd("Decline", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitDeadlineDecline(form) {
  await withForm(form, async (fd) => {
    await result(db.rpc("admin_review_need_deadline", { p_need: form.dataset.id, p_approve: false, p_note: val(fd, "note") }));
    closeDialog();
    toast("Declined. The organisation has been told.");
    go(location.hash);
  });
}

export function adminDecision(kind, id, decision) {
  const labels = { approved: "Approve", changes_requested: "Ask for changes", rejected: "Reject", suspended: "Suspend" };
  if (kind === "need") return decisionDialog(decision === "approved" ? "Approve this need?" : "Ask for changes?", decision === "approved" ? "It goes live straight away and the organisation is notified. You can add a short note." : "The need goes back to draft. The organisation sees your note on the need and in their notifications.", "admin-need", id,
    `${field("note", "Note", { type: "textarea", required: decision !== "approved", attrs: 'maxlength="1000"' })}<input type="hidden" name="decision" value="${decision}">`, decision === "approved" ? "Approve" : "Ask for changes");
  // Name who the decision is about in the title, so it is never a bare "Approve?".
  const el = document.querySelector(`[data-id="${CSS.escape(String(id))}"]`);
  const who = el?.dataset.name || el?.closest(".list-row, .al-row")?.querySelector("strong, a")?.textContent?.trim();
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


// ---------- Reports and case records (audit 20 Oct 2026: A16, A17, A18, A12, A22, D21) ----------
export const REASONS = { safety: "Safety or safeguarding", exploitation: "Sexual exploitation or abuse", harassment: "Harassment or inappropriate behaviour", fraud: "Fraud, payment requests or false hours", misleading: "Misleading or false information", privacy: "Privacy or data", spam: "Spam", other: "Something else" };
const TARGETS = { profile: "About a person", need: "About a need", organisation: "About an organisation", conversation: "About a conversation", contribution: "About a contribution", other: "Other" };
const SEVERITY = { urgent: "Severity: urgent", high: "Severity: high", standard: "Severity: standard" };
// The reference the reporter was given: the first 8 characters of the report's id, in capitals (report_notify).
export const refOf = (id) => String(id || "").slice(0, 8).toUpperCase();
// Sexual exploitation or abuse, and safety or safeguarding (a child or adult at risk), are read the same day.
export const isUrgent = (r) => ["exploitation", "safety"].includes(r.reason) && r.status !== "resolved";
export const daysOpen = (r) => Math.max(0, Math.floor(((r.resolved_at ? Date.parse(r.resolved_at) : Date.now()) - Date.parse(r.created_at)) / 864e5));
export const sortReports = (list) => [...list].sort((a, b) => (Number(isUrgent(b)) - Number(isUrgent(a))) || (a.created_at < b.created_at ? 1 : -1));
export const targetLink = (r) => !r.target_id ? "" : r.target_type === "need" ? `#need/${r.target_id}` : r.target_type === "profile" ? `#profile/${r.target_id}` : r.target_type === "conversation" ? `#conversation/${r.target_id}` : r.target_type === "contribution" ? `#agreement/${r.target_id}` : r.target_type === "organisation" ? `#organisations/${r.target_id}` : "";
const redPill = (t) => `<span class="pill" style="background:#a3241a;color:#fff">${e(t)}</span>`;

// Every report with its reference, reporter (admins only) and case severity. Falls back to the table until the
// 20261020121000 migration is applied (then reporters and severity show as unknown).
export async function loadReports() {
  try { return await result(db.rpc("admin_reports")); } catch {
    const [rows, cases] = await Promise.all([
      result(db.from("reports").select("*").order("created_at", { ascending: false })),
      result(db.from("report_cases").select("report_id,severity,child_case,updated_at")).catch(() => []),
    ]);
    return rows.map((r) => { const c = cases.find((x) => x.report_id === r.id) || {}; return { reporter_name: "", reporter_email: "", source: "platform", ...r, reference: refOf(r.id), severity: c.severity || "", child_case: !!c.child_case, case_updated_at: c.updated_at || null }; });
  }
}

export function reportBadges(r) {
  const out = [];
  if (isUrgent(r)) out.push(redPill("Urgent: read today"));
  out.push(r.severity === "urgent" ? redPill(SEVERITY.urgent) : r.severity ? pill(SEVERITY[r.severity] || r.severity, r.severity === "high" ? "clay" : "grey") : pill("Severity not set", "grey"));
  if (r.child_case) out.push(pill("Child case", "clay"));
  out.push(r.status === "resolved" ? pill("Resolved", "grey") : r.status === "reviewing" ? pill("Reviewing", "ochre") : pill("Open", "clay"));
  if (r.status !== "resolved") { const d = daysOpen(r); out.push(pill(d === 0 ? "Open today" : d === 1 ? "Open 1 day" : `Open ${d} days`, d > 7 ? "clay" : d > 2 ? "ochre" : "grey")); }
  return `<span class="row" style="--gap:6px">${out.join("")}</span>`;
}

export function reporterLine(r) {
  const name = r.reporter_name || "", email = r.reporter_email || "";
  if (!name && !email) return r.reporter_id ? `<span class="small">Reported by a signed-in member</span>` : `<span class="small"><strong>Anonymous</strong></span>`;
  return `<span class="small"><span>Reported by</span> <strong data-no-i18n>${e(name || email)}</strong>${email && name ? ` · <a href="mailto:${e(email)}?subject=${encodeURIComponent(`Your report ${r.reference || refOf(r.id)}`)}" data-no-i18n>${e(email)}</a>` : ""}</span>`;
}

export function reportSummary(r) {
  const when = date(r.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  return `<div class="row" style="--gap:10px;align-items:baseline"><strong data-no-i18n style="letter-spacing:.06em;font-variant-numeric:tabular-nums">${e(r.reference || refOf(r.id))}</strong><strong>${e(REASONS[r.reason] || r.reason)}</strong></div>
    ${reportBadges(r)}
    <span class="small muted"><span>${e(TARGETS[r.target_type] || r.target_type)}</span> · <span>Reported ${when}</span>${r.source === "email" ? ` · <span>Recorded from an email</span>` : r.source === "questionnaire" ? ` · <span>From a questionnaire answer</span>` : r.source === "public" ? ` · <span>Public form, no account</span>` : ""}${r.resolved_at ? ` · <span>Resolved ${date(r.resolved_at)}</span>` : ""}</span>
    ${reporterLine(r)}
    <p class="small" style="white-space:pre-line" data-no-i18n>${e(r.details)}</p>`;
}

// Declared links: applications and invitations where someone declared a link with the organisation (O12).
async function declaredLinks() {
  const sel = "id,status,conflict_note,created_at,need:needs(title,organisation:organisations(name)),person:profiles(name)";
  const [apps, invs] = await Promise.all(["applications", "invitations"].map((t) => result(db.from(t).select(sel).neq("conflict_note", "").order("created_at", { ascending: false }).limit(50)).catch(() => [])));
  return [...apps.map((x) => ({ ...x, kind: "application" })), ...invs.map((x) => ({ ...x, kind: "invitation" }))]
    .filter((x) => String(x.conflict_note || "").trim())
    .sort((a, b) => ((a.status === "pending") !== (b.status === "pending") ? (a.status === "pending" ? -1 : 1) : a.created_at < b.created_at ? 1 : -1));
}
const declaredRow = (x) => `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><strong data-no-i18n>${e(x.need?.title || "Need")}</strong>
  <span class="small muted"><span data-no-i18n>${e(x.need?.organisation?.name || "")}</span> · <span data-no-i18n>${e(x.person?.name || "")}</span> · <span>${x.kind === "application" ? "Application: the professional declared it" : "Invitation: the organisation declared it"}</span> · ${date(x.created_at)}</span>
  <p class="small" style="white-space:pre-line" data-no-i18n>${e(x.conflict_note)}</p></div><div class="review-actions">${status(x.status)}</div></div>`;

// Case record for a report (Safeguarding Policy, section 16). Only admins can read it; the reporter can't.
// Each save keeps the previous version, read-only, below the form (A22).
export async function caseDialog(reportId) {
  const [all, c0, versions] = await Promise.all([
    loadReports().catch(() => []),
    result(db.from("report_cases").select("*").eq("report_id", reportId).maybeSingle()).catch(() => null),
    result(db.from("report_case_versions").select("*").eq("report_id", reportId).order("replaced_at", { ascending: false })).catch(() => []),
  ]);
  const c = c0 || {};
  const r = all.find((x) => x.id === reportId) || { id: reportId, reference: refOf(reportId), status: "open", created_at: new Date().toISOString() };
  const ta = (name, label, hint = "") => `<div class="field"><label for="f-c-${name}">${label}</label><textarea id="f-c-${name}" name="${name}" rows="2" maxlength="2000">${e(c[name] || "")}</textarea>${hint ? `<span class="hint">${hint}</span>` : ""}</div>`;
  const LABELS = [["protective_actions", "Protective actions"], ["informed", "Who was told, and when"], ["referral", "Referral to authorities, or why not"], ["wishes", "Wishes of the person affected"], ["decision", "Decision and reasons"], ["outcome", "Outcome and what each side was told"]];
  const stamp = (d) => date(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const versionHtml = (v) => `<div class="card" style="padding:12px 14px;margin-top:8px"><p class="small muted"><span>Saved ${stamp(v.saved_at)}</span> · <span>replaced ${stamp(v.replaced_at)}</span></p><p class="small">${v.severity ? e(SEVERITY[v.severity] || v.severity) : "Severity not set"}${v.child_case ? " · <span>Child case</span>" : ""}</p>${LABELS.filter(([k]) => v[k]).map(([k, l]) => `<p class="small"><strong>${l}</strong><br><span data-no-i18n style="white-space:pre-line">${e(v[k])}</span></p>`).join("")}</div>`;
  openDialog(`Case record <span data-no-i18n>${e(r.reference)}</span>`, `<div class="stack" style="--gap:6px;margin-bottom:16px">${reportSummary({ ...r, severity: c.severity ?? r.severity, child_case: c.child_case ?? r.child_case })}${r.admin_note ? `<p class="small muted" style="white-space:pre-line"><span>Handova note:</span> <span data-no-i18n>${e(r.admin_note)}</span></p>` : ""}${r.outcome_message ? `<p class="small muted"><span>What the reporter was told:</span> <span data-no-i18n>${e(r.outcome_message)}</span></p>` : ""}${targetLink(r) ? `<a class="small" href="${targetLink(r)}">Open what was reported</a>` : ""}</div>
    <form class="form" data-form="admin-case" data-id="${e(reportId)}"><p class="small muted">Only Handova admins see this. Keep it factual: what was done, when and by whom.${c.updated_at ? ` <span>Last saved ${stamp(c.updated_at)}.</span>` : ""}</p>
    ${select("severity", "Severity", [["", "Not set"], ["urgent", "Urgent: immediate danger, a child, sexual exploitation or abuse, a credible threat"], ["high", "High: harassment, contact with people served, data shared outside the rules"], ["standard", "Standard: other breaches with no apparent harm"]], c.severity || "")}
    ${check("child_case", "This case involves a child (kept until the child turns 25 or for 6 years after closure, whichever is later)", !!c.child_case)}
    ${ta("protective_actions", "Protective actions", "For example: profile suspended on 20 Oct, conversation paused.")}
    ${ta("informed", "Who was told, and when", "Focal point, the people involved, the independent contact, authorities.")}
    ${ta("referral", "Referral to authorities, or why not")}
    ${ta("wishes", "Wishes of the person affected")}
    ${ta("decision", "Decision and reasons")}
    ${ta("outcome", "Outcome and what each side was told")}
    ${formEnd("Save case record", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>
    ${versions.length ? `<details style="margin-top:18px"><summary style="cursor:pointer;font-weight:700">${versions.length === 1 ? "1 earlier version" : `${versions.length} earlier versions`}</summary><p class="small muted">Read-only. Every save is also in the Activity log.</p>${versions.map(versionHtml).join("")}</details>` : ""}`);
}
export async function submitCase(form) {
  await withForm(form, async (fd) => {
    const args = { p_report: form.dataset.id, p_severity: val(fd, "severity"), p_child_case: fd.has("child_case"), p_protective_actions: val(fd, "protective_actions"), p_informed: val(fd, "informed"), p_referral: val(fd, "referral"), p_wishes: val(fd, "wishes"), p_decision: val(fd, "decision"), p_outcome: val(fd, "outcome") };
    await result(db.rpc("admin_save_case", args));
    closeDialog();
    toast("Case record saved.");
    if (location.hash.startsWith("#admin")) go(location.hash);
  });
}

// Resolve, with an optional short outcome for the reporter (D21).
export async function resolveDialog(id) {
  const r = (await loadReports().catch(() => [])).find((x) => x.id === id) || { id, reference: refOf(id) };
  const tell = r.reporter_id
    ? `<div class="field"><label for="f-tell">Tell the reporter (optional)</label><textarea id="f-tell" name="tell" rows="3" maxlength="1000"></textarea><span class="hint">Sent to the reporter as a notification and an email, with their reference. Say what happened in general terms, never details about other people.</span></div>`
    : r.reporter_email
      ? `<p class="small"><span>${r.source === "public" ? "This report came through the public form, so Handova can’t notify the reporter. Write back to them:" : "This report came by email, so Handova can’t notify the reporter. Write back to them:"}</span> <a href="mailto:${e(r.reporter_email)}?subject=${encodeURIComponent(`Your report ${r.reference}`)}" data-no-i18n>${e(r.reporter_email)}</a></p><div class="field"><label for="f-tell">What you told them (optional, kept with the report)</label><textarea id="f-tell" name="tell" rows="2" maxlength="1000"></textarea></div>`
      : `<p class="small muted">The reporter is anonymous, so nobody can be told.</p>`;
  decisionDialog("Resolve this report?", "Write what was done, for the record: who you spoke to, what was decided, and whether anyone else was told. Only Handova sees this note.", "admin-report-resolve", id,
    `<p class="small"><strong data-no-i18n>${e(r.reference)}</strong> · ${e(REASONS[r.reason] || r.reason || "")}</p><label class="field" for="f-outcome">Outcome<textarea id="f-outcome" name="note" required minlength="10" maxlength="2000"></textarea></label>${tell}`, "Resolve report");
}
async function submitResolve(form) {
  await withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error("Please complete the form."); }
    const tell = val(fd, "tell");
    await result(db.rpc("admin_resolve_report", { p_id: form.dataset.id, p_note: val(fd, "note"), p_tell: tell }));
    closeDialog();
    toast(tell && !form.querySelector("a[href^='mailto:']") ? "Report resolved. The reporter has been told." : "Report resolved.");
    go(location.hash);
  });
}

// Record a report that reached Handova by email, or open a case from a questionnaire answer (A17, A12).
const LINK_TYPES = { profile: "profile", need: "need", organisations: "organisation", conversation: "conversation", agreement: "contribution" };
export async function recordReportDialog(o = {}) {
  if (o.ref) {
    const existing = (await loadReports().catch(() => [])).find((r) => r.source_ref === o.ref);
    if (existing) return openDialog("A case is already open for this answer", `<p><span>Reference</span> <strong data-no-i18n>${e(existing.reference)}</strong></p><div class="row"><button class="btn" type="button" data-action="admin-case" data-id="${e(existing.id)}">Open the case record</button><button class="btn secondary" type="button" data-action="close">Close</button></div>`);
  }
  const q = o.source === "questionnaire";
  const today = new Date().toISOString().slice(0, 10);
  const details = q ? `Concern raised in the ${o.who === "pro" ? "professional’s" : "organisation’s"} questionnaire for “${o.title || ""}”${o.when ? ` (contribution completed ${o.when})` : ""}: they answered “Yes” to “Did anything make you uncomfortable or concerned?”.\n\nWhat we know so far: ` : "";
  openDialog(q ? "Open a case from this answer" : "Record an emailed report", `<form class="form" data-form="admin-record-report" data-source="${q ? "questionnaire" : "email"}" data-ref="${e(o.ref || "")}" data-engagement="${e(o.engagement || "")}">
    <p class="small muted">${q ? "This creates a report with a reference and a case record, linked to the contribution. Nobody is notified." : "Use this for concerns sent to safeguarding@handova.org or hello@handova.org. It gets a reference and a case record like a report from the site. Nobody is notified."}</p>
    ${select("reason", "Reason", [["", "Choose a reason"], ...Object.entries(REASONS)], "", { required: true })}
    ${q ? "" : `${select("target_type", "What it is about", Object.entries(TARGETS), "other")}
    ${field("target_link", "Link to it on Handova (optional)", { hint: "Paste the address of the profile, need, organisation or agreement page.", attrs: 'maxlength="300" autocomplete="off"' })}
    <div class="form-grid">${field("reporter_name", "Reporter’s name (optional)", { attrs: 'maxlength="160" autocomplete="off"' })}${field("reporter_email", "Reporter’s email (optional)", { type: "email", attrs: 'maxlength="254" autocomplete="off"' })}</div>
    ${field("received", "Date received", { type: "date", value: today, required: true, attrs: `max="${today}"` })}`}
    <div class="field"><label for="f-rr-details">What was reported <span class="req" aria-hidden="true">*</span></label><textarea id="f-rr-details" name="details" rows="5" required minlength="10" maxlength="4000">${e(details)}</textarea><span class="hint">${q ? "Add what you know. You can complete the case record next." : "The key facts from the email. Keep the email itself in the safeguarding mailbox."}</span></div>
    ${formEnd(q ? "Open a case" : "Record report", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
async function submitRecord(form) {
  await withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error("Please complete the form."); }
    const q = form.dataset.source === "questionnaire";
    let type = q ? "contribution" : val(fd, "target_type") || "other", target = q ? form.dataset.engagement || null : null;
    const m = (val(fd, "target_link") || "").match(/#(profile|need|organisations|conversation|agreement)\/([0-9a-f-]{36})/i);
    if (m) { type = LINK_TYPES[m[1].toLowerCase()]; target = m[2].toLowerCase(); }
    else if (val(fd, "target_link")) throw Object.assign(Error("That link isn’t a Handova profile, need, organisation, conversation or agreement page. Leave it empty if you don’t have one."), { field: form.querySelector("[name=target_link]") });
    const ref = await result(db.rpc("admin_record_report", { p_source: q ? "questionnaire" : "email", p_reason: val(fd, "reason"), p_target_type: target ? type : (q ? "other" : type), p_target_id: target, p_details: val(fd, "details"), p_reporter_name: val(fd, "reporter_name"), p_reporter_email: val(fd, "reporter_email"), p_received: q ? null : val(fd, "received") || null, p_source_ref: form.dataset.ref || null }));
    closeDialog();
    toast(`Recorded. Reference ${ref}.`);
    go(`#admin-list/reports?q=${encodeURIComponent(ref)}`);
  });
}

// ---------- Other admin safety dialogs ----------
const NOTE = (label = "Note (optional)", max = 600) => `<label class="field" for="f-reason">${label}<textarea id="f-reason" name="reason" maxlength="${max}"></textarea></label>`;
const rpcForm = (fn, args, msg) => (f) => withForm(f, async (fd) => {
  if (!f.checkValidity()) { f.reportValidity(); throw Error("Please complete the form."); }
  await result(db.rpc(fn, args(f.dataset.id, fd)));
  closeDialog(); await loadSession(); toast(msg); go(location.hash);
});

// Lifting a suspension; after a removal, ask whether to restore the impact CV entries it hid (A24).
export function liftDialog(id, hidden) {
  const n = Number(hidden) || 0;
  const ask = n ? `<fieldset class="field"><legend>Restore their hidden impact CV entries (${n})?</legend><label class="check"><input type="radio" name="restore_cv" value="yes" required><span>Yes, make them available again. They choose which to show.</span></label><label class="check"><input type="radio" name="restore_cv" value="no" required><span>No, keep them hidden for now</span></label></fieldset>` : "";
  decisionDialog("Lift the suspension?", "They can use Handova again. Their profile stays offline until they send it for review and you approve it.", "admin-lift", id, `${NOTE("Note (optional)", 1000)}${ask}`, "Lift suspension");
}
async function submitLift(form) {
  await withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error("Please complete the form."); }
    await result(db.rpc("admin_lift_suspension", { p_user: form.dataset.id, p_note: val(fd, "reason") }));
    const restore = fd.get("restore_cv") === "yes";
    if (restore) await result(db.rpc("admin_restore_user_cv", { p_user: form.dataset.id, p_note: val(fd, "reason") }));
    closeDialog(); await loadSession();
    toast(restore ? "Suspension lifted. Their impact CV entries are available again." : "Suspension lifted.");
    go(location.hash);
  });
}

// Delete someone's account through the normal deletion flow (A24: the retention alert's "Delete" action).
export async function deleteAccountDialog(id, name) {
  const blocker = await result(db.rpc("admin_account_deletion_blocker", { p_user: id })).catch((err) => errorMessage(err));
  if (blocker) return openDialog("This account can’t be deleted yet", `<p><strong data-no-i18n>${e(name)}</strong></p><p>Handova checks the same things as when people delete their own account. This is what they would be told:</p><p class="banner alert" data-no-i18n>${e(blocker)}</p><div class="row"><button class="btn" type="button" data-action="close">OK</button></div>`);
  openDialog("Delete this account?", `<form class="form" data-form="admin-delete-account" data-id="${e(id)}">
    <p><strong data-no-i18n>${e(name)}</strong></p>
    <p><span>This runs the normal account deletion: their identity checks at Didit, photos, profile, applications and messages are removed.</span> <span>Signed agreement records are kept for six years, and conversations linked to a contribution or a report are kept as “Former member”.</span> <span>This can’t be undone.</span></p>
    ${field("reason", "Reason, for the Activity log (optional)", { type: "textarea", attrs: 'maxlength="600"' })}
    ${field("confirm", "Type DELETE to confirm", { required: true, attrs: 'autocomplete="off"' })}
    ${formEnd("Delete account", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`).replace('class="btn"', 'class="btn danger"')}</form>`);
}
async function submitDeleteAccount(form) {
  await withForm(form, async (fd) => {
    if (val(fd, "confirm") !== "DELETE") throw Object.assign(Error("Type DELETE in capital letters to confirm."), { field: form.querySelector("[name=confirm]") });
    const { data, error } = await db.functions.invoke("account-delete", { body: { user_id: form.dataset.id, reason: val(fd, "reason") } });
    if (error) { let msg = ""; try { msg = (await error.context?.json?.())?.error || ""; } catch {} throw Error(msg || errorMessage(error)); }
    if (!data?.ok) throw Error(data?.error || "Could not delete the account. Please try again.");
    closeDialog();
    toast("Account deleted.");
    go(location.hash);
  });
}

// Wired into the click and submit handlers in app.js.
export const ACTIONS = {
  "admin-case": (el) => caseDialog(el.dataset.id),
  "admin-report-resolve": (el) => resolveDialog(el.dataset.id),
  "admin-report-reopen": (el) => decisionDialog("Reopen this report?", "Use this for an appeal or new information. It goes back to Reviewing and the earlier note is kept.", "admin-report-reopen", el.dataset.id, `<label class="field" for="f-reason">Why is it reopened?<textarea id="f-reason" name="reason" required minlength="5" maxlength="600"></textarea></label>`, "Reopen report"),
  "admin-record-report": () => recordReportDialog(),
  "admin-case-from-answer": (el) => recordReportDialog({ source: "questionnaire", ref: el.dataset.ref, engagement: el.dataset.engagement, who: el.dataset.who, title: el.dataset.title, when: el.dataset.when }),
  "admin-id-video-decline": (el) => decisionDialog("Couldn’t verify this identity?", "Use this if the call didn’t happen or the ID didn’t match. The person sees your reason in a notification and an email, and can try the online check or ask for another call.", "admin-id-video-decline", el.dataset.id, `<p><strong data-no-i18n>${e(el.dataset.name || "")}</strong></p><label class="field" for="f-reason">Reason (the person sees this)<textarea id="f-reason" name="reason" required minlength="10" maxlength="600"></textarea></label>`, "Couldn’t verify", true),
  "admin-signal-ok": (el) => decisionDialog("Checked, nothing wrong?", "The signal is hidden until something new happens, such as a later event or changed details. Your check is kept in the Activity log.", "admin-signal-ok", el.dataset.id, `<p><strong>${e(el.dataset.title || "")}</strong></p>${NOTE()}`, "Mark as checked"),
  "admin-lift": (el) => liftDialog(el.dataset.id, el.dataset.hidden),
  "admin-delete-account": (el) => deleteAccountDialog(el.dataset.id, el.dataset.name),
};
export const FORMS = {
  "admin-case": submitCase,
  "admin-report-resolve": submitResolve,
  "admin-report-reopen": rpcForm("admin_reopen_report", (id, fd) => ({ p_id: id, p_reason: val(fd, "reason") }), "Report reopened."),
  "admin-record-report": submitRecord,
  "admin-id-video-decline": rpcForm("admin_decline_id_video", (id, fd) => ({ p_user: id, p_reason: val(fd, "reason") }), "Saved. The person has been told."),
  "admin-signal-ok": rpcForm("admin_check_signal", (id, fd) => ({ p_key: id, p_note: val(fd, "reason") }), "Marked as checked."),
  "admin-lift": submitLift,
  "admin-delete-account": submitDeleteAccount,
};

export const runAction = (k, el) => ACTIONS[k](el);
export const runForm = (k, f) => FORMS[k](f);
