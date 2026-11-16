// For universities (16 Nov 2026; reordered after the conversion review the same day): the pilot offer first, what the
// university gets, the pilot-to-partnership path, real projects and where we are today, the questions a partnerships
// office asks, free places and the student waiting list, why now, who we are, and the form to register interest.
// Same content as the 2-page summary PDF linked from the page; the page is the master version.
import { db, e, result, withForm, val, fieldError } from "../core.js";
import { icon, eyebrow, field, select, formEnd, partnerBadge, needCard, COUNTRIES } from "../ui.js";
import { t, getLang } from "../i18n.js";
import { config } from "../config.js";
import { MS_STATS } from "./public.js";
import { exampleProfile } from "../examples.js";
import { date } from "../utils.js";

const PDF = "assets/handova-for-universities.pdf";
const UPDATED = "2026-11-16";

const STUDENT_LINK = "https://handova.org/#join?role=student";
const MIN_NEEDS = 30;
// Shown instead of live counts while Handova is small: what each pilot can rely on.
const PROMISES = [["By hand", "every match, made personally"], ["3 weeks", "to match each student. If we can’t, we tell you and offer them the next phase"], ["A report", "with real numbers at the end of every pilot"]];
const NEED_COLS = "*, organisation:organisations(id,name,city,country,website,summary,org_type,ethical_bridge_url,logo_url,status)";

const FACTS = [
  ["gift", "Free", "for students and organisations, always"],
  ["clock", "1 to 16 hours", "per project, remote, around classes"],
  ["shield", "Verified", "every organisation, by Ethical Bridge"],
  ["doc", "Credit-ready", "hour logs and evidence; you decide the credit"],
];
const GETS = [
  ["chart", "Employability evidence", "Logged hours, real deliverables and an endorsement from the organisation on each student’s impact CV."],
  ["globe", "International experience at home", "Work with organisations abroad, with no travel budget and no travel risk."],
  ["people", "Wider access", "For students who can’t afford to travel or work unpaid abroad."],
  ["doc", "Reporting you can use", "Evidence for work-integrated learning, community engagement and SDG reporting."],
];
// Free for every student, and what a partner university adds. true = included, false = not included, text = how it differs.
const COMPARE = [
  ["Free for the student", true, true],
  ["Verified organisations and real projects", true, true],
  ["An impact CV with logged hours and endorsements", true, true],
  ["Their data, their choice: download or delete at any time", true, true],
  ["When they start", "On the waiting list: places open in phases", "A reserved place, on your course dates"],
  ["The “Partner university student” tag on their profile", false, true],
  ["Projects matched to your courses, with a learning log", false, true],
  ["Progress reports to your university, if the student agrees", false, true],
  ["A named contact, onboarding for each cohort and a guest session", false, true],
  ["Your university named as a partner, with a co-branded impact report", false, true],
  ["Cost to your university", "Nothing", "The pilot is free; then an annual contribution, agreed with you"],
];
const mark = (v) => v === true ? `<span class="uni-yes">${icon("check", 18, "#0f6f63", 2.4)}<span class="visually-hidden">Included</span></span>` : v === false ? `<span class="uni-no">${icon("x", 16, "#9aa5a2", 2.2)}<span class="visually-hidden">Not included</span></span>` : `<span class="uni-cmp-text">${v}</span>`;
const PATH = [
  ["Intro call and cohort", "20 minutes to see whether Handova fits. Then we agree the cohort (5 to 10 students) and the format: practicum, placement, service-learning or a volunteering award. A 30-minute online onboarding for your students."],
  ["Students deliver", "Your pilot starts with your term, from January 2027 (or February and March for southern-hemisphere terms) and runs 3 months. Each student chooses real projects that match their skills and completes them remotely, with check-ins."],
  ["Real results", "A report with real numbers: projects completed, hours, organisations and countries reached, ratings, outcomes, and what your students and the organisations say."],
  ["A meeting to review", "We go through the results and the benefits together, and decide whether a partnership makes sense for you."],
  ["A partnership, if it fits", "We agree its scope together: how many places, which programmes, the credit format and the reporting you need."],
];
const SAFETY = [
  ["shield", "Verified organisations", "Every organisation meets Ethical Bridge’s published criteria and is checked through personal contact, document checks and, where possible, field visits."],
  ["doc", "Public policies", "Safeguarding, data protection, conduct, anti-harassment, fraud and whistleblowing policies, open to anyone to read."],
  ["eye", "Remote and supported", "All work is remote, messages stay on Handova, and both sides give feedback at the end."],
  ["people", "Who supervises", "The organisation briefs and reviews the work and Handova checks in. Academic supervision and grading stay with you."],
  ["check", "Academic credit", "Projects of 1 to 16 hours can be bundled to about 20, 40 or 80 hours, with a learning log and logged hours as evidence. They complement longer placements rather than replace them. Your university decides the credit."],
  ["lock", "Data and consent", "Students choose whether to share their progress with their university, and can download or delete their data at any time. Data is stored in the European Union (Frankfurt)."],
  ["pen", "Contracts and compliance", "We follow the EU and UK GDPR where they apply, with representatives in the EU and the UK. Before a pilot starts, we agree the terms with your university in writing, including data processing. Each project has its own signed agreement covering who owns the work."],
];
const LAUNCH = [
  ["Now", "Universities register their interest, and students join the waiting list. We review each student’s profile, which shows when they can start."],
  ["From January 2027", "Places open in phases. Founding Partner pilots start first, each with its university’s term."],
  ["Each phase", "Up to 5 free places per university for students who join on their own, and at least half for students in lower-income countries. Everyone else keeps their place in the queue."],
  ["Meanwhile", "Organisations see who is waiting and post projects, so there is real work ready when each student starts."],
];
const INTEREST = [["", "Choose one…"], ["pilot", "A Founding Partner pilot from January 2027"], ["share", "Sharing Handova with our students"], ["other", "Something else"]];
const STUDENT_NOTE_TEXT = "Handova offers free, remote projects with verified organisations around the world: real work for your CV, from wherever you are. Places open in phases from January 2027, in the order students register. Join the waiting list:";
const studentNote = () => `${t(STUDENT_NOTE_TEXT)} ${STUDENT_LINK}`;

// Where Handova stands today, counted live. If a count fails, the line is left out rather than showing a wrong number.
async function today() {
  const count = async (q) => { try { const { count: n, error } = await q; return error ? null : n; } catch { return null; } };
  const [orgs, needs, pros] = await Promise.all([
    count(db.from("organisations").select("id", { count: "exact", head: true }).eq("status", "approved")),
    count(db.from("needs").select("id", { count: "exact", head: true }).eq("status", "open")),
    count(db.from("profiles").select("user_id", { count: "exact", head: true }).eq("published", true).eq("review_status", "approved")),
  ]);
  // Small early counts read badly next to a pilot of 5 to 10 students, so they appear only once open needs reach MIN_NEEDS.
  if (!(needs >= MIN_NEEDS)) return [];
  return [[orgs, "organisations approved"], [needs, "open needs"], [pros, "professionals and students approved"]].filter(([n]) => typeof n === "number");
}
// Three real projects open right now, so staff can picture what their students would do.
// Rough guess at the language a need is written in, from common short words, so the page shows needs in its own language first.
const WORDS = { en: /\b(the|and|to|of|for|with|our|a)\b/gi, es: /\b(el|la|los|las|de|con|para|y|un|una|del)\b/gi, pt: /\b(o|os|as|de|com|para|e|um|uma|do|da)\b/gi, fr: /\b(le|la|les|des|de|avec|pour|et|un|une|du)\b/gi };
const textLang = (s) => Object.entries(WORDS).map(([l, re]) => [l, (String(s).match(re) || []).length]).sort((a, b) => b[1] - a[1])[0][0];
const firstItem = (s) => { const x = String(s || "").split(/\n+/).map((y) => y.trim()).find(Boolean) || ""; if (x.length <= 140) return x; let y = x.slice(0, 137).replace(/\s+\S*$/, ""); while (/[\s,;:]+(and|or|with|for|to|of|the|a|an|y|e|o|et|de|con|para|com|pour|avec)$/i.test(y) || /[,;:]$/.test(y)) y = y.replace(/[\s,;:]*(\b(and|or|with|for|to|of|the|a|an|y|e|o|et|de|con|para|com|pour|avec))?$/i, ""); return y + "…"; };
async function openNeeds() {
  const all = await result(db.from("needs").select(NEED_COLS).eq("status", "open").order("created_at", { ascending: false }).limit(12)).catch(() => []);
  const l = getLang();
  const same = all.filter((n) => textLang(`${n.title} ${n.output || ""}`) === l);
  return [...same, ...all.filter((n) => !same.includes(n))].slice(0, 3).map((n) => ({ ...n, output: firstItem(n.output) }));
}

const toForm = (label, cls = "lg") => `<button class="btn ${cls}" type="button" data-action="scroll-to" data-id="uni-contact">${label}</button>`;

export async function universities() {
  const [nums, needs] = await Promise.all([today(), openNeeds()]);
  const html = `<div class="wrap uni stack" style="--gap:var(--section-gap);padding-bottom:var(--section-gap)">
    <div class="uni-hero">
      <div class="stack" style="--gap:16px">${eyebrow("For universities")}<h1>Real projects for your students, with verified organisations worldwide.</h1></div>
    <div class="how-hero">
      <div class="stack" style="--gap:16px"><p class="lead">Handova gives your students short, remote projects for small, locally led organisations verified by Ethical Bridge, the global directory of ethical organisations behind Handova. Free for students, with no travel costs.</p>
        <p class="uni-status">${icon("calendar", 18, "#0f6f63")}<span><strong>A free 3-month Founding Partner pilot from January 2027:</strong> 5 to 10 students, nothing to pay, no obligation. We are taking up to 3 universities, invited in the order they register.</span></p>
        <div class="row">${toForm("Register interest")}<a class="btn secondary lg" href="${PDF}" download>${icon("download", 18)}<span>2-page summary (PDF)</span></a></div>
        <p class="uni-trust small"><a href="#about/ethical-bridge">${icon("shield", 15)}<span>Run by Ethical Bridge LLC</span></a><a href="#privacy">${icon("lock", 15)}<span>EU and UK GDPR representatives</span></a><a href="#policies">${icon("doc", 15)}<span>Public policies</span></a></p>
      </div>
      <div class="how-facts">${FACTS.map(([ic, t, d]) => `<div class="how-fact"><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><div><strong>${t}</strong><span>${d}</span></div></div>`).join("")}</div>
    </div>
    </div>

    <section class="stack" style="--gap:20px">
      <div class="stack" style="--gap:8px">${eyebrow("What your university gets")}<h2>Real experience for your students, evidence for you.</h2></div>
      <div class="uni-gets">${GETS.map(([ic, t, d]) => `<div class="card stack" style="--gap:8px"><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><strong>${t}</strong><p class="muted small">${d}</p></div>`).join("")}</div>
      <div class="uni-compare card">
        <table>
          <caption class="visually-hidden">Free for every student, and what a partner university adds</caption>
          <thead><tr><th scope="col"><span class="uni-hl-label">Compare</span></th>
            <th scope="col"><strong>Every student</strong><span>Free, on their own</span></th>
            <th scope="col" class="uni-cmp-partner"><strong>Through a partner university</strong><span>Founding Partner pilots and partnerships</span>${partnerBadge({ partner_student: true })}</th></tr></thead>
          <tbody>${COMPARE.map(([what, free, partner]) => `<tr><th scope="row">${what}</th><td>${mark(free)}</td><td class="uni-cmp-partner">${mark(partner)}</td></tr>`).join("")}</tbody>
        </table>
        <p class="small"><strong>Your students’ free access never depends on whether you partner.</strong> Pilot and partner students have their own places, outside the waiting list.</p>
      </div>
      <div class="row">${toForm("Register interest")}</div>
    </section>

    <section class="stack" style="--gap:20px" id="uni-path">
      <div class="stack" style="--gap:8px">${eyebrow("From pilot to partnership")}<h2>Try it first. Decide with real results.</h2></div>
      <ol class="uni-steps">${PATH.map(([t, d], i) => `<li><span class="uni-n">${i + 1}</span><strong>${t}</strong><p>${d}</p></li>`).join("")}</ol>
      <div class="uni-cost"><p><strong>The pilot is free, with no obligation, and you can stop at any time.</strong> If you continue, partner universities make an annual contribution that keeps Handova free for students and organisations. We share an indicative range on the first call, agree the amount after the pilot in line with your country’s income level and the scope of the partnership, and invoice nothing before the review meeting. Founding Partners keep a reduced rate in their first year.</p>${toForm("Register interest", "")}</div>
    </section>

    <section class="uni-today">
      <div class="stack" style="--gap:10px">${eyebrow("Where we are today")}<h2>We are early, so we start small.</h2>
        <p class="muted">Handova opened in November 2026. Small first pilots mean every student has a real project behind them.</p></div>
      ${nums.length ? `<ul class="uni-nums">${nums.map(([n, what]) => `<li><strong data-no-i18n>${n}</strong><span>${what}</span></li>`).join("")}</ul>` : `<ul class="uni-nums uni-promises">${PROMISES.map(([n, what]) => `<li><strong>${n}</strong><span>${what}</span></li>`).join("")}</ul>`}
    </section>
    ${needs?.length ? `<section class="stack uni-needs" style="--gap:16px"><div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Open right now")}<h2 class="h3">Projects your students could take on.</h2></div><a href="#needs" style="font-weight:700">See all needs ${icon("arrow", 14)}</a></div><div class="grid uni-needs">${needs.map(needCard).join("")}</div></section>` : ""}

    <section class="stack" style="--gap:20px">
      <div class="stack" style="--gap:8px">${eyebrow("Safety, supervision and credit")}<h2>What your partnerships office will ask.</h2></div>
      <div class="uni-grid">${SAFETY.map(([ic, t, d]) => `<details class="card uni-q" open><summary><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><strong>${t}</strong>${icon("chevron", 18)}</summary><p class="muted small">${d}</p></details>`).join("")}</div>
      <p class="small"><a href="#policies" style="font-weight:700">Read our policies ${icon("arrow", 14)}</a> · <a href="#privacy" style="font-weight:700">Privacy notice ${icon("arrow", 14)}</a></p>
    </section>

    <section class="uni-launch" id="uni-launch">
      <div class="stack" style="--gap:14px">${eyebrow("Free places and the waiting list")}<h2>Free for students, always. Places are limited.</h2>
        <p class="lead">Students and professionals join Handova for free. Places for students are limited, because each one needs a real project behind it, so we open them in phases, in the order students registered.</p>
        <div class="uni-share"><strong>Share with your students</strong><p class="small muted">Copy a ready-made message, or just the link, for your newsletter, course page or careers board.</p>
          <div class="row" style="--gap:8px"><button class="btn secondary sm" type="button" data-action="copy-link" data-url="${e(studentNote())}" data-copied="Message copied.">${icon("doc", 16)}<span>Copy the message</span></button><button class="btn secondary sm" type="button" data-action="copy-link" data-url="${e(STUDENT_LINK)}">${icon("link", 16)}<span>Copy the link</span></button></div></div></div>
      <ol class="how-checks uni-timeline">${LAUNCH.map(([when, d]) => `<li><span class="uni-when">${when}</span><span>${d}</span></li>`).join("")}</ol>
    </section>

    <section class="ms-why uni-why" aria-labelledby="uni-why-title">
      <div class="ms-why-head"><span class="eyebrow">Why now</span><h2 id="uni-why-title">A first step into work in the age of AI.</h2>
        <p>AI is taking over the tasks that used to give graduates their first job, and employers hire fewer juniors. Few students can afford to travel or work unpaid abroad to make up for it. Handova gives them real, verified experience with organisations around the world, from wherever they are.</p></div>
      <ul class="ms-stats uni-stats">${[MS_STATS[2], MS_STATS[0], MS_STATS[1]].map(([n, what, src]) => `<li><strong data-no-i18n>${n}</strong><span>${what}</span><cite>${src}</cite></li>`).join("")}</ul>
    </section>

    <section class="uni-who">
      <img src="${e(exampleProfile.photo)}" width="120" height="120" alt="Julieta Castiñeira de Dios" decoding="async">
      <div class="stack" style="--gap:8px">${eyebrow("Who we are")}<h2 class="h3">Run by Ethical Bridge, founded by Julieta Castiñeira de Dios.</h2>
        <p class="muted">Handova is an initiative of Ethical Bridge LLC, registered in Wyoming, USA. Ethical Bridge maps, visits and verifies grassroots organisations worldwide. Julieta is a lawyer who has worked with Save the Children in Australia and Denmark and with AdvocAid in Sierra Leone.</p>
        <p class="small"><a href="#about/founder" style="font-weight:700">About our founder ${icon("arrow", 14)}</a> · <a href="#about/ethical-bridge" style="font-weight:700">About Ethical Bridge ${icon("arrow", 14)}</a></p></div>
    </section>

    <section class="uni-contact" id="uni-contact">
      <div class="stack" style="--gap:12px">${eyebrow("Register interest")}<h2>Let’s talk about your students.</h2>
        <p class="lead">Tell us a little about your university and your students. We reply within two working days.</p>
        <p>Prefer email? Write to <a href="mailto:${e(config.contactEmail)}">${e(config.contactEmail)}</a>.</p>
        <a class="small" href="${PDF}" download style="font-weight:700">${icon("download", 16)} Download the 2-page summary (PDF)</a></div>
      <form class="form card" data-form="uni-interest">
        <div class="form-grid">
          ${field("name", "Your name", { required: true, attrs: 'maxlength="120" autocomplete="name"' })}
          ${field("role", "Your role", { attrs: 'maxlength="120" placeholder="e.g. Placement coordinator"' })}
          ${field("university", "University", { required: true, attrs: 'maxlength="200" autocomplete="organization"' })}
          ${select("country", "Country", [["", "Choose one…"], ...COUNTRIES.map((c) => [c, c])], "", { required: true })}
          ${field("email", "Work email", { type: "email", required: true, full: true, attrs: 'maxlength="254" autocomplete="email"' })}
          ${select("interest", "What are you interested in?", INTEREST, "", { full: true, required: true })}
          ${field("message", "Anything we should know? (optional)", { type: "textarea", full: true, attrs: 'maxlength="2000" rows="4" placeholder="Programmes, number of students, timing"' })}
        </div>
        <div class="hp-field" aria-hidden="true"><label>Leave this empty<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
        ${formEnd("Register interest")}
        <p class="small muted uni-next">Next: we book a 20-minute call with you. We use your details only to reply to you: see our <a href="#privacy">privacy notice</a>.</p>
      </form>
    </section>
    <p class="small muted"><span>Last updated</span> <span data-no-i18n>${date(UPDATED)}</span></p>
  </div>`;
  const to = new URLSearchParams(location.hash.split("?")[1] || "").get("to");
  return { title: "For universities", description: "A free 3-month pilot from January 2027: remote projects for your students with verified organisations worldwide.", html,
    after: () => {
      // On phones the safety answers start closed (tap a question to open it), so the form is nearer.
      const phone = matchMedia("(max-width: 640px)").matches;
      document.querySelectorAll(".uni-q").forEach((d) => { if (phone) d.removeAttribute("open"); else d.addEventListener("toggle", () => { if (!d.open && !matchMedia("(max-width: 640px)").matches) d.open = true; }); });
      if (to) setTimeout(() => document.getElementById(to)?.scrollIntoView({ block: "start" }), 60);
    } };
}

export async function submitInterest(form) {
  await withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error("Please complete the form."); }
    const email = val(fd, "email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw fieldError(form.elements.email, "Check the email address.");
    if (!val(fd, "website")) await result(db.rpc("register_university_interest", { p_name: val(fd, "name"), p_role: val(fd, "role"), p_university: val(fd, "university"), p_country: val(fd, "country"), p_email: email, p_interest: val(fd, "interest"), p_message: val(fd, "message") }));
    const box = document.createElement("div");
    box.className = "card stack";
    box.setAttribute("role", "status");
    box.innerHTML = `<span class="icon-tile lg">${icon("check", 28, "#0f6f63")}</span><h3 class="h3" tabindex="-1">Thank you. Your interest is registered.</h3><p><span>We’ll reply within two working days to</span> <strong data-no-i18n>${e(email)}</strong>. <span>Universities are invited to the pilot in the order they register.</span></p>`;
    form.replaceWith(box);
    box.querySelector("h3").focus();
  });
}
