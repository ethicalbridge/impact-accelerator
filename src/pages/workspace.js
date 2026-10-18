import { db, state, result, e, openDialog, closeDialog, toast, go, withForm, invalidMessage, fieldError, fieldProblem, val, loadSession } from "../core.js";
import { icon, avatar, eyebrow, empty, btn, back, status, pill, field, select, check, formEnd, needCard, tags, languagePicker, skillPicker, dropdown, countrySelect, TIMEZONES } from "../ui.js";
import { profileForm, orgForm, identityCard } from "./account.js";
import { list, languages, date, plural, today } from "../utils.js";

const sideNav = (items, active) => `<nav class="side-nav" aria-label="Workspace">${items.map(([ic, label, href, badge]) => `<a href="${href}" ${href === active ? 'aria-current="page"' : ""}>${icon(ic, 20)}<span>${label}</span>${badge ? `<span class="badge">${badge}</span>` : ""}</a>`).join("")}</nav>`;
const card = (title, inner, extra = "") => `<section class="card stack" style="--gap:6px"><div class="row between" style="margin-bottom:8px"><h2 style="font-size:1.7rem">${title}</h2>${extra}</div>${inner}</section>`;
const listRows = (rows, fallback) => (rows.length ? `<div>${rows.join("")}</div>` : fallback);
const row = (left, right) => `<div class="list-row"><div class="stack" style="--gap:4px;min-width:0">${left}</div><div class="row" style="--gap:8px">${right}</div></div>`;

// ================= Professional workspace =================
export async function workspace(sub) {
  if (!state.user) return { redirect: "#signin?next=%23workspace" };
  if (!state.profile) return { redirect: state.memberships.length ? "#org" : "#onboarding" };
  const p = state.profile, uid = state.user.id;
  if (sub === "profile") {
    return wsShell("Edit profile", `<div class="stack" style="--gap:20px">${back("Back to workspace", "#workspace")}${eyebrow("Your profile")}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">Edit your profile</h1>${reviewBanner(p)}${profileForm(p)}</div>`, "#workspace/profile");
  }
  const [apps, invites, engagements, saved] = await Promise.all([
    result(db.from("applications").select("*, need:needs(id,title,organisation:organisations(name))").eq("user_id", uid).order("created_at", { ascending: false })),
    result(db.from("invitations").select("*, need:needs(id,title,hours,arrangement,organisation:organisations(name,country))").eq("user_id", uid).order("created_at", { ascending: false })),
    result(db.from("engagements").select("*, organisation:organisations(name)").eq("user_id", uid).order("created_at", { ascending: false })),
    result(db.from("saved_needs").select("need:needs(*, organisation:organisations(name,city,country))").eq("user_id", uid)),
  ]);
  const engIds = engagements.map((x) => x.id);
  const hours = engIds.length ? await result(db.from("hours").select("*").in("engagement_id", engIds).order("work_date", { ascending: false })) : [];
  const toSign = engagements.filter((x) => x.status === "awaiting_signatures" && !x.talent_signed_at);
  const active = engagements.filter((x) => x.status === "active");
  const completed = engagements.filter((x) => x.status === "completed");
  const approvedHours = hours.filter((h) => h.status === "approved").reduce((s, h) => s + Number(h.hours), 0);
  const pendingInv = invites.filter((i) => i.status === "pending");

  const html = `<div class="stack" style="--gap:26px">
    <div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Your workspace")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">Hello, ${e(p.name.split(" ")[0])}.</h1></div><div class="row">${btn("Edit profile", "#workspace/profile", "secondary sm")}${btn(`Find a need ${icon("arrow", 16)}`, "#needs", "sm")}</div></div>
    ${p.id_status === "approved" ? "" : identityCard(p)}
    ${reviewBanner(p)}
    ${toSign.map((x) => `<div class="banner warn">${icon("pen", 24, "#7a4f0e")}<div style="flex:1"><strong>Sign your agreement with ${e(x.organisation?.name || "the organisation")}</strong><p class="small">${e(x.scope?.need_title)}. Work and hours can start once you both sign.</p></div>${btn("Review and sign", `#agreement/${x.id}`, "dark sm")}</div>`).join("")}
    <div class="grid-4"><div class="stat"><strong>${approvedHours}</strong><span>reviewed hours</span></div><div class="stat"><strong>${completed.length}</strong><span>completed contributions</span></div><div class="stat"><strong>${apps.filter((a) => a.status === "pending").length}</strong><span>applications under review</span></div><div class="stat"><strong>${p.hours_available} h</strong><span>available each month</span></div></div>
    ${pendingInv.length ? card("Invitations", listRows(pendingInv.map((i) => row(`<strong>${e(i.need?.title)}</strong><span class="small muted">${e(i.need?.organisation?.name)} · ${i.need?.hours} hours · ${e(i.need?.arrangement)}</span><p class="small">“${e(i.message)}”</p>`, `<button class="btn sm" type="button" data-action="invite-accept" data-id="${i.id}">Accept</button><button class="btn secondary sm" type="button" data-action="invite-decline" data-id="${i.id}">Decline</button>${btn("View need", `#need/${i.need_id}`, "secondary sm")}`)), "")) : ""}
    ${active.length ? card("In progress", listRows(active.map((x) => row(`<strong>${e(x.scope?.need_title)}</strong><span class="small muted">${e(x.organisation?.name)} · ${hours.filter((h) => h.engagement_id === x.id && h.status === "approved").reduce((s, h) => s + Number(h.hours), 0)} of ${x.scope?.hours} hours reviewed</span>`, `${btn("Log time", `#agreement/${x.id}`, "sm")}${btn("Messages", `#conversation-for/${x.need_id}/${uid}`, "secondary sm")}`)), "")) : ""}
    ${card("Applications", listRows(apps.map((a) => row(`<a href="#need/${a.need_id}" style="font-weight:700">${e(a.need?.title || "Need")}</a><span class="small muted">${e(a.need?.organisation?.name || "")} · applied ${date(a.created_at)}</span>`, `${status(a.status)}${btn("Messages", `#conversation-for/${a.need_id}/${uid}`, "secondary sm")}${a.status === "pending" ? `<button class="btn secondary sm" type="button" data-action="withdraw" data-id="${a.id}">Withdraw</button>` : ""}`)), empty("No applications yet", "Find a need that fits your skills and apply with a short plan.", btn("Explore needs", "#needs", "secondary sm"))), `<a href="#needs" style="font-weight:700">Find more needs</a>`)}
    ${card("Your public impact CV", listRows(completed.map((x) => row(`<strong>${e(x.scope?.need_title)}</strong><span class="small muted">${e(x.organisation?.name)} · completed ${date(x.completed_at)}</span>${x.endorsement ? `<p class="small">“${e(x.endorsement)}”</p>` : ""}<span class="small muted">Private rating from the organisation: ${x.rating ? `${x.rating} out of 5` : "none"}. Only you can see this.</span>`, `<label class="check"><input type="checkbox" data-action="toggle-public" data-id="${x.id}" ${x.public ? "checked" : ""}><span>Show on my impact CV</span></label>`)), empty("Nothing to publish yet", "When an organisation completes and endorses your work, you choose whether it appears here.")), btn("View my CV", `#profile/${uid}`, "secondary sm"))}
    ${saved.filter((s) => s.need).length ? `<section class="stack"><h2 style="font-size:1.7rem">Saved needs</h2><div class="grid">${saved.filter((s) => s.need).map((s) => needCard(s.need)).join("")}</div></section>` : ""}
  </div>`;
  return wsShell("Your workspace", html, "#workspace", pendingInv.length + toSign.length);
}

function reviewBanner(p) {
  if (!p.published) return `<div class="banner">${icon("eye", 22, "#0f6f63")}<p style="flex:1">Your profile is <strong>private</strong>. Publish it when you are ready; we review it before it becomes public.</p>${btn("Publish profile", "#workspace/profile", "sm")}</div>`;
  if (p.review_status === "pending") return `<div class="banner warn">${icon("clock", 22, "#7a4f0e")}<p>Your profile is <strong>awaiting approval</strong>. We usually review within two working days and will notify you.</p></div>`;
  if (p.review_status === "changes_requested") return `<div class="banner alert">${icon("alert", 22)}<p style="flex:1">We asked for some changes to your profile. Check your notifications, update your profile and publish it again.</p>${btn("Edit profile", "#workspace/profile", "sm")}</div>`;
  if (p.review_status === "rejected") return `<div class="banner alert">${icon("alert", 22)}<p>Your profile was not approved. Write to us if you think this is a mistake.</p></div>`;
  return `<div class="banner">${icon("eye", 22, "#0f6f63")}<p style="flex:1">Your profile is <strong>approved and public</strong>. Anyone can see it, including search engines.</p><a href="#profile/${p.user_id}" style="font-weight:700">View public profile</a></div>`;
}

function wsShell(title, main, active, badge = 0) {
  const items = [["home", "Overview", "#workspace", badge || ""], ["user", "Edit profile", "#workspace/profile"], ["shield", "My impact CV", `#profile/${state.user.id}`], ["bell", "Notifications", "#notifications", state.unread || ""], ["settings", "Account and privacy", "#account"]];
  if (state.memberships.length) items.push(["grid", "Organisation workspace", "#org"]);
  return { title, html: `<div class="workspace">${sideNav(items, active)}<div class="ws-main">${main}</div></div>` };
}

// ================= Organisation workspace =================
// Menu: To do (everything waiting for you) · Needs (every need, by stage) · Find talent · Organisation profile.
// Each need has its own page holding its applicants, invitations, the person doing the work and the endorsement.
const STAGES = [
  ["draft", "Drafts"],
  ["pending", "Waiting for Handova’s review"],
  ["open", "Open for applications"],
  ["progress", "In progress"],
  ["past", "Finished or closed"],
];
const STAGE_PILL = { draft: ["Draft", "grey"], changes: ["Changes requested", "clay"], pending: ["Waiting for review", "ochre"], open: ["Open", ""], progress: ["In progress", ""], done: ["Finished", ""], closed: ["Closed", "grey"] };
const ORG_STATUS = { pending: ["Under review by Handova", "ochre"], changes_requested: ["Changes requested", "clay"], rejected: ["Not approved", "grey"], suspended: ["Suspended", "grey"] };

function needStage(n, engs) {
  if (n.status === "draft" || n.status === "pending" || n.status === "open") return n.status;
  const mine = engs.filter((x) => x.need_id === n.id);
  if (mine.some((x) => x.status === "active" || x.status === "awaiting_signatures")) return "progress";
  return mine.some((x) => x.status === "completed") ? "done" : "closed";
}
const stagePill = (n, st) => { const [t, tone] = STAGE_PILL[st === "draft" && n.review_note ? "changes" : st]; return pill(t, tone); };
// Separate text pieces so each one can be translated on its own.
const parts = (list) => list.filter(Boolean).map((x) => `<span>${x}</span>`).join(" · ");
const quoted = (s) => `“${e(s)}”`;
const addDays = (d, k) => { const x = new Date(d); x.setDate(x.getDate() + k); return x.toISOString().slice(0, 10); };
const personName = (x) => e(x?.person?.name || x?.scope?.talent || "the professional");
const approvedHours = (hours, engId) => hours.filter((h) => h.engagement_id === engId && h.status === "approved").reduce((s, h) => s + Number(h.hours || 0), 0);

// The status of one contribution, in words, from the organisation's side.
function engState(x, hours, n) {
  if (x.status === "awaiting_signatures") return x.org_signed_at ? `Waiting for ${personName(x)} to sign` : "Your signature is needed";
  if (x.status === "active") return `Working · ${approvedHours(hours, x.id)} of ${n?.hours || x.scope?.hours || "?"} hours approved`;
  if (x.status === "completed") return `Finished ${date(x.completed_at)}`;
  return "Ended early";
}

async function loadOrg(o) {
  const needs = await result(db.from("needs").select("*").eq("organisation_id", o.id).order("created_at", { ascending: false }));
  const ids = needs.map((n) => n.id);
  const [apps, invites, engs] = ids.length ? await Promise.all([
    result(db.from("applications").select("*, person:profiles(user_id,name,headline,country,languages)").in("need_id", ids).order("created_at", { ascending: true })),
    result(db.from("invitations").select("*, person:profiles(user_id,name)").in("need_id", ids).order("created_at", { ascending: false })),
    result(db.from("engagements").select("*, person:profiles(user_id,name)").eq("organisation_id", o.id).order("created_at", { ascending: false })),
  ]) : [[], [], []];
  const engIds = engs.map((x) => x.id);
  const hours = engIds.length ? await result(db.from("hours").select("*").in("engagement_id", engIds).order("work_date")) : [];
  return { needs, apps, invites, engs, hours };
}

const hoursRow = (h, x, n) => `<div class="todo-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${personName(x)} logged ${Number(h.hours)} ${Number(h.hours) === 1 ? "hour" : "hours"} on ${quoted(n?.title || x?.scope?.need_title || "")}</strong><span class="small muted">${parts([date(h.work_date), `please review by ${date(addDays(h.created_at, 14))}`])}</span><p class="small" data-no-i18n>${e(h.description)}</p></div><div class="todo-actions"><button class="btn sm" type="button" data-action="hours-approve" data-id="${h.id}">Approve</button><button class="btn secondary sm" type="button" data-action="hours-changes" data-id="${h.id}">Ask for changes</button></div></div>`;
const todoRow = (text, sub, actions) => `<div class="todo-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${text}</strong>${sub ? `<span class="small muted">${sub}</span>` : ""}</div><div class="todo-actions">${actions}</div></div>`;
const waitRow = (text) => `<li>${icon("clock", 18, "#5d6b66")}<span>${text}</span></li>`;

export async function org(sub, id) {
  if (!state.user) return { redirect: "#signin?next=%23org" };
  if (!state.memberships.length) return { redirect: "#onboarding" };
  const m = state.memberships.find((x) => x.organisation_id === sessionStorage.getItem("ia-org")) || state.memberships[0];
  const o = m.organisation;
  const approved = o.status === "approved";
  const data = sub === "details" || sub === "need" ? null : await loadOrg(o);
  const todoCount = data ? todoItems(o, data).length : 0;
  const items = [["home", "To do", "#org", todoCount || ""], ["doc", "Needs", "#org/needs"], ["people", `<span class="nav-long">Find talent</span><span class="nav-short">Talent</span>`, "#talent"], ["settings", `<span class="nav-long">Organisation profile</span><span class="nav-short">Profile</span>`, "#org/details"]];
  const active = sub === "details" ? "#org/details" : sub === "needs" || sub === "need" ? "#org/needs" : "#org";
  const head = (title, action = "") => `<div class="row between ws-head" style="align-items:flex-end"><div class="stack" style="--gap:8px"><div class="row" style="--gap:10px">${o.logo_url ? `<img class="ws-logo" src="${e(o.logo_url)}" width="40" height="40" alt="">` : ""}${eyebrow(e(o.name))}${ORG_STATUS[o.status] ? pill(...ORG_STATUS[o.status]) : ""}</div><h1 class="ws-title">${title}</h1></div>${action}</div>`;
  const switcher = state.memberships.length > 1 ? `<label class="field" style="max-width:360px">Organisation<select data-action="switch-org">${state.memberships.map((x) => `<option value="${x.organisation_id}" ${x.organisation_id === o.id ? "selected" : ""}>${e(x.organisation.name)}</option>`).join("")}</select></label>` : "";
  const shell = (main) => ({ title: `${o.name} · workspace`, html: `<div class="workspace org-ws">${sideNav(items, active)}<div class="ws-main">${main}</div></div>` });
  const banner = orgBanner(o);
  const postBtn = btn(`${icon("plus", 16)} Post a need`, "#org/need", "sm");

  if (sub === "details") return shell(`<div class="stack" style="--gap:20px">${head("Organisation profile")}<p class="lead">How professionals see your organisation, on your public page and on every need you post.${approved ? ` <a href="#organisations/${e(o.id)}" style="font-weight:700">View your public page</a>` : ""}</p>${banner}${orgForm(o)}</div>`);

  if (sub === "need") {
    const n = id ? await result(db.from("needs").select("*").eq("id", id).maybeSingle()) : null;
    const note = n?.review_note && n.status === "draft" ? `<div class="banner alert">${icon("alert", 22)}<p><strong>Handova asked for changes:</strong> <span data-no-i18n>${quoted(n.review_note)}</span> Update the need and send it again.</p></div>` : "";
    const info = n && (n.status === "open" || n.status === "closed") ? "" : `<div class="banner">${icon("check", 22, "#0f6f63")}<p>${approved ? "Handova checks every need before it goes live. We usually reply within two working days." : "You can write your need and send it for review now. It goes live once Handova has approved your organisation and the need."}</p></div>`;
    return shell(`<div class="stack" style="--gap:20px">${back(n ? "Back to the need" : "All needs", n ? `#org/needs/${n.id}` : "#org/needs")}${head(n ? "Edit need" : "Post a need")}${note}${info}${needForm(n, o, approved, await talentLanguages())}</div>`);
  }

  if (sub === "needs" && id) return shell(await needPage(o, approved, data, id, head));

  if (sub === "needs") {
    const { needs, apps, engs, hours } = data;
    const openCount = needs.filter((n) => n.status === "open").length;
    const groups = STAGES.map(([key, label]) => {
      const list = needs.filter((n) => { const st = needStage(n, engs); return key === "past" ? st === "done" || st === "closed" : st === key; });
      if (!list.length) return "";
      const rows = list.map((n) => { const st = needStage(n, engs); return needRow(n, st, apps, engs, hours, approved); }).join("");
      return key === "past" ? `<details class="need-group"><summary><h2>${label}</h2><span class="muted">(${list.length})</span></summary>${rows}</details>` : `<section class="need-group"><h2>${label}</h2>${rows}</section>`;
    }).join("");
    const line = approved ? `You have ${plural(openCount, "open need")}. You can have up to 3 open at a time.` : "Your needs can go live once Handova has approved your organisation. You can write them and send them for review now.";
    return shell(`<div class="stack" style="--gap:22px">${head("Needs", postBtn)}${switcher}<p class="muted">${line}</p>${needs.length ? groups : `<section class="card">${empty("Post your first need", "A need is one piece of work, up to 16 hours, that a volunteer professional can help with. Describe one clear output and the skills involved.", btn("Post a need", "#org/need", "sm"))}</section>`}</div>`);
  }

  // To do
  const todo = todoItems(o, data);
  const waiting = waitingItems(o, data, approved);
  const none = !data.needs.length
    ? empty("Start by posting a need", "One piece of work, up to 16 hours: describe one clear output and the skills involved.", btn("Post a need", "#org/need", "sm"))
    : empty("Nothing needs you right now", "When someone applies, logs hours or needs your signature, it appears here and we notify you.", btn("See your needs", "#org/needs", "secondary sm"));
  return shell(`<div class="stack" style="--gap:22px">${head("To do", postBtn)}${switcher}${banner}
    <section class="card stack" style="--gap:6px"><h2 class="card-title">Waiting for you</h2>${todo.length ? `<div>${todo.map((t) => t.html).join("")}</div>` : none}</section>
    ${waiting.length ? `<section class="card stack" style="--gap:10px"><h2 class="card-title">Waiting for others</h2><p class="small muted">Nothing to do here. This is just so you know where things stand.</p><ul class="wait-list">${waiting.join("")}</ul></section>` : ""}
  </div>`);
}

// Everything the organisation needs to act on, most urgent first.
function todoItems(o, { needs, apps, engs, hours }) {
  const need = (nid) => needs.find((n) => n.id === nid);
  const out = [];
  for (const x of engs.filter((y) => y.status === "awaiting_signatures" && !y.org_signed_at)) out.push({ html: todoRow(`Sign the agreement with ${personName(x)}`, quoted(x.scope?.need_title || need(x.need_id)?.title || ""), btn("Review and sign", `#agreement/${x.id}`, "sm")) });
  for (const n of needs.filter((y) => y.status === "draft" && y.review_note)) out.push({ html: todoRow(`Handova asked for changes to ${quoted(n.title)}`, `<span data-no-i18n>${e(n.review_note)}</span>`, btn("Update need", `#org/need/${n.id}`, "sm")) });
  for (const n of needs) {
    const waiting = apps.filter((a) => a.need_id === n.id && a.status === "pending");
    if (waiting.length) out.push({ html: todoRow(waiting.length === 1 ? `${e(waiting[0].person?.name || "Someone")} applied to ${quoted(n.title)}` : `${waiting.length} people applied to ${quoted(n.title)}`, "Review their messages, then accept or decline.", btn("See applicants", `#org/needs/${n.id}`, "sm")) });
  }
  for (const h of hours.filter((y) => y.status === "pending")) { const x = engs.find((y) => y.id === h.engagement_id); out.push({ html: hoursRow(h, x, need(x?.need_id)) }); }
  for (const x of engs.filter((y) => y.status === "completed" && y.followup_due && y.followup_due <= today() && !y.followup_answered_at)) out.push({ html: todoRow(`Six months on: are you still using what ${personName(x)} delivered?`, quoted(x.scope?.need_title || ""), `<button class="btn sm" type="button" data-action="followup" data-id="${x.id}">Answer</button>`) });
  for (const n of needs.filter((y) => y.status === "draft" && !y.review_note)) out.push({ html: todoRow(`${quoted(n.title)} is still a draft`, "Send it to Handova for review when it is ready.", btn("Open draft", `#org/needs/${n.id}`, "secondary sm")) });
  return out;
}

// Things in motion that are not on the organisation: reassurance that nothing is stuck.
function waitingItems(o, { needs, apps, invites, engs }, approved) {
  const out = [];
  for (const n of needs.filter((y) => y.status === "pending")) out.push(waitRow(`Handova is reviewing ${quoted(n.title)}. ${approved ? "We usually reply within two working days." : "It can go live once your organisation is approved."}`));
  for (const x of engs.filter((y) => y.status === "awaiting_signatures" && y.org_signed_at)) out.push(waitRow(`Waiting for ${personName(x)} to sign the agreement for ${quoted(x.scope?.need_title || "")}.`));
  for (const i of invites.filter((y) => y.status === "pending")) out.push(waitRow(`Invitation sent to ${e(i.person?.name || "a professional")} for ${quoted(needs.find((n) => n.id === i.need_id)?.title || "")}. No reply yet.`));
  for (const n of needs.filter((y) => y.status === "open" && !apps.some((a) => a.need_id === y.id && a.status === "pending"))) out.push(waitRow(`${quoted(n.title)} is open for applications. We’ll tell you when someone applies.`));
  return out;
}

function needRow(n, st, apps, engs, hours, approved) {
  const mine = engs.filter((x) => x.need_id === n.id);
  const working = mine.filter((x) => x.status === "active" || x.status === "awaiting_signatures");
  const newApps = apps.filter((a) => a.need_id === n.id && a.status === "pending").length;
  let line;
  if (st === "draft") line = n.review_note ? "Handova asked for changes. Open it to see the note." : parts(["Draft: only your organisation can see it", `last edited ${date(n.updated_at || n.created_at)}`]);
  else if (st === "pending") line = parts(["Sent for review", approved ? "Handova usually replies within two working days" : "it can go live once your organisation is approved"]);
  else if (st === "open") line = parts([newApps ? plural(newApps, "new application") : "No applications yet", n.deadline ? `apply by ${date(n.deadline)}` : "", working.length ? `${plural(working.length, "person", "people")} already working on it` : ""]);
  else if (st === "progress") line = working.map((x) => `${personName(x)}: <span>${engState(x, hours, n)}</span>`).join(" · ");
  else if (st === "done") line = `Finished with ${mine.filter((x) => x.status === "completed").map(personName).join(", ")}`;
  else line = mine.length ? parts(["Closed", "the contribution ended early"]) : "Closed without a match";
  return `<a class="need-row" href="#org/needs/${n.id}"><span class="stack" style="--gap:4px;min-width:0"><strong data-no-i18n>${e(n.title)}</strong><span class="small muted">${line}</span></span><span class="row" style="--gap:10px;flex-wrap:nowrap">${stagePill(n, st)}${icon("arrow", 18)}</span></a>`;
}

async function needPage(o, approved, { needs, apps, invites, engs, hours }, id, head) {
  const n = needs.find((x) => x.id === id);
  if (!n) return `<div class="stack" style="--gap:20px">${back("All needs", "#org/needs")}${empty("This need isn’t here", "It may belong to another organisation, or it was removed.", btn("All needs", "#org/needs", "sm"))}</div>`;
  const st = needStage(n, engs);
  const mine = engs.filter((x) => x.need_id === n.id);
  const pendingApps = apps.filter((a) => a.need_id === n.id && a.status === "pending");
  const decided = apps.filter((a) => a.need_id === n.id && a.status !== "pending");
  const myInvites = invites.filter((i) => i.need_id === n.id);
  const myHours = hours.filter((h) => h.status === "pending" && mine.some((x) => x.id === h.engagement_id));
  const next = {
    draft: "Only your organisation can see this need. When it is ready, send it to Handova for review.",
    pending: approved ? "Handova is checking this need. We usually reply within two working days and will notify you." : "Handova is checking this need. It can go live once your organisation is approved.",
    open: "Professionals can apply now, and you can invite someone. We’ll notify you when someone applies.",
    progress: mine.some((x) => x.status === "awaiting_signatures") ? "The agreement needs both signatures before the work starts." : "Someone is working on this need. Please review logged hours within 14 days.",
    done: "This need is finished. Thank you for the work you put into it.",
    closed: "This need is closed and no longer takes applications.",
  }[st];
  const buttons = [
    st === "draft" ? `<button class="btn sm" type="button" data-action="need-submit" data-id="${n.id}">Send for review</button>` : "",
    st === "open" ? btn("Invite a professional", "#talent", "sm") : "",
    ["draft", "pending", "open"].includes(st) ? btn("Edit", `#org/need/${n.id}`, "secondary sm") : "",
    n.status === "open" || n.status === "closed" ? btn("View public page", `#need/${n.id}`, "secondary sm") : "",
    st === "open" ? `<button class="btn secondary sm" type="button" data-action="close-need" data-id="${n.id}">Stop applications</button>` : "",
  ].join("");
  const note = n.review_note && n.status === "draft" ? `<div class="banner alert">${icon("alert", 22)}<p><strong>Handova asked for changes:</strong> <span data-no-i18n>${quoted(n.review_note)}</span> Update the need and send it again.</p></div>` : "";
  const appRow = (a) => `<div class="todo-row" style="align-items:flex-start"><div class="row" style="align-items:flex-start;flex-wrap:nowrap;min-width:0">${avatar(a.person?.name || "?", 48)}<div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${a.user_id}" style="font-weight:700">${e(a.person?.name || "Professional")}</a><span class="small muted">${[e(a.person?.headline || ""), e(a.person?.country || ""), (a.person?.languages || []).length ? `Works in ${e(a.person.languages.join(", "))}` : ""].filter(Boolean).join(" · ")}</span><p class="prose clamp-4" style="font-size:.97rem" data-no-i18n>${e(a.message)}</p></div></div><div class="todo-actions"><button class="btn sm" type="button" data-action="app-accept" data-id="${a.id}">Accept</button><button class="btn secondary sm" type="button" data-action="app-decline" data-id="${a.id}">Decline</button>${btn("Message", `#conversation-for/${a.need_id}/${a.user_id}`, "secondary sm")}</div></div>`;
  const APP_DONE = { accepted: ["Accepted", ""], declined: ["Not selected", "grey"], withdrawn: ["Withdrew", "grey"] };
  const INV = { pending: ["Awaiting reply", "ochre"], accepted: ["Accepted", ""], declined: ["Declined by the professional", "grey"] };
  const showApps = st !== "draft" && st !== "pending";
  const appsSection = showApps ? `<section class="card stack" style="--gap:6px"><h2 class="card-title">Applicants${pendingApps.length ? ` (${pendingApps.length})` : ""}</h2>${pendingApps.length ? `<div>${pendingApps.map(appRow).join("")}</div>` : `<p class="muted">${st === "open" ? "No applications waiting. You can also invite a professional." : "No applications waiting."}</p>`}${decided.length ? `<details class="fold"><summary>Earlier applicants (${decided.length})</summary><div>${decided.map((a) => `<div class="list-row"><span><a href="#profile/${a.user_id}" style="font-weight:700">${e(a.person?.name || "Professional")}</a> <span class="small muted">· ${date(a.created_at)}</span></span>${pill(...(APP_DONE[a.status] || [a.status, "grey"]))}</div>`).join("")}</div></details>` : ""}</section>` : "";
  const invSection = myInvites.length ? `<section class="card stack" style="--gap:6px"><h2 class="card-title">Invitations you sent</h2><div>${myInvites.map((i) => `<div class="list-row"><span><strong>${e(i.person?.name || "Professional")}</strong> <span class="small muted">· sent ${date(i.created_at)}</span></span>${pill(...(INV[i.status] || [i.status, "grey"]))}</div>`).join("")}</div></section>` : "";
  const engRow = (x) => {
    const acts = [
      x.status === "awaiting_signatures" && !x.org_signed_at ? btn("Review and sign", `#agreement/${x.id}`, "sm") : btn("Open agreement", `#agreement/${x.id}`, "secondary sm"),
      x.status === "active" ? `<button class="btn sm" type="button" data-action="complete" data-id="${x.id}">Mark complete and endorse</button>` : "",
      x.status === "active" || x.status === "awaiting_signatures" ? btn("Messages", `#conversation-for/${x.need_id}/${x.user_id}`, "secondary sm") : "",
    ].join("");
    const extra = x.status === "completed" ? `<p class="small" data-no-i18n>${x.endorsement ? `“${e(x.endorsement.slice(0, 280))}${x.endorsement.length > 280 ? "…" : ""}”` : ""}</p><span class="small muted">${x.followup_answered_at ? `Six-month check answered: ${x.followup_in_use ? "still in use" : "no longer in use"}.` : x.followup_due ? `We’ll ask on ${date(x.followup_due)} whether the work is still in use.` : ""}</span>` : "";
    return `<div class="todo-row"><div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${x.user_id}" style="font-weight:700">${personName(x)}</a><span class="small muted">${engState(x, hours, n)}</span>${extra}</div><div class="todo-actions">${acts}</div></div>`;
  };
  const engSection = mine.length ? `<section class="card stack" style="--gap:6px"><h2 class="card-title">${mine.length === 1 ? "The person helping you" : "The people helping you"}</h2><div>${mine.map(engRow).join("")}</div></section>` : "";
  const hoursSection = myHours.length ? `<section class="card stack" style="--gap:6px"><h2 class="card-title">Hours to review</h2><div>${myHours.map((h) => hoursRow(h, mine.find((x) => x.id === h.engagement_id), n)).join("")}</div></section>` : "";
  const deliverables = (n.output || "").split(/\n|;/).map((s) => s.trim()).filter(Boolean);
  const about = `<details class="card fold-card" ${st === "draft" || st === "pending" ? "open" : ""}><summary><h2 class="card-title">About this need</h2></summary><div class="stack" style="--gap:14px;margin-top:12px"><div><strong>The challenge</strong><p class="prose" data-no-i18n>${e(n.description)}</p></div><div><strong>What should be delivered</strong><ul class="checks">${deliverables.map((d) => `<li>${icon("check", 20, "#0f6f63", 2.2)}<span data-no-i18n>${e(d)}</span></li>`).join("")}</ul></div>${(n.skills || []).length ? `<div class="row" style="--gap:6px"><strong>Skills</strong>${tags(n.skills)}</div>` : ""}<p><strong>Working languages:</strong> ${e((n.languages || []).join(", "))}</p></div></details>`;
  return `<div class="stack" style="--gap:22px">${back("All needs", "#org/needs")}
    <div class="stack" style="--gap:10px"><div class="row" style="--gap:10px">${eyebrow(e(o.name))}${stagePill(n, st)}</div><h1 class="ws-title" data-no-i18n>${e(n.title)}</h1><p class="muted">${parts([`${n.hours} hours`, `${plural(n.places || 1, "person", "people")} needed`, n.deadline ? `apply by ${date(n.deadline)}` : "no fixed deadline"])}</p></div>
    ${note}<div class="banner">${icon("check", 22, "#0f6f63")}<p>${next}</p></div>
    ${buttons ? `<div class="row" style="--gap:8px">${buttons}</div>` : ""}
    ${hoursSection}${engSection}${appsSection}${invSection}${about}
  </div>`;
}

function orgBanner(o) {
  if (o.status === "approved") return "";
  if (o.status === "pending") return `<div class="banner warn">${icon("clock", 22, "#7a4f0e")}<p><strong>Your organisation is awaiting review.</strong> We usually respond within two working days. You can write your needs now and send them for review; they go live once your organisation is approved.</p></div>`;
  if (o.status === "changes_requested") return `<div class="banner alert">${icon("alert", 22)}<p style="flex:1">We need a few more details. Check your notifications and update your organisation details.</p>${btn("Update details", "#org/details", "sm")}</div>`;
  return `<div class="banner alert">${icon("alert", 22)}<p>This organisation is ${o.status === "suspended" ? "suspended" : "not approved"}. Write to us if you think this is a mistake.</p></div>`;
}

// Send a draft to Handova for review.
export async function submitForReview(id) {
  await result(db.from("needs").update({ status: "pending" }).eq("id", id));
  toast("Sent to Handova. We’ll let you know when it’s live.");
  go(`#org/needs/${id}`);
}

// The working languages of approved professionals: the four site languages first, then any others they list.
const MAIN_LANGS = ["English", "Spanish", "French", "Portuguese"];
async function talentLanguages() {
  const rows = await result(db.from("profiles").select("languages").eq("published", true).eq("review_status", "approved")).catch(() => []);
  const main = new Set(MAIN_LANGS.map((l) => l.toLowerCase())), seen = new Map();
  for (const l of rows.flatMap((p) => p.languages || [])) if (l && !main.has(l.toLowerCase()) && !seen.has(l.toLowerCase())) seen.set(l.toLowerCase(), l);
  return [...MAIN_LANGS, ...[...seen.values()].sort((a, b) => a.localeCompare(b))];
}

function needForm(n, o, approved, langs) {
  n = n || {};
  return `<form class="form card" data-form="need" data-id="${e(n.id || "")}" data-was="${e(n.status || "")}" data-org="${e(o.id)}" novalidate><div class="form-grid">
    ${field("title", "Title", { value: n.title, required: true, full: true, attrs: 'maxlength="160" minlength="5" placeholder="e.g. Improve our community data tools"' })}
    ${field("description", "The challenge", { value: n.description, type: "textarea", required: true, full: true, attrs: 'maxlength="6000" minlength="20"', hint: "What is the situation, and why does it matter? At least 20 characters. Don’t include names of the people you support." })}
    ${field("output", "What should be delivered", { value: n.output, type: "textarea", required: true, full: true, attrs: 'maxlength="2000" minlength="5"', hint: "One clear output. Put each deliverable on its own line." })}
    ${skillPicker("skills", "Skills involved", n.skills || [], { hint: "Pick the skills this need calls for." })}
    ${languagePicker("languages", "Working languages", n.languages || [], { hint: "Support in any one of these is welcome. These are the languages our professionals work in.", options: langs })}
    ${dropdown("hours", "Estimated hours", [2, 4, 6, 8, 10, 12, 14, 16].map((h) => [String(h), `${h} hours`]), String(n.hours || 8), { required: true })}
    ${dropdown("location", "Time zone", TIMEZONES, n.location || "", { empty: "Any time zone" })}
    <input type="hidden" name="country" value="${e(o.country || n.country || "")}">
    ${field("deadline", "Apply by (optional)", { value: n.deadline, type: "date", attrs: `min="${today()}"` })}
    ${select("places", "People needed", [["1", "1 person"], ["2", "2 people"], ["3", "3 people"]], String(n.places || 1))}
    <input type="hidden" name="status" value="${e(n.status || "pending")}">
    <div class="checkbox-box full">${check("no_vulnerable_contact", "This need does not involve direct contact with children or adults at risk, and no access to their personal information. *", n.no_vulnerable_contact, true)}</div>
  </div>${needButtons(n)}</form>`;
}
// Drafts and new needs: save as a draft or send for review. Live needs: save changes (and reopen a closed one).
function needButtons(n) {
  const b = (label, st, cls = "") => `<button class="btn ${cls}" type="submit" data-set-status="${st}">${label}</button>`;
  let btns;
  if (!n.id || n.status === "draft") btns = b("Send for review", "pending") + b("Save as draft", "draft", "secondary");
  else if (n.status === "pending") btns = b("Save changes", "pending");
  else if (n.status === "closed") btns = b("Save changes", "closed") + (n.approved_at ? b("Open it again", "open", "secondary") : "");
  else btns = b("Save changes", "open");
  return `<p class="form-error" role="alert"></p><div class="row">${btns}</div>`;
}

export async function submitNeed(form) {
  await withForm(form, async (fd) => {
    // Check top to bottom, and show each problem right under its field.
    const bad = form.querySelector("input:invalid:not([name=no_vulnerable_contact]), textarea:invalid, select:invalid");
    if (bad) throw fieldError(bad, fieldProblem(bad));
    if (!val(fd, "languages")) throw fieldError(form.querySelector('[name="languages"]'), "Choose at least one working language.");
    if (!fd.has("no_vulnerable_contact")) throw fieldError(form.querySelector('[name="no_vulnerable_contact"]'), "Tick the safeguarding confirmation to continue. Needs on Handova never involve direct contact with children or adults at risk.");
    const row = { title: val(fd, "title"), description: val(fd, "description"), output: val(fd, "output"), skills: list(val(fd, "skills")), languages: languages(val(fd, "languages")), hours: Number(val(fd, "hours")), arrangement: "Remote", location: val(fd, "location"), country: val(fd, "country"), deadline: val(fd, "deadline") || null, places: Number(val(fd, "places") || 1), status: val(fd, "status"), no_vulnerable_contact: fd.has("no_vulnerable_contact") };
    if (form.dataset.id) await result(db.from("needs").update(row).eq("id", form.dataset.id));
    else form.dataset.id = (await result(db.from("needs").insert({ ...row, organisation_id: form.dataset.org }).select("id").single()))?.id || "";
    const was = form.dataset.was;
    toast(row.status === "pending" && was !== "pending" ? "Sent to Handova. We’ll let you know when it’s live." : row.status === "draft" ? "Draft saved." : row.status === "open" && was === "closed" ? "Your need is open again." : "Changes saved.");
    go(form.dataset.id ? `#org/needs/${form.dataset.id}` : "#org/needs");
  });
}

// ================= shared dialogs =================
export async function inviteDialog(userId) {
  const orgIds = state.memberships.filter((m) => m.organisation?.status === "approved").map((m) => m.organisation_id);
  const open = orgIds.length ? await result(db.from("needs").select("id,title,deadline").in("organisation_id", orgIds).eq("status", "open")) : [];
  if (!open.length) return openDialog("Open a need first", `<p>An invitation connects a professional to one specific need. Post or open a need, then come back.</p>${btn("Post a need", "#org/need")}`);
  openDialog("Invite to a need", `<form class="form" data-form="invite" data-id="${e(userId)}">${select("need_id", "Need", open.map((n) => [n.id, n.title]), "", { required: true })}${field("message", "Personal message", { type: "textarea", required: true, attrs: 'minlength="30" maxlength="4000" autofocus', hint: "Why their work fits, and what you need. At least 30 characters." })}${formEnd("Send invitation", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function introduceDialog(userId, name) {
  const open = await result(db.from("needs").select("id,title,organisation:organisations(name)").eq("status", "open").order("created_at", { ascending: false })).catch(() => []);
  if (!open.length) return openDialog("No open needs", "<p>There are no open needs to introduce this professional to yet.</p>");
  openDialog(`Introduce ${e(name || "this professional")}`, `<form class="form" data-form="introduce" data-id="${e(userId)}"><p class="muted">The professional receives an invitation marked “Introduced by Handova” and can accept or decline. The organisation is told. Nothing is shared until both sign the agreement.</p>${select("need_id", "Open need", open.map((n) => [n.id, `${n.title} · ${n.organisation?.name || ""}`]), "", { required: true })}${field("message", "Why this is a good match", { type: "textarea", required: true, attrs: 'minlength="30" maxlength="3900" autofocus', hint: "Shown to the professional and the organisation. At least 30 characters." })}${formEnd("Send introduction", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitIntroduce(form) {
  await withForm(form, async (fd) => {
    await result(db.rpc("admin_introduce", { p_need: val(fd, "need_id"), p_user: form.dataset.id, p_message: val(fd, "message") }));
    closeDialog();
    toast("Introduction sent.");
  });
}
export async function submitInvite(form) {
  await withForm(form, async (fd) => {
    await result(db.from("invitations").insert({ need_id: val(fd, "need_id"), user_id: form.dataset.id, message: val(fd, "message") }));
    closeDialog();
    toast("Invitation sent.");
  });
}

export function reportDialog(type, id) {
  if (!state.user) return go("#report");
  openDialog("Report a concern", `<form class="form" data-form="report" data-type="${e(type)}" data-id="${e(id || "")}"><p class="muted">Our safeguarding lead reviews every report. If someone is in immediate danger, contact local emergency services first.</p>${select("reason", "What is the concern?", [["safety", "Safety or safeguarding"], ["harassment", "Harassment or inappropriate behaviour"], ["misleading", "Misleading or false information"], ["privacy", "Privacy or data"], ["spam", "Spam"], ["other", "Something else"]])}${field("details", "What happened?", { type: "textarea", required: true, attrs: 'minlength="10" maxlength="4000" autofocus' })}${formEnd("Send report", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitReport(form) {
  await withForm(form, async (fd) => {
    await result(db.from("reports").insert({ target_type: form.dataset.type || "other", target_id: form.dataset.id || null, reason: val(fd, "reason"), details: val(fd, "details") }));
    closeDialog();
    toast("Thank you. Your report has been sent to our safeguarding lead.");
  });
}

export function decisionDialog(title, text, formName, id, fields = "", confirm = "Confirm", danger = false) {
  openDialog(title, `<form class="form" data-form="${formName}" data-id="${e(id)}"><p>${text}</p>${fields}${formEnd(confirm, `<button class="btn secondary" type="button" data-action="close">Cancel</button>`).replace('class="btn"', `class="btn${danger ? " danger" : ""}"`)}</form>`);
}

export function completeDialog(id) {
  decisionDialog("Mark this contribution complete", "Confirm what was delivered and write an endorsement. The professional chooses whether it appears on their impact CV. The rating is private to them.", "complete", id,
    `${field("deliverables", "What was delivered", { type: "textarea", required: true, attrs: 'minlength="10" maxlength="3000" autofocus' })}${field("endorsement", "Endorsement", { type: "textarea", required: true, attrs: 'minlength="20" maxlength="3000"', hint: "Specific and fair: what changed for your team?" })}${field("role", "Your role", { value: state.user?.user_metadata?.org_role || "", attrs: 'maxlength="120" placeholder="e.g. Director"' })}${select("rating", "Private rating (only the professional sees this)", [["", "Choose a rating"], ["5", "5: Excellent"], ["4", "4: Very good"], ["3", "3: Good"], ["2", "2: Needs improvement"], ["1", "1: Unsatisfactory"]], "", { required: true })}`, "Mark complete");
}
