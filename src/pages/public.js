import { locale, t } from "../i18n.js";
import { db, state, result, e, openDialog, toast, go, withForm, val, $, PROFILE_COLS } from "../core.js";
import { icon, mark, avatar, avatarFor, handoverStrip, roleTag, handedPill, cover, coverKind, COVER_BG, needCard, talentCard, contributionCard, exampleBadge, exampleNotice, tags, pill, eyebrow, empty, btn, back, field, formEnd, safeLink, status, entryList, SKILL_GROUPS } from "../ui.js";
import { exampleNeeds, exampleProfile, exampleContributions, solvedNeeds, handovaOrgs } from "../examples.js";
import { filterRecords, professionalAreas, date, plural, today, safeURL } from "../utils.js";
import { config } from "../config.js";
import { workingResponsibly } from "./legal.js";

const NEED_SELECT = "*, organisation:organisations(id,name,city,country,website,summary,org_type,ethical_bridge_url)";

async function openNeeds(limit) {
  let q = db.from("needs").select(NEED_SELECT).eq("status", "open").order("created_at", { ascending: false });
  if (limit) q = q.limit(limit);
  const rows = await result(q).catch(() => []);
  return rows.filter((n) => !n.deadline || n.deadline >= today());
}

// ---------- Home ----------
// Shared by the early page shell and the interactive home route.
export function homeHero() {
  return `<section class="hv-hero">
    <span class="hv-orb o1" aria-hidden="true"></span><span class="hv-orb o2" aria-hidden="true"></span><span class="hv-orb o3" aria-hidden="true"></span>
    <div class="wrap hv-hero-grid">
      <div class="stack hv-copy hv-top" style="--gap:18px">
        <a class="eb-badge" href="https://ethicalbridge.org/" target="_blank" rel="noopener"><span class="eb-dot" aria-hidden="true"></span><span>An initiative of</span> <strong>Ethical Bridge</strong>${icon("arrow", 15)}<span class="visually-hidden">(opens in a new tab)</span></a>
        ${eyebrow("Free, remote skills-based volunteering")}
        <h1>Skills handed over. <span>Capability that stays.</span></h1>
      </div>
      <div class="stack hv-copy" style="--gap:24px">
        <p class="lead">Skilled professionals volunteer a few focused hours a month, remotely. Locally led organisations get real work done and keep the skills: the team keeps the capability, and the professional keeps a reviewed record on their impact CV.</p>
        <div class="doors">
          <a class="door light" href="#join?role=organisation"><span class="door-icon">${icon("home", 24, "#0f6f63")}</span><span class="door-title">I’m an organisation</span><p>Publish a need and find skilled help, free. For organisations in the Ethical Bridge directory.</p><span class="door-cta">Post a need ${icon("arrow", 18)}</span></a>
          <a class="door ghost" href="#join?role=professional"><span class="door-icon">${icon("user", 24, "#fffdf8")}</span><span class="door-title">I’m a professional</span><p>Volunteer your skills, find your way into the ethical sector and build a reviewed impact CV.</p><span class="door-cta">Offer your skills ${icon("arrow", 18)}</span></a>
        </div>
        <dl class="hv-facts">
          <div><dt><b>3,300+</b></dt><dd><a class="hv-fact-link" href="https://ethicalbridge.org/" target="_blank" rel="noopener">organisations in the Ethical Bridge directory<span class="visually-hidden"> (opens in a new tab)</span></a></dd></div>
          <div><dt><b><small class="fact-pre">up to</small> 16</b></dt><dd>hours for each need</dd></div>
          <div><dt><b data-counter="6">6</b></dt><dd>steps from joining to handover</dd></div>
          <div><dt><b data-counter="100" data-suffix="%">100%</b></dt><dd>of profiles reviewed before going public</dd></div>
        </dl>
      </div>
      ${stage()}
    </div>
    <a class="hv-cue" href="#how" data-action="scroll-to" data-id="hv-demo" aria-label="Scroll to the video"><span></span></a>
  </section>`;
}

// The 1:39 demo. Click to play (no autoplay), nothing downloads until then; subtitles are separate tracks
// (Spanish and English) so visitors switch them on, off or between languages from the player's CC menu.
function demoVideo() {
  return `<figure class="hv-video-frame">
      <video controls preload="none" playsinline width="1280" height="720" poster="assets/handova-demo-poster-720.jpg" aria-label="Handova demo video, 1 minute 39 seconds, in English" data-demo-video>
        <source src="assets/handova-demo-720.mp4" type="video/mp4">
        <track kind="subtitles" src="assets/handova-demo.en.vtt" srclang="en" label="English">
        <track kind="subtitles" src="assets/handova-demo.es.vtt" srclang="es" label="Español">
        <a href="assets/handova-demo-720.mp4">Download the demo video (MP4, 3 MB)</a>
      </video>
      <figcaption class="hv-subs" role="group" aria-label="Subtitles">
        <span class="hv-subs-label">${icon("doc", 16)}<span>Subtitles</span></span>
        <button type="button" data-subs="es" lang="es" aria-pressed="false">Español</button>
        <button type="button" data-subs="en" lang="en" aria-pressed="false">English</button>
        <button type="button" data-subs="off" aria-pressed="false">Off</button>
      </figcaption>
    </figure>`;
}

// Safety principles and the questions. Shown on About › FAQ & safety.
function faqAndSafety(middle = "") {
  const faqs = [["Is Handova a volunteering platform?", "Yes. Handova is for skills-based volunteering, sometimes called pro bono work: professionals give their skills, remotely and for free, to locally led non-profits and community organisations. Each contribution is a short, well-defined piece of work, not an ongoing role."], ["Do professionals verify their identity?", "Yes. Before their first contribution, professionals confirm their identity with our provider, Didit, using a photo of an ID document and a quick selfie. Others only see an “ID verified” badge, never the document."], ["Is it really free?", "Yes. Handova is free for organisations and for professionals."], ["Who pays for Handova?", "Ethical Bridge, the organisation behind Handova, covers the costs, and we are applying for grant funding to grow it."], ["How is Handova linked to Ethical Bridge?", "Handova is an initiative of Ethical Bridge. Organisations in the Ethical Bridge directory can use it to get extra support from skilled professionals, free."], ["Is the work paid?", "No. Contributions are voluntary. Any expenses need separate written terms between the two of you."], ["Who can join?", "Organisations in the Ethical Bridge directory that are locally led, meaning run by people based where they work, and registered, or fiscally hosted by a registered organisation that manages their funds. And professionals aged 18 or over, anywhere in the world."], ["How long is a contribution?", "Every need takes at most 16 hours, agreed up front and logged as you go."], ["How much time do professionals commit?", "At least 4 hours a month of availability, and each professional chooses how many. We hope that time turns into delivered work. To keep the community active and save organisations’ time, a profile is marked inactive after three months without activity, such as applying to a need, and closed after six. We email you two weeks before each step, so if you are away or busy, just tell us and we will keep your profile open. A closed profile can be published again at any time, after we review it."], ["What does the professional get?", "Real experience in the ethical and non-profit sector, and a reviewed record on their impact CV: what they did, for whom, and the organisation’s endorsement in its own words. For students and career changers, it is a practical way into the sector."], ["Why the name Handova?", "It comes from “hand over”: the moment a piece of work passes to the team that keeps it. Every contribution ends with a handover."], ["What if the professional doesn’t deliver?", "Start with a message through Handova; most delays are solved with a quick check-in. If it still isn’t working, either side can end the contribution at any time. Hours you haven’t approved don’t count, nothing goes on their impact CV without your review, and your need can go back up for someone else. If a professional repeatedly doesn’t deliver, tell us and we can pause their profile."], ["What if something goes wrong?", "Either side can pause or end a conversation or contribution, and anyone can report a concern. Our safeguarding lead reviews every report."]];
  return `  <div class="wrap">
    <section class="card grid-2" style="background:var(--mint);border-color:#bcd6cd;padding:clamp(28px,5vw,56px);gap:48px">
      <div class="stack" style="--gap:18px"><span class="icon-tile lg paper">${icon("shield", 30, "#0f6f63")}</span><h2 style="font-size:clamp(1.9rem,3vw,2.7rem)">Good intentions need good boundaries.</h2><a href="#safety" data-action="scroll-to" data-id="working-responsibly" style="font-weight:700">Read how we work responsibly</a></div>
      <div class="stack">${[["lock", "Trust comes before access", "Nothing confidential is shared until both sides have signed. Never passwords, card details or access codes."], ["people", "No work with children or adults at risk", "Needs never involve direct contact with children or adults at risk."], ["flag", "Anyone can raise a concern", "Report a profile, need or conversation at any time. Either side can end a conversation."]].map(([ic, t, d]) => `<div class="card row hv-lift" style="align-items:flex-start;flex-wrap:nowrap;padding:20px 22px">${icon(ic, 24, "#0f6f63")}<div><strong>${t}</strong><p class="muted">${d}</p></div></div>`).join("")}</div>
    </section>
    ${middle}
    <section class="block grid-2 faq-grid">
      <div class="stack" data-reveal>${eyebrow("Questions")}<h2>Good to know before you start.</h2></div>
      <div data-faq>${faqs.map(([q, a], i) => `<details class="faq" ${i === 0 ? "open" : ""}><summary>${q}<span class="faq-icon" aria-hidden="true"></span></summary><p>${a}</p></details>`).join("")}</div>
    </section>
  </div>`;
}

export function home() {
  const trust = [["gift", "Free for everyone", "No fees for organisations or professionals."], ["eye", "Approved before going public", "Every organisation and profile is reviewed first."], ["pen", "Agreed before work", "Both sides sign the scope before anything starts."], ["shield", "Reviewed, not claimed", "Hours and outcomes come from the organisation."]];
  const rest = `
  <div class="wrap">
    <div class="trust-strip hv-lift">${trust.map(([ic, t, d]) => `<div><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><div><strong>${t}</strong><p class="small muted">${d}</p></div></div>`).join("")}</div>
    <section class="block stack" style="--gap:40px;padding-bottom:0">
      <div class="hv-head" data-reveal><div class="stack">${eyebrow("Why Handova")}<h2>Willing hands on one side. Real needs on the other.</h2></div><p class="lead">Around the world, skilled people want to help. But a volunteer role or an internship asks for more time than they have, and they rarely know which organisation needs them. Some give money; many would rather give what they know, a few hours a month. Meanwhile, locally led organisations carry big missions with small teams. Handova, an initiative of Ethical Bridge, builds the bridge between them.</p></div>
      <div class="hb" data-reveal>
        <div class="hb-side pro"><span class="hv-tag">Professionals</span><strong class="hb-title">Want to give what they know</strong><ul class="hb-list"><li>${icon("check", 20, "#7c3419", 2.4)}<span>To use their skills where it really counts</span></li><li>${icon("check", 20, "#7c3419", 2.4)}<span>A few hours a month, not a long-term commitment</span></li><li>${icon("check", 20, "#7c3419", 2.4)}<span>An organisation they can trust, without searching for months</span></li><li>${icon("check", 20, "#7c3419", 2.4)}<span>Something real to show for it</span></li></ul></div>
        <div class="hb-bridge"><svg class="hb-arch" viewBox="0 0 300 112" aria-hidden="true" focusable="false"><path d="M20 92 Q150 -10 280 92" fill="none" stroke="#0f6f63" stroke-width="5" stroke-linecap="round"/><g stroke="#7fa99b" stroke-width="3" stroke-linecap="round"><line x1="60" y1="66" x2="60" y2="92"/><line x1="100" y1="49" x2="100" y2="92"/><line x1="150" y1="41" x2="150" y2="92"/><line x1="200" y1="49" x2="200" y2="92"/><line x1="240" y1="66" x2="240" y2="92"/></g><line x1="0" y1="92" x2="300" y2="92" stroke="#123e3a" stroke-width="7" stroke-linecap="round"/><rect x="16" y="92" width="10" height="20" rx="3" fill="#123e3a"/><rect x="274" y="92" width="10" height="20" rx="3" fill="#123e3a"/><circle class="hb-dot" cx="150" cy="80" r="8" fill="#e0a07f"/></svg><span class="hb-name">${mark(36)}<span>Handova</span></span><span class="hb-sub">The bridge</span><ol class="hb-planks"><li>One clear need</li><li>A signed agreement</li><li>A few focused hours, free</li></ol></div>
        <div class="hb-side org"><span class="hv-tag">Locally led organisations</span><strong class="hb-title">Big missions, small teams</strong><ul class="hb-list"><li>${icon("check", 20, "#0f6f63", 2.4)}<span>Expertise they cannot afford to hire</span></li><li>${icon("check", 20, "#0f6f63", 2.4)}<span>Help shaped around their work, not the helper’s</span></li><li>${icon("check", 20, "#0f6f63", 2.4)}<span>Someone who hands the work over, not someone who disappears</span></li><li>${icon("check", 20, "#0f6f63", 2.4)}<span>No fees, no long onboarding</span></li></ul></div>
      </div>
      <div class="hv-exchange" data-reveal>
        <div class="hv-ex-side pro"><span class="hv-tag">What stays with the professional</span><strong>A lasting record</strong><p>A reviewed record on their impact CV: the need, the output and the organisation’s own words.</p></div>
        <div class="hv-ex-mid" aria-hidden="true">${mark(84, true)}<span>Everyone wins</span></div>
        <div class="hv-ex-side"><span class="hv-tag">What stays with the organisation</span><strong>Capability</strong><p>A tool, a process or a trained team they keep using, long after the hours are done.</p></div>
      </div>
    </section>
    <section class="stack hv-video" id="hv-demo" style="--gap:28px;padding-bottom:clamp(56px,8vw,110px)">
      <div class="stack" data-reveal>${eyebrow("See it in under two minutes")}<h2>From a need to a handover.</h2></div>
      ${demoVideo()}
    </section>
  </div>
  <section class="hv-cta"><span class="hv-orb o1" aria-hidden="true"></span><span class="hv-orb o2" aria-hidden="true"></span>
    <div class="wrap hv-cta-grid">
      <div class="stack" style="--gap:18px">${eyebrow("Join the founding group")}<h2>Hand over something that lasts.</h2><p class="lead">We are opening Handova to a first group of 20 organisations and 20 professionals. Founding members get personal onboarding from our team and a direct say in what we build next.</p><div class="row">${btn("Offer your skills", "#join?role=professional", "light lg")}${btn("Post a need", "#join?role=organisation", "ghost-light lg")}</div></div>
      <div class="hv-cta-mark" aria-hidden="true">${mark(220, true, "draw")}</div>
    </div>
  </section>`;
  return { title: "Skills handed over. Capability that stays.", description: "Local organisations publish the help they need. Skilled professionals give a few focused hours. Free for everyone.", html: homeHero() + rest, rest };
}

// The hero "handover": the mark draws itself, the dot passes between the curves, and the story floats around it.
function stage() {
  return `<div class="hv-stage" aria-hidden="true">
    <div class="hv-ring"></div>
    <svg class="hv-big" viewBox="0 0 100 100"><path class="hv-a" d="M18 72 Q18 28 50 28" fill="none" stroke="#fffdf8" stroke-width="9" stroke-linecap="round" pathLength="1"/><path class="hv-b" d="M82 28 Q82 72 50 72" fill="none" stroke="#7fa99b" stroke-width="9" stroke-linecap="round" pathLength="1"/><circle class="hv-dot" cx="50" cy="50" r="9" fill="#e0a07f"/></svg>
    <div class="hv-float f1 row" style="flex-wrap:nowrap"><span class="hv-orglogo"><img src="${e(exampleContributions[0].org_logo)}" width="44" height="44" alt="" referrerpolicy="no-referrer"></span><div><strong>${e(exampleContributions[0].organisation)}</strong> ${roleTag("Organisation")}<br><span class="small muted">${e(exampleContributions[0].need_title)} · handed over</span><br><span class="small muted">Sukadana, Indonesia</span></div></div>
    <div class="hv-float f2 row" style="flex-wrap:nowrap">${avatarFor(exampleProfile, 44)}<div><strong>${e(exampleProfile.name)}</strong> ${roleTag("Talent")}<br><span class="small muted">${e(exampleProfile.headline)}</span></div></div>
    <div class="hv-float f3 hv-pill">${icon("pen", 17, "#fffdf8")}Agreement signed by both</div>
    <div class="hv-float f4"><div class="row between"><span class="small" style="color:var(--teal);font-weight:700;display:inline-flex;gap:6px">${icon("shield", 16)}Handed over · still in use</span>${exampleBadge()}</div><p class="serif" style="font-size:1.02rem;margin-top:6px">“Our field team now collects data the same way in every village.”</p></div>
  </div>`;
}


// ---------- About ----------
const EB = {
  site: "https://ethicalbridge.org/", directory: "https://ethicalbridge.org/directory.html", join: "https://ethicalbridge.org/organisation-register.html", forOrgs: "https://ethicalbridge.org/organisations.html",
  social: [["LinkedIn", "https://www.linkedin.com/company/ethicalbridge/"], ["Instagram", "https://instagram.com/ethical.bridge"], ["Facebook", "https://www.facebook.com/profile.php?id=61588796042823"], ["YouTube", "https://www.youtube.com/@EthicalBridge"], ["TikTok", "https://www.tiktok.com/@ethical.bridge"]],
};
export const ethicalBridgeLinks = EB;
const ext = (href, label, cls = "") => `<a class="${cls}" href="${href}" target="_blank" rel="noopener">${label} <span class="visually-hidden">(opens in a new tab)</span></a>`;

// About is a short menu of separate pages: Our mission (the home page content), Ethical Bridge and Our founder.
export async function about(sub = "mission") {
  if (sub === "ethical-bridge") {
    const html = `<div class="wrap stack about" style="--gap:clamp(40px,5vw,64px);padding-bottom:64px">
    <div class="how-hero">
      <div class="stack" style="--gap:16px"><a class="eb-badge" href="${EB.site}" target="_blank" rel="noopener"><span class="eb-dot" aria-hidden="true"></span>An initiative of <strong>Ethical Bridge</strong>${icon("arrow", 15)}<span class="visually-hidden">(opens in a new tab)</span></a>${eyebrow("About Handova")}<h1>Extra support for the organisations of Ethical Bridge.</h1><p class="lead">Handova is an initiative of Ethical Bridge. Locally led organisations in the Ethical Bridge directory can ask for skilled help with one specific need, and professionals give a few focused hours, free. The work is handed over, so the capability stays with the team.</p><div class="row" style="--gap:12px">${btn(`How it works ${icon("arrow", 18)}`, "#how")}${ext(EB.site, "Visit Ethical Bridge", "btn secondary")}</div></div>
      <div class="about-mark" aria-hidden="true">${mark(200, false, "draw")}<span>Skills handed over.<br><b>Capability that stays.</b></span></div>
    </div>
    <section class="about-flow">
      <div class="stack" style="--gap:10px">${eyebrow("How the two fit together")}<h2>One ecosystem, two kinds of support.</h2></div>
      <ol class="about-steps">
        <li><span class="about-n">1</span><strong>Ethical Bridge directory</strong><p>A global directory of more than 3,300 ethical, locally led organisations in 193 countries. Being listed makes an organisation visible to people, partners and funders.</p>${ext(EB.directory, "Explore the directory")}</li>
        <li><span class="about-n">2</span><strong>Handova</strong><p>Organisations in the directory can go further: publish a specific need and get skilled help from approved professionals, under a signed agreement.</p><a href="#how">See how it works</a></li>
        <li><span class="about-n">3</span><strong>What stays, on both sides</strong><p>The organisation keeps a tool, a process or a trained team. The professional keeps a reviewed record on their impact CV. It is an exchange where both sides keep something.</p><a href="#talent">Meet the talent</a></li>
      </ol>
    </section>
    <section class="grid-2" style="gap:24px">
      <div class="card stack" style="--gap:16px;padding:clamp(26px,4vw,40px)">${eyebrow("For organisations")}<h3 class="serif" style="font:500 1.9rem/1.15 var(--serif)">Already in the Ethical Bridge directory?</h3><p class="muted">You can create a Handova account straight away. Add your directory page when you sign up, and we review your organisation before your needs go public.</p><div class="row">${btn("Post a need", "#join?role=organisation")}</div></div>
      <div class="card stack" style="--gap:16px;padding:clamp(26px,4vw,40px);background:var(--mint);border-color:#bcd6cd">${eyebrow("Not listed yet")}<h3 class="serif" style="font:500 1.9rem/1.15 var(--serif)">Join the directory first. It is free.</h3><p class="muted">Apply to the Ethical Bridge directory. Once your organisation is listed, come back to Handova to ask for skilled support.</p><div class="row">${ext(EB.join, `Join the Ethical Bridge directory ${icon("arrow", 18)}`, "btn")}</div></div>
    </section>
    <section class="about-eb">
      <div class="stack" style="--gap:12px"><a class="about-eb-logo" href="${EB.site}" target="_blank" rel="noopener"><img src="assets/ethical-bridge-logo-light.webp" width="220" height="60" alt="Ethical Bridge" loading="lazy" decoding="async"><span class="visually-hidden">(opens in a new tab)</span></a><h2>Follow Ethical Bridge.</h2><p class="lead">News, organisations and opportunities from across the Ethical Bridge community.</p></div>
      <div class="about-links">
        ${ext(EB.site, `${icon("globe", 20)}<span>ethicalbridge.org</span>`, "about-link")}
        ${ext(EB.directory, `${icon("search", 20)}<span>The directory</span>`, "about-link")}
        ${ext(EB.forOrgs, `${icon("home", 20)}<span>For organisations</span>`, "about-link")}
        ${EB.social.map(([n, u]) => ext(u, `${icon(n.toLowerCase(), 20)}<span>${n}</span>`, "about-link")).join("")}
      </div>
    </section>
    <section class="how-concern"><span class="icon-tile lg">${icon("shield", 28, "#0f6f63")}</span><div class="stack" style="--gap:4px"><h2 class="serif" style="font-size:1.6rem;font-weight:500;margin:0">Who runs Handova</h2><p class="muted">Handova is operated by Ethical Bridge, which is responsible for the personal information collected through it. Write to ${e(config.contactEmail)} with any question.</p></div>${btn("Privacy notice", "#privacy", "dark")}</section>
  </div>`;
    return { title: "Ethical Bridge", description: "Handova is an initiative of Ethical Bridge: extra, skilled support for the organisations in its directory.", html };
  }
  if (sub === "founder") {
    const html = `<div class="wrap stack about" style="--gap:clamp(40px,5vw,64px);padding-top:clamp(40px,5vw,64px);padding-bottom:64px">    <section class="founder-hero">
      <figure class="fh-photo"><img src="${e(exampleProfile.photo)}" width="480" height="480" alt="Julieta Castiñeira de Dios, founder of Handova" decoding="async"><figcaption>Founder of Ethical Bridge and Handova</figcaption></figure>
      <div class="stack" style="--gap:18px">${eyebrow("Our founder")}<h1>${e(exampleProfile.name)}</h1><span class="fh-role">Lawyer · strategist · organisation builder</span><p class="serif fh-lead">She founded Ethical Bridge and built Handova so the organisations in its directory can reach skilled help for free.</p><p class="muted">She has worked with Save the Children in Australia and Denmark and with AdvocAid in Sierra Leone, and has evaluated programmes for the Lutheran World Federation, the IMF and the World Bank, after starting her career in Argentina’s public defence service.</p><a href="#profile/${exampleProfile.user_id}" style="font-weight:700">See Julieta’s impact CV ${icon("arrow", 16)}</a></div>
    </section>
    <section class="founder-story stack" style="--gap:28px"><div class="stack" style="--gap:14px">${eyebrow("In her words")}<h2>It started with one conversation, repeated across three countries.</h2><p class="lead">Travelling through Indonesia, Malaysia and Brunei for Ethical Bridge’s first interviews and first mission, I sat down with organisation after organisation. Different missions, different communities. And yet, the same story kept coming back.</p><div class="fs-route" aria-label="Indonesia, Malaysia and Brunei">${icon("map", 18, "#0f6f63")}<span>Indonesia</span><i aria-hidden="true"></i><span>Malaysia</span><i aria-hidden="true"></i><span>Brunei</span></div></div><ol class="fs-beats"><li class="fs-beat"><span class="fs-n">1</span><strong>What I kept hearing</strong><p>Every team had its own specific needs, the kind that quietly slow everything down when you work with limited resources of every kind.</p></li><li class="fs-beat"><span class="fs-n">2</span><strong>Who I already knew</strong><p>So many people with exactly the skills to solve those needs, often in just a few hours. People who kept asking me how to start working in the NGO sector, and who, like me, found that path far harder than it should be.</p></li><li class="fs-beat final"><span class="fs-n">3</span><strong>The bridge</strong><p>The need and the help already existed. They simply had not found each other. Handova is where they meet.</p></li></ol></section>
    <section class="founder-quote"><span class="fq-glyph" aria-hidden="true">“</span><blockquote><p class="fq-big">The responsibility to protect the vulnerable, nature and animals should not rest on <span class="fq-hl">a few shoulders.</span></p><p class="fq-small">I am building an ecosystem where we all carry a little of the weight, support each other easily, and together make this world a better one.</p><footer>${avatarFor(exampleProfile, 52)}<span><strong>Julieta Castiñeira de Dios</strong><span>Founder of Ethical Bridge and Handova</span></span></footer></blockquote><svg class="fq-arch" viewBox="0 0 300 112" aria-hidden="true" focusable="false"><path d="M20 92 Q150 -10 280 92" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><line x1="0" y1="92" x2="300" y2="92" stroke="currentColor" stroke-width="7" stroke-linecap="round"/></svg></section>
  </div>
  <section class="hv-cta"><span class="hv-orb o1" aria-hidden="true"></span><span class="hv-orb o2" aria-hidden="true"></span>
    <div class="wrap hv-cta-grid">
      <div class="stack" style="--gap:18px">${eyebrow("Carry a little of the weight")}<h2>Be part of the bridge.</h2><p class="lead">Give a few hours of your skills, or tell us what your team needs. Either way, the work stays where it is needed.</p><div class="row">${btn("Offer your skills", "#join?role=professional", "light lg")}${btn("Post a need", "#join?role=organisation", "ghost-light lg")}</div></div>
      <div class="hv-cta-mark" aria-hidden="true">${mark(220, true, "draw")}</div>
    </div>
  </section>`;
    return { title: "Our founder", description: "Julieta Castiñeira de Dios founded Ethical Bridge and built Handova.", html };
  }
  if (sub === "faq") {
    const html = `<div><div class="wrap"><div class="page-head">${eyebrow("Questions &amp; safety")}<h1>FAQ &amp; safety</h1><p class="lead">How Handova works day to day, how we keep contributions safe, and the legal terms behind it.</p></div></div>${faqAndSafety(`<section class="stack" id="working-responsibly" style="--gap:28px;padding-top:clamp(48px,7vw,96px);scroll-margin-top:96px"><div class="stack" style="--gap:10px">${eyebrow("Working responsibly")}<h2>The rules that keep every contribution safe.</h2><p class="lead" style="max-width:760px">Every professional and every organisation agrees to these before any work starts.</p></div>${workingResponsibly({ withConcern: false, nested: true })}</section>`)}</div><div class="wrap stack" style="--gap:20px;padding-bottom:64px"><section class="how-concern"><span class="icon-tile lg">${icon("flag", 28, "#0f6f63")}</span><div class="stack" style="--gap:4px"><h2 class="serif" style="font-size:1.6rem;font-weight:500;margin:0">Raise a concern</h2><p class="muted">Use Report a concern on any profile, need or conversation, or write to ${e(config.safeguardingEmail)}. If someone is in immediate danger, contact local emergency services first.</p></div>${btn("Report a concern", "#report", "dark")}</section><section class="how-concern"><span class="icon-tile lg">${icon("doc", 28, "#0f6f63")}</span><div class="stack" style="--gap:4px"><h2 class="serif" style="font-size:1.6rem;font-weight:500;margin:0">Legal</h2><p class="muted">How we handle your information, and the terms everyone agrees to.</p></div><div class="row">${btn("Privacy notice", "#privacy", "secondary sm")}${btn("Terms of use", "#terms", "secondary sm")}${btn("Cookies", "#cookies", "secondary sm")}<button class="btn secondary sm" type="button" data-action="cookie-settings">Cookie settings</button></div></section></div>`;
    return { title: "FAQ & safety", description: "Common questions about Handova, how we keep contributions safe, and our legal terms.", html };
  }
  // Our mission: for now the same content as the home page.
  return { ...home(), title: "Our mission" };
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
    ? [["Be listed in the Ethical Bridge directory", "Handova is extra support for organisations in the Ethical Bridge directory. Joining the directory is free."], ["Create your organisation account", "Add your directory page. We check you are locally led and registered or fiscally hosted, usually within two working days."], ["Publish a need", "Describe the challenge, the output, the skills, the working languages and the hours. Up to three open at a time."], ["Choose who to work with", "Review applications, or invite approved professionals whose work fits."], ["Sign the agreement", "Confirm scope, access and confidentiality before anything is shared."], ["Review and complete", "Approve logged hours, write an endorsement and mark the contribution complete."]]
    : [["Create your profile", "Your experience, education, skills, working languages and LinkedIn. Offer at least 4 hours a month of availability and sign the professional agreement. We approve every profile before it is public. Before your first contribution, you confirm your identity with an ID photo and a selfie."], ["Find a need", "Browse needs from approved, locally led organisations, or wait to be invited to one that fits."], ["Apply with a plan", "Say how you would approach the output and when you could do it. Only the organisation sees it."], ["Sign the agreement", "Agree the scope, access and confidentiality with the organisation before any work starts."], ["Do the work", "Work to the agreed scope and log your hours as you go. The organisation reviews them."], ["Hand over and build your impact CV", "Hand over the output so the team can keep using it. Reviewed work joins your impact CV."]];
  const who = org
    ? ["Listed in the Ethical Bridge directory (free to join)", "Local NGOs, cooperatives, community groups and small mission-led social enterprises", "Led by people based where the organisation works", "Registered, or fiscally hosted (a registered organisation manages your funds)", "Needs that do not involve direct contact with children or adults at risk"]
    : ["Professionals with experience in data, finance, design, communications, policy, technology, law and more", "Students, recent graduates and people changing careers", "Aged 18 or over, anywhere in the world", "Available for at least 4 hours a month, remotely. You only do work you have agreed and signed for"];
  const good = org
    ? [`What a good need looks like`, `<p>One clear output, up to 16 hours, the skills and working languages involved. For example: “A data collection template that works offline, and a 90-minute training session for our six field officers.”</p><a href="#need/example-data-tools">See an example need</a>`]
    : [`What a good application looks like`, `<p>Specific and short: how you would approach the output, what you have done that is similar, and when you can do it. For example: “I have built two offline survey templates in KoboToolbox; I can deliver in two weeks, three hours a week.”</p><a href="#profile/julieta-castineira-de-dios">See a sample impact CV</a>`];
  return `<section class="path-section" id="path-${kind}">
    <div class="row between" style="align-items:flex-end;margin-bottom:22px"><div class="stack" style="--gap:12px"><span class="eyebrow path-eyebrow">${org ? "For organisations" : "For professionals"}</span><h2>${org ? "Skilled help for the work you define." : "Meaningful work that fits around your life."}</h2><p class="lead" style="max-width:720px">${org ? "Handova connects locally led organisations with professionals who contribute a few focused hours, free. You set the need, the output and what success looks like." : "Give a few focused hours to an organisation that defined exactly what it needs. You gain real experience in the ethical and non-profit sector, and a reviewed record on your impact CV to show future employers. For students and career changers, it is a practical way in."}</p></div><div class="row">${btn(`${org ? "Post a need" : "Offer your skills"} ${icon("arrow", 18)}`, org ? "#join?role=organisation" : "#join?role=professional")}${btn(org ? "Browse talent" : "Browse needs", org ? "#talent" : "#needs", "secondary")}</div>${org ? `<a class="small" style="font-weight:700" href="https://ethicalbridge.org/organisation-register.html" target="_blank" rel="noopener">Not in the Ethical Bridge directory yet? Join it first ${icon("arrow", 15)}</a>` : ""}</div>
    <div class="grid-2" style="gap:24px">
      <div class="card stack" style="--gap:22px;background:var(--deep);color:var(--paper);border-color:var(--deep);padding:clamp(26px,4vw,44px)"><h3 class="serif" style="font:500 2rem/1.15 var(--serif)">How it works for you</h3><ol class="stack" style="list-style:none;margin:0;padding:0;--gap:20px">${steps.map(([t, d], i) => `<li class="row" style="align-items:flex-start;flex-wrap:nowrap"><span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:20px;background:#fffdf8;color:#123e3a;font-weight:700;flex-shrink:0">${i + 1}</span><div><strong>${t}</strong><p style="color:var(--on-deep)">${d}</p></div></li>`).join("")}</ol></div>
      <div class="stack" style="--gap:24px">
        <div class="card stack">${eyebrow("Who can join")}<ul class="checks">${who.map((t) => `<li>${icon("check", 22, "#0f6f63", 2.2)}${t}</li>`).join("")}</ul></div>
        <div class="card stack">${eyebrow(good[0])}${good[1]}</div>
        <div class="banner">${icon("gift", 24, "#0f6f63")}<p><strong>Always free.</strong> Contributions are voluntary; no fees are charged to organisations or professionals.</p></div>
      </div>
    </div>
  </section>`;
}

// ---------- Needs directory ----------
// Languages offered in both directories: the four main working languages, then any language an approved professional offers.
// Needs and Talent use the same list, built from talent profiles.
function talentLanguages(profiles = []) {
  const MAIN = ["English", "Spanish", "French", "Portuguese"];
  const main = new Set(MAIN.map((l) => l.toLowerCase()));
  const seen = new Map();
  for (const l of profiles.flatMap((p) => p.languages || [])) if (l && !main.has(l.toLowerCase()) && !seen.has(l.toLowerCase())) seen.set(l.toLowerCase(), l);
  return [...MAIN, ...[...seen.values()].sort((a, b) => a.localeCompare(b))];
}
async function approvedTalent(cols) {
  return result(db.from("profiles").select(cols).eq("published", true).eq("review_status", "approved").order("approved_at", { ascending: false })).catch(() => []);
}

function filtersForm(kind, langs) {
  const opts = (arr) => arr.map((x) => (Array.isArray(x) ? `<option value="${e(x[0])}">${e(x[1])}</option>` : `<option>${e(x)}</option>`)).join("");
  return `<form class="filters" id="filters" role="search" aria-label="Filter ${kind}">
    <label>Search<input name="search" type="search" placeholder="${kind === "needs" ? "Skill, organisation or keyword" : "Name, skill or experience"}" autocomplete="off"></label>
    <label>Professional area<select name="area"><option value="">All areas</option>${opts(professionalAreas.map((a) => a.label))}</select></label>
    <label>Working language<select name="language"><option value="">Any language</option>${opts(langs)}</select></label>
    <label>Hours<select name="hours"><option value="">Any hours</option><option value="4">Up to 4 hours</option><option value="8">5 to 8 hours</option><option value="16">9 to 16 hours</option></select></label>
    <div class="actions"><p id="count" class="muted" role="status" aria-live="polite"></p><button class="link-btn" type="reset">Clear filters</button></div>
  </form>`;
}

export async function needs() {
  const [real, pros] = await Promise.all([openNeeds(), approvedTalent("languages")]);
  const rows = real.length ? real : exampleNeeds;
  const html = `<div class="wrap stack" style="--gap:28px;padding-bottom:40px">
    <div class="page-head">${eyebrow("Open needs")}<h1>Where your expertise can help.</h1><p class="lead">Every need is written by an approved, locally led organisation: the output they need, the skills involved and a realistic number of hours.</p></div>
    ${filtersForm("needs", talentLanguages([exampleProfile, ...pros]))}
    ${real.length ? "" : exampleNotice("There are no open needs yet, so you are seeing examples. Real needs from approved organisations will appear here.")}
    <h2 class="visually-hidden">Results</h2><div class="grid" id="results"></div>
    <section class="stack" style="--gap:18px;padding-top:24px">
      <div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Handed over")}<h2>Needs already handed over.</h2><p class="lead" style="max-width:680px">Work our founder handed over to organisations in the Ethical Bridge network before Handova opened. The organisations have not reviewed it on Handova yet. The capability stays with each team; the record stays on the impact CV. Open one to see it on the organisation’s page.</p></div>${btn(`See the impact CV ${icon("arrow", 18)}`, "#profile/" + exampleProfile.user_id, "secondary")}</div>
      <div class="grid">${solvedNeeds.map(needCard).join("")}</div>
    </section>
    <div class="grid-2" style="gap:20px"><div class="card stack" style="--gap:14px;background:var(--mint);border-color:#bcd6cd"><span class="serif" style="font-size:1.8rem">Can’t find the right fit yet?</span><p class="muted">Publish your profile and organisations can invite you to a need that matches your skills.</p><div class="row">${btn(`Offer your skills ${icon("arrow", 18)}`, "#join?role=professional")}</div></div><div class="card stack band-dark" style="--gap:14px;background:var(--deep);border-color:var(--deep);color:var(--paper)"><span class="serif" style="font-size:1.8rem">Have a need of your own?</span><p style="color:var(--on-deep)">Organisations in the Ethical Bridge directory can publish a need for free and get skilled help.</p><div class="row">${btn(`Post a need ${icon("arrow", 18)}`, "#join?role=organisation", "light")}</div></div></div>
  </div>`;
  return { title: "Open needs", description: "Browse needs published by approved, locally led organisations.", html, after: () => bindFilters(rows, needCard, "need") };
}

const STANDARD = new Set(SKILL_GROUPS.flatMap(([, l]) => l.map((x) => x.toLowerCase())));
function bindFilters(rows, card, noun) {
  const f = $("#filters");
  const draw = () => {
    const data = Object.fromEntries(new FormData(f));
    // A professional area matches the skills people pick, which are grouped by the same areas.
    if (data.area) { data.areaSkills = (SKILL_GROUPS.find(([a]) => a === data.area)?.[1] || []).map((x) => x.toLowerCase()); data.standardSkills = STANDARD; }
    const found = filterRecords(rows, data);
    $("#count").textContent = `${plural(found.length, noun)}${rows.length && rows.every((r) => r.example && !r.founder) ? " (examples)" : ""}`;
    $("#results").innerHTML = found.length ? found.map(card).join("") : empty("No matches", "Try another area or language.", `<button class="btn secondary sm" type="button" data-action="clear-filters">Clear filters</button>`);
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
    ${n.handed ? `<div class="notice" role="note">${handedPill()}<span>This need has been solved. It is shown so you can see the kind of work Handova is for.</span></div>` : n.example ? exampleNotice() : ""}
    ${((k) => `<div class="card flush cover-banner" style="background:${COVER_BG[k] || COVER_BG.design}">${cover(k, { fit: "meet" })}</div>`)(coverKind(n.skills, n.title))}
    <div class="split">
      <div class="stack" style="--gap:36px">
        <div class="stack">
          <div class="row">${org.logo ? `<img class="avatar" src="${e(org.logo)}" width="44" height="44" alt="">` : avatar(org.name || "Organisation", 44)}<strong>${e(org.name || "Organisation")}</strong><span class="muted">${e([org.city, org.country].filter(Boolean).join(", "))}</span>${n.example || n.handed ? "" : pill("Approved organisation")}</div>
          <h1 style="font-size:clamp(2.2rem,4.4vw,3.8rem)">${e(n.title)}</h1>
          ${n.example || n.handed ? "" : `<div class="mobile-cta">${cta}</div>`}
        </div>
        <div class="stack"><h2 style="font-size:2rem">The challenge</h2><p class="prose" data-no-i18n>${e(n.description)}</p></div>
        <div class="stack"><h2 style="font-size:2rem">${n.handed ? "What was handed over" : "What you would deliver"}</h2><ul class="checks">${deliverables.map((d) => `<li>${icon("check", 22, "#0f6f63", 2.2)}${e(d)}</li>`).join("")}</ul></div>
        <div class="grid-2" style="gap:20px"><div class="card stack" style="--gap:10px"><strong>Skills involved</strong>${tags(n.skills)}</div><div class="card stack" style="--gap:10px"><strong>Working languages</strong><p>${e((n.languages || []).join(", "))}. Support in any one of these is welcome.</p></div></div>
        <div class="card row" style="align-items:flex-start;flex-wrap:nowrap">${org.logo ? `<img class="avatar" src="${e(org.logo)}" width="60" height="60" alt="">` : avatar(org.name || "Organisation", 60)}<div class="stack" style="--gap:6px">${eyebrow("About the organisation")}<span class="serif" style="font-size:1.6rem">${e(org.name || "")}</span><p class="muted">${e(org.summary || "")}</p>${safeLink(org.website, "Organisation website")}${safeLink(org.ethical_bridge_url, "See it in the Ethical Bridge directory")}</div></div>
      </div>
      <aside class="stack sticky" style="--gap:18px">
        <div class="side-card">
          <div class="row between">${n.handed ? handedPill() : open ? pill("Open for applications") : pill("Closed", "grey")}<span class="small muted">${plural(n.places || 1, "place")}</span></div>
          <div class="stack" style="--gap:12px">
            <span class="row">${icon("clock", 22, "#0f6f63")}<span><strong>${n.hours} ${n.hours === 1 ? "hour" : "hours"}</strong> ${n.handed ? "delivered" : "estimated"}</span></span>
            <span class="row">${icon("globe", 22, "#0f6f63")}Remote${n.location ? " · " + e(n.location) : ""}</span>
            <span class="row">${icon("calendar", 22, "#0f6f63")}${n.handed ? "Delivered and handed over" : n.deadline ? "Apply by " + date(n.deadline) : "No fixed deadline"}</span>
            <span class="row">${icon("language", 22, "#0f6f63")}${e((n.languages || []).map(t).join(" · "))}</span>
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
  const real = await approvedTalent("user_id,name,headline,location,country,languages,skills,hours_available,arrangement,bio,photo_url,experience_items,inactive_since,id_status");
  // Active professionals first; inactive ones stay listed, labelled, at the end.
  const fLive = config.founderUserId && real.find((p) => p.user_id === config.founderUserId);
  const founderRow = fLive ? { ...fLive, founder: true, slug: exampleProfile.user_id, contributions: exampleContributions.length } : exampleProfile;
  const others = real.filter((p) => p.user_id !== config.founderUserId);
  const rows = [founderRow, ...others.filter((p) => !p.inactive_since), ...others.filter((p) => p.inactive_since)];
  const html = `<div class="wrap stack" style="--gap:28px;padding-bottom:40px">
    <div class="page-head">${eyebrow("Talent")}<h1>Find the person behind the skills.</h1><p class="lead">Every profile is approved before it appears. See what people have done, the languages they work in and the time they can realistically give.</p></div>
    ${filtersForm("talent", talentLanguages(rows))}
    <h2 class="visually-hidden">Results</h2><div class="grid" id="results"></div>
    <div class="card row between band-dark" style="border-color:var(--deep)"><div class="stack" style="--gap:6px"><span class="serif" style="font-size:1.8rem">Are you an organisation?</span><p class="muted">Post a need and invite the people whose work fits. It is free.</p></div>${btn(`Post a need ${icon("arrow", 18)}`, "#join?role=organisation", "light")}</div>
  </div>`;
  return { title: "Talent", description: "Approved professionals contributing their skills to locally led organisations.", html, after: () => bindFilters(rows, talentCard, "professional") };
}

// ---------- Profile / impact CV ----------
// CV / Contributions tabs. The stat tiles also open Contributions and bring it into view.
function bindProfileTabs() {
  const tabs = [...document.querySelectorAll('.ptabs [role="tab"]')];
  if (!tabs.length) return;
  const show = (name, { focus = false, scroll = false } = {}) => {
    tabs.forEach((t) => { const on = t.dataset.profileTab === name; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; if (on && focus) t.focus(); });
    document.querySelectorAll('#profile-main [role="tabpanel"]').forEach((pnl) => { pnl.hidden = pnl.id !== `panel-${name}`; if (!pnl.hidden) pnl.querySelectorAll(".reveal").forEach((el) => el.classList.add("in")); });
    if (scroll) document.getElementById("profile-main")?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  };
  document.querySelectorAll("[data-profile-tab]").forEach((b) => b.addEventListener("click", () => show(b.dataset.profileTab, { scroll: !b.closest(".ptabs") })));
  // Reviewed work is the point of an impact CV, so it opens first when there is some.
  if (Number(document.querySelector("#tab-contributions .ptab-count")?.textContent || 0) > 0) show("contributions");
  tabs.forEach((t, i) => t.addEventListener("keydown", (ev) => {
    const d = { ArrowRight: 1, ArrowLeft: -1 }[ev.key];
    if (d) { ev.preventDefault(); show(tabs[(i + d + tabs.length) % tabs.length].dataset.profileTab, { focus: true }); }
  }));
}
// Skills grouped under the same areas as the filters; anything else goes under "Other".
function skillsByArea(list) {
  if (list.length <= 12) return tags(list);
  return `${tags(list.slice(0, 12))}<details class="skills-more"><summary>Show all ${list.length} skills</summary>${skillGroups(list)}</details>`;
}
function skillGroups(list) {
  const left = new Set(list), out = [];
  for (const [area, opts] of SKILL_GROUPS) { const hit = opts.filter((o) => left.has(o)); if (hit.length) { out.push([area, hit]); hit.forEach((h) => left.delete(h)); } }
  if (left.size) out.push(["Other", [...left]]);
  return `<div class="skill-areas">${out.map(([a, l]) => `<div><span class="skill-area">${e(a)}</span>${tags(l)}</div>`).join("")}</div>`;
}
export async function profile(id) {
  if (id === "example-maria-lopez") return { redirect: "#profile/" + exampleProfile.user_id };
  // The founder's link keeps working: it shows her live profile once there is one, and the built-in sample until then.
  const fid = config.founderUserId, isSlug = id === exampleProfile.user_id;
  const realId = isSlug ? fid : id;
  let p = realId ? await result(db.from("profiles").select(PROFILE_COLS).eq("user_id", realId).maybeSingle()).catch(() => null) : null;
  const ex = !p && isSlug;
  if (ex) p = exampleProfile;
  if (!p) return notFound("This profile isn’t available", "It may be private, awaiting approval, or no longer published.");
  const founderLive = !ex && fid && p.user_id === fid;
  if (founderLive) p = { ...p, founder: true };
  id = p.user_id;
  const owner = state.user?.id === p.user_id;
  const isPublic = ex || (p.published && p.review_status === "approved");
  const live = ex ? [] : await result(db.rpc("public_contributions", { p_user: id })).catch(() => []);
  // The founder's three handovers made before Handova's records began stay on her CV.
  const contributions = ex ? exampleContributions : founderLive ? [...live, ...exampleContributions] : live;
  const hours = contributions.reduce((s, c) => s + Number(c.hours || 0), 0);
  const orgs = new Set(contributions.map((c) => c.organisation)).size;
  const countries = new Set(contributions.map((c) => c.organisation_country).filter(Boolean)).size;
  const canInvite = !ex && !owner && state.memberships.some((m) => m.organisation?.status === "approved") && isPublic;
  const wide = (title, inner) => `<div class="card stack xp-card" style="--gap:14px"><h2 style="font-size:2rem">${title}</h2>${inner}</div>`;
  const side = (title, inner) => `<div class="card stack" style="--gap:12px">${eyebrow(title)}${inner}</div>`;
  const html = `<div class="wrap stack" style="--gap:32px;padding-bottom:60px">
    ${back("All talent", "#talent")}
    ${owner && !isPublic ? `<div class="banner warn">${icon("eye", 22)}<p>Only you can see this page. ${p.review_status === "pending" ? "Your profile is awaiting approval." : "Publish your profile from your workspace when you are ready."}</p></div>` : ""}
    <section class="profile-head">
      ${avatarFor(p, 150)}
      <div class="stack" style="--gap:12px"><div class="row" style="--gap:10px">${eyebrow("Impact CV")}${p.id_status === "approved" ? `<span class="id-badge">${icon("check", 14, "currentColor", 2.6)}ID verified</span>` : ""}${p.inactive_since ? pill("Inactive", "grey") : ""}</div><h1>${e(p.name)}</h1><p class="lead">${e(p.headline || "")}</p>
        <div class="meta">${p.country ? `<span>${icon("map", 19, "#0f6f63")}${e(t(p.country))}</span>` : ""}<span>${icon("globe", 19, "#0f6f63")}${/^UTC/.test(p.location || "") ? `${e(p.location)} · remote` : "Remote"}</span><span>${icon("language", 19, "#0f6f63")}${e((p.languages || []).map(t).join(" · "))}</span><span>${icon("clock", 19, "#0f6f63")}${p.hours_available ? `${p.hours_available} hours a month` : p.founder ? "Availability on request" : "Not available right now"}</span></div></div>
      <div class="stack actions-col no-print" style="--gap:10px">
        ${owner ? btn("Edit profile", "#workspace/profile") : canInvite ? `<button class="btn invite-btn" type="button" data-action="invite" data-id="${e(p.user_id)}">${icon("plus", 18)}<span>Invite ${e((p.name || "").split(" ")[0])} to help</span></button>` : state.profile && !state.memberships.length ? "" : `<button class="btn invite-btn" type="button" data-action="invite-cta" data-id="${e(p.user_id)}" data-sample="${ex ? 1 : 0}">${icon("plus", 18)}<span>Invite ${e((p.name || "").split(" ")[0])} to help</span></button>`}${state.isAdmin && !ex && isPublic && !owner ? `<button class="btn secondary" type="button" data-action="introduce" data-id="${e(p.user_id)}" data-name="${e(p.name)}">Introduce to a need</button>` : ""}
        ${safeURL(p.linkedin) ? `<a class="btn linkedin" href="${e(safeURL(p.linkedin))}" target="_blank" rel="noopener noreferrer">${icon("linkedin", 18)}View on LinkedIn <span class="visually-hidden">(opens in a new tab)</span></a>` : ""}
        <button class="btn secondary" type="button" data-action="copy-link">${icon("link", 18)}Copy profile link</button>
        <button class="btn secondary" type="button" data-action="print">${icon("download", 18)}Save as PDF</button>
      </div>
    </section>
    ${(() => { const pending = contributions.filter((c) => c.pending).length;
      // Each number opens the Contributions tab, so the CV stays on top however many contributions are added.
      const tile = (n, label) => `<button type="button" class="stat-btn" data-profile-tab="contributions" aria-controls="panel-contributions" title="See contributions"><strong data-counter="${n}">${n}</strong><span>${label}</span></button>`;
      return `<section class="stats-dark stats-btns stats-5" aria-label="Impact so far and availability">${tile(hours, "hours handed over")}${tile(contributions.length, pending ? "contributions" : "reviewed contributions")}${tile(orgs, "organisations helped")}${pending ? tile(pending, "awaiting the organisation’s review") : tile(countries, "countries")}${(() => {
        // Monthly allowance: hours given this calendar month come off it, and it refills on the 1st.
        const per = Number(p.hours_available) || 0, now = new Date(), mStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const used = contributions.filter((c) => { const d = new Date(c.completed || c.completed_at || c.started || c.created_at || 0); return d >= mStart; }).reduce((t, c) => t + Number(c.hours || 0), 0);
        const left = Math.max(per - used, 0), next = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleDateString(locale(), { day: "numeric", month: "long" });
        return `<div class="stat-avail"><strong data-counter="${left}">${left}</strong><span>${per ? `of ${per} hours free this month` : "hours available a month"}</span><span class="stat-note">${per ? (left < per ? `${per} more hours unlock on ${next}` : `Back to ${per} hours on ${next}`) : "Not available right now"}</span>${canInvite && left ? `<button type="button" class="stat-more" data-action="invite" data-id="${e(p.user_id)}">Invite to a need ${icon("arrow", 14)}</button>` : ""}`;
      })()}</div></section>`; })()}
    <p class="small muted" style="margin-top:-18px">${contributions.some((c) => c.pending) ? "Hours and work are as recorded by the professional until each organisation reviews them. Ratings stay private to the professional." : "Only work reviewed by the organisation counts. Ratings stay private to the professional."}</p>
    <div class="split left">
      <aside class="stack" style="--gap:18px">
        ${side("About", `${p.bio ? `<p class="prose" style="font-size:1rem" data-no-i18n>${e(p.bio)}</p>` : `<p class="prose" style="font-size:1rem">No introduction yet.</p>`}`)}
        ${side("Skills", skillsByArea(p.skills || []))}
        ${p.website ? side("Elsewhere", `${safeLink(p.website, "Professional profile or website")}<span class="small muted">A link the professional added; not an identity check.</span>`) : ""}
        ${side("How this record is built", `<ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>An organisation defines a need</li><li>Both sign a contribution agreement</li><li>Hours are logged and reviewed</li><li>The organisation writes an endorsement</li><li>The professional chooses to publish it</li></ol>`)}
        ${!ex && !owner && state.user ? `<button class="link-btn" type="button" data-action="report" data-type="profile" data-id="${e(p.user_id)}" style="color:var(--muted);display:inline-flex;gap:8px;align-items:center">${icon("flag", 18)}Report this profile</button>` : ""}
      </aside>
      <section class="stack" style="--gap:16px" id="profile-main">
        <div class="ptabs" role="tablist" aria-label="Profile sections">
          <button type="button" role="tab" id="tab-cv" aria-controls="panel-cv" aria-selected="true" data-profile-tab="cv">CV</button>
          <button type="button" role="tab" id="tab-contributions" aria-controls="panel-contributions" aria-selected="false" tabindex="-1" data-profile-tab="contributions">Contributions <span class="ptab-count">${contributions.length}</span></button>
        </div>
        <div role="tabpanel" id="panel-cv" aria-labelledby="tab-cv" class="stack" style="--gap:18px">
          ${(p.experience_items || []).length ? wide("Experience", `${entryList(p.experience_items, "experience")}<span class="small muted">Self-described. Contributions are reviewed by organisations.</span>`)
            : p.experience ? wide("Experience", `<ul class="xp" data-no-i18n>${String(p.experience).split(/\n+/).map((l) => l.trim()).filter(Boolean).map((l) => { const [role, ...rest] = l.split(" · "); return `<li><div class="xp-top"><strong>${e(role)}</strong></div>${rest.length ? `<span>${e(rest.join(" · "))}</span>` : ""}</li>`; }).join("")}</ul><span class="small muted">Self-described. Contributions are reviewed by organisations.</span>`) : ""}
          ${(p.education_items || []).length ? wide("Education", entryList(p.education_items, "education")) : ""}
          ${!(p.experience_items || []).length && !p.experience && !(p.education_items || []).length ? empty("No CV details yet", owner ? "Add your roles and qualifications from Edit profile." : "This professional hasn’t added roles or qualifications yet.") : ""}
        </div>
        <div role="tabpanel" id="panel-contributions" aria-labelledby="tab-contributions" class="stack" style="--gap:14px" hidden>
          <div class="row between" style="align-items:baseline"><p class="muted" style="margin:0">${plural(contributions.length, "contribution")} · ${hours} ${hours === 1 ? "hour" : "hours"} handed over to ${plural(orgs, "organisation")}</p><span class="small muted">Open one to see the details</span></div>
          ${contributions.length ? contributions.map((c) => contributionCard(c, { example: ex, owner })).join("") : empty(owner ? "Your first contribution will appear here" : "No published contributions yet", owner ? "When an organisation completes and endorses your work, you can publish it here." : "Contributions appear once an organisation has reviewed the work and the professional publishes it.", owner ? btn("Browse needs", "#needs", "secondary sm") : "")}
        </div>
      </section>
    </div></div>`;
  return { title: `${p.name} · impact CV`, description: p.headline || "Impact CV on Handova", html, after: bindProfileTabs };
}

// ---------- How it works ----------
export async function how(focus = "") {
  const stages = [
    ["home", "Join", ["Get listed, then join", "Be listed in the Ethical Bridge directory, then create your Handova account. We check you are locally led and registered, or fiscally hosted."], ["Create your profile", "Experience, skills, working languages and realistic monthly hours. Approved before it is public; 18+."]],
    ["doc", "Need", ["Publish a need", "The challenge, the output, skills, languages and hours. Up to three open at a time."], ["Apply with a plan", "Say how you would approach the output and when you can do it."]],
    ["people", "Match", ["Choose who to work with", "Review applications, message candidates or invite approved professionals."], ["Hear back or get invited", "Accept an invitation, or wait for the organisation’s decision."]],
    ["pen", "Agree", null, null, ["Both sign the agreement", "Scope, hours, access and confidentiality, built from the need. Nothing confidential is shared before both signatures."]],
    ["check", "Deliver", ["Review and complete", "Approve logged hours, write an endorsement and mark the work complete."], ["Do the work, log your hours", "Then choose which reviewed contributions appear on your impact CV."]],
    ["handover", "Gain", ["Capability that stays", "A tool, a process or a trained team you keep using, and evidence of what changed."], ["A reviewed record on your impact CV", "Real experience and a reviewed record in the organisation’s own words."]],
  ];
  const facts = [["gift", "Free", "for organisations and professionals"], ["clock", "Up to 16 hours", "for each contribution"], ["pen", "Signed first", "before any work or access"], ["shield", "Reviewed", "every organisation and profile"]];
  const cell = (who, [t, d]) => `<div class="j-cell ${who}"><strong>${t}</strong><p>${d}</p></div>`;
  const journey = `<div class="journey" role="list">
      <div class="j-lane-label org" aria-hidden="true">Organisation</div><div class="j-lane-label pro" aria-hidden="true">Professional</div>
      ${stages.map(([ic, name, org, pro, both], i) => `<div class="j-stage" role="listitem" style="--col:${i + 2}"><div class="j-head"><span class="j-num">${i + 1}</span>${icon(ic === "handover" ? "gift" : ic, 20, "#0f6f63")}<span>${name}</span></div>${both ? `<div class="j-cell both"><span class="j-who">Together</span><strong>${both[0]}</strong><p>${both[1]}</p></div>` : `${cell("org", org).replace("<strong>", `<span class="j-who">Organisation</span><strong>`)}${cell("pro", pro).replace("<strong>", `<span class="j-who">Professional</span><strong>`)}`}</div>`).join("")}
    </div>`;
  const vis = [["Your profile (after approval)", "Anyone, including search engines", "You: unpublish or delete at any time"], ["Open needs and organisation summary", "Anyone", "The organisation"], ["Applications and messages", "You and the organisation", "Both of you; either can end a conversation"], ["Contribution agreement", "You and the organisation", "Signatures are final"], ["Private rating", "Only the professional who was rated", "Nobody can change it"], ["Endorsements on an impact CV", "Anyone, once the professional publishes them", "The professional"]];
  const html = `<div class="wrap how stack" style="--gap:clamp(40px,5vw,64px);padding-bottom:64px">
    <div class="how-hero">
      <div class="stack" style="--gap:16px">${eyebrow("How it works")}<h1>Skilled volunteering, with clear expectations.</h1><p class="lead">Short, well-scoped contributions, agreed in writing and reviewed by the organisation. Here is exactly what happens, and what stays private.</p><div class="row" style="--gap:12px">${btn("Post a need", "#join?role=organisation")}${btn("Offer your skills", "#join?role=professional", "secondary")}</div></div>
      <div class="how-facts">${facts.map(([ic, t, d]) => `<div class="how-fact"><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><div><strong>${t}</strong><span>${d}</span></div></div>`).join("")}</div>
    </div>
    <section class="stack hv-video" style="--gap:20px">
      <div class="stack" style="--gap:8px">${eyebrow("See it in under two minutes")}<h2>From a need to a handover.</h2></div>
      ${demoVideo()}
    </section>
    <nav class="path-switch" aria-label="Jump to your path"><button type="button" data-action="scroll-to" data-id="path-organisations"><span class="icon-tile">${icon("home", 22, "#0f6f63")}</span><span><strong>I’m an organisation</strong><span class="small muted">Publish needs and find skilled help</span></span>${icon("arrow", 18)}</button><button type="button" data-action="scroll-to" data-id="path-professionals"><span class="icon-tile">${icon("user", 22, "#0f6f63")}</span><span><strong>I’m a professional</strong><span class="small muted">Contribute skills and build an impact CV</span></span>${icon("arrow", 18)}</button></nav>
    <section class="stack" style="--gap:20px"><div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Six steps, side by side")}<h2>What each of you does.</h2></div><p class="muted" style="max-width:420px">Organisations and professionals follow the same path. The agreement is the moment you meet; the last step is what you both keep.</p></div>${journey}</section>
    ${pathSection("organisations")}
    ${pathSection("professionals")}
    <section class="stack" style="--gap:20px" id="count-on"><div class="stack" style="--gap:8px">${eyebrow("Before you join")}<h2>What you can both count on.</h2><p class="lead" style="max-width:760px">These promises are written into the agreements each side signs. You can read both before joining.</p></div><div class="grid-2" style="gap:20px"><div class="card stack" style="--gap:16px"><h3 class="serif" style="font:500 1.5rem/1.2 var(--serif);margin:0">Professionals can count on</h3><ul class="checks"><li>${icon("check", 22, "#0f6f63", 2.2)}Real needs with one clear output, never an unpaid job trial or a replacement for paid staff</li><li>${icon("check", 22, "#0f6f63", 2.2)}A reply to applications and messages, usually within a week</li><li>${icon("check", 22, "#0f6f63", 2.2)}Never more than the agreed hours, and you can stop at any time</li><li>${icon("check", 22, "#0f6f63", 2.2)}Hours reviewed within 14 days and a fair, truthful endorsement</li></ul></div><div class="card stack" style="--gap:16px"><h3 class="serif" style="font:500 1.5rem/1.2 var(--serif);margin:0">Organisations can count on</h3><ul class="checks"><li>${icon("check", 22, "#0f6f63", 2.2)}Professionals whose profile we have reviewed and whose identity is verified before their first contribution</li><li>${icon("check", 22, "#0f6f63", 2.2)}Nothing confidential shared, and no access given, before both sides sign</li><li>${icon("check", 22, "#0f6f63", 2.2)}Your organisation owns the work handed over, unless you agree otherwise in writing</li><li>${icon("check", 22, "#0f6f63", 2.2)}Either side can end a contribution, and our safeguarding lead reviews every concern</li></ul></div></div><div class="row">${btn("Read the professional agreement", "#agreements/professional", "secondary")}${btn("Read the organisation agreement", "#agreements/organisation", "secondary")}</div></section>
    <section class="how-agree">
      <div class="stack" style="--gap:14px">${eyebrow("The contribution agreement")}<h2>Nothing starts until both sides sign.</h2><p class="lead">Every match gets its own agreement, built from the need itself. Hours can only be logged once both signatures are in.</p><a href="#safety" style="font-weight:700">How we work responsibly →</a></div>
      <ul class="how-checks">${["The agreed output, hours and working languages", "Timing, contact person and review steps", "Confidentiality, minimum access and data handling", "Who owns the work and what can be shown publicly", "What is out of scope, and how to end safely"].map((t) => `<li>${icon("check", 20, "#0f6f63", 2.2)}<span>${t}</span></li>`).join("")}</ul>
    </section>
    <section class="stack" style="--gap:18px"><div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Privacy")}<h2>You choose what becomes public.</h2></div><a href="#privacy" style="font-weight:700">Read the privacy notice →</a></div><div class="table-scroll"><table class="data stack-sm"><thead><tr><th scope="col">Information</th><th scope="col">Who can see it</th><th scope="col">Who controls it</th></tr></thead><tbody>${vis.map((r) => `<tr><td><strong>${r[0]}</strong></td><td data-label="Who can see it">${r[1]}</td><td class="muted" data-label="Who controls it">${r[2]}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="how-concern"><span class="icon-tile lg">${icon("flag", 28, "#0f6f63")}</span><div class="stack" style="--gap:4px"><h2 class="serif" style="font-size:1.6rem;font-weight:500;margin:0">Raise a concern</h2><p class="muted">Use Report a concern on any profile, need or conversation, or write to ${e(config.safeguardingEmail)}. If someone is in immediate danger, contact local emergency services first.</p></div>${btn("Working responsibly", "#safety", "secondary")}</section>
  </div>`;
  const title = focus === "organisations" ? "For organisations" : focus === "professionals" ? "For professionals" : "How it works";
  return { title, description: "Short, well-scoped contributions, agreed in writing and reviewed by the organisation.", html, after: focus ? () => setTimeout(() => document.getElementById("path-" + focus)?.scrollIntoView({ block: "start" }), 60) : undefined };
}

export function notFound(title = "Page not found", text = "The page you were looking for doesn’t exist or has moved.") {
  return { title, html: `<div class="wrap page-head" style="padding-bottom:120px">${eyebrow("Not found")}<h1>${e(title)}</h1><p class="lead">${e(text)}</p><div class="row">${btn("Go to the home page", "#home")}${btn("Browse needs", "#needs", "secondary")}</div></div>` };
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
