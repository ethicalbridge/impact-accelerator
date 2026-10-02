import { db, state, $, loadSession, closeDialog, toast, errorMessage, go, result, homeFor, e } from "./core.js";
import { header, footer, bindLanguagePickers, bindEntryEditors } from "./ui.js";
import { config } from "./config.js";
import { initConsent, trackPage } from "./consent.js";
import { enhance, bindHeader } from "./motion.js";
import * as pub from "./pages/public.js";
import * as acc from "./pages/account.js";
import * as ws from "./pages/workspace.js";
import * as eng from "./pages/engagement.js";
import * as adm from "./pages/admin.js";
import * as legal from "./pages/legal.js";

const LEGACY = { guide: "how", safeguarding: "safety", organisation: "org", hours: "workspace", portfolio: "workspace", dashboard: "workspace", pool: "workspace", projects: "needs", "organisation-view": "org" };
const ACTIVE = { about: "#about", needs: "#needs", need: "#needs", talent: "#talent", profile: "#talent", how: "#how", organisations: "#how", professionals: "#how" };

function parse() {
  const raw = decodeURIComponent(location.hash.slice(1) || "home");
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const name = LEGACY[parts[0]] || parts[0] || "home";
  return { name, a: parts[1], b: parts[2], params: new URLSearchParams(query) };
}

async function page(r) {
  switch (r.name) {
    case "home": return pub.home();
    case "about": return pub.about();
    case "organisations": return r.a ? pub.orgPage(r.a) : pub.organisations();
    case "professionals": return pub.professionals();
    case "needs": return pub.needs();
    case "need": return r.a ? pub.need(r.a) : { redirect: "#needs" };
    case "talent": return pub.talent();
    case "profile": return r.a ? pub.profile(r.a) : { redirect: "#talent" };
    case "how": return pub.how();
    case "join": return acc.join(r.params);
    case "signin": return acc.signin(r.params);
    case "reset": return acc.reset();
    case "onboarding": return acc.onboarding();
    case "account": return acc.account();
    case "workspace": return ws.workspace(r.a);
    case "org": return ws.org(r.a, r.b);
    case "agreement": return r.a ? eng.agreement(r.a) : { redirect: homeFor() };
    case "conversation": return r.a ? eng.conversation(r.a) : { redirect: homeFor() };
    case "conversation-for": return eng.conversationFor(r.a, r.b);
    case "notifications": return adm.notifications();
    case "admin": return adm.admin();
    case "privacy": return legal.privacy();
    case "terms": return legal.terms();
    case "cookies": return legal.cookies();
    case "safety": return legal.safety();
    case "report": return legal.report();
    default: return pub.notFound();
  }
}

let version = 0;
async function render() {
  const v = ++version;
  const r = parse();
  if (LEGACY[location.hash.slice(1).split(/[/?]/)[0]]) { history.replaceState(null, "", "#" + [r.name, r.a, r.b].filter(Boolean).join("/")); }
  $("#site-header").innerHTML = header(r.name === "organisations" && r.a ? "#needs" : ACTIVE[r.name]);
  const main = $("#main");
  main.setAttribute("aria-busy", "true");
  try {
    const out = await page(r);
    if (v !== version) return;
    if (out.redirect) { location.replace(out.redirect.startsWith("#") ? out.redirect : "#" + out.redirect); return; }
    main.innerHTML = out.html;
    document.title = `${out.title} · Handova`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = out.description || "Skilled professionals contributing to the needs locally led organisations define. Free for everyone.";
    out.after?.();
    enhance(main, r.name);
    trackPage(out.title);
  } catch (err) {
    if (v !== version) return;
    console.error(err);
    main.innerHTML = `<div class="wrap page-head" style="padding-bottom:120px"><span class="eyebrow">Something went wrong</span><h1>We couldn’t load this page</h1><p class="lead">${e(errorMessage(err))}</p><div class="row"><button class="btn" type="button" data-action="reload">Try again</button><a class="btn secondary" href="#home">Go home</a></div></div>`;
    document.title = "Something went wrong · Handova";
  } finally {
    main.removeAttribute("aria-busy");
  }
  if (!r.params.has("keep-scroll")) window.scrollTo({ top: 0, behavior: "instant" });
  if (!firstRender) main.focus({ preventScroll: true });
  firstRender = false;
}
let firstRender = true;

// ---------- actions ----------
const rpc = async (fn, args, message, next) => { await result(db.rpc(fn, args)); await loadSession(); if (message) toast(message); go(next || location.hash); };
const actions = {
  reload: () => render(),
  "scroll-to": (el) => document.getElementById(el.dataset.id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }),
  close: () => closeDialog(),
  menu: (el) => { const n = $("#main-nav"); const open = n.classList.toggle("open"); el.setAttribute("aria-expanded", String(open)); },
  signout: async () => { await db.auth.signOut(); await loadSession(); toast("Signed out."); go("#home"); },
  "clear-filters": () => $("#filters")?.reset(),
  "copy-link": async () => { try { await navigator.clipboard.writeText(location.href); toast("Link copied."); } catch { prompt("Copy this link", location.href); } },
  print: () => window.print(),
  apply: (el) => pub.applyDialog(el.dataset.id),
  "save-need": async (el) => {
    if (!state.user) return go("#signin");
    const id = el.dataset.id;
    const existing = await result(db.from("saved_needs").select("need_id").eq("user_id", state.user.id).eq("need_id", id).maybeSingle());
    await result(existing ? db.from("saved_needs").delete().eq("user_id", state.user.id).eq("need_id", id) : db.from("saved_needs").insert({ user_id: state.user.id, need_id: id }));
    toast(existing ? "Removed from saved needs." : "Saved to your workspace.");
    render();
  },
  invite: (el) => ws.inviteDialog(el.dataset.id),
  introduce: (el) => ws.introduceDialog(el.dataset.id, el.dataset.name),
  report: (el) => ws.reportDialog(el.dataset.type, el.dataset.id),
  withdraw: (el) => ws.decisionDialog("Withdraw your application?", "The organisation will see that you withdrew, and the conversation will close.", "withdraw", el.dataset.id, "", "Withdraw"),
  "invite-accept": (el) => ws.decisionDialog("Accept this invitation?", "This creates a contribution agreement. You both sign it before any work starts.", "invite-accept", el.dataset.id, "", "Accept"),
  "invite-decline": (el) => ws.decisionDialog("Decline this invitation?", "The organisation will see your decision, and the conversation will close.", "invite-decline", el.dataset.id, "", "Decline"),
  "app-accept": (el) => ws.decisionDialog("Accept this application?", "This creates a contribution agreement for both of you to sign. When all places are filled, the need closes to new applications.", "app-accept", el.dataset.id, "", "Accept"),
  "app-decline": (el) => ws.decisionDialog("Decline this application?", "The professional will be told they were not selected, and the conversation will close.", "app-decline", el.dataset.id, "", "Decline"),
  "hours-approve": (el) => rpc("review_hours", { p_id: el.dataset.id, p_approve: true, p_note: "" }, "Hours approved."),
  "hours-changes": (el) => ws.decisionDialog("Request changes", "Explain what needs to change. The professional can submit a corrected entry.", "hours-changes", el.dataset.id, `<label class="field" for="f-note">What needs to change<textarea id="f-note" name="note" required minlength="5" maxlength="2000"></textarea></label>`, "Send"),
  complete: (el) => ws.completeDialog(el.dataset.id),
  "end-engagement": (el) => ws.decisionDialog("End this engagement?", "Use this if the work can’t go ahead. Both of you will be notified and the conversation will close.", "end-engagement", el.dataset.id, "", "End engagement", true),
  "close-need": (el) => ws.decisionDialog("Close this need?", "It will stop accepting applications. Existing applications and engagements are kept.", "close-need", el.dataset.id, "", "Close need"),
  "close-conversation": (el) => ws.decisionDialog("End this conversation?", "Neither of you will be able to send more messages. The history is kept.", "close-conversation", el.dataset.id, "", "End conversation"),
  followup: (el) => ws.decisionDialog("Is the work still in use?", "Six months ago this engagement was completed. Your answer helps show what lasts. It is not shown publicly.", "followup", el.dataset.id, `<fieldset><legend>Are you still using what was delivered?</legend><label class="check"><input type="radio" name="in_use" value="yes" required><span>Yes</span></label><label class="check"><input type="radio" name="in_use" value="no"><span>No</span></label></fieldset><label class="field" for="f-fnote">Anything to add? (optional)<textarea id="f-fnote" name="note" maxlength="1000"></textarea></label>`, "Save answer"),
  "toggle-public": async (el) => { try { await result(db.rpc("set_contribution_visibility", { p_id: el.dataset.id, p_public: el.checked })); toast(el.checked ? "Added to your public CV." : "Removed from your public CV."); } catch (err) { el.checked = !el.checked; toast(errorMessage(err)); } },
  "switch-org": (el) => { sessionStorage.setItem("ia-org", el.value); render(); },
  "switch-role": async (el) => { await db.auth.updateUser({ data: { role: el.dataset.id } }); await loadSession(); render(); },
  "read-one": async (el) => { await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", el.dataset.id); state.unread = Math.max(0, state.unread - 1); },
  "read-all": async () => { await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", state.user.id).is("read_at", null); state.unread = 0; render(); },
  "admin-org": (el) => adm.adminDecision("org", el.dataset.id, el.dataset.decision),
  "admin-profile": (el) => adm.adminDecision("profile", el.dataset.id, el.dataset.decision),
  "admin-report": (el) => rpc("admin_update_report", { p_id: el.dataset.id, p_status: el.dataset.status, p_note: "" }, "Report updated."),
  "delete-account": () => acc.deleteAccount(),
  "cookie-settings": () => initConsent(true),
};

const forms = {
  signup: (f) => acc.submitAccount("signup", f), signin: (f) => acc.submitAccount("signin", f), reset: (f) => acc.submitAccount("reset", f),
  "new-password": (f) => acc.submitAccount("new-password", f), "change-password": (f) => acc.submitAccount("change-password", f), "email-settings": (f) => acc.submitAccount("email-settings", f),
  "org-create": (f) => acc.submitAccount("org-create", f), "org-edit": (f) => acc.submitAccount("org-edit", f), profile: (f) => acc.submitAccount("profile", f),
  "confirm-delete": (f) => acc.confirmDelete(f),
  apply: (f) => pub.submitApply(f), invite: (f) => ws.submitInvite(f), introduce: (f) => ws.submitIntroduce(f), report: (f) => ws.submitReport(f), need: (f) => ws.submitNeed(f),
  sign: (f) => eng.submitEngagement("sign", f), "log-hours": (f) => eng.submitEngagement("log-hours", f), message: (f) => eng.submitEngagement("message", f),
  "admin-org": (f) => adm.submitAdmin("admin-org", f), "admin-profile": (f) => adm.submitAdmin("admin-profile", f),
};
const confirmRpc = {
  withdraw: ["withdraw_application", (id) => ({ p_id: id }), "Application withdrawn."],
  "invite-accept": ["respond_invitation", (id) => ({ p_id: id, p_accept: true }), "Invitation accepted. Please sign the agreement."],
  "invite-decline": ["respond_invitation", (id) => ({ p_id: id, p_accept: false }), "Invitation declined."],
  "app-accept": ["decide_application", (id) => ({ p_id: id, p_accept: true }), "Application accepted. Please sign the agreement."],
  "app-decline": ["decide_application", (id) => ({ p_id: id, p_accept: false }), "Application declined."],
  "hours-changes": ["review_hours", (id, fd) => ({ p_id: id, p_approve: false, p_note: String(fd.get("note") || "") }), "Changes requested."],
  "end-engagement": ["end_engagement", (id) => ({ p_id: id, p_reason: "" }), "Engagement ended."],
  "close-conversation": ["close_conversation", (id) => ({ p_id: id }), "Conversation ended."],
  complete: ["complete_engagement", (id, fd) => ({ p_id: id, p_deliverables: String(fd.get("deliverables") || ""), p_endorsement: String(fd.get("endorsement") || ""), p_role: String(fd.get("role") || ""), p_rating: Number(fd.get("rating")) }), "Engagement completed and endorsed. Thank you."],
  followup: ["answer_followup", (id, fd) => ({ p_id: id, p_in_use: fd.get("in_use") === "yes", p_note: String(fd.get("note") || "") }), "Thank you. Your answer is saved."],
};

document.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-action]");
  if (!el) {
    if (!ev.target.closest(".account-menu")) document.querySelectorAll(".account-menu[open]").forEach((d) => d.removeAttribute("open"));
    return;
  }
  const fn = actions[el.dataset.action];
  if (!fn || el.tagName === "SELECT") return;
  if (el.tagName === "BUTTON" || el.tagName === "A" && el.dataset.action !== "read-one") ev.preventDefault();
  if (el.dataset.action === "read-one") { fn(el); return; }
  if (el.type === "checkbox") { fn(el); return; }
  el.setAttribute("aria-disabled", "true");
  try { await fn(el); } catch (err) { toast(errorMessage(err)); } finally { el.removeAttribute("aria-disabled"); }
});
document.addEventListener("change", (ev) => { if (ev.target.matches("select[data-action]")) actions[ev.target.dataset.action]?.(ev.target); });
document.addEventListener("submit", async (ev) => {
  const f = ev.target;
  const kind = f.dataset.form;
  if (!kind) return;
  ev.preventDefault();
  if (forms[kind]) return forms[kind](f);
  if (confirmRpc[kind]) {
    const [fn, args, msg] = confirmRpc[kind];
    const { withForm } = await import("./core.js");
    return withForm(f, async (fd) => { if (!f.checkValidity()) { f.reportValidity(); throw Error("Please complete the form."); } await result(db.rpc(fn, args(f.dataset.id, fd))); closeDialog(); await loadSession(); toast(msg); render(); });
  }
  if (kind === "close-need") {
    const { withForm } = await import("./core.js");
    return withForm(f, async () => { await result(db.from("needs").update({ status: "closed" }).eq("id", f.dataset.id)); closeDialog(); toast("Need closed."); render(); });
  }
});

$("#dialog").addEventListener("click", (ev) => { if (ev.target.closest(".dialog-close") || ev.target === $("#dialog")) closeDialog(); });
window.addEventListener("hashchange", () => { if ($("#dialog").open) $("#dialog").close(); render(); });
db.auth.onAuthStateChange(async (event) => {
  if (event === "PASSWORD_RECOVERY") setTimeout(acc.newPasswordDialog, 50);
  if (event === "SIGNED_IN" && state.ready && !state.user) { await loadSession(); render(); }
});

$(".skip").addEventListener("click", (ev) => { ev.preventDefault(); $("#main").focus(); $("#main").scrollIntoView(); });
$("#site-footer").innerHTML = footer(config);
try { await loadSession(); } catch { toast("Your session could not be restored. Please sign in again."); }
initConsent();
bindHeader();
bindLanguagePickers();
bindEntryEditors();
acc.bindPhotoFields();
render();
