// Handova only: the records behind each number on the Admin page, with actions where they make sense.
import { db, state, result, e, openDialog, closeDialog, toast, go, withForm, val, PROFILE_COLS, errorMessage } from "../core.js";
import { icon, eyebrow, back, empty, pill, status, field, formEnd, btn, NEED_STATE } from "../ui.js";
import { date } from "../utils.js";
import { loadReports, sortReports, reportSummary, targetLink, refOf, REASONS } from "./admin.js";

const STAFF = { none: "Volunteers only", "1-5": "1–5 paid staff", "6-20": "6–20 paid staff", "21-50": "21–50 paid staff", "50+": "More than 50 paid staff" };
export const LISTS = {
  people: "Everyone who signed up",
  organisations: "Registered organisations",
  professionals: "Registered professionals",
  needs: "Needs",
  contributions: "Contributions",
  followups: "Six-month follow-ups",
  reports: "Reports",
  activity: "Activity log",
};

export async function adminList(kind, params) {
  if (!state.user) return { redirect: "#signin?next=%23admin" };
  if (!state.isAdmin) return { title: "Admin", html: `<div class="wrap page-head">${eyebrow("Admin")}<h1>Administrators only</h1></div>` };
  if (kind === "signups") return { redirect: "#admin-list/people?show=unfinished" };
  if (!LISTS[kind]) return { redirect: "#admin" };
  const show = params.get("show") || "";
  const qtext = (params.get("q") || "").trim().toLowerCase();
  let rows = [], filters = [], body = "";
  const chips = (list) => `<nav class="al-chips" aria-label="Filter">${list.map(([k, label, n]) => `<a href="#admin-list/${kind}${k ? `?show=${k}` : ""}" ${show === k ? 'aria-current="page"' : ""}>${label} <span>${n}</span></a>`).join("")}</nav>`;
  const match = (...parts) => !qtext || parts.filter(Boolean).join(" ").toLowerCase().includes(qtext);

  if (kind === "organisations") {
    const [orgs, members, needs, engs] = await Promise.all([
      result(db.from("organisations").select("*").order("created_at", { ascending: false })),
      result(db.from("organisation_members").select("organisation_id,full_name,role")).catch(() => []),
      result(db.from("needs").select("id,organisation_id,status")).catch(() => []),
      result(db.from("engagements").select("id,organisation_id,status")).catch(() => []),
    ]);
    const by = (s) => orgs.filter((o) => o.status === s).length;
    filters = [["", "All", orgs.length], ["approved", "Approved", by("approved")], ["pending", "Under review", by("pending")], ["changes_requested", "Changes requested", by("changes_requested")], ["suspended", "Suspended", by("suspended")], ["rejected", "Not approved", by("rejected")]];
    rows = orgs.filter((o) => (!show || o.status === show) && match(o.name, o.country, o.city, o.org_type));
    body = rows.map((o) => {
      const m = members.filter((x) => x.organisation_id === o.id), nd = needs.filter((x) => x.organisation_id === o.id), en = engs.filter((x) => x.organisation_id === o.id);
      const acts = [
        o.status !== "approved" ? `<button class="btn sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="approved">${o.status === "suspended" ? "Reactivate" : "Approve"}</button>` : "",
        o.status === "pending" ? `<button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="changes_requested">Ask for details</button>` : "",
        o.status === "approved" ? `<button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-decision="suspended">Suspend</button>` : "",
        btn("All details and edit", `#admin-org/${o.id}`, "secondary sm"),
        `<button class="btn secondary sm danger-outline" type="button" data-action="admin-org-delete" data-id="${o.id}" data-name="${e(o.name)}" ${en.length ? `data-blocked="1"` : ""}>Delete</button>`,
      ].join("");
      return `<div class="al-row"><div class="row" style="--gap:12px;align-items:flex-start;flex-wrap:nowrap;min-width:0">${o.logo_url ? `<img class="al-logo" src="${e(o.logo_url)}" alt="" width="44" height="44">` : `<span class="al-logo al-logo-empty">${icon("home", 20)}</span>`}
        <div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px"><a href="#admin-org/${o.id}" style="font-weight:700" data-no-i18n>${e(o.name)}</a>${status(o.status)}</div>
        <span class="small muted">${[e([o.city, o.country].filter(Boolean).join(", ")), e(o.org_type || ""), o.staff_size ? STAFF[o.staff_size] : "", `registered ${date(o.created_at)}`].filter(Boolean).join(" · ")}</span>
        <span class="small muted">${m.length ? `<span data-no-i18n>${e(m.map((x) => x.full_name || "Member").join(", "))}</span>` : "No members"} · ${nd.length} ${nd.length === 1 ? "need" : "needs"} (${nd.filter((x) => x.status === "open").length} open) · ${en.length} ${en.length === 1 ? "contribution" : "contributions"}</span>
        ${o.website || o.ethical_bridge_url ? `<span class="small">${o.website ? `<a href="${e(o.website)}" target="_blank" rel="noopener noreferrer">Website <span class="visually-hidden">(opens in a new tab)</span></a>` : ""}${o.website && o.ethical_bridge_url ? " · " : ""}${o.ethical_bridge_url ? `<a href="${e(o.ethical_bridge_url)}" target="_blank" rel="noopener noreferrer">Ethical Bridge page <span class="visually-hidden">(opens in a new tab)</span></a>` : ""}</span>` : ""}</div></div>
        <div class="al-actions">${acts}</div></div>`;
    }).join("");
  }

  if (kind === "professionals") {
    const profs = await result(db.from("profiles").select(PROFILE_COLS).order("created_at", { ascending: false }));
    const pub = (p) => p.published && p.review_status === "approved";
    filters = [["", "All", profs.length], ["approved", "Approved and public", profs.filter(pub).length], ["pending", "Under review", profs.filter((p) => p.review_status === "pending").length], ["draft", "Private drafts", profs.filter((p) => !p.published).length], ["verified", "ID verified", profs.filter((p) => p.id_status === "approved").length], ["closed", "Closed profiles", profs.filter((p) => p.closed_at).length]];
    rows = profs.filter((p) => (!show || (show === "approved" ? pub(p) : show === "draft" ? !p.published : show === "verified" ? p.id_status === "approved" : show === "closed" ? !!p.closed_at : p.review_status === show)) && match(p.name, p.headline, p.country, (p.skills || []).join(" ")));
    body = rows.map((p) => `<div class="al-row"><div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px"><a href="#profile/${p.user_id}" style="font-weight:700" data-no-i18n>${e(p.name)}</a>${pub(p) ? pill("Public") : status(p.published ? p.review_status : "draft")}${p.id_status === "approved" ? pill("ID verified") : ""}</div>
      <span class="small muted" data-no-i18n>${e(p.headline || "")}</span><span class="small muted">${[e(p.country || ""), `${p.hours_available || 0} h a month`, `joined ${date(p.created_at)}`, p.closed_at ? `closed ${date(p.closed_at)}` : ""].filter(Boolean).join(" · ")}</span></div>
      <div class="al-actions">${p.review_status === "pending" ? `<button class="btn sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="approved">Approve</button><button class="btn secondary sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="changes_requested">Ask for changes</button>` : ""}${btn("View profile", `#profile/${p.user_id}`, "secondary sm")}<button class="btn secondary sm" type="button" data-action="admin-suspend" data-id="${p.user_id}">Suspend…</button>${p.user_id === state.user.id ? "" : `<button class="btn secondary sm danger-outline" type="button" data-action="admin-delete-account" data-id="${p.user_id}" data-name="${e(p.name)}">Delete account…</button>`}</div></div>`).join("");
  }

  if (kind === "people") {
    // Every account and where it is (27 Oct 2026): from sign-up to contributing, so nobody is lost half-way.
    const all = await result(db.rpc("admin_people")).catch(() => []);
    const G = PEOPLE_GROUPS;
    filters = [["", "All", all.length], ...Object.entries(G).map(([k, [label, stages]]) => [k, label, all.filter((x) => stages(x)).length])];
    rows = all.filter((x) => (!show || G[show]?.[1](x)) && match(x.name, x.email, x.organisation_name));
    body = `<p class="small muted">Unfinished sign-ups get reminders automatically by notification and email, one day after sign-up and again a week later. You can also send one now.</p>` + rows.map(personRow).join("");
  }

  if (kind === "needs") {
    const [needs, prog] = await Promise.all([
      result(db.from("needs").select("id,title,status,hours,deadline,requested_deadline,created_at,approved_at,organisation_id,organisation:organisations(name)").order("created_at", { ascending: false })),
      result(db.rpc("public_need_progress")).catch(() => []),
    ]);
    // Where each need is (27 Oct 2026): review, open, applications, chosen, in progress, handed over, apply-by date passed.
    for (const n of needs) { const p = prog.find((x) => x.need_id === n.id); n.stage = n.status === "draft" || n.status === "pending" ? n.status : p?.state || (n.status === "open" ? "open" : "closed"); n.applicants = p?.applicants || 0; }
    const by = (s) => needs.filter((n) => n.stage === s).length;
    filters = [["", "All", needs.length], ["pending", "Waiting for review", by("pending")], ["draft", "Drafts", by("draft")], ["open", "Open, no applications yet", by("open")], ["applications", "Receiving applications", by("applications")], ["deadline_passed", "Apply-by date passed", by("deadline_passed")], ["chosen", "Professional chosen", by("chosen")], ["in_progress", "In progress", by("in_progress")], ["handed_over", "Handed over", by("handed_over")], ["closed", "Closed", by("closed")]];
    rows = needs.filter((n) => (!show || n.stage === show) && match(n.title, n.organisation?.name));
    body = rows.map((n) => `<div class="al-row"><div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px"><a href="#need/${n.id}" style="font-weight:700" data-no-i18n>${e(n.title)}</a>${["draft", "pending"].includes(n.stage) ? status(n.status) : pill(...(NEED_STATE[n.stage] || ["Closed", "grey"]))}${n.requested_deadline ? pill("New date waiting for you", "clay") : ""}</div><span class="small muted"><span data-no-i18n>${e(n.organisation?.name || "")}</span> · ${n.hours} hours · created ${date(n.created_at)}${n.approved_at ? ` · approved ${date(n.approved_at)}` : ""}${n.deadline ? ` · apply by ${date(n.deadline)}` : ""}${n.applicants ? ` · ${n.applicants} ${n.applicants === 1 ? "application" : "applications"}` : ""}</span></div><div class="al-actions">${btn("View need", `#need/${n.id}`, "secondary sm")}${n.status === "open" || n.status === "pending" ? `<button class="btn secondary sm" type="button" data-action="admin-takedown" data-id="${n.id}">Take down…</button>` : ""}</div></div>`).join("");
  }

  if (kind === "reports") {
    // Every report, open or closed, with its reference (A17). Each row opens its case record.
    const all = sortReports(await loadReports());
    const open = all.filter((r) => r.status !== "resolved");
    filters = [["", "All", all.length], ["open", "Open", open.length], ["resolved", "Resolved", all.length - open.length], ["child", "Child cases", all.filter((r) => r.child_case).length]];
    const ref = qtext.replace(/^#/, "").toUpperCase();
    rows = all.filter((r) => (!show || (show === "open" ? r.status !== "resolved" : show === "resolved" ? r.status === "resolved" : !!r.child_case))
      && (!qtext || (r.reference || refOf(r.id)).startsWith(ref) || match(r.details, r.reporter_name, r.reporter_email, r.admin_note)));
    body = rows.map((r) => `<div class="al-row"><div class="stack" style="--gap:6px;min-width:0">${reportSummary(r)}${r.admin_note ? `<p class="small muted" style="white-space:pre-line"><span>Handova note:</span> <span data-no-i18n>${e(r.admin_note)}</span></p>` : ""}</div>
      <div class="al-actions"><button class="btn sm" type="button" data-action="admin-case" data-id="${r.id}">Case record…</button>${targetLink(r) ? btn("Open what was reported", targetLink(r), "secondary sm") : ""}${r.status === "resolved" ? `<button class="btn secondary sm" type="button" data-action="admin-report-reopen" data-id="${r.id}">Reopen…</button>` : `<button class="btn secondary sm" type="button" data-action="admin-report-resolve" data-id="${r.id}">Resolve…</button>`}</div></div>`).join("");
  }

  if (kind === "activity") {
    // Every admin decision, newest first: who decided, what changed, and the note (B9, 20 Oct 2026).
    const acts = await result(db.from("admin_actions").select("id,admin_id,action,target_type,target_id,detail,created_at").order("created_at", { ascending: false }).limit(300)).catch(() => []);
    const kinds = [...new Set(acts.map((a) => a.target_type))];
    filters = [["", "All", acts.length], ...kinds.map((k) => [k, k.charAt(0).toUpperCase() + k.slice(1), acts.filter((a) => a.target_type === k).length])];
    // Who or what each row is about (A24): names looked up now, falling back to the name saved with the decision.
    const ids = (t) => [...new Set(acts.filter((a) => t.includes(a.target_type) && a.target_id).map((a) => a.target_id))];
    const [pp, nn, oo, ee] = await Promise.all([
      ids(["profile"]).length ? result(db.from("profiles").select("user_id,name").in("user_id", ids(["profile"]))).catch(() => []) : [],
      ids(["need"]).length ? result(db.from("needs").select("id,title").in("id", ids(["need"]))).catch(() => []) : [],
      ids(["organisation"]).length ? result(db.from("organisations").select("id,name").in("id", ids(["organisation"]))).catch(() => []) : [],
      ids(["engagement", "contribution"]).length ? result(db.from("engagements").select("id,scope").in("id", ids(["engagement", "contribution"]))).catch(() => []) : [],
    ]);
    const about = (a) => { const d = a.detail || {}, id = a.target_id;
      if (a.target_type === "profile") return pp.find((x) => x.user_id === id)?.name || d.name || "";
      if (a.target_type === "need") return nn.find((x) => x.id === id)?.title || d.title || "";
      if (a.target_type === "organisation") return oo.find((x) => x.id === id)?.name || d.name || "";
      if (["engagement", "contribution"].includes(a.target_type)) { const x = ee.find((y) => y.id === id); return x ? [x.scope?.need_title, x.scope?.talent].filter(Boolean).join(" · ") : d.need_title || ""; }
      if (a.target_type === "report") return [d.reference || (id ? refOf(id) : ""), REASONS[d.reason] || ""].filter(Boolean).join(" · ");
      return d.name || d.title || ""; };
    const link = (a) => a.target_type === "profile" ? `#profile/${a.target_id}` : a.target_type === "need" ? `#need/${a.target_id}` : ["engagement", "contribution"].includes(a.target_type) ? `#agreement/${a.target_id}` : a.target_type === "organisation" ? `#admin-org/${a.target_id}` : a.target_type === "report" ? `#admin-list/reports?q=${refOf(a.target_id)}` : a.target_type === "signal" && a.detail?.link ? a.detail.link : "#admin";
    rows = acts.filter((a) => (!show || a.target_type === show) && match(a.action, JSON.stringify(a.detail || {}), about(a)));
    const LABEL = { cv_entries_restored: "Impact CV entries restored", cv_entry_hidden: "Impact CV entry hidden", cv_entry_restored: "Impact CV entry restored", id_video_not_verified: "Identity not verified on a video call", id_confirmed_video_call: "Identity confirmed on a video call" };
    const label = (a) => LABEL[a.action] || String(a.action || "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    body = rows.map((a) => { const d = a.detail || {}; const what = about(a); const note = d.note || (a.target_type === "report" ? "" : d.reason) || "";
      return `<div class="al-row"><div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px"><a href="${link(a)}" style="font-weight:700">${e(label(a))}</a>${d.from || d.to ? `<span class="small muted">${e(d.from || "—")} → ${e(d.to || "—")}</span>` : ""}</div>
        ${what ? `<span class="small" data-no-i18n style="font-weight:600">${e(what)}</span>` : ""}<span class="small muted">${date(a.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>${note ? `<span class="small"><strong>Note:</strong> <span data-no-i18n>${e(note)}</span></span>` : ""}</div></div>`; }).join("") || `<p class="muted">No admin decisions recorded yet.</p>`;
  }

  if (kind === "contributions" || kind === "followups") {
    const engs = await result(db.from("engagements").select("id,status,scope,created_at,completed_at,ended_at,end_reason,followup_due,followup_in_use,followup_answered_at,organisation_id,user_id,hidden_by_handova").order("created_at", { ascending: false }));
    if (kind === "contributions") {
      const by = (s) => engs.filter((x) => x.status === s).length;
      filters = [["", "All started", engs.length], ["awaiting_signatures", "Awaiting signatures", by("awaiting_signatures")], ["active", "In progress", by("active")], ["completed", "Completed", by("completed")], ["ended", "Ended early", by("ended")]];
      rows = engs.filter((x) => (!show || x.status === show) && match(x.scope?.need_title, x.scope?.organisation, x.scope?.talent));
    } else {
      const done = engs.filter((x) => x.status === "completed");
      filters = [["", "All completed", done.length], ["yes", "Still in use", done.filter((x) => x.followup_in_use === true).length], ["no", "Not in use", done.filter((x) => x.followup_in_use === false).length], ["due", "Waiting for an answer", done.filter((x) => x.followup_answered_at == null).length]];
      rows = done.filter((x) => (!show || (show === "yes" ? x.followup_in_use === true : show === "no" ? x.followup_in_use === false : x.followup_answered_at == null)) && match(x.scope?.need_title, x.scope?.organisation, x.scope?.talent));
    }
    body = rows.map((x) => `<div class="al-row"><div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px"><a href="#agreement/${x.id}" style="font-weight:700" data-no-i18n>${e(x.scope?.need_title || "Contribution")}</a>${status(x.status)}${kind === "followups" ? (x.followup_answered_at ? pill(x.followup_in_use ? "Still in use" : "Not in use", x.followup_in_use ? "" : "grey") : pill(x.followup_due ? `Due ${date(x.followup_due)}` : "Not scheduled", "ochre")) : ""}</div>
      <span class="small muted"><span data-no-i18n>${e(x.scope?.organisation || "")}</span> · <a href="#profile/${x.user_id}" data-no-i18n>${e(x.scope?.talent || "")}</a> · ${x.scope?.hours || "?"} hours · started ${date(x.created_at)}${x.completed_at ? ` · completed ${date(x.completed_at)}` : ""}${x.ended_at ? ` · ended ${date(x.ended_at)}` : ""}</span>
      ${x.end_reason ? `<span class="small"><strong>Reason:</strong> <span data-no-i18n>${e(x.end_reason)}</span></span>` : ""}</div><div class="al-actions">${btn("Agreement", `#agreement/${x.id}`, "secondary sm")}${kind === "contributions" && x.status === "active" ? `<button class="btn secondary sm" type="button" data-action="admin-contrib-close" data-id="${x.id}" data-title="${e(x.scope?.need_title || "")}">Close for them</button>` : ""}${kind === "contributions" && x.status === "completed" ? (x.hidden_by_handova ? `<button class="btn secondary sm" type="button" data-action="admin-restore-cv" data-id="${x.id}">Restore CV entry…</button>` : `<button class="btn secondary sm" type="button" data-action="admin-hide-cv" data-id="${x.id}">Hide CV entry…</button>`) : ""}${kind === "contributions" ? `<button class="btn secondary sm danger-outline" type="button" data-action="admin-contrib-delete" data-id="${x.id}" data-title="${e(x.scope?.need_title || "")}">Delete</button>` : ""}</div></div>`).join("");
  }

  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="stack" style="--gap:20px">
    ${back("Admin", "#admin")}
    <div>${eyebrow("Admin")}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">${LISTS[kind]}</h1></div>
    <nav class="rs-tabs" aria-label="Lists">${Object.entries(LISTS).map(([k, t]) => `<a href="#admin-list/${k}" ${k === kind ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
    ${kind === "reports" ? `<div class="row between" style="align-items:center">${chips(filters)}<button class="btn secondary sm" type="button" data-action="admin-record-report">Record an emailed report</button></div>` : chips(filters)}
    <form class="al-search" data-al-search><label class="visually-hidden" for="al-q">Search</label><input id="al-q" type="search" name="q" value="${e(params.get("q") || "")}" placeholder="${kind === "reports" ? "Search by reference or words" : "Search by name, country…"}"></form>
    <section class="card">${rows.length ? `<p class="small muted">${rows.length} ${rows.length === 1 ? "record" : "records"}</p>${body}` : empty("Nothing here", "No records match this view.")}</section>
  </div></div>`;
  return {
    title: LISTS[kind], html,
    after: () => {
      const f = document.querySelector("[data-al-search]");
      f?.addEventListener("submit", (ev) => { ev.preventDefault(); const p = new URLSearchParams(); if (show) p.set("show", show); const v = f.q.value.trim(); if (v) p.set("q", v); location.hash = `#admin-list/${kind}${p.toString() ? `?${p}` : ""}`; });
    },
  };
}

// When the server refuses a deletion because a report is still open (A20), say so plainly and link to the reports.
function reportBlock(form, err, what) {
  const msg = errorMessage(err);
  if (!/report/i.test(msg)) throw err;
  form.querySelector(".report-block")?.remove();
  form.querySelector(".form-error")?.insertAdjacentHTML("beforebegin", `<div class="banner alert report-block" role="alert"><p><strong>${what === "organisation" ? "This organisation has an open report." : "This contribution has an open report."}</strong> <span>Records linked to an open report are evidence, so they can’t be deleted. Resolve the report first.</span></p><p><a href="#admin-list/reports?show=open">See open reports</a></p><p class="small" data-no-i18n>${e(msg)}</p></div>`);
  throw Object.assign(Error("Resolve the open report first."), { quiet: true });
}

export function deleteOrgDialog(id, name, blocked) {
  if (blocked) {
    openDialog("This organisation has contributions", `<p><span>Professionals rely on contribution records for their impact CVs, and signed agreements are kept for six years.</span> <span>If its contributions were tests, delete them first in Contributions, then delete the organisation. Otherwise, suspend it: its page and needs go offline and its team can’t post new needs.</span></p><div class="row" style="--gap:8px;margin-top:16px"><a class="btn secondary" href="#admin-list/contributions?q=${encodeURIComponent(name)}">See its contributions</a><button class="btn" type="button" data-action="admin-org" data-id="${e(id)}" data-decision="suspended">Suspend</button><button class="btn secondary" type="button" data-action="close">Cancel</button></div>`);
    return;
  }
  openDialog("Delete this organisation?", `<form class="form" data-form="admin-org-delete" data-id="${e(id)}">
    <p><span>This permanently removes the organisation, its needs, applications and conversations.</span> <span>Anyone who applied to an open need is told it has closed, and the team is notified.</span> <span>The members’ personal accounts are not deleted. This can’t be undone.</span></p>
    ${field("reason", "Reason, shared with the organisation (optional)", { type: "textarea", attrs: 'maxlength="600"' })}
    ${field("confirm", `Type the organisation’s name to confirm: ${e(name)}`, { required: true, attrs: 'autocomplete="off"' })}
    ${formEnd("Delete organisation", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`).replace('class="btn"', 'class="btn danger"')}</form>`);
}
export async function submitDeleteOrg(form) {
  await withForm(form, async (fd) => {
    await result(db.rpc("admin_delete_organisation", { p_org: form.dataset.id, p_confirm: val(fd, "confirm"), p_reason: val(fd, "reason") })).catch((err) => reportBlock(form, err, "organisation"));
    closeDialog();
    toast("Organisation deleted.");
    go(location.hash);
  });
}

// When an organisation stops responding, Handova can close the contribution: approved hours stay on the professional's record.
export function closeContribDialog(id, title) {
  openDialog("Close this contribution for them?", `<form class="form" data-form="admin-contrib-close" data-id="${e(id)}">
    <p><strong data-no-i18n>${e(title)}</strong></p>
    <p><span>Use this when the organisation has stopped responding and the professional is left waiting.</span> <span>If the organisation approved some hours, the contribution is completed with those hours and marked “Closed by Handova”, with no endorsement.</span> <span>If no hours were approved, it is ended.</span> <span>Both sides are told, with your reason.</span></p>
    ${field("reason", "Reason (both sides will see it)", { type: "textarea", required: true, attrs: 'minlength="5" maxlength="1000"' })}
    ${formEnd("Close contribution", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitCloseContrib(form) {
  await withForm(form, async (fd) => {
    const r = await result(db.rpc("admin_close_engagement", { p_id: form.dataset.id, p_reason: val(fd, "reason") }));
    closeDialog();
    toast(r === "completed" ? "Closed. The approved hours stay on the professional’s record." : "Ended. No hours had been approved.");
    go(location.hash);
  });
}
export function deleteContribDialog(id, title) {
  openDialog("Delete this contribution?", `<form class="form" data-form="admin-contrib-delete" data-id="${e(id)}">
    <p><strong data-no-i18n>${e(title)}</strong></p>
    <p><span>Its hours, completion details and questionnaire answers are deleted, and it disappears from the professional’s impact CV.</span> <span>This can’t be undone.</span></p>
    ${field("reason", "Reason (optional)", { type: "textarea", attrs: 'maxlength="600"' })}
    <label class="check"><input type="checkbox" name="test"><span>This was a test or example. Also delete its signature records and don’t notify anyone.</span></label>
    <p class="small muted">Leave it unticked for a real contribution: both parties are told, and the signed agreement records are kept for six years.</p>
    ${field("confirm", "Type DELETE to confirm", { required: true, attrs: 'autocomplete="off"' })}
    ${formEnd("Delete contribution", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`).replace('class="btn"', 'class="btn danger"')}</form>`);
}
export async function submitDeleteContrib(form) {
  await withForm(form, async (fd) => {
    await result(db.rpc("admin_delete_contribution", { p_id: form.dataset.id, p_confirm: val(fd, "confirm"), p_reason: val(fd, "reason"), p_test: fd.has("test") })).catch((err) => reportBlock(form, err, "contribution"));
    closeDialog();
    toast("Contribution deleted.");
    go(location.hash);
  });
}

// ---------- Everyone who signed up: the stage each account is at ----------
export const PERSON_STAGE = {
  unconfirmed: ["Email not confirmed", "grey", "Signed up but hasn’t clicked the confirmation link in the email."],
  no_profile: ["No profile yet", "ochre", "Confirmed their email but hasn’t created a profile."],
  not_sent: ["Profile not sent for review", "ochre", "Created a profile but kept it private, so it hasn’t reached you."],
  pending: ["Waiting for your review", "clay", "Sent their profile for review. Approve it or ask for changes in Admin."],
  changes: ["Changes requested", "ochre", "You asked for changes; waiting for them to update and send it again."],
  public: ["Approved and public", "", "Can apply to needs and be invited."],
  unpublished: ["Approved, hidden by them", "grey", "Approved, but they unpublished their profile."],
  rejected: ["Not approved", "grey", ""],
  closed: ["Profile closed", "grey", ""],
  org_not_started: ["Organisation not set up", "ochre", "Signed up as an organisation but hasn’t added its details."],
  org_pending: ["Organisation waiting for your review", "clay", "Approve it or ask for details in Admin."],
  org_changes: ["Organisation: details requested", "ochre", "You asked for more details; waiting for them."],
  org_approved: ["Organisation approved", "", "Can post needs."],
  org_suspended: ["Organisation suspended", "grey", ""],
  org_rejected: ["Organisation not approved", "grey", ""],
  suspended: ["Suspended", "grey", ""],
  admin: ["Handova admin", "", ""],
};
const UNFINISHED = ["unconfirmed", "no_profile", "not_sent", "org_not_started"];
export const PEOPLE_GROUPS = {
  unfinished: ["Unfinished", (x) => UNFINISHED.includes(x.stage)],
  review: ["Waiting for your review", (x) => ["pending", "org_pending"].includes(x.stage)],
  changes: ["Changes requested", (x) => ["changes", "org_changes"].includes(x.stage)],
  professionals: ["Approved professionals", (x) => x.stage === "public"],
  organisations: ["Approved organisations", (x) => x.stage === "org_approved"],
  working: ["Working on a contribution", (x) => x.contributions_active > 0],
  applied: ["Waiting on an application", (x) => x.applications_waiting > 0],
  stopped: ["Suspended, closed or not approved", (x) => ["suspended", "closed", "rejected", "unpublished", "org_suspended", "org_rejected"].includes(x.stage)],
};
function personRow(x) {
  const [label, tone, hint] = PERSON_STAGE[x.stage] || [x.stage, "grey", ""];
  const isOrg = x.stage.startsWith("org_") && x.organisation_id;
  const hasProfile = !["unconfirmed", "no_profile", "org_not_started", "admin"].includes(x.stage) && !isOrg;
  const sp = (t) => `<span>${t}</span>`;
  const facts = [
    sp(x.role === "organisation" || isOrg ? "organisation account" : "professional account"),
    `${sp("signed up")} ${date(x.signed_up_at)}`,
    x.last_sign_in_at ? `${sp("last signed in")} ${date(x.last_sign_in_at)}` : "",
  ].filter(Boolean).join(" · ");
  const progress = [
    hasProfile && x.id_status === "approved" ? sp("ID verified") : "",
    hasProfile ? sp(x.agreement_signed ? "agreement signed" : "agreement not signed") : "",
    x.applications_waiting ? `${x.applications_waiting} ${sp(x.applications_waiting === 1 ? "application waiting" : "applications waiting")}` : "",
    x.contributions_active ? `${x.contributions_active} ${sp(x.contributions_active === 1 ? "contribution under way" : "contributions under way")}` : "",
    x.contributions_done ? `${x.contributions_done} ${sp("completed")}` : "",
    UNFINISHED.includes(x.stage) ? (x.reminders ? `${x.reminders} ${sp(x.reminders === 1 ? "reminder sent" : "reminders sent")}` : sp("no reminder yet")) : "",
  ].filter(Boolean).join(" · ");
  const nameHtml = isOrg ? `<a href="#admin-org/${x.organisation_id}" style="font-weight:700" data-no-i18n>${e(x.organisation_name || x.name)}</a> <span class="small muted" data-no-i18n>${e(x.name)}</span>`
    : hasProfile ? `<a href="#profile/${x.user_id}" style="font-weight:700" data-no-i18n>${e(x.name || x.email)}</a>` : `<strong data-no-i18n>${e(x.name || x.email)}</strong>`;
  const acts = [
    UNFINISHED.includes(x.stage) && x.email_confirmed ? `<button class="btn secondary sm" type="button" data-action="admin-signup-remind" data-id="${x.user_id}">Send a reminder now</button>` : "",
    ["pending", "org_pending"].includes(x.stage) ? btn("Review in Admin", "#admin", "sm") : "",
    isOrg ? btn("All details", `#admin-org/${x.organisation_id}`, "secondary sm") : "",
  ].join("");
  return `<div class="al-row"><div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px">${nameHtml}${pill(label, tone)}</div>
    <span class="small muted"><a href="mailto:${e(x.email)}" data-no-i18n>${e(x.email)}</a> · ${facts}</span>
    ${hint ? `<span class="small">${hint}</span>` : ""}${progress ? `<span class="small muted">${progress}</span>` : ""}</div>
    <div class="al-actions">${acts}</div></div>`;
}
