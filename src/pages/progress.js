// Handova only (13 Nov 2026): where every organisation, need, professional and contribution is, with the date of each
// step, how long the current step has been waiting and on whom, and the reminders already sent. Built so the founder
// can see bottlenecks and nobody waits forever. Data: one read-only snapshot from the admin_progress() function.
import { db, state, result, e } from "../core.js";
import { icon, eyebrow, back, pill, empty } from "../ui.js";
import { date } from "../utils.js";

const DAY = 864e5;
const days = (from, to = Date.now()) => (from ? Math.max(0, Math.floor((new Date(to) - new Date(from)) / DAY)) : null);
const short = (d) => (d ? date(d, { day: "numeric", month: "short" }) : "");
// How long each kind of wait may last before it turns amber, then red.
const LIMITS = { handova: [2, 5], decide: [5, 10], sign: [3, 7], call: [7, 14], endorse: [5, 10], survey: [3, 7], setup: [7, 14], apps: [14, 30], deadline: [0, 3], work: [21, 42] };
const sevOf = (d, kind) => { const [a, r] = LIMITS[kind] || [7, 14]; return d == null ? "ok" : d > r ? "red" : d > a ? "amber" : "ok"; };
const WHO = { handova: "Handova", org: "Organisation", pro: "Professional", both: "Both sides", pros: "Professionals", setup: "Not finished signing up" };

// What is waiting right now, on whom and since when: the list at the top of the page.
function waits(d) {
  const out = [], add = (who, kind, title, sub, since, link, reminders = [], limit = kind) => {
    const n = days(since); out.push({ who, kind, title, sub, since, days: n, sev: sevOf(n, limit), link, reminders });
  };
  const today = new Date().toISOString().slice(0, 10);
  for (const o of d.orgs) {
    if (o.status === "pending") add("handova", "handova", o.name, "Organisation to review", o.created_at, `#admin-org/${o.id}`);
    else if (o.status === "changes_requested") add("org", "setup", o.name, "Asked for more details", o.created_at, `#admin-org/${o.id}`, o.reminders);
    else if (o.status === "approved" && !o.needs) add("org", "setup", o.name, "Approved, no need posted yet", o.approved_at, `#admin-org/${o.id}`, o.reminders);
    if (o.changes_waiting) add("handova", "handova", o.name, "Changes to approve", null, `#admin-org/${o.id}`);
  }
  for (const n of d.needs) {
    if (n.status === "pending") add("handova", "handova", n.title, `${n.org} · Need to review`, n.created_at, `#need/${n.id}`);
    if (n.requested_deadline) add("handova", "handova", n.title, `${n.org} · New apply-by date to approve`, null, "#admin");
    if (n.status === "open" && n.deadline && n.deadline < today && !n.requested_deadline) add("org", "deadline", n.title, `${n.org} · Apply-by date passed, no new date`, n.deadline, `#need/${n.id}`, n.reminders);
    else if (n.status === "open" && !n.apps && !n.invites_pending) add("pros", "apps", n.title, `${n.org} · Live, no applications yet`, n.published_at || n.approved_at, `#need/${n.id}`, n.reminders);
  }
  for (const a of d.apps.filter((x) => x.status === "pending")) add("org", "decide", a.need, `${a.org} · ${a.pro || "A professional"} applied`, a.created_at, `#need/${a.need_id}`);
  for (const i of d.invites.filter((x) => x.status === "pending")) add("pro", "decide", i.need, `${i.pro || "A professional"} · invited by ${i.org}`, i.created_at, `#need/${i.need_id}`);
  for (const p of d.pros) {
    if (p.closed_at) continue;
    if (p.review_status === "pending") add("handova", "handova", p.name, "Profile to review", p.sent_at || p.profile_at, `#profile/${p.id}`);
    else if (p.review_status === "changes_requested") add("pro", "setup", p.name, "Asked to update the profile", p.profile_at, `#profile/${p.id}`, p.reminders);
    else if (p.review_status === "draft") add("setup", "setup", p.name, "Profile started, not sent for review", p.profile_at, `#profile/${p.id}`, p.reminders);
    if (["name_mismatch", "in_review"].includes(p.id_status)) add("handova", "handova", p.name, "Identity check to review", null, "#admin");
  }
  // People who never finished signing up are counted apart: they are not part of any flow yet.
  for (const s of d.signups) add("setup", "setup", s.email, s.confirmed ? "Signed up, nothing set up yet" : "Signed up, email not confirmed", s.signed_up_at, "#admin-list/people", s.reminders);
  for (const c of d.contribs) {
    const t = c.need, sub = `${c.org} · ${c.pro || "Professional"}`, link = `#agreement/${c.id}`;
    if (c.status === "awaiting_signatures") {
      const who = !c.org_signed_at && !c.talent_signed_at ? "both" : !c.org_signed_at ? "org" : "pro";
      add(who, "sign", t, `${sub} · Agreement to sign`, c.created_at, link, c.reminders);
    } else if (c.status === "active") {
      const signed = [c.org_signed_at, c.talent_signed_at].filter(Boolean).sort().pop();
      if (!c.first_call_at) add("both", "call", t, `${sub} · First call not recorded`, signed, link, c.reminders);
      else if (c.delivered_at) add("org", "endorse", t, `${sub} · Delivered, waiting for the organisation to finish and endorse`, c.delivered_at, link, c.reminders);
      else if (Number(c.hours_pending)) add("org", "decide", t, `${sub} · ${Number(c.hours_pending)} hours to review`, c.hours_first_at, link, c.reminders);
      else add("pro", "work", t, `${sub} · Working on it`, c.first_call_at, link, c.reminders);
    } else if (c.status === "completed") {
      const missing = [!c.survey_pro && "pro", !c.survey_org && "org"].filter(Boolean);
      if (missing.length) add(missing.length === 2 ? "both" : missing[0], "survey", t, `${sub} · Questionnaire not answered`, c.completed_at, link, c.reminders);
    }
  }
  const rank = { red: 0, amber: 1, ok: 2 };
  return out.sort((a, b) => rank[a.sev] - rank[b.sev] || (b.days ?? -1) - (a.days ?? -1));
}

// Average days between steps, to show where the journey slows down.
function speeds(d) {
  const avg = (pairs) => { const v = pairs.filter(([a, b]) => a && b).map(([a, b]) => (new Date(b) - new Date(a)) / DAY); return v.length ? { avg: v.reduce((s, x) => s + x, 0) / v.length, n: v.length } : { avg: null, n: 0 }; };
  const signedBoth = (c) => (c.org_signed_at && c.talent_signed_at ? [c.org_signed_at, c.talent_signed_at].sort().pop() : null);
  return [
    ["Organisation signs up → approved", "handova", avg(d.orgs.map((o) => [o.created_at, o.approved_at]))],
    ["Profile sent → approved", "handova", avg(d.pros.map((p) => [p.sent_at || p.profile_at, p.approved_at]))],
    ["Need sent → live", "handova", avg(d.needs.map((n) => [n.created_at, n.approved_at]))],
    ["Need live → first application", "pros", avg(d.needs.map((n) => [n.published_at || n.approved_at, n.first_app_at]))],
    ["First application → professional chosen", "org", avg(d.needs.map((n) => [n.first_app_at, n.chosen_at]))],
    ["Chosen → agreement signed by both", "both", avg(d.contribs.map((c) => [c.created_at, signedBoth(c)]))],
    ["Signed → first call", "both", avg(d.contribs.map((c) => [signedBoth(c), c.first_call_at]))],
    ["First call → work delivered", "pro", avg(d.contribs.map((c) => [c.first_call_at, c.delivered_at]))],
    ["Delivered → finished and endorsed", "org", avg(d.contribs.map((c) => [c.delivered_at, c.completed_at]))],
  ];
}

const remChips = (all = []) => { const list = all.filter((r) => r.kind !== "id_check"); return list.length
  ? `<div class="pg-rem"><span class="small muted">${list.length === 1 ? "1 reminder sent" : `${list.length} <span>reminders sent</span>`}:</span> ${list.map((r) => `<span class="pg-chip" title="${e(r.title || "")}">${icon(r.emailed ? "mail" : "bell", 13)} ${short(r.at)}</span>`).join("")}</div>`
  : ""; };

// One horizontal timeline: done steps show their date; the first missing step shows how long it has been waiting.
function track(steps, limitFor, stopped = false) {
  steps = steps.filter((s) => !s.skip);
  // The current step is the first missing one with nothing done after it; a missing step before a done one was skipped.
  // Only how far each one got is marked (founder decision, 13 Nov 2026); what is waiting is in the list above.
  const lastDone = steps.map((s) => !!s.at).lastIndexOf(true), cur = -1;
  const prevAt = lastDone >= 0 ? steps[lastDone].at : null;
  return `<ol class="pg-track">${steps.map((s, i) => {
    const done = !!s.at, isCur = i === cur, skipped = !done && i < lastDone, w = isCur ? days(prevAt) : null, sev = isCur ? sevOf(w, limitFor?.(s) || "setup") : "";
    return `<li class="pg-step ${done ? "done" : isCur ? `current ${sev}` : skipped ? "skipped" : "todo"}"><span class="pg-dot" aria-hidden="true">${done ? icon("check", 12) : ""}</span><span class="pg-label">${s.label}</span><span class="pg-date">${done ? short(s.at) : skipped ? "<span>not recorded</span>" : isCur && w != null ? `${w} <span>${w === 1 ? "day waiting" : "days waiting"}</span>` : ""}${isCur && s.who ? `<span class="pg-who">${WHO[s.who]}</span>` : ""}</span></li>`;
  }).join("")}</ol>`;
}

function contribCard(c) {
  const both = c.org_signed_at && c.talent_signed_at ? [c.org_signed_at, c.talent_signed_at].sort().pop() : null;
  const ended = c.status === "ended";
  const steps = [
    { label: "Professional chosen", at: c.created_at },
    { label: "Agreement signed", at: both, who: !c.org_signed_at && !c.talent_signed_at ? "both" : !c.org_signed_at ? "org" : "pro", lim: "sign" },
    { label: "First call", at: c.first_call_at, who: "both", lim: "call" },
    { label: "Hours logged", at: c.hours_first_at, who: "pro", lim: "work" },
    { label: "Delivered", at: c.delivered_at, who: "pro", lim: "work" },
    { label: "Finished and endorsed", at: c.completed_at, who: "org", lim: "endorse" },
    { label: "Questionnaires", at: c.survey_pro && c.survey_org ? [c.survey_pro, c.survey_org].map((x) => x.split("|")[1]).sort().pop() : null, who: !c.survey_pro && !c.survey_org ? "both" : !c.survey_pro ? "pro" : "org", lim: "survey" },
  ];
  const state_ = ended ? pill("Ended early", "grey") : c.status === "completed" ? pill("Handed over", "") : c.status === "active" ? pill("In progress", "ochre") : pill("Agreement to sign", "ochre");
  return `<article class="pg-card"><div class="pg-head"><div class="stack" style="--gap:2px;min-width:0"><a href="#agreement/${c.id}" class="pg-title">${e(c.need || "")}</a><span class="small muted">${e(c.org || "")} · ${e(c.pro || "")}${Number(c.hours_logged) ? ` · ${Number(c.hours_logged)} <span>hours logged</span>${Number(c.hours_pending) ? ` (${Number(c.hours_pending)} <span>to review</span>)` : ""}` : ""}${c.last_message_at ? ` · <span>last message</span> ${short(c.last_message_at)}` : ""}</span></div>${state_}</div>
    ${ended ? `<p class="small muted">${short(c.ended_at)}${c.end_reason ? ` · ${e(c.end_reason)}` : ""}</p>` : track(steps, (s) => s.lim)}${remChips(c.reminders)}</article>`;
}
function needCard(n) {
  const steps = [
    { label: "Sent", at: n.created_at },
    { label: n.published_at && n.approved_at && n.published_at.slice(0, 10) !== n.approved_at.slice(0, 10) ? "Reopened" : "Live", at: n.published_at || n.approved_at, who: "handova", lim: "handova" },
    { label: "First application", at: n.first_app_at, who: "pros", lim: "apps" },
    { label: "Professional chosen", at: n.chosen_at, who: "org", lim: "decide" },
  ];
  // A closed need with someone chosen was filled; one closed without anyone chosen just stopped (nothing is waiting).
  const s = n.status === "pending" ? pill("To review", "ochre") : n.status === "open" ? pill("Live", "") : n.status === "closed" && n.chosen_at ? pill("Filled", "") : pill(n.status === "closed" ? "Closed without a match" : n.status, "grey");
  return `<article class="pg-card"><div class="pg-head"><div class="stack" style="--gap:2px;min-width:0"><a href="#need/${n.id}" class="pg-title">${e(n.title)}</a><span class="small muted">${e(n.org)} · ${n.apps} ${n.apps === 1 ? "<span>application</span>" : "<span>applications</span>"}${n.apps_pending ? ` (${n.apps_pending} <span>waiting for a decision</span>)` : ""} · ${n.matched} <span>matching professionals told</span>${n.deadline ? ` · <span>apply by</span> ${short(n.deadline)}` : ""}</span></div>${s}</div>
    ${track(steps, (x) => x.lim, n.status === "closed" || n.status === "draft")}${remChips(n.reminders)}</article>`;
}
function orgCard(o, allNeeds = []) {
  const steps = [
    { label: "Signed up", at: o.created_at },
    { label: "Approved", at: o.approved_at, who: o.status === "changes_requested" ? "org" : "handova", lim: o.status === "changes_requested" ? "setup" : "handova" },
  ];
  // One step per need the organisation sent, oldest first (or one empty step when none yet).
  const mine = allNeeds.filter((n) => n.org_id === o.id).sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
  if (!mine.length) steps.push({ label: "First need sent", at: null, who: "org", lim: "setup" });
  mine.forEach((n, i) => steps.push({ label: `<span class="pg-nth">${i + 1}</span> <span>need sent</span><span class="pg-need-name" data-no-i18n>${e(n.title)}</span>`, at: n.created_at }));
  const s = o.status === "approved" ? pill("Approved", "") : o.status === "pending" ? pill("To review", "ochre") : o.status === "changes_requested" ? pill("Asked for details", "ochre") : pill(o.status, "grey");
  return `<article class="pg-card"><div class="pg-head"><div class="stack" style="--gap:2px;min-width:0"><a href="#admin-org/${o.id}" class="pg-title">${e(o.name)}</a><span class="small muted">${e(o.country || "")}${o.contact_email ? ` · <a href="mailto:${e(o.contact_email)}" data-no-i18n>${e(o.contact_email)}</a>` : ""} · ${o.needs} ${o.needs === 1 ? "<span>need</span>" : "<span>needs</span>"}${o.last_sign_in ? ` · <span>last signed in</span> ${short(o.last_sign_in)}` : ""}</span></div>${s}</div>
    ${track(steps, (x) => x.lim)}${remChips(o.reminders)}</article>`;
}
function proCard(p) {
  const steps = [
    { label: "Signed up", at: p.signed_up_at },
    { label: "Profile sent", at: p.sent_at || (p.review_status !== "draft" ? p.profile_at : null), who: "pro", lim: "setup" },
    { label: "Approved", at: p.approved_at, who: p.review_status === "changes_requested" ? "pro" : "handova", lim: p.review_status === "changes_requested" ? "setup" : "handova" },
    { label: "Identity verified", at: p.id_verified_at, who: "pro", lim: "setup" },
    { label: "First application", at: p.first_app_at, who: "pro", lim: "apps" },
  ];
  const s = p.closed_at ? pill("Closed", "grey") : p.review_status === "approved" ? pill("Approved", "") : p.review_status === "pending" ? pill("To review", "ochre") : pill(p.review_status === "draft" ? "Not sent" : "Asked to update", "ochre");
  return `<article class="pg-card"><div class="pg-head"><div class="stack" style="--gap:2px;min-width:0"><a href="#profile/${p.id}" class="pg-title" data-no-i18n>${e(p.name)}</a><span class="small muted">${e(p.country || "")}${p.email ? ` · <a href="mailto:${e(p.email)}" data-no-i18n>${e(p.email)}</a>` : ""} · ${p.apps} ${p.apps === 1 ? "<span>application</span>" : "<span>applications</span>"} · ${p.contribs} ${p.contribs === 1 ? "<span>contribution</span>" : "<span>contributions</span>"}${p.last_sign_in ? ` · <span>last signed in</span> ${short(p.last_sign_in)}` : ""}</span></div>${s}</div>
    ${track(steps, (x) => x.lim)}${remChips(p.reminders)}</article>`;
}

export async function progress() {
  if (!state.isAdmin) return { title: "Progress", html: `<div class="wrap page-head">${eyebrow("Admin")}<h1>Administrators only</h1></div>` };
  const d = await result(db.rpc("admin_progress"));
  // Automatic "verify your identity" prompts are not reminders about a stuck step.
  for (const k of ["orgs", "needs", "pros", "signups", "contribs"]) for (const x of d[k] || []) x.reminders = (x.reminders || []).filter((r) => r.kind !== "id_check");
  const list = waits(d);
  const groupsOf = (x) => x.who === "both" ? ["org", "pro"] : x.who === "pros" ? ["pro"] : [x.who];
  const by = (w) => list.filter((x) => groupsOf(x).includes(w));
  const tile = (w, label) => { const l = by(w), red = l.filter((x) => x.sev === "red").length, oldest = Math.max(0, ...l.map((x) => x.days || 0)); return `<button type="button" class="pg-tile ${w === "setup" ? "" : red ? "red" : l.some((x) => x.sev === "amber") ? "amber" : ""}" data-pg-filter="${w}" aria-pressed="false"><strong>${l.length}</strong><span>${label}</span><span class="small">${l.length ? `${red && w !== "setup" ? `${red} <span>overdue</span> · ` : ""}<span>oldest</span> ${oldest} ${oldest === 1 ? "<span>day</span>" : "<span>days</span>"}` : "<span>Nothing waiting</span>"}</span><span class="pg-tile-go small">${l.length ? "Show them" : ""}</span></button>`; };
  const sp = speeds(d), max = Math.max(1, ...sp.map(([, , s]) => s.avg || 0)), slowest = sp.reduce((m, x) => ((x[2].avg || 0) > (m[2].avg || 0) ? x : m), sp[0]);
  const active = d.contribs.filter((c) => ["awaiting_signatures", "active"].includes(c.status));
  const html = `<div class="wrap" style="padding-block:var(--page-top) var(--section-gap)"><div class="stack" style="--gap:28px">
    ${back("Back to admin", "#admin")}
    <div class="stack" style="--gap:10px">${eyebrow("Admin")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">Progress and bottlenecks</h1><p class="lead" style="max-width:none">Where every organisation, need, professional and contribution is, how long each step has been waiting and on whom, and the reminders already sent. Amber means slower than usual, red means overdue.</p><p class="small muted"><span>Updated</span> ${date(d.generated_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
    <div class="pg-tiles">${tile("handova", "waiting on Handova")}${tile("org", "waiting on organisations")}${tile("pro", "waiting on professionals")}${tile("setup", "unfinished sign-ups")}<button type="button" class="pg-tile" data-pg-goto="contribs"><strong>${active.length}</strong><span>contributions in progress</span><span class="small">${d.contribs.filter((c) => c.status === "completed").length} <span>handed over so far</span></span><span class="pg-tile-go small">${d.contribs.length ? "See their timelines" : ""}</span></button></div>
    <section class="card stack" style="--gap:14px"><h2 style="font-size:1.6rem">Where the journey slows down</h2><p class="small muted">Average days between steps, from everything so far. The longest bar is the bottleneck.</p>
      <div class="pg-bars">${sp.map(([label, who, s]) => `<div class="pg-bar${s === slowest[2] && s.avg ? " slow" : ""}"><span class="pg-bar-label">${label} <span class="pg-who">${WHO[who]}</span></span><span class="pg-bar-track"><span style="width:${s.avg == null ? 0 : Math.max(3, (s.avg / max) * 100)}%"></span></span><span class="pg-bar-val">${s.avg == null ? "<span>no data yet</span>" : `${s.avg < 1 ? "<1 <span>day</span>" : `${Math.round(s.avg)} ${Math.round(s.avg) === 1 ? "<span>day</span>" : "<span>days</span>"}`} <span class="small muted">(${s.n})</span>`}</span></div>`).join("")}</div></section>
    <section class="card stack" style="--gap:12px" id="pg-waiting"><div class="row between" style="align-items:baseline;flex-wrap:wrap;gap:8px"><h2 style="font-size:1.6rem">Waiting right now</h2><span class="small muted"><span data-pg-count>${list.length}</span> <span>shown</span></span></div>
      <div class="pg-filters" role="group" aria-label="Filter">${[["all", "Everyone"], ["handova", "On Handova"], ["org", "On organisations"], ["pro", "On professionals"], ["setup", "Unfinished sign-ups"]].map(([k, l], i) => `<button type="button" class="pg-tab" data-pg-filter="${k}" aria-pressed="${i === 0}">${l}</button>`).join("")}<span class="pg-sep" aria-hidden="true"></span>${[["any", "Any wait"], ["late", "Slow or overdue"], ["red", "Overdue only"]].map(([k, l], i) => `<button type="button" class="pg-tab" data-pg-sev="${k}" aria-pressed="${i === 0}">${l}</button>`).join("")}</div>
      <p class="small muted">Oldest and most overdue first.</p>
      ${list.length ? `<div class="pg-waits">${list.map((x) => `<a class="pg-wait ${x.sev}" href="${x.link}" data-groups="${groupsOf(x).join(" ")}" data-sev="${x.sev}"><span class="pg-wait-days">${x.days == null ? "–" : x.days}<small>${x.days === 1 ? "day" : "days"}</small></span><span class="stack" style="--gap:2px;min-width:0"><strong data-no-i18n>${e(x.title || "")}</strong><span class="small muted">${e(x.sub)}</span>${x.reminders?.length ? `<span class="small muted">${x.reminders.length} ${x.reminders.length === 1 ? "<span>reminder sent</span>" : "<span>reminders sent</span>"} · <span>last</span> ${short(x.reminders[x.reminders.length - 1].at)}</span>` : ""}</span><span class="pg-who-pill">${WHO[x.who]}</span></a>`).join("")}<p class="small muted" data-pg-none hidden>Nothing matches this filter.</p></div>` : empty("Nothing is waiting", "Everyone is moving. Well done.")}</section>
    <section class="stack" style="--gap:16px"><h2 style="font-size:1.6rem">Timelines</h2>
      <div class="pg-tabs" role="tablist">${[["contribs", "Contributions", d.contribs.length], ["needs", "Needs", d.needs.length], ["orgs", "Organisations", d.orgs.length], ["pros", "Professionals", d.pros.length]].map(([k, l, n], i) => `<button type="button" role="tab" class="pg-tab" data-pg-tab="${k}" aria-selected="${i === 0}">${l} <span class="muted">(${n})</span></button>`).join("")}</div>
      <div data-pg-panel="contribs" class="stack" style="--gap:12px">${d.contribs.length ? d.contribs.map(contribCard).join("") : empty("No contributions yet", "")}</div>
      <div data-pg-panel="needs" class="stack" style="--gap:12px" hidden>${d.needs.map(needCard).join("")}</div>
      <div data-pg-panel="orgs" class="stack" style="--gap:12px" hidden>${d.orgs.map((o) => orgCard(o, d.needs)).join("")}</div>
      <div data-pg-panel="pros" class="stack" style="--gap:12px" hidden>${d.pros.map(proCard).join("")}</div>
    </section>
  </div></div>`;
  const after = () => {
    let who = "all", sev = "any";
    const apply = () => {
      let n = 0;
      document.querySelectorAll(".pg-wait").forEach((a) => { const ok = (who === "all" || a.dataset.groups.split(" ").includes(who)) && (sev === "any" || (sev === "red" ? a.dataset.sev === "red" : a.dataset.sev !== "ok")); a.hidden = !ok; if (ok) n++; });
      const c = document.querySelector("[data-pg-count]"); if (c) c.textContent = n;
      const none = document.querySelector("[data-pg-none]"); if (none) none.hidden = n > 0;
      document.querySelectorAll("[data-pg-filter]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pgFilter === who)));
      document.querySelectorAll("[data-pg-sev]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pgSev === sev)));
    };
    document.querySelectorAll("[data-pg-filter]").forEach((b) => b.addEventListener("click", () => {
      const fromTile = b.classList.contains("pg-tile");
      who = fromTile && who === b.dataset.pgFilter ? "all" : b.dataset.pgFilter; apply();
      if (fromTile) document.getElementById("pg-waiting")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    document.querySelectorAll("[data-pg-sev]").forEach((b) => b.addEventListener("click", () => { sev = b.dataset.pgSev; apply(); }));
    document.querySelectorAll("[data-pg-goto]").forEach((b) => b.addEventListener("click", () => {
      document.querySelector(`[data-pg-tab="${b.dataset.pgGoto}"]`)?.click();
      document.querySelector("[data-pg-tab]")?.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    document.querySelectorAll("[data-pg-tab]").forEach((b) => b.addEventListener("click", () => {
      document.querySelectorAll("[data-pg-tab]").forEach((x) => x.setAttribute("aria-selected", String(x === b)));
      document.querySelectorAll("[data-pg-panel]").forEach((p) => { p.hidden = p.dataset.pgPanel !== b.dataset.pgTab; });
    }));
  };
  return { title: "Progress and bottlenecks", html, after };
}
