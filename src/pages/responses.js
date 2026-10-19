// Handova only: the post-contribution questionnaires, summarised.
// Small-sample rules (from the survey design): under 30 answers show counts, not percentages; with a filter applied,
// groups under 5 answers are hidden; countries with fewer than 3 organisations are grouped as "Other countries".
import { db, state, result, e } from "../core.js";
import { icon, eyebrow, back, empty, pill } from "../ui.js";
import { date } from "../utils.js";
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
  const ringSvg = (s) => {
    const r = 38, c = 2 * Math.PI * r, f = s.ring == null ? 0 : Math.max(0, Math.min(1, s.ring));
    return `<svg class="rs-ring" viewBox="0 0 96 96" role="img" aria-label="${e(s.big)}"><circle cx="48" cy="48" r="${r}" class="rs-ring-track"/>${f > 0 ? `<circle cx="48" cy="48" r="${r}" class="rs-ring-fill" stroke-dasharray="${(f * c).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 48 48)"/>` : ""}<text x="48" y="${s.big.length > 6 ? 52 : 55}" text-anchor="middle" class="rs-ring-num${s.big.length > 6 ? " sm" : ""}">${e(s.big)}</text></svg>`;
  };
  const share = (key, yes, valid = () => true) => { const list = answered.filter((r) => A(r)[key] != null && valid(A(r)[key])); return show(list.filter((r) => yes(A(r)[key])).length, list.length); };
  const tile = (title, s, note) => `<div class="rs-tile" title="${e(s.n ? `${s.k} of ${s.n} answers` : "No answers yet")}">${ringSvg(s)}<div class="stack" style="--gap:4px;min-width:0"><span class="rs-tile-t">${title}</span>${s.sub ? `<span class="small muted">${s.sub}</span>` : ""}${note ? `<span class="small muted rs-note">${note}</span>` : ""}</div></div>`;
  const rate = show(answered.length, base.length);

  let tiles = "";
  if (tab === "organisation") {
    const first = (() => { const list = answered.filter((r) => A(r).o_value && A(r).o_without && A(r).o_without !== "not_sure"); return show(list.filter((r) => Number(A(r).o_value) >= 4 && ["later", "not_done"].includes(A(r).o_without)).length, list.length); })();
    tiles = [
      tile("Response rate", rate, `${skipped} skipped · ${base.length} finished contributions`),
      tile("Practical value: a lot or a great deal", share("o_value", (v) => Number(v) >= 4)),
      tile("Couldn’t have done it, or only later or less well", share("o_without", (v) => ["later", "not_done"].includes(v), (v) => v !== "not_sure"), "Leaves out “Not sure”"),
      tile("“First test”: high value they couldn’t reach alone", first, "Value a lot or more AND later, less well or not done"),
      tile("Received less than the time they gave", share("o_worth", (v) => Number(v) <= 2), "Early warning for extractive work"),
      tile("Decided mostly or equally by the organisation", share("o_decided", (v) => v !== "professional")),
      tile("Can use it without outside help", share("o_maintain", (v) => v === "yes" || v === "little_help", (v) => v !== "not_sure")),
      tile("Raised a concern", share("o_concern", (v) => v === "yes")),
    ].join("");
  } else if (tab === "professional") {
    const staged = rows.filter((r) => r.career_stage);
    tiles = [
      tile("Response rate", rate, `${skipped} skipped · ${base.length} finished contributions`),
      tile("Need matched the real work (mostly or completely)", share("p_match", (v) => Number(v) >= 4)),
      tile("Got what they needed from the organisation", share("p_support", (v) => Number(v) >= 3)),
      tile("Work took more time than planned", share("p_time", (v) => Number(v) >= 4), "Hidden overwork"),
      tile("Would take on another need", share("p_again", (v) => v === "soon" || v === "later", (v) => v !== "not_sure")),
      tile("Students or early career", show(staged.filter((r) => ["student", "early"].includes(r.career_stage)).length, staged.length), "Of professionals with a known career stage"),
      tile("Raised a concern", share("p_concern", (v) => v === "yes")),
    ].join("");
  } else {
    const fu = base;
    tiles = [
      tile("Still in use after 6 months", show(fu.filter((r) => r.still_in_use).length, fu.length), "Answered six-month checks"),
      tile("Helped them do more or better for the people they serve", share("m_helped", (v) => v === "clearly" || v === "somewhat", (v) => v !== "not_sure"), "Only asked when still in use"),
    ].join("");
  }

  // Answers per question.
  const qs = QUESTIONS[tab];
  // Question numbers as they appear in the questionnaire (six months: Q1 still in use, then Q2a if no / Q2b if yes).
  const qNum = (q) => (tab === "six_months" ? (q.when === "no" ? "2a" : "2b") : String(QUESTIONS[tab].indexOf(q) + 1));
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
    const tone = (i) => (scale ? `rs-t${Math.round((i / Math.max(1, steps - 1)) * 4)}` : "rs-t4");
    const bars = rowsQ.map((x) => `<div class="rs-bar" title="${e(`${x.lab}: ${x.k} of ${n}`)}"><span class="rs-bar-l">${e(x.lab)}</span><span class="rs-bar-t"><span class="${tone(x.i)}" style="width:${hide ? 0 : x.pct.toFixed(1)}%"></span></span><span class="rs-bar-v">${hide ? "" : many ? `${Math.round(x.pct)}%` : x.k}</span></div>`).join("");
    const avg = scale && n && !hide ? (list.reduce((t, r) => t + Number(A(r)[q.id]), 0) / n) : null;
    const table = `<table class="rs-table"><thead><tr><th scope="col">Answer choices</th>${many ? '<th scope="col">Responses</th>' : ""}<th scope="col">${many ? "" : "Responses"}</th></tr></thead><tbody>${rowsQ.map((x) => `<tr><td>${e(x.lab)}</td>${many ? `<td>${Math.round(x.pct)}%</td>` : ""}<td>${hide ? "–" : x.k}</td></tr>`).join("")}</tbody><tfoot><tr><td>Answered</td>${many ? "<td></td>" : ""}<td>${n}</td></tr></tfoot></table>`;
    return `<section class="card rs-q"><div class="row between" style="align-items:flex-start;gap:12px">${qTitle(q)}${avg != null ? `<span class="rs-avg">Average <strong>${avg.toFixed(1)}</strong> of ${steps}</span>` : ""}</div>
      <p class="small muted">${n ? `${n} ${n === 1 ? "answer" : "answers"}` : "No answers yet"}${q.type === "multi" ? " · people could choose several, so totals can pass 100%" : ""}${n && !many ? " · counts until 30 answers, then percentages" : ""}</p>
      ${hide ? `<p class="small muted">Too few answers to show with this filter.</p>` : `<div class="rs-chart">${bars}</div><details class="rs-numbers"><summary>Show the numbers</summary>${table}</details>`}</section>`;
  };

  const stillBlock = () => {
    const n = base.length, yes = base.filter((r) => r.still_in_use).length, hide = filtered && n > 0 && n < 5, many = n >= 30;
    const bar = (lab, k, cls) => `<div class="rs-bar"><span class="rs-bar-l">${lab}</span><span class="rs-bar-t"><span class="${cls}" style="width:${hide || !n ? 0 : ((k / n) * 100).toFixed(1)}%"></span></span><span class="rs-bar-v">${hide ? "" : many ? `${Math.round((k / n) * 100)}%` : k}</span></div>`;
    return `<section class="card rs-q"><h3><span class="rs-qn">Q1</span> Are you still using what was delivered?</h3><p class="small muted">${n ? `${n} ${n === 1 ? "answer" : "answers"}` : "No answers yet"}</p>${hide ? `<p class="small muted">Too few answers to show with this filter.</p>` : `<div class="rs-chart">${bar("Yes", yes, "rs-t4")}${bar("No", n - yes, "rs-t1")}</div>`}</section>`;
  };
  const concerns = answered.filter((r) => A(r).o_concern === "yes" || A(r).p_concern === "yes");
  const sel = (name, lab, list, v) => `<label class="field rs-filter"><span>${lab}</span><select name="${name}">${list.map(([k, t]) => `<option value="${e(k)}" ${k === v ? "selected" : ""}>${e(t)}</option>`).join("")}</select></label>`;
  const q = (over) => { const p = new URLSearchParams({ tab, ...f, ...over }); [...p.keys()].forEach((k) => { if (!p.get(k) || p.get(k) === "all") p.delete(k); }); return `#admin-responses?${p}`; };

  const html = `<div class="wrap" style="padding-block:40px 80px"><div class="stack" style="--gap:22px">
    ${back("Admin", "#admin")}
    <div class="row between" style="align-items:flex-end"><div>${eyebrow("Questionnaires")}<h1 style="font-size:clamp(2rem,3.6vw,3rem)">What people tell us</h1><p class="muted">Answers after each finished contribution. Only Handova sees this page. Wording version ${e(SURVEY_VERSION)}.</p></div>
      <div class="row" style="--gap:8px"><button class="btn secondary sm" type="button" data-action="rs-export" data-tab="${tab}">${icon("download", 16)} Download answers (CSV)</button><button class="btn secondary sm" type="button" data-action="rs-codebook">${icon("download", 16)} Codebook</button></div></div>
    <nav class="rs-tabs" aria-label="Questionnaire">${TABS.map(([k, t]) => `<a href="#admin-responses?${new URLSearchParams({ tab: k, ...(f.period !== "all" ? { period: f.period } : {}) })}" ${k === tab ? 'aria-current="page"' : ""}>${t}</a>`).join("")}</nav>
    <form class="rs-filters" data-rs-filters>
      ${sel("period", "Period", PERIODS, f.period)}
      ${sel("country", pro ? "Professional’s country" : "Organisation’s country", [["", "All countries"], ...countries.map((c) => [c, c])], f.country)}
      ${pro ? sel("stage", "Career stage", [["", "Any stage"], ...CAREER_STAGES], f.stage) : sel("staff", "Paid staff", [["", "Any size"], ...STAFF_SIZES], f.staff)}
      ${pro ? sel("hours", "Size of the need", [["", "Any size"], ...HOURS], f.hours) : sel("orgtype", "Type of organisation", [["", "Any type"], ...orgTypes.map((x) => [x, x])], f.orgtype)}
      ${sel("delivered", "Delivered", [["", "All"], ["everything", "Everything agreed"], ["partly", "Partly"]], f.delivered)}
    </form>
    <p class="small muted">Under 30 answers we show counts, not percentages. With a filter applied, groups with fewer than 5 answers are hidden. Countries with fewer than 3 ${pro ? "professionals" : "organisations"} are grouped as “Other countries”.</p>
    <div class="rs-tiles">${tiles}</div>
    ${concerns.length && tab !== "six_months" ? `<section class="card"><h2 class="card-title">${icon("shield", 20, "#7a4f0e")} Concerns raised in questionnaires</h2><p class="small muted">Follow up through safeguarding. These are not formal reports unless the person also reported it.</p>${concerns.map((r) => `<div class="list-row"><span class="stack" style="--gap:2px"><strong data-no-i18n>${e(r.need_title || "")}</strong><span class="small muted">${e(date(r.completed_at))} · <span>${A(r).o_concern === "yes" ? "the organisation" : "the professional"}</span></span></span>${pill("Concern", "clay")}</div>`).join("")}</section>` : ""}
    ${answered.length ? "" : `<p class="small muted">${tab === "six_months" ? "No answers yet. Answers appear here after six-month checks." : "No answers yet. Answers appear here after contributions are finished and people answer the questionnaire."}</p>`}
    <div class="rs-grid">${tab === "six_months" ? stillBlock() : ""}${qs.filter((x) => x.type !== "open").map(qBlock).join("")}</div>
    ${qs.some((x) => x.type === "open") ? `<h2 class="card-title" style="margin-top:8px">Written answers</h2><div class="rs-grid rs-grid-open">${qs.filter((x) => x.type === "open").map(qBlock).join("")}</div>` : ""}
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
