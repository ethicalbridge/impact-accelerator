import { db, state, result, e, openDialog, closeDialog, toast, go, withForm, invalidMessage, val, loadSession, homeFor } from "../core.js";
import { icon, mark, eyebrow, field, select, check, formEnd, btn, back } from "../ui.js";
import { list, languages, safeURL } from "../utils.js";
import { config } from "../config.js";

const ORG_TYPES = ["Community organisation", "Local NGO", "Cooperative", "Social enterprise", "Collective or informal group (fiscally hosted)", "Other"];
const shell = (title, lead, form) => `<div class="grid-2" style="gap:0;min-height:calc(100vh - 77px)">
  <div class="band-dark stack" style="--gap:28px;padding:clamp(32px,5vw,72px);justify-content:center">
    <h1 style="font-size:clamp(2.4rem,4.4vw,4rem)">${title}</h1><p class="lead">${lead}</p>
    <ul class="checks">${["Free for organisations and professionals", "Your profile stays private until approved", "A signed agreement before any work", "Delete your account whenever you want"].map((t) => `<li>${icon("check", 22, "#a9c9bf", 2.2)}${t}</li>`).join("")}</ul>
    <span class="small" style="color:var(--on-deep-quiet)">An initiative of Ethical Bridge</span>
  </div>
  <div style="padding:clamp(32px,5vw,72px);display:flex;align-items:center"><div style="width:100%;max-width:560px">${form}</div></div></div>`;

export async function join(params) {
  if (state.user) return { redirect: homeFor() };
  const r = params.get("role") === "organisation" ? "organisation" : params.get("role") === "professional" ? "professional" : "";
  const form = `<form class="form" data-form="signup" novalidate>
    <div class="row between"><h2 style="font-size:2.3rem">Create your account</h2><a href="#signin" style="font-weight:600">I already have one</a></div>
    <fieldset><legend>I am joining as</legend><div class="role-cards">
      <label class="role-card"><input type="radio" name="role" value="organisation" ${r === "organisation" ? "checked" : ""} required><span class="icon-tile">${icon("home", 22, "#0f6f63")}</span><span><strong>An organisation</strong><span class="small muted">Publish needs and find skilled help</span></span></label>
      <label class="role-card"><input type="radio" name="role" value="professional" ${r === "professional" ? "checked" : ""}><span class="icon-tile">${icon("user", 22, "#0f6f63")}</span><span><strong>A professional</strong><span class="small muted">Contribute skills and build an impact CV</span></span></label>
    </div></fieldset>
    <div class="form-grid">${field("name", "Full name", { required: true, attrs: 'autocomplete="name" maxlength="120"' })}${field("email", "Email address", { type: "email", required: true, attrs: 'autocomplete="email" maxlength="254"' })}</div>
    ${field("password", "Password", { type: "password", required: true, attrs: 'autocomplete="new-password" minlength="12" maxlength="128"', hint: "At least 12 characters." })}
    <div class="checkbox-box">
      ${check("adult", "I am 18 or older.", false, true)}
      ${check("terms", `I agree to the <a href="#terms" target="_blank">Terms of use</a> and have read the <a href="#privacy" target="_blank">Privacy notice</a>.`, false, true)}
    </div>
    ${formEnd("Create account")}
    <p class="small muted">We will email you a link to confirm your address. Then you can finish your profile or organisation details, and we review them before anything is public.</p>
  </form>`;
  return { title: "Join", description: "Create a free Handova account.", html: shell("Join the founding group.", "Handova is free. We review every organisation and profile before it becomes public, so everyone can trust who they are working with.", form) };
}

export async function signin(params) {
  if (state.user) return { redirect: params.get("next") || homeFor() };
  const form = `<form class="form" data-form="signin" data-next="${e(params.get("next") || "")}">
    <div class="row between"><h2 style="font-size:2.3rem">Sign in</h2><a href="#join" style="font-weight:600">Create an account</a></div>
    ${field("email", "Email address", { type: "email", required: true, attrs: 'autocomplete="email" autofocus' })}
    ${field("password", "Password", { type: "password", required: true, attrs: 'autocomplete="current-password"' })}
    ${formEnd("Sign in", `<a href="#reset" style="font-weight:600;min-height:44px;display:inline-flex;align-items:center">Forgot your password?</a>`)}
  </form>`;
  return { title: "Sign in", html: shell("Welcome back.", "Pick up where you left off: your needs, applications, agreements and impact CV.", form) };
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
  if (r === "organisation") {
    return { title: "Set up your organisation", html: `<div class="wrap" style="max-width:820px;padding-block:56px 80px"><div class="stack" style="--gap:24px">${eyebrow("Step 2 of 2")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">Tell us about your organisation.</h1><p class="lead">We review every organisation before its needs go public, usually within two working days.</p>${orgForm({}, name)}<p class="small muted">Joining as a professional instead? <button class="link-btn" type="button" data-action="switch-role" data-id="professional">Create a professional profile</button></p></div></div>` };
  }
  return { title: "Create your profile", html: `<div class="wrap" style="max-width:820px;padding-block:56px 80px"><div class="stack" style="--gap:24px">${eyebrow("Step 2 of 2")}<h1 style="font-size:clamp(2.2rem,4vw,3.4rem)">Create your professional profile.</h1><p class="lead">Describe what you can offer. Your profile stays private until you publish it and we approve it.</p>${profileForm({ name })}<p class="small muted">Here for an organisation? <button class="link-btn" type="button" data-action="switch-role" data-id="organisation">Set up an organisation</button></p></div></div>` };
}

export function orgForm(o = {}, fullName = "") {
  const edit = !!o.id;
  return `<form class="form card" data-form="${edit ? "org-edit" : "org-create"}" data-id="${e(o.id || "")}"><div class="form-grid">
    ${field("name", "Organisation name", { value: o.name, required: true, attrs: 'maxlength="160"', full: true })}
    ${field("country", "Country", { value: o.country, required: true, attrs: 'maxlength="100" autocomplete="country-name"' })}
    ${field("city", "City or region", { value: o.city, attrs: 'maxlength="120"' })}
    ${select("org_type", "Type of organisation", ORG_TYPES, o.org_type || ORG_TYPES[0])}
    ${field("website", "Website or social page", { value: o.website, type: "url", attrs: 'maxlength="300" placeholder="https://"' })}
    ${field("summary", "What your organisation does", { value: o.summary, type: "textarea", required: true, full: true, attrs: 'maxlength="600" minlength="20"', hint: "Two or three sentences. This appears on your needs." })}
    ${edit ? "" : field("full_name", "Your name", { value: fullName, required: true, attrs: 'maxlength="120" autocomplete="name"' })}
    ${edit ? "" : `<div class="checkbox-box full">${check("locally_led", "We are a locally led organisation: our leadership is based where we work, and we are registered or fiscally hosted by a registered organisation.", false, true)}${check("authorised", "I am authorised to represent this organisation.", false, true)}</div>`}
  </div>${formEnd(edit ? "Save changes" : "Submit for review")}</form>`;
}

export function profileForm(p = {}) {
  const edit = !!p.user_id;
  return `<form class="form card" data-form="profile" data-edit="${edit ? 1 : 0}"><div class="form-grid">
    ${field("name", "Full or professional name", { value: p.name, required: true, attrs: 'maxlength="120" autocomplete="name"' })}
    ${field("headline", "Professional headline", { value: p.headline, required: true, attrs: 'maxlength="160" placeholder="e.g. Finance consultant"' })}
    ${field("bio", "Introduction", { value: p.bio, type: "textarea", required: true, full: true, attrs: 'maxlength="4000" minlength="30"', hint: "What you do and how you like to help. Don’t include personal contact details." })}
    ${field("experience", "Experience", { value: p.experience, type: "textarea", full: true, attrs: 'maxlength="8000"', hint: "Roles, organisations and years. Optional." })}
    ${field("skills", "Skills (separate with commas)", { value: (p.skills || []).join(", "), required: true, full: true, attrs: 'maxlength="800" placeholder="e.g. Budgeting, Training, Excel"' })}
    ${field("languages", "Languages you can work in (separate with commas)", { value: (p.languages || []).join(", "), required: true, full: true, attrs: 'maxlength="800" placeholder="e.g. English, Spanish"', hint: "Include local or sign languages where relevant." })}
    ${field("location", "City or time zone", { value: p.location, attrs: 'maxlength="160" placeholder="e.g. Nairobi · UTC+3"' })}
    ${field("country", "Country", { value: p.country, attrs: 'maxlength="100" autocomplete="country-name"' })}
    ${select("arrangement", "How you can work", ["Remote", "Hybrid", "In person"], p.arrangement || "Remote")}
    ${field("hours_available", "Hours a month you can give", { value: p.hours_available ?? 8, type: "number", required: true, attrs: 'min="0" max="160" step="1"' })}
    ${field("website", "LinkedIn or professional website", { value: p.website, type: "url", full: true, attrs: 'maxlength="300" placeholder="https://"', hint: "Optional. Shown on your profile; it is not an identity check." })}
    <div class="checkbox-box full">
      ${check("age_confirmed", "I am 18 or older.", p.age_confirmed ?? true, true)}
      ${check("unpaid_confirmed", "I understand contributions are unpaid and voluntary.", p.unpaid_confirmed, true)}
      ${check("published", "<strong>Publish my profile.</strong> Once approved, anyone can see it, including search engines. You can unpublish at any time.", p.published)}
    </div>
  </div>${formEnd(edit ? "Save profile" : "Create profile")}</form>`;
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
    const { data, error } = await db.auth.signUp({ email: val(fd, "email"), password: String(fd.get("password")), options: { emailRedirectTo: config.siteUrl + "#onboarding", data: { role, full_name: val(fd, "name") } } });
    if (error) throw error;
    if (data.session) { await loadSession(); go("#onboarding"); return; }
    form.outerHTML = `<div class="stack card" role="status"><span class="icon-tile lg">${icon("inbox", 28, "#0f6f63")}</span><h2 style="font-size:2rem">Check your email</h2><p>We sent a confirmation link to <strong>${e(val(fd, "email"))}</strong>. Open it on this device to finish setting up. It can take a few minutes; check your spam folder too.</p>${btn("Back to sign in", "#signin", "secondary")}</div>`;
  });
  if (kind === "signin") return withForm(form, async (fd) => {
    await result(db.auth.signInWithPassword({ email: val(fd, "email"), password: String(fd.get("password")) }));
    await loadSession();
    go(form.dataset.next || homeFor());
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
    await result(db.rpc("create_organisation", { p_name: val(fd, "name"), p_country: val(fd, "country"), p_city: val(fd, "city"), p_website: safeURL(website), p_summary: val(fd, "summary"), p_org_type: val(fd, "org_type"), p_full_name: val(fd, "full_name"), p_locally_led: fd.has("locally_led") }));
    if (state.user.user_metadata?.role !== "organisation") await db.auth.updateUser({ data: { role: "organisation" } });
    await loadSession();
    toast("Submitted for review. You can prepare draft needs now.");
    go("#org");
  });
  if (kind === "org-edit") return withForm(form, async (fd) => {
    const website = val(fd, "website");
    if (website && !safeURL(website)) throw Error("Use a full web address starting with https://");
    await result(db.from("organisations").update({ name: val(fd, "name"), country: val(fd, "country"), city: val(fd, "city"), website: safeURL(website), summary: val(fd, "summary"), org_type: val(fd, "org_type") }).eq("id", form.dataset.id));
    await loadSession();
    toast("Organisation details saved.");
  });
  if (kind === "profile") return withForm(form, async (fd) => {
    if (!form.checkValidity()) { form.reportValidity(); throw Error(invalidMessage(form, "Please complete the required fields.")); }
    const website = val(fd, "website");
    if (website && !safeURL(website)) throw Error("Use a full web address starting with https://");
    const row = { user_id: state.user.id, name: val(fd, "name"), headline: val(fd, "headline"), bio: val(fd, "bio"), experience: val(fd, "experience"), skills: list(val(fd, "skills")), languages: languages(val(fd, "languages")), location: val(fd, "location"), country: val(fd, "country"), arrangement: val(fd, "arrangement"), hours_available: Number(val(fd, "hours_available") || 0), website: safeURL(website), age_confirmed: fd.has("age_confirmed"), unpaid_confirmed: fd.has("unpaid_confirmed"), published: fd.has("published") };
    if (!row.skills.length) throw Error("Add at least one skill.");
    const exists = !!state.profile;
    if (exists) { const { user_id, ...upd } = row; await result(db.from("profiles").update(upd).eq("user_id", state.user.id)); }
    else await result(db.from("profiles").insert(row));
    if (!exists && state.user.user_metadata?.role !== "professional") await db.auth.updateUser({ data: { role: "professional" } });
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
