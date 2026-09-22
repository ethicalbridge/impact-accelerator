import { withImages } from "./media.js";
import {
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
  return `<section class="hero"><div><span class="eyebrow">Expertise in service of local change</span><h1>Good work.<br>Greater impact.</h1><p>Bring your skills to the organisations moving their communities forward. Share what you know, build meaningful experience, and show what you can do.</p><div class="actions"><a class="button" href="#needs">Explore organisational needs →</a><a class="button secondary" href="#portfolio">Build your portfolio</a></div></div><div class="showcase"><span class="eyebrow">More than a list of skills</span><h2>Let your work<br>speak for you.</h2><p>A portfolio that connects your expertise to the difference it makes.</p><div class="evidence-stack"><div class="evidence-row"><span class="evidence-icon">01</span><div><b>The work</b><small>Research, campaigns, designs, reports & more</small></div></div><div class="evidence-row"><span class="evidence-icon">02</span><div><b>Your contribution</b><small>Your role, approach and professional skills</small></div></div><div class="evidence-row"><span class="evidence-icon">03</span><div><b>The outcome</b><small>Clear outputs. Useful evidence. Real context.</small></div></div></div></div></section><div class="intro-strip"><div><span>01</span><p><b>Start with a real need.</b><br>Organisations define the outcome, skills and time they need.</p></div><div><span>02</span><p><b>Find the right contribution.</b><br>Explore the work and agree on a scope that fits.</p></div><div><span>03</span><p><b>Make capability visible.</b><br>Share your work and record organisation-approved hours.</p></div></div><section class="split"><div><span class="eyebrow">A different way to support</span><h2>Supporting change is not only about money.</h2><p class="muted">Your professional experience can help an organisation solve a problem, strengthen a team, or create something it can keep using. It can also open a meaningful path into the social-impact sector.</p><a href="#guide">See how Impact Accelerator works →</a></div><aside class="side-card"><h3>For organisations</h3><p>Find people through the work they have done, the skills they bring, and the time they can offer.</p><a href="#talent" class="button secondary">Discover talent →</a></aside></section>`;
}
function filters(kind) {
  return `<form class="filters" id="filters"><label class="search">Search<input name="search" type="search" placeholder="${kind === "talent" ? "Name, expertise or location" : "Need, organisation or location"}"></label><label>Skill<input name="skill" placeholder="e.g. Research"></label>${select("arrangement", "Work arrangement", [["", "All arrangements"], "Remote", "Hybrid", "In person"])}${
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
  const rows = await result(
    isTalent
      ? db.from("ia_profiles").select("*").eq("published", true).order("name")
      : db
          .from("ia_needs")
          .select("*,organisation:organisations(public_name,registered_name)")
          .eq("status", "open")
          .order("created_at", { ascending: false }),
  );
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
        ? "Explore experience, availability and work samples. Find someone who understands the work you need to do."
        : "Browse clear requests for professional support. Understand the outcome and time involved before applying.",
    ) + filters(kind)
  );
}
export async function profilePage(id) {
  const p = await result(
    db.from("ia_profiles").select("*").eq("user_id", id).maybeSingle(),
  );
  if (!p)
    return empty(
      "Profile not available",
      "This profile may be private or no longer published.",
      '<a class="button secondary" href="#talent">Back to talent</a>',
    );
  const items = await result(
    db
      .from("ia_portfolio")
      .select("*")
      .eq("user_id", id)
      .order("featured", { ascending: false })
      .order("work_date", { ascending: false, nullsFirst: false }),
  );
  await withImages(items);
  const owner = state.user?.id === id;
  state.afterRender = () => {
    $("#work-filter")?.addEventListener("change", () => {
      const found = filterRecords(items, { type: $("#work-filter").value });
      $("#profile-work").innerHTML = found.length
        ? found.map((i) => portfolioCard(i, owner)).join("")
        : empty(
            "No work in this category",
            "Choose another type to explore this portfolio.",
          );
    });
  };
  return `<a class="back" href="#talent">← Talent directory</a><div class="profile-header"><div class="avatar">${initials(p.name)}</div><span class="eyebrow">${owner && !p.published ? "Private profile · only you can see this" : "Professional profile"}</span><h1>${e(p.name)}</h1><p>${e(p.headline)}</p><div class="profile-meta"><span>${e(p.location || "Location not specified")}</span><span>${e(p.arrangement)}</span><span>${e(p.languages.join(" · "))}</span></div><div class="actions">${owner ? btn("Edit profile", "edit-profile") : btn("Invite to a need", "invite", id)}${btn("Copy profile link", "share", location.href, "secondary")}${btn("Print / Save PDF", "print", "", "secondary")}</div></div><div class="split"><section><h2>About</h2><p class="prose">${e(p.bio || "This professional has not added an introduction yet.")}</p>${p.experience ? `<h2>Experience & achievements</h2><p class="prose">${e(p.experience)}</p>` : ""}</section><aside><div class="side-card"><span class="eyebrow">Availability</span><strong>${p.hours_available}</strong> hours / month<p><small>${p.hours_available ? "Open to discussing a contribution." : "Not currently available for new work."}</small></p></div><div class="card"><h3>Professional skills</h3>${tags(p.skills)}<div class="actions">${link(p.website, "Professional website")}</div></div></aside></div><div class="section-head"><div><span class="eyebrow">Evidence of capability</span><h2>Selected work</h2><p>Work and outcomes described by ${e(p.name.split(" ")[0])}. Entries are self-reported, unless separately supported by evidence.</p></div>${select("type", "Browse by type", [["", "All work"], ...types]).replace("<select ", '<select id="work-filter" ')}</div><div class="grid portfolio-grid" id="profile-work">${items.length ? items.map((i) => portfolioCard(i, owner)).join("") : empty("Work samples are on their way", owner ? "Add a case study, publication, campaign or another piece of work to show your capabilities." : "This professional has not shared any work samples yet.", owner ? btn("Add your first work", "add-work") : "")}</div>`;
}
export async function portfolio() {
  if (!state.user)
    return (
      head(
        "Your work, in context",
        "A portfolio with substance.",
        "Show the work you are proud of and help organisations understand what you can contribute.",
      ) +
      `<div class="grid">${[
        [
          "Make it tangible",
          "Show a report, research paper, design, campaign, website, video or other output.",
        ],
        [
          "Explain your contribution",
          "Describe your role, the challenge, the skills you used and who you worked with.",
        ],
        [
          "Show what changed",
          "Connect your output to a useful outcome. Add evidence where you have it.",
        ],
      ]
        .map(([t, c]) => `<div class="card"><h3>${t}</h3><p>${c}</p></div>`)
        .join(
          "",
        )}</div><div class="actions">${btn("Start your portfolio", "auth")}</div>`
    );
  const p = await profile();
  if (!p) return profileGate();
  const items = await result(
    db
      .from("ia_portfolio")
      .select("*")
      .eq("user_id", state.user.id)
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false }),
  );
  await withImages(items);
  return (
    workspaceTabs("portfolio") +
    `<div class="section-head"><div><span class="eyebrow">Your professional evidence</span><h1>My portfolio</h1><p>Turn previous work into a clear picture of what you can do.</p></div>${btn("＋ Add work", "add-work")}</div>${!p.published ? '<div class="banner">Your profile is private. Public entries become visible only when you publish your profile.</div>' : ""}<div class="actions"><a class="button secondary" href="#profile/${state.user.id}">Preview full profile</a>${btn("Export portfolio", "export")}</div><div class="section-head"><h2>${items.length} work ${items.length === 1 ? "entry" : "entries"}</h2></div><div class="grid portfolio-grid">${items.length ? items.map((i) => portfolioCard(i, true)).join("") : empty("Start with work you are proud of", "Previous professional work belongs here too. Add your role, outcome and a link or thumbnail to make your first case study.", btn("Add your first work", "add-work"))}</div>`
  );
}
export async function workPage(id) {
  const p = await result(
    db
      .from("ia_portfolio")
      .select("*,person:ia_profiles(name)")
      .eq("id", id)
      .maybeSingle(),
  );
  if (!p)
    return empty(
      "Work not available",
      "This entry may be a private draft.",
      '<a href="#talent" class="button secondary">Explore talent</a>',
    );
  await withImages([p]);
  return `<a class="back" href="#profile/${p.user_id}">← ${e(p.person?.name || "Professional profile")}</a><div class="section-head"><div><span class="eyebrow">${e(p.work_type)} · ${p.published ? "Work sample" : "Private draft"}</span><h1>${e(p.title)}</h1><p>${e(p.client)}${p.work_date ? " · " + date(p.work_date) : ""}</p></div>${state.user?.id === p.user_id ? btn("Edit work", "edit-work", p.id) : ""}</div>${safeURL(p.imageURL ?? p.image) ? `<img class="wide-image" src="${e(safeURL(p.imageURL ?? p.image))}" alt="${e(p.title)}" referrerpolicy="no-referrer">` : ""}<div class="split"><div><h2>The work</h2><p class="prose">${e(p.description)}</p>${p.role ? `<h2>My contribution</h2><p class="prose">${e(p.role)}</p>` : ""}${p.outcome ? `<div class="output"><h3>Outcomes & achievements</h3><p class="prose">${e(p.outcome)}</p></div>` : ""}</div><aside class="card"><h3>Skills demonstrated</h3>${tags(p.skills)}<div class="actions">${link(p.link, "Open supporting work", "button")}${btn("Copy work link", "share", location.href, "secondary")}</div><p><small>Work and outcomes are self-reported by the professional. External evidence opens in a new tab.</small></p></aside></div>`;
}
export async function needPage(id) {
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
  return `<a class="back" href="#needs">← All needs</a>${head(e(n.organisation?.public_name || n.organisation?.registered_name || "Organisation"), e(n.title), e(n.output))}<div class="split"><section class="card"><h2>What we need</h2><p class="prose">${e(n.description)}</p><div class="output"><h3>Expected output</h3><p class="prose">${e(n.output)}</p></div><h3>Skills involved</h3>${tags(n.skills)}<h3 class="section-head">About the organisation</h3><p>${e(n.organisation?.summary || "Learn more through the organisation’s website.")}</p>${link(n.organisation?.website, "Organisation website")}<div class="banner">Agree on scope, confidentiality, access and working arrangements before starting. Do not share sensitive beneficiary information in an application.</div></section><aside><div class="side-card"><span class="status">${available ? "Open for applications" : n.status === "draft" ? "Draft" : "Applications closed"}</span><h3>${n.hours} estimated hours</h3><p>${e(n.arrangement)}${n.location ? " · " + e(n.location) : ""}</p><p><small>${n.deadline ? "Apply by " + date(n.deadline) : "No fixed deadline"}</small></p>${app ? `<p>Application: <b>${e(app.status)}</b></p>` : available ? btn("Apply to this need", "apply", id) : ""}<div class="actions">${btn(saved ? "Remove from saved" : "Save for later", "save-need", id, "secondary")}</div></div><a href="#safeguarding">Working responsibly →</a></aside></div>`;
}
