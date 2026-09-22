import { createClient } from "@supabase/supabase-js";
import { escapeHTML as e, safeURL } from "./utils.js";
export { e, safeURL };
export const db = createClient(
  "https://jyvralzxqftdextjowwf.supabase.co",
  "sb_publishable_NmQmplLMn0ygXjttFrp3GQ_RPI6mrz-",
  { auth: { storageKey: "impact-accelerator-auth", flowType: "pkce" } },
);
export const state = {
  user: null,
  afterRender: () => {},
  render: async () => {},
};
export const $ = (s) => document.querySelector(s);
export const today = () => new Date().toISOString().slice(0, 10);
export const tags = (a) =>
  (a || []).map((x) => `<span class="tag">${e(x)}</span>`).join("");
export const initials = (n) =>
  e(
    (n || "?")
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join(""),
  );
export const date = (d) =>
  d
    ? new Date(d + "T12:00:00").toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Date not specified";
export const link = (url, label, cls = "") =>
  safeURL(url)
    ? `<a class="${cls}" href="${e(safeURL(url))}" target="_blank" rel="noopener noreferrer">${e(label)} ↗</a>`
    : "";
export const btn = (label, action, id = "", cls = "primary") =>
  `<button type="button" class="${cls}" data-action="${action}" data-id="${e(id)}">${label}</button>`;
export const empty = (title, copy, action = "") =>
  `<div class="empty"><h3>${title}</h3><p>${copy}</p>${action}</div>`;
export const head = (eyebrow, title, copy) =>
  `<div class="page-head"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1><p>${copy}</p></div>`;
export const field = (
  name,
  label,
  value = "",
  type = "text",
  required = false,
  extra = "",
) =>
  `<label>${label}${required ? " *" : ""}<input name="${name}" type="${type}" value="${e(value)}" ${required ? "required" : ""} ${extra}></label>`;
export const area = (name, label, value = "", required = false, max = 4000) =>
  `<label class="full">${label}${required ? " *" : ""}<textarea name="${name}" ${required ? "required" : ""} maxlength="${max}">${e(value)}</textarea></label>`;
export const select = (name, label, options, value = "") =>
  `<label>${label}<select name="${name}">${options
    .map((x) => {
      const [v, t] = Array.isArray(x) ? x : [x, x];
      return `<option value="${e(v)}" ${v === value ? "selected" : ""}>${e(t)}</option>`;
    })
    .join("")}</select></label>`;
export const check = (name, label, checked = false) =>
  `<label class="check full"><input type="checkbox" name="${name}" ${checked ? "checked" : ""}>${label}</label>`;
export const formEnd = (label = "Save changes") =>
  `<p class="form-error full" role="alert"></p><div class="actions full"><button class="primary" type="submit">${label}</button>${btn("Cancel", "close", "", "secondary")}</div>`;
let timer, previousFocus;
export function notify(message) {
  clearTimeout(timer);
  $("#notice").textContent = message;
  $("#notice").classList.add("visible");
  timer = setTimeout(() => $("#notice").classList.remove("visible"), 5000);
}
export function showDialog(title, body) {
  previousFocus = document.activeElement;
  $("#dialog-body").innerHTML = `<h2 id="dialog-title">${title}</h2>${body}`;
  if (!$("#dialog").open) $("#dialog").showModal();
  $("#dialog").querySelector("input,textarea,select,button")?.focus();
}
export function closeDialog() {
  $("#dialog").close();
  previousFocus?.focus();
}
export async function result(query) {
  const { data, error } = await query;
  if (error) throw error;
  return data;
}
export function errorMessage(err) {
  if (err?.code === "email_address_not_authorized")
    return "Account email delivery is not available for this address yet. Existing users can sign in. Please contact Ethical Bridge for account support.";
  if (err?.code === "over_email_send_rate_limit" || err?.status === 429)
    return "Too many requests. Please wait a few minutes before trying again.";
  if (err?.code === "23505")
    return "This has already been saved. Refresh the page to see its current status.";
  if (err?.code === "42501")
    return "You do not have permission for this action. Check your profile publication or organisation membership.";
  return (
    err?.message || "We could not complete this request. Please try again."
  );
}
export async function members() {
  if (!state.user) return [];
  return result(
    db
      .from("organisation_members")
      .select(
        "organisation_id,role,organisation:organisations(id,public_name,registered_name,status,slug)",
      )
      .eq("user_id", state.user.id),
  );
}
export async function profile() {
  return state.user
    ? result(
        db
          .from("ia_profiles")
          .select("*")
          .eq("user_id", state.user.id)
          .maybeSingle(),
      )
    : null;
}
export function needCard(n) {
  return `<article class="card">${n.example ? '<span class="example-label">Example</span>' : ""}<span class="status">${e(n.status === "open" && n.deadline && n.deadline < today() ? "Deadline passed" : n.status)}</span><small> · ${e(n.organisation?.public_name || n.organisation?.registered_name || "Organisation")}</small><h3><a href="#need/${n.id}">${e(n.title)}</a></h3><p>${e(n.output)}</p><div class="meta"><span>${n.hours} hours</span><span>${e(n.arrangement)}${n.location ? " · " + e(n.location) : ""}</span></div>${tags(n.skills)}<div class="actions"><a class="button secondary" href="#need/${n.id}">View need →</a></div></article>`;
}
export function talentCard(p) {
  return `<article class="card">${p.example ? '<span class="example-label">Example</span>' : ""}<div class="avatar">${initials(p.name)}</div><h3><a href="#profile/${p.user_id}">${e(p.name)}</a></h3><p>${e(p.headline || "Impact professional")}</p><div class="meta">${e(p.location || "Location not specified")} · ${e(p.arrangement)}</div>${tags(p.skills.slice(0, 5))}<p><small>${p.hours_available ? `${p.hours_available} hours available / month` : "Not currently available"}</small></p><div class="actions"><a class="button secondary" href="#profile/${p.user_id}">Profile & portfolio →</a></div></article>`;
}
export function portfolioCard(p, owner = false) {
  return `<article class="card portfolio-card ${p.featured ? "featured" : ""}"><div class="cover"><span>${e(p.work_type)}</span>${safeURL(p.imageURL ?? p.image) ? `<img src="${e(safeURL(p.imageURL ?? p.image))}" alt="${e(p.title)}" loading="lazy" referrerpolicy="no-referrer">` : ""}</div><div class="card-body"><span class="status">${p.featured ? "Featured work · " : ""}${owner ? (p.published ? "Public entry" : "Draft") : "Work sample"}</span><h3><a href="#work/${p.id}">${e(p.title)}</a></h3><div class="meta">${e(p.client)}${p.work_date ? " · " + date(p.work_date) : ""}</div><p>${e((p.outcome || p.description).slice(0, 180))}${(p.outcome || p.description).length > 180 ? "…" : ""}</p><div>${tags(p.skills.slice(0, 4))}</div><div class="actions"><a href="#work/${p.id}" class="button secondary">View work →</a>${owner ? btn("Edit", "edit-work", p.id, "text-button") : ""}</div></div></article>`;
}
export function workspaceTabs(active) {
  return `<nav class="tabs" aria-label="Workspace">${[
    ["workspace", "Overview"],
    ["hours", "Impact hours"],
    ["organisation", "Organisation"],
  ]
    .map(
      ([r, l]) =>
        `<a class="${active === r ? "active" : ""}" ${active === r ? 'aria-current="page"' : ""} href="#${r}">${l}</a>`,
    )
    .join("")}</nav>`;
}
export function gate(copy) {
  return `${head("Your workspace", "Make room for meaningful work.", copy)}${empty("Sign in to continue", "Use your Ethical Bridge account, or create an account to start building your profile.", btn("Sign in / Join", "auth"))}`;
}
export function profileGate() {
  return (
    workspaceTabs("workspace") +
    empty(
      "Introduce yourself first",
      "Create a profile with your skills and availability. You can keep it private while you prepare to contribute.",
      btn("Create my profile", "edit-profile"),
    )
  );
}
