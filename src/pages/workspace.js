import { db, state, result, e, openDialog, closeDialog, toast, go, withForm, invalidMessage, fieldError, fieldErrors, fieldProblem, val, loadSession } from "../core.js";
import { icon, avatar, eyebrow, empty, btn, back, status, pill, field, select, check, formEnd, needCard, tags, languagePicker, skillPicker, dropdown, countrySelect, TIMEZONES } from "../ui.js";
import { profileForm, orgForm, identityCard } from "./account.js";
import { list, languages, date, plural, today, SKILL_GROUPS } from "../utils.js";
import { getLang, t, tf } from "../i18n.js";
import { QUESTIONS, SURVEY_VERSION, questionHtml, readAnswers, wireExclusive, STAFF_SIZES, CAREER_STAGES } from "../survey.js";

const sideNav = (items, active) => `<nav class="side-nav" aria-label="Workspace">${items.map(([ic, label, href, badge]) => `<a href="${href}" ${href === active ? 'aria-current="page"' : ""}>${icon(ic, 20)}<span>${label}</span>${badge ? `<span class="badge"><span class="visually-hidden">Waiting: </span>${badge}</span>` : ""}</a>`).join("")}</nav>`;
const card = (title, inner, extra = "") => `<section class="card stack" style="--gap:6px"><div class="row between" style="margin-bottom:8px"><h2 style="font-size:1.7rem">${title}</h2>${extra}</div>${inner}</section>`;
const listRows = (rows, fallback) => (rows.length ? `<div>${rows.join("")}</div>` : fallback);
const row = (left, right) => `<div class="list-row"><div class="stack" style="--gap:4px;min-width:0">${left}</div><div class="row" style="--gap:8px">${right}</div></div>`;

// ================= Professional workspace =================
export async function workspace(sub) {
  if (!state.user) return { redirect: "#signin?next=%23workspace" };
  if (!state.profile) return { redirect: state.memberships.length ? "#org" : "#onboarding" };
  const p = state.profile, uid = state.user.id;
  const priv = await result(db.from("user_private").select("career_stage,research_contact").eq("user_id", uid).maybeSingle()).catch(() => null);
  if (sub === "profile") {
    return wsShell("Edit profile", `<div class="stack" style="--gap:20px">${back("Back to workspace", "#workspace")}${eyebrow("Your profile")}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">Edit your profile</h1>${reviewBanner(p)}${profileForm({ ...p, career_stage: priv?.career_stage || "" })}</div>`, "#workspace/profile");
  }
  const [apps, invites, engagements, saved] = await Promise.all([
    result(db.from("applications").select("*, need:needs(id,title,organisation:organisations(name))").eq("user_id", uid).order("created_at", { ascending: false })),
    result(db.from("invitations").select("*, need:needs(id,title,hours,arrangement,organisation:organisations(name,country))").eq("user_id", uid).order("created_at", { ascending: false })),
    result(db.from("engagements").select("*, organisation:organisations(name)").eq("user_id", uid).order("created_at", { ascending: false })),
    result(db.from("saved_needs").select("need:needs(*, organisation:organisations(name,city,country))").eq("user_id", uid)),
  ]);
  const engIds = engagements.map((x) => x.id);
  const hours = engIds.length ? await result(db.from("hours").select("*").in("engagement_id", engIds).order("work_date", { ascending: false })) : [];
  const surveys = (await result(db.rpc("survey_pending")).catch(() => [])).filter((x) => x.kind === "professional");
  const toSign = engagements.filter((x) => x.status === "awaiting_signatures" && !x.talent_signed_at);
  const active = engagements.filter((x) => x.status === "active");
  const completed = engagements.filter((x) => x.status === "completed");
  const approvedHours = hours.filter((h) => h.status === "approved").reduce((s, h) => s + Number(h.hours), 0);
  const pendingInv = invites.filter((i) => i.status === "pending");

  const changes = hours.filter((h) => h.status === "changes_requested" && active.some((x) => x.id === h.engagement_id));
  const engHours = (x) => hours.filter((h) => h.engagement_id === x.id && h.status === "approved").reduce((s, h) => s + Number(h.hours), 0);
  // Everything waiting for the professional, most urgent first.
  const fresh = completed.filter((x) => !x.public && x.completed_at && Date.now() - Date.parse(x.completed_at) < 21 * 864e5 && !(p.cv_hidden || []).includes(x.id));
  const todo = [
    ...fresh.map((x) => todoRow(`${e(x.organisation?.name || "The organisation")} has finished and endorsed your work`, `${quoted(x.scope?.need_title || "")} · <span>read it and choose whether it appears on your impact CV</span>`, `<button class="btn sm" type="button" data-action="goto-focus" data-target="done-${x.id}">Read it</button>`)),
    ...toSign.map((x) => todoRow(`Sign your agreement with ${e(x.organisation?.name || "the organisation")}`, `${quoted(x.scope?.need_title || "")} · work and hours start once you both sign`, btn("Review and sign", `#agreement/${x.id}`, "sm"))),
    ...pendingInv.map((i) => { const intro = /^\[Introduced by Handova\]\s*/.test(i.message || ""), msg = (i.message || "").replace(/^\[Introduced by Handova\]\s*/, ""); return `<div class="todo-row"><div class="stack" style="--gap:4px;min-width:0"><strong>${intro ? `Handova introduced you to ${quoted(i.need?.title || "")} from ${e(i.need?.organisation?.name || "an organisation")}` : `${e(i.need?.organisation?.name || "An organisation")} invited you to ${quoted(i.need?.title || "")}`}</strong><span class="small muted">${parts([`${i.need?.hours} hours`, "Remote", `sent ${date(i.created_at)}`])}</span>${msg ? `<p class="small invite-msg" data-no-i18n>“${e(msg)}”</p>` : ""}</div><div class="todo-actions"><button class="btn sm" type="button" data-action="invite-accept" data-id="${i.id}">Accept</button><button class="btn secondary sm" type="button" data-action="invite-decline" data-id="${i.id}">Decline</button>${btn("View need", `#need/${i.need_id}`, "secondary sm")}</div></div>`; }),
    ...changes.map((h) => { const x = engagements.find((y) => y.id === h.engagement_id); return todoRow(`The organisation asked you to correct a time entry`, `${quoted(x?.scope?.need_title || "")} · ${date(h.work_date)}${h.review_note ? ` · <span data-no-i18n>“${e(h.review_note)}”</span>` : ""}`, btn("Correct the entry", `#agreement/${h.engagement_id}`, "sm")); }),
    ...active.filter((x) => !x.first_call_at).map((x) => todoRow(`Plan your first call with ${e(x.organisation?.name || "the organisation")}`, `${quoted(x.scope?.need_title || "")} · 30–45 minutes to meet and agree how you’ll work`, `${btn("Messages", `#conversation-for/${x.need_id}/${uid}`, "sm")}<button class="btn secondary sm" type="button" data-action="first-call" data-id="${x.id}">Record what we agreed</button>`)),
    ...active.map((x) => (x.talent_delivered_at || hoursReadyAt(x, hours))
      ? todoRow(`Waiting for ${e(x.organisation?.name || "the organisation")} to finish and endorse your work`, `${quoted(x.scope?.need_title || "")} · <span>${x.talent_delivered_at ? `you told them on ${date(x.talent_delivered_at)}` : "all agreed hours are approved"}</span> · <span>they’re reminded after 7 and 14 days</span>`, btn("Messages", `#conversation-for/${x.need_id}/${uid}`, "secondary sm"))
      : todoRow(`Log your time on ${quoted(x.scope?.need_title || "")}`, `${e(x.organisation?.name || "")} · ${engHours(x)} of ${x.scope?.hours} hours approved`, `${`<button class="btn sm" type="button" data-action="goto-focus" data-href="#agreement/${x.id}" data-target="log-form">Log time</button>`}${btn("Messages", `#conversation-for/${x.need_id}/${uid}`, "secondary sm")}${x.first_call_at ? `<button class="btn secondary sm" type="button" data-action="mark-delivered" data-id="${x.id}">I’ve delivered everything</button>` : ""}`)),
    ...surveys.map((x) => todoRow(`Two minutes: how did your contribution with ${e(x.other_name || "the organisation")} go?`, `${quoted(x.need_title || "")} · <span>your answers are never shown to the organisation</span>`, `<button class="btn sm" type="button" data-action="survey" data-id="${x.engagement_id}" data-kind="professional">Answer</button>`)),
    ...(p.published ? [] : [todoRow("Your profile is private", "Organisations can’t see it or invite you yet. Send it for review when it’s ready; we usually reply within two working days.", `<button class="btn sm" type="button" data-action="goto-focus" data-href="#workspace/profile" data-target="publish-box">Send for review</button>`)]),
    ...(priv?.career_stage ? [] : [todoRow("One quick question: your career stage", "Private: only Handova sees it. It helps us show who contributes, without names.", `<button class="btn secondary sm" type="button" data-action="career-stage">Answer</button>`)]),
  ];
  const APP = { pending: ["Waiting for the organisation", "ochre"], accepted: ["Accepted", ""], declined: ["Not selected", "grey"], withdrawn: ["Withdrawn", "grey"] };
  const appRows = apps.map((a) => `<div class="todo-row"><div class="stack" style="--gap:2px;min-width:0"><a href="#need/${a.need_id}" style="font-weight:700" data-no-i18n>${e(a.need?.title || "Need")}</a><span class="small muted">${parts([e(a.need?.organisation?.name || ""), `applied ${date(a.created_at)}`])}</span></div><div class="todo-actions">${pill(...(APP[a.status] || [a.status, "grey"]))}${a.status === "pending" ? `${btn("Messages", `#conversation-for/${a.need_id}/${uid}`, "secondary sm")}<button class="btn secondary sm" type="button" data-action="withdraw" data-id="${a.id}">Withdraw</button>` : ""}</div></div>`);
  const cvRows = completed.map((x) => {
    const corr = x.correction_requested_at;
    const corrLine = corr ? (x.endorsement_edited_at ? `<span class="small" style="color:var(--teal);font-weight:600">Corrected by the organisation on ${date(x.endorsement_edited_at)}.</span>` : `<span class="small muted">You asked for a correction on ${date(corr)}. The organisation can edit it within 14 days.</span>`) : "";
    return `<div class="todo-row" id="done-${x.id}" tabindex="-1" style="flex-direction:column;align-items:stretch;gap:12px"><div class="stack" style="--gap:6px;min-width:0"><strong data-no-i18n>${e(x.scope?.need_title)}</strong><span class="small muted">${parts([e(x.organisation?.name || ""), `completed ${date(x.completed_at)}`])}</span>
      ${x.endorsement ? `<blockquote class="small endorse-quote" data-no-i18n>“${e(x.endorsement)}”</blockquote><span class="small muted">— ${e([x.show_endorser_name ? x.endorser_name : "", x.endorsed_by_role, x.organisation?.name].filter(Boolean).join(", "))}</span>` : `<span class="small muted">No written endorsement.</span>`}
      ${(x.confirmed_skills || []).length ? `<div class="row" style="--gap:6px"><span class="small muted">Skills confirmed:</span>${tags(x.confirmed_skills)}</div>` : ""}
      ${x.note_to_professional ? `<div class="private-note"><span class="small" style="font-weight:700">A note just for you</span><p class="small" data-no-i18n>${e(x.note_to_professional)}</p></div>` : ""}
      ${corrLine}</div>
      <div class="row" style="--gap:8px 20px;flex-wrap:wrap;align-items:center"><label class="check"><input type="checkbox" data-action="toggle-public" data-id="${x.id}" ${x.public ? "checked" : ""}><span>Show on my impact CV</span></label>
      ${!corr ? `<button class="link-btn" type="button" data-action="endorse-correction" data-id="${x.id}">Ask for a correction</button>` : ""}<button class="link-btn" type="button" data-action="report" data-type="contribution" data-id="${x.id}" style="color:var(--muted)">Report a concern</button></div></div>`;
  });
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
            <div class="impact-hours"><dt>Available each month</dt><dd>${p.hours_available} h</dd><button class="link-btn small" type="button" data-action="hours-change">Change</button></div>
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
  if (!p.published) return `<div class="banner">${icon("eye", 22, "#0f6f63")}<p style="flex:1">Your profile is <strong>private</strong>. Organisations can’t see it or invite you yet. Send it for review when it’s ready.</p><button class="btn sm" type="button" data-action="goto-focus" data-href="#workspace/profile" data-target="publish-box">Send my profile for review</button></div>`;
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
// When the work counts as delivered: all agreed hours approved with none waiting, or the professional said so.
function hoursReadyAt(x, hours) {
  const mine = hours.filter((h) => h.engagement_id === x.id);
  if (mine.some((h) => h.status === "pending")) return null;
  const ok = mine.filter((h) => h.status === "approved"), total = Number(x.scope?.hours) || 0;
  if (!total || ok.reduce((t, h) => t + Number(h.hours || 0), 0) < total) return null;
  return ok.map((h) => h.reviewed_at || h.created_at).sort().pop() || null;
}
function dueSince(x, hours) {
  if (x.status !== "active") return null;
  const a = x.talent_delivered_at || null, b = hoursReadyAt(x, hours);
  return a && b ? (a < b ? a : b) : a || b;
}
const daysSince = (d) => Math.floor((Date.now() - Date.parse(d)) / 864e5);
const overdueEng = (engs, hours) => engs.find((x) => { const d = dueSince(x, hours); return d && daysSince(d) > 14; });
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
  const surveys = (await result(db.rpc("survey_pending")).catch(() => [])).filter((x) => x.kind === "organisation");
  return { needs, apps, invites, engs, hours, surveys };
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
  const late = data ? overdueEng(data.engs, data.hours) : null;
  const paused = late ? `<div class="banner alert">${icon("alert", 22)}<p><strong>New needs are paused.</strong> <span>${personName(late)}’s work on ${quoted(late.scope?.need_title || "")} has been waiting for your endorsement for ${daysSince(dueSince(late, data.hours))} days.</span> <span>Finish and endorse it, and you can send new needs for review again.</span> <a href="#org/needs/${late.need_id}" style="font-weight:700">Open the need</a></p></div>` : "";
  const banner = orgBanner(o) + paused;
  const blocked = o.status === "suspended" || o.status === "rejected";
  const postBtn = blocked ? "" : btn(`${icon("plus", 16)} Post a need`, "#org/need", "sm");

  if (sub === "details") return shell(`<div class="stack" style="--gap:20px">${head("Organisation profile")}<p class="lead">How professionals see your organisation, on your public page and on every need you post.${approved ? ` <a href="#organisations/${e(o.id)}" style="font-weight:700">View your public page</a>` : ""}</p>${banner}${orgForm(o)}</div>`);

  if (sub === "need" && blocked) return shell(`<div class="stack" style="--gap:20px">${back("All needs", "#org/needs")}${head("Post a need")}${banner}</div>`);
  if (sub === "need") {
    const n = id ? await result(db.from("needs").select("*").eq("id", id).maybeSingle()) : null;
    // A need Handova has approved can't be edited: what people applied to must stay the same.
    if (n && (n.status === "open" || n.status === "closed")) return { redirect: `#org/needs/${n.id}` };
    const note = n?.review_note && n.status === "draft" ? `<div class="banner alert">${icon("alert", 22)}<p><strong>Handova asked for changes:</strong> <span data-no-i18n>${quoted(n.review_note)}</span> Update the need and send it again.</p></div>` : "";
    const info = n && (n.status === "open" || n.status === "closed") ? "" : `<div class="banner">${icon("check", 22, "#0f6f63")}<p>${approved ? "Handova checks every need before it goes live. We usually reply within two working days." : "You can write your need and send it for review now. It goes live once Handova has approved your organisation and the need."}</p></div>`;
    return shell(`<div class="stack" style="--gap:20px">${back(n ? "Back to the need" : "All needs", n ? `#org/needs/${n.id}` : "#org/needs")}${head(n ? "Edit need" : "Post a need")}${note}${info}${needForm(n, o, approved, await talentLanguages(), data ? placesInUse(data.needs, data.engs) >= 3 : false)}</div>`);
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
    const stats = `<div class="need-stats">${approved ? tile(`${Math.max(0, 3 - inUse)} of 3`, "places available") : tile(`${inUse} of 3`, "places in use")}${tile(count("draft"), "drafts")}${tile(count("pending"), "waiting for Handova’s review")}${tile(openCount, "open for applications")}${tile(progressCount, "in progress")}</div>`;
    const line = blocked ? "Your organisation can’t post needs at the moment." : approved ? "Up to 3 needs can be waiting for review, open or in progress at a time. When one is finished or closed, its place becomes available again. Drafts don’t use a place." : "Your needs can go live once Handova has approved your organisation. You can write them and send them for review now.";
    return shell(`<div class="stack" style="--gap:22px">${head("Needs", postBtn)}${switcher}${blocked ? orgBanner(o) : ""}${paused}${stats}<p class="muted">${line}</p>${needs.length ? groups : `<section class="card">${empty("Post your first need", "A need is one piece of work, up to 16 hours, that a volunteer professional can help with. Describe one clear output and the skills involved.", btn("Post a need", "#org/need", "sm"))}</section>`}</div>`);
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
function todoItems(o, { needs, apps, engs, hours, surveys = [] }) {
  const need = (nid) => needs.find((n) => n.id === nid);
  const out = [];
  for (const x of engs.filter((y) => dueSince(y, hours))) {
    const since = dueSince(x, hours), waitingH = hours.some((h) => h.engagement_id === x.id && h.status === "pending");
    out.push({ html: todoRow(`Finish and endorse ${personName(x)}’s work`, `${quoted(x.scope?.need_title || need(x.need_id)?.title || "")} · <span>${x.talent_delivered_at ? `${personName(x)} says everything is delivered` : "All agreed hours are approved"}</span>${daysSince(since) > 14 ? ` · <span style="color:var(--clay-ink);font-weight:600">New needs are paused until you do this</span>` : ""}`, waitingH ? btn("Review hours first", `#org/needs/${x.need_id}`, "secondary sm") : `<button class="btn sm" type="button" data-action="complete" data-id="${x.id}">Finish and endorse</button>`) });
  }
  for (const x of engs.filter((y) => y.status === "active" && !y.first_call_at && !dueSince(y, hours))) out.push({ html: todoRow(`Plan your first call with ${personName(x)}`, `${quoted(x.scope?.need_title || need(x.need_id)?.title || "")} · <span>a 30–45 minute call to agree dates and how you’ll review drafts</span>`, `${x.user_id ? btn("Messages", `#conversation-for/${x.need_id}/${x.user_id}`, "sm") : ""}<button class="btn secondary sm" type="button" data-action="first-call" data-id="${x.id}">Record what we agreed</button>`) });
  for (const x of engs.filter((y) => y.status === "awaiting_signatures" && !y.org_signed_at)) out.push({ html: todoRow(`Sign the agreement with ${personName(x)}`, quoted(x.scope?.need_title || need(x.need_id)?.title || ""), btn("Review and sign", `#agreement/${x.id}`, "sm")) });
  for (const n of needs.filter((y) => y.status === "draft" && y.review_note)) out.push({ html: todoRow(`Handova asked for changes to ${quoted(n.title)}`, `<span data-no-i18n>${e(n.review_note)}</span>`, btn("Update need", `#org/need/${n.id}`, "sm")) });
  for (const n of needs) {
    const waiting = apps.filter((a) => a.need_id === n.id && a.status === "pending");
    if (waiting.length) out.push({ html: todoRow(waiting.length === 1 ? `${e(waiting[0].person?.name || "Someone")} applied to ${quoted(n.title)}` : `${waiting.length} people applied to ${quoted(n.title)}`, "Review their messages, then accept or decline.", btn("See applicants", `#org/needs/${n.id}`, "sm")) });
  }
  for (const h of hours.filter((y) => y.status === "pending")) { const x = engs.find((y) => y.id === h.engagement_id); out.push({ html: hoursRow(h, x, need(x?.need_id)) }); }
  for (const x of engs.filter((y) => y.status === "completed" && y.correction_requested_at && !y.endorsement_edited_at && Date.now() - Date.parse(y.correction_requested_at) < 14 * 864e5)) out.push({ html: todoRow(`${personName(x)} asked for a correction to your endorsement`, `<span data-no-i18n>${e(x.correction_note || "")}</span>`, `<button class="btn sm" type="button" data-action="endorse-edit" data-id="${x.id}">Correct the endorsement</button>`) });
  for (const x of engs.filter((y) => y.status === "completed" && y.followup_due && y.followup_due <= today() && !y.followup_answered_at)) out.push({ html: todoRow(x.user_id ? `Six months on: are you still using what ${personName(x)} delivered?` : "Six months on: are you still using what was delivered?", quoted(x.scope?.need_title || ""), `<button class="btn sm" type="button" data-action="followup" data-id="${x.id}">Answer</button>`) });
  const full = placesInUse(needs, engs) >= 3, late = overdueEng(engs, hours);
  for (const n of needs.filter((y) => y.status === "draft" && !y.review_note)) out.push({ html: todoRow(`${quoted(n.title)} is still a draft`, late ? "New needs are paused until you finish and endorse the work that is waiting." : full ? "All 3 places are in use. You can send it when one becomes free." : "Send it to Handova for review when it is ready.", btn("Open draft", `#org/needs/${n.id}`, "secondary sm")) });
  for (const x of surveys) out.push({ html: todoRow(`Two minutes: how did working with ${e(x.other_name || "the professional")} go?`, `${quoted(x.need_title || "")} · <span>your answers are never shown to the professional</span>`, `<button class="btn sm" type="button" data-action="survey" data-id="${x.engagement_id}" data-kind="organisation" data-short="${x.short_form ? 1 : ""}">Answer</button>`) });
  if (!o.staff_size) out.push({ html: todoRow("Add your team size", "One question. It appears on your public page and helps us report, without names, which organisations Handova supports.", `<button class="btn secondary sm" type="button" data-action="staff-size" data-id="${o.id}">Answer</button>`) });
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
    else boxes.push(box("", "pen", "Next step: send it for review", "Only your organisation can see this need. When it is ready, send it to Handova for review.", (overdueEng(engs, hours) ? `<span class="small muted">New needs are paused until you finish and endorse the work that’s waiting.</span>` : placesInUse(needs, engs) >= 3 ? `<span class="small muted">All 3 places are in use. You can send this for review when another need is finished or closed.</span>` : `<button class="btn sm" type="button" data-action="need-submit" data-id="${n.id}">Send for review</button>`) + btn("Edit", `#org/need/${n.id}`, "secondary sm")));
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
      else if (dueSince(x, hours)) { const since = dueSince(x, hours); boxes.push(box(daysSince(since) > 14 ? "alert" : "", "check", `Next step: finish and endorse ${first(x)}’s work`, `<span>${x.talent_delivered_at ? `${first(x)} told you on ${date(x.talent_delivered_at)} that everything is delivered. Check the work, then confirm what was handed over and write the endorsement.` : `All ${x.scope?.hours || n.hours} agreed hours are approved. Confirm what was handed over and write the endorsement.`}</span> <span>It’s what ${first(x)} keeps from this work.</span>${daysSince(since) > 14 ? ` <strong>New needs are paused until you do this.</strong>` : ""}`, `<button class="btn sm" type="button" data-action="complete" data-id="${x.id}">Finish and endorse</button>${msgBtn(x)}`)); }
      else if (!x.first_call_at) boxes.push(box("", "chat", `Next step: meet ${first(x)}`, `<span>Arrange a short first call (30–45 minutes) to get to know each other and plan the work. We’ve put a suggested agenda in your Messages.</span> <span class="small muted">Already agreed everything in writing? You can record that instead.</span>`, `${btn("Plan the call in Messages", `#conversation-for/${x.need_id}/${x.user_id}`, "sm")}<button class="btn secondary sm" type="button" data-action="first-call" data-id="${x.id}">Record what we agreed</button>`));
      else boxes.push(box("ok", "check", "Nothing to do right now", `${first(x)} logs time as they work. We’ll notify you when there are hours to review; please review them within 14 days.`, msgBtn(x)));
    }
  }
  if (st === "done") {
    for (const x of mine.filter((y) => y.status === "completed")) {
      if (x.correction_requested_at && !x.endorsement_edited_at && Date.now() - Date.parse(x.correction_requested_at) < 14 * 864e5) boxes.push(box("", "pen", `${first(x)} asked for a correction`, `<span data-no-i18n>${quoted(x.correction_note || "")}</span> <span>You can correct the endorsement once, within 14 days.</span>`, `<button class="btn sm" type="button" data-action="endorse-edit" data-id="${x.id}">Correct the endorsement</button>`));
      if (x.followup_due && x.followup_due <= today() && !x.followup_answered_at) boxes.push(box("", "check", `Six months on: are you still using what ${first(x)} delivered?`, `If you answer yes, “Still in use after 6 months” appears on ${first(x)}’s impact CV when they publish this contribution. A no is never shown publicly.`, `<button class="btn sm" type="button" data-action="followup" data-id="${x.id}">Answer</button>`));
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
    const finish = x.status === "active" && !dueSince(x, hours) ? `<div class="finish-block"><strong>Finished?</strong><p class="small">When ${first(x)} has delivered everything, confirm what was delivered and write a short endorsement. This closes the contribution and the conversation. ${first(x)} reads it first and decides whether to publish it.</p>${wh ? `<p class="small" style="font-weight:600">Review the ${wh} waiting ${wh === 1 ? "hour" : "hours"} first.</p>` : `<button class="btn sm" type="button" data-action="complete" data-id="${x.id}">Mark complete and endorse</button>`}</div>` : "";
    const endorsement = x.status === "completed" && x.endorsement ? `<blockquote class="small" data-no-i18n>“${e(x.endorsement.slice(0, 400))}${x.endorsement.length > 400 ? "…" : ""}”</blockquote>` : "";
    return `<section class="card work-card"><div class="row" style="--gap:12px;flex-wrap:nowrap">${avatar(x.person?.name || x.scope?.talent || "?", 48)}<div class="stack" style="--gap:2px;min-width:0"><span class="small muted">Your work with</span>${x.user_id ? `<a href="#profile/${x.user_id}" class="work-name">${personName(x)}</a>` : `<span class="work-name">${personName(x)}</span>`}</div></div>
      <ol class="work-steps">${step(signed, "Agreement signed", sigSub)}${step(!!x.first_call_at || x.status === "completed", "First call", x.first_call_at ? `${x.first_call_written ? "Agreed in writing" : "Held"} ${date(x.first_call_at)}` : signed ? "Not recorded yet" : "After you have both signed")}${step(x.status === "completed" || (signed && appr >= total), "Work and hours", hoursSub)}${step(x.status === "completed", "Finish and endorse", finishSub)}</ol>${bar}${endorsement}
      <div class="row" style="--gap:8px">${live ? btn("Messages", `#conversation-for/${x.need_id}/${x.user_id}`, "secondary sm") : ""}${btn("Agreement and time log", `#agreement/${x.id}`, "secondary sm")}</div>
      ${finish}
      ${live && hoursReadyAt(x, hours) && x.status === "active" ? `<p class="small muted work-foot">All agreed hours are approved, so this contribution can’t be ended early. Problem with what was delivered? Talk to ${first(x)} first, or <button class="link-btn" type="button" data-action="report" data-type="contribution" data-id="${x.id}">Report a concern</button> and Handova will help.</p>` : live ? `<p class="small muted work-foot">Problem with the work? Talk to ${first(x)} first. If it can’t go ahead: <button class="link-btn danger-link" type="button" data-action="end-engagement" data-id="${x.id}">End this contribution</button> · Something unsafe? <button class="link-btn" type="button" data-action="report" data-type="contribution" data-id="${x.id}">Report a concern</button></p>` : ""}
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
    ${[...boxes.filter((b) => !/next-box (wait|ok)\b/.test(b)), ...boxes.filter((b) => /next-box (wait|ok)\b/.test(b))].join("")}
    ${cards}
    ${about}${changeFold}${historyFold}
  </div>`;
}

function orgBanner(o) {
  if (o.status === "approved") return "";
  if (o.status === "pending") return `<div class="banner warn">${icon("clock", 22, "#7a4f0e")}<p><strong>Your organisation is awaiting review.</strong> We usually respond within two working days. You can write your needs now and send them for review; they go live once your organisation is approved.</p></div>`;
  if (o.status === "changes_requested") return `<div class="banner alert">${icon("alert", 22)}<p style="flex:1"><strong>We need a few more details.</strong> Our note is in your notifications. Update your organisation profile and save: it comes straight back to us for review.</p>${btn("Update details", "#org/details", "sm")}</div>`;
  return `<div class="banner alert">${icon("alert", 22)}<p>${o.status === "suspended" ? "This organisation is suspended, so it can’t post needs." : "This organisation was not approved, so it can’t post needs."} If you think this is a mistake, write to hello@handova.org.</p></div>`;
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
    // Written in the poster's language, with dates people can read.
    const day = (v) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? date(v) : v);
    const lines = [written ? t("Summary of what we agreed in writing") : tf("Summary of our first call ({date})", { date: day(val(fd, "call_date") || today()) }), "",
      tf("Delivery date: {x}", { x: day(val(fd, "delivery")) }), tf("Contact person: {x}", { x: val(fd, "contact") }), tf("How drafts will be reviewed: {x}", { x: val(fd, "review") }),
      val(fd, "out") ? tf("Out of scope: {x}", { x: val(fd, "out") }) : "", tf("How we’ll keep in touch: {x}", { x: val(fd, "keep") }), val(fd, "other") ? tf("Anything else: {x}", { x: val(fd, "other") }) : "",
      "", t("Please reply to confirm or correct this summary.")].filter((l, i, arr) => l !== "" || (i > 0 && arr[i - 1] !== ""));
    await result(db.rpc("record_first_call", { p_id: form.dataset.id, p_date: written ? null : val(fd, "call_date") || today(), p_written: written, p_summary: lines.join("\n") }));
    closeDialog();
    toast("Summary posted to Messages.");
    go(location.hash);
  });
}

// Send a draft to Handova for review.
export async function submitForReview(id) {
  await result(db.from("needs").update({ status: "pending" }).eq("id", id));
  toast("Sent to Handova. We usually check new needs within two working days, and we’ll email you when it’s live.");
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

function needForm(n, o, approved, langs, full = false) {
  n = n || {};
  return `<form class="form card" data-form="need" data-id="${e(n.id || "")}" data-was="${e(n.status || "")}" data-org="${e(o.id)}" novalidate><div class="form-grid">
    ${field("title", "Title", { value: n.title, required: true, full: true, attrs: 'maxlength="160" minlength="5" placeholder="e.g. Improve our community data tools"' })}
    ${field("description", "The challenge", { value: n.description, type: "textarea", required: true, full: true, attrs: 'maxlength="6000" minlength="20"', hint: "What is the situation, and why does it matter? At least 20 characters. Don’t include names of the people you support." })}
    ${field("output", "What should be delivered", { value: n.output, type: "textarea", required: true, full: true, attrs: 'maxlength="2000" minlength="5"', hint: "What you want to receive at the end. Put each thing on its own line." })}
    ${skillPicker("skills", "Skills involved", n.skills || [], { hint: "Pick the skills this need calls for." })}
    ${languagePicker("languages", "Working languages", n.languages || [], { hint: "Support in any one of these is welcome. These are the languages our professionals work in.", options: langs })}
    ${dropdown("hours", "Estimated hours", [2, 4, 6, 8, 10, 12, 14, 16].map((h) => [String(h), `${h} hours`]), String(n.hours || 8), { required: true })}
    ${dropdown("location", "Time zone", TIMEZONES, n.location || "", { empty: "Any time zone" })}
    <input type="hidden" name="country" value="${e(o.country || n.country || "")}">
    ${field("deadline", "Apply by (optional)", { value: n.deadline, type: "date", attrs: `min="${today()}"` })}
    ${select("places", "People needed", [["1", "1 person"], ["2", "2 people"], ["3", "3 people"]], String(n.places || 1))}
    <input type="hidden" name="status" value="${e(n.status || "pending")}">
    <div class="checkbox-box full">${check("no_vulnerable_contact", "This need does not involve direct contact with children or adults at risk, and no access to their personal information. *", n.no_vulnerable_contact, true)}</div>
  </div>${needButtons(n, full)}</form>`;
}
// Drafts and new needs: save as a draft or send for review. Live needs: save changes (and reopen a closed one).
function needButtons(n, full = false) {
  const b = (label, st, cls = "") => `<button class="btn ${cls}" type="submit" data-set-status="${st}">${label}</button>`;
  let btns;
  if ((!n.id || n.status === "draft") && full) return `<p class="small muted">All 3 places are in use, so this need can be saved as a draft for now. When a place is free, open it and send it for review.</p><p class="form-error" role="alert"></p><div class="row">${b("Save as draft", "draft")}</div>`;
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
    if (!val(fd, "skills")) throw fieldError(form.querySelector('[name="skills"]'), "Choose at least one skill. It helps the right professionals find this need.");
    if (!val(fd, "languages")) throw fieldError(form.querySelector('[name="languages"]'), "Choose at least one working language.");
    if (!fd.has("no_vulnerable_contact")) throw fieldError(form.querySelector('[name="no_vulnerable_contact"]'), "Tick the safeguarding confirmation to continue. Needs on Handova never involve direct contact with children or adults at risk.");
    const row = { title: val(fd, "title"), description: val(fd, "description"), output: val(fd, "output"), skills: list(val(fd, "skills")), languages: languages(val(fd, "languages")), hours: Number(val(fd, "hours")), arrangement: "Remote", location: val(fd, "location"), country: val(fd, "country"), deadline: val(fd, "deadline") || null, places: Number(val(fd, "places") || 1), status: val(fd, "status"), no_vulnerable_contact: fd.has("no_vulnerable_contact") };
    if (form.dataset.id) await result(db.from("needs").update(row).eq("id", form.dataset.id));
    else form.dataset.id = (await result(db.from("needs").insert({ ...row, organisation_id: form.dataset.org }).select("id").single()))?.id || "";
    const was = form.dataset.was;
    toast(row.status === "pending" && was !== "pending" ? "Sent to Handova. We usually check new needs within two working days, and we’ll email you when it’s live." : row.status === "draft" ? "Draft saved." : row.status === "open" && was === "closed" ? "Your need is open again." : "Changes saved.");
    go(form.dataset.id ? `#org/needs/${form.dataset.id}` : "#org/needs");
  });
}

// ================= shared dialogs =================
export async function inviteDialog(userId) {
  const orgIds = state.memberships.filter((m) => m.organisation?.status === "approved").map((m) => m.organisation_id);
  let open = orgIds.length ? await result(db.from("needs").select("id,title,deadline").in("organisation_id", orgIds).eq("status", "open")) : [];
  if (open.length) {
    const ids = open.map((n) => n.id);
    const [inv, app, eng] = await Promise.all([
      result(db.from("invitations").select("need_id").eq("user_id", userId).in("need_id", ids)).catch(() => []),
      result(db.from("applications").select("need_id").eq("user_id", userId).in("need_id", ids)).catch(() => []),
      result(db.from("engagements").select("need_id").eq("user_id", userId).in("need_id", ids)).catch(() => []),
    ]);
    const taken = new Set([...inv, ...app, ...eng].map((r) => r.need_id));
    if (taken.size && open.every((n) => taken.has(n.id))) return openDialog("Already connected", `<p>This professional has already been invited to, or has applied to, each of your open needs. You can follow up in Messages.</p>`);
    open = open.filter((n) => !taken.has(n.id));
  }
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
    toast("Invitation sent. Most people reply within a week, and we’ll email you when they do.");
  });
}

export function reportDialog(type, id) {
  if (!state.user) return go("#report");
  openDialog("Report a concern", `<form class="form" data-form="report" data-type="${e(type)}" data-id="${e(id || "")}"><p class="muted">Our safeguarding lead reviews every report. If someone is in immediate danger, contact local emergency services first.</p>${select("reason", "What is the concern?", [["exploitation", "Sexual exploitation or abuse"], ["safety", "A child or adult at risk, or another safety concern"], ["harassment", "Harassment or inappropriate behaviour"], ["fraud", "Fraud, payment requests or false hours"], ["misleading", "Misleading or false information"], ["privacy", "Privacy or data"], ["spam", "Spam"], ["other", "Something else"]])}${field("details", "What happened?", { type: "textarea", required: true, attrs: 'minlength="10" maxlength="4000" autofocus' })}${formEnd("Send report", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitReport(form) {
  await withForm(form, async (fd) => {
    const base = { target_type: form.dataset.type || "other", target_id: form.dataset.id || null, reason: val(fd, "reason"), details: val(fd, "details") };
    try { await result(db.from("reports").insert(base)); }
    catch (err) {
      // Until the database accepts the newer reasons, file them under the closest older one, with the reason in the text.
      const older = { exploitation: ["safety", "[Sexual exploitation or abuse] "], fraud: ["misleading", "[Fraud] "] }[base.reason];
      if (!older || !/check|violat|23514/i.test(String(err?.message || err?.code || ""))) throw err;
      await result(db.from("reports").insert({ ...base, reason: older[0], details: (older[1] + base.details).slice(0, 4000) }));
    }
    closeDialog();
    toast("Thank you. We have received your report. Our safeguarding lead reads every report and will contact you if we need more information. If someone is in immediate danger, contact local emergency services first.");
  });
}

export function decisionDialog(title, text, formName, id, fields = "", confirm = "Confirm", danger = false) {
  openDialog(title, `<form class="form" data-form="${formName}" data-id="${e(id)}"><p>${text}</p>${fields}${formEnd(confirm, `<button class="btn secondary" type="button" data-action="close">Cancel</button>`).replace('class="btn"', `class="btn${danger ? " danger" : ""}"`)}</form>`);
}

// ---- Finish and endorse: the evidence the organisation leaves the professional ----
const ENDORSE_LANGS = [["English", "English"], ["Spanish", "Español"], ["Portuguese", "Português"], ["French", "Français"], ["Indonesian", "Bahasa Indonesia"], ["Other", "Other"]];
const LANG_BY_CODE = { en: "English", es: "Spanish", pt: "Portuguese", fr: "French" };
const STARTERS = ["Before this work, we…", "Now our team can…", "{name} was especially good at…", "We still use…"];
const who = (txt) => `<span class="who-sees">${icon("eye", 14)}${txt}</span>`;
export async function completeDialog(id) {
  const x = await result(db.from("engagements").select("id,scope").eq("id", id).single());
  const s = x.scope || {}, first = e(String(s.talent || "the professional").split(" ")[0]);
  const needSkills = (s.skills || []).slice(0, 12);
  const allSkills = SKILL_GROUPS.flatMap(([, list]) => list).filter((k) => !needSkills.includes(k));
  const lang = LANG_BY_CODE[(document.documentElement.lang || "en").slice(0, 2)] || "English";
  openDialog(`Finish and endorse ${first}’s work`, `<form class="form endorse-form" data-form="complete" data-id="${e(id)}" novalidate>
    <p class="muted">This is what ${first} keeps from this contribution. Be specific and honest. ${first} reads it first and decides whether it appears on their public impact CV. Each question says who can see your answer.</p>
    <fieldset class="field full"><legend>Was the agreed work delivered? <span class="req" aria-hidden="true">*</span></legend>
      <label class="check"><input type="radio" name="delivered" value="all" required checked><span>Yes, everything we agreed</span></label>
      <label class="check"><input type="radio" name="delivered" value="partly"><span>Partly</span></label>
      <span class="hint">If it was only partly delivered, the written endorsement is optional, but please still confirm at least one skill and say what was handed over. ${first} is told and can ask for a correction or report a concern.</span>${who(`${first} and Handova`)}</fieldset>
    ${field("deliverables", "What was handed over", { type: "textarea", required: true, value: s.output || "", attrs: 'minlength="10" maxlength="1500"', hint: "One item per line, for example: Brand manual (PDF, 24 pages). Each line becomes a bullet on the impact CV." })}${who(`${first}, and the public if ${first} publishes it`)}
    <fieldset class="field full skill-pick"><legend>Skills ${first} showed in this work</legend>
      <span class="hint">Choose 1 to 3. Only tick what you saw in the work itself.</span>
      <div class="chip-checks">${needSkills.map((k) => `<label class="chip-check"><input type="checkbox" name="skill" value="${e(k)}"><span>${e(k)}</span></label>`).join("")}</div>
      <div class="field skill-add" style="margin-top:6px"><label for="f-skill-add" style="font-weight:700">Add another skill</label>
        <div class="row" style="--gap:8px;flex-wrap:nowrap"><input id="f-skill-add" type="text" list="skill-options" autocomplete="off" maxlength="60" placeholder="Start typing, e.g. Grant writing"><button type="button" class="btn secondary" id="skill-add-btn" style="min-height:50px">Add</button></div>
        <span class="hint">Choose from the suggestions or type your own, then press Enter or Add.</span>
        <datalist id="skill-options">${allSkills.map((k) => `<option value="${e(k)}"></option>`).join("")}</datalist></div>
      ${who(`Public as “Skills confirmed by your organisation”, if ${first} publishes`)}</fieldset>
    <div class="field full"><label for="f-endorsement"><span>Your endorsement of ${first}</span></label>
      <div class="starters" role="group" aria-label="Sentence starters">${STARTERS.map((t) => `<button type="button" class="chip-btn" data-action="insert-starter" data-text="${e(t.replace("{name}", first))}">${e(t.replace("{name}", first))}</button>`).join("")}</div>
      <textarea id="f-endorsement" name="endorsement" maxlength="1200" data-min="100" rows="6"></textarea>
      <span class="hint">In 2 to 5 sentences: what ${first} did, how they worked with your team, and what you can do now that you could not before. At least 100 characters. Write in the language you are most comfortable with; short, simple sentences are perfect. Describe the work and its effect, not personal qualities such as age, nationality, accent or appearance, and never name the people you support.</span>
      <span class="small muted" data-counter-for="f-endorsement">0 / 1200</span>
      <details class="fold"><summary>See an example</summary><p class="small">“Before, we kept our visit records in three notebooks. Ana made one simple spreadsheet and trained two of us. Now our monthly report takes a day instead of a week. She listened well and explained things clearly.” (example)</p></details>
      ${who(`${first}, and the public if ${first} publishes it`)}</div>
    ${select("language", "Language of your endorsement", ENDORSE_LANGS, lang)}
    <div class="form-grid">${field("name", "Your name", { value: state.user?.user_metadata?.full_name || "", attrs: 'maxlength="120"' })}${field("role", "Your role", { required: true, value: state.user?.user_metadata?.org_role || "", attrs: 'minlength="2" maxlength="120" placeholder="e.g. Director"' })}</div>
    ${check("show_name", "Show my name with the endorsement", true)}${who("Your role and organisation are always shown with the endorsement; your name only if ticked")}
    ${field("note", `A note just for ${first} (optional)`, { type: "textarea", attrs: 'maxlength="600"', hint: "One thing that went well and one thing to do differently next time." })}${who(`Only ${first} sees this`)}
    <fieldset class="field full private-q"><legend>For Handova only: would you welcome ${first} on another need? <span class="req" aria-hidden="true">*</span></legend>
      <label class="check"><input type="radio" name="work_again" value="yes" required><span>Yes</span></label>
      <label class="check"><input type="radio" name="work_again" value="right_need"><span>Yes, for the right kind of need</span></label>
      <label class="check"><input type="radio" name="work_again" value="no"><span>No</span></label>
      ${field("work_again_note", "Anything Handova should know? (optional)", { type: "textarea", attrs: 'maxlength="600"' })}
      <span class="hint">${first} never sees this. We use it to make better matches, and we always talk to both sides before acting on a “No”.</span></fieldset>
    ${check("confirm", "This is accurate and in our own words. It names no one we serve, includes no personal details about them, and nothing confidential.", false, true)}
    ${formEnd(`Complete and send to ${first}`, `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
  const ta = document.getElementById("f-endorsement"), ctr = document.querySelector('[data-counter-for="f-endorsement"]');
  ta?.addEventListener("input", () => { if (ctr) ctr.textContent = `${ta.value.length} / 1200`; });
  // Type a skill: it becomes a ticked chip next to the others.
  const add = document.getElementById("f-skill-add"), chips = document.querySelector(".skill-pick .chip-checks");
  const addSkill = () => {
    const v = add.value.trim().replace(/\s+/g, " ");
    if (!v) return;
    const same = [...chips.querySelectorAll("input[name=skill]")].find((i) => i.value.toLowerCase() === v.toLowerCase());
    if (same) same.checked = true;
    else chips.insertAdjacentHTML("beforeend", `<label class="chip-check"><input type="checkbox" name="skill" value="${e(v)}" checked><span data-no-i18n>${e(v)}</span></label>`);
    add.value = ""; add.focus();
  };
  add?.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); addSkill(); } });
  add?.addEventListener("change", () => { if (allSkills.some((k) => k.toLowerCase() === add.value.trim().toLowerCase())) addSkill(); });
  document.getElementById("skill-add-btn")?.addEventListener("click", addSkill);
}
export async function submitComplete(form) {
  await withForm(form, async (fd) => {
    const delivered = fd.get("delivered") || "";
    const skills = [...new Set(fd.getAll("skill").map((v) => String(v || "").trim()).filter(Boolean))];
    const endorsement = val(fd, "endorsement");
    const deliverables = form.querySelector('[name="deliverables"]'), ta = form.querySelector('[name="endorsement"]');
    // Check everything at once, so people see every problem in one go.
    const problems = [];
    if (!delivered) problems.push([form.querySelector('[name="delivered"]'), "Say whether the agreed work was delivered."]);
    if (val(fd, "deliverables").length < 10) problems.push([deliverables, "Describe what was handed over, at least 10 characters."]);
    if (skills.length > 3) problems.push([form.querySelector(".skill-pick input"), "Choose up to 3 skills."]);
    if (!skills.length) problems.push([form.querySelector("#f-skill-add"), "Choose at least one skill you saw in this work."]);
    if ((delivered === "all" || endorsement) && endorsement.length < 100) problems.push([ta, `Please write at least 100 characters (you have ${endorsement.length}).`]);
    if (endorsement.length > 1200) problems.push([ta, `Please keep it under 1,200 characters (you have ${endorsement.length}).`]);
    if (val(fd, "role").length < 2) problems.push([form.querySelector('[name="role"]'), "Add your role."]);
    if (!fd.get("work_again")) problems.push([form.querySelector('[name="work_again"]'), "Please answer this question for Handova."]);
    if (!fd.has("confirm")) problems.push([form.querySelector('[name="confirm"]'), "Please tick this box to continue."]);
    const found = problems.filter(([el]) => el);
    if (found.length) throw fieldErrors(found);
    await result(db.rpc("complete_engagement", { p_id: form.dataset.id, p_delivered: delivered, p_deliverables: val(fd, "deliverables"), p_skills: skills, p_endorsement: endorsement, p_language: val(fd, "language"), p_role: val(fd, "role"), p_name: val(fd, "name"), p_show_name: fd.has("show_name"), p_note: val(fd, "note"), p_work_again: String(fd.get("work_again")), p_work_again_note: val(fd, "work_again_note"), p_confirm: true }));
    closeDialog();
    toast("Thank you. Your endorsement has been sent.");
    go(location.hash);
    const pend = (await result(db.rpc("survey_pending")).catch(() => [])).find((y) => y.engagement_id === form.dataset.id && y.kind === "organisation");
    if (pend) setTimeout(() => surveyDialog(pend.engagement_id, "organisation", pend.short_form).catch(() => {}), 700);
  });
}
// The professional can ask for one correction.
export function correctionDialog(id) {
  openDialog("Ask for a correction", `<form class="form" data-form="endorse-correction" data-id="${e(id)}">
    <p class="muted">You can ask once. The organisation can edit the endorsement within 14 days. It stays off your public impact CV until you publish it again.</p>
    ${select("reason", "What needs correcting?", [["fact", "A fact is wrong (hours, items, dates)"], ["spelling", "Spelling or wording mistake"], ["private", "It includes private or confidential details"], ["other", "Something else"]], "fact")}
    ${field("note", "What should be corrected?", { type: "textarea", required: true, attrs: 'minlength="5" maxlength="300"' })}
    <p class="small muted">Feels unfair or retaliatory? Use Report a concern instead, and Handova will look at it.</p>
    ${formEnd("Send request", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitCorrection(form) {
  await withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error("Say what should be corrected."); }
    await result(db.rpc("request_endorsement_correction", { p_id: form.dataset.id, p_reason: val(fd, "reason"), p_note: val(fd, "note") }));
    closeDialog(); toast("Request sent to the organisation."); go(location.hash);
  });
}
// The organisation corrects the endorsement once, within 14 days of the request.
export async function editEndorsementDialog(id) {
  const x = await result(db.from("engagements").select("id,scope,deliverables,endorsement,confirmed_skills,correction_reason,correction_note,delivered_as_agreed").eq("id", id).single());
  const s = x.scope || {}, chosen = x.confirmed_skills || [];
  const opts = [...new Set([...(s.skills || []), ...chosen])];
  openDialog("Correct the endorsement", `<form class="form" data-form="endorse-edit" data-id="${e(id)}" data-partly="${x.delivered_as_agreed === "partly" ? 1 : ""}" novalidate>
    <div class="banner warn">${icon("alert", 22, "#7a4f0e")}<p><strong>${e(String(s.talent || "The professional").split(" ")[0])} asked:</strong> <span data-no-i18n>${e(x.correction_note || "")}</span></p></div>
    ${field("deliverables", "What was handed over", { type: "textarea", required: true, value: x.deliverables || "", attrs: 'minlength="10" maxlength="1500"' })}
    <fieldset class="field full"><legend>Skills confirmed (up to 3)</legend><div class="chip-checks">${opts.map((k) => `<label class="chip-check"><input type="checkbox" name="skill" value="${e(k)}" ${chosen.includes(k) ? "checked" : ""}><span>${e(k)}</span></label>`).join("")}</div></fieldset>
    ${field("endorsement", "Your endorsement", { type: "textarea", value: x.endorsement || "", attrs: 'maxlength="1200"', hint: x.delivered_as_agreed === "partly" ? "100 to 1,200 characters, or leave it empty." : "100 to 1,200 characters." })}
    <p class="small muted">You can correct it once. The professional is told and decides again whether to publish it.</p>
    ${formEnd("Save correction", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitEditEndorsement(form) {
  await withForm(form, async (fd) => {
    const skills = [...new Set(fd.getAll("skill").map((v) => String(v || "").trim()).filter(Boolean))];
    const ta = form.querySelector('[name="endorsement"]'), text = val(fd, "endorsement"), partly = form.dataset.partly === "1";
    const problems = [];
    if (val(fd, "deliverables").length < 10) problems.push([form.querySelector('[name="deliverables"]'), "Describe what was handed over, at least 10 characters."]);
    if (skills.length > 3) problems.push([form.querySelector('[name="skill"]'), "Choose up to 3 skills."]);
    if (!skills.length) problems.push([form.querySelector('[name="skill"]') || form.querySelector("#f-skill-add"), "Choose at least one skill you saw in this work."]);
    if ((!partly || text) && text.length < 100) problems.push([ta, `Please write at least 100 characters (you have ${text.length}).`]);
    if (text.length > 1200) problems.push([ta, `Please keep it under 1,200 characters (you have ${text.length}).`]);
    const found = problems.filter(([el]) => el);
    if (found.length) throw fieldErrors(found);
    await result(db.rpc("edit_endorsement", { p_id: form.dataset.id, p_deliverables: val(fd, "deliverables"), p_endorsement: val(fd, "endorsement"), p_skills: skills }));
    closeDialog(); toast("Correction saved. The professional has been told."); go(location.hash);
  });
}

// ---- Questionnaires after a contribution (and the two profile questions) ----
const surveyQs = (kind, short) => (short ? QUESTIONS[kind].filter((q) => q.core) : QUESTIONS[kind]);
export async function surveyDialog(id, kind, short = false) {
  short = !!short && short !== "0";
  const [priv, x] = await Promise.all([
    result(db.from("user_private").select("career_stage,research_contact").eq("user_id", state.user.id).maybeSingle()).catch(() => null),
    result(db.from("engagements").select("id,scope,organisation_id").eq("id", id).single()),
  ]);
  const org = kind === "organisation" ? state.memberships.find((m) => m.organisation_id === x.organisation_id)?.organisation : null;
  const other = kind === "organisation" ? e(String(x.scope?.talent || "the professional").split(" ")[0]) : e(x.scope?.organisation || "the organisation");
  const extra = [];
  if (kind === "organisation" && org && !org.staff_size) extra.push(questionHtml({ id: "x_staff", type: "single", q: "How many paid staff does your organisation have?", hint: "Asked once. It appears on your public page.", options: STAFF_SIZES }));
  if (kind === "professional" && !priv?.career_stage) extra.push(questionHtml({ id: "x_stage", type: "single", q: "Which best describes you now?", hint: "Asked once. Private: only Handova sees it.", options: CAREER_STAGES }));
  if (priv?.research_contact == null) extra.push(questionHtml({ id: "x_contact", type: "single", q: "May someone independent of Handova contact you later about your experience?", hint: "Asked once. It helps us check our results honestly. You can say no.", options: [["yes", "Yes"], ["no", "No"]] }));
  openDialog("Two minutes: how did it go?", `<form class="form survey-form" data-form="survey" data-id="${e(id)}" data-kind="${e(kind)}" data-short="${short ? 1 : ""}" novalidate>
    <p class="muted"><span>Your answers are never shown to ${other} and don’t affect the endorsement.</span> <span>Handova only reports totals. Every question is optional.</span></p>
    ${surveyQs(kind, short).map(questionHtml).join("")}
    <div class="banner warn sv-concern" hidden>${icon("shield", 22, "#7a4f0e")}<p><span>Thank you for telling us.</span> <span>If you’d like Handova to follow up, report it now. Only Handova’s team sees reports, never the person or organisation you report.</span> <button class="link-btn" type="button" data-action="report" data-type="contribution" data-id="${e(id)}">Report a concern</button></p></div>
    ${extra.join("")}
    ${formEnd("Send answers", `<button class="btn secondary" type="button" data-action="survey-skip" data-id="${e(id)}" data-kind="${e(kind)}">Skip</button>`)}</form>`);
  const f = document.querySelector(".survey-form");
  if (!f) return;
  wireExclusive(f);
  f.addEventListener("change", (ev) => { if (ev.target.name === "o_concern" || ev.target.name === "p_concern") f.querySelector(".sv-concern").hidden = ev.target.value !== "yes"; });
}
export async function submitSurvey(form) {
  await withForm(form, async (fd) => {
    const kind = form.dataset.kind, short = !!form.dataset.short;
    const answers = readAnswers(form, surveyQs(kind, short));
    const staff = fd.get("x_staff"), stage = fd.get("x_stage"), contact = fd.get("x_contact");
    await result(db.rpc("submit_survey", { p_engagement: form.dataset.id, p_kind: kind, p_status: "submitted", p_answers: answers, p_short: short, p_version: SURVEY_VERSION, p_lang: getLang() }));
    if (stage) await result(db.rpc("set_career_stage", { p_stage: String(stage) })).catch(() => {});
    if (contact) await result(db.rpc("set_research_contact", { p_yes: contact === "yes" })).catch(() => {});
    if (staff) {
      const x = await result(db.from("engagements").select("organisation_id").eq("id", form.dataset.id).single());
      await result(db.from("organisations").update({ staff_size: String(staff) }).eq("id", x.organisation_id)).catch(() => {});
      await loadSession();
    }
    closeDialog();
    toast("Thank you. Your answers help us improve Handova.");
    go(location.hash);
  });
}
export async function skipSurvey(id, kind) {
  await result(db.rpc("submit_survey", { p_engagement: id, p_kind: kind, p_status: "skipped", p_answers: {}, p_short: false, p_version: SURVEY_VERSION, p_lang: getLang() }));
  closeDialog();
  go(location.hash);
}
export function staffSizeDialog(orgId) {
  openDialog("Your team size", `<form class="form" data-form="staff-size" data-id="${e(orgId)}">${questionHtml({ id: "staff_size", type: "single", q: "How many paid staff does your organisation have?", hint: "It appears on your public page, so professionals understand your context.", options: STAFF_SIZES })}${formEnd("Save", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitStaffSize(form) {
  await withForm(form, async (fd) => {
    const v = String(fd.get("staff_size") || "");
    if (!v) throw Error("Choose one option.");
    await result(db.from("organisations").update({ staff_size: v }).eq("id", form.dataset.id));
    await loadSession(); closeDialog(); toast("Saved."); go(location.hash);
  });
}
export function careerStageDialog() {
  openDialog("Your career stage", `<form class="form" data-form="career-stage">${questionHtml({ id: "career_stage", type: "single", q: "Which best describes you now?", hint: "Private: only Handova sees it. It helps us show who contributes, without names.", options: CAREER_STAGES })}${formEnd("Save", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitCareerStage(form) {
  await withForm(form, async (fd) => {
    const v = String(fd.get("career_stage") || "");
    if (!v) throw Error("Choose one option.");
    await result(db.rpc("set_career_stage", { p_stage: v }));
    closeDialog(); toast("Saved."); go(location.hash);
  });
}
// Six months on: still in use? Then one follow-up question, depending on the answer.
export function followupDialog(id) {
  const [why, helped] = QUESTIONS.six_months;
  decisionDialog("Is the work still in use?", "Six months ago this contribution was completed. If you answer yes, “Still in use after 6 months” appears on the professional’s impact CV when they publish it. A no is never shown publicly, and your note stays private.", "followup", id,
    `<fieldset class="field full"><legend>Are you still using what was delivered?</legend><label class="check"><input type="radio" name="in_use" value="yes" required><span>Yes</span></label><label class="check"><input type="radio" name="in_use" value="no"><span>No</span></label></fieldset>
    <div class="sv-when" data-when="no" hidden>${questionHtml(why)}</div><div class="sv-when" data-when="yes" hidden>${questionHtml(helped)}</div>
    <label class="field" for="f-fnote">Anything to add? (optional)<textarea id="f-fnote" name="note" maxlength="1000"></textarea></label>`, "Save answer");
  const f = document.querySelector('form[data-form="followup"]');
  f?.addEventListener("change", (ev) => { if (ev.target.name === "in_use") f.querySelectorAll(".sv-when").forEach((d) => { d.hidden = d.dataset.when !== ev.target.value; }); });
}
export async function submitFollowup(form) {
  await withForm(form, async (fd) => {
    const inUse = fd.get("in_use");
    if (!inUse) throw fieldError(form.querySelector("[name=in_use]"), "Choose yes or no.");
    await result(db.rpc("answer_followup", { p_id: form.dataset.id, p_in_use: inUse === "yes", p_note: val(fd, "note") }));
    const q = QUESTIONS.six_months.find((x) => x.when === inUse), v = q && fd.get(q.id);
    if (v) await result(db.rpc("submit_survey", { p_engagement: form.dataset.id, p_kind: "six_months", p_status: "submitted", p_answers: { [q.id]: String(v) }, p_short: false, p_version: SURVEY_VERSION, p_lang: getLang() })).catch(() => {});
    closeDialog(); toast("Thank you. Your answer is saved."); go(location.hash);
  });
}

// Change the monthly hours from the workspace, without opening the full profile form.
const HOURS_CHOICES = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 30, 40];
export function hoursDialog() {
  const cur = Number(state.profile?.hours_available) || 4;
  openDialog("Hours you can give each month", `<form class="form" data-form="hours-change">
    <p class="muted">Organisations plan around this number. It shows on your impact CV, and it refills on the 1st of each month.</p>
    ${select("hours", "Hours each month", HOURS_CHOICES.map((h) => [String(h), `${h} hours a month`]), String(HOURS_CHOICES.includes(cur) ? cur : 4), { required: true })}
    ${formEnd("Save", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function submitHours(form) {
  await withForm(form, async (fd) => {
    const h = Number(fd.get("hours"));
    if (!(h >= 4)) throw Error("Choose at least 4 hours a month.");
    await result(db.from("profiles").update({ hours_available: h }).eq("user_id", state.user.id));
    await loadSession(); closeDialog(); toast("Saved. Your monthly hours are updated."); go(location.hash);
  });
}
