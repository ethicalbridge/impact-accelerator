import {
  languageText,
  state,
  $,
  e,
  tags,
  initials,
  btn,
  head,
  empty,
  select,
} from "./core.js";

export const exampleNotice = `<div class="example-notice"><strong>Example</strong><span>Design preview · People, organisations, contributions and endorsements below are illustrative, not verified real-world records.</span></div>`;
export const exampleTalents = [
  [
    "maria-lopez",
    "Maria Lopez",
    "UX Designer · Research · Accessibility",
    "Madrid",
    16,
    ["UX Research", "Accessibility", "Figma", "User Testing"],
  ],
  [
    "amara-mensah",
    "Amara Mensah",
    "MEL Specialist",
    "Accra",
    8,
    ["Data analysis", "MEL", "Grant writing"],
  ],
  [
    "daniel-okafor",
    "Daniel Okafor",
    "Digital Product Designer",
    "Lagos",
    12,
    ["UX design", "Web design", "Research"],
  ],
  [
    "lucia-navarro",
    "Lucía Navarro",
    "Communications Lead",
    "Madrid",
    6,
    ["Storytelling", "Social media", "Translation"],
  ],
  [
    "samira-khan",
    "Samira Khan",
    "Safeguarding Adviser",
    "Dhaka",
    10,
    ["Safeguarding", "Training", "Policy"],
  ],
  [
    "jonas-mbeki",
    "Jonas Mbeki",
    "Finance Consultant",
    "Cape Town",
    14,
    ["Accounting", "Finance", "Training"],
  ],
  [
    "elena-araya",
    "Elena Araya",
    "Legal & Policy Researcher",
    "Santiago",
    5,
    ["Legal support", "Research", "Policy"],
  ],
].map(([id, name, headline, location, hours_available, skills]) => ({
  user_id: `example-${id}`,
  languages: {
    "maria-lopez": ["English", "Spanish"],
    "amara-mensah": ["English", "Twi"],
    "daniel-okafor": ["English", "Igbo"],
    "lucia-navarro": ["Spanish", "English", "French"],
    "samira-khan": ["Bengali", "English"],
    "jonas-mbeki": ["English", "isiXhosa"],
    "elena-araya": ["Spanish", "English"],
  }[id],
  name,
  headline,
  location,
  hours_available,
  skills,
  arrangement: "Remote",
  example: true,
}));

export const exampleNeeds = [
  [
    "accessibility",
    "Improve website accessibility",
    "Example Organisation",
    "Identify barriers and prioritise practical website improvements.",
    12,
    ["UX Research", "Accessibility", "Figma"],
  ],
  [
    "water-data",
    "Improve community data tools",
    "Water for Tomorrow",
    "Create a clear data collection template and train the team to use it.",
    12,
    ["Data analysis", "MEL"],
  ],
  [
    "donor-research",
    "Donor research and grant narrative",
    "Refugee Women Rise",
    "Develop a focused donor shortlist and a reusable funding narrative.",
    8,
    ["Grant writing", "Research"],
  ],
  [
    "inclusive-training",
    "Accessible presentation and training",
    "Inclusive Futures",
    "Help staff design presentations that more people can access.",
    6,
    ["Accessibility", "Training"],
  ],
  [
    "youth-campaign",
    "Youth campaign documentary",
    "Youth Voice Alliance",
    "Edit a short documentary centred on youth-led change.",
    16,
    ["Video editing", "Storytelling"],
  ],
  [
    "finance-toolkit",
    "Practical financial toolkit",
    "Green Futures Collective",
    "Create a budgeting toolkit and a short team training session.",
    10,
    ["Finance", "Training"],
  ],
  [
    "recruitment",
    "Inclusive recruitment policy",
    "Equal Access Network",
    "Review recruitment practices and recommend an inclusive process.",
    14,
    ["Human resources", "Policy"],
  ],
].map(([id, title, org, output, hours, skills]) => ({
  id: `example-${id}`,
  languages: {
    accessibility: ["English", "Spanish"],
    "water-data": ["English", "Swahili"],
    "donor-research": ["English", "French"],
    "inclusive-training": ["English", "Ghanaian Sign Language"],
    "youth-campaign": ["English", "Yoruba"],
    "finance-toolkit": ["English", "isiXhosa"],
    recruitment: ["Swahili", "English"],
  }[id],
  title,
  organisation: { public_name: org },
  output,
  hours,
  skills,
  status: "open",
  arrangement: "Remote",
  example: true,
}));

const mariaRecords = [
  [
    "accessibility-review",
    "Accessibility Review",
    "Example Organisation",
    "Improve accessibility of the organisation’s website",
    "Conducted an accessibility audit and proposed UX improvements.",
    12,
    "2026-08-03",
    "2026-08-14",
    ["UX Research", "Accessibility", "Figma"],
    5,
    "Maria provided a very detailed review and practical recommendations that our team was able to implement immediately.",
    "A prioritised audit of 18 barriers, annotated page designs and a practical remediation checklist.",
  ],
  [
    "user-testing",
    "Service journey user testing",
    "Inclusive Futures",
    "Make a service sign-up journey easier to navigate",
    "Planned and facilitated usability sessions, synthesised findings and refined the sign-up flow.",
    16,
    "2026-07-06",
    "2026-07-24",
    ["UX Research", "User Testing", "Figma"],
    5,
    "Maria translated user feedback into a clear set of changes and helped us prioritise them.",
    "A research summary and a tested sign-up prototype.",
  ],
  [
    "donation-flow",
    "Donation flow redesign",
    "Green Futures Collective",
    "Reduce confusion during online donations",
    "Mapped the donation journey and delivered a simpler, accessible mobile prototype.",
    14,
    "2026-06-08",
    "2026-06-26",
    ["Figma", "Accessibility", "User Testing"],
    5,
    "The handover was thoughtful and gave our team a practical design to build from.",
    "A mobile donation prototype and component annotations.",
  ],
  [
    "information-design",
    "Community information hub",
    "Water for Tomorrow",
    "Make water-service information easier to find",
    "Restructured the information architecture and tested navigation labels with the team.",
    10,
    "2026-05-04",
    "2026-05-15",
    ["UX Research", "User Testing"],
    4,
    "A clear, useful contribution that helped us organise information around community needs.",
    "A content map and revised navigation structure.",
  ],
  [
    "campaign-design",
    "Accessible campaign toolkit",
    "Youth Voice Alliance",
    "Enable young organisers to publish accessible campaign content",
    "Created reusable campaign templates and guidance for accessible content.",
    14,
    "2026-04-06",
    "2026-04-24",
    ["Figma", "Accessibility"],
    5,
    "The templates were easy to adapt, and the guidance helped our team use them confidently.",
    "Six reusable campaign templates and a content accessibility checklist.",
  ],
  [
    "design-handover",
    "Inclusive design handover",
    "Example Organisation",
    "Help staff maintain accessibility after launch",
    "Delivered a practical design handover and facilitated a review of common accessibility issues.",
    8,
    "2026-03-09",
    "2026-03-13",
    ["Accessibility", "Figma"],
    5,
    "Maria made the guidance easy to understand and apply in everyday work.",
    "A component guide and team handover notes.",
  ],
  [
    "service-research",
    "Service discovery research",
    "Inclusive Futures",
    "Understand barriers to accessing community support",
    "Synthesised anonymised research and mapped opportunities for a more inclusive service.",
    12,
    "2026-02-02",
    "2026-02-20",
    ["UX Research", "User Testing"],
    5,
    "Her research helped us ask better questions and focus our next service improvements.",
    "An anonymised insight report and opportunity map.",
  ],
].map(
  ([
    id,
    title,
    organisation,
    need,
    description,
    hours,
    start,
    end,
    skills,
    rating,
    feedback,
    outcome,
  ]) => ({
    id,
    title,
    organisation,
    need,
    description,
    hours,
    start,
    end,
    skills,
    rating,
    feedback,
    outcome,
    status: "verified",
    reviewDate: end,
  }),
);
mariaRecords.push({
  id: "resource-hub",
  title: "Accessible resource hub",
  organisation: "Youth Voice Alliance",
  need: "Help young organisers find reusable campaign resources",
  description:
    "Testing a new resource navigation and preparing recommendations with the team.",
  hours: 6,
  start: "2026-09-07",
  end: null,
  skills: ["UX Research", "Accessibility"],
  status: "ongoing",
  outcome: "Navigation prototype in review.",
});
mariaRecords.push({
  id: "content-check",
  title: "Plain-language content review",
  organisation: "Water for Tomorrow",
  need: "Make service instructions clearer",
  description:
    "Reviewed instructions and proposed clearer headings and step-by-step content.",
  hours: 4,
  start: "2026-09-01",
  end: "2026-09-04",
  skills: ["UX Research", "Accessibility"],
  status: "completed",
  outcome: "Revised content checklist submitted for organisation review.",
});

export function contributionRecords(person) {
  if (person.user_id === "example-maria-lopez") return mariaRecords;
  const index = exampleTalents.findIndex((p) => p.user_id === person.user_id);
  const need = exampleNeeds[index];
  return [
    {
      id: `${person.user_id}-contribution`,
      title: need.title,
      organisation: need.organisation.public_name,
      need: need.output,
      description: `Contributed ${person.skills[0].toLowerCase()} expertise and worked with the team to deliver a practical handover.`,
      hours: need.hours,
      start: "2026-08-03",
      end: "2026-08-21",
      skills: person.skills,
      rating: 5,
      feedback:
        "A thoughtful contribution with clear recommendations that our team can continue using.",
      outcome: need.output,
      status: "verified",
      reviewDate: "2026-08-24",
    },
  ];
}
export function contributionSummary(records) {
  const verified = records.filter((r) => r.status === "verified");
  const rated = verified.filter((r) => Number.isFinite(r.rating));
  return {
    completed: records.filter((r) => r.status !== "ongoing").length,
    verified: verified.length,
    organisations: new Set(verified.map((r) => r.organisation)).size,
    hours: verified.reduce((n, r) => n + r.hours, 0),
    rating: rated.length
      ? (rated.reduce((n, r) => n + r.rating, 0) / rated.length).toFixed(1)
      : "—",
    skills: [...new Set(verified.flatMap((r) => r.skills))],
  };
}
const labels = {
  verified: "Completed & verified",
  completed: "Completed · awaiting verification",
  ongoing: "Ongoing",
};
function recordCard(r) {
  return `<article class="contribution-card"><div class="contribution-top"><span class="status ${r.status}">${labels[r.status]}</span><span class="muted">${e(r.start)} → ${e(r.end || "Present")}</span></div><h3>${e(r.title)}</h3><p class="organisation-name">${e(r.organisation)}</p><p><b>Need solved${r.status === "ongoing" ? " / in progress" : ""}:</b> ${e(r.need)}</p><p>${e(r.description)}</p><div class="contribution-facts"><strong>${r.hours} <small>${r.status === "verified" ? "verified hours" : "hours submitted"}</small></strong><div>${tags(r.skills)}</div></div><details><summary>Deliverables & evidence</summary><p>${e(r.outcome)}</p><div class="sample-evidence"><span class="eyebrow">Example evidence · ${e(r.id)}</span><h4>Contribution handover</h4><p>1. Reviewed the organisation’s challenge and agreed the scope.<br>2. Delivered the output described above.<br>3. Shared recommendations and handover notes with the team.</p><small>This sample is included for layout review. No client documents or real research participants are represented.</small></div></details>${r.status === "verified" ? `<blockquote class="endorsement"><span class="eyebrow">Organisation endorsement · Example</span><p class="rating" aria-label="${r.rating} out of 5 stars">${"★".repeat(r.rating)}${"☆".repeat(5 - r.rating)} <b>${r.rating.toFixed(1)}</b></p><p>“${e(r.feedback)}”</p><footer>${e(r.organisation)} · Contribution reviewer<br><small>Hours and output confirmed · ${e(r.reviewDate)}</small></footer></blockquote>` : `<div class="review-pending"><b>${r.status === "ongoing" ? "Contribution in progress" : "Organisation review pending"}</b><p>These hours do not count towards verified hours. An endorsement and rating appear only after the organisation’s review.</p></div>`}</article>`;
}
export function exampleProfile(id) {
  const p = exampleTalents.find((p) => p.user_id === id);
  if (!p)
    return empty(
      "Example profile not found",
      "Choose a person from the talent directory.",
      '<a href="#talent">Back to talent</a>',
    );
  const records = contributionRecords(p),
    summary = contributionSummary(records);
  state.afterRender = () => {
    const draw = () => {
      const value = $("#contribution-status").value;
      const filtered = records.filter((r) => !value || r.status === value);
      $("#contribution-list").innerHTML = filtered.map(recordCard).join("");
      $("#contribution-count").textContent =
        `${filtered.length} ${filtered.length === 1 ? "contribution" : "contributions"} shown`;
    };
    $("#contribution-status").addEventListener("change", draw);
    draw();
  };
  return `<a class="back" href="#talent">← Talent directory</a>${exampleNotice}<section class="impact-profile"><div class="avatar">${initials(p.name)}</div><div><span class="eyebrow">Talent profile · Living impact CV</span><h1>${e(p.name)}</h1><p class="profile-headline">${e(p.headline)}</p><p class="muted">${e(p.location)} · Remote</p><p class="support-languages"><b>Can support in:</b> ${languageText(p.languages)}</p><div class="actions">${btn("Copy public profile link", "share", location.href)}${btn("Print / Save PDF", "print", "", "secondary")}<a href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(location.href)}" target="_blank" rel="noopener noreferrer" class="text-button">Share on LinkedIn ↗</a></div><p class="linkedin-secondary">LinkedIn: ${btn("View professional profile ↗", "example-linkedin", "", "text-button")} <small>Example link · identity not verified</small></p></div></section><div class="impact-metrics" aria-label="Example impact overview"><div><strong>${summary.verified}</strong><span>Verified contributions</span></div><div><strong>${summary.organisations}</strong><span>Organisations supported</span></div><div><strong>${summary.hours}</strong><span>Verified hours</span></div><div><strong>${summary.rating}<small> / 5</small></strong><span>Average organisation rating</span></div></div><p class="metric-note">From ${summary.verified} reviewed contributions · ${records.filter((r) => r.status === "ongoing").length} ongoing · ${records.filter((r) => r.status === "completed").length} awaiting verification. Only verified records count towards hours, organisations and ratings.</p><div class="profile-layout"><aside class="profile-sidebar"><div class="card"><h2>About ${e(p.name.split(" ")[0])}</h2><p>${id === "example-maria-lopez" ? "I help purpose-led organisations make digital services easier for everyone to use. My work combines research, accessible design and practical tools that teams can maintain." : `I support locally led organisations with ${e(p.skills.join(", ").toLowerCase())}. I focus on practical outputs and clear handovers.`}</p><h3>Professional experience</h3><p>${id === "example-maria-lopez" ? "Six years in digital product design and user research, with a focus on inclusive services and small-team collaboration." : "Experience supporting community organisations and multidisciplinary teams."}</p><small>Background is self-described. Contribution evidence appears alongside it.</small></div><div class="side-card"><span class="eyebrow">Available to contribute</span><h3>${p.hours_available} hours / month</h3><p>Remote · Defined tasks and short engagements</p><a class="button secondary" href="#needs">Explore example needs →</a></div><div class="card"><h3>Skills demonstrated</h3>${tags(summary.skills)}<p><small>Generated from organisation-verified contributions.</small></p></div><details class="card"><summary>How this record grows</summary><ol><li>Talent helps with an organisational need.</li><li>Contribution, hours and evidence are recorded.</li><li>The organisation reviews the output and hours, and adds feedback.</li><li>The profile updates automatically.</li></ol><p>LinkedIn provides optional professional context. It does not verify these impact records.</p><p>Use Copy public profile link to add this credential to a CV, application or LinkedIn profile. Sharing opens LinkedIn for you to review; nothing is posted automatically.</p></details></aside><section class="profile-contributions"><div class="section-head"><div><span class="eyebrow">Portfolio</span><h2>Verified contributions</h2><p>Built from the needs ${e(p.name.split(" ")[0])} helps solve. No manual portfolio entries.</p></div></div><div class="contribution-toolbar">${select(
    "status",
    "Contribution status",
    [
      ["", "All contributions"],
      ["verified", "Completed & verified"],
      ["ongoing", "Ongoing"],
      ["completed", "Awaiting verification"],
    ],
  ).replace(
    "<select ",
    '<select id="contribution-status" ',
  )}<span id="contribution-count" role="status"></span></div><div id="contribution-list"></div></section></div>`;
}
export function exampleNeed(id) {
  const n = exampleNeeds.find((n) => n.id === id);
  if (!n)
    return empty(
      "Example need not found",
      "Return to the directory.",
      '<a href="#needs">All needs</a>',
    );
  return `<a class="back" href="#needs">← All needs</a>${exampleNotice}${head(e(n.organisation.public_name), e(n.title), e(n.output))}<div class="split"><section class="card"><h2>The challenge</h2><p>The team needs focused professional support to improve its work and build capability it can maintain.</p><h3>What you would contribute</h3><p>${e(n.output)} Agree the scope with the team, prepare the output and provide a practical handover.</p><h3>Skills involved</h3>${tags(n.skills)}<h3>Languages we can receive support in</h3><p>${languageText(n.languages)}</p><p><small>Support in any one of these languages is welcome.</small></p><div class="output"><h3>How this becomes portfolio evidence</h3><p>Contribution → recorded hours and deliverables → organisation review → verified contribution on the talent’s profile.</p></div><a class="button secondary" href="#profile/example-maria-lopez">See Maria’s example impact CV →</a></section><aside class="side-card"><span class="status">Example · Open need</span><h3>${n.hours} estimated hours</h3><p>Remote · Timing agreed with the team</p><p>This is a design example, so it does not accept applications or create real contribution records.</p><a class="button secondary" href="#talent">Browse example talent →</a></aside></div>`;
}
