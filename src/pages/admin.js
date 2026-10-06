import { db, state, result, e, toast, go, withForm, val, loadSession, PROFILE_COLS } from "../core.js";
import { icon, eyebrow, status, pill, field, select, formEnd, btn, empty, avatarFor } from "../ui.js";
import { date } from "../utils.js";
import { decisionDialog } from "./workspace.js";

export async function notifications() {
  if (!state.user) return { redirect: "#signin?next=%23notifications" };
  const rows = await result(db.from("notifications").select("*").eq("user_id", state.user.id).order("created_at", { ascending: false }).limit(100));
  const html = `<div class="wrap" style="max-width:860px;padding-block:48px 80px"><div class="stack" style="--gap:20px">
    <div class="row between">${`<div>${eyebrow("Notifications")}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">What’s new</h1></div>`}${rows.some((r) => !r.read_at) ? `<button class="btn secondary sm" type="button" data-action="read-all">Mark all as read</button>` : ""}</div>
    <div class="card" style="padding-block:6px">${rows.length ? rows.map((r) => `<a class="notif ${r.read_at ? "" : "unread"}" href="${e(r.link || "#home")}" data-action="read-one" data-id="${r.id}">${icon("bell", 22, "#0f6f63")}<div class="stack" style="--gap:2px"><strong>${e(r.title)}</strong>${r.body ? `<span class="muted">${e(r.body)}</span>` : ""}<span class="small muted">${date(r.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></div></a>`).join("") : empty("Nothing yet", "Applications, decisions, agreements and messages will appear here.")}</div>
    <p class="small muted">Email notifications will be switched on once the email service is set up.</p>
  </div></div>`;
  return { title: "Notifications", html };
}

export async function admin() {
  if (!state.user) return { redirect: "#signin?next=%23admin" };
  if (!state.isAdmin) return { title: "Admin", html: `<div class="wrap page-head">${eyebrow("Admin")}<h1>Administrators only</h1><p class="lead">Your account doesn’t have admin access.</p></div>` };
  const [orgs, profiles, reports, engagements, needs, allProfiles, sigs, idQueue, idDocs] = await Promise.all([
    result(db.from("organisations").select("*").in("status", ["pending", "changes_requested"]).order("created_at")),
    result(db.from("profiles").select(PROFILE_COLS).eq("review_status", "pending").order("updated_at")),
    result(db.from("reports").select("*").neq("status", "resolved").order("created_at", { ascending: false })),
    result(db.from("engagements").select("id,status,scope,created_at,completed_at,followup_due,followup_in_use,organisation_id,user_id").order("created_at", { ascending: false }).limit(200)),
    result(db.from("needs").select("id,status,created_at,organisation_id")),
    result(db.from("profiles").select("user_id,review_status,published")),
    result(db.from("agreement_signatures").select("user_id,kind,organisation_id,signer_role,version,full_name,signed_at,hours_committed,ip").order("signed_at", { ascending: false }).limit(1000)).catch(() => []),
    // Identity checks waiting for a person, whatever the profile's review status.
    result(db.from("profiles").select(PROFILE_COLS).in("id_status", ["name_mismatch", "in_review"]).order("updated_at")).catch(() => []),
    result(db.from("id_verifications").select("user_id,document_name,status,updated_at").order("updated_at", { ascending: false }).limit(500)).catch(() => []),
  ]);
  const docName = (uid) => idDocs.find((x) => x.user_id === uid && x.document_name)?.document_name || "";
  const sigFor = (uid) => sigs.find((x) => x.user_id === uid && x.kind === "professional");
  const orgSig = (oid) => sigs.find((x) => x.organisation_id === oid);
  const when = (d) => date(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const count = (arr, f) => arr.filter(f).length;
  const orgCard = (o) => `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${e(o.name)}</strong><span class="small muted">${e([o.city, o.country].filter(Boolean).join(", "))} · ${e(o.org_type)} · submitted ${date(o.created_at)}</span><p class="small">${e(o.summary)}</p>${o.website ? `<a class="small" href="${e(o.website)}" target="_blank" rel="noopener noreferrer">${e(o.website)}</a>` : `<span class="small muted">No website given</span>`}${o.ethical_bridge_url ? `<a class="small" href="${e(o.ethical_bridge_url)}" target="_blank" rel="noopener noreferrer">Ethical Bridge directory page</a>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No Ethical Bridge directory page given</span>`}${(() => { const g = orgSig(o.id); return g ? `<span class="small muted">Agreement ${e(g.version)} signed by ${e(g.full_name)} (${e(g.signer_role)}) on ${when(g.signed_at)}${g.ip ? ` from ${e(g.ip)}` : ""}</span>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No signed organisation agreement</span>`; })()}<span class="small muted">Check: locally led, registered or fiscally hosted, safeguarding focal point named, real presence online or by reference.</span></div><div class="review-actions">${status(o.status)}<button class="btn sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="approved">Approve</button><button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="changes_requested">Ask for details</button><button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="rejected">Reject</button></div></div>`;
  const profCard = (p) => `<div class="list-row review-row"><div class="review-main">${avatarFor(p, 56)}<div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${p.user_id}" style="font-weight:700">${e(p.name)}</a><span class="small muted">${e(p.headline)} · ${e(p.country || "No country")} · 18+ ${p.age_confirmed ? "confirmed" : "not confirmed"}</span>${(p.experience_items || []).length ? `<span class="small">${(p.experience_items || []).slice(0, 3).map((x) => e([x.title, x.organisation, x.country].filter(Boolean).join(" · "))).join("<br>")}</span>` : ""}<p class="small">${e((p.bio || "").slice(0, 280))}${(p.bio || "").length > 280 ? "…" : ""}</p>${p.linkedin ? `<a class="small" style="font-weight:700" href="${e(p.linkedin)}" target="_blank" rel="noopener noreferrer">Check LinkedIn: does the name, experience and photo match?</a>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No LinkedIn given: ask for changes</span>`}${(() => { const st = p.id_status || ""; const label = { "": "Identity not checked yet", started: "Identity check started, not finished", in_review: "Identity check in review at Didit", approved: "ID verified", declined: "Identity check declined", name_mismatch: "Identity check passed, but the name differs" }[st] || st;
          return `<span class="small" style="font-weight:600;color:${st === "approved" ? "var(--teal)" : st === "name_mismatch" || st === "declined" ? "var(--clay-ink)" : "var(--muted)"}">${e(label)}${docName(p.user_id) ? ` · name on document: “${e(docName(p.user_id))}”` : ""}</span>${st === "name_mismatch" || st === "in_review" ? `<span class="row" style="--gap:8px"><button class="btn sm" type="button" data-action="admin-id" data-id="${p.user_id}" data-ok="1">Confirm identity</button><button class="btn secondary sm" type="button" data-action="admin-id" data-id="${p.user_id}" data-ok="0">Decline</button></span>` : ""}`; })()}${(() => { const g = sigFor(p.user_id); return g ? `<span class="small muted">Agreement ${e(g.version)} signed as “${e(g.full_name)}” on ${date(g.signed_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}${g.ip ? ` from ${e(g.ip)}` : ""} · commits ${Number(p.hours_available) || 0} hours a month</span>` : `<span class="small" style="color:var(--clay-ink);font-weight:600">No signed agreement</span>`; })()}</div></div><div class="review-actions"><button class="btn sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="approved">Approve</button><button class="btn secondary sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="changes_requested">Ask for changes</button><button class="btn secondary sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="rejected">Reject</button></div></div>`;
  const targetLink = (r) => r.target_type === "need" ? `#need/${r.target_id}` : r.target_type === "profile" ? `#profile/${r.target_id}` : r.target_type === "conversation" ? `#conversation/${r.target_id}` : "";
  const reportCard = (r) => `<div class="list-row review-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${e(r.reason)} · ${e(r.target_type)}</strong><span class="small muted">Reported ${date(r.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span><p class="small">${e(r.details)}</p>${targetLink(r) ? `<a class="small" href="${targetLink(r)}">Open what was reported</a>` : ""}</div><div class="review-actions">${pill(r.status, r.status === "open" ? "clay" : "ochre")}<button class="btn sm" type="button" data-action="admin-report" data-id="${r.id}" data-status="reviewing">Reviewing</button><button class="btn secondary sm" type="button" data-action="admin-report" data-id="${r.id}" data-status="resolved">Resolve</button></div></div>`;
  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="stack" style="--gap:26px">
    <div>${eyebrow("Admin")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">What needs your attention</h1></div>
    <div class="grid-4"><div class="stat"><strong>${orgs.filter((o) => o.status === "pending").length}</strong><span>organisations to review</span></div><div class="stat"><strong>${profiles.length}</strong><span>profiles to review</span></div><div class="stat"><strong>${reports.length}</strong><span>open reports</span></div><div class="stat"><strong>${count(engagements, (x) => x.status === "active")}</strong><span>engagements in progress</span></div></div>
    ${reports.length ? `<section class="card" style="border-color:#e6b9a6"><h2 style="font-size:1.7rem;margin-bottom:8px">Reports</h2>${reports.map(reportCard).join("")}</section>` : ""}
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Organisations awaiting review</h2>${orgs.length ? orgs.map(orgCard).join("") : empty("All caught up", "New organisations appear here.")}</section>
    ${idQueue.filter((q) => !profiles.some((x) => x.user_id === q.user_id)).length ? `<section class="card" style="border-color:var(--ochre-line)"><h2 style="font-size:1.7rem;margin-bottom:8px">Identity checks to review</h2><p class="small muted">The check passed at Didit but needs a person: the name differs from the profile, or Didit is reviewing it.</p>${idQueue.filter((q) => !profiles.some((x) => x.user_id === q.user_id)).map(profCard).join("")}</section>` : ""}
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:8px">Profiles awaiting first publication</h2>${profiles.length ? profiles.map(profCard).join("") : empty("All caught up", "Profiles appear here when someone publishes for the first time.")}</section>
    <section class="card"><h2 style="font-size:1.7rem;margin-bottom:12px">Pilot numbers</h2><div class="table-scroll"><table class="data"><tbody>
      <tr><td>Approved professionals</td><td><strong>${count(allProfiles, (p) => p.review_status === "approved" && p.published)}</strong></td></tr>
      <tr><td>Open needs</td><td><strong>${count(needs, (n) => n.status === "open")}</strong></td></tr>
      <tr><td>Engagements started</td><td><strong>${engagements.length}</strong></td></tr>
      <tr><td>Engagements completed</td><td><strong>${count(engagements, (x) => x.status === "completed")}</strong></td></tr>
      <tr><td>Ended early</td><td><strong>${count(engagements, (x) => x.status === "ended")}</strong></td></tr>
      <tr><td>Six-month follow-ups answered “still in use”</td><td><strong>${count(engagements, (x) => x.followup_in_use === true)}</strong> of ${count(engagements, (x) => x.followup_in_use !== null && x.followup_in_use !== undefined)}</td></tr>
    </tbody></table></div></section>
  </div></div>`;
  return { title: "Admin", html };
}

export function adminDecision(kind, id, decision) {
  const labels = { approved: "Approve", changes_requested: "Ask for changes", rejected: "Reject" };
  decisionDialog(`${labels[decision]}?`, decision === "approved" ? "They will be notified. You can add a short welcome note." : "Explain what they need to change or why. They will see this note in their notifications.", kind === "org" ? "admin-org" : "admin-profile", id,
    `${field("note", "Note", { type: "textarea", required: decision !== "approved", attrs: 'maxlength="1000"' })}<input type="hidden" name="decision" value="${decision}">`, labels[decision], decision === "rejected");
}

export async function submitAdmin(kind, form) {
  await withForm(form, async (fd) => {
    if (kind === "admin-org") await result(db.rpc("admin_review_organisation", { p_org: form.dataset.id, p_decision: val(fd, "decision"), p_note: val(fd, "note") }));
    else await result(db.rpc("admin_review_profile", { p_user: form.dataset.id, p_decision: val(fd, "decision"), p_note: val(fd, "note") }));
    document.getElementById("dialog").close();
    toast("Decision saved and sent.");
    go("#admin");
  });
}
