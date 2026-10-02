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

export async function loadSession() {
  const { data } = await db.auth.getSession();
  state.user = data.session?.user || null;
  if (!state.user) {
    Object.assign(state, { profile: null, memberships: [], isAdmin: false, unread: 0, proAgreement: null, ready: true });
    return;
  }
  const uid = state.user.id;
  const [profile, memberships, admin, unread, proAgreement] = await Promise.all([
    result(db.from("profiles").select("*").eq("user_id", uid).maybeSingle()).catch(() => null),
    result(db.from("organisation_members").select("organisation_id, role, full_name, organisation:organisations(*)").eq("user_id", uid)).catch(() => []),
    result(db.rpc("is_admin")).catch(() => false),
    db.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).is("read_at", null),
    // The latest professional agreement this person signed (version and date only).
    result(db.from("agreement_signatures").select("version,signed_at,full_name,hours_committed").eq("user_id", uid).eq("kind", "professional").order("signed_at", { ascending: false }).limit(1)).then((r) => r?.[0] || null).catch(() => null),
  ]);
  Object.assign(state, { profile, memberships: memberships || [], isAdmin: !!admin, unread: unread?.count || 0, proAgreement, ready: true });
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
export function toast(message) {
  const t = $("#toast");
  t.textContent = message;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 4500);
}

let lastFocus = null;
export function openDialog(title, body) {
  const d = $("#dialog");
  lastFocus = document.activeElement;
  $("#dialog-body").innerHTML = `<h2 id="dialog-title">${title}</h2>${body}`;
  if (!d.open) d.showModal();
  (d.querySelector("[autofocus]") || d.querySelector("input, textarea, select, button:not(.dialog-close)"))?.focus();
}
export function closeDialog() {
  const d = $("#dialog");
  if (d.open) d.close();
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
  if (btn) { btn.disabled = true; btn.dataset.label = btn.textContent; btn.textContent = "Working…"; }
  try {
    return await fn(new FormData(form));
  } catch (error) {
    if (err) { err.textContent = errorMessage(error); err.scrollIntoView({ block: "nearest" }); }
    else toast(errorMessage(error));
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = btn.dataset.label; }
  }
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
