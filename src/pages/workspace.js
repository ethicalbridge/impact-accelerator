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

  const changes = hours.filter((h) => h.status === "changes_requested");
  const engHours = (x) => hours.filter((h) => h.engagement_id === x.id && h.status === "approved").reduce((s, h) => s + Number(h.hours), 0);
  // Everything waiting for the professional, most urgent first.
  const todo = [
    ...toSign.map((x) => todoRow(`Sign your agreement with ${e(x.organisation?.name || "the organisation")}`, `${quoted(x.scope?.need_title || "")} · work and hours start once you both sign`, btn("Review and sign", `#agreement/${x.id}`, "sm"))),
    ...pendingInv.map((i) => `<div class="todo-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${e(i.need?.organisation?.name || "An organisation")} invited you to ${quoted(i.need?.title || "")}</strong><span class="small muted">${parts([`${i.need?.hours} hours`, "Remote", `sent ${date(i.created_at)}`])}</span>${i.message ? `<p class="small invite-msg" data-no-i18n>“${e(i.message)}”</p>` : ""}</div><div class="todo-actions"><button class="btn sm" type="button" data-action="invite-accept" data-id="${i.id}">Accept</button><button class="btn secondary sm" type="button" data-action="invite-decline" data-id="${i.id}">Decline</button>${btn("View need", `#need/${i.need_id}`, "secondary sm")}</div></div>`),
    ...changes.map((h) => { const x = engagements.find((y) => y.id === h.engagement_id); return todoRow(`The organisation asked you to correct a time entry`, `${quoted(x?.scope?.need_title || "")} · ${date(h.work_date)}${h.review_note ? ` · <span data-no-i18n>“${e(h.review_note)}”</span>` : ""}`, btn("Open agreement", `#agreement/${h.engagement_id}`, "sm")); }),
    ...active.filter((x) => !x.first_call_at).map((x) => todoRow(`Plan your first call with ${e(x.organisation?.name || "the organisation")}`, `${quoted(x.scope?.need_title || "")} · 30–45 minutes to meet and agree how you’ll work`, `${btn("Messages", `#conversation-for/${x.need_id}/${uid}`, "sm")}<button class="btn secondary sm" type="button" data-action="first-call" data-id="${x.id}">Record what we agreed</button>`)),
    ...active.map((x) => todoRow(`Log your time on ${quoted(x.scope?.need_title || "")}`, `${e(x.organisation?.name || "")} · ${engHours(x)} of ${x.scope?.hours} hours approved`, `${btn("Log time", `#agreement/${x.id}`, "sm")}${btn("Messages", `#conversation-for/${x.need_id}/${uid}`, "secondary sm")}`)),
  ];
  const APP = { pending: ["Waiting for the organisation", "ochre"], accepted: ["Accepted", ""], declined: ["Not selected", "grey"], withdrawn: ["Withdrawn", "grey"] };
  const appRows = apps.map((a) => `<div class="todo-row"><div class="stack" style="--gap:2px;min-width:0"><a href="#need/${a.need_id}" style="font-weight:700" data-no-i18n>${e(a.need?.title || "Need")}</a><span class="small muted">${parts([e(a.need?.organisation?.name || ""), `applied ${date(a.created_at)}`])}</span></div><div class="todo-actions">${pill(...(APP[a.status] || [a.status, "grey"]))}${a.status === "pending" ? `${btn("Messages", `#conversation-for/${a.need_id}/${uid}`, "secondary sm")}<button class="btn secondary sm" type="button" data-action="withdraw" data-id="${a.id}">Withdraw</button>` : ""}</div></div>`);
  const cvRows = completed.map((x) => `<div class="todo-row" style="align-items:flex-start"><div class="stack" style="--gap:4px;min-width:0"><strong data-no-i18n>${e(x.scope?.need_title)}</strong><span class="small muted">${parts([e(x.organisation?.name || ""), `completed ${date(x.completed_at)}`])}</span>${x.endorsement ? `<p class="small" data-no-i18n>“${e(x.endorsement)}”</p>` : ""}<span class="small muted">Private rating from the organisation: ${x.rating ? `${x.rating} out of 5` : "none"}. Only you can see this.</span></div><label class="check"><input type="checkbox" data-action="toggle-public" data-id="${x.id}" ${x.public ? "checked" : ""}><span>Show on my impact CV</span></label></div>`);
  const first = e(p.name.split(" ")[0]);

  const html = `<div class="stack" style="--gap:22px">
    <div class="row between ws-head" style="align-items:flex-end"><div class="stack" style="--gap:12px">${eyebrow("Your workspace")}<h1 class="ws-title">Hello, ${first}.</h1></div>${btn(`Find a need ${icon("arrow", 16)}`, "#needs", "sm")}</div>
    ${p.id_status === "approved" ? "" : identityCard(p)}
    ${reviewBanner(p)}
    <div class="pro-grid">
      <div class="stack" style="--gap:22px;min-width:0">
        <section class="card stack" style="--gap:6px"><h2 class="card-title">Waiting for you</h2>${todo.length ? `<div>${todo.join("")}</div>` : `<div class="quiet-empty"><p><strong>Nothing needs you right now.</strong> When an organisation invites you, or you have an agreement to sign or time to log, it appears here.</p>${btn("Browse open needs", "#needs", "secondary sm")}</div>`}</section>
        <section class="card stack" style="--gap:6px"><div class="row between"><h2 class="card-title">Your applications</h2>${apps.length ? `<a href="#needs" style="font-weight:700">Find more needs</a>` : ""}</div>${apps.length ? `<div>${appRows.join("")}</div>` : `<div class="quiet-empty"><p>You haven’t applied to a need yet. Pick one that fits your skills and send a short message about how you would help.</p>${btn("Explore needs", "#needs", "secondary sm")}</div>`}</section>
        ${cvRows.length ? `<section class="card stack" style="--gap:6px"><h2 class="card-title">Completed contributions</h2><p class="small muted">You choose which ones appear on your public impact CV.</p><div>${cvRows.join("")}</div></section>` : ""}
      </div>
      <aside class="stack" style="--gap:18px">
        <section class="card impact-card">
          <h2 class="card-title">Your impact</h2>
          <dl class="impact-stats">
            <div><dt>Hours reviewed</dt><dd>${approvedHours}</dd></div>
            <div><dt>Contributions completed</dt><dd>${completed.length}</dd></div>
            <div><dt>Applications waiting</dt><dd>${apps.filter((a) => a.status === "pending").length}</dd></div>
            <div><dt>Available each month</dt><dd>${p.hours_available} h</dd></div>
          </dl>
          <p class="small muted">${completed.length ? "Endorsed work you choose to show appears on your public impact CV." : "Your first completed and endorsed contribution will appear on your public impact CV."}</p>
          <div class="row" style="--gap:8px">${btn("View my impact CV", `#profile/${uid}`, "secondary sm")}${btn("Edit profile", "#workspace/profile", "secondary sm")}</div>
        </section>
      </aside>
    </div>
    ${saved.filter((s) => s.need).length ? `<section class="stack"><h2 class="card-title">Saved needs</h2><div class="grid">${saved.filter((s) => s.need).map((s) => needCard(s.need)).join("")}</div></section>` : ""}
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
  const items = [["home", "Overview", "#workspace", badge || ""], ["user", `<span class="nav-long">Edit profile</span><span class="nav-short">Profile</span>`, "#workspace/profile"], ["shield", `<span class="nav-long">My impact CV</span><span class="nav-short">Impact CV</span>`, `#profile/${state.user.id}`]];
  if (state.memberships.length) items.push(["grid", `<span class="nav-long">Organisation workspace</span><span class="nav-short">Organisation</span>`, "#org"]);
  return { title, html: `<div class="workspace org-ws pro-ws" style="--tabs:${items.length}">${sideNav(items, active)}<div class="ws-main">${main}</div></div>` };
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
// A need uses one of the 3 places while it waits for review, is open, or someone is working on it.
const placesInUse = (needs, engs) => needs.filter((n) => n.status === "pending" || n.status === "open" || needStage(n, engs) === "progress").length;
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
  const items = [["home", "To do", "#org", todoCount || ""], ["doc", "Needs", "#org/needs"], ["people", `<span class="nav-long">Find talent</span><span class="nav-short">Talent</span>`, "#talent?from=org"], ["settings", `<span class="nav-long">Organisation profile</span><span class="nav-short">Profile</span>`, "#org/details"]];
  const active = sub === "details" ? "#org/details" : sub === "needs" || sub === "need" ? "#org/needs" : "#org";
  const head = (title, action = "") => `<div class="row between ws-head" style="align-items:flex-end"><div class="stack" style="--gap:18px"><div class="row" style="--gap:10px">${o.logo_url ? `<img class="ws-logo" src="${e(o.logo_url)}" width="40" height="40" alt="">` : ""}${eyebrow(e(o.name))}${ORG_STATUS[o.status] ? pill(...ORG_STATUS[o.status]) : ""}</div><h1 class="ws-title">${title}</h1></div>${action}</div>`;
  const switcher = state.memberships.length > 1 ? `<label class="field" style="max-width:360px">Organisation<select data-action="switch-org">${state.memberships.map((x) => `<option value="${x.organisation_id}" ${x.organisation_id === o.id ? "selected" : ""}>${e(x.organisation.name)}</option>`).join("")}</select></label>` : "";
  const shell = (main) => ({ title: `${o.name} · workspace`, html: `<div class="workspace org-ws">${sideNav(items, active)}<div class="ws-main">${main}</div></div>` });
  const banner = orgBanner(o);
  const postBtn = btn(`${icon("plus", 16)} Post a need`, "#org/need", "sm");

  if (sub === "details") return shell(`<div class="stack" style="--gap:20px">${head("Organisation profile")}<p class="lead">How professionals see your organisation, on your public page and on every need you post.${approved ? ` <a href="#organisations/${e(o.id)}" style="font-weight:700">View your public page</a>` : ""}</p>${banner}${orgForm(o)}</div>`);

  if (sub === "need") {
    const n = id ? await result(db.from("needs").select("*").eq("id", id).maybeSingle()) : null;
    // A need Handova has approved can't be edited: what people applied to must stay the same.
    if (n && (n.status === "open" || n.status === "closed")) return { redirect: `#org/needs/${n.id}` };
    const note = n?.review_note && n.status === "draft" ? `<div class="banner alert">${icon("alert", 22)}<p><strong>Handova asked for changes:</strong> <span data-no-i18n>${quoted(n.review_note)}</span> Update the need and send it again.</p></div>` : "";
    const info = n && (n.status === "open" || n.status === "closed") ? "" : `<div class="banner">${icon("check", 22, "#0f6f63")}<p>${approved ? "Handova checks every need before it goes live. We usually reply within two working days." : "You can write your need and send it for review now. It goes live once Handova has approved your organisation and the need."}</p></div>`;
    return shell(`<div class="stack" style="--gap:20px">${back(n ? "Back to the need" : "All needs", n ? `#org/needs/${n.id}` : "#org/needs")}${head(n ? "Edit need" : "Post a need")}${note}${info}${needForm(n, o, approved, await talentLanguages())}</div>`);
  }

  if (sub === "needs" && id) return shell(await needPage(o, approved, data, id, head));

  if (sub === "needs") {
    const { needs, apps, engs, hours } = data;
    const openCount = needs.filter((n) => n.status === "open").length;
    const progressCount = needs.filter((n) => needStage(n, engs) === "progress").length;
    const inUse = placesInUse(needs, engs);
    const groups = STAGES.map(([key, label]) => {
      const list = needs.filter((n) => { const st = needStage(n, engs); return key === "past" ? st === "done" || st === "closed" : st === key; });
      if (!list.length) return "";
      const rows = list.map((n) => { const st = needStage(n, engs); return needRow(n, st, apps, engs, hours, approved); }).join("");
      return key === "past" ? `<details class="need-group"><summary><h2>${label}</h2><span class="muted">(${list.length})</span></summary>${rows}</details>` : `<section class="need-group"><h2>${label}</h2>${rows}</section>`;
    }).join("");
    const count = (st) => needs.filter((n) => n.status === st).length;
    const tile = (num, label) => `<div class="stat"><strong>${num}</strong><span>${label}</span></div>`;
    const stats = `<div class="need-stats">${tile(`${Math.max(0, 3 - inUse)} of 3`, approved ? "places available" : "places available once your organisation is approved")}${tile(count("draft"), "drafts")}${tile(count("pending"), "waiting for Handova’s review")}${tile(openCount, "open for applications")}${tile(progressCount, "in progress")}</div>`;
    const line = approved ? "Up to 3 needs can be waiting for review, open or in progress at a time. When one is finished or closed, its place becomes available again. Drafts don’t use a place." : "Your needs can go live once Handova has approved your organisation. You can write them and send them for review now.";
    return shell(`<div class="stack" style="--gap:22px">${head("Needs", postBtn)}${switcher}${stats}<p class="muted">${line}</p>${needs.length ? groups : `<section class="card">${empty("Post your first need", "A need is one piece of work, up to 16 hours, that a volunteer professional can help with. Describe one clear output and the skills involved.", btn("Post a need", "#org/need", "sm"))}</section>`}</div>`);
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
  const working = mine.filter((x) => x.status === "active" || x.status === "awaiting_signatures");
  const pendingApps = apps.filter((a) => a.need_id === n.id && a.status === "pending");
  const decided = apps.filter((a) => a.need_id === n.id && a.status !== "pending");
  const myInvites = invites.filter((i) => i.need_id === n.id);
  const first = (x) => e((x?.person?.name || x?.scope?.talent || "the professional").split(" ")[0]);
  const waitingHours = (x) => hours.filter((h) => h.engagement_id === x.id && h.status === "pending");
  const sumH = (list) => list.reduce((s, h) => s + Number(h.hours || 0), 0);
  const signedOn = (x) => (x.org_signed_at && x.talent_signed_at ? (x.org_signed_at > x.talent_signed_at ? x.org_signed_at : x.talent_signed_at) : null);
  const box = (kind, iconName, title, text, actions = "", extra = "") => `<section class="next-box ${kind}"><div class="next-head">${icon(iconName, 22)}<div class="stack" style="--gap:4px"><h2>${title}</h2>${text ? `<p>${text}</p>` : ""}</div></div>${extra}${actions ? `<div class="next-actions">${actions}</div>` : ""}</section>`;
  const msgBtn = (x) => btn("Send a message", `#conversation-for/${x.need_id}/${x.user_id}`, "secondary sm");

  // ---- Pill and the line under the title ----
  const awaitingOnly = st === "progress" && !working.some((x) => x.status === "active");
  const pillHtml = awaitingOnly ? pill("Waiting for signatures", "ochre") : stagePill(n, st);
  let meta;
  if (st === "progress") meta = working.map((x) => parts([`With ${first(x)}`, `${x.scope?.hours || n.hours} hours agreed`, signedOn(x) ? `agreement signed ${date(signedOn(x))}` : "agreement not signed yet"])).join("<br>");
  else if (st === "done") meta = parts([`With ${mine.filter((x) => x.status === "completed").map(first).join(", ")}`, `finished ${date(mine.find((x) => x.status === "completed")?.completed_at)}`]);
  else meta = parts([`${n.hours} hours`, `${plural(n.places || 1, "person", "people")} needed`, n.deadline ? `apply by ${date(n.deadline)}` : "no fixed deadline"]);

  // ---- Next step: the one thing to do now ----
  const appRow = (a) => `<div class="todo-row" style="align-items:flex-start"><div class="row" style="align-items:flex-start;flex-wrap:nowrap;min-width:0">${avatar(a.person?.name || "?", 44)}<div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${a.user_id}" style="font-weight:700">${e(a.person?.name || "Professional")}</a><span class="small muted">${[e(a.person?.headline || ""), e(a.person?.country || ""), (a.person?.languages || []).length ? `Works in ${e(a.person.languages.join(", "))}` : ""].filter(Boolean).join(" · ")}</span><p class="prose clamp-4" style="font-size:.97rem" data-no-i18n>${e(a.message)}</p></div></div><div class="todo-actions"><button class="btn sm" type="button" data-action="app-accept" data-id="${a.id}">Accept</button><button class="btn secondary sm" type="button" data-action="app-decline" data-id="${a.id}">Decline</button>${btn("Message", `#conversation-for/${a.need_id}/${a.user_id}`, "secondary sm")}</div></div>`;
  const boxes = [];
  if (st === "draft") {
    if (n.review_note) boxes.push(box("alert", "alert", "Handova asked for changes", `<span data-no-i18n>${quoted(n.review_note)}</span> <span>Update the need and send it again.</span>`, btn("Update need", `#org/need/${n.id}`, "sm")));
    else boxes.push(box("", "pen", "Next step: send it for review", "Only your organisation can see this need. When it is ready, send it to Handova for review.", (placesInUse(needs, engs) >= 3 ? `<span class="small muted">All 3 places are in use. You can send this for review when another need is finished or closed.</span>` : `<button class="btn sm" type="button" data-action="need-submit" data-id="${n.id}">Send for review</button>`) + btn("Edit", `#org/need/${n.id}`, "secondary sm")));
  } else if (st === "pending") {
    boxes.push(box("wait", "clock", "Handova is checking this need", approved ? "We usually reply within two working days and will notify you." : "It can go live once your organisation is approved.", btn("Edit", `#org/need/${n.id}`, "secondary sm")));
  } else if (st === "open") {
    if (pendingApps.length) boxes.push(box("", "people", pendingApps.length === 1 ? "Next step: reply to 1 applicant" : `Next step: reply to ${pendingApps.length} applicants`, "Read their messages, then accept or decline. Everyone gets an answer.", "", `<div class="next-list">${pendingApps.map(appRow).join("")}</div>`));
    else boxes.push(box("wait", "clock", "Waiting for applications", "Professionals can apply now. You can also invite someone whose profile fits.", btn("Invite a professional", "#talent?from=org", "sm")));
  }
  if (st === "progress" || (st === "open" && working.length)) {
    for (const x of working) {
      const wh = waitingHours(x);
      if (x.status === "awaiting_signatures" && !x.org_signed_at) boxes.push(box("", "pen", "Next step: sign the agreement", `<span>Work and hours start when you and ${first(x)} have both signed.</span> <span>${x.talent_signed_at ? `${first(x)} has already signed.` : `${first(x)} hasn’t signed yet either.`}</span>`, btn("Review and sign", `#agreement/${x.id}`, "sm")));
      else if (x.status === "awaiting_signatures") boxes.push(box("wait", "clock", `Waiting for ${first(x)} to sign`, `You signed on ${date(x.org_signed_at)}. We’ll notify you when ${first(x)} signs. Nothing to do for now.`, msgBtn(x)));
      else if (wh.length) { const due = wh.map((h) => addDays(h.created_at, 14)).sort()[0]; boxes.push(box("", "clock", `Next step: review ${sumH(wh)} ${sumH(wh) === 1 ? "hour" : "hours"} from ${first(x)}`, `Please review by ${date(due)}.`, "", `<div class="next-list">${wh.map((h) => hoursRow(h, x, n)).join("")}</div>`)); }
      else if (!x.first_call_at) boxes.push(box("", "chat", `Next step: meet ${first(x)}`, `<span>Arrange a short first call (30–45 minutes) to get to know each other and plan the work. We’ve put a suggested agenda in your Messages.</span> <span class="small muted">Already agreed everything in writing? You can record that instead.</span>`, `${btn("Plan the call in Messages", `#conversation-for/${x.need_id}/${x.user_id}`, "sm")}<button class="btn secondary sm" type="button" data-action="first-call" data-id="${x.id}">Record what we agreed</button>`));
      else boxes.push(box("ok", "check", "Nothing to do right now", `${first(x)} logs time as they work. We’ll notify you when there are hours to review; please review them within 14 days.`, msgBtn(x)));
    }
  }
  if (st === "done") {
    for (const x of mine.filter((y) => y.status === "completed")) {
      if (x.followup_due && x.followup_due <= today() && !x.followup_answered_at) boxes.push(box("", "check", `Six months on: are you still using what ${first(x)} delivered?`, "Your answer helps show what lasts. It is not shown publicly.", `<button class="btn sm" type="button" data-action="followup" data-id="${x.id}">Answer</button>`));
      else boxes.push(box("ok", "check", `Finished on ${date(x.completed_at)}. Thank you.`, x.followup_answered_at ? `Six-month check answered: ${x.followup_in_use ? "still in use" : "no longer in use"}.` : x.followup_due ? `We’ll ask you on ${date(x.followup_due)} whether the work is still in use.` : ""));
    }
  }
  if (st === "closed") boxes.push(box("wait", "clock", mine.some((x) => x.status === "ended") ? `The contribution with ${first(mine.find((x) => x.status === "ended"))} ended early` : "Applications stopped. No one was matched.", "Its place is free again. You can post a new need whenever you are ready.", btn("Post a need", "#org/need", "secondary sm")));

  // ---- One card per person doing the work ----
  const step = (done, title, sub) => `<li class="${done ? "done" : ""}">${icon(done ? "check" : "clock", 18)}<span><strong>${title}</strong><span class="small muted">${sub}</span></span></li>`;
  const workCard = (x) => {
    const appr = approvedHours(hours, x.id), wh = sumH(waitingHours(x)), total = Number(x.scope?.hours || n.hours) || 1;
    const signed = !!(x.org_signed_at && x.talent_signed_at);
    const sigSub = signed ? date(signedOn(x)) : !x.org_signed_at ? "Waiting for your signature" : `Waiting for ${first(x)}’s signature`;
    const hoursSub = !signed ? "Starts when you have both signed" : `${appr} of ${total} hours approved${wh ? ` · ${wh} waiting for your review` : ""}`;
    const finishSub = x.status === "completed" ? `Finished ${date(x.completed_at)}` : x.status === "ended" ? "Ended early" : "When everything is delivered";
    const bar = signed ? `<div class="hours-bar" role="img" aria-label="${appr} of ${total} hours approved"><span style="width:${Math.min(100, Math.round((appr / total) * 100))}%"></span></div>` : "";
    const live = x.status === "active" || x.status === "awaiting_signatures";
    const finish = x.status === "active" ? `<div class="finish-block"><strong>Finished?</strong><p class="small">When ${first(x)} has delivered everything, confirm what was delivered and write a short endorsement. This closes the contribution and the conversation. Your rating is only seen by ${first(x)}.</p>${wh ? `<p class="small" style="font-weight:600">Review the ${wh} waiting ${wh === 1 ? "hour" : "hours"} first.</p>` : `<button class="btn sm" type="button" data-action="complete" data-id="${x.id}">Mark complete and endorse</button>`}</div>` : "";
    const endorsement = x.status === "completed" && x.endorsement ? `<blockquote class="small" data-no-i18n>“${e(x.endorsement.slice(0, 400))}${x.endorsement.length > 400 ? "…" : ""}”</blockquote>` : "";
    return `<section class="card work-card"><div class="row" style="--gap:12px;flex-wrap:nowrap">${avatar(x.person?.name || x.scope?.talent || "?", 48)}<div class="stack" style="--gap:2px;min-width:0"><span class="small muted">Your work with</span><a href="#profile/${x.user_id}" class="work-name">${personName(x)}</a></div></div>
      <ol class="work-steps">${step(signed, "Agreement signed", sigSub)}${step(!!x.first_call_at || x.status === "completed", "First call", x.first_call_at ? `${x.first_call_written ? "Agreed in writing" : "Held"} ${date(x.first_call_at)}` : signed ? "Not recorded yet" : "After you have both signed")}${step(x.status === "completed" || (signed && appr >= total), "Work and hours", hoursSub)}${step(x.status === "completed", "Finish and endorse", finishSub)}</ol>${bar}${endorsement}
      <div class="row" style="--gap:8px">${live ? btn("Messages", `#conversation-for/${x.need_id}/${x.user_id}`, "secondary sm") : ""}${btn("Agreement and time log", `#agreement/${x.id}`, "secondary sm")}</div>
      ${finish}
      ${live ? `<p class="small muted work-foot">Problem with the work? Talk to ${first(x)} first. If it can’t go ahead: <button class="link-btn danger-link" type="button" data-action="end-engagement" data-id="${x.id}">End this contribution</button> · Something unsafe? <button class="link-btn" type="button" data-action="report" data-type="need" data-id="${n.id}">Report a concern</button></p>` : ""}
    </section>`;
  };
  const cards = (st === "progress" || st === "open" ? working : st === "done" ? mine.filter((x) => x.status === "completed") : []).map(workCard).join("");

  // ---- Folded background ----
  const APP_DONE = { accepted: ["Accepted", ""], declined: ["Not selected", "grey"], withdrawn: ["Withdrew", "grey"] };
  const INV = { pending: ["Awaiting reply", "ochre"], accepted: ["Accepted", ""], declined: ["Declined by the professional", "grey"] };
  const history = [...decided.map((a) => `<div class="list-row"><span><a href="#profile/${a.user_id}" style="font-weight:700">${e(a.person?.name || "Professional")}</a> <span class="small muted">· applied ${date(a.created_at)}</span></span>${pill(...(APP_DONE[a.status] || [a.status, "grey"]))}</div>`),
    ...myInvites.map((i) => `<div class="list-row"><span><strong>${e(i.person?.name || "Professional")}</strong> <span class="small muted">· invited ${date(i.created_at)}</span></span>${pill(...(INV[i.status] || [i.status, "grey"]))}</div>`)];
  const historyFold = history.length && st !== "draft" && st !== "pending" ? `<details class="card fold-card"><summary><h2 class="card-title">Applications and invitations (${history.length})</h2></summary><div style="margin-top:8px">${history.join("")}</div></details>` : "";
  const deliverables = (n.output || "").split(/\n|;/).map((s) => s.trim()).filter(Boolean);
  const publicLink = n.status === "open" || n.status === "closed" ? `<a href="#need/${n.id}" style="font-weight:700">See the public page</a>` : "";
  const about = `<details class="card fold-card" ${st === "draft" || st === "pending" ? "open" : ""}><summary><h2 class="card-title">About this need</h2></summary><div class="stack" style="--gap:14px;margin-top:12px"><div><strong>The challenge</strong><p class="prose" data-no-i18n>${e(n.description)}</p></div><div><strong>What should be delivered</strong><ul class="checks">${deliverables.map((d) => `<li>${icon("check", 20, "#0f6f63", 2.2)}<span data-no-i18n>${e(d)}</span></li>`).join("")}</ul></div>${(n.skills || []).length ? `<div class="row" style="--gap:6px"><strong>Skills</strong>${tags(n.skills)}</div>` : ""}<p><strong>Working languages:</strong> ${e((n.languages || []).join(", "))}</p>${publicLink}</div></details>`;
  const changeFold = st === "open" ? `<details class="card fold-card"><summary><h2 class="card-title">Change or stop this need</h2></summary><div class="stack" style="--gap:10px;margin-top:10px"><p class="small muted">A live need can’t be edited. To change it, stop applications and send a corrected copy for review.</p><div class="row" style="--gap:8px"><button class="btn secondary sm" type="button" data-action="need-revise" data-id="${n.id}">Change this need</button><button class="btn secondary sm" type="button" data-action="close-need" data-id="${n.id}">Stop applications</button></div></div></details>` : "";

  return `<div class="stack" style="--gap:22px">${back("All needs", "#org/needs")}
    <div class="stack" style="--gap:14px"><div class="row" style="--gap:10px">${eyebrow(e(o.name))}${pillHtml}</div><h1 class="ws-title" data-no-i18n>${e(n.title)}</h1><p class="muted">${meta}</p></div>
    ${boxes.join("")}
    ${cards}
    ${about}${changeFold}${historyFold}
  </div>`;
}

function orgBanner(o) {
  if (o.status === "approved") return "";
  if (o.status === "pending") return `<div class="banner warn">${icon("clock", 22, "#7a4f0e")}<p><strong>Your organisation is awaiting review.</strong> We usually respond within two working days. You can write your needs now and send them for review; they go live once your organisation is approved.</p></div>`;
  if (o.status === "changes_requested") return `<div class="banner alert">${icon("alert", 22)}<p style="flex:1">We need a few more details. Check your notifications and update your organisation details.</p>${btn("Update details", "#org/details", "sm")}</div>`;
  return `<div class="banner alert">${icon("alert", 22)}<p>This organisation is ${o.status === "suspended" ? "suspended" : "not approved"}. Write to us if you think this is a mistake.</p></div>`;
}

// Live needs can't be edited. To change one: stop applications on it and copy it into a new draft,
// which Handova reviews like any other need.
export function reviseDialog(id) {
  decisionDialog("Change this need?", "A need that is live can’t be edited, so what professionals applied to stays the same. We’ll stop applications on this need (anyone waiting is told) and copy it into a new draft. Edit the draft and send it for review; it goes live once Handova approves it.", "need-revise", id, "", "Stop applications and make a copy");
}
export async function submitRevise(form) {
  await withForm(form, async () => {
    const n = await result(db.from("needs").select("*").eq("id", form.dataset.id).single());
    const copy = { organisation_id: n.organisation_id, title: n.title, description: n.description, output: n.output, skills: n.skills, languages: n.languages, hours: n.hours, arrangement: n.arrangement, location: n.location, country: n.country, deadline: n.deadline && n.deadline >= today() ? n.deadline : null, places: n.places, status: "draft", no_vulnerable_contact: true };
    const made = await result(db.from("needs").insert(copy).select("id").single());
    if (n.status === "open") await result(db.from("needs").update({ status: "closed" }).eq("id", n.id));
    closeDialog();
    toast("Applications stopped. Edit your copy and send it for review.");
    go(`#org/need/${made.id}`);
  });
}

// After the first call (or agreeing in writing): post a summary to Messages so both have the same record.
export function firstCallDialog(id) {
  const keep = [["Handova Messages only", "Handova Messages only"], ["Messages, plus email", "Messages, plus email"], ["Messages, plus another app", "Messages, plus another app"]];
  openDialog("Record what we agreed", `<form class="form" data-form="first-call" data-id="${e(id)}" novalidate>
    <p class="muted">This posts a short summary to your Messages, so you both have the same written record. The other person can reply to confirm or correct it.</p>
    ${field("call_date", "Date of your first call", { type: "date", value: today(), attrs: `max="${today()}"` })}
    ${check("written", "We agreed everything in writing, without a call")}
    ${field("delivery", "Delivery date", { type: "date", required: true })}
    ${field("contact", "Contact person at the organisation", { required: true, attrs: 'maxlength="120"', hint: "Name and role only." })}
    ${field("review", "How drafts will be reviewed", { type: "textarea", required: true, attrs: 'maxlength="600"' })}
    ${field("out", "Out of scope", { type: "textarea", attrs: 'maxlength="600"', hint: "What this contribution will not cover. Optional." })}
    ${select("keep", "How you’ll keep in touch", keep, "Handova Messages only")}
    ${field("other", "Anything else", { type: "textarea", attrs: 'maxlength="800"', hint: "Optional." })}
    <p class="small muted">Sharing phone numbers or personal emails is optional, and either of you can say no. Write decisions and changes in Messages.</p>
    ${formEnd("Post summary to Messages", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitFirstCall(form) {
  await withForm(form, async (fd) => {
    const bad = form.querySelector("input:invalid, textarea:invalid, select:invalid");
    if (bad) throw fieldError(bad, fieldProblem(bad));
    const written = fd.has("written");
    const lines = [written ? "Summary of what we agreed in writing" : `Summary of our first call (${val(fd, "call_date") || today()})`, "",
      `Delivery date: ${val(fd, "delivery")}`, `Contact person: ${val(fd, "contact")}`, `How drafts will be reviewed: ${val(fd, "review")}`,
      val(fd, "out") ? `Out of scope: ${val(fd, "out")}` : "", `How we’ll keep in touch: ${val(fd, "keep")}`, val(fd, "other") ? `Anything else: ${val(fd, "other")}` : "",
      "", "Please reply to confirm or correct this summary."].filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== ""));
    await result(db.rpc("record_first_call", { p_id: form.dataset.id, p_date: written ? null : val(fd, "call_date") || today(), p_written: written, p_summary: lines.join("\n") }));
    closeDialog();
    toast("Summary posted to Messages.");
    go(location.hash);
  });
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
  else btns = b("Save changes", n.status);
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
