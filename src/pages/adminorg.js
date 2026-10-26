// Handova only: one organisation, everything about it on one page, and changes Handova suggests for the organisation to accept.
import { db, state, result, e, openDialog, closeDialog, toast, go, withForm, val } from "../core.js";
import { icon, eyebrow, back, empty, pill, status, field, select, countrySelect, formEnd, btn } from "../ui.js";
import { date, safeURL } from "../utils.js";
import { STAFF_SIZES } from "../survey.js";
import { ORG_TYPES } from "./account.js";

const STAFF = { none: "Volunteers only", "1-5": "1–5 paid staff", "6-20": "6–20 paid staff", "21-50": "21–50 paid staff", "50+": "More than 50 paid staff" };
// The fields Handova can suggest changes to, in the order they appear on the organisation's form.
export const ORG_FIELDS = { name: "Name", country: "Country", city: "City", org_type: "Type", staff_size: "Team size", website: "Website", ethical_bridge_url: "Ethical Bridge page", summary: "About the organisation", logo_url: "Logo" };
export const showValue = (k, v) => (v == null || v === "" ? "—" : k === "staff_size" ? STAFF[v] || v : String(v));
const when = (d) => (d ? date(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const link = (url, label) => (safeURL(url) ? `<a href="${e(safeURL(url))}" target="_blank" rel="noopener noreferrer" data-no-i18n>${e(label || url)}</a> <span class="visually-hidden">(opens in a new tab)</span>` : `<span data-no-i18n>${e(url || "—")}</span>`);
const diffRows = (changes, o) => Object.entries(changes).map(([k, v]) => `<div class="small"><strong>${ORG_FIELDS[k] || e(k)}:</strong> <span data-no-i18n style="text-decoration:line-through;color:var(--muted)">${e(showValue(k, o[k]))}</span> → <span data-no-i18n>${e(showValue(k, v))}</span></div>`).join("");

export async function adminOrg(id) {
  if (!state.user) return { redirect: `#signin?next=${encodeURIComponent(`#admin-org/${id}`)}` };
  if (!state.isAdmin) return { title: "Admin", html: `<div class="wrap page-head">${eyebrow("Admin")}<h1>Administrators only</h1></div>` };
  const o = await result(db.from("organisations").select("*").eq("id", id).maybeSingle()).catch(() => null);
  if (!o) return { title: "Organisation", html: `<div class="wrap" style="padding-block:40px 80px">${back("All organisations", "#admin-list/organisations")}${empty("Organisation not found", "It may have been deleted.")}</div>` };
  const [members, sigs, held, sug, needs, engs, acts] = await Promise.all([
    result(db.from("organisation_members").select("user_id,role,full_name,created_at").eq("organisation_id", id)).catch(() => []),
    result(db.from("agreement_signatures").select("user_id,full_name,signer_role,email,version,signed_at").eq("organisation_id", id).order("signed_at", { ascending: false })).catch(() => []),
    result(db.from("organisation_changes").select("changes,since,updated_at").eq("organisation_id", id).maybeSingle()).catch(() => null),
    result(db.from("organisation_suggestions").select("changes,note,created_at").eq("organisation_id", id).maybeSingle()).catch(() => null),
    result(db.from("needs").select("id,title,status,hours,created_at,approved_at").eq("organisation_id", id).order("created_at", { ascending: false })).catch(() => []),
    result(db.from("engagements").select("id,status,scope,user_id,created_at,completed_at,ended_at").eq("organisation_id", id).order("created_at", { ascending: false })).catch(() => []),
    result(db.from("admin_actions").select("action,detail,created_at").eq("target_id", id).order("created_at", { ascending: false }).limit(50)).catch(() => []),
  ]);
  const heldOn = held?.changes && Object.keys(held.changes).length;
  const sugOn = sug?.changes && Object.keys(sug.changes).length;
  const facts = [
    ["Name", e(o.name)], ["Type", e(o.org_type || "—")], ["Location", e([o.city, o.country].filter(Boolean).join(", ") || "—")],
    ["Team size", e(STAFF[o.staff_size] || "Not given yet")], ["Website", o.website ? link(o.website) : "No website given"],
    ["Ethical Bridge page", o.ethical_bridge_url ? link(o.ethical_bridge_url) : "—"],
    ["Locally led", o.locally_led_confirmed ? "Confirmed by the organisation" : "Not confirmed"],
    ["Registered", when(o.created_at)], ["Approved", when(o.approved_at)], ...(o.suspended_at ? [["Suspended", when(o.suspended_at)]] : []),
  ];
  const actions = [
    o.status !== "approved" && o.status !== "rejected" ? `<button class="btn sm" type="button" data-action="admin-org" data-id="${o.id}" data-name="${e(o.name)}" data-decision="approved">${o.status === "suspended" ? "Reactivate" : "Approve"}</button>` : "",
    o.status === "pending" ? `<button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-name="${e(o.name)}" data-decision="changes_requested">Ask for details</button>` : "",
    o.status === "pending" || o.status === "changes_requested" ? `<button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-name="${e(o.name)}" data-decision="rejected">Reject</button>` : "",
    o.status === "approved" ? `<button class="btn secondary sm" type="button" data-action="admin-org" data-id="${o.id}" data-name="${e(o.name)}" data-decision="suspended">Suspend</button>` : "",
    `<button class="btn secondary sm" type="button" data-action="admin-org-suggest" data-id="${o.id}">${icon("pen", 16)}<span>Suggest changes</span></button>`,
    btn("Preview their public page", `#organisations/${o.id}`, "secondary sm"),
    `<button class="btn secondary sm danger-outline" type="button" data-action="admin-org-delete" data-id="${o.id}" data-name="${e(o.name)}" ${engs.length ? `data-blocked="1"` : ""}>Delete</button>`,
  ].join("");
  const section = (title, inner, extra = "") => `<section class="card"${extra}><h2 style="font-size:1.5rem;margin-bottom:10px">${title}</h2>${inner}</section>`;
  const LABEL = { org_changes_suggested: "Changes suggested to the organisation", org_suggestion_withdrawn: "Suggestion withdrawn" };
  const label = (a) => LABEL[a.action] || String(a.action || "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="stack" style="--gap:20px">
    ${back("All organisations", "#admin-list/organisations")}
    <div class="row" style="--gap:16px;align-items:center;flex-wrap:nowrap">${o.logo_url && safeURL(o.logo_url) ? `<img class="org-review-logo" src="${e(safeURL(o.logo_url))}" alt="" referrerpolicy="no-referrer">` : `<span class="al-logo al-logo-empty">${icon("home", 20)}</span>`}
      <div style="min-width:0">${eyebrow("Admin · Organisation")}<h1 style="font-size:clamp(1.8rem,3.4vw,2.8rem)" data-no-i18n>${e(o.name)}</h1></div>${status(o.status)}</div>
    <div class="row" style="--gap:8px">${actions}</div>
    ${heldOn ? section("Changes the organisation made, waiting for you", `<p class="small muted">Sent ${date(held.since)}. The current version stays public until you approve.</p>${diffRows(held.changes, o)}<div class="row" style="--gap:8px;margin-top:12px"><button class="btn sm" type="button" data-action="org-changes" data-id="${o.id}" data-approve="1">Approve</button><button class="btn secondary sm" type="button" data-action="org-changes" data-id="${o.id}" data-approve="">Decline…</button></div>`, ' style="border-color:var(--ochre-line)"') : ""}
    ${sugOn ? section("Your suggested changes, waiting for the organisation", `<p class="small muted">Sent ${date(sug.created_at)}. Nothing changes until the organisation accepts.</p>${diffRows(sug.changes, o)}${sug.note ? `<p class="small" style="margin-top:8px"><strong>Your note:</strong> <span data-no-i18n>${e(sug.note)}</span></p>` : ""}<div class="row" style="--gap:8px;margin-top:12px"><button class="btn secondary sm" type="button" data-action="admin-org-suggest" data-id="${o.id}">Edit suggestion</button><button class="btn secondary sm" type="button" data-action="admin-org-withdraw" data-id="${o.id}">Withdraw</button></div>`, ' style="border-color:var(--ochre-line)"') : ""}
    ${section("Organisation profile", `<p style="white-space:pre-line" data-no-i18n>${e(o.summary || "")}</p><dl class="org-facts" style="margin-top:14px">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("")}</dl>`)}
    ${section("People", members.length ? members.map((m) => `<div class="list-row"><span class="stack" style="--gap:2px"><a href="#profile/${m.user_id}" style="font-weight:700" data-no-i18n>${e(m.full_name || "Member")}</a><span class="small muted">${m.role && m.role !== "owner" ? `<span data-no-i18n>${e(m.role)}</span> · ` : ""}joined ${date(m.created_at)}</span></span></div>`).join("") : `<p class="muted">No members.</p>`)}
    ${section("Organisation agreement", sigs.length ? sigs.map((g) => `<div class="list-row"><span class="stack" style="--gap:2px"><strong data-no-i18n>${e(g.full_name)}${g.signer_role ? `, ${e(g.signer_role)}` : ""}</strong><span class="small muted">${g.email ? `<span data-no-i18n>${e(g.email)}</span> · ` : ""}version ${e(g.version)} · ${when(g.signed_at)}</span></span></div>`).join("") : `<p class="muted">Not signed.</p>`)}
    ${section(`Needs (${needs.length})`, needs.length ? needs.map((n) => `<div class="list-row"><span class="stack" style="--gap:2px"><a href="#need/${n.id}" style="font-weight:700" data-no-i18n>${e(n.title)}</a><span class="small muted">${n.hours} hours · created ${date(n.created_at)}${n.approved_at ? ` · approved ${date(n.approved_at)}` : ""}</span></span>${status(n.status)}</div>`).join("") : `<p class="muted">No needs yet.</p>`)}
    ${section(`Contributions (${engs.length})`, engs.length ? engs.map((x) => `<div class="list-row"><span class="stack" style="--gap:2px"><a href="#agreement/${x.id}" style="font-weight:700" data-no-i18n>${e(x.scope?.need_title || "Contribution")}</a><span class="small muted"><a href="#profile/${x.user_id}" data-no-i18n>${e(x.scope?.talent || "")}</a> · started ${date(x.created_at)}${x.completed_at ? ` · completed ${date(x.completed_at)}` : ""}${x.ended_at ? ` · ended ${date(x.ended_at)}` : ""}</span></span>${status(x.status)}</div>`).join("") : `<p class="muted">No contributions yet.</p>`)}
    ${section("Handova decisions", acts.length ? acts.map((a) => `<div class="list-row"><span class="stack" style="--gap:2px"><strong>${e(label(a))}</strong><span class="small muted">${when(a.created_at)}</span>${a.detail?.note ? `<span class="small"><strong>Note:</strong> <span data-no-i18n>${e(a.detail.note)}</span></span>` : ""}</span></div>`).join("") : `<p class="muted">No decisions recorded yet.</p>`)}
  </div></div>`;
  return { title: o.name, html };
}

// Handova suggests changes; the organisation accepts or declines them from its workspace.
export async function suggestDialog(id) {
  const [o, sug] = await Promise.all([
    result(db.from("organisations").select("*").eq("id", id).single()),
    result(db.from("organisation_suggestions").select("changes,note").eq("organisation_id", id).maybeSingle()).catch(() => null),
  ]);
  const v = { ...o, ...(sug?.changes || {}) };
  const types = ORG_TYPES.includes(v.org_type) || !v.org_type ? ORG_TYPES : [v.org_type, ...ORG_TYPES];
  openDialog(`Suggest changes: ${o.name}`, `<form class="form" data-form="admin-org-suggest" data-id="${e(id)}">
    <p class="small muted"><span>Edit what should change. The organisation is notified and sees each change next to its current text.</span> <span>Nothing changes until they accept.</span></p>
    <div class="form-grid">
    ${field("name", "Name", { value: v.name, required: true, attrs: 'minlength="2" maxlength="160"' })}
    ${countrySelect("country", "Country", v.country, { required: true, remote: false })}
    ${field("city", "City", { value: v.city || "", attrs: 'maxlength="120"' })}
    ${select("org_type", "Type", [["", "Choose"], ...types], v.org_type || "")}
    ${select("staff_size", "Team size", [["", "Not given"], ...STAFF_SIZES], v.staff_size || "")}
    ${field("website", "Website", { type: "url", value: v.website || "", attrs: 'placeholder="https://"' })}
    ${field("ethical_bridge_url", "Ethical Bridge page", { type: "url", value: v.ethical_bridge_url || "", full: true, attrs: 'placeholder="https://"' })}
    ${field("summary", "About the organisation", { type: "textarea", value: v.summary || "", required: true, full: true, attrs: 'minlength="20" maxlength="600" rows="6"' })}
    ${field("note", "Note to the organisation (optional)", { type: "textarea", value: sug?.note || "", full: true, attrs: 'maxlength="1000"', hint: "Why you suggest these changes." })}
    </div>
    ${formEnd("Send suggestion", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitSuggest(form) {
  await withForm(form, async (fd) => {
    const changes = {};
    for (const k of ["name", "country", "city", "org_type", "staff_size", "website", "ethical_bridge_url", "summary"]) changes[k] = val(fd, k) || null;
    await result(db.rpc("admin_suggest_org_changes", { p_org: form.dataset.id, p_changes: changes, p_note: val(fd, "note") }));
    closeDialog();
    toast("Suggestion sent. The organisation has been notified.");
    go(location.hash);
  });
}
export async function withdrawSuggestion(id) {
  await result(db.rpc("admin_withdraw_org_suggestion", { p_org: id }));
  toast("Suggestion withdrawn.");
  go(location.hash);
}
