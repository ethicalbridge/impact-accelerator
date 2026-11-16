// For universities (16 Nov 2026): what Handova offers universities, how the launch works (a waiting list in
// registration order, places opened in phases from January 2027), the pilot-to-partnership path, and a form to
// register interest. Same content as the 2-page summary PDF linked from the page; the page is the master version.
import { db, e, result, withForm, val, fieldError } from "../core.js";
import { icon, eyebrow, btn, field, select, formEnd, partnerBadge } from "../ui.js";
import { config } from "../config.js";
import { MS_STATS } from "./public.js";
import { exampleProfile } from "../examples.js";
import { date } from "../utils.js";

const PDF = "assets/handova-for-universities.pdf";
const UPDATED = "2026-11-16";

const FACTS = [
  ["gift", "Free", "for students and organisations, always"],
  ["clock", "1 to 16 hours", "per project, remote, around classes"],
  ["shield", "Verified", "every organisation, by Ethical Bridge"],
  ["doc", "Credit-ready", "hour logs and evidence; you decide the credit"],
];
const STEPS = [
  ["Intro call", "20 minutes to see whether Handova fits your programme."],
  ["Agree a cohort", "How many students, and the format: practicum, placement, service-learning or a volunteering award."],
  ["Onboarding", "A 30-minute online session for your students on safeguarding, conduct and working with organisations."],
  ["Students deliver", "Each chooses projects that match their skills and completes them remotely, with check-ins and a deadline."],
  ["Results", "Feedback from both sides, an endorsement on each student’s impact CV, and a report for your records."],
];
const SAFETY = [
  ["shield", "Verified organisations", "Every organisation meets Ethical Bridge’s published criteria and is checked through personal contact and field missions."],
  ["doc", "Public policies", "Safeguarding, data protection, conduct, anti-harassment, fraud and whistleblowing policies, open to anyone to read."],
  ["eye", "Remote and supported", "All work is remote, messages stay on Handova, and both sides give feedback at the end."],
  ["people", "Who supervises", "The organisation briefs and reviews the work and Handova checks in. Academic supervision and grading stay with you."],
  ["check", "Academic credit", "Projects can be bundled to about 20, 40 or 80 hours, with a learning log and logged hours as evidence. Your university decides the credit."],
  ["lock", "Data and consent", "Students choose whether to share their progress with their university. A data processing agreement is available on request."],
];
const LAUNCH = [
  ["Now", "Universities register their interest, and students join the waiting list. We review each student’s profile; it shows the date they can start."],
  ["From January 2027", "We open places in phases, in the order people registered. Founding Partner pilots start first, each in its own university term."],
  ["Each phase", "Up to 5 free places per university, and at least half for students in lower-income countries. Everyone else keeps their place in the queue for the next phase."],
  ["Meanwhile", "Organisations see who is waiting and post projects, so there is real work ready on the day each student starts."],
];
const PATH = [
  ["A free 3-month pilot", "From January 2027, with 5 to 10 of your students and one named contact on your side. Nothing to pay, no obligation, and you can stop at any time."],
  ["Real results", "A report with real numbers: projects completed, hours, organisations and countries reached, ratings, outcomes, and what your students and the organisations say."],
  ["A meeting to review", "We go through the results and the benefits together, and decide whether a partnership makes sense for you."],
  ["A partnership", "If it does, we agree its scope together: how many places, which programmes, the credit format and the reporting you need."],
];
const INCLUDES = ["Places reserved for your students, with no waiting list", "Projects matched to your courses, with a learning log", "Progress reports for students who agree to share them", "A named contact, onboarding for each cohort and a guest session", "Your university named on Handova as a partner, and a co-branded impact report"];
const INTEREST = [["", "Choose one…"], ["pilot", "A Founding Partner pilot from January 2027"], ["share", "Sharing Handova with our students"], ["other", "Something else"]];

// Where Handova stands today, counted live. If a count fails, the line is left out rather than showing a wrong number.
async function today() {
  const count = async (q) => { try { const { count: n, error } = await q; return error ? null : n; } catch { return null; } };
  const [orgs, needs, pros] = await Promise.all([
    count(db.from("organisations").select("id", { count: "exact", head: true }).eq("status", "approved")),
    count(db.from("needs").select("id", { count: "exact", head: true }).eq("status", "open")),
    count(db.from("profiles").select("user_id", { count: "exact", head: true }).eq("published", true).eq("review_status", "approved")),
  ]);
  return [[orgs, "organisations approved"], [needs, "open needs"], [pros, "professionals and students approved"]].filter(([n]) => typeof n === "number");
}

export async function universities() {
  const nums = await today();
  const html = `<div class="wrap uni stack" style="--gap:var(--section-gap);padding-bottom:var(--section-gap)">
    <div class="how-hero">
      <div class="stack" style="--gap:16px">${eyebrow("For universities")}<h1>Real projects for your students, with verified organisations worldwide.</h1>
        <p class="lead">Handova gives your students short, remote projects for small, locally led organisations that Ethical Bridge has verified. Free for students, with no travel and no unpaid months.</p>
        <p class="uni-status">${icon("calendar", 18, "#0f6f63")}<span><strong>Founding Partner pilots start from January 2027.</strong> Universities are invited in the order they register.</span></p>
        <div class="row">${btn("Register your interest", "#universities?to=uni-contact", "lg")}<a class="btn secondary lg" href="${PDF}" download>${icon("download", 18)}<span>2-page summary (PDF)</span></a></div>
      </div>
      <div class="how-facts">${FACTS.map(([ic, t, d]) => `<div class="how-fact"><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><div><strong>${t}</strong><span>${d}</span></div></div>`).join("")}</div>
    </div>

    <section class="ms-why uni-why" aria-labelledby="uni-why-title">
      <div class="ms-why-head"><span class="eyebrow">Why now</span><h2 id="uni-why-title">A first step into work in the age of AI.</h2>
        <p>AI is taking over the tasks that used to give graduates their first job, and employers hire fewer juniors. Few students can afford to travel or work unpaid abroad to make up for it. Handova gives them real, verified experience with organisations around the world, from wherever they are, with no flight needed.</p></div>
      <ul class="ms-stats">${MS_STATS.map(([n, what, src]) => `<li><strong data-no-i18n>${n}</strong><span>${what}</span><cite>${src}</cite></li>`).join("")}</ul>
    </section>

    <section class="stack" style="--gap:20px">
      <div class="stack" style="--gap:8px">${eyebrow("How a cohort works")}<h2>Five steps, with little admin on your side.</h2></div>
      <ol class="uni-steps">${STEPS.map(([t, d], i) => `<li><span class="uni-n">${i + 1}</span><strong>${t}</strong><p>${d}</p></li>`).join("")}</ol>
    </section>

    <section class="stack" style="--gap:20px">
      <div class="stack" style="--gap:8px">${eyebrow("Safety, supervision and credit")}<h2>What your partnerships office will ask.</h2></div>
      <div class="uni-grid">${SAFETY.map(([ic, t, d]) => `<div class="card stack" style="--gap:10px"><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><strong>${t}</strong><p class="muted small">${d}</p></div>`).join("")}</div>
      <p class="small"><a href="#policies" style="font-weight:700">Read our policies ${icon("arrow", 14)}</a></p>
    </section>

    <section class="how-agree uni-launch" id="uni-launch">
      <div class="stack" style="--gap:14px">${eyebrow("Free places and the waiting list")}<h2>Free for students, always. Places are limited.</h2>
        <p class="lead">Students and professionals join Handova for free. Places for students are limited, because each one needs a real project behind it, so we open them in phases, in the order students registered.</p>
        <div class="uni-routes">
          <div class="uni-route"><strong>Free places</strong><ul class="bullets"><li>Join the waiting list</li><li>Places open in phases, in registration order</li><li>Up to 5 per university in each phase</li></ul></div>
          <div class="uni-route uni-hl"><span class="uni-hl-label">Partner benefit</span><strong>Through a partner university</strong><ul class="bullets"><li>Reserved places, with no waiting list</li><li>A tag on each student’s profile that organisations can trust</li><li>Progress reports for students who agree</li></ul></div>
        </div>
        <p class="small muted">Partner universities’ contributions keep the free places open for everyone else.</p>
        <div class="row">${btn("Students: join the waiting list", "#join?role=student", "")}</div></div>
      <ol class="how-checks uni-timeline">${LAUNCH.map(([when, d]) => `<li><span class="uni-when">${when}</span><span>${d}</span></li>`).join("")}</ol>
    </section>

    <section class="stack" style="--gap:20px">
      <div class="stack" style="--gap:8px">${eyebrow("From pilot to partnership")}<h2>Try it first. Decide with real results.</h2></div>
      <ol class="uni-steps four">${PATH.map(([t, d], i) => `<li><span class="uni-n">${i + 1}</span><strong>${t}</strong><p>${d}</p></li>`).join("")}</ol>
      <div class="uni-two">
        <div class="card stack uni-hl" style="--gap:12px"><span class="uni-hl-label">Partner benefits</span><h3 class="h3">What a partnership can include</h3>
          <div class="uni-tag-demo"><span class="small muted">Your students’ profiles show:</span>${partnerBadge({ partner_student: true })}<span class="small muted">Organisations see they come through a university programme, which builds trust when they choose who to work with.</span></div>
          <ul class="bullets">${INCLUDES.map((x) => `<li>${x}</li>`).join("")}</ul></div>
        <div class="card stack uni-free" style="--gap:12px"><h3 class="h3">How Handova stays free</h3><p>Students and organisations never pay. Verifying organisations, matching projects and supporting every student has a real cost, so partner universities make an annual contribution that keeps Handova running and free for everyone else.</p><p class="muted">We agree the contribution with each partner after the pilot, in line with their country’s income level and the scope of the partnership. Founding Partners keep a reduced rate in their first year.</p></div>
      </div>
    </section>

    <section class="uni-today">
      <div class="stack" style="--gap:10px">${eyebrow("Where we are today")}<h2>We are early. That is why the pilot is free.</h2>
        <p class="muted">Handova opened in November 2026. Every match is made by hand, and Founding Partners help shape what we build next.</p></div>
      ${nums.length ? `<ul class="uni-nums">${nums.map(([n, what]) => `<li><strong data-no-i18n>${n}</strong><span>${what}</span></li>`).join("")}</ul>` : ""}
    </section>

    <section class="uni-who">
      <img src="${e(exampleProfile.photo)}" width="120" height="120" alt="" decoding="async">
      <div class="stack" style="--gap:8px">${eyebrow("Who we are")}<h2 class="h3">Run by Ethical Bridge, founded by Julieta Castiñeira de Dios.</h2>
        <p class="muted">Handova is an initiative of Ethical Bridge LLC, registered in Wyoming, USA. Ethical Bridge maps, visits and verifies grassroots organisations worldwide. Julieta is a lawyer who has worked with Save the Children in Australia and Denmark and with AdvocAid in Sierra Leone.</p>
        <p class="small"><a href="#about/founder" style="font-weight:700">About our founder ${icon("arrow", 14)}</a> · <a href="#about/ethical-bridge" style="font-weight:700">About Ethical Bridge ${icon("arrow", 14)}</a></p></div>
    </section>

    <section class="uni-contact" id="uni-contact">
      <div class="stack" style="--gap:12px">${eyebrow("Register your interest")}<h2>Let’s talk about your students.</h2>
        <p class="lead">Tell us a little about your university. We reply within two working days, and invite universities to the pilot in the order they register.</p>
        <p>Prefer email? Write to <a href="mailto:${e(config.contactEmail)}">${e(config.contactEmail)}</a>.</p>
        <a class="small" href="${PDF}" download style="font-weight:700">${icon("download", 16)} Download the 2-page summary (PDF)</a></div>
      <form class="form card" data-form="uni-interest">
        <div class="form-grid">
          ${field("name", "Your name", { required: true, attrs: 'maxlength="120" autocomplete="name"' })}
          ${field("role", "Your role", { attrs: 'maxlength="120" placeholder="e.g. Placement coordinator"' })}
          ${field("university", "University", { required: true, attrs: 'maxlength="200" autocomplete="organization"' })}
          ${field("country", "Country", { required: true, attrs: 'maxlength="80" autocomplete="country-name"' })}
          ${field("email", "Work email", { type: "email", required: true, full: true, attrs: 'maxlength="254" autocomplete="email"' })}
          ${select("interest", "What are you interested in?", INTEREST, "", { full: true, required: true })}
          ${field("message", "Anything we should know? (optional)", { type: "textarea", full: true, attrs: 'maxlength="2000" rows="4" placeholder="Programmes, number of students, timing"' })}
        </div>
        <div class="hp-field" aria-hidden="true"><label>Leave this empty<input name="website" type="text" tabindex="-1" autocomplete="off"></label></div>
        ${formEnd("Register interest")}
      </form>
    </section>
    <p class="small muted"><span>Last updated</span> <span data-no-i18n>${date(UPDATED)}</span></p>
  </div>`;
  const to = new URLSearchParams(location.hash.split("?")[1] || "").get("to");
  return { title: "For universities", description: "Free, remote projects for your students with verified organisations worldwide. Founding Partner pilots from January 2027.", html,
    after: to ? () => setTimeout(() => document.getElementById(to)?.scrollIntoView({ block: "start" }), 60) : undefined };
}

// Register interest: saved for Handova's team, and the university is added to the list in the order it registered.
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
