// Handova only: the records behind each number on the Admin page, with actions where they make sense.
import { db, state, result, e, openDialog, closeDialog, toast, go, withForm, val, PROFILE_COLS } from "../core.js";
import { icon, eyebrow, back, empty, pill, status, field, formEnd, btn } from "../ui.js";
import { date } from "../utils.js";

const STAFF = { none: "Volunteers only", "1-5": "1–5 paid staff", "6-20": "6–20 paid staff", "21-50": "21–50 paid staff", "50+": "More than 50 paid staff" };
export const LISTS = {
  organisations: "Registered organisations",
  professionals: "Registered professionals",
  needs: "Needs",
  contributions: "Contributions",
  followups: "Six-month follow-ups",
  activity: "Activity log",
};

export async function adminList(kind, params) {
  if (!state.user) return { redirect: "#signin?next=%23admin" };
  if (!state.isAdmin) return { title: "Admin", html: `<div class="wrap page-head">${eyebrow("Admin")}<h1>Administrators only</h1></div>` };
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
        `<button class="btn secondary sm danger-outline" type="button" data-action="admin-org-delete" data-id="${o.id}" data-name="${e(o.name)}" ${en.length ? `data-blocked="1"` : ""}>Delete</button>`,
      ].join("");
      return `<div class="al-row"><div class="row" style="--gap:12px;align-items:flex-start;flex-wrap:nowrap;min-width:0">${o.logo_url ? `<img class="al-logo" src="${e(o.logo_url)}" alt="" width="44" height="44">` : `<span class="al-logo al-logo-empty">${icon("home", 20)}</span>`}
        <div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px"><a href="#organisations/${o.id}" style="font-weight:700" data-no-i18n>${e(o.name)}</a>${status(o.status)}</div>
        <span class="small muted">${[e([o.city, o.country].filter(Boolean).join(", ")), e(o.org_type || ""), o.staff_size ? STAFF[o.staff_size] : "", `registered ${date(o.created_at)}`].filter(Boolean).join(" · ")}</span>
        <span class="small muted">${m.length ? `<span data-no-i18n>${e(m.map((x) => x.full_name || "Member").join(", "))}</span>` : "No members"} · ${nd.length} ${nd.length === 1 ? "need" : "needs"} (${nd.filter((x) => x.status === "open").length} open) · ${en.length} ${en.length === 1 ? "contribution" : "contributions"}</span>
        ${o.website || o.ethical_bridge_url ? `<span class="small">${o.website ? `<a href="${e(o.website)}" target="_blank" rel="noopener noreferrer">Website</a>` : ""}${o.website && o.ethical_bridge_url ? " · " : ""}${o.ethical_bridge_url ? `<a href="${e(o.ethical_bridge_url)}" target="_blank" rel="noopener noreferrer">Ethical Bridge page</a>` : ""}</span>` : ""}</div></div>
        <div class="al-actions">${acts}</div></div>`;
    }).join("");
  }

  if (kind === "professionals") {
    const profs = await result(db.from("profiles").select(PROFILE_COLS).order("created_at", { ascending: false }));
    const pub = (p) => p.published && p.review_status === "approved";
    filters = [["", "All", profs.length], ["approved", "Approved and public", profs.filter(pub).length], ["pending", "Under review", profs.filter((p) => p.review_status === "pending").length], ["draft", "Private drafts", profs.filter((p) => !p.published).length], ["verified", "ID verified", profs.filter((p) => p.id_status === "approved").length]];
    rows = profs.filter((p) => (!show || (show === "approved" ? pub(p) : show === "draft" ? !p.published : show === "verified" ? p.id_status === "approved" : p.review_status === show)) && match(p.name, p.headline, p.country, (p.skills || []).join(" ")));
    body = rows.map((p) => `<div class="al-row"><div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px"><a href="#profile/${p.user_id}" style="font-weight:700" data-no-i18n>${e(p.name)}</a>${pub(p) ? pill("Public") : status(p.published ? p.review_status : "draft")}${p.id_status === "approved" ? pill("ID verified") : ""}</div>
      <span class="small muted" data-no-i18n>${e(p.headline || "")}</span><span class="small muted">${[e(p.country || ""), `${p.hours_available || 0} h a month`, `joined ${date(p.created_at)}`].filter(Boolean).join(" · ")}</span></div>
      <div class="al-actions">${p.review_status === "pending" ? `<button class="btn sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="approved">Approve</button><button class="btn secondary sm" type="button" data-action="admin-profile" data-id="${p.user_id}" data-decision="changes_requested">Ask for changes</button>` : ""}${btn("View profile", `#profile/${p.user_id}`, "secondary sm")}</div></div>`).join("");
  }

  if (kind === "needs") {
    const needs = await result(db.from("needs").select("id,title,status,hours,created_at,approved_at,organisation_id,organisation:organisations(name)").order("created_at", { ascending: false }));
    const by = (s) => needs.filter((n) => n.status === s).length;
    filters = [["", "All", needs.length], ["open", "Open", by("open")], ["pending", "Waiting for review", by("pending")], ["draft", "Drafts", by("draft")], ["closed", "Closed", by("closed")]];
    rows = needs.filter((n) => (!show || n.status === show) && match(n.title, n.organisation?.name));
    body = rows.map((n) => `<div class="al-row"><div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px"><a href="#need/${n.id}" style="font-weight:700" data-no-i18n>${e(n.title)}</a>${status(n.status)}</div><span class="small muted"><span data-no-i18n>${e(n.organisation?.name || "")}</span> · ${n.hours} hours · created ${date(n.created_at)}${n.approved_at ? ` · approved ${date(n.approved_at)}` : ""}</span></div><div class="al-actions">${btn("View need", `#need/${n.id}`, "secondary sm")}</div></div>`).join("");
  }

  if (kind === "activity") {
    // Every admin decision, newest first: who decided, what changed, and the note (B9, 20 Oct 2026).
    const acts = await result(db.from("admin_actions").select("id,admin_id,action,target_type,target_id,detail,created_at").order("created_at", { ascending: false }).limit(300)).catch(() => []);
    const kinds = [...new Set(acts.map((a) => a.target_type))];
    filters = [["", "All", acts.length], ...kinds.map((k) => [k, k.charAt(0).toUpperCase() + k.slice(1), acts.filter((a) => a.target_type === k).length])];
    rows = acts.filter((a) => (!show || a.target_type === show) && match(a.action, JSON.stringify(a.detail || {})));
    const link = (a) => a.target_type === "profile" ? `#profile/${a.target_id}` : a.target_type === "need" ? `#need/${a.target_id}` : a.target_type === "engagement" ? `#agreement/${a.target_id}` : a.target_type === "organisation" ? `#admin-list/organisations` : "#admin";
    const label = (a) => String(a.action || "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
    body = rows.map((a) => { const d = a.detail || {}; const what = d.name || d.title || d.reason || ""; const note = d.note || "";
      return `<div class="al-row"><div class="stack" style="--gap:4px;min-width:0"><div class="row" style="--gap:8px"><a href="${link(a)}" style="font-weight:700">${e(label(a))}</a>${d.from || d.to ? `<span class="small muted">${e(d.from || "—")} → ${e(d.to || "—")}</span>` : ""}</div>
        <span class="small muted">${e(new Date(a.created_at).toLocaleString())}${what ? ` · <span data-no-i18n>${e(what)}</span>` : ""}</span>${note ? `<span class="small"><strong>Note:</strong> <span data-no-i18n>${e(note)}</span></span>` : ""}</div></div>`; }).join("") || `<p class="muted">No admin decisions recorded yet.</p>`;
  }

  if (kind === "contributions" || kind === "followups") {
    const engs = await result(db.from("engagements").select("id,status,scope,created_at,completed_at,ended_at,end_reason,followup_due,followup_in_use,followup_answered_at,organisation_id,user_id").order("created_at", { ascending: false }));
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
      ${x.end_reason ? `<span class="small"><strong>Reason:</strong> <span data-no-i18n>${e(x.end_reason)}</span></span>` : ""}</div><div class="al-actions">${btn("Agreement", `#agreement/${x.id}`, "secondary sm")}${kind === "contributions" && x.status === "active" ? `<button class="btn secondary sm" type="button" data-action="admin-contrib-close" data-id="${x.id}" data-title="${e(x.scope?.need_title || "")}">Close for them</button>` : ""}${kind === "contributions" ? `<button class="btn secondary sm danger-outline" type="button" data-action="admin-contrib-delete" data-id="${x.id}" data-title="${e(x.scope?.need_title || "")}">Delete</button>` : ""}</div></div>`).join("");
  }

  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="stack" style="--gap:20px">
    ${back("Admin", "#admin")}
    <div>${eyebrow("Admin")}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">${LISTS[kind]}</h1></div>
    <nav class="rs-tabs" aria-label="Lists">${Object.entries(LISTS).map(([k, t]) => `<a href="#admin-list/${k}" ${k === kind ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
    ${chips(filters)}
    <form class="al-search" data-al-search><label class="visually-hidden" for="al-q">Search</label><input id="al-q" type="search" name="q" value="${e(params.get("q") || "")}" placeholder="Search by name, country…"></form>
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
    await result(db.rpc("admin_delete_organisation", { p_org: form.dataset.id, p_confirm: val(fd, "confirm"), p_reason: val(fd, "reason") }));
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
    <label class="check"><input type="checkbox" name="test" checked><span>This was a test or example. Also delete its signature records and don’t notify anyone.</span></label>
    <p class="small muted">Untick for a real contribution: both parties are told, and the signed agreement records are kept for six years.</p>
    ${field("confirm", "Type DELETE to confirm", { required: true, attrs: 'autocomplete="off"' })}
    ${formEnd("Delete contribution", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`).replace('class="btn"', 'class="btn danger"')}</form>`);
}
export async function submitDeleteContrib(form) {
  await withForm(form, async (fd) => {
    await result(db.rpc("admin_delete_contribution", { p_id: form.dataset.id, p_confirm: val(fd, "confirm"), p_reason: val(fd, "reason"), p_test: fd.has("test") }));
    closeDialog();
    toast("Contribution deleted.");
    go(location.hash);
  });
}
