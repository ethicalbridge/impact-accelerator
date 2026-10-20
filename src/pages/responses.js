// Handova only: the post-contribution questionnaires, summarised.
// Small-sample rules (from the survey design): under 30 answers show counts, not percentages; with a filter applied,
// groups under 5 answers are hidden; countries with fewer than 3 organisations are grouped as "Other countries".
import { db, state, result, e, openDialog, closeDialog, toast, go, withForm } from "../core.js";
import { icon, eyebrow, back, empty, pill, formEnd } from "../ui.js";
import { date } from "../utils.js";
import { t } from "../i18n.js";
import { QUESTIONS, optionsOf, STAFF_SIZES, CAREER_STAGES, SURVEY_VERSION } from "../survey.js";

const TABS = [["organisation", "Organisations"], ["professional", "Professionals"], ["six_months", "Six months on"]];
const PERIODS = [["all", "All time"], ["90", "Last 3 months"], ["365", "Last 12 months"]];
const RESP = { organisation: "org_response", professional: "pro_response", six_months: "six_months" };
const label = (list, v) => (list.find(([k]) => k === v) || [v, v || "Not given"])[1];

let cache = null;

export async function responses(params) {
  if (!state.user) return { redirect: "#signin?next=%23admin-responses" };
  if (!state.isAdmin) return { title: "Admin", html: `<div class="wrap page-head">${eyebrow("Admin")}<h1>Administrators only</h1></div>` };
  const all = await result(db.rpc("admin_survey_data")).catch(() => []);
  cache = all;
  const tab = TABS.some(([k]) => k === params.get("tab")) ? params.get("tab") : "organisation";
  // Each tab has its own filters: organisations by their country, size and type; professionals by theirs.
  const pro = tab === "professional";
  const keys = pro ? ["period", "country", "stage", "hours", "delivered"] : ["period", "country", "staff", "orgtype", "delivered"];
  const f = Object.fromEntries(keys.map((k) => [k, params.get(k) || (k === "period" ? "all" : "")]));
  const filtered = keys.some((k) => f[k] && f[k] !== "all");

  // Countries with fewer than 3 organisations (or professionals) are grouped, everywhere.
  const whoBy = {};
  all.forEach((r) => { const c = (pro ? r.pro_country : r.org_country) || "Unknown"; (whoBy[c] ||= new Set()).add(pro ? r.professional_id : r.organisation_id); });
  const cGroup = (c) => (whoBy[c || "Unknown"]?.size >= 3 ? c : "Other countries");
  const myCountry = (r) => cGroup(pro ? r.pro_country : r.org_country);
  const countries = [...new Set(all.map(myCountry))].sort();
  const orgTypes = [...new Set(all.map((r) => r.org_type).filter(Boolean))].sort();
  const HOURS = [["6-8", "6–8 hours"], ["9-12", "9–12 hours"], ["13-16", "13–16 hours"]];
  const hoursBand = (h) => (!h ? "" : h <= 8 ? "6-8" : h <= 12 ? "9-12" : "13-16");

  const since = f.period === "all" ? 0 : Date.now() - Number(f.period) * 864e5;
  const rows = all.filter((r) => Date.parse(r.completed_at) >= since && (!f.country || myCountry(r) === f.country) && (!f.staff || r.staff_size === f.staff)
    && (!f.orgtype || r.org_type === f.orgtype) && (!f.stage || r.career_stage === f.stage) && (!f.hours || hoursBand(Number(r.hours_planned)) === f.hours)
    && (!f.delivered || r.delivered === (f.delivered === "everything" ? "all" : f.delivered)));
  const base = tab === "six_months" ? rows.filter((r) => r.followup_answered_at) : rows;
  const got = (r) => r[RESP[tab]];
  const answered = base.filter((r) => got(r)?.status === "submitted");
  const skipped = base.filter((r) => got(r)?.status === "skipped").length;
  const A = (r) => got(r)?.answers || {};

  // A share with the small-sample rule applied.
  const show = (k, n) => {
    if (!n) return { k, n, big: "–", sub: "No answers yet", ring: null };
    if (filtered && n < 5) return { k, n, big: "<5", sub: "Too few answers to show", ring: null };
    const ring = k / n;
    if (n < 30) return { k, n, big: `${k} of ${n}`, sub: "", ring };
    return { k, n, big: `${Math.round(ring * 100)}%`, sub: `of ${n} answers`, ring };
  };
  // A ring that fills to the share; the number in the middle follows the small-sample rule.
  const ringSvg = (s, warn) => {
    const r = 38, c = 2 * Math.PI * r, f = s.ring == null ? 0 : Math.max(0, Math.min(1, s.ring));
    return `<svg class="rs-ring" viewBox="0 0 96 96" role="img" aria-label="${e(s.label ? `${s.label}: ${s.big}` : s.big)}"><circle cx="48" cy="48" r="${r}" class="rs-ring-track"/>${f > 0 ? `<circle cx="48" cy="48" r="${r}" class="rs-ring-fill${warn ? " warn" : ""}" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 48 48)"/>` : ""}<text x="48" y="${s.big.length > 6 ? 52 : 55}" text-anchor="middle" class="rs-ring-num${s.big.length > 6 ? " sm" : ""}">${e(s.big)}</text></svg>`;
  };
  const share = (key, yes, valid = () => true) => { const list = answered.filter((r) => A(r)[key] != null && valid(A(r)[key])); return show(list.filter((r) => yes(A(r)[key])).length, list.length); };
  // Which questionnaire question(s) each headline figure comes from.
  const REFS = {
    "Practical value: a lot or a great deal": ["o_value"], "Couldn’t have done it, or only later or less well": ["o_without"], "“First test”: high value they couldn’t reach alone": ["o_value", "o_without"],
    "Received less than the time they gave": ["o_worth"], "Decided mostly or equally by the organisation": ["o_decided"], "Can use it without outside help": ["o_maintain"],
    "Need matched the real work (mostly or completely)": ["p_match"], "Got what they needed from the organisation": ["p_support"], "Work took more time than planned": ["p_time"], "Would take on another need": ["p_again"],
    "Helped them do more or better for the people they serve": ["m_helped"],
  };
  const qInfo = (id) => { for (const k of ["organisation", "professional", "six_months"]) { const i = QUESTIONS[k].findIndex((q) => q.id === id); if (i >= 0) return { n: k === "six_months" ? (QUESTIONS[k][i].when === "no" ? "2a" : "2b") : String(i + 1), q: QUESTIONS[k][i].q }; } return null; };
  const refHtml = (title) => {
    if (title === "Raised a concern") { const info = qInfo(pro ? "p_concern" : "o_concern"); return `<span class="rs-ref"><span class="rs-qn">Q${info.n}</span><span>${e(info.q)}</span></span>`; }
    if (title === "Response rate") return `<span class="rs-ref"><span class="rs-qn rs-qn-all">All</span><span>Everyone asked after a finished contribution</span></span>`;
    if (title === "Students or early career") return `<span class="rs-ref"><span class="rs-qn rs-qn-all">Profile</span><span>Career stage, asked once</span></span>`;
    if (title === "Still in use after 6 months") return `<span class="rs-ref"><span class="rs-qn">Q1</span><span>Are you still using what was delivered?</span></span>`;
    const ids = REFS[title] || [];
    return ids.length ? `<span class="rs-ref">${ids.map((id) => { const info = qInfo(id); return `<span class="rs-qn">Q${info.n}</span>`; }).join("")}<span>${ids.map((id) => e(qInfo(id).q)).join(" + ")}</span></span>` : "";
  };
  const CRIT = {
    "Practical value: a lot or a great deal": "answered “A lot” or “A great deal”",
    "Couldn’t have done it, or only later or less well": "answered “Ourselves, but later or less well” or “It would not have been done”",
    "“First test”: high value they couldn’t reach alone": "gave both of those answers",
    "Can use it without outside help": "answered “Yes” or “Yes, with a little help”",
    "Decided mostly or equally by the organisation": "answered “Mostly us” or “Both equally”",
    "Received less than the time they gave": "answered “Much less” or “A bit less”",
    "Raised a concern": "answered “Yes”",
    "Need matched the real work (mostly or completely)": "answered “Mostly” or “Completely”",
    "Got what they needed from the organisation": "answered “Mostly” or “Yes”",
    "Work took more time than planned": "answered “A bit more” or “Much more”",
    "Would take on another need": "answered “Yes, in the next 3 months” or “Yes, later”",
    "Students or early career": "are students or early career",
    "Still in use after 6 months": "answered “Yes”",
    "Helped them do more or better for the people they serve": "answered “Yes, clearly” or “Somewhat”",
    "Response rate": "answered the questionnaire",
  };
  const critLine = (title, s) => {
    if (!s.n || s.ring == null) return s.sub ? `<span class="small muted">${s.sub}</span>` : "";
    const c = CRIT[title] || "";
    const lead = s.n >= 30 ? `${Math.round(s.ring * 100)}% of ${s.n}` : `${s.k} of ${s.n}`;
    return `<span class="rs-crit"><span>${e(lead)}</span> <span>${e(c)}</span></span>`;
  };
  const tile = (title, s, note, warn = false) => `<div class="rs-tile${warn ? " warn" : ""}" title="${e(s.n ? `${s.k} of ${s.n} answers` : "No answers yet")}">${ringSvg({ ...s, label: t(String(title).replace(/<[^>]*>/g, "")) }, warn)}<div class="stack" style="--gap:4px;min-width:0">${refHtml(title)}<span class="rs-tile-t">${title}</span>${critLine(title, s)}${note ? `<span class="small muted rs-note">${note}</span>` : ""}</div></div>`;
  const rate = show(answered.length, base.length);

  const qNum = (q) => (tab === "six_months" ? (q.when === "no" ? "2a" : "2b") : String(QUESTIONS[tab].indexOf(q) + 1));
  // One round chart per question, in questionnaire order: every answer option is a slice, with counts beside it.
  const CAT = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948"];
  const RAMP = { 4: ["#7fc2b2", "#3f9c8b", "#18786a", "#0a4a42"], 5: ["#8fcabc", "#5bb09f", "#2f8f7f", "#146f62", "#0a4a42"] };
  const NEUTRAL = ["not_sure", "too_early", "nothing_yet", "nothing", "none"];
  const donut = (slices, total, center, sub) => {
    const r = 38, c = 2 * Math.PI * r, sum = slices.reduce((t, x) => t + x.k, 0);
    let off = 0;
    const gap = slices.filter((x) => x.k).length > 1 ? 2 : 0;
    const arcs = sum ? slices.filter((x) => x.k).map((x) => { const len = (x.k / sum) * c; const seg = `<circle cx="48" cy="48" r="${r}" fill="none" stroke="${x.color}" stroke-width="14" stroke-dasharray="${Math.max(0, len - gap).toFixed(2)} ${(c - Math.max(0, len - gap)).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 48 48)"><title>${e(x.label)}: ${x.k}</title></circle>`; off += len; return seg; }).join("") : "";
    return `<svg class="rs-donut" viewBox="0 0 96 96" role="img" aria-label="${e(center)} ${e(sub)}"><circle cx="48" cy="48" r="${r}" fill="none" stroke="#ece7dc" stroke-width="14"/>${arcs}<text x="48" y="48" text-anchor="middle" class="rs-donut-n">${e(center)}</text><text x="48" y="62" text-anchor="middle" class="rs-donut-s">${e(sub)}</text></svg>`;
  };
  const qCard = (num, qtext, opts, picked, n, extra = "", isMulti = false) => {
    const hide = filtered && n > 0 && n < 5;
    const scale = opts.isScale, ramp = RAMP[opts.list.length];
    let ci = 0;
    const slices = opts.list.map(([v, label], i) => ({ v, label, k: picked(v), color: NEUTRAL.includes(v) ? "#b8b2a6" : scale && ramp ? ramp[i] : CAT[ci++ % CAT.length] }));
    const legend = slices.map((x) => `<li><span class="rs-sw" style="background:${x.color}"></span><span class="rs-lg-l">${e(x.label)}</span><span class="rs-lg-v">${hide ? "" : n >= 30 && !isMulti ? `${Math.round((x.k / n) * 100)}%` : x.k}</span></li>`).join("");
    return `<div class="rs-qc"><div class="rs-qc-head"><span class="rs-qn">${num}</span><span class="rs-qc-q">${e(qtext)}</span></div>
      <div class="rs-qc-body">${hide ? `<p class="small muted">Too few answers to show with this filter.</p>` : `${donut(slices, n, String(n), n === 1 ? "answer" : "answers")}<ul class="rs-legend">${legend}</ul>`}</div>${extra}${isMulti ? `<p class="small muted rs-qc-note">People could choose several; the chart shows all choices made.</p>` : ""}</div>`;
  };
  const cardFor = (q) => {
    const list = answered.filter((r) => A(r)[q.id] != null && (q.type !== "multi" || A(r)[q.id].length));
    const opts = { list: optionsOf(q), isScale: q.type === "scale" };
    const picked = (v) => list.filter((r) => (q.type === "multi" ? A(r)[q.id].includes(v) : A(r)[q.id] === v)).length;
    const avg = q.type === "scale" && list.length ? `<p class="small muted rs-qc-note">Average ${(list.reduce((t, r) => t + Number(A(r)[q.id]), 0) / list.length).toFixed(1)} of ${opts.list.length}</p>` : "";
    return qCard(`Q${qNum(q)}`, q.q, opts, picked, list.length, avg, q.type === "multi");
  };
  const rateCard = () => `<div class="rs-qc"><div class="rs-qc-head"><span class="rs-qn rs-qn-all">All</span><span class="rs-qc-q">Response rate: everyone asked after a finished contribution</span></div><div class="rs-qc-body">${donut([{ label: "Answered", k: answered.length, color: "#0f6f63" }, { label: "Skipped", k: skipped, color: "#eb6834" }, { label: "Not answered yet", k: Math.max(0, base.length - answered.length - skipped), color: "#ece7dc" }], base.length, `${answered.length}/${base.length}`, "answered")}<ul class="rs-legend"><li><span class="rs-sw" style="background:#0f6f63"></span><span class="rs-lg-l">Answered</span><span class="rs-lg-v">${answered.length}</span></li><li><span class="rs-sw" style="background:#eb6834"></span><span class="rs-lg-l">Skipped</span><span class="rs-lg-v">${skipped}</span></li><li><span class="rs-sw" style="background:#ece7dc"></span><span class="rs-lg-l">Not answered yet</span><span class="rs-lg-v">${Math.max(0, base.length - answered.length - skipped)}</span></li></ul></div></div>`;
  // Top: one ring per question, counting how many people answered it. Below: the answers themselves, as bars.
  const ringCard = (num, qtext, k, n, sub) => { const st = show(k, n); return `<div class="rs-tile rs-ring-card" title="${e(n ? `${k} of ${n}` : "No answers yet")}">${ringSvg({ ...st, label: `${t(num)} ${t(String(qtext).replace(/<[^>]*>/g, ""))}` })}<div class="stack" style="--gap:4px;min-width:0"><span class="rs-ref"><span class="rs-qn${/^Q/.test(num) ? "" : " rs-qn-all"}">${num}</span></span><span class="rs-tile-t">${e(qtext)}</span><span class="small muted">${n ? e(sub) : "No answers yet"}</span></div></div>`; };
  const answeredQ = (q) => answered.filter((r) => A(r)[q.id] != null && (q.type !== "multi" || A(r)[q.id].length)).length;
  let tiles = "";
  if (tab === "six_months") {
    tiles = ringCard("Q1", "Are you still using what was delivered?", base.length, base.length, `${base.length} of ${base.length} six-month checks answered`)
      + QUESTIONS.six_months.map((q) => { const shownTo = base.filter((r) => (q.when === "yes" ? r.still_in_use : !r.still_in_use)).length; return ringCard(`Q${qNum(q)}`, q.q, answeredQ(q), shownTo, `${answeredQ(q)} of ${shownTo} answered (${q.when === "yes" ? "asked if still in use" : "asked if not in use"})`); }).join("");
  } else {
    tiles = ringCard("All", "Response rate", answered.length, base.length, `${answered.length} of ${base.length} answered · ${skipped} skipped`)
      + QUESTIONS[tab].map((q) => { const k = answeredQ(q); return ringCard(`Q${qNum(q)}`, q.q, k, answered.length, `${k} of ${answered.length} answered this question`); }).join("");
    if (tab === "professional") {
      const staged = rows.filter((r) => r.career_stage).length;
      tiles += ringCard("Profile", "Career stage (asked once, private)", staged, rows.length, `${staged} of ${rows.length} professionals have answered`);
    }
  }
  // The strategy's "first test" combines two answers, so it sits apart from the questions.
  let combined = "";
  if (tab === "organisation") {
    const list = answered.filter((r) => A(r).o_value && A(r).o_without && A(r).o_without !== "not_sure");
    const k = list.filter((r) => Number(A(r).o_value) >= 4 && ["later", "not_done"].includes(A(r).o_without)).length;
    combined = `<div class="rs-combined"><strong>Strategy’s “first test”</strong><span>${list.length ? (filtered && list.length < 5 ? "Too few answers to show with this filter." : `${list.length >= 30 ? `${Math.round((k / list.length) * 100)}%` : `${k} of ${list.length}`} organisations said the work created a lot or a great deal of value (Q1) and that they couldn’t have done it, or only later or less well, without Handova (Q2).`) : "No answers yet."}</span></div>`;
  }

  // Answers per question.
  const qs = QUESTIONS[tab];
  // Question numbers as they appear in the questionnaire (six months: Q1 still in use, then Q2a if no / Q2b if yes).
  const qTitle = (q) => `<h3><span class="rs-qn">Q${qNum(q)}</span> ${e(q.q)}${q.when ? ` <span class="rs-when">${q.when === "no" ? "Asked if not in use" : "Asked if still in use"}</span>` : ""}</h3>`;
  const qBlock = (q) => {
    const list = answered.filter((r) => A(r)[q.id] != null && (q.type !== "multi" || A(r)[q.id].length));
    if (q.type === "open") {
      const texts = list.map((r) => ({ t: A(r)[q.id], r })).sort((a, b) => Date.parse(b.r.completed_at) - Date.parse(a.r.completed_at));
      return `<section class="card rs-q">${qTitle(q)}<p class="small muted">${texts.length} ${texts.length === 1 ? "answer" : "answers"} · shown in the language people wrote in</p>${texts.length ? `<ul class="rs-open">${texts.slice(0, 200).map(({ t, r }) => `<li><p data-no-i18n>${e(t)}</p><span class="small muted">${e(cGroup(r.org_country))} · ${e(date(r.completed_at, { month: "short", year: "numeric" }))}${r.delivered === "partly" ? " · <span>partly delivered</span>" : ""}</span></li>`).join("")}</ul>` : ""}</section>`;
    }
    // Survey-report style: a bar per answer choice, then the table of numbers.
    const n = list.length, hide = filtered && n > 0 && n < 5, many = n >= 30;
    const rowsQ = optionsOf(q).map(([v, lab], i) => {
      const k = list.filter((r) => (q.type === "multi" ? A(r)[q.id].includes(v) : A(r)[q.id] === v)).length;
      return { v, lab, k, pct: n ? (k / n) * 100 : 0, i };
    });
    const scale = q.type === "scale";
    const steps = rowsQ.length;
    const tone = () => "rs-t4";
    const bars = rowsQ.map((x) => `<div class="rs-bar" title="${e(`${t(x.lab)}: ${t(`${x.k} of ${n}`)}`)}"><span class="rs-bar-l">${e(x.lab)}</span><span class="rs-bar-t"><span class="${tone(x.i)}" style="width:${hide ? 0 : x.pct.toFixed(1)}%"></span></span><span class="rs-bar-v">${hide ? "" : many ? `${Math.round(x.pct)}%` : x.k}</span></div>`).join("");
    const avg = scale && n && !hide ? (list.reduce((t, r) => t + Number(A(r)[q.id]), 0) / n) : null;
    const table = `<table class="rs-table"><thead><tr><th scope="col">Answer choices</th>${many ? '<th scope="col">Responses</th>' : ""}<th scope="col">${many ? "Count" : "Responses"}</th></tr></thead><tbody>${rowsQ.map((x) => `<tr><td>${e(x.lab)}</td>${many ? `<td>${Math.round(x.pct)}%</td>` : ""}<td>${hide ? "–" : x.k}</td></tr>`).join("")}</tbody><tfoot><tr><td>Answered</td>${many ? "<td></td>" : ""}<td>${n}</td></tr></tfoot></table>`;
    return `<section class="card rs-q"><div class="row between" style="align-items:flex-start;gap:12px">${qTitle(q)}${avg != null ? `<span class="rs-avg">Average <strong>${avg.toFixed(1)}</strong> of ${steps}</span>` : ""}</div>
      <p class="small muted">${n ? `${n} ${n === 1 ? "answer" : "answers"}` : "No answers yet"}${q.type === "multi" ? " · people could choose several, so totals can pass 100%" : ""}${n && !many ? " · counts until 30 answers, then percentages" : ""}</p>
      ${hide ? `<p class="small muted">Too few answers to show with this filter.</p>` : `<div class="rs-chart">${bars}</div><details class="rs-numbers"><summary>Show the numbers</summary>${table}</details>`}</section>`;
  };

  const stillBlock = () => {
    const n = base.length, yes = base.filter((r) => r.still_in_use).length, hide = filtered && n > 0 && n < 5, many = n >= 30;
    const bar = (lab, k, cls) => `<div class="rs-bar"><span class="rs-bar-l">${lab}</span><span class="rs-bar-t"><span class="${cls}" style="width:${hide || !n ? 0 : ((k / n) * 100).toFixed(1)}%"></span></span><span class="rs-bar-v">${hide ? "" : many ? `${Math.round((k / n) * 100)}%` : k}</span></div>`;
    return `<section class="card rs-q"><h3><span class="rs-qn">Q1</span> Are you still using what was delivered?</h3><p class="small muted">${n ? `${n} ${n === 1 ? "answer" : "answers"}` : "No answers yet"}</p>${hide ? `<p class="small muted">Too few answers to show with this filter.</p>` : `<div class="rs-chart">${bar("Yes", yes, "rs-t4")}${bar("No", n - yes, "rs-t1")}</div>`}</section>`;
  };
  // Every response, with who answered, so Handova can check or delete one.
  const responsesList = () => {
    const list = base.filter((r) => got(r)).sort((a, b) => Date.parse(got(b).created_at) - Date.parse(got(a).created_at));
    const label = (q, v) => { if (v == null || (Array.isArray(v) && !v.length)) return ""; if (q.type === "open") return `<span data-no-i18n>${e(v)}</span>`; const o = optionsOf(q); return (Array.isArray(v) ? v : [v]).map((x) => e((o.find(([c]) => c === x) || [x, x])[1])).join(", "); };
    const who = (r) => (pro ? r.pro_name : r.org_name) || (pro ? "Professional" : "Organisation");
    const rowsHtml = list.map((r) => {
      const resp = got(r), a = resp.answers || {};
      const answersHtml = tab === "six_months"
        ? `<dl class="rs-ans"><dt>Q1 Are you still using what was delivered?</dt><dd>${r.still_in_use ? "Yes" : "No"}</dd>${QUESTIONS.six_months.filter((q) => a[q.id] != null).map((q) => `<dt>Q${qNum(q)} ${e(q.q)}</dt><dd>${label(q, a[q.id])}</dd>`).join("")}</dl>`
        : `<dl class="rs-ans">${QUESTIONS[tab].map((q) => `<dt>Q${qNum(q)} ${e(q.q)}</dt><dd>${label(q, a[q.id]) || '<span class="muted">No answer</span>'}</dd>`).join("")}</dl>`;
      return `<details class="rs-resp"><summary><span class="stack" style="--gap:2px;min-width:0"><strong data-no-i18n>${e(who(r))}</strong><span class="small muted"><span data-no-i18n>${e(r.need_title || "")}</span> · ${e(date(resp.created_at))}${resp.short_form ? " · <span>short version</span>" : ""}</span></span>${resp.status === "skipped" ? pill("Skipped", "grey") : pill("Answered")}<span class="c-toggle" aria-hidden="true"></span></summary>
        <div class="rs-resp-body">${resp.status === "skipped" ? '<p class="small muted">They chose to skip the questionnaire.</p>' : answersHtml}<div class="row" style="--gap:8px;margin-top:10px"><button class="btn secondary sm danger-outline" type="button" data-action="rs-del" data-id="${e(resp.id)}" data-who="${e(who(r))}">Delete this response</button></div></div></details>`;
    }).join("");
    return `<p class="small muted">Who answered what. Open a response to see each answer. Only Handova sees names; downloads and reports stay anonymous.</p><section class="card">${list.length ? rowsHtml : '<p class="muted">No responses yet.</p>'}</section>`;
  };
  const concerns = answered.filter((r) => A(r).o_concern === "yes" || A(r).p_concern === "yes");
  const sel = (name, lab, list, v) => `<label class="field rs-filter"><span>${lab}</span><select name="${name}">${list.map(([k, t]) => `<option value="${e(k)}" ${k === v ? "selected" : ""}>${e(t)}</option>`).join("")}</select></label>`;
  const individual = params.get("view") === "individual";
  const nResp = base.filter((r) => got(r)).length;
  const q = (over) => { const p = new URLSearchParams({ tab, ...f, ...(individual ? { view: "individual" } : {}), ...over }); [...p.keys()].forEach((k) => { if (!p.get(k) || p.get(k) === "all") p.delete(k); }); return `#admin-responses?${p}`; };

  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="stack" style="--gap:22px">
    ${back("Admin", "#admin")}
    <div class="row between" style="align-items:flex-end"><div>${eyebrow("Questionnaires")}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">What people tell us</h1><p class="muted">Answers after each finished contribution. Only Handova sees this page. Wording version ${e(SURVEY_VERSION)}.</p></div>
      <div class="row" style="--gap:8px"><button class="btn secondary sm" type="button" data-action="rs-export" data-tab="${tab}">${icon("download", 16)} Download answers (CSV)</button><button class="btn secondary sm" type="button" data-action="rs-codebook">${icon("download", 16)} Codebook</button></div></div>
    <nav class="rs-tabs" aria-label="Questionnaire">${TABS.map(([k, t]) => `<a href="#admin-responses?${new URLSearchParams({ tab: k, ...(f.period !== "all" ? { period: f.period } : {}), ...(individual ? { view: "individual" } : {}) })}" ${k === tab ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
    <form class="rs-filters" data-rs-filters>
      ${sel("period", "Period", PERIODS, f.period)}
      ${sel("country", pro ? "Professional’s country" : "Organisation’s country", [["", "All countries"], ...countries.map((c) => [c, c])], f.country)}
      ${pro ? sel("stage", "Career stage", [["", "Any stage"], ...CAREER_STAGES], f.stage) : sel("staff", "Paid staff", [["", "Any size"], ...STAFF_SIZES], f.staff)}
      ${pro ? sel("hours", "Size of the need", [["", "Any size"], ...HOURS], f.hours) : sel("orgtype", "Type of organisation", [["", "Any type"], ...orgTypes.map((x) => [x, x])], f.orgtype)}
      ${sel("delivered", "Delivered", [["", "All"], ["everything", "Everything agreed"], ["partly", "Partly"]], f.delivered)}
    </form>
    <p class="small muted">Under 30 answers we show counts, not percentages. With a filter applied, groups with fewer than 5 answers are hidden. Countries with fewer than 3 ${pro ? "professionals" : "organisations"} are grouped as “Other countries”.</p>
    <nav class="rs-view" aria-label="View"><a href="${q({ view: "" })}" ${individual ? "" : 'aria-current="page"'}>${icon("chart", 16)}<span>Summary and charts</span></a><a href="${q({ view: "individual" })}" ${individual ? 'aria-current="page"' : ""}>${icon("people", 16)}<span>See each response</span> <strong>${nResp}</strong></a></nav>
    ${individual ? responsesList() : `<div class="rs-tiles">${tiles}</div>${combined}
    <h2 class="card-title" style="margin-top:8px">Answers to each question</h2><div class="rs-grid">${tab === "six_months" ? stillBlock() : ""}${qs.filter((x) => x.type !== "open").map(qBlock).join("")}</div>
    ${concerns.length && tab !== "six_months" ? `<section class="card"><h2 class="card-title">${icon("shield", 20, "#7a4f0e")} Concerns raised in questionnaires</h2><p class="small muted">Follow up through safeguarding. These are not formal reports unless the person also reported it.</p>${concerns.map((r) => `<div class="list-row"><span class="stack" style="--gap:2px"><strong data-no-i18n>${e(r.need_title || "")}</strong><span class="small muted">${e(date(r.completed_at))} · <span>${A(r).o_concern === "yes" ? "the organisation" : "the professional"}</span></span></span>${pill("Concern", "clay")}</div>`).join("")}</section>` : ""}
    ${answered.length ? "" : `<p class="small muted">${tab === "six_months" ? "No answers yet. Answers appear here after six-month checks." : "No answers yet. Answers appear here after contributions are finished and people answer the questionnaire."}</p>`}
    ${qs.some((x) => x.type === "open") ? `<h2 class="card-title" style="margin-top:8px">Written answers</h2><div class="rs-grid rs-grid-open">${qs.filter((x) => x.type === "open").map(qBlock).join("")}</div>` : ""}
    `}
  </div></div>`;
  return {
    title: "Questionnaire answers", html,
    after: () => {
      const form = document.querySelector("[data-rs-filters]");
      form?.addEventListener("change", () => { const fd = new FormData(form); const o = {}; for (const [k, v] of fd) o[k] = String(v); location.hash = q(o); });
    },
  };
}

// ---- Exports ----
const csvCell = (v) => { const s = v == null ? "" : String(v); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const download = (name, rows) => {
  const blob = new Blob(["﻿" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};
// Pseudonymous, stable IDs: the first 12 characters of a SHA-256 of the real ID.
async function pid(v) {
  if (!v) return "";
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("handova:" + v));
  return [...new Uint8Array(h)].slice(0, 6).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// One row per finished contribution, so non-response can be analysed too.
export async function exportCsv(tab) {
  const all = cache || await result(db.rpc("admin_survey_data"));
  const qs = QUESTIONS[tab] || QUESTIONS.organisation;
  const orgsBy = {};
  all.forEach((r) => { (orgsBy[r.org_country || "Unknown"] ||= new Set()).add(r.organisation_id); });
  const cGroup = (c) => (orgsBy[c || "Unknown"]?.size >= 3 ? c : "Other countries");
  const cols = [];
  for (const q of qs) {
    if (q.type === "multi") optionsOf(q).forEach(([v]) => cols.push([`${q.id}__${v}`, (a) => (a[q.id] ? (a[q.id].includes(v) ? 1 : 0) : "")]));
    else cols.push([q.id, (a) => a[q.id] ?? ""]);
  }
  const head = ["contribution_id", "organisation_id", "professional_id", "status", "short_form", "q_version", "answer_lang", "answered_at", "completed_month", "org_country_group", "org_type", "staff_size", "pro_country_group", "career_stage", "hours_planned", "hours_approved", "delivered", "still_in_use_6m", "would_welcome_again", "consent_contact_org", "consent_contact_pro", ...cols.map(([k]) => k)];
  const out = [head];
  for (const r of all) {
    const resp = r[RESP[tab]] || null, a = resp?.answers || {};
    if (tab === "six_months" && !r.followup_answered_at) continue;
    out.push([await pid(r.engagement_id), await pid(r.organisation_id), await pid(r.professional_id), resp?.status || "not_answered", resp ? (resp.short_form ? 1 : 0) : "", resp?.q_version || "", resp?.lang || "", resp?.created_at || "",
      String(r.completed_at || "").slice(0, 7), cGroup(r.org_country), r.org_type || "", r.staff_size || "", cGroup(r.pro_country), r.career_stage || "", r.hours_planned ?? "", r.hours_approved ?? "", r.delivered || "",
      r.still_in_use == null ? "" : r.still_in_use ? 1 : 0, r.work_again || "", r.research_contact_org == null ? "" : r.research_contact_org ? 1 : 0, r.research_contact_pro == null ? "" : r.research_contact_pro ? 1 : 0,
      ...cols.map(([, fn]) => fn(a))]);
  }
  download(`handova-${tab}-answers-${new Date().toISOString().slice(0, 10)}.csv`, out);
}
export function exportCodebook() {
  const out = [["questionnaire", "question_id", "type", "question", "code", "label", "version"]];
  for (const [kind, qs] of Object.entries(QUESTIONS)) for (const q of qs) {
    if (q.type === "open") out.push([kind, q.id, "open", q.q, "", "free text", SURVEY_VERSION]);
    else optionsOf(q).forEach(([v, lab]) => out.push([kind, q.id, q.type, q.q, v, lab, SURVEY_VERSION]));
  }
  [["context", "staff_size", STAFF_SIZES], ["context", "career_stage", CAREER_STAGES]].forEach(([k, id, list]) => list.forEach(([v, lab]) => out.push([k, id, "single", id, v, lab, ""])));
  out.push(["context", "status", "single", "Questionnaire status", "submitted / skipped / not_answered", "", ""]);
  out.push(["context", "multi-select columns", "", "question_id__code = 1 if chosen, 0 if not, empty if the question was not answered", "", "", ""]);
  download(`handova-questionnaire-codebook-${SURVEY_VERSION}.csv`, out);
}

export function deleteResponseDialog(id, who) {
  openDialog("Delete this response?", `<form class="form" data-form="rs-del" data-id="${e(id)}">
    <p><span>The answers from</span> <strong data-no-i18n>${e(who)}</strong> <span>are removed from the dashboard and downloads. This can’t be undone.</span></p>
    <label class="check"><input type="checkbox" name="again" checked><span>Ask them to answer again (if the contribution finished in the last 60 days)</span></label>
    ${formEnd("Delete response", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`).replace('class="btn"', 'class="btn danger"')}</form>`);
}
export async function submitDeleteResponse(form) {
  await withForm(form, async (fd) => {
    await result(db.rpc("admin_delete_survey_response", { p_id: form.dataset.id, p_ask_again: fd.has("again") }));
    closeDialog(); toast("Response deleted."); go(location.hash);
  });
}
