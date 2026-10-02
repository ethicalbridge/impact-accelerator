import { db, state, result, e, openDialog, closeDialog, toast, go, withForm, invalidMessage, val, loadSession, homeFor } from "../core.js";
import { icon, mark, eyebrow, field, select, check, formEnd, btn, back, languagePicker, skillPicker, avatarFor, countrySelect, entryEditor, readEntries, dropdown, TIMEZONES, setEntryLogoUpload } from "../ui.js";

const HOURS_MONTH = [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 20, 30, 40].map((h) => [String(h), `${h} hours a month`]);
import { list, languages, safeURL } from "../utils.js";
import { config } from "../config.js";
import { PRO_AGREEMENT, PRO_AGREEMENT_VERSION, proAgreementText, ORG_AGREEMENT, ORG_AGREEMENT_VERSION, orgAgreementText, agreementHtml } from "../agreement.js";

const EB_URL = /^https:\/\/(www\.)?ethicalbridge\.org\/\S+$/i;
const ORG_TYPES = ["Community organisation", "Local NGO", "Cooperative", "Social enterprise", "Collective or informal group (fiscally hosted)", "Other"];
const shell = (title, lead, form) => `<div class="grid-2" style="gap:0;min-height:calc(100vh - 77px)">
  <div class="band-dark stack" style="--gap:28px;padding:clamp(32px,5vw,72px);justify-content:center">
    <h1 style="font-size:clamp(2.4rem,4.4vw,4rem)">${title}</h1><p class="lead">${lead}</p>
    <ul class="checks">${["Free for organisations and professionals", "Your profile stays private until approved", "A signed agreement before any work", "Delete your account whenever you want"].map((t) => `<li>${icon("check", 22, "#a9c9bf", 2.2)}${t}</li>`).join("")}</ul>
    <span class="small" style="color:var(--on-deep-quiet)">An initiative of Ethical Bridge</span>
  </div>
  <div style="padding:clamp(32px,5vw,72px);display:flex;align-items:center"><div style="width:100%;max-width:560px">${form}</div></div></div>`;

// Join and sign in, split by who you are: an organisation with needs, or a professional with skills.
const SIDES = {
  organisation: { join: ["Bring your needs.", "Publish the specific help your team needs and work with skilled professionals, free. We review every organisation before its needs go public."], signin: ["Welcome back.", "Your organisation workspace: needs, applications, agreements and hours to review."], points: ["Free, always", "Approved before your needs go public", "Up to three open needs at a time", "A signed agreement before any access"] },
  professional: { join: ["Bring your skills.", "Give a few focused hours to the needs local organisations define, and build an impact CV from reviewed work."], signin: ["Welcome back.", "Your workspace: applications, agreements, hours and your impact CV."], points: ["Free, always", "Your profile stays private until approved", "Short, well-scoped contributions", "Endorsements in the organisation’s own words"] },
};
const roleTabs = (r, label) => `<div class="role-tabs" role="radiogroup" aria-label="${label}">
  <label class="role-card"><input type="radio" name="role" value="organisation" ${r === "organisation" ? "checked" : ""} required><span class="icon-tile">${icon("home", 22, "#0f6f63")}</span><span><strong>An organisation</strong><span class="small muted">with needs</span></span></label>
  <label class="role-card"><input type="radio" name="role" value="professional" ${r === "professional" ? "checked" : ""}><span class="icon-tile">${icon("user", 22, "#0f6f63")}</span><span><strong>A professional</strong><span class="small muted">with skills to give</span></span></label>
</div>`;
const authShell = (mode, r, form) => `<div class="auth grid-2" data-role="${r}" style="gap:0;min-height:calc(100vh - 77px)">
  <div class="band-dark auth-side" style="padding:clamp(32px,5vw,72px)">
    ${["organisation", "professional"].map((k) => `<div class="stack only-${k}" style="--gap:28px"><span class="eyebrow">${k === "organisation" ? "For organisations" : "For professionals"}</span><h1 style="font-size:clamp(2.4rem,4.4vw,4rem)">${SIDES[k][mode][0]}</h1><p class="lead">${SIDES[k][mode][1]}</p><ul class="checks">${SIDES[k].points.map((t) => `<li>${icon("check", 22, "#a9c9bf", 2.2)}${t}</li>`).join("")}</ul></div>`).join("")}
    <div class="stack only-none" style="--gap:28px"><span class="eyebrow">${mode === "join" ? "Join Handova" : "Sign in"}</span><h1 style="font-size:clamp(2.4rem,4.4vw,4rem)">${mode === "join" ? "Who are you joining as?" : "Welcome back."}</h1><p class="lead">${mode === "join" ? "Organisations bring needs. Professionals bring skills. Choose yours and we will only ask what matters to you." : "Choose whether you are signing in for an organisation or as a professional."}</p></div>
    <span class="small" style="color:var(--on-deep-quiet)">An initiative of Ethical Bridge</span>
  </div>
  <div style="padding:clamp(32px,5vw,72px);display:flex;align-items:center"><div style="width:100%;max-width:580px">${form}</div></div></div>`;
// Keep the left panel and the visible fields in step with the chosen role; hidden fields are disabled so they are not required or sent.
const bindRole = () => {
  const box = document.querySelector(".auth"); if (!box) return;
  const apply = () => {
    const r = box.querySelector('input[name="role"]:checked')?.value || "none";
    box.dataset.role = r;
    box.querySelectorAll("fieldset[data-for]").forEach((f) => { f.disabled = !(f.dataset.for === r || (f.dataset.for === "any" && r !== "none")); });
    const next = box.querySelector("form[data-form=signin]"); if (next && r !== "none") next.dataset.role = r;
  };
  box.addEventListener("change", (ev) => { if (ev.target.name === "role") apply(); });
  apply();
};

export async function join(params) {
  if (state.user) return { redirect: homeFor() };
  const r = params.get("role") === "organisation" ? "organisation" : params.get("role") === "professional" ? "professional" : "";
  const form = `<form class="form" data-form="signup" novalidate>
    <div class="row between"><h2 style="font-size:2.3rem">Create your account</h2><a href="#signin" style="font-weight:600">I already have one</a></div>
    <fieldset><legend>I am joining as</legend>${roleTabs(r, "I am joining as")}</fieldset>
    <fieldset data-for="organisation" class="only-organisation"><legend class="visually-hidden">Your organisation</legend><div class="form-grid">
      ${field("org_name", "Organisation name", { required: true, full: true, attrs: 'maxlength="160" autocomplete="organization"' })}
      ${countrySelect("org_country", "Country where you work", "", { required: true })}
      ${field("org_role", "Your role in the organisation", { attrs: 'maxlength="120" placeholder="e.g. Director, Programme lead"' })}
      ${field("contact_name", "Your full name", { required: true, attrs: 'autocomplete="name" maxlength="120"' })}
      ${field("eb_url", "Your Ethical Bridge directory page", { type: "url", required: true, full: true, attrs: 'maxlength="300" placeholder="https://ethicalbridge.org/organisations/…"', hint: `Handova is extra support for organisations in the Ethical Bridge directory. Not listed yet? <a href="https://ethicalbridge.org/organisation-register.html" target="_blank" rel="noopener">Join the directory first</a>, it is free.` })}
    </div>
    <label class="check" style="margin-top:14px"><input type="checkbox" name="locally_led" required><span>We are a locally led organisation (led by people based where we work), registered or fiscally hosted.</span></label></fieldset>
    <fieldset data-for="professional" class="only-professional"><legend class="visually-hidden">About you</legend><div class="form-grid">
      ${field("name", "Full name", { required: true, attrs: 'autocomplete="name" maxlength="120" placeholder="First and last name"' })}
      ${field("headline", "Your professional title", { attrs: 'maxlength="160" placeholder="e.g. Finance consultant, UX researcher"', hint: "Optional. You can change it later." })}
    </div></fieldset>
    <fieldset data-for="any" class="only-any"><legend class="visually-hidden">Sign-in details</legend>
      <div class="form-grid">${field("email", "Email address", { type: "email", required: true, attrs: 'autocomplete="email" maxlength="254"' })}${field("password", "Password", { type: "password", required: true, attrs: 'autocomplete="new-password" minlength="12" maxlength="128"', hint: "At least 12 characters." })}</div>
      <div class="checkbox-box" style="margin-top:18px">
        ${check("adult", "I am 18 or older.", false, true)}
        ${check("terms", `I agree to the <a href="#terms" target="_blank">Terms of use</a> and have read the <a href="#privacy" target="_blank">Privacy notice</a>.`, false, true)}
      </div>
      <div style="margin-top:18px">${formEnd("Create account")}</div>
      <p class="small muted" style="margin-top:12px"><span class="only-organisation">Next, we will email you a confirmation link. Then you complete your organisation details, and we review them before your needs go public.</span><span class="only-professional">Next, we will email you a confirmation link. Then you complete your profile, and we review it before it is public.</span></p>
    </fieldset>
  </form>`;
  return { title: "Join", description: "Create a free Handova account as an organisation or a professional.", html: authShell("join", r, form), after: bindRole };
}

export async function signin(params) {
  if (state.user) return { redirect: params.get("next") || homeFor() };
  const r = params.get("role") === "organisation" ? "organisation" : params.get("role") === "professional" ? "professional" : "";
  const form = `<form class="form" data-form="signin" data-next="${e(params.get("next") || "")}">
    <div class="row between"><h2 style="font-size:2.3rem">Sign in</h2><a href="#join" style="font-weight:600">Create an account</a></div>
    <fieldset><legend>I am signing in as</legend>${roleTabs(r, "I am signing in as")}</fieldset>
    <fieldset data-for="any" class="only-any"><legend class="visually-hidden">Sign-in details</legend><div class="stack" style="--gap:18px">
      ${field("email", "Email address", { type: "email", required: true, attrs: 'autocomplete="email"' })}
      ${field("password", "Password", { type: "password", required: true, attrs: 'autocomplete="current-password"' })}
      ${formEnd("Sign in", `<a href="#reset" style="font-weight:600;min-height:44px;display:inline-flex;align-items:center">Forgot your password?</a>`)}
    </div></fieldset>
  </form>`;
  return { title: "Sign in", html: authShell("signin", r, form), after: bindRole };
}

export async function reset() {
  const form = `<form class="form" data-form="reset">
    <h2 style="font-size:2.3rem">Reset your password</h2><p class="muted">We will email you a link to choose a new password.</p>
    ${field("email", "Email address", { type: "email", required: true, attrs: 'autocomplete="email" autofocus' })}
    ${formEnd("Send reset link", `<a href="#signin" style="font-weight:600;min-height:44px;display:inline-flex;align-items:center">Back to sign in</a>`)}
  </form>`;
  return { title: "Reset your password", html: shell("Forgotten your password?", "It happens. We will send a secure link to the email address on your account.", form) };
}

export function newPasswordDialog() {
  openDialog("Choose a new password", `<form class="form" data-form="new-password">${field("password", "New password", { type: "password", required: true, attrs: 'autocomplete="new-password" minlength="12" maxlength="128" autofocus', hint: "At least 12 characters." })}${formEnd("Save new password")}</form>`);
}

// ---------- onboarding ----------
export async function onboarding() {
  if (!state.user) return { redirect: "#join" };
  const r = state.user.user_metadata?.role;
  if (state.memberships.length && (r === "organisation" || !r)) return { redirect: "#org" };
  if (state.profile && r !== "organisation") return { redirect: "#workspace" };
  const name = state.user.user_metadata?.full_name || "";
  const adminNote = state.isAdmin ? `<div class="banner">${icon("shield", 22, "#0f6f63")}<p><strong>You are an administrator.</strong> You don’t need a profile to run Handova. <a href="#admin">Go to Admin</a></p></div>` : "";
  if (r === "organisation") {
    return { title: "Set up your organisation", html: `<div class="wrap" style="max-width:820px;padding-block:56px 80px"><div class="stack" style="--gap:24px">${eyebrow("Step 2 of 2")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">Tell us about your organisation.</h1><p class="lead">We review every organisation before its needs go public, usually within two working days.</p>${orgForm({ name: state.user.user_metadata?.org_name || "", country: state.user.user_metadata?.org_country || "", ethical_bridge_url: state.user.user_metadata?.ethical_bridge_url || "" }, name)}<p class="small muted">Joining as a professional instead? <button class="link-btn" type="button" data-action="switch-role" data-id="professional">Create a professional profile</button></p></div></div>` };
  }
  return { title: "Create your profile", html: `<div class="wrap" style="max-width:820px;padding-block:56px 80px"><div class="stack" style="--gap:24px">${adminNote}${eyebrow("Step 2 of 2")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">Create your professional profile.</h1><p class="lead">Describe what you can offer. Your profile stays private until you publish it and we approve it.</p>${profileForm({ name, headline: state.user.user_metadata?.headline || "" })}<p class="small muted">Here for an organisation? <button class="link-btn" type="button" data-action="switch-role" data-id="organisation">Set up an organisation</button></p></div></div>` };
}

export function orgForm(o = {}, fullName = "") {
  const edit = !!o.id;
  return `<form class="form card" data-form="${edit ? "org-edit" : "org-create"}" data-id="${e(o.id || "")}"><div class="form-grid">
    ${field("name", "Organisation name", { value: o.name, required: true, attrs: 'maxlength="160"', full: true })}
    ${countrySelect("country", "Country", o.country || "", { required: true })}
    ${field("city", "City or region", { value: o.city, attrs: 'maxlength="120"' })}
    ${select("org_type", "Type of organisation", ORG_TYPES, o.org_type || ORG_TYPES[0])}
    ${field("website", "Website or social page", { value: o.website, type: "url", attrs: 'maxlength="300" placeholder="https://"' })}
    ${field("ethical_bridge_url", "Ethical Bridge directory page", { value: o.ethical_bridge_url, type: "url", required: true, full: true, attrs: 'maxlength="300" placeholder="https://ethicalbridge.org/organisations/…"', hint: `Handova supports organisations listed in the Ethical Bridge directory. Not listed yet? <a href="${"https://ethicalbridge.org/organisation-register.html"}" target="_blank" rel="noopener">Join the directory</a>, it is free.` })}
    ${field("summary", "What your organisation does", { value: o.summary, type: "textarea", required: true, full: true, attrs: 'maxlength="600" minlength="20"', hint: "Two or three sentences. This appears on your needs." })}
    ${edit ? "" : field("full_name", "Your name", { value: fullName, required: true, attrs: 'maxlength="120" autocomplete="name"' })}
    ${edit ? "" : `<div class="full form-sec"><h2>Organisation agreement</h2><p class="muted small">Please read it in full. It covers safeguarding, data, how you work with professionals and what you can expect from us.</p></div>
    <div class="full agreement">${agreementBody(ORG_AGREEMENT, "Handova organisation agreement")}
      <div class="checkbox-box">${check("locally_led", "We are a locally led organisation: our leadership is based where we work, and we are registered or fiscally hosted by a registered organisation.", false, true)}${check("authorised", "I am authorised to represent this organisation and to sign this agreement on its behalf.", false, true)}${check("org_declare", "Our organisation, its leaders and partners are not on any sanctions list and are not involved in the activities listed in section 1.", false, true)}${check("org_agree", "On behalf of the organisation, I have read and agree to the Handova organisation agreement, including its safeguarding and reporting duties.", false, true)}</div>
      <div class="form-grid">${field("sign_role", "Your role in the organisation", { required: true, attrs: 'maxlength="120" placeholder="e.g. Director"' })}${field("sign_name", "Type your full name to sign", { required: true, attrs: 'maxlength="160" autocomplete="name"', hint: "Your electronic signature. We store it with your role, the date and time and the exact text agreed to." })}</div>
    </div>`}
  </div>${formEnd(edit ? "Save changes" : "Submit for review")}</form>`;
}

// The edit page is laid out like the public profile: the header first, then About and Skills on the left,
// Experience and Education on the right, then links and the agreement.
export function profileForm(p = {}) {
  const edit = !!p.user_id;
  const head = (title, sub = "") => `<div class="pf-cardhead">${eyebrow(title)}${sub ? `<p class="muted small" style="margin:0">${sub}</p>` : ""}</div>`;
  // Older profiles wrote experience as free text; keep showing it until the person moves it into entries.
  const oldXp = !(p.experience_items || []).length && p.experience ? `<div class="notice" role="note"><span>Your earlier experience text: “${e(p.experience.slice(0, 600))}${p.experience.length > 600 ? "…" : ""}”. Add it as roles below; this text is no longer shown once you add a role.</span></div>` : "";
  return `<form class="form pf" data-form="profile" data-edit="${edit ? 1 : 0}">
    ${p.closed_reason === "inactive" && !p.published ? `<div class="banner warn" role="note">${icon("eye", 22)}<p>Your profile was closed because there was no activity for six months. Check your details, then publish it again: we will review it and it goes back online.</p></div>` : ""}
    ${p.inactive_since && p.published ? `<div class="banner warn" role="note">${icon("clock", 22)}<p>Your profile has been marked inactive since ${new Date(p.inactive_since).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}. <a href="#needs">Apply to a need</a> or accept an invitation to become active again. Without activity, it closes three months after that date.</p></div>` : ""}
    ${edit ? identityCard(p) : ""}

    <section class="card pf-head">
      <div class="photo-field pf-photo" data-photo-field>
        <span class="photo-preview">${avatarFor({ name: p.name || "You", photo_url: p.photo_url || p.photo }, 150)}</span>
        <div class="row" style="--gap:8px;justify-content:center"><label class="btn secondary sm photo-pick">${icon("plus", 16)}<span>${p.photo_url ? "Change photo" : "Upload a photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" class="visually-hidden photo-file"></label><button type="button" class="link-btn photo-remove" ${p.photo_url ? "" : "hidden"}>Remove</button></div>
        <span class="small photo-status" role="status"></span>
        <input type="hidden" name="photo_url" value="${e(p.photo_url || "")}">
      </div>
      <div class="stack pf-main" style="--gap:14px">
        ${eyebrow("Impact CV")}
        ${field("name", "Full name", { value: p.name, required: true, attrs: 'maxlength="120" autocomplete="name" class="pf-name"' })}
        ${field("headline", "Title", { value: p.headline, required: true, attrs: 'maxlength="160" placeholder="e.g. Lawyer · strategist · organisation builder"', hint: "One line under your name." })}
        <div class="pf-meta">
          ${countrySelect("country", "Country", p.country || "", { required: true })}
          ${dropdown("location", "Time zone", TIMEZONES, p.location || "", { required: true, empty: "Choose a time zone" })}
          ${dropdown("hours_available", "Hours you commit each month", HOURS_MONTH, String(Math.max(Number(p.hours_available) || 4, 4)), { required: true, empty: "", hint: "At least 4. Organisations plan around it." })}
        </div>
        ${languagePicker("languages", "Languages you can work in", p.languages || [], { hint: "Pick all that apply. Add local or sign languages with “Another language”." })}
        <p class="small muted" style="margin:0">${icon("globe", 16, "#0f6f63")} All contributions on Handova are remote.</p>
      </div>
    </section>

    <div class="split left pf-cols">
      <aside class="stack" style="--gap:18px">
        <div class="card stack" style="--gap:12px">${head("About", "What you do and how you like to help.")}${field("bio", "Introduction", { value: p.bio, type: "textarea", required: true, attrs: 'maxlength="4000" minlength="30" rows="8"', hint: "Don’t include personal contact details." })}</div>
        <div class="card stack" style="--gap:12px">${head("Skills", "Grouped by professional area. Organisations find you by these.")}${skillPicker("skills", "Skills you can offer", p.skills || [], {})}</div>
        <div class="card stack" style="--gap:12px">${head("Links")}${field("linkedin", "LinkedIn profile", { value: p.linkedin, type: "url", required: true, attrs: 'maxlength="300" placeholder="https://www.linkedin.com/in/your-name"', hint: "Required. We check it before approving you; organisations see a “View on LinkedIn” button." })}${field("website", "Other professional website", { value: p.website, type: "url", attrs: 'maxlength="300" placeholder="https://"', hint: "Optional, for example a portfolio." })}</div>
      </aside>
      <section class="stack" style="--gap:18px">
        <div class="card stack" style="--gap:12px">${head("Experience", "Required. One box per role, most recent first. Use Move up or down to reorder.")}${oldXp}${entryEditor("experience", "Roles", p.experience_items || [])}</div>
        <div class="card stack" style="--gap:12px">${head("Education", "Required. One box per qualification.")}${entryEditor("education", "Qualifications", p.education_items || [])}</div>
      </section>
    </div>

    <section class="card stack" style="--gap:14px">
      ${head("Agreement", "Handova only works if organisations can count on the people they find here.")}
      ${agreementBlock()}
      <div class="checkbox-box">${check("published", "<strong>Publish my profile.</strong> Once approved, anyone can see it, including search engines. You can unpublish at any time.", p.published)}</div>
      ${formEnd(edit ? "Save profile" : "Create profile")}
    </section>
  </form>`;
}

// Identity check (Didit): passport or ID card plus a live selfie. Handova only receives the result and the name on the document.
export function identityCard(p) {
  const st = p.id_status || "";
  const text = {
    "": ["Verify your identity", `Organisations trust verified profiles. It takes about three minutes: a photo of your passport or ID card and a short selfie, on our provider Didit’s secure page. Handova only receives the result and the name on your document, never the images.${state.idRequired ? " <strong>Required before you sign your first contribution agreement.</strong>" : ""}`],
    started: ["Finish your identity check", "You started a check but it isn’t finished yet. Continue where you left off, or start again."],
    in_review: ["Your identity check is being reviewed", "This usually takes less than a day. We will notify you."],
    name_mismatch: ["We are checking your identity", "The name on your document is different from your profile name. An administrator will review it shortly."],
    declined: ["Your identity check did not go through", "Please try again with a clear photo of a valid passport or ID card, in good light."],
    approved: ["Identity verified", `Verified${p.id_verified_at ? " on " + new Date(p.id_verified_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : ""}. Your profile shows “ID verified”.`],
  }[st] || ["Verify your identity", ""];
  const canStart = ["", "started", "declined"].includes(st);
  if (st === "approved") return `<div class="full id-card ok"><span class="icon-tile">${icon("check", 22, "#0f6f63")}</span><div class="stack" style="--gap:6px"><strong>${text[0]}</strong><p class="small muted" style="margin:0">${text[1]}</p></div></div>`;
  return `<div class="full id-card hero ${canStart ? "" : "wait"}"><span class="id-icon">${icon(canStart ? "lock" : "clock", 30, "currentColor")}</span><div class="stack" style="--gap:8px"><span class="id-step">${canStart ? "Next step" : "In progress"}</span><strong>${text[0]}</strong><p>${text[1]}</p>${canStart ? `<div><button type="button" class="btn id-btn" data-action="verify-id">${st === "started" ? "Continue identity check" : st === "declined" ? "Try again" : "Verify my identity"} ${icon("arrow", 18)}</button></div>` : ""}</div></div>`;
}
export function idNudgeDialog() {
  openDialog("Verify your identity", `<div class="stack" style="--gap:14px"><p class="lead" style="font-size:1.15rem">Organisations trust verified professionals. It takes about three minutes: a photo of your passport or ID card and a short selfie.</p><p class="small muted">Handled by our provider Didit. Handova only receives the result and the name on your document, never the images.${state.idRequired ? " <strong>Required before you sign your first contribution agreement.</strong>" : ""}</p><div class="row"><button type="button" class="btn" data-action="verify-id">${icon("lock", 18)}Verify my identity now</button><button type="button" class="btn secondary" data-action="close">Later</button></div></div>`);
}
export async function startIdCheck(el) {
  el?.setAttribute("disabled", "");
  try {
    const { data, error } = await db.functions.invoke("id-verify", { body: { action: "start" } });
    if (error) { let msg = error.message; try { msg = (await error.context.json()).error || msg; } catch {} throw Error(msg); }
    if (data?.url) location.href = data.url; else throw Error(data?.error || "The identity check could not start.");
  } catch (err) { toast(err.message || "The identity check could not start. Please try again."); el?.removeAttribute("disabled"); }
}
export async function verifyDone() {
  if (!state.user) return { redirect: "#signin?next=%23verify-done" };
  let st = "";
  try { const { data } = await db.functions.invoke("id-verify", { body: { action: "check" } }); st = data?.status || ""; } catch {}
  await loadSession();
  const msg = {
    approved: ["Your identity is verified", "Thank you. Your profile now shows “ID verified”."],
    in_review: ["Thank you, your check is being reviewed", "This usually takes less than a day. We will notify you."],
    name_mismatch: ["Thank you, we are reviewing it", "The name on your document is different from your profile name, so an administrator will confirm it shortly."],
    declined: ["The check did not go through", "Please try again with a clear photo of a valid passport or ID card, in good light."],
  }[st] || ["Thank you", "We are processing your check. You will get a notification as soon as it is done."];
  return { title: "Identity check", html: `<div class="wrap" style="max-width:720px;padding-block:72px 96px"><div class="card stack" style="--gap:16px"><span class="icon-tile lg">${icon(st === "approved" ? "check" : "clock", 28, "#0f6f63")}</span><h1 style="font-size:clamp(2rem,4vw,2.8rem)">${msg[0]}</h1><p class="lead">${msg[1]}</p><div class="row">${btn("Back to my profile", "#workspace/profile")}${btn("Find a need", "#needs", "secondary")}</div></div></div>` };
}

// The professional agreement: read in full, then signed by typing your name. Shown signed once the current version is signed.
const signedCurrent = () => state.proAgreement?.version === PRO_AGREEMENT_VERSION;
const agreementBody = (sections = PRO_AGREEMENT, label = "Handova professional agreement") => `<div class="agreement-text" tabindex="0" aria-label="${label}">${agreementHtml(sections, e)}</div>`;
function agreementBlock() {
  if (signedCurrent()) {
    const a = state.proAgreement;
    return `<div class="full agreement signed"><p>${icon("check", 20, "#0f6f63", 2.4)}<span>You signed the Handova professional agreement as <strong>${e(a.full_name)}</strong> on ${new Date(a.signed_at).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.</span></p><details><summary>Read the agreement again</summary>${agreementBody()}</details></div>`;
  }
  return `<div class="full agreement">
    ${state.proAgreement ? `<p class="notice" role="note">We updated the agreement. Please read it and sign again.</p>` : ""}
    <p class="muted">Please read the whole agreement. It includes your monthly commitment and the three-month activity rule.</p>
    ${agreementBody()}
    <div class="checkbox-box">
      ${check("age_confirmed", "I am 18 or older.", false, true)}
      ${check("unpaid_confirmed", "I understand contributions are unpaid, voluntary and remote.", false, true)}
      ${check("declare_conduct", "I confirm the declaration in section 1: I have never been dismissed or convicted for sexual exploitation, abuse or harassment or for an offence against a child or adult at risk, and I am not barred or sanctioned.", false, true)}
      ${check("agree_rules", "I have read and agree to the Handova professional agreement, including my monthly commitment, and that my profile is marked inactive after three months without activity and closed after six.", false, true)}
    </div>
    ${field("sign_name", "Type your full name to sign", { required: true, attrs: 'maxlength="160" autocomplete="name"', hint: "This is your electronic signature. We store it with the date, time and the exact text you agreed to." })}
  </div>`;
}

// Profile photo: cropped to a 480px square and re-encoded as JPEG in the browser (this also drops
// EXIF data such as GPS location), then uploaded to the person's own folder in the avatars bucket.
async function squareJpeg(file, size = 480) {
  const bmp = await createImageBitmap(file).catch(() => { throw Error("That file could not be read as an image."); });
  const s = Math.min(bmp.width, bmp.height), c = document.createElement("canvas");
  c.width = c.height = Math.min(size, s);
  c.getContext("2d").drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, c.width, c.height);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(Error("Could not prepare the photo."))), "image/jpeg", 0.86));
}
const ownAvatarPath = (url) => { const m = String(url || "").match(/\/object\/public\/avatars\/(.+)$/); return m && m[1].startsWith(state.user?.id + "/") ? decodeURIComponent(m[1]) : null; };
// Organisation logos: fitted inside a 200px square, kept as PNG so transparent backgrounds stay transparent.
async function fittedPng(file, size = 200) {
  const bmp = await createImageBitmap(file).catch(() => { throw Error("That file could not be read as an image."); });
  const k = Math.min(size / bmp.width, size / bmp.height, 1), w = Math.round(bmp.width * k), h = Math.round(bmp.height * k);
  const c = document.createElement("canvas"); c.width = c.height = Math.max(w, h);
  c.getContext("2d").drawImage(bmp, (c.width - w) / 2, (c.height - h) / 2, w, h);
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(Error("Could not prepare the logo."))), "image/png"));
}
setEntryLogoUpload(async (file) => {
  if (!state.user) throw Error("Sign in to add a logo.");
  if (file.size > 10 * 1024 * 1024) throw Error("That image is over 10 MB. Try a smaller one.");
  const blob = await fittedPng(file), path = `${state.user.id}/logos/${Date.now()}.png`;
  const up = await db.storage.from("avatars").upload(path, blob, { contentType: "image/png", cacheControl: "31536000" });
  if (up.error) throw up.error;
  return db.storage.from("avatars").getPublicUrl(path).data.publicUrl;
});
let photoBound = false;
export function bindPhotoFields() {
  if (photoBound) return; photoBound = true;
  const set = (box, url, msg) => {
    box.querySelector('input[name="photo_url"]').value = url;
    const name = box.closest("form")?.querySelector('[name="name"]')?.value || "You";
    box.querySelector(".photo-preview").innerHTML = avatarFor({ name, photo_url: url }, 96);
    box.querySelector(".photo-remove").hidden = !url;
    box.querySelector(".photo-pick span").textContent = url ? "Change photo" : "Upload a photo";
    box.querySelector(".photo-status").textContent = msg;
  };
  document.addEventListener("change", async (ev) => {
    if (!ev.target.matches(".photo-file")) return;
    const box = ev.target.closest("[data-photo-field]"), file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file || !state.user) return;
    const status = box.querySelector(".photo-status");
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { status.textContent = "Use a JPG, PNG or WebP image."; return; }
    if (file.size > 15 * 1024 * 1024) { status.textContent = "That image is over 15 MB. Try a smaller one."; return; }
    status.textContent = "Uploading…";
    try {
      const blob = await squareJpeg(file);
      const path = `${state.user.id}/${Date.now()}.jpg`;
      const up = await db.storage.from("avatars").upload(path, blob, { contentType: "image/jpeg", cacheControl: "31536000" });
      if (up.error) throw up.error;
      const { data } = db.storage.from("avatars").getPublicUrl(path);
      set(box, data.publicUrl, "Photo ready. Save your profile to keep it.");
    } catch (err) { status.textContent = err.message || "The photo could not be uploaded. Try again."; }
  });
  document.addEventListener("click", (ev) => {
    const rm = ev.target.closest(".photo-remove");
    if (rm) set(rm.closest("[data-photo-field]"), "", "Photo removed. Save your profile to confirm.");
  });
}

// ---------- account settings ----------
export async function account() {
  if (!state.user) return { redirect: "#signin?next=%23account" };
  const pref = await result(db.from("user_settings").select("email_notifications").eq("user_id", state.user.id).maybeSingle()).catch(() => null);
  const emailOn = pref ? pref.email_notifications !== false : true;
  const html = `<div class="wrap" style="max-width:820px;padding-block:48px 80px"><div class="stack" style="--gap:28px">
    ${eyebrow("Account and privacy")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">Your account</h1>
    <div class="card stack"><h2 style="font-size:1.6rem">Sign-in details</h2><p><strong>Email:</strong> ${e(state.user.email)}</p><form class="form" data-form="change-password">${field("password", "New password", { type: "password", required: true, attrs: 'autocomplete="new-password" minlength="12" maxlength="128"', hint: "At least 12 characters." })}${formEnd("Change password")}</form></div>
    <div class="card stack"><h2 style="font-size:1.6rem">Email notifications</h2><p class="muted">We email you when something needs your attention: a new application or invitation, a decision, an agreement to sign, hours to review, a new message (at most one message email every 30 minutes) and, for organisations, the six-month check-in. Emails show only a short title and a link, never message content.</p><form class="form" data-form="email-settings">${check("email_notifications", "Send me email notifications", emailOn)}${formEnd("Save email preference")}</form></div>
    <div class="card stack"><h2 style="font-size:1.6rem">Your data</h2><p class="muted">Your profile is public only when you publish it and it is approved. Applications, messages and agreements are visible only to you and the organisation involved. Read the <a href="#privacy">privacy notice</a>.</p><p class="muted">For a copy of your data or any other privacy request, write to <a href="mailto:${e(config.contactEmail)}">${e(config.contactEmail)}</a>.</p></div>
    <div class="card stack" style="border-color:#e6b9a6"><h2 style="font-size:1.6rem">Delete your account</h2><p class="muted">This permanently removes your account, profile, applications and messages. Organisations keep an anonymised record of completed work, shown as “Former member”. This cannot be undone.</p><div><button class="btn danger" type="button" data-action="delete-account">Delete my account</button></div></div>
  </div></div>`;
  return { title: "Account and privacy", html };
}

// ---------- submissions ----------
export async function submitAccount(kind, form) {
  if (kind === "signup") return withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error(invalidMessage(form, "Please complete the required fields.")); }
    const role = val(fd, "role");
    if (!role) throw Error("Choose whether you are joining as an organisation or a professional.");
    if (role === "organisation" && !EB_URL.test(val(fd, "eb_url"))) throw Error("Add the address of your organisation’s page in the Ethical Bridge directory, starting with https://ethicalbridge.org/");
    const { data, error } = await db.auth.signUp({ email: val(fd, "email"), password: String(fd.get("password")), options: { emailRedirectTo: config.siteUrl + "#onboarding", data: role === "organisation" ? { role, full_name: val(fd, "contact_name"), org_name: val(fd, "org_name"), org_country: val(fd, "org_country"), org_role: val(fd, "org_role"), ethical_bridge_url: val(fd, "eb_url") } : { role, full_name: val(fd, "name"), headline: val(fd, "headline") } } });
    if (error) throw error;
    if (data.session) { await loadSession(); go("#onboarding"); return; }
    form.outerHTML = `<div class="stack card" role="status"><span class="icon-tile lg">${icon("inbox", 28, "#0f6f63")}</span><h2 style="font-size:2rem">Check your email</h2><p>We sent a confirmation link to <strong>${e(val(fd, "email"))}</strong>. Open it on this device to finish setting up. It can take a few minutes; check your spam folder too.</p>${btn("Back to sign in", "#signin", "secondary")}</div>`;
  });
  if (kind === "signin") return withForm(form, async (fd) => {
    await result(db.auth.signInWithPassword({ email: val(fd, "email"), password: String(fd.get("password")) }));
    await loadSession();
    const r = form.dataset.role;
    go(form.dataset.next || (r === "organisation" && state.memberships.length ? "#org" : r === "professional" && state.profile ? "#workspace" : homeFor()));
  });
  if (kind === "reset") return withForm(form, async (fd) => {
    await result(db.auth.resetPasswordForEmail(val(fd, "email"), { redirectTo: config.siteUrl }));
    form.outerHTML = `<div class="stack card" role="status"><h2 style="font-size:2rem">Check your email</h2><p>If an account exists for that address, you will receive a link to choose a new password.</p></div>`;
  });
  if (kind === "email-settings") return withForm(form, async (fd) => {
    const on = fd.has("email_notifications");
    const existing = await result(db.from("user_settings").select("user_id").eq("user_id", state.user.id).maybeSingle());
    if (existing) await result(db.from("user_settings").update({ email_notifications: on, updated_at: new Date().toISOString() }).eq("user_id", state.user.id));
    else await result(db.from("user_settings").insert({ user_id: state.user.id, email_notifications: on }));
    toast(on ? "Email notifications are on." : "Email notifications are off. You will still see updates in the bell.");
  });
  if (kind === "new-password" || kind === "change-password") return withForm(form, async (fd) => {
    await result(db.auth.updateUser({ password: String(fd.get("password")) }));
    closeDialog();
    toast("Password updated.");
    form.reset();
  });
  if (kind === "org-create") return withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error(invalidMessage(form, "Please complete the required fields and confirmations.")); }
    const website = val(fd, "website");
    if (website && !safeURL(website)) throw Error("Use a full web address starting with https://");
    if (!EB_URL.test(val(fd, "ethical_bridge_url"))) throw Error("Add your organisation’s Ethical Bridge directory page, starting with https://ethicalbridge.org/");
    if (!["locally_led", "authorised", "org_declare", "org_agree"].every((k) => fd.has(k))) throw Error("Read the organisation agreement and tick all four boxes to sign it.");
    await result(db.rpc("sign_org_agreement", { p_version: ORG_AGREEMENT_VERSION, p_name: val(fd, "sign_name"), p_role: val(fd, "sign_role"), p_text: orgAgreementText() }));
    const newOrg = await result(db.rpc("create_organisation", { p_name: val(fd, "name"), p_country: val(fd, "country"), p_city: val(fd, "city"), p_website: safeURL(website), p_summary: val(fd, "summary"), p_org_type: val(fd, "org_type"), p_full_name: val(fd, "full_name"), p_locally_led: fd.has("locally_led") }));
    if (newOrg) await result(db.from("organisations").update({ ethical_bridge_url: val(fd, "ethical_bridge_url") }).eq("id", newOrg));
    if (state.user.user_metadata?.role !== "organisation") await db.auth.updateUser({ data: { role: "organisation" } });
    await loadSession();
    toast("Submitted for review. You can prepare draft needs now.");
    go("#org");
  });
  if (kind === "org-edit") return withForm(form, async (fd) => {
    const website = val(fd, "website");
    if (website && !safeURL(website)) throw Error("Use a full web address starting with https://");
    const ebu = val(fd, "ethical_bridge_url");
    if (ebu && !EB_URL.test(ebu)) throw Error("Use your organisation’s Ethical Bridge directory page, starting with https://ethicalbridge.org/");
    await result(db.from("organisations").update({ name: val(fd, "name"), country: val(fd, "country"), city: val(fd, "city"), website: safeURL(website), summary: val(fd, "summary"), org_type: val(fd, "org_type"), ethical_bridge_url: ebu }).eq("id", form.dataset.id));
    await loadSession();
    toast("Organisation details saved.");
  });
  if (kind === "profile") return withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error(invalidMessage(form, "Please complete the required fields.")); }
    const website = val(fd, "website");
    if (website && !safeURL(website)) throw Error("Use a full web address starting with https://");
    const linkedin = val(fd, "linkedin");
    if (!linkedin) throw Error("Add your LinkedIn profile. We use it to check who you are before approving your profile.");
    if (linkedin && !/^https:\/\/([a-z]{2,3}\.)?linkedin\.com\/\S+$/i.test(linkedin)) throw Error("Use your LinkedIn profile address, starting with https://www.linkedin.com/");
    const row = { linkedin, user_id: state.user.id, name: val(fd, "name"), headline: val(fd, "headline"), bio: val(fd, "bio"), experience_items: readEntries(form, "experience"), education_items: readEntries(form, "education"), photo_url: val(fd, "photo_url"), skills: list(val(fd, "skills"), 200), languages: languages(val(fd, "languages")), location: val(fd, "location"), country: val(fd, "country"), arrangement: "Remote", hours_available: Number(val(fd, "hours_available") || 0), website: safeURL(website), age_confirmed: signedCurrent() ? true : fd.has("age_confirmed"), unpaid_confirmed: signedCurrent() ? true : fd.has("unpaid_confirmed"), published: fd.has("published") };
    if (!row.skills.length) throw Error("Add at least one skill.");
    if (!row.languages.length) throw Error("Choose at least one language you can work in.");
    if (!row.experience_items.length) throw Error("Add at least one role under Experience.");
    if (!row.education_items.length) throw Error("Add at least one qualification under Education.");
    if (row.hours_available < 4) throw Error("Choose at least 4 hours a month.");
    if (!signedCurrent()) {
      if (!fd.has("agree_rules") || !fd.has("age_confirmed") || !fd.has("unpaid_confirmed") || !fd.has("declare_conduct")) throw Error("Read the agreement and tick all four boxes to sign it.");
      const signName = val(fd, "sign_name");
      if (signName.length < 2) throw Error("Type your full name to sign the agreement.");
      await result(db.rpc("sign_agreement", { p_kind: "professional", p_version: PRO_AGREEMENT_VERSION, p_name: signName, p_text: proAgreementText(), p_hours: row.hours_available }));
      state.proAgreement = { version: PRO_AGREEMENT_VERSION, signed_at: new Date().toISOString(), full_name: signName, hours_committed: row.hours_available };
    }
    const exists = !!state.profile;
    const oldPhoto = state.profile?.photo_url;
    if (exists) { const { user_id, ...upd } = row; await result(db.from("profiles").update(upd).eq("user_id", state.user.id)); }
    else await result(db.from("profiles").insert(row));
    if (!exists && state.user.user_metadata?.role !== "professional") await db.auth.updateUser({ data: { role: "professional" } });
    // Tidy up the previous photo once the new one is saved (best effort).
    const oldPath = oldPhoto && oldPhoto !== row.photo_url ? ownAvatarPath(oldPhoto) : null;
    if (oldPath) db.storage.from("avatars").remove([oldPath]).catch(() => {});
    await loadSession();
    const p = state.profile;
    toast(p.published && p.review_status === "pending" ? "Saved. Your profile is now awaiting approval." : "Profile saved.");
    go("#workspace");
  });
}

export async function deleteAccount() {
  openDialog("Delete your account?", `<p>This permanently removes your account, profile, applications and messages. It cannot be undone.</p><form class="form" data-form="confirm-delete">${field("confirm", "Type DELETE to confirm", { required: true, attrs: 'autocomplete="off" autofocus' })}${formEnd("Delete my account", `<button class="btn secondary" type="button" data-action="close">Cancel</button>`)}</form>`);
}
export async function confirmDelete(form) {
  await withForm(form, async (fd) => {
    if (val(fd, "confirm") !== "DELETE") throw Error("Type DELETE in capital letters to confirm.");
    await result(db.rpc("delete_my_account"));
    await db.auth.signOut().catch(() => {});
    closeDialog();
    await loadSession();
    toast("Your account has been deleted.");
    go("#home");
  });
}
