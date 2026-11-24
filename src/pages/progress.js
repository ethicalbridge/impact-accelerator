// Handova only: where every organisation, need, professional and contribution is, how long each step took or has been
// waiting and on whom, and the reminders already sent. Data: one read-only snapshot from the admin_progress() function.
//
// 16 Nov 2026 (after a panel of three data analysts): one set of step definitions feeds both the synthesis at the top
// ("Where the journey slows down", the average per step) and one card per organisation, need, professional or
// contribution below it. Each card opens with what it is waiting on now, a verdict (nudge today, your turn, reminded,
// on track) and the reminders already sent on that step; then the steps it has reached, each with its own time against
// the typical one. This replaces the separate "Waiting right now" list and the dot timelines.
import { db, state, result, e } from "../core.js";
import { icon, eyebrow, back, pill } from "../ui.js";
import { date } from "../utils.js";

const DAY = 864e5, HOUR = DAY / 24;
// Dates come as ISO strings or as "2026-11-11 03:43:47.8+00" from text columns.
const t = (x) => (x ? new Date(String(x).replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")).getTime() : null);
const short = (d) => (d ? date(d, { day: "numeric", month: "short" }) : "");
const WHO_LETTER = { H: "Handova", O: "Organisation", P: "Professional" };
const whoDots = (who) => [...who].map((k) => `<span class="pg-letter pg-letter-${k}" title="${WHO_LETTER[k]}"><span aria-hidden="true">${k}</span><span class="visually-hidden">${WHO_LETTER[k]}</span></span>`).join("");
// "under 1 hour", "5 hours", "2.5 days", "12 days".
const howLong = (dd) => { if (dd * 24 < 1) return "<span>under 1 hour</span>"; if (dd < 1) { const h = Math.round(dd * 24); return `${h} ${h === 1 ? "<span>hour</span>" : "<span>hours</span>"}`; } const v = dd < 10 ? Math.round(dd * 10) / 10 : Math.round(dd); return `${v} ${v === 1 ? "<span>day</span>" : "<span>days</span>"}`; };

// Every step, in the order things happen, with whose turn it is.
const STEPS = {
  o_signup: ["Signs up → sends the organisation for review", "O"],
  o_review: ["Organisation sent → reviewed by Handova", "H"],
  o_changes: ["Asked for changes → sends the organisation again", "O"],
  o_first_need: ["Organisation approved → sends its first need", "O"],
  n_review: ["Need sent → reviewed by Handova", "H"],
  n_changes: ["Need sent back for changes → sent again", "O"],
  n_first_app: ["Need live → first application", "P"],
  n_chosen: ["First application → professional chosen", "O"],
  p_send: ["Signs up → sends the profile for review", "P"],
  p_review: ["Profile sent → reviewed by Handova", "H"],
  p_changes: ["Asked for changes → sends the profile again", "P"],
  p_id: ["Signs up → identity checked", "P"],
  p_first_app: ["Profile approved → first application", "P"],
  c_pro_sign: ["Professional chosen → professional signs the agreement", "P"],
  c_org_sign: ["Professional chosen → organisation signs the agreement", "O"],
  c_call: ["Agreement signed → first call", "OP"],
  c_deliver: ["First call → work delivered", "P"],
  c_finish: ["Work delivered → finished and endorsed", "O"],
  c_q_org: ["Finished → organisation answers the questionnaire", "O"],
  c_q_pro: ["Finished → professional answers the questionnaire", "P"],
};
const VIEWS = [
  ["orgs", "Organisations join", ["o_signup", "o_review", "o_changes", "o_first_need"]],
  ["needs", "Needs", ["n_review", "n_changes", "n_first_app", "n_chosen"]],
  ["pros", "Professionals join", ["p_send", "p_review", "p_changes", "p_id", "p_first_app"]],
  ["contribs", "Working together", ["c_pro_sign", "c_org_sign", "c_call", "c_deliver", "c_finish", "c_q_org", "c_q_pro"]],
];
// Which step an automatic reminder is about (by its kind); anything else goes to the step that was waiting when it was sent.
const REMINDER_STEP = [
  [/^(finish_signup|signup_reminder)/, ["o_signup", "p_send"]], [/^changes_reminder/, ["o_changes", "n_changes", "p_changes"]], [/^retention_org/, ["o_first_need"]], [/^profile_unsent/, ["p_send"]],
  [/^retention_reminder/, ["p_first_app"]], [/^(need_reminder|reply_reminder)/, ["n_chosen"]], [/^apply_by_/, ["n_first_app", "n_chosen"]],
  [/^sign_reminder/, ["c_pro_sign", "c_org_sign"]], [/^first_call/, ["c_call"]], [/^activity_reminder/, ["c_deliver"]],
  [/^endorse_reminder/, ["c_finish"]], [/^survey/, ["c_q_org", "c_q_pro"]],
];

// One step instance: [key, from, to, stillWaiting, label?]. A finished step counts its real time; one still waiting
// counts from `from` until now.
function journeys(d) {
  const now = Date.now();
  const after = (list, at) => (list || []).find((x) => t(x.at ?? x) > t(at));
  const sends = (x) => (x.sent || []).map(String);
  const firstSent = (x) => sends(x)[0] || x.created_at;
  // Each time something was sent → the first admin decision after it (or the approval date, for older records).
  const reviews = (key, x, pending) => { const ss = sends(x); if (!ss.length) return x.created_at ? [[key, x.created_at, x.approved_at, pending && !x.approved_at]] : [];
    return ss.map((s, i) => { const dc = after(x.decisions, s); const end = dc?.at || (x.approved_at && t(x.approved_at) > t(s) ? x.approved_at : null); return [key, s, end, !end && pending && i === ss.length - 1, i ? "Sent again → reviewed by Handova" : null]; }); };
  // Each "asked for changes" → the next time it was sent again.
  // Older records may lack the decision: then the wait counts from the last time it was sent.
  const resends = (key, x, action, waiting) => { const r = (x.decisions || []).filter((a) => a.a === action).map((a) => { const nx = after(sends(x), a.at); return [key, a.at, nx || null, !nx && waiting]; });
    return waiting && !r.some((i) => i[3]) ? [...r, [key, sends(x).pop() || x.sent_at || x.created_at, null, true]] : r; };
  const needsOf = (o) => d.needs.filter((n) => n.org_id === o.id).sort((a, b) => t(firstSent(a)) - t(firstSent(b)));
  const signedBoth = (c) => (c.org_signed_at && c.talent_signed_at ? [c.org_signed_at, c.talent_signed_at].sort((a, b) => t(a) - t(b)).pop() : null);
  const signing = (c) => c.status === "awaiting_signatures", live = (c) => c.status === "active" || signing(c);
  const survey = (v) => (v ? String(v).split("|")[1] : null);
  const today = new Date().toISOString().slice(0, 10);
  const out = { orgs: [], needs: [], pros: [], contribs: [] };
  for (const o of d.orgs) {
    const ns = needsOf(o), live_ = o.status !== "suspended";
    const steps = [
      o.account_at && ["o_signup", o.account_at, firstSent(o), false],
      ...reviews("o_review", o, o.status === "pending"),
      ...resends("o_changes", o, "org_changes_requested", o.status === "changes_requested"),
      o.approved_at && ["o_first_need", o.approved_at, ns.length ? firstSent(ns[0]) : null, live_ && o.status === "approved" && !ns.length],
    ].filter(Boolean);
    const extras = o.changes_waiting ? [{ who: "H", text: "Changes to the organisation to approve", since: null }] : [];
    out.orgs.push({ x: o, steps, extras, needs: ns.map((n) => ({ title: n.title, at: firstSent(n), id: n.id })) });
  }
  for (const n of d.needs) {
    const open = n.status === "open";
    const steps = [
      ...reviews("n_review", n, n.status === "pending"),
      ...resends("n_changes", n, "need_draft", n.status === "draft"),
      (n.published_at || n.approved_at) && ["n_first_app", n.published_at || n.approved_at, n.first_app_at, open && !n.first_app_at],
      n.first_app_at && ["n_chosen", n.first_app_at, n.chosen_at, open && !n.chosen_at],
    ].filter(Boolean);
    const extras = [];
    if (n.requested_deadline) extras.push({ who: "H", text: "New apply-by date to approve", since: null });
    if (open && n.deadline && n.deadline < today && !n.requested_deadline) extras.push({ who: "O", text: "Apply-by date passed, no new date chosen", since: n.deadline });
    out.needs.push({ x: n, steps, extras });
  }
  for (const p of d.pros) {
    const on = !p.closed_at, s0 = sends(p)[0] || p.sent_at;
    const rv = sends(p).length ? reviews("p_review", p, p.review_status === "pending") : p.sent_at ? [["p_review", p.sent_at, p.approved_at, p.review_status === "pending" && !p.approved_at]] : [];
    const steps = [
      ["p_send", p.signed_up_at, s0 || null, on && !s0 && !p.approved_at],
      ...rv,
      ...resends("p_changes", p, "profile_changes_requested", on && p.review_status === "changes_requested"),
      ["p_id", p.signed_up_at, p.id_verified_at, on && p.id_status !== "approved"],
      p.approved_at && ["p_first_app", p.approved_at, p.first_app_at, on && p.published && !p.first_app_at],
    ].filter(Boolean);
    const extras = [];
    if (["name_mismatch", "in_review"].includes(p.id_status)) extras.push({ who: "H", text: "Identity check to review", since: null });
    const inv = (d.invites || []).filter((i) => i.pro_id === p.id && i.status === "pending").sort((a, b) => t(a.created_at) - t(b.created_at));
    if (on && inv.length) extras.push({ who: "P", text: inv.length === 1 ? "Invited to a need, no answer yet" : "Invited to needs, no answer yet", since: inv[0].created_at });
    out.pros.push({ x: p, steps, extras });
  }
  for (const c of d.contribs) {
    const both = signedBoth(c), done = c.status === "completed";
    const steps = [
      ["c_pro_sign", c.created_at, c.talent_signed_at, signing(c) && !c.talent_signed_at],
      ["c_org_sign", c.created_at, c.org_signed_at, signing(c) && !c.org_signed_at],
      both && ["c_call", both, c.first_call_at, live(c) && !c.first_call_at],
      c.first_call_at && ["c_deliver", c.first_call_at, c.delivered_at, live(c) && !c.delivered_at],
      c.delivered_at && ["c_finish", c.delivered_at, c.completed_at, live(c) && !c.completed_at],
      c.completed_at && ["c_q_org", c.completed_at, survey(c.survey_org), done && !c.survey_org],
      c.completed_at && ["c_q_pro", c.completed_at, survey(c.survey_pro), done && !c.survey_pro],
    ].filter(Boolean);
    const extras = live(c) && Number(c.hours_pending) ? [{ who: "O", text: `${Number(c.hours_pending)} <span>hours to review</span>`, since: c.hours_first_at }] : [];
    out.contribs.push({ x: c, steps, extras });
  }
  // Durations, then the typical time per step (the average of every instance, finished or still waiting).
  const all = [];
  for (const k of Object.keys(out)) for (const j of out[k]) {
    j.steps = j.steps.filter(([, from, to, w]) => from && (to || w)).map(([key, from, to, waiting, label]) => ({ key, from, to, waiting, label: label || STEPS[key][0], who: STEPS[key][1], dur: Math.max(0, ((to ? t(to) : now) - t(from)) / DAY), reminders: [] }));
    all.push(...j.steps);
  }
  const typical = {}, mean = (v) => (v.length ? { avg: v.reduce((a, b) => a + b, 0) / v.length, n: v.length } : { avg: null, n: 0 });
  // The synthesis counts waiting steps too; a verdict compares with finished ones only, so a step that is the only
  // example of itself is not "typical" by definition.
  for (const key of Object.keys(STEPS)) { typical[key] = mean(all.filter((s) => s.key === key).map((s) => s.dur)); typical[key].done = mean(all.filter((s) => s.key === key && !s.waiting).map((s) => s.dur)).avg; }
  // Put each reminder on the step it is about: the step of its kind that was open when it was sent, else any open step
  // that was not Handova's turn. Automatic identity prompts are not reminders about a stuck step.
  for (const k of Object.keys(out)) for (const j of out[k]) {
    j.loose = [];
    for (const r of (j.x.reminders || []).filter((r) => r.kind !== "id_check")) {
      const at = t(r.at), open = j.steps.filter((s) => t(s.from) <= at + 6e4 && at <= (s.to ? t(s.to) : now));
      const keys = REMINDER_STEP.find(([re]) => re.test(r.kind))?.[1] || [];
      const s = open.find((x) => keys.includes(x.key)) || open.find((x) => x.who !== "H");
      (s ? s.reminders : j.loose).push(r);
    }
  }
  return { out, typical };
}

// How one step compares with the typical time for it: "faster", "about typical", "2.5× typical".
function compare(s, typ) {
  if (typ?.avg == null || typ.n < 2 && s.dur === typ.avg) return { tone: "", text: "" };
  const r = s.dur / Math.max(typ.avg, 1 / 24);
  if (s.dur < 1 / 24 && typ.avg < 1 / 24) return { tone: "ok", text: "about typical" };
  if (r < 0.5) return { tone: "fast", text: "faster" };
  if (r <= 1.5) return { tone: "ok", text: "about typical" };
  return { tone: r <= 3 ? "slow" : "late", text: `${r < 10 ? Math.round(r * 10) / 10 : Math.round(r)}× <span>typical</span>`, r };
}

// The verdict for one thing that is waiting, and the plain advice under it.
function verdict(w, typ) {
  const daysSo = w.dur ?? (w.since ? (Date.now() - t(w.since)) / DAY : 0);
  const rem = w.reminders || [], last = rem.length ? t(rem[rem.length - 1].at) : null;
  if (w.who.includes("H")) return { rank: 1, tone: daysSo > 5 ? "late" : daysSo > 2 ? "slow" : "you", label: "Your turn", advice: "Waiting on you, so no reminder goes out." };
  const limit = Math.max(2 * (typ?.done ?? 1.5), 2);
  if (last && Date.now() - last < 2 * DAY) return { rank: 2, tone: "slow", label: `<span>Reminded</span> ${short(rem[rem.length - 1].at)}`, advice: "Reminded recently. Give it a couple of days." };
  if (daysSo > limit) return { rank: 0, tone: "late", label: "Nudge today", advice: rem.length >= 2 ? "Reminders have not worked yet. Try a personal message." : rem.length ? "Reminded once, no reply yet." : "No reminder sent yet." };
  return { rank: 3, tone: "ok", label: "On track", advice: rem.length ? "" : "No reminder needed yet." };
}

const remChips = (list) => list.map((r) => `<span class="pg-chip" title="${e(r.title || "")}">${icon(r.emailed ? "mail" : "bell", 13)} ${short(r.at)}${r.emailed ? "" : ` <span class="visually-hidden">(shown on screen only)</span>`}</span>`).join("");

function stepRow(s, typ, scale, tone = "") {
  const c = compare(s, typ), barTone = c.tone || tone, w = (x) => `${Math.max(1.5, Math.min(100, (x / scale) * 100))}%`;
  return `<div class="jc-row${s.waiting ? " waiting" : ""}">
    <span class="jc-label">${whoDots(s.who)}<span class="stack" style="--gap:1px;min-width:0"><span class="jc-step">${s.label}</span><span class="small muted">${s.waiting ? `<span>since</span> ${short(s.from)}` : `${short(s.from)} → ${short(s.to)}`}${s.reminders.length && !s.waiting ? ` · ${s.reminders.length} ${s.reminders.length === 1 ? "<span>reminder</span>" : "<span>reminders</span>"}` : ""}</span></span></span>
    <span class="jc-track ${barTone}"><span class="jc-fill" style="width:${w(s.dur)}"></span>${typ?.avg != null ? `<span class="jc-tick" style="left:${w(typ.avg)}" title="Typical"></span>` : ""}</span>
    <span class="jc-val"><strong>${howLong(s.dur)}${s.waiting ? " <span>so far</span>" : ""}</strong><span class="small muted">${typ?.avg != null ? `<span>typical</span> ${howLong(typ.avg)}` : "<span>no typical time yet</span>"}</span></span>
    <span class="jc-cmp">${c.text ? `<span class="jc-chip ${c.tone}">${c.text}</span>` : ""}</span>
  </div>`;
}

function card(kind, j, typical) {
  const x = j.x, waits = j.steps.filter((s) => s.waiting), past = j.steps.filter((s) => !s.waiting);
  const items = [...waits.map((s) => ({ ...s, v: verdict(s, typical[s.key]) })), ...j.extras.map((x_) => ({ ...x_, extra: true, reminders: [], v: verdict({ ...x_, reminders: [] }, null) }))].sort((a, b) => a.v.rank - b.v.rank);
  const top = items[0]?.v;
  const scale = Math.max(1 / 24, ...j.steps.map((s) => Math.max(s.dur, typical[s.key]?.avg || 0)));
  const status = {
    orgs: () => (x.status === "approved" ? "Approved" : x.status === "pending" ? "Waiting for review" : x.status === "changes_requested" ? "Asked for changes" : x.status === "suspended" ? "Suspended" : x.status),
    needs: () => (x.status === "pending" ? "Waiting for review" : x.status === "open" ? "Live" : x.status === "draft" ? "Sent back for changes" : x.chosen_at ? "Filled" : "Closed without a match"),
    pros: () => (x.closed_at ? "Closed" : x.review_status === "approved" ? "Approved" : x.review_status === "pending" ? "Waiting for review" : x.review_status === "changes_requested" ? "Asked for changes" : "Not sent yet"),
    contribs: () => (x.status === "completed" ? "Handed over" : x.status === "ended" ? "Ended early" : x.status === "active" ? "In progress" : "Agreement to sign"),
  }[kind]();
  const title = { orgs: [x.name, `#admin-org/${x.id}`, "Open organisation"], needs: [x.title, `#need/${x.id}`, "Open need"], pros: [x.name, `#profile/${x.id}`, "Open profile"], contribs: [x.need, `#agreement/${x.id}`, "Open contribution"] }[kind];
  const meta = {
    orgs: () => [e(x.country || ""), `${x.needs} ${x.needs === 1 ? "<span>need</span>" : "<span>needs</span>"}`, x.last_sign_in ? `<span>last signed in</span> ${short(x.last_sign_in)}` : ""],
    needs: () => [`<span data-no-i18n>${e(x.org || "")}</span>`, `${x.apps} ${x.apps === 1 ? "<span>application</span>" : "<span>applications</span>"}${x.apps_pending ? ` (${x.apps_pending} <span>not answered</span>)` : ""}`, x.deadline ? `<span>apply by</span> ${short(x.deadline)}` : ""],
    pros: () => [e(x.country || ""), `${x.apps} ${x.apps === 1 ? "<span>application</span>" : "<span>applications</span>"}`, x.last_sign_in ? `<span>last signed in</span> ${short(x.last_sign_in)}` : ""],
    contribs: () => [`<span data-no-i18n>${e(x.org || "")} · ${e(x.pro || "")}</span>`, Number(x.hours_logged) ? `${Number(x.hours_logged)} <span>hours logged</span>` : "", x.last_message_at ? `<span>last message</span> ${short(x.last_message_at)}` : ""],
  }[kind]().filter(Boolean).join(" · ");
  const slow = j.steps.some((s) => (compare(s, typical[s.key]).r || 0) > 1.5);
  const whos = [...new Set(items.flatMap((i) => [...i.who]))];
  const tone = top ? top.tone : "done", stateKey = !top ? "done" : top.rank <= 1 ? "todo" : "waiting";
  const nowBlock = items.length ? `<div class="jc-now"><span class="jc-kicker">Waiting now</span>${items.map((i) => i.extra
    ? `<div class="jc-extra">${whoDots(i.who)}<span><strong>${i.text}</strong>${i.since ? ` <span class="small muted">· <span>since</span> ${short(i.since)}</span>` : ""}</span></div>`
    : `${stepRow(i, typical[i.key], scale, i.v.tone === "late" ? "late" : "")}<div class="jc-advice">${i.reminders.length ? `<span class="pg-rem">${remChips(i.reminders)}</span>` : ""}<span class="small">${i.v.advice}</span></div>`).join("")}</div>` : "";
  const pastRows = past.map((s) => stepRow(s, typical[s.key], scale)).join("");
  const needsLine = kind === "orgs" && j.needs.length ? `<p class="jc-needs small"><span class="muted">${j.needs.length === 1 ? "Need sent:" : "Needs sent:"}</span> ${j.needs.map((n) => `<a class="pg-chip" href="#need/${n.id}"><span data-no-i18n>${e(n.title)}</span> · ${short(n.at)}</a>`).join("")}</p>` : "";
  const pastBlock = past.length ? (items.length
    ? `<div class="jc-past"><span class="jc-kicker">How it got here</span>${pastRows}</div>`
    : `<details class="jc-past"><summary>${past.length === 1 ? "Show the step" : `<span>Show the</span> ${past.length} <span>steps</span>`}</summary>${pastRows}</details>`) : "";
  return `<article class="jc jc-${tone}" data-state="${stateKey}" data-who="${whos.join(" ")}" data-slow="${slow ? 1 : 0}">
    <div class="jc-head"><div class="stack" style="--gap:2px;min-width:0"><a class="jc-title" href="${title[1]}" data-no-i18n>${e(title[0] || "")}</a><span class="small muted">${meta}</span></div>${top ? `<span class="jc-verdict ${top.tone}">${top.label}</span>` : pill(status, "")}</div>
    ${top ? `<p class="small muted jc-status">${status}</p>` : ""}${nowBlock}${pastBlock}${needsLine}
    <div class="jc-foot small">${j.loose.length ? `<span class="muted">${j.loose.length} ${j.loose.length === 1 ? "<span>other reminder</span>" : "<span>other reminders</span>"}:</span> <span class="pg-rem">${remChips(j.loose)}</span> · ` : ""}<a href="${title[1]}">${title[2]}</a></div>
  </article>`;
}

export async function progress() {
  if (!state.isAdmin) return { title: "Progress", html: `<div class="wrap page-head">${eyebrow("Admin")}<h1>Administrators only</h1></div>` };
  const d = await result(db.rpc("admin_progress"));
  const { out, typical } = journeys(d);
  const rank = (j) => { const items = [...j.steps.filter((s) => s.waiting).map((s) => verdict(s, typical[s.key])), ...j.extras.map((x) => verdict({ ...x, reminders: [] }, null))]; return items.length ? Math.min(...items.map((v) => v.rank)) : 9; };
  const oldest = (j) => Math.max(0, ...j.steps.filter((s) => s.waiting).map((s) => s.dur));
  for (const k of Object.keys(out)) out[k].sort((a, b) => rank(a) - rank(b) || oldest(b) - oldest(a));
  const html_ = Object.fromEntries(VIEWS.map(([k]) => [k, out[k].map((j) => card(k, j, typical)).join("")]));
  const todo = (k) => out[k].filter((j) => rank(j) <= 1).length;

  // Synthesis: the typical time for every step, grouped as the cards are.
  const rowsAll = Object.keys(STEPS).map((k) => typical[k]), max = Math.max(1, ...rowsAll.map((x) => x.avg || 0));
  const slowestKey = Object.keys(STEPS).reduce((m, k) => ((typical[k].avg || 0) > (typical[m].avg || 0) ? k : m), "o_signup");
  // Tiles: how many cards have something waiting on each side; a click filters the cards below.
  const waitingOn = (L) => Object.values(out).flat().filter((j) => j.steps.some((s) => s.waiting && s.who.includes(L)) || j.extras.some((x) => x.who.includes(L)));
  const lateOn = (L) => waitingOn(L).filter((j) => rank(j) === 0 || (L === "H" && j.steps.some((s) => s.waiting && s.who === "H" && s.dur > 5))).length;
  const tile = (L, label) => { const n = waitingOn(L).length, late = lateOn(L); return `<button type="button" class="pg-tile ${late ? "red" : ""}" data-pg-who="${L}" aria-pressed="false"><strong>${n}</strong><span class="pg-tile-who">${whoDots(L)}<span>${label}</span></span><span class="small">${n ? (late ? `${late} <span>to act on today</span>` : "<span>Nothing overdue</span>") : "<span>Nothing waiting</span>"}</span><span class="pg-tile-go small">${n ? "Show them" : ""}</span></button>`; };
  const active = d.contribs.filter((c) => ["awaiting_signatures", "active"].includes(c.status));
  const legend = `<span class="pg-legend"><span class="small muted">Whose turn:</span>${Object.keys(WHO_LETTER).map((k) => `<span class="pg-legend-item">${whoDots(k)}<span class="small">${WHO_LETTER[k]}</span></span>`).join("")}</span>`;

  const html = `<div class="wrap" style="padding-block:var(--page-top) var(--section-gap)"><div class="stack" style="--gap:28px">
    ${back("Back to admin", "#admin")}
    <div class="stack" style="--gap:10px">${eyebrow("Admin")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">Progress and bottlenecks</h1><p class="lead" style="max-width:none">How long each step takes, where every organisation, need, professional and contribution is, whose turn it is, and the reminders already sent.</p><p class="small muted"><span>Updated</span> ${date(d.generated_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p></div>
    <div class="pg-tiles">${tile("H", "waiting on Handova")}${tile("O", "waiting on organisations")}${tile("P", "waiting on professionals")}<a class="pg-tile" href="#admin-list/people?show=unfinished"><strong>${d.signups.length}</strong><span>unfinished sign-ups</span><span class="small">Accounts with nothing set up yet</span><span class="pg-tile-go small">${d.signups.length ? "See them" : ""}</span></a><button type="button" class="pg-tile" data-pg-goto="contribs"><strong>${active.length}</strong><span>contributions in progress</span><span class="small">${d.contribs.filter((c) => c.status === "completed").length} <span>handed over so far</span></span><span class="pg-tile-go small">${d.contribs.length ? "See them" : ""}</span></button></div>
    <section class="card stack" style="--gap:14px"><div class="row between" style="align-items:baseline;flex-wrap:wrap;gap:10px"><h2 style="font-size:1.6rem">Where the journey slows down</h2>${legend}</div><p class="small muted">Average time each step takes, in the order things happen; in brackets, how many were counted. Steps still waiting count up to today, so this updates every day. The longest bar is the bottleneck.</p>
      ${VIEWS.map(([k, group, keys]) => `<div class="pg-bars"><h3 class="pg-bars-h"><a href="#pg-one" data-pg-goto="${k}">${group}</a></h3>${keys.map((key) => { const x = typical[key]; return `<div class="pg-bar${key === slowestKey && x.avg ? " slow" : ""}"><span class="pg-bar-label"><span class="pg-letters">${whoDots(STEPS[key][1])}</span><span>${STEPS[key][0]}</span></span><span class="pg-bar-track"><span style="width:${x.avg == null ? 0 : Math.max(3, (x.avg / max) * 100)}%"></span></span><span class="pg-bar-val">${x.avg == null ? `<span class="small muted" style="font-weight:400">no data yet</span>` : `${howLong(x.avg)} <span class="small muted" style="font-weight:400">(${x.n})</span>`}</span></div>`; }).join("")}</div>`).join("")}</section>
    <section class="stack" style="--gap:16px" id="pg-one"><div class="stack" style="--gap:6px"><h2 style="font-size:1.6rem">One by one</h2><p class="small muted" style="max-width:none">The same steps, for each one. At the top of each card: what it is waiting on now, for how long, and the reminders already sent. Below: the steps it has reached. The bar is its own time; the black line is the typical time.</p></div>
      <div class="pg-tabs" role="tablist">${VIEWS.map(([k, l], i) => `<button type="button" role="tab" class="pg-tab" data-pg-tab="${k}" aria-selected="${i === 0}">${l} <span class="muted">(${out[k].length})</span>${todo(k) ? ` <span class="pg-todo" title="To do today">${todo(k)}</span>` : ""}</button>`).join("")}</div>
      <div class="pg-filters" role="group" aria-label="Filter"><span class="small muted">Whose turn</span>${[["all", "Anyone"], ["H", "Handova"], ["O", "Organisation"], ["P", "Professional"]].map(([k, l], i) => `<button type="button" class="pg-tab" data-pg-who="${k}" aria-pressed="${i === 0}">${k === "all" ? "" : whoDots(k)}<span>${l}</span></button>`).join("")}<span class="pg-sep" aria-hidden="true"></span><span class="small muted">Show</span>${[["all", "All"], ["todo", "To do today"], ["waiting", "Waiting"], ["slow", "Slower than typical"], ["done", "Nothing waiting"]].map(([k, l], i) => `<button type="button" class="pg-tab" data-pg-show="${k}" aria-pressed="${i === 0}">${l} <span class="muted" data-pg-n="${k}"></span></button>`).join("")}</div>
      <div class="pg-key small"><span><span class="jc-key-bar"></span> <span>its own time</span></span><span><span class="jc-key-tick"></span> <span>typical time</span></span><span><span class="jc-key-bar waiting"></span> <span>still waiting, counts up to today</span></span><span>${icon("mail", 13)} <span>reminder emailed</span></span><span>${icon("bell", 13)} <span>reminder on screen only</span></span></div>
      ${VIEWS.map(([k], i) => `<div data-pg-panel="${k}" class="stack" style="--gap:12px"${i ? " hidden" : ""}>${html_[k] || ""}<p class="small muted" data-pg-none hidden>Nothing matches this filter.</p></div>`).join("")}
    </section>
  </div></div>`;

  const after = () => {
    let tab = "orgs", who = "all", show = "all";
    const panel = () => document.querySelector(`[data-pg-panel="${tab}"]`);
    const apply = () => {
      const cards = [...(panel()?.querySelectorAll(".jc") || [])];
      const okWho = (c) => who === "all" || c.dataset.who.split(" ").includes(who);
      const okShow = (c, s) => s === "all" || (s === "todo" ? c.dataset.state === "todo" : s === "waiting" ? c.dataset.state !== "done" : s === "slow" ? c.dataset.slow === "1" : c.dataset.state === "done");
      let n = 0; cards.forEach((c) => { const ok = okWho(c) && okShow(c, show); c.hidden = !ok; if (ok) n++; });
      document.querySelectorAll("[data-pg-n]").forEach((s) => { s.textContent = cards.filter((c) => okWho(c) && okShow(c, s.dataset.pgN)).length; });
      const none = panel()?.querySelector("[data-pg-none]"); if (none) none.hidden = n > 0;
      document.querySelectorAll(".pg-filters [data-pg-who]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pgWho === who)));
      document.querySelectorAll(".pg-tile[data-pg-who]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pgWho === who)));
      document.querySelectorAll("[data-pg-show]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.pgShow === show)));
    };
    const setTab = (k) => {
      tab = k;
      document.querySelectorAll("[data-pg-tab]").forEach((x) => x.setAttribute("aria-selected", String(x.dataset.pgTab === k)));
      document.querySelectorAll("[data-pg-panel]").forEach((p) => { p.hidden = p.dataset.pgPanel !== k; });
      apply();
    };
    const toSection = () => document.getElementById("pg-one")?.scrollIntoView({ behavior: "smooth", block: "start" });
    document.querySelectorAll("[data-pg-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.pgTab)));
    document.querySelectorAll(".pg-filters [data-pg-who]").forEach((b) => b.addEventListener("click", () => { who = b.dataset.pgWho; apply(); }));
    document.querySelectorAll("[data-pg-show]").forEach((b) => b.addEventListener("click", () => { show = b.dataset.pgShow; apply(); }));
    // A tile shows what is waiting on that side: the first view with something waiting on it.
    document.querySelectorAll(".pg-tile[data-pg-who]").forEach((b) => b.addEventListener("click", () => {
      const L = b.dataset.pgWho;
      if (who === L) { who = "all"; show = "all"; setTab(tab); return; }
      who = L; show = "waiting";
      const first = VIEWS.map(([k]) => k).find((k) => [...document.querySelectorAll(`[data-pg-panel="${k}"] .jc`)].some((c) => c.dataset.state !== "done" && c.dataset.who.split(" ").includes(L)));
      setTab(first || tab); toSection();
    }));
    document.querySelectorAll("[data-pg-goto]").forEach((b) => b.addEventListener("click", (ev) => { ev.preventDefault(); who = "all"; show = "all"; setTab(b.dataset.pgGoto); toSection(); }));
    apply();
  };
  return { title: "Progress and bottlenecks", html, after };
}
