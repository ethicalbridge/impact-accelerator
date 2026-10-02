import { db, state, result, e, openDialog, closeDialog, toast, go, withForm, invalidMessage, val, loadSession } from "../core.js";
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
    ${reviewBanner(p)}
    ${p.id_status === "approved" ? "" : identityCard(p)}
    ${toSign.map((x) => `<div class="banner warn">${icon("pen", 24, "#7a4f0e")}<div style="flex:1"><strong>Sign your agreement with ${e(x.organisation?.name || "the organisation")}</strong><p class="small">${e(x.scope?.need_title)}. Work and hours can start once you both sign.</p></div>${btn("Review and sign", `#agreement/${x.id}`, "dark sm")}</div>`).join("")}
    <div class="grid-4"><div class="stat"><strong>${approvedHours}</strong><span>reviewed hours</span></div><div class="stat"><strong>${completed.length}</strong><span>completed contributions</span></div><div class="stat"><strong>${apps.filter((a) => a.status === "pending").length}</strong><span>applications under review</span></div><div class="stat"><strong>${p.hours_available} h</strong><span>available each month</span></div></div>
    ${pendingInv.length ? card("Invitations", listRows(pendingInv.map((i) => row(`<strong>${e(i.need?.title)}</strong><span class="small muted">${e(i.need?.organisation?.name)} · ${i.need?.hours} hours · ${e(i.need?.arrangement)}</span><p class="small">“${e(i.message)}”</p>`, `<button class="btn sm" type="button" data-action="invite-accept" data-id="${i.id}">Accept</button><button class="btn secondary sm" type="button" data-action="invite-decline" data-id="${i.id}">Decline</button>${btn("View need", `#need/${i.need_id}`, "secondary sm")}`)), "")) : ""}
    ${active.length ? card("In progress", listRows(active.map((x) => row(`<strong>${e(x.scope?.need_title)}</strong><span class="small muted">${e(x.organisation?.name)} · ${hours.filter((h) => h.engagement_id === x.id && h.status === "approved").reduce((s, h) => s + Number(h.hours), 0)} of ${x.scope?.hours} hours reviewed</span>`, `${btn("Log time", `#agreement/${x.id}`, "sm")}${btn("Messages", `#conversation-for/${x.need_id}/${uid}`, "secondary sm")}`)), "")) : ""}
    ${card("Applications", listRows(apps.map((a) => row(`<a href="#need/${a.need_id}" style="font-weight:700">${e(a.need?.title || "Need")}</a><span class="small muted">${e(a.need?.organisation?.name || "")} · applied ${date(a.created_at)}</span>`, `${status(a.status)}${btn("Messages", `#conversation-for/${a.need_id}/${uid}`, "secondary sm")}${a.status === "pending" ? `<button class="btn secondary sm" type="button" data-action="withdraw" data-id="${a.id}">Withdraw</button>` : ""}`)), empty("No applications yet", "Find a need that fits your skills and apply with a short plan.", btn("Explore needs", "#needs", "secondary sm"))), `<a href="#needs" style="font-weight:700">Find more needs</a>`)}
    ${card("Your public impact CV", listRows(completed.map((x) => row(`<strong>${e(x.scope?.need_title)}</strong><span class="small muted">${e(x.organisation?.name)} · completed ${date(x.completed_at)}</span>${x.endorsement ? `<p class="small">“${e(x.endorsement)}”</p>` : ""}<span class="small muted">Private rating from the organisation: ${x.rating ? `${x.rating} out of 5` : "none"}. Only you can see this.</span>`, `<label class="check"><input type="checkbox" data-action="toggle-public" data-id="${x.id}" ${x.public ? "checked" : ""}><span>Show on my public CV</span></label>`)), empty("Nothing to publish yet", "When an organisation completes and endorses your work, you choose whether it appears here.")), btn("View my CV", `#profile/${uid}`, "secondary sm"))}
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
export async function org(sub, id) {
  if (!state.user) return { redirect: "#signin?next=%23org" };
  if (!state.memberships.length) return { redirect: "#onboarding" };
  const m = state.memberships.find((x) => x.organisation_id === sessionStorage.getItem("ia-org")) || state.memberships[0];
  const o = m.organisation;
  const approved = o.status === "approved";
  const items = [["home", "Overview", "#org"], ["plus", "Post a need", "#org/need"], ["people", "Find talent", "#talent"], ["settings", "Organisation details", "#org/details"], ["bell", "Notifications", "#notifications", state.unread || ""], ["user", "Account and privacy", "#account"]];
  if (state.profile) items.push(["user", "My professional workspace", "#workspace"]);
  const shell = (main, active) => ({ title: `${o.name} · workspace`, html: `<div class="workspace">${sideNav(items, active)}<div class="ws-main">${main}</div></div>` });
  const banner = orgBanner(o);

  if (sub === "details") return shell(`<div class="stack" style="--gap:20px">${back("Back to workspace", "#org")}${eyebrow(e(o.name))}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">Organisation details</h1>${banner}${orgForm(o)}</div>`, "#org/details");
  if (sub === "need") {
    const n = id ? await result(db.from("needs").select("*").eq("id", id).maybeSingle()) : null;
    return shell(`<div class="stack" style="--gap:20px">${back("Back to workspace", "#org")}${eyebrow(e(o.name))}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">${n ? "Edit need" : "Post a need"}</h1>${approved ? "" : `<div class="banner warn">${icon("clock", 22, "#7a4f0e")}<p>You can save drafts now. Needs can be opened once your organisation is approved.</p></div>`}${needForm(n, o, approved)}</div>`, "#org/need");
  }

  const needs = await result(db.from("needs").select("*").eq("organisation_id", o.id).order("created_at", { ascending: false }));
  const needIds = needs.map((n) => n.id);
  const [apps, invites, engagements] = needIds.length ? await Promise.all([
    result(db.from("applications").select("*, person:profiles(user_id,name,headline,country,languages)").in("need_id", needIds).order("created_at", { ascending: false })),
    result(db.from("invitations").select("*, person:profiles(user_id,name)").in("need_id", needIds).order("created_at", { ascending: false })),
    result(db.from("engagements").select("*, person:profiles(user_id,name)").eq("organisation_id", o.id).order("created_at", { ascending: false })),
  ]) : [[], [], []];
  const engIds = engagements.map((x) => x.id);
  const hours = engIds.length ? await result(db.from("hours").select("*").in("engagement_id", engIds).eq("status", "pending").order("work_date")) : [];
  const title = (nid) => e(needs.find((n) => n.id === nid)?.title || "Need");
  const pendingApps = apps.filter((a) => a.status === "pending");
  const openCount = needs.filter((n) => n.status === "open").length;
  const toSign = engagements.filter((x) => x.status === "awaiting_signatures" && !x.org_signed_at);
  const active = engagements.filter((x) => x.status === "active");
  const followups = engagements.filter((x) => x.status === "completed" && x.followup_due && x.followup_due <= today() && !x.followup_answered_at);

  const html = `<div class="stack" style="--gap:26px">
    <div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px"><div class="row">${eyebrow(e(o.name))}${status(o.status)}</div><h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">Organisation workspace</h1></div><div class="row">${btn("Find talent", "#talent", "secondary sm")}${btn(`${icon("plus", 16)} Post a need`, "#org/need", "sm")}</div></div>
    ${state.memberships.length > 1 ? `<label class="field" style="max-width:360px">Organisation<select data-action="switch-org">${state.memberships.map((x) => `<option value="${x.organisation_id}" ${x.organisation_id === o.id ? "selected" : ""}>${e(x.organisation.name)}</option>`).join("")}</select></label>` : ""}
    ${banner}
    ${toSign.map((x) => `<div class="banner warn">${icon("pen", 24, "#7a4f0e")}<div style="flex:1"><strong>Sign the agreement with ${e(x.person?.name || x.scope?.talent)}</strong><p class="small">${e(x.scope?.need_title)}</p></div>${btn("Review and sign", `#agreement/${x.id}`, "dark sm")}</div>`).join("")}
    ${followups.map((x) => `<div class="banner">${icon("check", 24, "#0f6f63")}<div style="flex:1"><strong>Six months on: are you still using what ${e(x.scope?.talent)} delivered?</strong><p class="small">${e(x.scope?.need_title)}</p></div><button class="btn sm" type="button" data-action="followup" data-id="${x.id}">Answer</button></div>`).join("")}
    <div class="grid-4"><div class="stat"><strong>${openCount} of 3</strong><span>open needs allowed</span></div><div class="stat"><strong>${pendingApps.length}</strong><span>applications to review</span></div><div class="stat"><strong>${hours.length}</strong><span>time entries to review</span></div><div class="stat"><strong>${active.length}</strong><span>engagements in progress</span></div></div>
    ${card("Your needs", listRows(needs.map((n) => row(`<a href="#need/${n.id}" style="font-weight:700">${e(n.title)}</a><span class="small muted">${n.hours} hours · ${e(n.arrangement)} · ${plural(apps.filter((a) => a.need_id === n.id && a.status === "pending").length, "new application")}</span>`, `${status(n.status)}${btn("Edit", `#org/need/${n.id}`, "secondary sm")}${n.status === "open" ? `<button class="btn secondary sm" type="button" data-action="close-need" data-id="${n.id}">Close</button>` : ""}`)), empty("Post your first need", "Describe one clear output, the skills involved and a realistic number of hours.", btn("Post a need", "#org/need", "sm"))), btn(`${icon("plus", 16)} Post a need`, "#org/need", "secondary sm"))}
    ${card("Applications to review", listRows(pendingApps.map((a) => `<div class="list-row" style="align-items:flex-start"><div class="row" style="align-items:flex-start;flex-wrap:nowrap;min-width:0">${avatar(a.person?.name || "?", 48)}<div class="stack" style="--gap:4px;min-width:0"><a href="#profile/${a.user_id}" style="font-weight:700">${e(a.person?.name || "Professional")}</a><span class="small muted">${e(a.person?.headline || "")} · ${title(a.need_id)}</span><p class="prose" style="font-size:.97rem">${e(a.message)}</p></div></div><div class="row" style="--gap:8px"><button class="btn sm" type="button" data-action="app-accept" data-id="${a.id}">Accept</button><button class="btn secondary sm" type="button" data-action="app-decline" data-id="${a.id}">Decline</button>${btn("Message", `#conversation-for/${a.need_id}/${a.user_id}`, "secondary sm")}</div></div>`), empty("No applications waiting", "New applications will appear here, and you will get a notification.")))}
    ${card("Hours to review", listRows(hours.map((h) => { const x = engagements.find((y) => y.id === h.engagement_id); return row(`<strong>${e(x?.person?.name || x?.scope?.talent)} · ${Number(h.hours)} hours · ${date(h.work_date)}</strong><span class="small muted">${e(x?.scope?.need_title)}</span><p class="small">${e(h.description)}</p>`, `<button class="btn sm" type="button" data-action="hours-approve" data-id="${h.id}">Approve</button><button class="btn secondary sm" type="button" data-action="hours-changes" data-id="${h.id}">Request changes</button>`); }), empty("Nothing to review", "When a professional logs time, it appears here for you to approve.")))}
    ${card("Engagements", listRows(engagements.map((x) => row(`<strong>${e(x.person?.name || x.scope?.talent)}</strong><span class="small muted">${e(x.scope?.need_title)}</span>`, `${status(x.status)}${btn(x.status === "active" ? "Manage" : "Agreement", `#agreement/${x.id}`, "secondary sm")}${x.status === "active" ? `<button class="btn sm" type="button" data-action="complete" data-id="${x.id}">Mark complete</button>` : ""}`)), empty("No engagements yet", "When you accept an application or an invitation is accepted, the agreement appears here.")))}
    ${invites.length ? card("Invitations sent", listRows(invites.map((i) => row(`<strong>${e(i.person?.name || "Professional")}</strong><span class="small muted">${title(i.need_id)} · sent ${date(i.created_at)}</span>`, status(i.status))), "")) : ""}
  </div>`;
  return shell(html, "#org");
}

function orgBanner(o) {
  if (o.status === "approved") return "";
  if (o.status === "pending") return `<div class="banner warn">${icon("clock", 22, "#7a4f0e")}<p><strong>Your organisation is awaiting review.</strong> We usually respond within two working days. You can prepare draft needs meanwhile.</p></div>`;
  if (o.status === "changes_requested") return `<div class="banner alert">${icon("alert", 22)}<p style="flex:1">We need a few more details. Check your notifications and update your organisation details.</p>${btn("Update details", "#org/details", "sm")}</div>`;
  return `<div class="banner alert">${icon("alert", 22)}<p>This organisation is ${o.status === "suspended" ? "suspended" : "not approved"}. Write to us if you think this is a mistake.</p></div>`;
}

function needForm(n, o, approved) {
  n = n || {};
  return `<form class="form card" data-form="need" data-id="${e(n.id || "")}" data-org="${e(o.id)}"><div class="form-grid">
    ${field("title", "Title", { value: n.title, required: true, full: true, attrs: 'maxlength="160" minlength="5" placeholder="e.g. Improve our community data tools"' })}
    ${field("description", "The challenge", { value: n.description, type: "textarea", required: true, full: true, attrs: 'maxlength="6000" minlength="20"', hint: "What is the situation, and why does it matter? Don’t include names of the people you support." })}
    ${field("output", "What should be delivered", { value: n.output, type: "textarea", required: true, full: true, attrs: 'maxlength="2000" minlength="5"', hint: "One clear output. Put each deliverable on its own line." })}
    ${skillPicker("skills", "Skills involved", n.skills || [], { hint: "Pick the skills this need calls for." })}
    ${languagePicker("languages", "Working languages", n.languages || [], { hint: "Support in any one of these is welcome." })}
    ${dropdown("hours", "Estimated hours", [2, 4, 6, 8, 10, 12, 14, 16].map((h) => [String(h), `${h} hours`]), String(n.hours || 8), { required: true })}
    ${dropdown("location", "Time zone", TIMEZONES, n.location || "", { empty: "Any time zone" })}
    ${countrySelect("country", "Country", n.country || o.country || "")}
    ${field("deadline", "Apply by (optional)", { value: n.deadline, type: "date", attrs: `min="${today()}"` })}
    ${select("places", "People needed", [["1", "1 person"], ["2", "2 people"], ["3", "3 people"]], String(n.places || 1))}
    ${select("status", "Status", [["draft", "Draft: only your organisation can see it"], ...(approved ? [["open", "Open: accepting applications"]] : []), ...(n.id && n.status !== "draft" ? [["closed", "Closed: no new applications"]] : [])], n.status || (approved ? "open" : "draft"), { full: true })}
    <div class="checkbox-box full">${check("no_vulnerable_contact", "This need does not involve direct contact with children or vulnerable adults, and no access to their personal information.", n.no_vulnerable_contact, true)}</div>
  </div>${formEnd(n.id ? "Save need" : "Save need")}</form>`;
}

export async function submitNeed(form) {
  await withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error(invalidMessage(form, "Please complete the required fields and the safeguarding confirmation.")); }
    const row = { title: val(fd, "title"), description: val(fd, "description"), output: val(fd, "output"), skills: list(val(fd, "skills")), languages: languages(val(fd, "languages")), hours: Number(val(fd, "hours")), arrangement: "Remote", location: val(fd, "location"), country: val(fd, "country"), deadline: val(fd, "deadline") || null, places: Number(val(fd, "places") || 1), status: val(fd, "status"), no_vulnerable_contact: fd.has("no_vulnerable_contact") };
    if (form.dataset.id) await result(db.from("needs").update(row).eq("id", form.dataset.id));
    else await result(db.from("needs").insert({ ...row, organisation_id: form.dataset.org }));
    toast(row.status === "open" ? "Your need is live." : "Need saved.");
    go("#org");
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
  decisionDialog("Mark this engagement complete", "Confirm what was delivered and write an endorsement. The professional chooses whether it appears on their public CV. The rating is private to them.", "complete", id,
    `${field("deliverables", "What was delivered", { type: "textarea", required: true, attrs: 'minlength="10" maxlength="3000" autofocus' })}${field("endorsement", "Endorsement", { type: "textarea", required: true, attrs: 'minlength="20" maxlength="3000"', hint: "Specific and fair: what changed for your team?" })}${field("role", "Your role", { attrs: 'maxlength="120" placeholder="e.g. Director"' })}${select("rating", "Private rating (only the professional sees this)", [["", "Choose a rating"], ["5", "5: Excellent"], ["4", "4: Very good"], ["3", "3: Good"], ["2", "2: Needs improvement"], ["1", "1: Unsatisfactory"]], "", { required: true })}`, "Mark complete");
}
