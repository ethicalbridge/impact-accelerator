import { createClient } from "@supabase/supabase-js";
import { config } from "./config.js";
import { e } from "./utils.js";

export const db = createClient(config.supabaseUrl, config.supabaseKey, {
  auth: { storageKey: "impact-accelerator-v1", flowType: "pkce", detectSessionInUrl: true, persistSession: true },
});

// Everything the interface knows about the signed-in person.
export const state = { user: null, profile: null, memberships: [], isAdmin: false, unread: 0, ready: false };
export const $ = (s, root = document) => root.querySelector(s);
export const $$ = (s, root = document) => [...root.querySelectorAll(s)];

export async function result(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// Every profile column the site may read. Never select("*"): the name on an identity document is admin-only.
export const PROFILE_COLS = "user_id,name,headline,bio,experience,location,country,skills,languages,hours_available,arrangement,website,age_confirmed,unpaid_confirmed,published,review_status,approved_at,created_at,updated_at,linkedin,photo_url,experience_items,education_items,closed_at,closed_reason,inactive_since,id_status,id_verified_at,cv_hidden";

export async function loadSession() {
  const { data } = await db.auth.getSession();
  state.user = data.session?.user || null;
  if (!state.user) {
    Object.assign(state, { profile: null, memberships: [], isAdmin: false, unread: 0, proAgreement: null, idRequired: false, ready: true });
    return;
  }
  const uid = state.user.id;
  const [profile, memberships, admin, unread, proAgreement, idSetting] = await Promise.all([
    result(db.from("profiles").select(PROFILE_COLS).eq("user_id", uid).maybeSingle()).catch(() => null),
    result(db.from("organisation_members").select("organisation_id, role, full_name, organisation:organisations(*)").eq("user_id", uid)).catch(() => []),
    result(db.rpc("is_admin")).catch(() => false),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).is("read_at", null),
    // The latest professional agreement this person signed (version and date only).
    result(db.from("agreement_signatures").select("version,signed_at,full_name,hours_committed").eq("user_id", uid).eq("kind", "professional").order("signed_at", { ascending: false }).limit(1)).then((r) => r?.[0] || null).catch(() => null),
    result(db.from("app_settings").select("value").eq("key", "require_id_verification").maybeSingle()).catch(() => null),
  ]);
  Object.assign(state, { profile, memberships: memberships || [], isAdmin: !!admin, unread: unread?.count || 0, proAgreement, idRequired: idSetting?.value === "true", ready: true });
}

export const role = () => state.user?.user_metadata?.role || (state.memberships.length ? "organisation" : "professional");
export const homeFor = () => (!state.user ? "#home" : state.memberships.length ? "#org" : state.profile ? "#workspace" : state.isAdmin ? "#admin" : "#onboarding");

export function errorMessage(err) {
  const msg = String(err?.message || err || "");
  if (err?.code === "23505") return "This has already been saved. Refresh to see the current status.";
  if (err?.code === "42501" || /row-level security/i.test(msg)) return "You don’t have permission to do that. Check that your profile or organisation is approved.";
  if (err?.status === 429 || /rate limit/i.test(msg)) return "Too many attempts. Please wait a few minutes and try again.";
  if (/Invalid login credentials/i.test(msg)) return "That email and password don’t match an account.";
  if (/Email not confirmed/i.test(msg)) return "Please confirm your email first. Check your inbox for the link we sent.";
  if (/Failed to fetch|NetworkError/i.test(msg)) return "We couldn’t reach Handova. Check your connection and try again.";
  if (err?.code === "23514") return "Some details don’t meet the requirements. Check the form and try again.";
  return msg || "Something went wrong. Please try again.";
}

let toastTimer;
export function toast(message, isError = false) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toastTimer);
  // Errors stay longer, so slower readers can finish them.
  toastTimer = setTimeout(() => t.classList.remove("show"), isError ? 10000 : Math.min(12000, Math.max(4500, String(message).length * 70)));
}

let lastFocus = null;
// Typed text in a dialog is never lost by accident. A tap outside a dialog with typing doesn't close it, and whatever
// was typed is kept as a draft for this browser tab, so closing it (or going back) and reopening brings it back.
// Successful submission clears the draft. Passwords, signatures and "type DELETE" boxes are never kept.
const DRAFTS = "hv-dialog-drafts";
const NO_DRAFT = new Set(["signin", "signup", "reset", "new-password", "change-password", "resend-confirm", "confirm-delete", "admin-org-delete", "admin-contrib-delete", "rs-del", "sign"]);
const draftKey = (f) => (f?.dataset?.form && !NO_DRAFT.has(f.dataset.form) ? `${f.dataset.form}:${f.dataset.id || ""}` : "");
const readDrafts = () => { try { return JSON.parse(sessionStorage.getItem(DRAFTS)) || {}; } catch { return {}; } };
const writeDrafts = (d) => { try { sessionStorage.setItem(DRAFTS, JSON.stringify(d)); } catch {} };
const keepable = (el) => el.name && !el.disabled && !["hidden", "password", "file", "submit", "button"].includes(el.type) && el.name !== "confirm";
export function saveDialogDraft(form) {
  const k = draftKey(form);
  if (!k) return;
  const vals = {};
  let typed = false;
  for (const el of form.elements) {
    if (!keepable(el)) continue;
    if (el.type === "checkbox" || el.type === "radio") { (vals[el.name] ||= []); if (el.checked) vals[el.name].push(el.value); }
    else { vals[el.name] = el.value; if (el.tagName === "TEXTAREA" || el.type === "text") typed ||= el.value.trim().length > 0; }
  }
  const d = readDrafts();
  if (typed) d[k] = vals; else delete d[k];
  writeDrafts(d);
}
export function clearDialogDraft(form) {
  const k = draftKey(form);
  if (!k) return;
  const d = readDrafts();
  if (k in d) { delete d[k]; writeDrafts(d); }
}
function restoreDialogDrafts(root) {
  const d = readDrafts();
  root.querySelectorAll("form[data-form]").forEach((f) => {
    const vals = d[draftKey(f)];
    if (!vals) return;
    for (const el of f.elements) {
      if (!keepable(el) || !(el.name in vals)) continue;
      if (el.type === "checkbox" || el.type === "radio") el.checked = [].concat(vals[el.name]).includes(el.value);
      else el.value = vals[el.name];
    }
    f.insertAdjacentHTML("afterbegin", `<p class="notice draft-note" role="status"><span>We kept what you typed last time.</span> <button type="button" class="link-btn" data-action="clear-draft">Start again</button></p>`);
    root.closest("dialog")?.setAttribute("data-dirty", "1");
  });
}
export function openDialog(title, body) {
  const d = $("#dialog");
  lastFocus = document.activeElement;
  d.removeAttribute("data-dirty");
  $("#dialog-body").innerHTML = `<h2 id="dialog-title">${title}</h2>${body}`;
  restoreDialogDrafts($("#dialog-body"));
  if (!d.open) d.showModal();
  (d.querySelector("[autofocus]") || d.querySelector("input, textarea, select, button:not(.dialog-close, .link-btn)"))?.focus();
}
export function closeDialog() {
  const d = $("#dialog");
  if (d.open) d.close();
  d.removeAttribute("data-dirty");
  lastFocus?.focus?.();
}

export const go = (hash) => {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = hash;
};

// Run a form submission with busy state and inline errors.
export async function withForm(form, fn) {
  const btn = form.querySelector("[type=submit]");
  const err = form.querySelector(".form-error");
  if (err) err.textContent = "";
  form.querySelectorAll(".field-error").forEach((x) => x.remove());
  form.querySelectorAll("[aria-invalid]").forEach((x) => x.removeAttribute("aria-invalid"));
  if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Working…"; }
  try {
    const out = await fn(new FormData(form));
    clearDialogDraft(form);
    return out;
  } catch (error) {
    // Several problems at once: mark each field, then one summary for screen readers.
    const many = Array.isArray(error?.fields) && error.fields.length ? error.fields : null;
    if (many) many.forEach(([el, msg], i) => showFieldError(el, msg, i === 0));
    else if (error?.field) showFieldError(error.field, errorMessage(error), true);
    const msg = many ? (many.length === 1 ? many[0][1] : `Please fix the ${many.length} highlighted fields.`) : errorMessage(error);
    if (err) { err.textContent = msg; if (!error?.field && !many) err.scrollIntoView({ block: "nearest" }); }
    else if (!error?.field && !many) toast(msg, true);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
  }
}

// An error tied to one field: withForm shows it right under that field and scrolls there,
// so people never lose sight of what needs fixing.
export function fieldError(el, message) {
  const err = Error(message);
  err.field = el;
  return err;
}
function showFieldError(el, message, first = true) {
  const box = el.closest(".field, .checkbox-box, .lang-picker") || el.parentElement;
  const control = el.type === "hidden" ? box.querySelector("summary") : el;
  control?.setAttribute("aria-invalid", "true");
  const note = document.createElement("p");
  note.className = "field-error";
  // Announced once, by the form's summary; here it is linked to the field so it is read on focus.
  note.id = `${control?.id || el.name || "f"}-err`;
  note.textContent = message;
  box.appendChild(note);
  if (control) control.setAttribute("aria-describedby", [control.getAttribute("aria-describedby"), note.id].filter(Boolean).join(" "));
  if (!first) return;
  box.scrollIntoView({ block: "center", behavior: "smooth" });
  try { control?.focus({ preventScroll: true }); } catch {}
}
// Several field problems found in one pass.
export function fieldErrors(list) {
  const err = Error(list[0]?.[1] || "Please check the form.");
  err.fields = list;
  return err;
}
// Plain, translatable wording for the first invalid field.
export function fieldProblem(el) {
  const v = el.validity || {};
  if (v.valueMissing) return el.type === "checkbox" ? "Please tick this box to continue." : "Please fill in this field.";
  if (v.tooShort) return `Please write at least ${el.minLength} characters.`;
  if (v.tooLong) return `Please keep this under ${el.maxLength} characters.`;
  if (v.rangeUnderflow && el.type === "date") return "Please choose a date from today onwards.";
  return el.validationMessage || "Please check this field.";
}

export function invalidMessage(form, fallback = "Please complete the required fields.") {
  const el = form.querySelector(":invalid:not(fieldset):not(form)");
  if (!el) return fallback;
  const label = el.closest("label")?.querySelector("span")?.textContent?.replace("*", "").trim() || el.closest("fieldset")?.querySelector("legend")?.textContent?.trim() || "";
  if (el.type === "checkbox") return `Please tick: ${el.closest("label")?.textContent.trim().slice(0, 90)}`;
  return label ? `${label}: ${el.validationMessage}` : el.validationMessage || fallback;
}

export const val = (fd, k) => String(fd.get(k) ?? "").trim();
export { e };
