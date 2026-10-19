// Post-contribution questionnaires (designed with MEAL, evaluation, qualitative and quantitative specialists).
// Short, optional, one page. Answers are stored against the contribution, never shown to the other party, and only
// reported in totals. Wording is frozen per version: change SURVEY_VERSION whenever a question or option changes.
export const SURVEY_VERSION = "2026-10-v1";

const SCALE_HARDEST = [["none", "None"], ["need", "Writing the need"], ["choosing", "Choosing a professional"], ["agreement", "The agreement"], ["first_call", "The first call"], ["working", "Working together"], ["hours", "Approving hours"], ["finishing", "Finishing and endorsing"]];

// type: scale (ordinal, coded 1..n, negative to positive), single, multi (exclusive options last), open.
// core: asked in the short version (organisations that already answered a full questionnaire in the last 90 days).
export const QUESTIONS = {
  organisation: [
    { id: "o_value", type: "scale", core: true, q: "How much practical value did this work create for your organisation?", options: ["None", "A little", "Some", "A lot", "A great deal"] },
    { id: "o_without", type: "single", core: true, q: "Without Handova, what would most likely have happened to this work?", options: [["same", "We would have done it ourselves, about as well and as soon"], ["later", "Ourselves, but later or less well"], ["paid", "We would have paid someone"], ["other_help", "Another volunteer or partner"], ["not_done", "It would not have been done"], ["not_sure", "Not sure"]] },
    { id: "o_changed", type: "multi", q: "What has changed so far because of this work?", hint: "Choose all that apply.", options: [["tool", "We use a new tool, template or system"], ["skill", "Our team learned a new skill"], ["time", "We save staff time"], ["funding", "Stronger funding applications or donor contacts"], ["comms", "Better communication or brand"], ["organised", "Our work is better organised"], ["nothing_yet", "Nothing yet"], ["too_early", "Too early to say"]], exclusive: ["nothing_yet", "too_early"] },
    { id: "o_maintain", type: "single", q: "Can your team use, update or adapt it without outside help?", options: [["yes", "Yes"], ["little_help", "Yes, with a little help"], ["not_yet", "Not yet"], ["not_sure", "Not sure"]] },
    { id: "o_decided", type: "single", q: "Who decided how the work was done?", options: [["us", "Mostly us"], ["both", "Both equally"], ["professional", "Mostly the professional"]] },
    { id: "o_worth", type: "scale", core: true, q: "Compared with the time your team gave, what you received was…", options: ["Much less", "A bit less", "About the same", "A bit more", "Much more"] },
    { id: "o_hardest", type: "single", q: "Which step, if any, was hardest?", options: SCALE_HARDEST },
    { id: "o_concern", type: "single", core: true, q: "Did anything make you uncomfortable or concerned?", options: [["no", "No"], ["yes", "Yes"]] },
    { id: "o_can_now", type: "open", q: "What can your organisation do now that it could not do before? One example.", hint: "Optional. Write in any language you prefer." },
    { id: "o_improve", type: "open", core: true, q: "Most contributions have something that could work better. What one thing would have made this more useful?", hint: "Optional. Write in any language you prefer." },
  ],
  professional: [
    { id: "p_match", type: "scale", q: "How well did the need description match the real work?", options: ["Not at all", "A little", "Somewhat", "Mostly", "Completely"] },
    { id: "p_support", type: "scale", q: "Did you get what you needed from the organisation (information, access, replies on time)?", options: ["No", "Partly", "Mostly", "Yes"] },
    { id: "p_time", type: "scale", q: "Including time you did not log, the work took…", options: ["Much less than planned", "A bit less", "About as planned", "A bit more", "Much more"] },
    { id: "p_confident", type: "scale", q: "How confident are you that the organisation can use and maintain it without you?", options: ["Not confident", "Somewhat confident", "Confident", "Very confident"] },
    { id: "p_gained", type: "multi", q: "What did you gain?", hint: "Choose all that apply.", options: [["skills", "New or stronger skills"], ["sector", "Experience in a new sector or country"], ["cv", "Evidence for my CV"], ["contacts", "Professional contacts"], ["purpose", "A sense of purpose"], ["nothing", "Nothing in particular"]], exclusive: ["nothing"] },
    { id: "p_again", type: "single", q: "Would you take on another need on Handova?", options: [["soon", "Yes, in the next 3 months"], ["later", "Yes, later"], ["not_sure", "Not sure"], ["no", "No"]] },
    { id: "p_hardest", type: "single", q: "Which step, if any, was hardest?", options: SCALE_HARDEST },
    { id: "p_concern", type: "single", q: "Did anything make you uncomfortable or concerned?", options: [["no", "No"], ["yes", "Yes"]] },
    { id: "p_hard_moment", type: "open", q: "Think of the hardest moment in this contribution. What would have helped?", hint: "Optional. Write in any language you prefer." },
  ],
  // Added to the six-month "still in use?" check; one of the two is shown depending on the answer.
  six_months: [
    { id: "m_reason", type: "single", q: "What is the main reason?", when: "no", options: [["not_needed", "We no longer need it"], ["hard_to_use", "It is too hard to use"], ["people_left", "The people who used it left"], ["never_finished", "It was never finished"], ["other", "Something else"]] },
    { id: "m_helped", type: "single", q: "Has it helped you do more or better for the people you serve?", when: "yes", options: [["clearly", "Yes, clearly"], ["somewhat", "Somewhat"], ["not_yet", "Not yet"], ["not_sure", "Not sure"]] },
  ],
};

export const STAFF_SIZES = [["none", "None, volunteers only"], ["1-5", "1–5"], ["6-20", "6–20"], ["21-50", "21–50"], ["50+", "More than 50"]];
export const CAREER_STAGES = [["student", "Student"], ["early", "Early career (under 5 years of work)"], ["mid", "Mid-career (5–10 years)"], ["experienced", "Experienced (10–15 years)"], ["senior", "Senior (over 15 years)"], ["retired", "Retired"], ["break", "Career break or between jobs"]];

// [code, label] for every option; scales are coded "1".."n".
export const optionsOf = (q) => q.type === "scale" ? q.options.map((label, i) => [String(i + 1), label]) : q.options;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function questionHtml(q) {
  if (q.type === "open") return `<div class="field full sv-q"><label for="sv-${q.id}"><span class="sv-title">${esc(q.q)}</span></label><textarea id="sv-${q.id}" name="${q.id}" rows="3" maxlength="1000"></textarea>${q.hint ? `<span class="hint">${esc(q.hint)}</span>` : ""}</div>`;
  const multi = q.type === "multi";
  return `<fieldset class="field full sv-q${q.type === "scale" ? " sv-scale" : ""}"><legend class="sv-title">${esc(q.q)}</legend>${q.hint ? `<span class="hint">${esc(q.hint)}</span>` : ""}<div class="sv-opts">${optionsOf(q).map(([v, label]) => `<label class="sv-opt"><input type="${multi ? "checkbox" : "radio"}" name="${q.id}" value="${esc(v)}" ${multi && (q.exclusive || []).includes(v) ? 'data-exclusive="1"' : ""}><span>${esc(label)}</span></label>`).join("")}</div></fieldset>`;
}

// Read answers from a form: scale/single → string, multi → array, open → trimmed text. Unanswered keys are left out.
export function readAnswers(form, questions) {
  const fd = new FormData(form), out = {};
  for (const q of questions) {
    if (q.type === "multi") { const v = fd.getAll(q.id).map(String); if (v.length) out[q.id] = v; }
    else { const v = String(fd.get(q.id) || "").trim(); if (v) out[q.id] = q.type === "open" ? v.slice(0, 1000) : v; }
  }
  return out;
}

// Ticking "Nothing yet" clears the others, and the reverse.
export function wireExclusive(root) {
  root.querySelectorAll(".sv-q").forEach((fs) => fs.addEventListener("change", (ev) => {
    const t = ev.target;
    if (t.type !== "checkbox" || !t.checked) return;
    fs.querySelectorAll("input[type=checkbox]").forEach((o) => { if (o !== t && (t.dataset.exclusive || o.dataset.exclusive)) o.checked = false; });
  }));
}
