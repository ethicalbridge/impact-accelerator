import { db, state, result, e, openDialog, toast, go, withForm, val, $ } from "../core.js";
import { icon, mark, avatar, cover, coverKind, COVER_BG, needCard, talentCard, contributionCard, exampleBadge, exampleNotice, tags, pill, eyebrow, empty, btn, back, field, formEnd, safeLink, status } from "../ui.js";
import { exampleNeeds, exampleProfile, exampleContributions } from "../examples.js";
import { filterRecords, professionalAreas, date, plural, today } from "../utils.js";
import { config } from "../config.js";

const NEED_SELECT = "*, organisation:organisations(id,name,city,country,website,summary,org_type)";

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
  const steps = [["doc", "Define the need", "The organisation sets the challenge, output, skills, languages and hours."], ["people", "Apply or invite", "Professionals apply with a plan, or organisations invite someone who fits."], ["pen", "Sign the agreement", "Scope, access, safeguarding and confidentiality, signed by both."], ["clock", "Do the work", "A short, protected contribution delivers the agreed output."], ["shield", "Review and record", "The organisation reviews the work; it joins the professional’s impact CV."]];
  const faqs = [["Is it really free?", "Yes. Impact Accelerator is free for organisations and for professionals."], ["Is the work paid?", "No. Contributions are voluntary. Any expenses need separate written terms between the two of you."], ["Who can join?", "Locally led organisations, registered or fiscally hosted, and professionals aged 18 or over, anywhere in the world."], ["How long is a contribution?", "Most needs take 6 to 16 hours, agreed up front and logged as you go."], ["What if something goes wrong?", "Either side can pause or end a conversation or engagement, and anyone can report a concern. Our safeguarding lead reviews every report."]];
  const html = `
  <div class="wrap">
    <section class="hero">
      <div class="stack" style="--gap:26px">
        ${eyebrow("Skills for locally led change")}
        <h1>Good work.<br>Greater impact.</h1>
        <p class="lead">Local organisations publish the specific help they need. Skilled professionals give a few focused hours. Both leave with something that lasts.</p>
        <div class="doors">
          <a class="door dark" href="#organisations"><span class="door-icon">${icon("home", 24, "#fffdf8")}</span><span class="door-title">I’m an organisation</span><p>Publish a need and find skilled help. Free, always.</p><span class="door-cta">Post a need ${icon("arrow", 18)}</span></a>
          <a class="door" href="#needs"><span class="door-icon">${icon("user", 24, "#0f6f63")}</span><span class="door-title">I’m a professional</span><p>Contribute your skills and build a reviewed impact CV.</p><span class="door-cta">Find a need ${icon("arrow", 18)}</span></a>
        </div>
      </div>
      ${collage()}
    </section>
    <div class="trust-strip">${trust.map(([ic, t, d]) => `<div><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><div><strong>${t}</strong><p class="small muted">${d}</p></div></div>`).join("")}</div>
    <section class="block stack" style="--gap:40px">
      <div class="row between" style="align-items:flex-end"><div class="stack">${eyebrow("How it works")}<h2>From a clear need to capability that stays.</h2></div>${btn(`See the full process ${icon("arrow", 18)}`, "#how", "secondary")}</div>
      <ol class="steps">${steps.map(([ic, t, d], i) => `<li class="${i === 2 ? "accent" : ""}"><div class="row between">${icon(ic, 26, "#0f6f63")}<span class="step-num">0${i + 1}</span></div><h3>${t}</h3><p class="small muted">${d}</p></li>`).join("")}</ol>
    </section>
    <section class="stack" style="--gap:36px;padding-bottom:110px">
      <div class="row between" style="align-items:flex-end"><div class="stack">${eyebrow(real.length ? "Open needs" : "Example needs")}<h2>Where your expertise can help.</h2><p class="lead">Each need is written by the organisation, with a clear output and a realistic number of hours.</p></div>${btn(`Explore all needs ${icon("arrow", 18)}`, "#needs")}</div>
      ${real.length ? "" : exampleNotice("These are example needs. Real needs from approved organisations will replace them.")}
      <div class="grid">${featured.map(needCard).join("")}</div>
    </section>
  </div>
  <section class="band-dark block"><div class="wrap grid-2" style="gap:72px;align-items:center">
    <div class="stack" style="--gap:26px">${eyebrow("For professionals")}<h2>Let your work speak for you.</h2><p class="lead">Every completed contribution becomes a record on your impact CV: the need, what you did, the outcome and the organisation’s own words. You choose what is public.</p>
      <ul class="checks">${["Real experience for students and people changing careers", "Endorsements written by the organisations you helped", "A shareable CV link and a printable PDF"].map((t) => `<li>${icon("check", 22, "#a9c9bf", 2.2)}${t}</li>`).join("")}</ul>
      <div class="row">${btn(`See an example impact CV ${icon("arrow", 18)}`, "#profile/example-maria-lopez", "light")}${btn("Create your profile", "#join", "ghost-light")}</div></div>
    <div class="card stack" style="--gap:20px;color:var(--ink);box-shadow:0 30px 60px rgba(0,0,0,.25)">
      <div class="row between">${eyebrow("Impact CV")}${exampleBadge()}</div>
      <div class="row" style="--gap:18px">${avatar("Maria Lopez", 72)}<div><span class="serif" style="font-size:1.9rem">Maria Lopez</span><p class="muted small">UX designer · research · accessibility · Madrid</p></div></div>
      <div class="metric-row"><div class="metric"><strong>3</strong><span>reviewed contributions</span></div><div class="metric"><strong>3</strong><span>organisations helped</span></div><div class="metric"><strong>42</strong><span>reviewed hours</span></div></div>
      <div class="card stack" style="--gap:8px;padding:18px 20px"><div class="row between"><strong>Accessibility review</strong>${pill("Still in use at 6 months")}</div><span class="small muted">Example Organisation · 12 hours · August 2026</span><p class="serif" style="font-size:1.1rem">“Very detailed, practical recommendations our team implemented straight away.”</p></div>
    </div></div></section>
  <div class="wrap">
    <section class="block grid-2">
      ${audience("For organisations", "Skills you could not otherwise reach, on your terms.", ["You define the need, the output and what success looks like", "Browse approved professionals or wait for applications", "Up to three open needs at a time, free", "Keep everything you receive, and the evidence of it"], "Post your first need", "#organisations")}
      ${audience("For professionals", "Meaningful work that fits around your life.", ["Short, scoped contributions of 6 to 16 hours", "Remote or local, in the languages you work in", "A signed agreement protects you and the organisation", "Open to students and early-career people aged 18 and over"], "Find a need", "#needs")}
    </section>
    <section class="card grid-2" style="background:var(--mint);border-color:#bcd6cd;padding:clamp(28px,5vw,56px);gap:48px">
      <div class="stack" style="--gap:18px"><span class="icon-tile lg paper">${icon("shield", 30, "#0f6f63")}</span><h2 style="font-size:clamp(1.9rem,3vw,2.7rem)">Good intentions need good boundaries.</h2><a href="#safety" style="font-weight:700">Read how we work responsibly</a></div>
      <div class="stack">${[["lock", "Trust comes before access", "Nothing confidential is shared until both sides have signed. Never passwords, card details or access codes."], ["people", "No work with children or vulnerable adults", "During the pilot, needs involving direct contact are not accepted."], ["flag", "Anyone can raise a concern", "Report a profile, need or conversation at any time. Either side can end a conversation."]].map(([ic, t, d]) => `<div class="card row" style="align-items:flex-start;flex-wrap:nowrap;padding:20px 22px">${icon(ic, 24, "#0f6f63")}<div><strong>${t}</strong><p class="muted">${d}</p></div></div>`).join("")}</div>
    </section>
    <section class="block grid-2 faq-grid">
      <div class="stack">${eyebrow("Questions")}<h2>Good to know before you start.</h2></div>
      <div>${faqs.map(([q, a], i) => `<details class="faq" ${i === 0 ? "open" : ""}><summary>${q}</summary><p>${a}</p></details>`).join("")}</div>
    </section>
    <section class="card row between" style="padding:clamp(28px,5vw,60px);margin-bottom:40px"><div class="stack"><h2>Ready to make your skills count?</h2><p class="lead">Join the founding group of organisations and professionals.</p></div><div class="row">${btn("Join free", "#join", "lg")}${btn("Explore needs", "#needs", "secondary lg")}</div></section>
  </div>`;
  return { title: "Skills for locally led change", description: "Local organisations publish the help they need. Skilled professionals give a few focused hours. Free for everyone.", html };
}

function audience(eb, title, items, cta, href) {
  return `<div class="card stack" style="--gap:20px;padding:clamp(26px,4vw,44px)">${eyebrow(eb)}<h3 class="serif" style="font:500 2rem/1.15 var(--serif)">${title}</h3><ul class="checks">${items.map((t) => `<li>${icon("check", 22, "#0f6f63", 2.2)}${t}</li>`).join("")}</ul><div>${btn(`${cta} ${icon("arrow", 18)}`, href)}</div></div>`;
}

function collage() {
  const dots = [];
  const size = 540, r = size / 2 - 10;
  for (let y = -r; y <= r; y += 18) for (let x = -r; x <= r; x += 18) {
    if (Math.hypot(x, y) < r - 6 && Math.sin(x / 58) + Math.cos(y / 47) * 0.9 + Math.sin((x + y) / 91) * 0.7 > 0.35) dots.push(`<circle cx="${Math.round(size / 2 + x)}" cy="${Math.round(size / 2 + y)}" r="3.2" fill="#0f6f63" fill-opacity="0.32"/>`);
  }
  const globe = `<svg viewBox="0 0 ${size} ${size}" aria-hidden="true" style="left:0;top:6.5%;width:96%;height:auto"><circle cx="270" cy="270" r="${r}" fill="#eaf3ef"/><circle cx="270" cy="270" r="${r}" fill="none" stroke="#7fa99b" stroke-opacity=".5" stroke-width="1.5"/>${dots.join("")}<path d="M130 330 Q 250 150 400 220" fill="none" stroke="#c68a2e" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/><path d="M150 360 Q 300 420 410 300" fill="none" stroke="#0f6f63" stroke-width="2.5" stroke-dasharray="2 7" stroke-linecap="round"/><circle cx="130" cy="330" r="9" fill="#c68a2e"/><circle cx="400" cy="220" r="9" fill="#0f6f63"/><circle cx="410" cy="300" r="9" fill="#123e3a"/><circle cx="150" cy="360" r="7" fill="#b85c38"/></svg>`;
  return `<div class="collage" aria-hidden="true">${globe}
    <div class="float" style="left:45%;top:3%;width:53%;overflow:hidden">${cover("data", { w: 300, h: 110 })}<div style="padding:12px 14px"><div class="row between" style="flex-wrap:nowrap"><span class="small muted">Water for Tomorrow · Kenya</span>${exampleBadge()}</div><div class="serif" style="font-size:1.15rem">Improve community data tools</div><div class="meta small"><span>${icon("clock", 15)}12 hours</span><span>${icon("globe", 15)}Remote</span></div></div></div>
    <div class="float row" style="left:0;top:44%;width:47%;padding:12px 14px;flex-wrap:nowrap">${avatar("Amara Mensah", 46)}<div><strong>Amara Mensah</strong><br><span class="small muted">MEL specialist · Accra</span></div></div>
    <div class="row" style="left:52%;top:61%;padding:10px 16px;border-radius:999px;background:#123e3a;color:#fffdf8;font-weight:600;font-size:.9rem;box-shadow:var(--shadow);flex-wrap:nowrap">${icon("pen", 17, "#fffdf8")}Agreement signed by both</div>
    <div class="float" style="left:11%;top:73%;width:77%;padding:16px 18px"><div class="row between"><span class="small" style="color:var(--teal);font-weight:700;display:inline-flex;gap:6px">${icon("shield", 16)}Reviewed by the organisation</span><span class="small muted">12 hours</span></div><p class="serif" style="font-size:1.05rem;margin-top:6px">“Our field team now collects data the same way in every village.”</p></div>
  </div>`;
}

// ---------- For organisations ----------
export async function organisations() {
  const steps = [["Create your organisation account", "Tell us who you are. We check you are locally led and registered or fiscally hosted, usually within two working days."], ["Publish a need", "Describe the challenge, the output, the skills, the working languages and the hours. Up to three open at a time."], ["Choose who to work with", "Review applications, or invite approved professionals whose work fits."], ["Sign the agreement", "Confirm scope, access and confidentiality before anything is shared."], ["Review and complete", "Approve logged hours, write an endorsement and mark the engagement complete."]];
  const html = `<div class="wrap">
    <div class="page-head">${eyebrow("For organisations")}<h1>Skilled help for the work you define.</h1><p class="lead">Impact Accelerator connects locally led organisations with professionals who contribute a few focused hours, free. You set the need, the output and what success looks like.</p><div class="row">${btn(`Create an organisation account ${icon("arrow", 18)}`, "#join?role=organisation", "lg")}${btn("Browse talent", "#talent", "secondary lg")}</div></div>
    <section class="grid-2" style="gap:24px;padding-bottom:40px">
      <div class="card stack" style="--gap:22px;background:var(--deep);color:var(--paper);border-color:var(--deep);padding:clamp(26px,4vw,44px)"><h2 style="font-size:2.2rem">How it works for you</h2><ol class="stack" style="list-style:none;margin:0;padding:0;--gap:20px">${steps.map(([t, d], i) => `<li class="row" style="align-items:flex-start;flex-wrap:nowrap"><span style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:20px;background:#fffdf8;color:#123e3a;font-weight:700;flex-shrink:0">${i + 1}</span><div><strong>${t}</strong><p style="color:var(--on-deep)">${d}</p></div></li>`).join("")}</ol></div>
      <div class="stack" style="--gap:24px">
        <div class="card stack">${eyebrow("Who can join")}<ul class="checks">${["Local NGOs, cooperatives, community groups and small mission-led social enterprises", "Led by people based where the organisation works", "Registered, or fiscally hosted by a registered organisation", "Needs that do not involve direct contact with children or vulnerable adults"].map((t) => `<li>${icon("check", 22, "#0f6f63", 2.2)}${t}</li>`).join("")}</ul></div>
        <div class="card stack">${eyebrow("What a good need looks like")}<p>One clear output, 6 to 16 hours, the skills and working languages involved. For example: “A data collection template that works offline, and a 90-minute training session for our six field officers.”</p><a href="#need/example-data-tools">See an example need</a></div>
        <div class="banner">${icon("gift", 24, "#0f6f63")}<p><strong>Always free.</strong> Contributions are voluntary; no fees are charged to organisations or professionals.</p></div>
      </div>
    </section></div>`;
  return { title: "For organisations", description: "Publish a need and find skilled help, free. For locally led organisations.", html };
}

// ---------- Needs directory ----------
function filtersForm(kind) {
  const opts = (arr) => arr.map((x) => (Array.isArray(x) ? `<option value="${e(x[0])}">${e(x[1])}</option>` : `<option>${e(x)}</option>`)).join("");
  return `<form class="filters" id="filters" role="search" aria-label="Filter ${kind}">
    <label>Search<input name="search" type="search" placeholder="${kind === "needs" ? "Skill, organisation or keyword" : "Name, skill or experience"}" autocomplete="off"></label>
    <label>Professional area<select name="area"><option value="">All areas</option>${opts(professionalAreas.map((a) => a.label))}</select></label>
    <label>Country<input name="country" type="search" placeholder="Anywhere" autocomplete="off"></label>
    <label>Working language<input name="language" type="search" placeholder="Any language" autocomplete="off"></label>
    ${kind === "needs" ? `<label>Length<select name="hours"><option value="">Any length</option><option value="short">Up to 8 hours</option><option value="medium">9 to 16 hours</option><option value="long">More than 16 hours</option></select></label>` : `<label>Availability<select name="available"><option value="">Everyone</option><option value="1">Available now</option></select></label>`}
    <div class="actions"><p id="count" class="muted" role="status" aria-live="polite"></p><button class="link-btn" type="reset">Clear filters</button></div>
  </form>`;
}

export async function needs() {
  const real = await openNeeds();
  const rows = real.length ? real : exampleNeeds;
  const html = `<div class="wrap stack" style="--gap:28px;padding-bottom:40px">
    <div class="page-head">${eyebrow("Open needs")}<h1>Where your expertise can help.</h1><p class="lead">Every need is written by an approved, locally led organisation: the output they need, the skills involved and a realistic number of hours.</p></div>
    ${filtersForm("needs")}
    ${real.length ? "" : exampleNotice("There are no open needs yet, so you are seeing examples. Real needs from approved organisations will appear here.")}
    <div class="grid" id="results"></div>
    <div class="card row between" style="background:var(--mint);border-color:#bcd6cd"><div class="stack" style="--gap:6px"><span class="serif" style="font-size:1.8rem">Can’t find the right fit yet?</span><p class="muted">Publish your profile and organisations can invite you to a need that matches your skills.</p></div>${btn(`Create your profile ${icon("arrow", 18)}`, "#join")}</div>
  </div>`;
  return { title: "Open needs", description: "Browse needs published by approved, locally led organisations.", html, after: () => bindFilters(rows, needCard, "need") };
}

function bindFilters(rows, card, noun) {
  const f = $("#filters");
  const draw = () => {
    const data = Object.fromEntries(new FormData(f));
    const found = filterRecords(rows, data);
    $("#count").textContent = `${plural(found.length, noun)}${rows[0]?.example ? " (examples)" : ""}`;
    $("#results").innerHTML = found.length ? found.map(card).join("") : empty("No matches", "Try another area, country or language.", `<button class="btn secondary sm" type="button" data-action="clear-filters">Clear filters</button>`);
  };
  f.addEventListener("input", draw);
  f.addEventListener("reset", () => setTimeout(draw));
  f.addEventListener("submit", (ev) => ev.preventDefault());
  draw();
}

// ---------- Need detail ----------
export async function need(id) {
  const n = id.startsWith("example-") ? exampleNeeds.find((x) => x.id === id) : await result(db.from("needs").select(NEED_SELECT).eq("id", id).maybeSingle()).catch(() => null);
  if (!n) return notFound("This need isn’t available", "It may have been closed, or it may still be a draft.");
  const org = n.organisation || {};
  const isMember = state.memberships.some((m) => m.organisation_id === n.organisation_id);
  const open = n.status === "open" && (!n.deadline || n.deadline >= today());
  let app = null, saved = false;
  if (state.user && !n.example && !isMember) {
    [app, saved] = await Promise.all([
      result(db.from("applications").select("id,status").eq("need_id", id).eq("user_id", state.user.id).maybeSingle()).catch(() => null),
      result(db.from("saved_needs").select("need_id").eq("need_id", id).eq("user_id", state.user.id).maybeSingle()).then(Boolean).catch(() => false),
    ]);
  }
  const deliverables = n.deliverables || n.output.split(/\n|;/).map((s) => s.trim()).filter(Boolean);
  let cta;
  if (n.example) cta = `<p class="small muted">This is an example need, so you can’t apply to it.</p>${btn("See real needs", "#needs", "lg")}`;
  else if (isMember) cta = `${btn("Manage in your workspace", "#org", "lg")}`;
  else if (app) cta = `<p>Your application: ${status(app.status)}</p>${btn("Go to your workspace", "#workspace", "secondary")}`;
  else if (open) cta = `<button class="btn lg" type="button" data-action="apply" data-id="${e(n.id)}">Apply to this need</button>`;
  else cta = `<p class="muted">This need is no longer accepting applications.</p>`;
  const html = `<div class="wrap stack" style="--gap:28px;padding-bottom:60px">
    ${back("All needs", "#needs")}
    ${n.example ? exampleNotice() : ""}
    ${((k) => `<div class="card flush cover-banner" style="background:${COVER_BG[k] || COVER_BG.design}">${cover(k, { fit: "meet" })}</div>`)(coverKind(n.skills, n.title))}
    <div class="split">
      <div class="stack" style="--gap:36px">
        <div class="stack">
          <div class="row">${avatar(org.name || "Organisation", 44)}<strong>${e(org.name || "Organisation")}</strong><span class="muted">${e([org.city, org.country].filter(Boolean).join(", "))}</span>${n.example ? "" : pill("Approved organisation")}</div>
          <h1 style="font-size:clamp(2.2rem,4.4vw,3.8rem)">${e(n.title)}</h1>
          ${n.example ? "" : `<div class="mobile-cta">${cta}</div>`}
        </div>
        <div class="stack"><h2 style="font-size:2rem">The challenge</h2><p class="prose">${e(n.description)}</p></div>
        <div class="stack"><h2 style="font-size:2rem">What you would deliver</h2><ul class="checks">${deliverables.map((d) => `<li>${icon("check", 22, "#0f6f63", 2.2)}${e(d)}</li>`).join("")}</ul></div>
        <div class="grid-2" style="gap:20px"><div class="card stack" style="--gap:10px"><strong>Skills involved</strong>${tags(n.skills)}</div><div class="card stack" style="--gap:10px"><strong>Working languages</strong><p>${e((n.languages || []).join(", "))}. Support in any one of these is welcome.</p></div></div>
        <div class="card row" style="align-items:flex-start;flex-wrap:nowrap">${avatar(org.name || "Organisation", 60)}<div class="stack" style="--gap:6px">${eyebrow("About the organisation")}<span class="serif" style="font-size:1.6rem">${e(org.name || "")}</span><p class="muted">${e(org.summary || "")}</p>${safeLink(org.website, "Organisation website")}</div></div>
      </div>
      <aside class="stack sticky" style="--gap:18px">
        <div class="side-card">
          <div class="row between">${open ? pill("Open for applications") : pill("Closed", "grey")}<span class="small muted">${plural(n.places || 1, "place")}</span></div>
          <div class="stack" style="--gap:12px">
            <span class="row">${icon("clock", 22, "#0f6f63")}<span><strong>${n.hours} hours</strong> estimated</span></span>
            <span class="row">${icon("globe", 22, "#0f6f63")}${e(n.arrangement)}${n.location ? " · " + e(n.location) : ""}</span>
            <span class="row">${icon("calendar", 22, "#0f6f63")}${n.deadline ? "Apply by " + date(n.deadline) : "No fixed deadline"}</span>
            <span class="row">${icon("language", 22, "#0f6f63")}${e((n.languages || []).join(" · "))}</span>
          </div>
          ${cta}
          ${!n.example && !isMember && state.user ? `<button class="btn secondary" type="button" data-action="save-need" data-id="${e(n.id)}">${icon("bookmark", 18)}${saved ? "Saved · remove" : "Save for later"}</button>` : ""}
          <p class="small muted">Unpaid, voluntary contribution. You will sign a contribution agreement with the organisation before any work begins.</p>
        </div>
        <div class="banner">${icon("lock", 22, "#0f6f63")}<p class="small">Never share passwords, card details or access codes. Confidential information is shared only after the agreement is signed.</p></div>
        ${n.example ? "" : `<button class="link-btn" type="button" data-action="report" data-type="need" data-id="${e(n.id)}" style="color:var(--muted);display:inline-flex;gap:8px;align-items:center">${icon("flag", 18)}Report a concern about this need</button>`}
      </aside>
    </div></div>`;
  return { title: n.title, description: n.output, html };
}

// ---------- Talent ----------
export async function talent() {
  const real = await result(db.from("profiles").select("user_id,name,headline,location,country,languages,skills,hours_available,arrangement,bio").eq("published", true).eq("review_status", "approved").order("approved_at", { ascending: false })).catch(() => []);
  const rows = real.length ? real : [exampleProfile];
  const html = `<div class="wrap stack" style="--gap:28px;padding-bottom:40px">
    <div class="page-head">${eyebrow("Talent")}<h1>Find the person behind the skills.</h1><p class="lead">Every profile is approved before it appears. See what people have done, the languages they work in and the time they can realistically give.</p></div>
    ${filtersForm("talent")}
    ${real.length ? "" : exampleNotice("No profiles are public yet, so you are seeing an example. Approved professionals will appear here.")}
    <div class="grid" id="results"></div>
    <div class="card row between band-dark" style="border-color:var(--deep)"><div class="stack" style="--gap:6px"><span class="serif" style="font-size:1.8rem">Are you an organisation?</span><p class="muted">Post a need and invite the people whose work fits. It is free.</p></div>${btn(`Post a need ${icon("arrow", 18)}`, "#organisations", "light")}</div>
  </div>`;
  return { title: "Talent", description: "Approved professionals contributing their skills to locally led organisations.", html, after: () => bindFilters(rows, talentCard, "professional") };
}

// ---------- Profile / impact CV ----------
export async function profile(id) {
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
  const side = (title, inner) => `<div class="card stack" style="--gap:12px">${eyebrow(title)}${inner}</div>`;
  const html = `<div class="wrap stack" style="--gap:32px;padding-bottom:60px">
    ${back("All talent", "#talent")}
    ${ex ? exampleNotice("Example impact CV. Maria, the organisations and the endorsements are illustrative, shown so you can see how a real record will look.") : ""}
    ${owner && !isPublic ? `<div class="banner warn">${icon("eye", 22)}<p>Only you can see this page. ${p.review_status === "pending" ? "Your profile is awaiting approval." : "Publish your profile from your workspace when you are ready."}</p></div>` : ""}
    <section class="profile-head">
      ${avatar(p.name, 150)}
      <div class="stack" style="--gap:12px">${eyebrow("Impact CV")}<h1>${e(p.name)}</h1><p class="lead">${e(p.headline || "")}</p>
        <div class="meta"><span>${icon("map", 19, "#0f6f63")}${e([...new Set([p.location, p.country].filter(Boolean))].join(", ") || "Location not given")}</span><span>${icon("language", 19, "#0f6f63")}${e((p.languages || []).join(" · "))}</span><span>${icon("globe", 19, "#0f6f63")}${e(p.arrangement)}</span><span>${icon("clock", 19, "#0f6f63")}${p.hours_available ? `${p.hours_available} hours a month` : "Not available right now"}</span></div></div>
      <div class="stack actions-col no-print" style="--gap:10px">
        ${canInvite ? `<button class="btn" type="button" data-action="invite" data-id="${e(p.user_id)}">Invite to a need</button>` : owner ? btn("Edit profile", "#workspace/profile") : ""}${state.isAdmin && !ex && isPublic && !owner ? `<button class="btn secondary" type="button" data-action="introduce" data-id="${e(p.user_id)}" data-name="${e(p.name)}">Introduce to a need</button>` : ""}
        <button class="btn secondary" type="button" data-action="copy-link">${icon("link", 18)}Copy profile link</button>
        <button class="btn secondary" type="button" data-action="print">${icon("download", 18)}Save as PDF</button>
      </div>
    </section>
    <section class="stats-dark"><div><strong>${contributions.length}</strong><span>reviewed contributions</span></div><div><strong>${orgs}</strong><span>organisations helped</span></div><div><strong>${hours}</strong><span>reviewed hours</span></div><div><strong>${countries}</strong><span>countries</span></div></section>
    <p class="small muted" style="margin-top:-18px">Only work reviewed by the organisation counts. Ratings stay private to the professional.</p>
    <div class="split left">
      <aside class="stack" style="--gap:18px">
        ${side("About", `<p class="prose" style="font-size:1rem">${e(p.bio || "No introduction yet.")}</p>`)}
        ${p.experience ? side("Experience", `<p class="prose" style="font-size:1rem">${e(p.experience)}</p><span class="small muted">Self-described. Contributions are reviewed by organisations.</span>`) : ""}
        ${side("Skills", tags(p.skills || []))}
        ${p.website ? side("Elsewhere", `${safeLink(p.website, "Professional profile or website")}<span class="small muted">A link the professional added; not an identity check.</span>`) : ""}
        ${side("How this record is built", `<ol style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px"><li>An organisation defines a need</li><li>Both sign a contribution agreement</li><li>Hours are logged and reviewed</li><li>The organisation writes an endorsement</li><li>The professional chooses to publish it</li></ol>`)}
        ${!ex && !owner && state.user ? `<button class="link-btn" type="button" data-action="report" data-type="profile" data-id="${e(p.user_id)}" style="color:var(--muted);display:inline-flex;gap:8px;align-items:center">${icon("flag", 18)}Report this profile</button>` : ""}
      </aside>
      <section class="stack" style="--gap:22px"><h2 style="font-size:2.4rem">Contributions</h2>
        ${contributions.length ? contributions.map((c) => contributionCard(c, { example: ex, owner })).join("") : empty(owner ? "Your first contribution will appear here" : "No published contributions yet", owner ? "When an organisation completes and endorses your work, you can publish it here." : "Contributions appear once an organisation has reviewed the work and the professional publishes it.", owner ? btn("Find a need", "#needs", "secondary sm") : "")}
      </section>
    </div></div>`;
  return { title: `${p.name} · impact CV`, description: p.headline || "Impact CV on Impact Accelerator", html };
}

// ---------- How it works ----------
export async function how() {
  const stages = [
    ["home", "Join", ["Create your organisation account", "We check you are locally led and registered, or fiscally hosted."], ["Create your profile", "Experience, skills, working languages and realistic monthly hours. Approved before it is public; 18+."]],
    ["doc", "Need", ["Publish a need", "The challenge, the output, skills, languages and hours. Up to three open at a time."], ["Apply with a plan", "Say how you would approach the output and when you can do it."]],
    ["people", "Match", ["Choose who to work with", "Review applications, message candidates or invite approved professionals."], ["Hear back or get invited", "Accept an invitation, or wait for the organisation’s decision."]],
    ["pen", "Agree", null, null, ["Both sign the agreement", "Scope, hours, access and confidentiality, built from the need. Nothing confidential is shared before both signatures."]],
    ["check", "Deliver", ["Review and complete", "Approve logged hours, write an endorsement and mark the work complete."], ["Do the work, log your hours", "Then choose which reviewed contributions appear on your impact CV."]],
  ];
  const facts = [["gift", "Free", "for organisations and professionals"], ["clock", "6–16 hours", "is a typical contribution"], ["pen", "Signed first", "before any work or access"], ["shield", "Reviewed", "every organisation and profile"]];
  const cell = (who, [t, d]) => `<div class="j-cell ${who}"><strong>${t}</strong><p>${d}</p></div>`;
  const journey = `<div class="journey" role="list">
      <div class="j-lane-label org" aria-hidden="true">Organisation</div><div class="j-lane-label pro" aria-hidden="true">Professional</div>
      ${stages.map(([ic, name, org, pro, both], i) => `<div class="j-stage" role="listitem" style="--col:${i + 2}"><div class="j-head"><span class="j-num">${i + 1}</span>${icon(ic, 20, "#0f6f63")}<span>${name}</span></div>${both ? `<div class="j-cell both"><span class="j-who">Together</span><strong>${both[0]}</strong><p>${both[1]}</p></div>` : `${cell("org", org).replace("<strong>", `<span class="j-who">Organisation</span><strong>`)}${cell("pro", pro).replace("<strong>", `<span class="j-who">Professional</span><strong>`)}`}</div>`).join("")}
    </div>`;
  const vis = [["Your profile (after approval)", "Anyone, including search engines", "You: unpublish or delete at any time"], ["Open needs and organisation summary", "Anyone", "The organisation"], ["Applications and messages", "You and the organisation", "Both of you; either can end a conversation"], ["Contribution agreement", "You and the organisation", "Signatures are final"], ["Private rating", "Only the professional who was rated", "Nobody can change it"], ["Endorsements on an impact CV", "Anyone, once the professional publishes them", "The professional"]];
  const html = `<div class="wrap how stack" style="--gap:clamp(40px,5vw,64px);padding-bottom:64px">
    <div class="how-hero">
      <div class="stack" style="--gap:16px">${eyebrow("How it works")}<h1>Professional support, with clear expectations.</h1><p class="lead">Short, well-scoped contributions, agreed in writing and reviewed by the organisation. Here is exactly what happens, and what stays private.</p><div class="row" style="--gap:12px">${btn("Post a need", "#join?role=organisation")}${btn("Find a need", "#needs", "secondary")}</div></div>
      <div class="how-facts">${facts.map(([ic, t, d]) => `<div class="how-fact"><span class="icon-tile">${icon(ic, 22, "#0f6f63")}</span><div><strong>${t}</strong><span>${d}</span></div></div>`).join("")}</div>
    </div>
    <section class="stack" style="--gap:20px"><div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Five steps, side by side")}<h2>What each of you does.</h2></div><p class="muted" style="max-width:420px">Organisations and professionals follow the same five steps. The agreement is the moment you meet.</p></div>${journey}</section>
    <section class="how-agree">
      <div class="stack" style="--gap:14px">${eyebrow("The contribution agreement")}<h2>Nothing starts until both sides sign.</h2><p class="lead">Every match gets its own agreement, built from the need itself. Hours can only be logged once both signatures are in.</p><a href="#safety" style="font-weight:700">How we work responsibly →</a></div>
      <ul class="how-checks">${["The agreed output, hours and working languages", "Timing, contact person and review steps", "Confidentiality, minimum access and data handling", "Who owns the work and what can be shown publicly", "What is out of scope, and how to end safely"].map((t) => `<li>${icon("check", 20, "#0f6f63", 2.2)}<span>${t}</span></li>`).join("")}</ul>
    </section>
    <section class="stack" style="--gap:18px"><div class="row between" style="align-items:flex-end"><div class="stack" style="--gap:8px">${eyebrow("Privacy")}<h2>You choose what becomes public.</h2></div><a href="#privacy" style="font-weight:700">Read the privacy notice →</a></div><div class="table-scroll"><table class="data stack-sm"><thead><tr><th scope="col">Information</th><th scope="col">Who can see it</th><th scope="col">Who controls it</th></tr></thead><tbody>${vis.map((r) => `<tr><td><strong>${r[0]}</strong></td><td data-label="Who can see it">${r[1]}</td><td class="muted" data-label="Who controls it">${r[2]}</td></tr>`).join("")}</tbody></table></div></section>
    <section class="how-concern"><span class="icon-tile lg" style="background:var(--ochre-bg)">${icon("flag", 28, "#7a4f0e")}</span><div class="stack" style="--gap:4px"><strong class="serif" style="font-size:1.6rem;font-weight:500">Raise a concern</strong><p class="muted">Use Report a concern on any profile, need or conversation, or write to ${e(config.safeguardingEmail)}. If someone is in immediate danger, contact local emergency services first.</p></div>${btn("Working responsibly", "#safety", "dark")}</section>
  </div>`;
  return { title: "How it works", description: "Short, well-scoped contributions, agreed in writing and reviewed by the organisation.", html };
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
