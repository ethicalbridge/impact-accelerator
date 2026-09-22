import { uploadImage, removeImage } from "./media.js";
import { conversation } from "./messages.js";
import {
  db,
  state,
  $,
  e,
  today,
  btn,
  field,
  area,
  select,
  check,
  formEnd,
  result,
  members,
  profile,
  showDialog,
  closeDialog,
  notify,
  errorMessage,
  safeURL,
} from "./core.js";
import { types, list, supportLanguages } from "./utils.js";
export function requireUser() {
  if (!state.user) {
    authForm();
    return false;
  }
  return true;
}
export function authForm(mode = "signin") {
  const signup = mode === "signup",
    reset = mode === "reset";
  showDialog(
    signup
      ? "Join Impact Accelerator"
      : reset
        ? "Reset your password"
        : "Welcome back",
    `<p class="muted">${reset ? "We will send a password reset link to your email address." : "Use your Ethical Bridge account, or create one to get started."}</p><form data-form="auth" data-mode="${mode}" class="form-grid">${field("email", "Email address", "", "email", true, 'autocomplete="email" maxlength="254"')}${!reset ? field("password", "Password", "", "password", true, `autocomplete="${signup ? "new-password" : "current-password"}" ${signup ? 'minlength="12"' : ""} maxlength="128"`) : ""}${signup ? '<p class="hint full">Use at least 12 characters. Confirm your email before signing in. Your profile starts private.</p>' : ""}<p class="form-error full" role="alert"></p><button class="primary full" type="submit">${signup ? "Create account" : reset ? "Send reset link" : "Sign in"}</button></form><div class="actions">${btn(signup ? "Already have an account? Sign in" : "Create an account", signup ? "auth" : "signup", "", "text-button")}${!reset ? btn("Forgot password?", "reset", "", "text-button") : btn("Back to sign in", "auth", "", "text-button")}</div><p><small>Account services are shared with Ethical Bridge. <a href="#privacy" data-action="close">Read about privacy</a>.</small></p>`,
  );
}
export async function editProfile() {
  if (!requireUser()) return;
  const p = (await profile()) || {};
  showDialog(
    p.name ? "Edit your profile" : "Create your profile",
    `<p class="muted">Describe your professional background. Your impact portfolio grows from contributions through the platform.</p><form data-form="profile" class="form-grid">${field("name", "Full / professional name", p.name, "text", true, 'minlength="2" maxlength="120" autocomplete="name"')}${field("headline", "Professional headline", p.headline, "text", true, 'maxlength="160" placeholder="e.g. Researcher & monitoring specialist"')}${area("bio", "Professional introduction", p.bio, true)}${field("location", "Location / time zone", p.location, "text", false, 'maxlength="160" placeholder="City, country or time zone"')}${select("arrangement", "Work arrangement", ["Remote", "Hybrid", "In person"], p.arrangement || "Remote")}${field("skills", "Skills, separated by commas", (p.skills || []).join(", "), "text", true, 'maxlength="800"')}${field("languages", "Languages I can support in (separate with commas)", (p.languages || []).join(", "), "text", true, 'maxlength="800" placeholder="e.g. English, Spanish, Swahili"')}<p class="hint full">List languages you can confidently use for meetings, written communication and the contribution itself. Include local or sign languages where relevant.</p>${area("experience", "Experience & achievements", p.experience, false, 8000)}${field("hours_available", "Available hours per month", p.hours_available ?? 0, "number", true, 'min="0" max="160" step="1"')}${field("website", "LinkedIn profile or professional website", p.website, "url", false, 'placeholder="https://…" maxlength="2000"')}${check("published", "Publish my profile in the talent directory. My professional information will be visible to anyone.", p.published)}${formEnd()}</form>`,
  );
}
export async function editWork(id) {
  if (!requireUser()) return;
  if (!(await profile())) {
    await editProfile();
    return;
  }
  const p = id
    ? await result(
        db
          .from("ia_portfolio")
          .select("*")
          .eq("id", id)
          .eq("user_id", state.user.id)
          .single(),
      )
    : {};
  showDialog(
    id ? "Edit portfolio work" : "Add work to your portfolio",
    `<p class="muted">Show the context, your contribution and what it achieved. Previous work outside Impact Accelerator belongs here too.</p><form data-form="work" data-id="${id || ""}" class="form-grid">${field("title", "Work title", p.title, "text", true, 'minlength="2" maxlength="160" placeholder="e.g. Community water access research"')}${select("work_type", "Type of work", types, p.work_type || "Research")}${field("client", "Organisation / client", p.client, "text", false, 'maxlength="160"')}${field("work_date", "Date of work", p.work_date, "date", false, `max="${today()}"`)}${area("description", "Context & description", p.description, true, 6000)}${area("role", "Your role & contribution", p.role, true, 1000)}${area("outcome", "Outputs, achievements & outcomes", p.outcome, false, 2000)}${field("skills", "Skills demonstrated, separated by commas", (p.skills || []).join(", "), "text", false, 'maxlength="800"')}${field("link", "Supporting link", p.link, "url", false, 'placeholder="https://…" maxlength="2000"')}${field("image", "Thumbnail / image URL (HTTPS)", p.image?.startsWith("storage:") ? "" : p.image, "url", false, 'placeholder="https://…" maxlength="2000" pattern="https://.*"')}${field("thumbnail", "Or upload a thumbnail", "", "file", false, 'accept="image/jpeg,image/png,image/webp"')}${p.image?.startsWith("storage:") ? check("remove_image", "Remove existing uploaded thumbnail.") : ""}<p class="hint">JPEG, PNG or WebP, up to 5 MB. Uploads stay private while the entry is a draft. Or use a public image URL you have permission to share. Reports, videos, publications and websites can be added as supporting links.</p>${check("featured", "Feature this work at the top of my portfolio.", p.featured)}${check("published", "Make this entry public when my profile is published. I have permission to share this material.", p.published)}${formEnd("Save work")}${id ? `<div class="full">${btn("Delete this entry", "delete-work", id, "danger")}</div>` : ""}</form>`,
  );
}
export async function editNeed(id) {
  if (!requireUser()) return;
  const ms = await members();
  if (!ms.length) {
    location.hash = "organisation";
    return;
  }
  const n = id
    ? await result(db.from("ia_needs").select("*").eq("id", id).single())
    : {};
  showDialog(
    id ? "Edit support need" : "Create a support need",
    `<form data-form="need" data-id="${id || ""}" class="form-grid">${select(
      "organisation_id",
      "Organisation",
      ms.map((m) => [
        m.organisation_id,
        m.organisation?.public_name || m.organisation?.registered_name,
      ]),
      n.organisation_id,
    )}${field("title", "Need title", n.title, "text", true, 'minlength="5" maxlength="160"')}${area("description", "Context & support needed", n.description, true, 6000)}${area("output", "Expected output & definition of success", n.output, true, 2000)}${field("skills", "Skills needed, separated by commas", (n.skills || []).join(", "), "text", true, 'maxlength="800"')}${field("languages", "Languages we can receive support in (separate with commas)", (n.languages || []).join(", "), "text", true, 'maxlength="800" placeholder="e.g. Arabic, French, English"')}<p class="hint full">List the languages your team can work in for this need. Support in any one of these languages is welcome. Describe any task that requires multiple languages in the support brief.</p>${field("hours", "Estimated hours", n.hours || 8, "number", true, 'min="1" max="500" step="1"')}${select("arrangement", "Work arrangement", ["Remote", "Hybrid", "In person"], n.arrangement || "Remote")}${field("location", "Location / time zone", n.location, "text", false, 'maxlength="160"')}${field("deadline", "Application deadline", n.deadline, "date")}${select(
      "status",
      "Visibility / status",
      [
        ["draft", "Draft — only organisation members"],
        ["open", "Open — accepting applications"],
        ["closed", "Closed — no new applications"],
      ],
      n.status || "draft",
    )}<p class="hint full">Only organisations published in Ethical Bridge can open a public need. Close a need when you stop accepting applications. Existing contribution records are retained.</p>${formEnd("Save need")}</form>`,
  );
  if (id) $("#dialog").querySelector("[name=organisation_id]").disabled = true;
}
export async function apply(id) {
  if (!requireUser()) return;
  const p = await profile();
  if (!p?.published) {
    showDialog(
      "Publish your profile first",
      `<p>Organisations need to see your professional background and portfolio when reviewing an application.</p>${btn("Edit my profile", "edit-profile")}`,
    );
    return;
  }
  showDialog(
    "Apply to this need",
    `<p>Explain how your experience fits the requested output and when you could contribute. Include a preferred professional contact method if you want the organisation to contact you outside the workspace. This message is private to you and the organisation.</p><form data-form="application" data-id="${id}" class="form-grid">${area("message", "Your contribution & availability", "", true)}${formEnd("Send application")}</form>`,
  );
  $("#dialog textarea").minLength = 20;
}
export async function invite(id) {
  if (!requireUser()) return;
  const ms = await members();
  if (!ms.length) {
    location.hash = "organisation";
    return;
  }
  const needs = await result(
    db
      .from("ia_needs")
      .select("id,title,deadline")
      .in(
        "organisation_id",
        ms.map((m) => m.organisation_id),
      )
      .eq("status", "open"),
  );
  const open = needs.filter((n) => !n.deadline || n.deadline >= today());
  if (!open.length) {
    showDialog(
      "Create an open need first",
      `<p>An invitation connects a professional to a specific output and time commitment.</p>${btn("Create a need", "add-need")}`,
    );
    return;
  }
  showDialog(
    "Invite to a support need",
    `<p>Explain why their work fits, what you need and how to contact your organisation. Invitations appear in the talent workspace.</p><form data-form="invitation" data-id="${id}" class="form-grid">${select(
      "need_id",
      "Open support need",
      open.map((n) => [n.id, n.title]),
    )}${area("message", "Personal invitation", "", true)}${formEnd("Send invitation")}</form>`,
  );
  $("#dialog textarea").minLength = 20;
}
export async function logTime() {
  if (!requireUser()) return;
  const [apps, invites, agreements] = await Promise.all([
    result(
      db
        .from("ia_applications")
        .select("need_id,need:ia_needs(title)")
        .eq("user_id", state.user.id)
        .eq("status", "accepted"),
    ),
    result(
      db
        .from("ia_invitations")
        .select("need_id,need:ia_needs(title)")
        .eq("user_id", state.user.id)
        .eq("status", "accepted"),
    ),
    result(
      db
        .from("ia_agreements")
        .select("need_id,talent_signed_at,organisation_signed_at")
        .eq("user_id", state.user.id),
    ),
  ]);
  const ready = new Set(
    agreements
      .filter((a) => a.talent_signed_at && a.organisation_signed_at)
      .map((a) => a.need_id),
  );
  const accepted = [
    ...new Map([...apps, ...invites].map((a) => [a.need_id, a])).values(),
  ].filter((a) => ready.has(a.need_id));
  if (!accepted.length) {
    showDialog(
      "A signed contribution agreement comes first",
      '<p>You can log time after a match is accepted and both the talent and organisation have signed its contribution agreement. Open your workspace to review any agreement awaiting your signature.</p><a class="button" href="#workspace" data-action="close">Open workspace</a>',
    );
    return;
  }
  showDialog(
    "Log your contribution",
    `<p>Record time actually contributed. The organisation will review it before it counts as approved.</p><form data-form="hours" class="form-grid">${select(
      "need_id",
      "Contribution",
      accepted.map((a) => [a.need_id, a.need?.title || "Support need"]),
    )}${field("work_date", "Date", today(), "date", true, `max="${today()}"`)}${field("hours", "Hours contributed", "1", "number", true, 'min="0.25" max="24" step="0.25"')}${field("evidence", "Evidence link (optional)", "", "url", false, 'maxlength="2000" placeholder="https://…"')}${area("description", "Work completed", "", true, 2000)}${formEnd("Submit for review")}</form>`,
  );
  $("#dialog textarea").minLength = 10;
}
export function decision(title, copy, form, id, fields = "") {
  showDialog(
    title,
    `<p>${copy}</p><form data-form="${form}" data-id="${id}" class="form-grid">${fields}${formEnd("Confirm")}</form>`,
  );
}
export function recoveryForm() {
  showDialog(
    "Choose a new password",
    `<form data-form="password" class="form-grid">${field("password", "New password", "", "password", true, 'minlength="12" maxlength="128" autocomplete="new-password"')}${formEnd("Update password")}</form>`,
  );
}
export function validateURL(url, https = false) {
  if (!url) return "";
  const safe = safeURL(url);
  if (!safe || (https && !safe.startsWith("https://")))
    throw Error(
      https
        ? "Use an HTTPS image URL."
        : "Use a complete http:// or https:// web address.",
    );
  return safe;
}
export async function submit(event) {
  const form = event.target;
  if (!form.dataset.form) return;
  event.preventDefault();
  const button = form.querySelector("[type=submit]"),
    err = form.querySelector(".form-error");
  button.disabled = true;
  err.textContent = "";
  const f = new FormData(form),
    v = (name) => String(f.get(name) || "").trim(),
    on = (name) => f.has(name),
    id = form.dataset.id;
  let cleanupImage = "",
    newImage = "";
  try {
    const kind = form.dataset.form;
    if (kind === "auth") {
      const email = v("email"),
        password = String(f.get("password") || ""),
        redirectTo = new URL("./", location.href).href.split("#")[0];
      if (form.dataset.mode === "signup") {
        const data = await result(
          db.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: redirectTo },
          }),
        );
        if (data.session) {
          state.user = data.user;
          closeDialog();
          location.hash = "workspace";
          await state.render();
        } else
          showDialog(
            "Check your email",
            "<p>If this address is eligible, a confirmation email will arrive shortly. Follow its link to confirm your account, then return here to sign in. Check your spam folder too.</p>" +
              btn("Back to sign in", "auth"),
          );
      } else if (form.dataset.mode === "reset") {
        await result(db.auth.resetPasswordForEmail(email, { redirectTo }));
        showDialog(
          "Check your email",
          "<p>If an account exists, you will receive a password reset link. Follow it to choose a new password.</p>",
        );
      } else {
        const data = await result(
          db.auth.signInWithPassword({ email, password }),
        );
        state.user = data.user;
        $("#account").textContent = "Account";
        closeDialog();
        location.hash =
          ["#organisation", "#portfolio", "#hours"].includes(location.hash) ||
          location.hash.startsWith("#need/")
            ? location.hash
            : "workspace";
        await state.render();
      }
      return;
    }
    if (kind === "password") {
      await result(
        db.auth.updateUser({ password: String(f.get("password") || "") }),
      );
      closeDialog();
      notify("Password updated.");
      await state.render();
      return;
    }
    if (!state.user) throw Error("Your session ended. Please sign in again.");
    let query;
    if (kind === "agreement") {
      if (!on("scope") || !on("security") || !on("terms"))
        throw Error("Read and accept all three agreement confirmations.");
      const signature = v("signature_name");
      if (signature.length < 2) throw Error("Type your full name to sign.");
      const organisation = form.dataset.party === "organisation";
      await result(
        db
          .from("ia_agreements")
          .update(
            organisation
              ? {
                  organisation_signed_name: signature,
                  organisation_signed_at: new Date().toISOString(),
                  organisation_signed_by: state.user.id,
                }
              : {
                  talent_signed_name: signature,
                  talent_signed_at: new Date().toISOString(),
                },
          )
          .eq("id", id)
          .select()
          .single(),
      );
      closeDialog();
      notify("Agreement signed. The signature record cannot be edited.");
      await state.render();
      return;
    }
    if (kind === "message") {
      const [need_id, user_id] = id.split("/");
      await result(
        db.from("ia_messages").insert({
          need_id,
          user_id,
          sender_id: state.user.id,
          body: v("body"),
        }),
      );
      await conversation(id);
      notify("Message sent.");
      return;
    }
    if (kind === "profile") {
      query = db.from("ia_profiles").upsert({
        user_id: state.user.id,
        name: v("name"),
        headline: v("headline"),
        bio: v("bio"),
        location: v("location"),
        skills: list(v("skills")),
        languages: supportLanguages(v("languages")),
        experience: v("experience"),
        hours_available: Number(v("hours_available")),
        arrangement: v("arrangement"),
        website: validateURL(v("website")),
        published: on("published"),
      });
    } else if (kind === "work") {
      const old = id
        ? await result(
            db
              .from("ia_portfolio")
              .select("image")
              .eq("id", id)
              .eq("user_id", state.user.id)
              .single(),
          )
        : {};
      const file = f.get("thumbnail");
      let image = on("remove_image")
        ? ""
        : v("image") ||
          (old.image?.startsWith("storage:") ? old.image : "") ||
          "";
      if (file?.size) {
        image = await uploadImage(file);
        newImage = image;
      }
      if (old.image !== image) cleanupImage = old.image;
      const data = {
        user_id: state.user.id,
        title: v("title"),
        description: v("description"),
        role: v("role"),
        outcome: v("outcome"),
        client: v("client"),
        work_date: v("work_date") || null,
        work_type: v("work_type"),
        skills: list(v("skills")),
        link: validateURL(v("link")),
        image: image.startsWith("storage:") ? image : validateURL(image, true),
        featured: on("featured"),
        published: on("published"),
      };
      query = id
        ? db
            .from("ia_portfolio")
            .update(data)
            .eq("id", id)
            .eq("user_id", state.user.id)
            .select()
            .single()
        : db.from("ia_portfolio").insert(data);
    } else if (kind === "need") {
      const data = {
        title: v("title"),
        description: v("description"),
        output: v("output"),
        skills: list(v("skills")),
        languages: supportLanguages(v("languages")),
        hours: Number(v("hours")),
        arrangement: v("arrangement"),
        location: v("location"),
        deadline: v("deadline") || null,
        status: v("status"),
      };
      if (data.description.length < 20)
        throw Error("Describe the support needed in at least 20 characters.");
      if (data.output.length < 5) throw Error("Add a clear expected output.");
      if (data.status === "open" && data.deadline && data.deadline < today())
        throw Error("An open need must have a current or future deadline.");
      query = id
        ? db.from("ia_needs").update(data).eq("id", id).select().single()
        : db
            .from("ia_needs")
            .insert({ ...data, organisation_id: v("organisation_id") });
    } else if (kind === "application") {
      query = db
        .from("ia_applications")
        .insert({ need_id: id, user_id: state.user.id, message: v("message") });
    } else if (kind === "invitation") {
      query = db
        .from("ia_invitations")
        .insert({ need_id: v("need_id"), user_id: id, message: v("message") });
    } else if (kind === "hours") {
      query = db.from("ia_hours").insert({
        need_id: v("need_id"),
        user_id: state.user.id,
        work_date: v("work_date"),
        hours: Number(v("hours")),
        description: v("description"),
        evidence: validateURL(v("evidence")),
      });
    } else if (kind === "delete-work") {
      const old = await result(
        db
          .from("ia_portfolio")
          .select("image")
          .eq("id", id)
          .eq("user_id", state.user.id)
          .single(),
      );
      cleanupImage = old.image;
      query = db
        .from("ia_portfolio")
        .delete()
        .eq("id", id)
        .eq("user_id", state.user.id)
        .select()
        .single();
    } else if (kind === "withdraw") {
      query = db
        .from("ia_applications")
        .update({ status: "withdrawn" })
        .eq("id", id)
        .select()
        .single();
    } else if (kind.endsWith("application")) {
      query = db
        .from("ia_applications")
        .update({ status: kind.startsWith("accept") ? "accepted" : "declined" })
        .eq("id", id)
        .select()
        .single();
    } else if (kind.endsWith("invite")) {
      query = db
        .from("ia_invitations")
        .update({ status: kind.startsWith("accept") ? "accepted" : "declined" })
        .eq("id", id)
        .select()
        .single();
    } else if (kind.endsWith("hours")) {
      query = db
        .from("ia_hours")
        .update({
          status: kind === "approve-hours" ? "approved" : "changes_requested",
          review_note: v("review_note"),
        })
        .eq("id", id)
        .select()
        .single();
    } else throw Error("This form is not available.");
    const saved = await result(query);
    if (cleanupImage) await removeImage(cleanupImage);
    newImage = "";
    closeDialog();
    notify("Saved successfully.");
    if (kind === "delete-work") location.hash = "portfolio";
    else if (kind === "profile" && !location.hash.includes("profile"))
      location.hash = "workspace";
    await state.render();
    if (["accept-application", "accept-invite"].includes(kind)) {
      const { agreement } = await import("./agreements.js");
      await agreement(`${saved.need_id}/${saved.user_id}`);
    }
  } catch (error) {
    if (newImage) await removeImage(newImage);
    err.textContent = errorMessage(error);
    err.scrollIntoView({ block: "nearest" });
  } finally {
    button.disabled = false;
  }
}
