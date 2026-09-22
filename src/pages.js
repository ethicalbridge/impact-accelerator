import { allianceIntro, contributionSteps, safetyNotice } from "./alliance.js";
import {
  exampleNotice,
  exampleTalents,
  exampleNeeds,
  exampleProfile,
  exampleNeed,
} from "./examples.js";
import { withImages } from "./media.js";
import {
  languageText,
  db,
  state,
  $,
  e,
  safeURL,
  today,
  tags,
  initials,
  date,
  link,
  btn,
  empty,
  head,
  select,
  result,
  members,
  profile,
  needCard,
  talentCard,
  portfolioCard,
  workspaceTabs,
  gate,
  profileGate,
} from "./core.js";
import { filterRecords, types } from "./utils.js";
export async function home() {
  return `${allianceIntro}<section class="hero"><div><span class="eyebrow">Expertise in service of local change</span><h1>Good work.<br>Greater impact.</h1><p>Bring your skills to the organisations moving their communities forward. Share what you know, build meaningful experience, and show what you can do.</p><div class="actions"><a class="button" href="#needs">Explore organisational needs →</a><a class="button secondary" href="#talent">Explore talent & impact</a></div></div><div class="showcase"><span class="eyebrow">More than a list of skills</span><h2>Let your work<br>speak for you.</h2><p>A portfolio that connects your expertise to the difference it makes.</p><div class="evidence-stack"><div class="evidence-row"><span class="evidence-icon">01</span><div><b>The work</b><small>Needs solved and contributions completed</small></div></div><div class="evidence-row"><span class="evidence-icon">02</span><div><b>Your contribution</b><small>Your role, approach and professional skills</small></div></div><div class="evidence-row"><span class="evidence-icon">03</span><div><b>The outcome</b><small>Organisation reviews, hours and outcomes.</small></div></div></div></div></section>${contributionSteps}<section class="split"><div><span class="eyebrow">A different way to support</span><h2>Supporting change is not only about money.</h2><p class="muted">Your professional experience can help an organisation solve a problem, strengthen a team, or create something it can keep using. It can also open a meaningful path into the social-impact sector.</p><a href="#guide">See how Impact Accelerator works →</a></div><aside class="side-card"><h3>For organisations</h3><p>Find people through the work they have done, the skills they bring, and the time they can offer.</p><a href="#talent" class="button secondary">Discover talent →</a></aside></section>${safetyNotice}`;
}
function filters(kind) {
  return `<form class="filters" id="filters"><label class="search">Search<input name="search" type="search" placeholder="${kind === "talent" ? "Name, expertise or location" : "Need, organisation or location"}"></label><label>Skill<input name="skill" placeholder="e.g. Research"></label><label>Support language<input name="language" type="search" placeholder="e.g. Spanish"></label>${select("arrangement", "Work arrangement", [["", "All arrangements"], "Remote", "Hybrid", "In person"])}${
    kind === "talent"
      ? select("availability", "Availability", [
          ["", "Everyone"],
          ["available", "Available now"],
        ])
      : ""
  }<button class="secondary" type="reset">Clear filters</button></form><p id="result-count" class="muted" role="status"></p><div class="grid" id="results"></div>`;
}
export async function directory(kind) {
  const isTalent = kind === "talent";
  let directoryError = false;
  const rows = await result(
    isTalent
      ? db.from("ia_profiles").select("*").eq("published", true).order("name")
      : db
          .from("ia_needs")
          .select("*,organisation:organisations(public_name,registered_name)")
          .eq("status", "open")
          .order("created_at", { ascending: false }),
  ).catch(() => {
    directoryError = true;
    return [];
  });
  const activeRows = isTalent
    ? rows
    : rows.filter((n) => !n.deadline || n.deadline >= today());
  state.afterRender = () => {
    const f = $("#filters");
    const draw = () => {
      const found = filterRecords(
        activeRows,
        Object.fromEntries(new FormData(f)),
      );
      const examples = filterRecords(
        isTalent ? exampleTalents : exampleNeeds,
        Object.fromEntries(new FormData(f)),
      );
      $("#example-results").innerHTML = examples.length
        ? examples.map(isTalent ? talentCard : needCard).join("")
        : empty(
            "No example matches",
            "Try another skill or clear the filters.",
          );
      $("#example-count").textContent =
        `${examples.length} ${examples.length === 1 ? "example" : "examples"}`;
      $("#result-count").textContent =
        `${found.length} ${isTalent ? "professionals" : "open needs"}`;
      $("#results").innerHTML = found.length
        ? found.map(isTalent ? talentCard : needCard).join("")
        : empty(
            activeRows.length
              ? "No matches for these filters"
              : isTalent
                ? "A network built by its people"
                : "Space for the next meaningful contribution",
            activeRows.length
              ? "Try another skill, location or work arrangement."
              : isTalent
                ? "Publish your profile and be among the first professionals organisations can discover."
                : "Organisations can publish a clear support need here. Browse talent or prepare your profile while new needs are added.",
            activeRows.length
              ? btn("Clear filters", "clear-filters", "", "secondary")
              : `<a href="#${isTalent ? "workspace" : "organisation"}" class="button">${isTalent ? "Create your profile" : "Create a support need"}</a>`,
          );
    };
    f.addEventListener("input", draw);
    f.addEventListener("reset", () => setTimeout(draw));
    draw();
  };
  return (
    head(
      isTalent ? "People with purpose" : "Locally led priorities",
      isTalent
        ? "Find the person behind the skills."
        : "Where your expertise can help.",
      isTalent
        ? "Explore experience, availability and organisation-reviewed contributions. Find someone who understands the work you need to do."
        : "Browse clear requests for professional support. Understand the outcome and time involved before applying.",
    ) +
    filters(kind).replace(
      '<p id="result-count"',
      `<section class="example-directory">${exampleNotice}<p id="example-count" class="muted" role="status"></p><div class="grid" id="example-results"></div></section><h2 class="section-head">${isTalent ? "Community talent" : "Community needs"}</h2>${directoryError ? '<p class="banner">Live records could not be loaded. Examples remain available. Refresh to try live records again.</p>' : ""}<p id="result-count"`,
    )
  );
}
export async function profilePage(id) {
  if (id.startsWith("example-")) return exampleProfile(id);
  const p = await result(
    db.from("ia_profiles").select("*").eq("user_id", id).maybeSingle(),
  );
  if (!p)
    return empty(
      "Profile not available",
      "This profile may be private or no longer published.",
      '<a class="button secondary" href="#talent">Back to talent</a>',
    );
  const owner = state.user?.id === id;
  const contributions = await result(
    db
      .from("ia_hours")
      .select("*,need:ia_needs(title,description,output,skills,organisation:organisations(public_name,registered_name))")
      .eq("user_id", id)
      .eq("status", "approved")
      .order("work_date", { ascending: false }),
  );
  const visible = owner ? contributions : contributions.filter((c) => c.public);
  const organisations = new Set(visible.map((c) => c.need?.organisation?.public_name || c.need?.organisation?.registered_name).filter(Boolean));
  const totalHours = visible.reduce((sum, c) => sum + Number(c.hours), 0);
  const rated = visible.filter((c) => c.rating);
  const average = rated.length ? (rated.reduce((sum, c) => sum + Number(c.rating), 0) / rated.length).toFixed(1) : "—";
  return `<a class="back" href="#talent">← Talent directory</a><div class="profile-header"><div class="avatar">${initials(p.name)}</div><span class="eyebrow">${owner && !p.published ? "Private profile · only you can see this" : "Professional profile"}</span><h1>${e(p.name)}</h1><p>${e(p.headline)}</p><div class="profile-meta"><span>${e(p.location || "Location not specified")}</span><span>${e(p.arrangement)}</span><span><b>Can support in:</b> ${languageText(p.languages)}</span></div><div class="actions">${owner ? btn("Edit profile", "edit-profile") : btn("Invite to a need", "invite", id)}${btn("Copy profile link", "share", location.href, "secondary")}${btn("Print / Save PDF", "print", "", "secondary")}<a class="text-button" href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(location.href)}" target="_blank" rel="noopener noreferrer">Share on LinkedIn ↗</a></div></div><div class="split"><section><h2>About</h2><p class="prose">${e(p.bio || "This professional has not added an introduction yet.")}</p>${p.experience ? `<h2>Experience & achievements</h2><p class="prose">${e(p.experience)}</p>` : ""}</section><aside><div class="side-card"><span class="eyebrow">Availability</span><strong>${p.hours_available}</strong> hours / month<p><small>${p.hours_available ? "Open to discussing a contribution." : "Not currently available for new work."}</small></p></div><div class="card"><h3>Professional skills</h3>${tags(p.skills)}<div class="actions">${link(p.website, /https:\/\/(www\.)?linkedin\.com\/in\//i.test(p.website || "") ? "LinkedIn: View professional profile" : "Professional website")}<small>External background link · identity not verified by Ethical Bridge</small></div></div></aside></div><section class="verified-portfolio"><div class="section-head"><div><span class="eyebrow">Portfolio · Generated from platform contributions</span><h2>Verified contributions</h2><p>Organisation-approved work, outcomes and endorsements. ${owner ? "You control which approved records appear publicly." : "Each record is linked to work reviewed through Impact Accelerator."}</p></div></div><div class="impact-metrics"><div><strong>${visible.length}</strong><span>contributions</span></div><div><strong>${organisations.size}</strong><span>organisations supported</span></div><div><strong>${totalHours}</strong><span>verified hours</span></div><div><strong>${average}${average === "—" ? "" : " / 5"}</strong><span>average rating</span></div></div>${visible.length ? visible.map((c) => contributionCard(c, owner)).join("") : empty(owner ? "Your verified portfolio starts here" : "No public verified contributions yet", owner ? "Complete a signed contribution, submit your hours and receive organisation approval. You can then publish the verified record here." : "This professional has not published an organisation-approved contribution yet.", owner ? '<a class="button secondary" href="#hours">View impact hours</a>' : '<a class="button secondary" href="#profile/example-maria-lopez">Explore the complete example</a>')}</section>`;
}

function contributionCard(c, owner) {
  const organisation = c.need?.organisation?.public_name || c.need?.organisation?.registered_name || "Organisation";
  const stars = c.rating ? `${"★".repeat(c.rating)}${"☆".repeat(5 - c.rating)} ${Number(c.rating).toFixed(1)}` : "Endorsement recorded";
  return `<article class="contribution-card ${c.public ? "verified" : "private-contribution"}"><div class="contribution-top"><div><span class="status">${c.public ? "Verified · public" : "Verified · private"}</span><h3>${e(c.need?.title || "Verified contribution")}</h3><p class="organisation-name">${e(organisation)} · ${date(c.work_date)}</p></div><strong class="hours-badge">${c.hours} h</strong></div><p><b>Need addressed:</b> ${e(c.need?.description || c.need?.output || "Organisation support need")}</p><p><b>Contribution:</b> ${e(c.description)}</p>${c.deliverables ? `<div class="output"><b>Deliverables / outcomes</b><p>${e(c.deliverables)}</p></div>` : ""}${tags(c.need?.skills || [])}<blockquote class="endorsement"><strong>${stars}</strong><p>“${e(c.feedback || c.review_note || "Contribution reviewed and approved by the organisation.")}”</p><cite>Organisation endorsement · verified through Impact Accelerator</cite></blockquote>${link(c.evidence, "View supporting evidence ↗")}${owner ? `<div class="actions">${btn(c.public ? "Remove from public profile" : "Publish on my profile", c.public ? "hide-contribution" : "publish-contribution", c.id, c.public ? "secondary" : "")}</div>` : ""}</article>`;
}
export async function portfolio() {
  location.replace(state.user ? `#profile/${state.user.id}` : "#talent");
  return "";
}
export async function workPage() {
  return empty(
    "Portfolio entries now belong to talent profiles",
    "Explore automatically generated contribution records within each profile.",
    '<a class="button" href="#talent">Explore talent</a>',
  );
}

export async function needPage(id) {
  if (id.startsWith("example-")) return exampleNeed(id);
  const n = await result(
    db
      .from("ia_needs")
      .select(
        "*,organisation:organisations(public_name,registered_name,summary,website,slug)",
      )
      .eq("id", id)
      .maybeSingle(),
  );
  if (!n)
    return empty(
      "Need not available",
      "This request may be a private draft.",
      '<a href="#needs" class="button secondary">Explore needs</a>',
    );
  const available =
    n.status === "open" && (!n.deadline || n.deadline >= today());
  const app = state.user
    ? await result(
        db
          .from("ia_applications")
          .select("status")
          .eq("need_id", id)
          .eq("user_id", state.user.id)
          .maybeSingle(),
      )
    : null;
  const saved = state.user
    ? await result(
        db
          .from("ia_saved")
          .select("need_id")
          .eq("need_id", id)
          .eq("user_id", state.user.id)
          .maybeSingle(),
      )
    : null;
  return `<a class="back" href="#needs">← All needs</a>${head(e(n.organisation?.public_name || n.organisation?.registered_name || "Organisation"), e(n.title), e(n.output))}<div class="split"><section class="card"><h2>What we need</h2><p class="prose">${e(n.description)}</p><div class="output"><h3>Expected output</h3><p class="prose">${e(n.output)}</p></div><h3>Skills involved</h3>${tags(n.skills)}<h3>Languages we can receive support in</h3><p>${languageText(n.languages)}</p><p><small>Support in any one of the listed languages is welcome unless the brief specifies otherwise.</small></p><h3 class="section-head">About the organisation</h3><p>${e(n.organisation?.summary || "Learn more through the organisation’s website.")}</p>${link(n.organisation?.website, "Organisation website")}<div class="banner">Agree on scope, confidentiality, access and working arrangements before starting. Do not share sensitive beneficiary information in an application.</div></section><aside><div class="side-card"><span class="status">${available ? "Open for applications" : n.status === "draft" ? "Draft" : "Applications closed"}</span><h3>${n.hours} estimated hours</h3><p>${e(n.arrangement)}${n.location ? " · " + e(n.location) : ""}</p><p><small>${n.deadline ? "Apply by " + date(n.deadline) : "No fixed deadline"}</small></p>${app ? `<p>Application: <b>${e(app.status)}</b></p>` : available ? btn("Apply to this need", "apply", id) : ""}<div class="actions">${btn(saved ? "Remove from saved" : "Save for later", "save-need", id, "secondary")}</div></div><a href="#safeguarding">Working responsibly →</a></aside></div>`;
}
