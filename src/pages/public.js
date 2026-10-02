import { db, state, result, e, openDialog, toast, go, withForm, val, $ } from "../core.js";
import { icon, mark, avatar, avatarFor, handoverStrip, cover, coverKind, COVER_BG, needCard, talentCard, contributionCard, exampleBadge, exampleNotice, tags, pill, eyebrow, empty, btn, back, field, formEnd, safeLink, status, entryList, SKILL_GROUPS } from "../ui.js";
import { exampleNeeds, exampleProfile, exampleContributions, solvedNeeds, handovaOrgs } from "../examples.js";
import { filterRecords, professionalAreas, date, plural, today, safeURL } from "../utils.js";
import { config } from "../config.js";

const NEED_SELECT = "*, organisation:organisations(id,name,city,country,website,summary,org_type,ethical_bridge_url)";

async function openNeeds(limit) {
  let q = db.from("needs").select(NEED_SELECT).eq("status", "open").order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const rows = await result(q).catch(() => []);
  return rows.filter((n) => !n.deadline || n.deadline >= today());
}

// ---------- Home ----------
export async function home() {
  const real = await openNeeds(3);
  const featured = real.length ? real : exampleNeeds.slice(0, 3);
  const trust = [["gift", "Free for everyone", "No fees for organisations or professionals."], ["eye", "Approved before public", "Every organisation and profile is reviewed first."], ["pen", "Agreed before work", "Both sides sign the scope before anything starts."], ["shield", "Reviewed, not claimed", "Hours and outcomes come from the organisation."]];
  const steps = [
    ["doc", "Define the need", "The organisation writes the need.", "An approved organisation publishes one specific need: the challenge, the output it will keep, the skills and working languages, and a realistic number of hours.", ["The output is named before anyone applies", "Up to three open needs at a time", "No direct contact with children or vulnerable adults"]],
    ["people", "Apply or invite", "The right person steps forward.", "Professionals apply with a short plan for the output, or the organisation invites an approved professional whose work fits. We can also introduce people by hand.", ["Applications explain how, not just who", "Only approved profiles can apply", "Either side can end a conversation"]],
    ["pen", "Sign the agreement", "Nothing starts until both sign.", "Every match gets its own contribution agreement, built from the need: scope, timing, access, safeguarding and confidentiality.", ["Contact details shared only after both signatures", "Never passwords, card details or access codes", "Signatures are final and dated"]],
    ["clock", "Do the work", "A short, protected contribution.", "The professional delivers the agreed output, logs time as they go and keeps conversations on the platform. The organisation reviews each entry.", ["Typically 6 to 16 hours", "Remote or local", "Hours count only once reviewed"]],
    ["handover", "Hand over and record", "The work stays with the team.", "The output is handed over so the team can use it without help. The organisation writes an endorsement, and the professional chooses to add it to their impact CV. Six months later, we ask if it is still in use.", ["A handover the team can run alone", "An endorsement in the organisation’s words", "A six-month “still in use?” check"]],
  ];
  const gaps = [["Help shaped around the helper", "The organisation defines the need and the output"], ["Unscoped, open-ended favours", "One clear output in 6 to 16 hours"], ["Access before trust", "Approval first, a signed agreement before any access"], ["Nothing to show for it", "Hours and outcomes reviewed by the organisation"], ["Hard to get real experience", "An impact CV built from reviewed work"]];
  const faqs = [["Is it really free?", "Yes. Handova is free for organisations and for professionals."], ["Is the work paid?", "No. Contributions are voluntary. Any expenses need separate written terms between the two of you."], ["Who can join?", "Locally led organisations listed in the Ethical Bridge directory, registered or fiscally hosted, and professionals aged 18 or over, anywhere in the world."], ["How is Handova linked to Ethical Bridge?", "Handova is an initiative of Ethical Bridge. Organisations in the Ethical Bridge directory can use it to get extra support from skilled professionals, free."], ["How long is a contribution?", "Most needs take 6 to 16 hours, agreed up front and logged as you go."], ["What does the professional get?", "Real experience and a reviewed footprint on their impact CV: what they did, for whom, and the organisation’s endorsement in its own words. It is an exchange where both sides keep something."], ["Why the name Handova?", "It comes from “hand over”: the moment a piece of work passes to the team that keeps it. Every engagement ends with a handover."], ["What if something goes wrong?", "Either side can pause or end a conversation or engagement, and anyone can report a concern. Our safeguarding lead reviews every report."]];
  const html = `
  <section class="hv-hero">
    <span class="hv-orb o1" aria-hidden="true"></span><span class="hv-orb o2" aria-hidden="true"></span><span class="hv-orb o3" aria-hidden="true"></span>
    <div class="wrap hv-hero-grid">
      <div class="stack hv-copy" style="--gap:24px">
        ${eyebrow("Skills for locally led change")}
        <h1>Skills handed over.<br><span>Capability that stays.</span></h1>
        <p class="lead">Local organisations publish the specific help they need. Skilled professionals give a few focused hours. Then the work is handed over: the team keeps the capability, and the professional keeps a reviewed footprint on their impact CV.</p>
        <div class="doors">
          <a class="door light" href="#organisations"><span class="door-icon">${icon("home", 24, "#0f6f63")}</span><span class="door-title">I’m an organisation</span><p>Publish a need and find skilled help. Free, always.</p><span class="door-cta">Post a need ${icon("arrow", 18)}</span></a>
          <a class="door ghost" href="#needs"><span class="door-icon">${icon("user", 24, "#fffdf8")}</span><span class="door-title">I’m a professional</span><p>Contribute your skills and build a reviewed impact CV.</p><span class="door-cta">Find a need ${icon("arrow", 18)}</span></a>
        </div>
        <dl class="hv-facts">
          <div><dt><b>0</b></dt><dd>fees, for anyone</dd></div>
          <div><dt><b>6–16</b></dt><dd>hours for a typical need</dd></div>
          <div><dt><b data-counter="5">5</b></dt><dd>steps from need to handover</dd></div>
          <div><dt><b data-counter="100" data-suffix="%">100%</b></dt><dd>of profiles reviewed before public</dd></div>
        </dl>
      </div>
      ${stage()}
    </div>
    <a class="hv-cue" href="#hv-how" aria-label="Scroll to how it works"><span></span></a>
  </section>
  <div class="wrap">
    <div class="trust-strip hv-lift">${trust.map(([ic, t, d]) => `<div><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><div><strong>${t}</strong><p class="small muted">${d}</p></div></div>`).join("")}</div>
    <section class="block stack" style="--gap:40px">
      <div class="hv-head" data-reveal><div class="stack">${eyebrow("Why Handova")}<h2>Help that leaves, or capability that stays.</h2></div><p class="lead">Well-meant volunteering often starts from what the helper wants to give. Handova starts from what the organisation needs, and ends with something that stays on both sides: capability for the team, a footprint for the professional.</p></div>
      <div class="hv-compare">
        <div class="hv-col without"><span class="hv-tag">Without a clear handover</span><ul>${gaps.map(([a]) => `<li>${icon("x", 20, "#7c3419", 2.2)}<span>${a}</span></li>`).join("")}</ul></div>
        <div class="hv-col with"><span class="hv-tag">With Handova</span><ul>${gaps.map(([, b]) => `<li>${icon("check", 20, "#0f6f63", 2.4)}<span>${b}</span></li>`).join("")}</ul></div>
      </div>
      <div class="hv-exchange" data-reveal>
        <div class="hv-ex-side"><span class="hv-tag">What stays with the organisation</span><strong>Capability</strong><p>A tool, a process or a trained team they keep using, long after the hours are done.</p></div>
        <div class="hv-ex-mid" aria-hidden="true">${mark(84, true)}<span>Everyone wins</span></div>
        <div class="hv-ex-side"><span class="hv-tag">What stays with the professional</span><strong>A footprint</strong><p>A reviewed record on their impact CV: the need, the output and the organisation’s own words.</p></div>
      </div>
    </section>
    <section class="stack" id="hv-how" style="--gap:32px;padding-bottom:clamp(56px,8vw,110px)">
      <div class="row between" style="align-items:flex-end" data-reveal><div class="stack">${eyebrow("How it works")}<h2>Five steps, one handover.</h2></div>${btn(`See the full process ${icon("arrow", 18)}`, "#how", "secondary")}</div>
      <div class="hv-stepper" data-stepper data-reveal>
        <div class="hv-tabs" role="tablist" aria-label="The five steps">
          <span class="hv-track" aria-hidden="true"><i></i></span>
          ${steps.map(([ic, t], i) => `<button type="button" role="tab" id="hv-tab-${i}" aria-controls="hv-panel-${i}" aria-selected="${i === 0}" tabindex="${i === 0 ? 0 : -1}"><span class="hv-num">${icon(ic === "handover" ? "check" : ic, 20)}<em>${i + 1}</em></span><span class="hv-tl">${t}</span></button>`).join("")}
        </div>
        ${steps.map(([ic, t, k, d, pts], i) => `<div class="hv-panel" role="tabpanel" id="hv-panel-${i}" aria-labelledby="hv-tab-${i}" ${i ? "hidden" : ""}>
          <div class="stack" style="--gap:14px"><span class="hv-step-k">Step ${i + 1} of 5</span><h3>${k}</h3><p class="lead">${d}</p><ul class="checks">${pts.map((p) => `<li>${icon("check", 22, "#0f6f63", 2.2)}${p}</li>`).join("")}</ul></div>
          <div class="hv-panel-art" aria-hidden="true">${stepArt(i)}</div>
        </div>`).join("")}
      </div>
    </section>
    <section class="stack" style="--gap:36px;padding-bottom:110px">
      <div class="row between" style="align-items:flex-end" data-reveal><div class="stack">${eyebrow(real.length ? "Open needs" : "Example needs")}<h2>Where your expertise can help.</h2><p class="lead">Each need is written by the organisation, with a clear output and a realistic number of hours.</p></div>${btn(`Explore all needs ${icon("arrow", 18)}`, "#needs")}</div>
      ${real.length ? "" : exampleNotice("These are example needs. Real needs from approved organisations will replace them.")}
      <div class="grid">${featured.map(needCard).join("")}</div>
    </section>
  </div>
  <section class="band-dark block hv-band"><div class="wrap grid-2" style="gap:72px;align-items:center">
    <div class="stack" style="--gap:26px" data-reveal>${eyebrow("For professionals")}<h2>Let your work speak for you.</h2><p class="lead">Every completed contribution becomes a record on your impact CV: the need, what you did, the outcome and the organisation’s own words. You choose what is public.</p>
      <ul class="checks">${["Real experience for students and people changing careers", "Endorsements written by the organisations you helped", "A shareable CV link and a printable PDF"].map((t) => `<li>${icon("check", 22, "#a9c9bf", 2.2)}${t}</li>`).join("")}</ul>
      <div class="row">${btn(`See a sample impact CV ${icon("arrow", 18)}`, "#profile/" + exampleProfile.user_id, "light")}${btn("Create your profile", "#join", "ghost-light")}</div></div>
    <a class="card stack hv-cv" href="#profile/${exampleProfile.user_id}" style="--gap:20px;color:var(--ink);text-decoration:none" data-reveal>
      <div class="row between">${eyebrow("Impact CV")}${pill("Founder")}</div>
      <div class="row" style="--gap:18px;flex-wrap:nowrap">${avatarFor(exampleProfile, 72)}<div><span class="serif" style="font-size:1.8rem;line-height:1.15">${e(exampleProfile.name)}</span><p class="muted small">${e(exampleProfile.headline)}</p></div></div>
      <div class="metric-row">${(() => { const h = exampleContributions.reduce((a, c) => a + Number(c.hours || 0), 0); return `<div class="metric"><strong data-counter="${h}">${h}</strong><span>hours handed over</span></div>`; })()}<div class="metric"><strong data-counter="${exampleContributions.length}">${exampleContributions.length}</strong><span>contributions</span></div><div class="metric"><strong data-counter="${exampleContributions.length}">${exampleContributions.length}</strong><span>organisations helped</span></div></div>
      <div class="card stack" style="--gap:8px;padding:18px 20px"><div class="row between"><strong>${e(exampleContributions[0].need_title)}</strong>${pill("Endorsement pending", "ochre")}</div><span class="small muted">${e(exampleContributions[0].organisation)} · ${exampleContributions[0].hours} hours</span><p class="small muted">Endorsements appear here in the organisation’s own words, once it has reviewed the work.</p></div>
    </a></div></section>
  <div class="wrap">
    <section class="block grid-2">
      ${audience("For organisations", "Skills you could not otherwise reach, on your terms.", ["You define the need, the output and what success looks like", "Browse approved professionals or wait for applications", "Up to three open needs at a time, free", "Keep everything you receive, and the evidence of it"], "Post your first need", "#organisations")}
      ${audience("For professionals", "Meaningful work that fits around your life.", ["Short, scoped contributions of 6 to 16 hours", "Remote or local, in the languages you work in", "A signed agreement protects you and the organisation", "Open to students and early-career people aged 18 and over"], "Find a need", "#needs")}
    </section>
    <section class="card grid-2" style="background:var(--mint);border-color:#bcd6cd;padding:clamp(28px,5vw,56px);gap:48px">
      <div class="stack" style="--gap:18px"><span class="icon-tile lg paper">${icon("shield", 30, "#0f6f63")}</span><h2 style="font-size:clamp(1.9rem,3vw,2.7rem)">Good intentions need good boundaries.</h2><a href="#safety" style="font-weight:700">Read how we work responsibly</a></div>
      <div class="stack">${[["lock", "Trust comes before access", "Nothing confidential is shared until both sides have signed. Never passwords, card details or access codes."], ["people", "No work with children or vulnerable adults", "During the pilot, needs involving direct contact are not accepted."], ["flag", "Anyone can raise a concern", "Report a profile, need or conversation at any time. Either side can end a conversation."]].map(([ic, t, d]) => `<div class="card row hv-lift" style="align-items:flex-start;flex-wrap:nowrap;padding:20px 22px">${icon(ic, 24, "#0f6f63")}<div><strong>${t}</strong><p class="muted">${d}</p></div></div>`).join("")}</div>
    </section>
    <section class="block grid-2 faq-grid">
      <div class="stack" data-reveal>${eyebrow("Questions")}<h2>Good to know before you start.</h2></div>
      <div data-faq>${faqs.map(([q, a], i) => `<details class="faq" ${i === 0 ? "open" : ""}><summary>${q}<span class="faq-icon" aria-hidden="true"></span></summary><p>${a}</p></details>`).join("")}</div>
    </section>
  </div>
  <section class="hv-cta"><span class="hv-orb o1" aria-hidden="true"></span><span class="hv-orb o2" aria-hidden="true"></span>
    <div class="wrap hv-cta-grid">
      <div class="stack" style="--gap:18px">${eyebrow("Join the founding group")}<h2>Hand over something that lasts.</h2><p class="lead">We are starting with a small founding group of organisations and professionals. Join free and help shape how Handova works.</p><div class="row">${btn("Join free", "#join", "light lg")}${btn("Explore needs", "#needs", "ghost-light lg")}</div></div>
      <div class="hv-cta-mark" aria-hidden="true">${mark(220, true, "draw")}</div>
    </div>
  </section>`;
  return { title: "Skills handed over. Capability that stays.", description: "Local organisations publish the help they need. Skilled professionals give a few focused hours. Free for everyone.", html };
}

function audience(eb, title, items, cta, href) {
  return `<div class="card stack hv-lift" style="--gap:20px;padding:clamp(26px,4vw,44px)">${eyebrow(eb)}<h3 class="serif" style="font:500 2rem/1.15 var(--serif)">${title}</h3><ul class="checks">${items.map((t) => `<li>${icon("check", 22, "#0f6f63", 2.2)}${t}</li>`).join("")}</ul><div>${btn(`${cta} ${icon("arrow", 18)}`, href)}</div></div>`;
}

// The hero "handover": the mark draws itself, the dot passes between the curves, and the story floats around it.
function stage() {
  return `<div class="hv-stage" aria-hidden="true">
    <div class="hv-ring"></div>
    <svg class="hv-big" viewBox="0 0 100 100"><path class="hv-a" d="M18 72 Q18 28 50 28" fill="none" stroke="#fffdf8" stroke-width="9" stroke-linecap="round" pathLength="1"/><path class="hv-b" d="M82 28 Q82 72 50 72" fill="none" stroke="#7fa99b" stroke-width="9" stroke-linecap="round" pathLength="1"/><circle class="hv-dot" cx="50" cy="50" r="9" fill="#e0a07f"/></svg>
    <div class="hv-float f1">${cover("data", { w: 300, h: 110 })}<div style="padding:12px 14px"><div class="row between" style="flex-wrap:nowrap"><span class="small muted">Water for Tomorrow · Kenya</span>${exampleBadge()}</div><div class="serif" style="font-size:1.12rem">Improve community data tools</div><div class="meta small"><span>${icon("clock", 15)}12 hours</span><span>${icon("globe", 15)}Remote</span></div></div></div>
    <div class="hv-float f2 row" style="flex-wrap:nowrap">${avatar("Amara Mensah", 44)}<div><strong>Amara Mensah</strong><br><span class="small muted">MEL specialist · Accra</span></div></div>
    <div class="hv-float f3 hv-pill">${icon("pen", 17, "#fffdf8")}Agreement signed by both</div>
    <div class="hv-float f4"><div class="row between"><span class="small" style="color:var(--teal);font-weight:700;display:inline-flex;gap:6px">${icon("shield", 16)}Handed over · still in use</span><span class="small muted">12 h</span></div><p class="serif" style="font-size:1.02rem;margin-top:6px">“Our field team now collects data the same way in every village.”</p></div>
  </div>`;
}

// Small drawings for each step panel.
function stepArt(i) {
  const T = "#0f6f63", D = "#123e3a", C = "#b85c38", S = "#7fa99b", P = "#fffdf8", O = "#c68a2e";
  const arts = [
    `<rect x="40" y="24" width="160" height="152" rx="14" fill="${P}" stroke="${D}" stroke-width="2"/><rect x="60" y="48" width="90" height="10" rx="5" fill="${D}"/><rect x="60" y="72" width="120" height="7" rx="3.5" fill="${S}"/><rect x="60" y="88" width="104" height="7" rx="3.5" fill="${S}"/><rect x="60" y="114" width="54" height="22" rx="11" fill="${T}"/><rect x="120" y="114" width="58" height="22" rx="11" fill="${O}" fill-opacity=".8"/><circle cx="196" cy="34" r="16" fill="${C}"/><path d="M189 34l5 5 9-9" stroke="${P}" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    `<circle cx="70" cy="80" r="22" fill="${T}"/><path d="M40 150v-12a30 30 0 0 1 60 0v12z" fill="${T}" fill-opacity=".85"/><circle cx="170" cy="80" r="22" fill="${O}"/><path d="M140 150v-12a30 30 0 0 1 60 0v12z" fill="${O}" fill-opacity=".85"/><path d="M98 66 Q120 40 142 66" fill="none" stroke="${D}" stroke-width="3" stroke-dasharray="3 7" stroke-linecap="round"/><rect x="86" y="96" width="68" height="34" rx="10" fill="${P}" stroke="${D}" stroke-width="2"/><rect x="96" y="106" width="40" height="6" rx="3" fill="${S}"/><rect x="96" y="117" width="28" height="6" rx="3" fill="${S}"/>`,
    `<rect x="50" y="20" width="140" height="160" rx="12" fill="${P}" stroke="${D}" stroke-width="2"/><rect x="70" y="42" width="80" height="9" rx="4.5" fill="${D}"/>${[64, 78, 92, 106].map((y) => `<rect x="70" y="${y}" width="${100 - (y % 30)}" height="6" rx="3" fill="${S}"/>`).join("")}<path d="M70 150c10-14 18 6 28-6s14 8 22 0" fill="none" stroke="${T}" stroke-width="3" stroke-linecap="round"/><path d="M130 150c8-12 16 6 24-4" fill="none" stroke="${C}" stroke-width="3" stroke-linecap="round"/>`,
    `<circle cx="120" cy="100" r="66" fill="${P}" stroke="${D}" stroke-width="2"/><path d="M120 100V58" stroke="${D}" stroke-width="5" stroke-linecap="round"/><path d="M120 100l28 18" stroke="${C}" stroke-width="5" stroke-linecap="round"/><circle cx="120" cy="100" r="7" fill="${D}"/><path d="M120 34 A66 66 0 0 1 183 120" fill="none" stroke="${T}" stroke-width="10" stroke-linecap="round" opacity=".5"/>`,
    `<g transform="translate(45 25) scale(1.5)"><path d="M18 72 Q18 28 50 28" fill="none" stroke="${D}" stroke-width="10" stroke-linecap="round"/><path d="M82 28 Q82 72 50 72" fill="none" stroke="${T}" stroke-width="10" stroke-linecap="round"/><circle cx="50" cy="50" r="10" fill="${C}"/></g>`,
  ];
  return `<svg viewBox="0 0 240 200" width="240" height="200">${arts[i]}</svg>`;
}


// ---------- About ----------
const EB = {
  site: "https://ethicalbridge.org/", directory: "https://ethicalbridge.org/directory.html", join: "https://ethicalbridge.org/organisation-register.html", forOrgs: "https://ethicalbridge.org/organisations.html",
  social: [["LinkedIn", "https://www.linkedin.com/company/ethicalbridge/"], ["Instagram", "https://instagram.com/ethical.bridge"], ["Facebook", "https://www.facebook.com/profile.php?id=61588796042823"], ["YouTube", "https://www.youtube.com/@EthicalBridge"], ["TikTok", "https://www.tiktok.com/@ethical.bridge"]],
};
export const ethicalBridgeLinks = EB;
const ext = (href, label, cls = "") => `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${label} <span class="visually-hidden">(opens in a new tab)</span></a>`;

export async function about() {
  const html = `<div class="wrap stack about" style="--gap:clamp(40px,5vw,64px);padding-bottom:64px">
    <div class="how-hero">
      <div class="stack" style="--gap:16px">${eyebrow("About Handova")}<h1>Extra support for the organisations of Ethical Bridge.</h1><p class="lead">Handova is an initiative of Ethical Bridge. Locally led organisations in the Ethical Bridge directory can ask for skilled help with one specific need, and professionals give a few focused hours, free. The work is handed over, so the capability stays with the team.</p><div class="row" style="--gap:12px">${btn(`How it works ${icon("arrow", 18)}`, "#how")}${ext(EB.site, "Visit Ethical Bridge", "btn secondary")}</div></div>
      <div class="about-mark" aria-hidden="true">${mark(200, false, "draw")}<span>Skills handed over.<br><b>Capability that stays.</b></span></div>
    </div>
    <section class="about-flow">
      <div class="stack" style="--gap:10px">${eyebrow("How the two fit together")}<h2>One ecosystem, two kinds of support.</h2></div>
      <ol class="about-steps">
        <li><span class="about-n">1</span><strong>Ethical Bridge directory</strong><p>A global directory of ethical, locally led organisations. Being listed makes an organisation visible to people, partners and funders.</p>${ext(EB.directory, "Explore the directory")}</li>
        <li><span class="about-n">2</span><strong>Handova</strong><p>Organisations in the directory can go further: publish a specific need and get skilled help from approved professionals, under a signed agreement.</p><a href="#how">See how it works</a></li>
        <li><span class="about-n">3</span><strong>What stays, on both sides</strong><p>The organisation keeps a tool, a process or a trained team. The professional keeps a reviewed footprint on their impact CV. It is an exchange, and everyone wins.</p><a href="#talent">Meet the talent</a></li>
      </ol>
    </section>
    <section class="grid-2" style="gap:24px">
      <div class="card stack" style="--gap:16px;padding:clamp(26px,4vw,40px)">${eyebrow("For organisations")}<h3 class="serif" style="font:500 1.9rem/1.15 var(--serif)">Already in the Ethical Bridge directory?</h3><p class="muted">You can create a Handova account straight away. Add your directory page when you sign up, and we review your organisation before your needs go public.</p><div class="row">${btn("Create an organisation account", "#join?role=organisation")}</div></div>
      <div class="card stack" style="--gap:16px;padding:clamp(26px,4vw,40px);background:var(--mint);border-color:#bcd6cd">${eyebrow("Not listed yet")}<h3 class="serif" style="font:500 1.9rem/1.15 var(--serif)">Join the directory first. It is free.</h3><p class="muted">Apply to the Ethical Bridge directory. Once your organisation is listed, come back to Handova to ask for skilled support.</p><div class="row">${ext(EB.join, `Join the Ethical Bridge directory ${icon("arrow", 18)}`, "btn")}</div></div>
    </section>
    <section class="about-founder">
      <a href="#profile/${exampleProfile.user_id}">${avatarFor(exampleProfile, 120)}</a>
      <div class="stack" style="--gap:10px">${eyebrow("Who is behind Handova")}<p class="serif" style="font-size:clamp(1.3rem,2.2vw,1.7rem);line-height:1.35">Julieta is a lawyer, strategist and organisation builder. She founded Ethical Bridge and built Handova so the organisations in its directory can reach skilled help for free.</p><span><strong>${e(exampleProfile.name)}</strong> <span class="muted">· Founder of Ethical Bridge and Handova</span></span><a href="#profile/${exampleProfile.user_id}" style="font-weight:700">See Julieta’s impact CV</a></div>
    </section>
    <section class="about-eb">
      <div class="stack" style="--gap:12px">${eyebrow("Ethical Bridge")}<h2>Follow Ethical Bridge.</h2><p class="lead">News, organisations and opportunities from across the Ethical Bridge community.</p></div>
      <div class="about-links">
        ${ext(EB.site, `${icon("globe", 20)}<span>ethicalbridge.org</span>`, "about-link")}
        ${ext(EB.directory, `${icon("search", 20)}<span>The directory</span>`, "about-link")}
        ${ext(EB.forOrgs, `${icon("home", 20)}<span>For organisations</span>`, "about-link")}
        ${EB.social.map(([n, u]) => ext(u, `${n === "LinkedIn" ? icon("linkedin", 20) : icon("link", 20)}<span>${n}</span>`, "about-link")).join("")}
      </div>
    </section>
    <section class="how-concern"><span class="icon-tile lg">${icon("shield", 28, "#0f6f63")}</span><div class="stack" style="--gap:4px"><strong class="serif" style="font-size:1.6rem;font-weight:500">Who runs Handova</strong><p class="muted">Handova is operated by Ethical Bridge, which is responsible for the personal information collected through it. Write to ${e(config.contactEmail)} with any question.</p></div>${btn("Privacy notice", "#privacy", "dark")}</section>
  </div>`;
  return { title: "About", description: "Handova is an initiative of Ethical Bridge: extra, skilled support for the organisations in its directory.", html };
}

// ---------- For organisations ----------
// ---------- Organisation page ----------
// The single home of an organisation's needs on Handova: open needs and needs already handed over.
// The impact CV and the Needs list only link here; nothing is stored twice.
export async function orgPage(id) {
  let o = handovaOrgs.find((x) => x.id === id), open = [], handed = [];
  if (o) handed = solvedNeeds.filter((n) => n.org_id === id);
  else {
    o = await result(db.from("organisations").select("id,name,city,country,website,summary,org_type,ethical_bridge_url,status").eq("id", id).maybeSingle()).catch(() => null);
    if (o) open = await result(db.from("needs").select(NEED_SELECT).eq("organisation_id", id).eq("status", "open").order("created_at", { ascending: false })).catch(() => []);
  }
  if (!o) return notFound("This organisation isn’t on Handova", "It may not be approved yet, or the link may be wrong.");
  const logo = `<span class="hs-org org-logo">${avatar(o.name, 96)}${o.logo ? `<img src="${e(o.logo)}" alt="" referrerpolicy="no-referrer">` : ""}</span>`;
  const hours = handed.reduce((s, n) => s + Number(n.hours || 0), 0);
  const handedBlock = (n) => `<article class="card stack handed-need" id="${e(n.id)}" style="--gap:16px">
      ${handoverStrip(n, 64)}
      <div class="row between" style="align-items:flex-start"><div class="stack" style="--gap:6px"><h3 class="serif" style="font:500 1.7rem/1.15 var(--serif)">${e(n.title)}</h3><span class="small muted">Handed over by <a href="#profile/${e(n.contributor.id)}">${e(n.contributor.name)}</a> · ${plural(n.hours, "hour")} · Remote</span></div>${pill(n.pending ? "Endorsement pending" : "Reviewed", n.pending ? "ochre" : "")}</div>
      <div class="grid-2" style="gap:18px"><div><span class="label-cap">The need</span><p>${e(n.description)}</p></div><div><span class="label-cap">Handed over</span><ul class="bullets">${n.deliverables.map((d) => `<li>${e(d)}</li>`).join("")}</ul></div></div>
      ${tags(n.skills)}
    </article>`;
  const html = `<div class="wrap stack" style="--gap:32px;padding-bottom:60px">
    ${back("All needs", "#needs")}
    <section class="org-head">
      ${logo}
      <div class="stack" style="--gap:10px">${eyebrow("Organisation on Handova")}<h1 style="font-size:clamp(2.4rem,4.6vw,4rem)">${e(o.name)}</h1>${o.city || o.country ? `<p class="muted">${icon("map", 18, "#0f6f63")} ${e([o.city, o.country].filter(Boolean).join(", "))}</p>` : ""}${o.summary ? `<p class="lead" style="max-width:760px">${e(o.summary)}</p>` : ""}
        <div class="row">${safeURL(o.ethical_bridge_url) ? `<a class="btn secondary" href="${e(safeURL(o.ethical_bridge_url))}" target="_blank" rel="noopener">Full profile on Ethical Bridge ${icon("arrow", 18)}<span class="visually-hidden">(opens in a new tab)</span></a>` : `<span class="small muted">Not yet in the Ethical Bridge directory.</span>`}</div></div>
    </section>
    ${handed.length ? `<section class="stats-dark"><div><strong data-counter="${hours}">${hours}</strong><span>hours handed over</span></div><div><strong data-counter="${handed.length}">${handed.length}</strong><span>${handed.length === 1 ? "need solved" : "needs solved"}</span></div><div><strong data-counter="${open.length}">${open.length}</strong><span>open needs</span></div><div><strong data-counter="${new Set(handed.map((n) => n.contributor.id)).size}">${new Set(handed.map((n) => n.contributor.id)).size}</strong><span>${new Set(handed.map((n) => n.contributor.id)).size === 1 ? "professional" : "professionals"}</span></div></section>` : ""}
    <section class="stack" style="--gap:16px"><h2 style="font-size:2.2rem">Open needs</h2>${open.length ? `<div class="grid">${open.map(needCard).join("")}</div>` : empty("No open needs right now", "When this organisation publishes a need, it will appear here and on the Needs page.")}</section>
    ${handed.length ? `<section class="stack" style="--gap:16px"><h2 style="font-size:2.2rem">Needs handed over</h2>${handed.map(handedBlock).join("")}</section>` : ""}
  </div>`;
  return { title: o.name, description: o.summary || `${o.name} on Handova`, html };
}

// "For organisations" now lives inside How it works; the old address opens that section.
export const organisations = () => how("organisations");
export const professionals = () => how("professionals");

function pathSection(kind) {
  const org = kind === "organisations";
  const steps = org
    ? [["Be listed in the Ethical Bridge directory", "Handova is extra support for organisations in the Ethical Bridge directory. Joining the directory is free."], ["Create your organisation account", "Add your directory page. We check you are locally led and registered or fiscally hosted, usually within two working days."], ["Publish a need", "Describe the challenge, the output, the skills, the working languages and the hours. Up to three open at a time."], ["Choose who to work with", "Review applications, or invite approved professionals whose work fits."], ["Sign the agreement", "Confirm scope, access and confidentiality before anything is shared."], ["Review and complete", "Approve logged hours, write an endorsement and mark the engagement complete."]]
    : [["Create your profile", "Your experience, skills, working languages, LinkedIn and the hours you can realistically give. We approve it before it is public."], ["Find a need", "Browse needs from approved, locally led organisations, or wait to be invited to one that fits."], ["Apply with a plan", "Say how you would approach the output and when you could do it. Only the organisation sees it."], ["Sign the agreement", "Agree the scope, access and confidentiality with the organisation before any work starts."], ["Deliver and hand over", "Do the work, log your hours and hand over the output. Reviewed work joins your impact CV."]];
  const who = org
    ? ["Listed in the Ethical Bridge directory (free to join)", "Local NGOs, cooperatives, community groups and small mission-led social enterprises", "Led by people based where the organisation works", "Registered, or fiscally hosted by a registered organisation", "Needs that do not involve direct contact with children or vulnerable adults"]
    : ["Professionals with experience in data, finance, design, communications, policy, technology, law and more", "Students, recent graduates and people changing careers", "Aged 18 or over, anywhere in the world", "Able to give a few focused hours, remote or local"];
  const good = org
    ? [`What a good need looks like`, `<p>One clear output, 6 to 16 hours, the skills and working languages involved. For example: “A data collection template that works offline, and a 90-minute training session for our six field officers.”</p><a href="#need/example-data-tools">See an example need</a>`]
    : [`What a good application looks like`, `<p>Specific and short: how you would approach the output, what you have done that is similar, and when you can do it. For example: “I have built two offline survey templates in KoboToolbox; I can deliver in two weeks, three hours a week.”</p><a href="#profile/julieta-castineira-de-dios">See a sample impact CV</a>`];
  return `<section class="path-section" id="path-${kind}">
    <div class="row between" style="align-items:flex-end;margin-bottom:22px"><div class="stack" style="--gap:8px">${eyebrow(org ? "For organisations" : "For professionals")}<h2>${org ? "Skilled help for the work you define." : "Meaningful work that fits around your life."}</h2><p class="lead" style="max-width:720px">${org ? "Handova connects locally led organisations with professionals who contribute a few focused hours, free. You set the need, the output and what success looks like." : "Give a few focused hours to an organisation that defined exactly what it needs. The organisation keeps the capability; you keep a reviewed footprint on your impact CV. Everyone wins."}</p></div><div class="row">${btn(`${org ? "Create an organisation account" : "Create your profile"} ${icon("arrow", 18)}`, org ? "#join?role=organisation" : "#join?role=professional")}${btn(org ? "Browse talent" : "Browse needs", org ? "#talent" : "#needs", "secondary")}</div>${org ? `<a class="small" style="font-weight:700" href="https://ethicalbridge.org/organisation-register.html" target="_blank" rel="noopener">Not in the Ethical Bridge directory yet? Join it first ${icon("arrow", 15)}</a>` : ""}</div>
    <div class="grid-2" style="gap:24px">
      <div class="card stack" style="--gap:22px;background:var(--deep);color:var(--paper);border-color:var(--deep);padding:clamp(26px,4vw,44px)"><h3 class="serif" style="font:500 2rem/1.15 var(--serif)">How it works for you</h3><ol class="stack" style="list-style:none;margin:0;padding:0;--gap:20px">${steps.map(([t, d], i) => `<li class="row" style="align-items:flex-start;flex-wrap:nowrap"><span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:20px;background:${(org ? i === 4 : i === 3) ? "#e0a07f" : "#fffdf8"};color:#123e3a;font-weight:700;flex-shrink:0">${i + 1}</span><div><strong>${t}</strong><p style="color:var(--on-deep)">${d}</p></div></li>`).join("")}</ol></div>
      <div class="stack" style="--gap:24px">
        <div class="card stack">${eyebrow("Who can join")}<ul class="checks">${who.map((t) => `<li>${icon("check", 22, "#0f6f63", 2.2)}${t}</li>`).join("")}</ul></div>
        <div class="card stack">${eyebrow(good[0])}${good[1]}</div>
        <div class="banner">${icon("gift", 24, "#0f6f63")}<p><strong>Always free.</strong> Contributions are voluntary; no fees are charged to organisations or professionals.</p></div>
      </div>
    </div>
  </section>`;
}

// ---------- Needs directory ----------
function filtersForm(kind, rows = []) {
  // Only countries and languages that appear in the list, so every choice gives results.
  const uniq = (arr) => [...new Set(arr.filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const countries = uniq(rows.map((r) => r.country || r.organisation?.country)), langs = uniq(rows.flatMap((r) => r.languages || []));
  const opts = (arr) => arr.map((x) => (Array.isArray(x) ? `<option value="${e(x[0])}">${e(x[1])}</option>` : `<option>${e(x)}</option>`)).join("");
  return `<form class="filters" id="filters" role="search" aria-label="Filter ${kind}">
    <label>Search<input name="search" type="search" placeholder="${kind === "needs" ? "Skill, organisation or keyword" : "Name, skill or experience"}" autocomplete="off"></label>
    <label>Professional area<select name="area"><option value="">All areas</option>${opts(professionalAreas.map((a) => a.label))}</select></label>
    <label>Country<select name="country"><option value="">Anywhere</option>${opts(countries)}</select></label>
    <label>Working language<select name="language"><option value="">Any language</option>${opts(langs)}</select></label>
    ${kind === "needs" ? `<label>Length<select name="hours"><option value="">Any length</option><option value="short">Up to 8 hours</option><option value="medium">9 to 16 hours</option><option value="long">More than 16 hours</option></select></label>` : `<label>Availability<select name="available"><option value="">Everyone</option><option value="1">Available now</option></select></label>`}
    <div class="actions"><p id="count" class="muted" role="status" aria-live="polite"></p><button class="link-btn" type="reset">Clear filters</button></div>
  </form>`;
}

export async function needs() {
  const real = await openNeeds();
  const rows = real.length ? real : exampleNeeds;
  const html = `<div class="wrap stack" style="--gap:28px;padding-bottom:40px">
    <div class="page-head">${eyebrow("Open needs")}<h1>Where your expertise can help.</h1><p class="lead">Every need is written by an approved, locally led organisation: the output they need, the skills involved and a realistic number of hours.</p></div>
    ${filtersForm("needs", rows)}
    ${real.length ? "" : exampleNotice("There are no open needs yet, so you are seeing examples. Real needs from approved organisations will appear here.")}
    <div class="grid" id="results"></div>
    <section class="stack" style="--gap:18px;padding-top:24px">
      <div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Handed over")}<h2>Needs already solved.</h2><p class="lead" style="max-width:680px">Real needs from organisations in the Ethical Bridge directory, delivered and handed over. The capability stays with each team; the record stays on the professional’s impact CV. Open one to see it on the organisation’s page.</p></div>${btn(`See the impact CV ${icon("arrow", 18)}`, "#profile/" + exampleProfile.user_id, "secondary")}</div>
      <div class="grid">${solvedNeeds.map(needCard).join("")}</div>
    </section>
    <div class="card row between" style="background:var(--mint);border-color:#bcd6cd"><div class="stack" style="--gap:6px"><span class="serif" style="font-size:1.8rem">Can’t find the right fit yet?</span><p class="muted">Publish your profile and organisations can invite you to a need that matches your skills.</p></div>${btn(`Create your profile ${icon("arrow", 18)}`, "#join")}</div>
  </div>`;
  return { title: "Open needs", description: "Browse needs published by approved, locally led organisations.", html, after: () => bindFilters(rows, needCard, "need") };
}

function bindFilters(rows, card, noun) {
  const f = $("#filters");
  const draw = () => {
    const data = Object.fromEntries(new FormData(f));
    const found = filterRecords(rows, data);
    $("#count").textContent = `${plural(found.length, noun)}${rows.length && rows.every((r) => r.example && !r.founder) ? " (examples)" : ""}`;
    $("#results").innerHTML = found.length ? found.map(card).join("") : empty("No matches", "Try another area, country or language.", `<button class="btn secondary sm" type="button" data-action="clear-filters">Clear filters</button>`);
  };
  f.addEventListener("input", draw);
  f.addEventListener("reset", () => setTimeout(draw));
  f.addEventListener("submit", (ev) => ev.preventDefault());
  draw();
}

// ---------- Need detail ----------
export async function need(id) {
  const n = id.startsWith("done-") ? solvedNeeds.find((x) => x.id === id) : id.startsWith("example-") ? exampleNeeds.find((x) => x.id === id) : await result(db.from("needs").select(NEED_SELECT).eq("id", id).maybeSingle()).catch(() => null);
  if (!n) return notFound("This need isn’t available", "It may have been closed, or it may still be a draft.");
  const org = n.organisation || {};
  const isMember = state.memberships.some((m) => m.organisation_id === n.organisation_id);
  const open = n.status === "open" && (!n.deadline || n.deadline >= today());
  let app = null, saved = false;
  if (state.user && !n.example && !n.handed && !isMember) {
    [app, saved] = await Promise.all([
      result(db.from("applications").select("id,status").eq("need_id", id).eq("user_id", state.user.id).maybeSingle()).catch(() => null),
      result(db.from("saved_needs").select("need_id").eq("need_id", id).eq("user_id", state.user.id).maybeSingle()).then(Boolean).catch(() => false),
    ]);
  }
  const deliverables = n.deliverables || n.output.split(/\n|;/).map((s) => s.trim()).filter(Boolean);
  let cta;
  if (n.handed) cta = `<p class="small muted">This need was delivered and handed over by <a href="#profile/${e(n.contributor.id)}">${e(n.contributor.name)}</a>. ${n.pending ? "The organisation’s endorsement is pending." : ""}</p>${btn("See open needs", "#needs", "lg")}`;
  else if (n.example) cta = `<p class="small muted">This is an example need, so you can’t apply to it.</p>${btn("See real needs", "#needs", "lg")}`;
  else if (isMember) cta = `${btn("Manage in your workspace", "#org", "lg")}`;
  else if (app) cta = `<p>Your application: ${status(app.status)}</p>${btn("Go to your workspace", "#workspace", "secondary")}`;
  else if (open) cta = `<button class="btn lg" type="button" data-action="apply" data-id="${e(n.id)}">Apply to this need</button>`;
  else cta = `<p class="muted">This need is no longer accepting applications.</p>`;
  const html = `<div class="wrap stack" style="--gap:28px;padding-bottom:60px">
    ${back("All needs", "#needs")}
    ${n.handed ? `<div class="notice" role="note">${pill("Handed over", "ochre")}<span>This need has been solved. It is shown so you can see the kind of work Handova is for.</span></div>` : n.example ? exampleNotice() : ""}
    ${((k) => `<div class="card flush cover-banner" style="background:${COVER_BG[k] || COVER_BG.design}">${cover(k, { fit: "meet" })}</div>`)(coverKind(n.skills, n.title))}
    <div class="split">
      <div class="stack" style="--gap:36px">
        <div class="stack">
          <div class="row">${avatar(org.name || "Organisation", 44)}<strong>${e(org.name || "Organisation")}</strong><span class="muted">${e([org.city, org.country].filter(Boolean).join(", "))}</span>${n.example || n.handed ? "" : pill("Approved organisation")}</div>
          <h1 style="font-size:clamp(2.2rem,4.4vw,3.8rem)">${e(n.title)}</h1>
          ${n.example || n.handed ? "" : `<div class="mobile-cta">${cta}</div>`}
        </div>
        <div class="stack"><h2 style="font-size:2rem">The challenge</h2><p class="prose">${e(n.description)}</p></div>
        <div class="stack"><h2 style="font-size:2rem">${n.handed ? "What was handed over" : "What you would deliver"}</h2><ul class="checks">${deliverables.map((d) => `<li>${icon("check", 22, "#0f6f63", 2.2)}${e(d)}</li>`).join("")}</ul></div>
        <div class="grid-2" style="gap:20px"><div class="card stack" style="--gap:10px"><strong>Skills involved</strong>${tags(n.skills)}</div><div class="card stack" style="--gap:10px"><strong>Working languages</strong><p>${e((n.languages || []).join(", "))}. Support in any one of these is welcome.</p></div></div>
        <div class="card row" style="align-items:flex-start;flex-wrap:nowrap">${avatar(org.name || "Organisation", 60)}<div class="stack" style="--gap:6px">${eyebrow("About the organisation")}<span class="serif" style="font-size:1.6rem">${e(org.name || "")}</span><p class="muted">${e(org.summary || "")}</p>${safeLink(org.website, "Organisation website")}${safeLink(org.ethical_bridge_url, "See it in the Ethical Bridge directory")}</div></div>
      </div>
      <aside class="stack sticky" style="--gap:18px">
        <div class="side-card">
          <div class="row between">${n.handed ? pill("Handed over", "ochre") : open ? pill("Open for applications") : pill("Closed", "grey")}<span class="small muted">${plural(n.places || 1, "place")}</span></div>
          <div class="stack" style="--gap:12px">
            <span class="row">${icon("clock", 22, "#0f6f63")}<span><strong>${n.hours} ${n.hours === 1 ? "hour" : "hours"}</strong> ${n.handed ? "delivered" : "estimated"}</span></span>
            <span class="row">${icon("globe", 22, "#0f6f63")}${e(n.arrangement)}${n.location ? " · " + e(n.location) : ""}</span>
            <span class="row">${icon("calendar", 22, "#0f6f63")}${n.handed ? "Delivered and handed over" : n.deadline ? "Apply by " + date(n.deadline) : "No fixed deadline"}</span>
            <span class="row">${icon("language", 22, "#0f6f63")}${e((n.languages || []).join(" · "))}</span>
          </div>
          ${cta}
          ${!n.example && !n.handed && !isMember && state.user ? `<button class="btn secondary" type="button" data-action="save-need" data-id="${e(n.id)}">${icon("bookmark", 18)}${saved ? "Saved · remove" : "Save for later"}</button>` : ""}
          <p class="small muted">Unpaid, voluntary contribution. You will sign a contribution agreement with the organisation before any work begins.</p>
        </div>
        <div class="banner">${icon("lock", 22, "#0f6f63")}<p class="small">Never share passwords, card details or access codes. Confidential information is shared only after the agreement is signed.</p></div>
        ${n.example || n.handed ? "" : `<button class="link-btn" type="button" data-action="report" data-type="need" data-id="${e(n.id)}" style="color:var(--muted);display:inline-flex;gap:8px;align-items:center">${icon("flag", 18)}Report a concern about this need</button>`}
      </aside>
    </div></div>`;
  return { title: n.title, description: n.output, html };
}

// ---------- Talent ----------
export async function talent() {
  const real = await result(db.from("profiles").select("user_id,name,headline,location,country,languages,skills,hours_available,arrangement,bio,photo_url,experience_items").eq("published", true).eq("review_status", "approved").order("approved_at", { ascending: false })).catch(() => []);
  const rows = [exampleProfile, ...real.filter((p) => p.user_id !== exampleProfile.user_id)];
  const html = `<div class="wrap stack" style="--gap:28px;padding-bottom:40px">
    <div class="page-head">${eyebrow("Talent")}<h1>Find the person behind the skills.</h1><p class="lead">Every profile is approved before it appears. See what people have done, the languages they work in and the time they can realistically give.</p></div>
    ${filtersForm("talent", rows)}
    ${real.length ? "" : `<div class="notice" role="note">${pill("Founder")}<span>The founding group is being approved now. Until then you can see the founder’s own impact CV; approved professionals will appear alongside it.</span></div>`}
    <div class="grid" id="results"></div>
    <div class="card row between band-dark" style="border-color:var(--deep)"><div class="stack" style="--gap:6px"><span class="serif" style="font-size:1.8rem">Are you an organisation?</span><p class="muted">Post a need and invite the people whose work fits. It is free.</p></div>${btn(`Post a need ${icon("arrow", 18)}`, "#organisations", "light")}</div>
  </div>`;
  return { title: "Talent", description: "Approved professionals contributing their skills to locally led organisations.", html, after: () => bindFilters(rows, talentCard, "professional") };
}

// ---------- Profile / impact CV ----------
// Skills grouped under the same areas as the filters; anything else goes under "Other".
function skillsByArea(list) {
  if (list.length <= 8) return tags(list);
  const left = new Set(list), out = [];
  for (const [area, opts] of SKILL_GROUPS) { const hit = opts.filter((o) => left.has(o)); if (hit.length) { out.push([area, hit]); hit.forEach((h) => left.delete(h)); } }
  if (left.size) out.push(["Other", [...left]]);
  return `<div class="skill-areas">${out.map(([a, l]) => `<div><span class="skill-area">${e(a)}</span>${tags(l)}</div>`).join("")}</div>`;
}
export async function profile(id) {
  if (id === "example-maria-lopez") return { redirect: "#profile/" + exampleProfile.user_id };
  const ex = id === exampleProfile.user_id;
  const p = ex ? exampleProfile : await result(db.from("profiles").select("*").eq("user_id", id).maybeSingle()).catch(() => null);
  if (!p) return notFound("This profile isn’t available", "It may be private, awaiting approval, or no longer published.");
  const owner = state.user?.id === p.user_id;
  const isPublic = ex || (p.published && p.review_status === "approved");
  const contributions = ex ? exampleContributions : await result(db.rpc("public_contributions", { p_user: id })).catch(() => []);
  const hours = contributions.reduce((s, c) => s + Number(c.hours || 0), 0);
  const orgs = new Set(contributions.map((c) => c.organisation)).size;
  const countries = new Set(contributions.map((c) => c.organisation_country).filter(Boolean)).size;
  const canInvite = !ex && !owner && state.memberships.some((m) => m.organisation?.status === "approved") && isPublic;
  const wide = (title, inner) => `<div class="card stack xp-card" style="--gap:14px;margin-top:18px"><h2 style="font-size:2rem">${title}</h2>${inner}</div>`;
  const side = (title, inner) => `<div class="card stack" style="--gap:12px">${eyebrow(title)}${inner}</div>`;
  const html = `<div class="wrap stack" style="--gap:32px;padding-bottom:60px">
    ${back("All talent", "#talent")}
    ${ex ? `<div class="notice" role="note">${pill("Founder")}<span>This is the founder’s own impact CV, shown as a sample until the first professionals are approved. The work is real; each organisation will add its endorsement after review.</span></div>` : ""}
    ${owner && !isPublic ? `<div class="banner warn">${icon("eye", 22)}<p>Only you can see this page. ${p.review_status === "pending" ? "Your profile is awaiting approval." : "Publish your profile from your workspace when you are ready."}</p></div>` : ""}
    <section class="profile-head">
      ${avatarFor(p, 150)}
      <div class="stack" style="--gap:12px">${eyebrow("Impact CV")}<h1>${e(p.name)}</h1><p class="lead">${e(p.headline || "")}</p>
        <div class="meta"><span>${icon("map", 19, "#0f6f63")}${e([...new Set([p.location, p.country].filter(Boolean))].join(", ") || "Location not given")}</span><span>${icon("language", 19, "#0f6f63")}${e((p.languages || []).join(" · "))}</span><span>${icon("globe", 19, "#0f6f63")}${e(p.arrangement)}</span><span>${icon("clock", 19, "#0f6f63")}${p.hours_available ? `${p.hours_available} hours a month` : p.founder ? "Availability on request" : "Not available right now"}</span></div></div>
      <div class="stack actions-col no-print" style="--gap:10px">
        ${canInvite ? `<button class="btn" type="button" data-action="invite" data-id="${e(p.user_id)}">Invite to a need</button>` : owner ? btn("Edit profile", "#workspace/profile") : ""}${state.isAdmin && !ex && isPublic && !owner ? `<button class="btn secondary" type="button" data-action="introduce" data-id="${e(p.user_id)}" data-name="${e(p.name)}">Introduce to a need</button>` : ""}
        ${safeURL(p.linkedin) ? `<a class="btn linkedin" href="${e(safeURL(p.linkedin))}" target="_blank" rel="noopener noreferrer">${icon("linkedin", 18)}View on LinkedIn <span class="visually-hidden">(opens in a new tab)</span></a>` : ""}
        <button class="btn secondary" type="button" data-action="copy-link">${icon("link", 18)}Copy profile link</button>
        <button class="btn secondary" type="button" data-action="print">${icon("download", 18)}Save as PDF</button>
      </div>
    </section>
    ${(() => { const pending = contributions.filter((c) => c.pending).length;
      return `<section class="stats-dark"><div><strong data-counter="${hours}">${hours}</strong><span>hours handed over</span></div><div><strong data-counter="${contributions.length}">${contributions.length}</strong><span>${pending ? "contributions" : "reviewed contributions"}</span></div><div><strong data-counter="${orgs}">${orgs}</strong><span>organisations helped</span></div>${pending ? `<div><strong data-counter="${pending}">${pending}</strong><span>endorsements pending</span></div>` : `<div><strong data-counter="${countries}">${countries}</strong><span>countries</span></div>`}</section>`; })()}
    <p class="small muted" style="margin-top:-18px">${contributions.some((c) => c.pending) ? "Hours and work are as recorded by the professional until each organisation reviews them. Ratings stay private to the professional." : "Only work reviewed by the organisation counts. Ratings stay private to the professional."}</p>
    <div class="split left">
      <aside class="stack" style="--gap:18px">
        ${side("About", `<p class="prose" style="font-size:1rem">${e(p.bio || "No introduction yet.")}</p>`)}
        ${side("Skills", skillsByArea(p.skills || []))}
        ${p.website ? side("Elsewhere", `${safeLink(p.website, "Professional profile or website")}<span class="small muted">A link the professional added; not an identity check.</span>`) : ""}
        ${side("How this record is built", `<ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>An organisation defines a need</li><li>Both sign a contribution agreement</li><li>Hours are logged and reviewed</li><li>The organisation writes an endorsement</li><li>The professional chooses to publish it</li></ol>`)}
        ${!ex && !owner && state.user ? `<button class="link-btn" type="button" data-action="report" data-type="profile" data-id="${e(p.user_id)}" style="color:var(--muted);display:inline-flex;gap:8px;align-items:center">${icon("flag", 18)}Report this profile</button>` : ""}
      </aside>
      <section class="stack" style="--gap:14px"><div class="row between" style="align-items:baseline"><h2 style="font-size:2.4rem">Contributions</h2><span class="small muted">Open a contribution to see the details</span></div>
        ${contributions.length ? contributions.map((c) => contributionCard(c, { example: ex, owner })).join("") : empty(owner ? "Your first contribution will appear here" : "No published contributions yet", owner ? "When an organisation completes and endorses your work, you can publish it here." : "Contributions appear once an organisation has reviewed the work and the professional publishes it.", owner ? btn("Find a need", "#needs", "secondary sm") : "")}
        ${(p.experience_items || []).length ? wide("Experience", `${entryList(p.experience_items, "experience")}<span class="small muted">Self-described. Contributions are reviewed by organisations.</span>`)
          : p.experience ? wide("Experience", `<ul class="xp">${String(p.experience).split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => { const [role, ...rest] = l.split(" · "); return `<li><div class="xp-top"><strong>${e(role)}</strong></div>${rest.length ? `<span>${e(rest.join(" · "))}</span>` : ""}</li>`; }).join("")}</ul><span class="small muted">Self-described. Contributions are reviewed by organisations.</span>`) : ""}
        ${(p.education_items || []).length ? wide("Education", entryList(p.education_items, "education")) : ""}
      </section>
    </div></div>`;
  return { title: `${p.name} · impact CV`, description: p.headline || "Impact CV on Handova", html };
}

// ---------- How it works ----------
export async function how(focus = "") {
  const stages = [
    ["home", "Join", ["Get listed, then join", "Be listed in the Ethical Bridge directory, then create your Handova account. We check you are locally led and registered, or fiscally hosted."], ["Create your profile", "Experience, skills, working languages and realistic monthly hours. Approved before it is public; 18+."]],
    ["doc", "Need", ["Publish a need", "The challenge, the output, skills, languages and hours. Up to three open at a time."], ["Apply with a plan", "Say how you would approach the output and when you can do it."]],
    ["people", "Match", ["Choose who to work with", "Review applications, message candidates or invite approved professionals."], ["Hear back or get invited", "Accept an invitation, or wait for the organisation’s decision."]],
    ["pen", "Agree", null, null, ["Both sign the agreement", "Scope, hours, access and confidentiality, built from the need. Nothing confidential is shared before both signatures."]],
    ["check", "Deliver", ["Review and complete", "Approve logged hours, write an endorsement and mark the work complete."], ["Do the work, log your hours", "Then choose which reviewed contributions appear on your impact CV."]],
    ["handover", "Gain", ["Capability that stays", "A tool, a process or a trained team you keep using, and evidence of what changed."], ["A footprint on your impact CV", "Real experience and a reviewed record in the organisation’s own words. Everyone wins."]],
  ];
  const facts = [["gift", "Free", "for organisations and professionals"], ["clock", "6–16 hours", "is a typical contribution"], ["pen", "Signed first", "before any work or access"], ["shield", "Reviewed", "every organisation and profile"]];
  const cell = (who, [t, d]) => `<div class="j-cell ${who}"><strong>${t}</strong><p>${d}</p></div>`;
  const journey = `<div class="journey" role="list">
      <div class="j-lane-label org" aria-hidden="true">Organisation</div><div class="j-lane-label pro" aria-hidden="true">Professional</div>
      ${stages.map(([ic, name, org, pro, both], i) => `<div class="j-stage" role="listitem" style="--col:${i + 2}"><div class="j-head"><span class="j-num">${i + 1}</span>${icon(ic === "handover" ? "gift" : ic, 20, "#0f6f63")}<span>${name}</span></div>${both ? `<div class="j-cell both"><span class="j-who">Together</span><strong>${both[0]}</strong><p>${both[1]}</p></div>` : `${cell("org", org).replace("<strong>", `<span class="j-who">Organisation</span><strong>`)}${cell("pro", pro).replace("<strong>", `<span class="j-who">Professional</span><strong>`)}`}</div>`).join("")}
    </div>`;
  const vis = [["Your profile (after approval)", "Anyone, including search engines", "You: unpublish or delete at any time"], ["Open needs and organisation summary", "Anyone", "The organisation"], ["Applications and messages", "You and the organisation", "Both of you; either can end a conversation"], ["Contribution agreement", "You and the organisation", "Signatures are final"], ["Private rating", "Only the professional who was rated", "Nobody can change it"], ["Endorsements on an impact CV", "Anyone, once the professional publishes them", "The professional"]];
  const html = `<div class="wrap how stack" style="--gap:clamp(40px,5vw,64px);padding-bottom:64px">
    <div class="how-hero">
      <div class="stack" style="--gap:16px">${eyebrow("How it works")}<h1>Professional support, with clear expectations.</h1><p class="lead">Short, well-scoped contributions, agreed in writing and reviewed by the organisation. Here is exactly what happens, and what stays private.</p><div class="row" style="--gap:12px">${btn("Post a need", "#join?role=organisation")}${btn("Find a need", "#needs", "secondary")}</div></div>
      <div class="how-facts">${facts.map(([ic, t, d]) => `<div class="how-fact"><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><div><strong>${t}</strong><span>${d}</span></div></div>`).join("")}</div>
    </div>
    <nav class="path-switch" aria-label="Jump to your path"><button type="button" data-action="scroll-to" data-id="path-organisations"><span class="icon-tile">${icon("home", 22, "#0f6f63")}</span><span><strong>I’m an organisation</strong><span class="small muted">Publish needs and find skilled help</span></span>${icon("arrow", 18)}</button><button type="button" data-action="scroll-to" data-id="path-professionals"><span class="icon-tile">${icon("user", 22, "#0f6f63")}</span><span><strong>I’m a professional</strong><span class="small muted">Contribute skills and build an impact CV</span></span>${icon("arrow", 18)}</button></nav>
    <section class="stack" style="--gap:20px"><div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Six stages, side by side")}<h2>What each of you does.</h2></div><p class="muted" style="max-width:420px">Organisations and professionals follow the same path. The agreement is the moment you meet; the last stage is what you both keep.</p></div>${journey}</section>
    ${pathSection("organisations")}
    ${pathSection("professionals")}
    <section class="how-agree">
      <div class="stack" style="--gap:14px">${eyebrow("The contribution agreement")}<h2>Nothing starts until both sides sign.</h2><p class="lead">Every match gets its own agreement, built from the need itself. Hours can only be logged once both signatures are in.</p><a href="#safety" style="font-weight:700">How we work responsibly →</a></div>
      <ul class="how-checks">${["The agreed output, hours and working languages", "Timing, contact person and review steps", "Confidentiality, minimum access and data handling", "Who owns the work and what can be shown publicly", "What is out of scope, and how to end safely"].map((t) => `<li>${icon("check", 20, "#0f6f63", 2.2)}<span>${t}</span></li>`).join("")}</ul>
    </section>
    <section class="stack" style="--gap:18px"><div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Privacy")}<h2>You choose what becomes public.</h2></div><a href="#privacy" style="font-weight:700">Read the privacy notice →</a></div><div class="table-scroll"><table class="data stack-sm"><thead><tr><th scope="col">Information</th><th scope="col">Who can see it</th><th scope="col">Who controls it</th></tr></thead><tbody>${vis.map((r) => `<tr><td><strong>${r[0]}</strong></td><td data-label="Who can see it">${r[1]}</td><td class="muted" data-label="Who controls it">${r[2]}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="how-concern"><span class="icon-tile lg" style="background:var(--ochre-bg)">${icon("flag", 28, "#7a4f0e")}</span><div class="stack" style="--gap:4px"><strong class="serif" style="font-size:1.6rem;font-weight:500">Raise a concern</strong><p class="muted">Use Report a concern on any profile, need or conversation, or write to ${e(config.safeguardingEmail)}. If someone is in immediate danger, contact local emergency services first.</p></div>${btn("Working responsibly", "#safety", "dark")}</section>
  </div>`;
  const title = focus === "organisations" ? "For organisations" : focus === "professionals" ? "For professionals" : "How it works";
  return { title, description: "Short, well-scoped contributions, agreed in writing and reviewed by the organisation.", html, after: focus ? () => setTimeout(() => document.getElementById("path-" + focus)?.scrollIntoView({ block: "start" }), 60) : undefined };
}

export function notFound(title = "Page not found", text = "The page you were looking for doesn’t exist or has moved.") {
  return { title, html: `<div class="wrap page-head" style="padding-bottom:120px">${eyebrow("Not found")}<h1>${e(title)}</h1><p class="lead">${e(text)}</p><div class="row">${btn("Go to the home page", "#home")}${btn("Explore needs", "#needs", "secondary")}</div></div>` };
}

// ---------- actions from public pages ----------
export async function applyDialog(needId) {
  if (!state.user) return go("#signin?next=" + encodeURIComponent("#need/" + needId));
  const p = state.profile;
  if (!p) return go("#onboarding");
  if (!(p.published && p.review_status === "approved")) {
    return openDialog("Your profile needs approval first", `<p>${p.review_status === "pending" ? "Your profile is awaiting approval. We usually review within two working days, and you will get a notification." : "Publish your profile from your workspace. Once approved, you can apply."}</p><div class="row">${btn("Go to your workspace", "#workspace")}</div>`);
  }
  openDialog("Apply to this need", `<form class="form" data-form="apply" data-id="${e(needId)}">
    <p class="muted">Explain how you would approach the output and when you could do it. Only the organisation will see this.</p>
    ${field("message", "Your plan and availability", { type: "textarea", required: true, attrs: 'minlength="30" maxlength="4000" autofocus', hint: "At least 30 characters. Don’t include confidential information." })}
    ${formEnd("Send application", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}

export async function submitApply(form) {
  await withForm(form, async (fd) => {
    await result(db.from("applications").insert({ need_id: form.dataset.id, user_id: state.user.id, message: val(fd, "message") }));
    document.getElementById("dialog").close();
    toast("Application sent. You will be notified when the organisation decides.");
    go("#workspace");
  });
}
