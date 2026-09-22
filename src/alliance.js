export const allianceURL =
  "https://local-impact-alliance.open-pike-3973.chatgpt.site/";
export const responsibility = `<p>Users are responsible for checking who they work with, agreeing confidentiality and deciding what information and access to provide. To the extent permitted by applicable law, Impact Accelerator and Local Impact Alliance are not responsible for losses caused solely by a user sharing confidential information or credentials contrary to this guidance, where no breach of our own duties contributed to the loss.</p><p>This does not exclude responsibility for our own negligence, fraud, breach of data-protection obligations, or any other liability that cannot lawfully be excluded. Your statutory rights remain unaffected.</p>`;
export const safetyNotice = `<section class="trust-panel" aria-labelledby="trust-title"><div class="trust-heading"><span class="step-icon" aria-hidden="true">${icon("shield")}</span><div><span class="eyebrow">Trust comes before access</span><h2 id="trust-title">Build the relationship.<br>Protect the information.</h2></div></div><div><p>Do not share confidential or sensitive information before you have established a trusted working relationship with the talent or organisation and agreed the scope, permissions and confidentiality arrangements. Even then, share only what is necessary through an agreed secure channel.</p><p><strong>Never share passwords, payment-card details, PINs or one-time access codes through this platform.</strong> Use individual, limited-access accounts when someone needs to work in your systems.</p><details class="responsibility"><summary>Your responsibilities & our limits</summary>${responsibility}</details></div><div class="trust-resources"><div><span class="eyebrow">Trust & support</span><h3>Please read these sections before participating.</h3><p>They explain how the platform works, what becomes public, how to protect people and information, and where Impact Accelerator sits within the wider Alliance.</p></div><nav class="trust-links" aria-label="Trust and support guidance"><a href="#guide"><span>01</span><strong>How it works</strong><small>Roles, expectations and the contribution process</small></a><a href="#privacy"><span>02</span><strong>Privacy & storage</strong><small>What is public, private and stored</small></a><a href="#safeguarding"><span>03</span><strong>Working responsibly</strong><small>Confidentiality, access and safeguarding</small></a><a href="#about"><span>04</span><strong>About the Alliance</strong><small>Our purpose, platforms and partners</small></a></nav></div></section>`;
function icon(kind) {
  const paths = {
    brief:
      '<rect x="5" y="4" width="22" height="26" rx="3"/><path d="M11 11h10M11 17h10M11 23h6"/>',
    people:
      '<circle cx="12" cy="11" r="4"/><circle cx="24" cy="13" r="3"/><path d="M4 29v-5a8 8 0 0 1 16 0v5M22 21a6 6 0 0 1 8 6v2"/>',
    check:
      '<rect x="5" y="4" width="22" height="26" rx="3"/><path d="m10 16 4 4 9-9M11 26h10"/>',
    shield:
      '<path d="M16 3 29 8v9c0 7-7 12-13 15C10 29 3 24 3 17V8Z"/><path d="m10 17 4 4 9-9"/>',
  };
  return `<svg width="34" height="34" viewBox="0 0 34 36" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</svg>`;
}
export const allianceIntro = `<section class="alliance-intro" aria-label="Part of Local Impact Alliance"><span class="alliance-emblem" aria-hidden="true">✽</span><div><span class="eyebrow">Part of Local Impact Alliance</span><p>Three connected pathways for locally led change. <strong>Impact Accelerator is our Strengthen platform</strong>—bringing professional skills to the needs local organisations define.</p></div><a href="#about">Meet the Alliance <span aria-hidden="true">↗</span></a></section>`;
export const contributionSteps = `<section class="journey" aria-labelledby="journey-title"><div class="journey-heading"><div><span class="eyebrow">From expertise to lasting value</span><h2 id="journey-title">A clear path to<br>meaningful contribution.</h2></div><p>Start with the organisation’s priorities. Agree how you’ll work together. Build a record of the difference your contribution makes.</p></div><ol class="journey-grid">${[
  [
    "brief",
    "Define the need",
    "A useful starting point",
    "Organisations describe the challenge, the output they need, the skills and languages involved, and the time commitment.",
    "Explore needs",
    "#needs",
  ],
  [
    "people",
    "Bring the right skills",
    "A shared understanding",
    "Talent and organisations agree on scope, working language and expectations before the contribution begins.",
    "Meet the talent",
    "#talent",
  ],
  [
    "check",
    "Make the impact visible",
    "Experience with evidence",
    "Contributions, hours and outcomes form a living impact CV, supported by organisation reviews and feedback.",
    "See an example impact CV",
    "#profile/example-maria-lopez",
  ],
]
  .map(
    ([symbol, title, kicker, copy, label, url], i) =>
      `<li class="journey-card"><div class="step-top"><span class="step-icon" aria-hidden="true">${icon(symbol)}</span><span class="step-number">0${i + 1}</span></div><span class="eyebrow">${kicker}</span><h3>${title}</h3><p>${copy}</p><a href="${url}">${label} <span aria-hidden="true">→</span></a></li>`,
  )
  .join(
    "",
  )}</ol><p class="journey-note">Clearly labelled examples remain available for design review. Real organisation-approved contributions can be published by talent as their verified impact record grows.</p></section>`;

export function aboutAlliance() {
  return `<section class="alliance-hero"><span class="eyebrow">About us · Local Impact Alliance</span><h1>Local leadership.<br>Connected support.</h1><p>Local organisations understand the priorities of their communities. Local Impact Alliance connects them with people, skills and opportunities that support their work while keeping decisions in local hands.</p><a class="button" href="${allianceURL}" target="_blank" rel="noopener noreferrer">Visit Local Impact Alliance ↗</a><small class="external-note">The Alliance website may ask you to sign in with ChatGPT.</small></section><section class="split alliance-purpose"><div><span class="eyebrow">Why we exist</span><h2>Help the work move forward.<br>Keep its ownership local.</h2></div><div><p>Good work can be hard to discover. Organisations may need visibility, specialist capacity or new connections to take their next step. The Alliance brings those forms of support together through three focused platforms.</p><p>Impact Accelerator serves the <strong>Strengthen</strong> pathway: organisations define useful contributions, talent brings relevant expertise, and reviewed work can become evidence of experience and impact.</p></div></section><section aria-labelledby="platforms-title"><div class="section-head"><div><span class="eyebrow">One alliance · Three pathways</span><h2 id="platforms-title">Find your way to contribute.</h2><p>Each platform has its own purpose. Explore the pathway that fits what you can offer today.</p></div></div><div class="platform-grid"><article class="platform-card mobilise"><span class="eyebrow">01 · Public participation</span><h3>Mobilise</h3><p>Discover local initiatives and the people behind them. Connect attention with participation and support for locally led action.</p><a class="button secondary" href="https://ethicalbridge.github.io/mobilise/" target="_blank" rel="noopener noreferrer">Explore Mobilise ↗</a></article><article class="platform-card strengthen"><span class="eyebrow">02 · Capability & skills</span><h3>Strengthen</h3><p>Contribute professional skills through Impact Accelerator. Help organisations address practical needs and build capability they can keep using.</p><span class="current-platform">You are here · Impact Accelerator</span><a class="button" href="#needs">Explore organisational needs →</a></article><article class="platform-card connect"><span class="eyebrow">03 · Research-led discovery</span><h3>Connect</h3><p>Explore places through research, local stories and responsible discovery. Powered by Julimapea, this pathway helps people engage with care.</p><a class="button secondary" href="https://julimapea.com/" target="_blank" rel="noopener noreferrer">Explore Connect / Julimapea ↗</a></article></div></section><section class="alliance-values"><span class="eyebrow">What holds us together</span><div class="grid"><div><h3>Local agency</h3><p>Organisations define their needs and what success looks like. Contributions support their priorities.</p></div><div><h3>Useful evidence</h3><p>Show the work, the learning and the outcomes. Keep illustrative examples distinct from reviewed records.</p></div><div><h3>Responsible relationships</h3><p>Agree expectations, protect sensitive information and respect the people closest to the work.</p></div></div></section><section class="partner-panel"><div><span class="eyebrow">Our wider network</span><h2>Ethical Bridge</h2><p>Discover organisations and opportunities through Ethical Bridge, the Alliance’s partner. Impact Accelerator uses the shared Ethical Bridge account and organisation-membership service.</p></div><a class="button secondary" href="https://ethicalbridge.org/" target="_blank" rel="noopener noreferrer">Explore Ethical Bridge ↗</a></section><div class="actions"><a href="${allianceURL}team" target="_blank" rel="noopener noreferrer">Meet the Alliance team ↗</a><a href="${allianceURL}partners" target="_blank" rel="noopener noreferrer">Partnerships ↗</a><a href="${allianceURL}contact" target="_blank" rel="noopener noreferrer">Contact the Alliance ↗</a></div>`;
}
