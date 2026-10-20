import { db, state, $, loadSession, closeDialog, saveDialogDraft, clearDialogDraft, toast, errorMessage, go, result, homeFor, e } from "./core.js";
import { header, footer, bindLanguagePickers, bindEntryEditors, toggleMenu, jumpTo } from "./ui.js";
import { config } from "./config.js";
import { loadLang, initialLang, startTranslating, setLang, t } from "./i18n.js";
import { initConsent, trackPage } from "./consent.js";
import { enhance, bindHeader } from "./motion.js";
import * as pub from "./pages/public.js";
import * as acc from "./pages/account.js";
import * as ws from "./pages/workspace.js";
import * as eng from "./pages/engagement.js";
import * as rsp from "./pages/responses.js";
import * as adl from "./pages/adminlists.js";
import * as adm from "./pages/admin.js";
import * as legal from "./pages/legal.js";

const LEGACY = { guide: "how", safeguarding: "safety", organisation: "org", hours: "workspace", portfolio: "workspace", dashboard: "workspace", pool: "workspace", projects: "needs", "organisation-view": "org" };
const ACTIVE = { about: "#about", needs: "#needs", need: "#needs", talent: "#talent", profile: "#talent", how: "#how", organisations: "#how", professionals: "#how" };

function parse() {
  let raw = decodeURIComponent(location.hash.slice(1) || "home");
  if (/^error=|^error_code=|[&]error_code=/.test(raw)) raw = "email-confirmed?" + raw;
  const [path, query = ""] = raw.split("?");
  const parts = path.split("/").filter(Boolean);
  const name = LEGACY[parts[0]] || parts[0] || "home";
  return { name, a: parts[1], b: parts[2], params: new URLSearchParams(query) };
}

async function page(r) {
  switch (r.name) {
    case "home": return pub.home();
    case "about": return ["ethical-bridge", "founder", "faq"].includes(r.a) ? pub.about(r.a) : pub.about("mission");
    case "organisations": return r.a ? pub.orgPage(r.a) : pub.organisations();
    case "professionals": return pub.professionals();
    case "needs": return pub.needs();
    case "need": return r.a ? pub.need(r.a) : { redirect: "#needs" };
    case "talent": return pub.talent(r.params);
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
    case "admin-responses": return rsp.responses(r.params);
    case "admin-list": return adl.adminList(r.a, r.params);
    case "verify-done": return acc.verifyDone();
    case "email-confirmed": return acc.emailConfirmed(r.params);
    case "privacy": return legal.privacy();
    case "terms": return legal.terms();
    case "cookies": return legal.cookies();
    case "safety": return legal.safety();
    case "report": return legal.report();
    case "contact": return legal.contact();
    case "policies": return r.a ? legal.policy(r.a) : legal.policies();
    case "agreements": return legal.agreements(r.a);
    default: return pub.notFound();
  }
}

let version = 0;
// Professionals who have not verified their identity get a short prompt, at most once a week.
function idNudge(route) {
  const p = state.profile;
  if (!p || p.id_status === "approved" || ["in_review", "name_mismatch"].includes(p.id_status) || ["verify-done", "signin", "join", "onboarding"].includes(route)) return;
  // At most once a week, and only before they have an agreement to sign (the agreement page asks then).
  const key = "hv-id-nudge-" + state.user.id;
  try { const last = Number(localStorage.getItem(key) || 0); if (Date.now() - last < 7 * 864e5) return; localStorage.setItem(key, String(Date.now())); } catch { return; }
  acc.idNudgeDialog();
}

async function render() {
  const v = ++version;
  const r = parse();
  if (LEGACY[location.hash.slice(1).split(/[/?]/)[0]]) { history.replaceState(null, "", "#" + [r.name, r.a, r.b].filter(Boolean).join("/")); }
  document.documentElement.classList.toggle("signed-in", !!state.user);
  $("#site-header").innerHTML = header(r.name === "organisations" && r.a ? "#needs" : (r.name === "about" && r.a === "faq") || ["safety", "report"].includes(r.name) ? "#about/faq" : r.name === "contact" ? "#contact" : r.name === "policies" ? "#about" : ACTIVE[r.name]);
  const main = $("#main");
  const staticHome = r.name === "home" && main.dataset.staticHome === "1";
  if (!staticHome) main.setAttribute("aria-busy", "true");
  try {
    const out = await page(r);
    if (v !== version) return;
    if (out.redirect) { location.replace(out.redirect.startsWith("#") ? out.redirect : "#" + out.redirect); return; }
    if (!staticHome) {
      main.innerHTML = out.html;
    }
    delete main.dataset.staticHome;
    document.title = `${t(out.title)} · Handova`;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.content = t(out.description || "Skilled professionals contributing to the needs locally led organisations define. Free for everyone.");
    out.after?.();
    enhance(main, r.name);
    // A link can ask the next page to bring one element into view (e.g. the "publish" box at the end of a long form).
    try { const f = sessionStorage.getItem("hv-focus"); if (f) { sessionStorage.removeItem("hv-focus"); const el = document.getElementById(f); if (el) { el.scrollIntoView({ block: "center" }); el.focus?.({ preventScroll: true }); el.closest(".checkbox-box, section, .card")?.classList.add("flash"); } } } catch {}
    idNudge(r.name);
    trackPage();
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
const REASON = (hint) => `<label class="field" for="f-reason">Reason<textarea id="f-reason" name="reason" required minlength="5" maxlength="1000"></textarea><span class="hint">${hint}</span></label>`;
const actions = {
  reload: () => render(),
  "set-lang": (el) => setLang(el.dataset.id),
  "scroll-to": (el) => { el.closest("details.toc-m")?.removeAttribute("open"); jumpTo(el.dataset.id); },
  close: () => closeDialog(),
  "clear-draft": (el) => { const f = el.closest("form"); if (!f) return; clearDialogDraft(f); f.reset(); el.closest(".draft-note")?.remove(); $("#dialog").removeAttribute("data-dirty"); },
  menu: (el) => toggleMenu(el),
  signout: async () => { await db.auth.signOut(); await loadSession(); toast("Signed out."); go("#home"); },
  "clear-filters": () => $("#filters")?.reset(),
  "more-filters": (el) => { const f = el.closest("form"); const on = f.classList.toggle("show-more"); el.setAttribute("aria-expanded", String(on)); el.textContent = t(on ? "Fewer filters" : "More filters"); },
  "verify-id": (el) => acc.startIdCheck(el),
  "id-video": () => acc.requestIdVideo(),
  "mfa-enroll": () => acc.mfaEnroll(),
  "mfa-code": () => acc.mfaDialog(location.hash),
  "admin-id": async (el) => { await result(db.rpc("admin_confirm_identity", { p_user: el.dataset.id, p_approve: el.dataset.ok === "1" })); toast("Identity decision saved."); render(); },
  "copy-link": async () => { try { await navigator.clipboard.writeText(location.href); toast("Link copied."); } catch { prompt("Copy this link", location.href); } },
  print: () => window.print(),
  "goto-focus": (el) => { try { sessionStorage.setItem("hv-focus", el.dataset.target); } catch {} if (el.dataset.href && location.hash !== el.dataset.href) go(el.dataset.href); else { const t = document.getElementById(el.dataset.target); t?.scrollIntoView({ block: "center" }); t?.focus?.({ preventScroll: true }); } },
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
  // Shown to everyone who is not yet an approved organisation: explains the next step instead of hiding the option.
  "invite-cta": (el) => {
    if (!state.user) { toast("Sign in or join as an organisation to invite professionals."); go(`#signin?role=organisation&next=${encodeURIComponent(location.hash)}`); return; }
    if (!state.memberships.length) { go("#onboarding"); toast("Set up your organisation first. Once we approve it, you can invite professionals."); return; }
    if (el.dataset.sample === "1") { toast("Invitations open as soon as this profile is approved."); return; }
    toast("Your organisation is being reviewed. You can invite professionals as soon as it is approved, usually within two working days.");
  },
  introduce: (el) => ws.introduceDialog(el.dataset.id, el.dataset.name),
  report: (el) => ws.reportDialog(el.dataset.type, el.dataset.id),
  withdraw: (el) => ws.decisionDialog("Withdraw your application?", "The organisation will see that you withdrew, and the conversation will close. You can’t apply to this need again.", "withdraw", el.dataset.id, "", "Withdraw"),
  "invite-accept": (el) => ws.decisionDialog("Accept this invitation?", "This creates a contribution agreement. You both sign it before any work starts.", "invite-accept", el.dataset.id, "", "Accept"),
  "invite-decline": (el) => ws.decisionDialog("Decline this invitation?", "The organisation will see your decision, and the conversation will close.", "invite-decline", el.dataset.id, "", "Decline"),
  "app-accept": (el) => ws.decisionDialog("Accept this application?", "This creates a contribution agreement for both of you to sign. When all places are filled, the need stops taking applications and anyone still waiting is told.", "app-accept", el.dataset.id, "", "Accept"),
  "app-decline": (el) => ws.decisionDialog("Decline this application?", "The professional will be told they were not selected, and the conversation will close.", "app-decline", el.dataset.id, "", "Decline"),
  "hours-approve": (el) => rpc("review_hours", { p_id: el.dataset.id, p_approve: true, p_note: "" }, "Hours approved."),
  "hours-changes": (el) => ws.decisionDialog("Ask for changes", "Explain what needs to change. The professional can send a corrected entry.", "hours-changes", el.dataset.id, `<label class="field" for="f-note">What needs to change<textarea id="f-note" name="note" required minlength="5" maxlength="2000"></textarea></label>`, "Send"),
  "hours-amend": (el) => { const d = el.dataset; const today = new Date().toISOString().slice(0, 10); ws.decisionDialog("Correct this time entry", "Change what the organisation asked for. The entry goes back to them for review.", "hours-amend", d.id, `<div class="form-grid"><label class="field" for="f-ad">Date<input id="f-ad" name="work_date" type="date" required max="${today}" value="${e(d.date)}"></label><label class="field" for="f-ah">Hours<input id="f-ah" name="hours" type="number" required min="0.25" max="12" step="0.25" value="${e(d.hours)}"></label></div><label class="field" for="f-adesc">What you did<textarea id="f-adesc" name="description" required minlength="10" maxlength="2000">${e(d.desc)}</textarea></label><label class="field" for="f-aev">Supporting link (optional)<input id="f-aev" name="evidence" type="url" maxlength="500" placeholder="https://" value="${e(d.evidence)}"></label>`, "Send for review"); },
  complete: (el) => ws.completeDialog(el.dataset.id),
  "mark-delivered": (el) => ws.decisionDialog("Tell the organisation everything is delivered?", "Only do this when everything in the agreement has been handed over. The organisation is asked to check the work, then finish and write your endorsement. They’re reminded after 7 and 14 days, and Handova can see it.", "mark-delivered", el.dataset.id, "", "Yes, everything is delivered"),
  "end-engagement": (el) => ws.decisionDialog("End this contribution?", "Use this if the work can’t go ahead. You are both notified, Handova is told, and the conversation closes. This can’t be undone.", "end-engagement", el.dataset.id, `<label class="field" for="f-reason">Why is it ending?<textarea id="f-reason" name="reason" required minlength="5" maxlength="1000"></textarea><span class="hint">Both of you see this reason, and it is kept with the agreement.</span></label>`, "End contribution", true),
  "close-need": (el) => ws.decisionDialog("Stop applications?", "The need stops taking applications. Anyone still waiting for an answer is told it has closed. People already working on it are not affected.", "close-need", el.dataset.id, "", "Stop applications"),
  "need-submit": (el) => ws.submitForReview(el.dataset.id),
  "need-revise": (el) => ws.reviseDialog(el.dataset.id),
  "first-call": (el) => ws.firstCallDialog(el.dataset.id),
  "endorse-correction": (el) => ws.correctionDialog(el.dataset.id),
  "endorse-edit": (el) => ws.editEndorsementDialog(el.dataset.id),
  "insert-starter": (el) => { const ta = el.closest("form")?.querySelector("textarea[name=endorsement]"); if (!ta) return; const add = (el.textContent.trim() || el.dataset.text).replace(/…$/, " "); const pos = ta.selectionStart ?? ta.value.length; const pre = ta.value.slice(0, pos); const max = Number(ta.getAttribute("maxlength")) || 1200; ta.value = (pre + (pre && !/\s$/.test(pre) ? " " : "") + add + ta.value.slice(pos)).slice(0, max); ta.focus(); ta.dispatchEvent(new Event("input")); },
  "close-conversation": (el) => ws.decisionDialog("End this conversation?", "Neither of you will be able to send more messages. The history is kept.", "close-conversation", el.dataset.id, "", "End conversation"),
  survey: (el) => ws.surveyDialog(el.dataset.id, el.dataset.kind, el.dataset.short),
  "survey-skip": (el) => ws.skipSurvey(el.dataset.id, el.dataset.kind),
  "staff-size": (el) => ws.staffSizeDialog(el.dataset.id),
  "hours-change": () => ws.hoursDialog(),
  "pw-toggle": (el) => { const inp = document.getElementById(el.getAttribute("aria-controls")); if (!inp) return; const show = inp.type === "password"; inp.type = show ? "text" : "password"; el.setAttribute("aria-pressed", String(show)); const lab = t(show ? "Hide password" : "Show password"); el.setAttribute("aria-label", lab); el.title = lab; el.classList.toggle("on", show); inp.focus(); },
  "cv-hide": async (el) => {
    const hide = !!el.dataset.hide, id = el.dataset.id;
    if (el.dataset.live) await result(db.rpc("set_contribution_visibility", { p_id: id, p_public: !hide }));
    else {
      const cur = new Set(state.profile?.cv_hidden || []);
      if (hide) cur.add(id); else cur.delete(id);
      await result(db.from("profiles").update({ cv_hidden: [...cur] }).eq("user_id", state.user.id));
      await loadSession();
    }
    toast(hide ? "Removed from your impact CV. You can add it back at any time." : "Added back to your impact CV.");
    const open = document.querySelector('[data-profile-tab="contributions"][aria-selected="true"]');
    await render();
    if (open) document.querySelector('button[role="tab"][data-profile-tab="contributions"]')?.click();
  },
  "rs-export": (el) => rsp.exportCsv(el.dataset.tab),
  "rs-codebook": () => rsp.exportCodebook(),
  "rs-del": (el) => rsp.deleteResponseDialog(el.dataset.id, el.dataset.who),
  "career-stage": () => ws.careerStageDialog(),
  followup: (el) => ws.followupDialog(el.dataset.id),
  // The main way to put a finished contribution on the impact CV (the tick box stays for removing it again).
  "pf-back": (el) => acc.profileStep(el.closest("form"), 1),
  "cv-publish": async (el) => { try { await result(db.rpc("set_contribution_visibility", { p_id: el.dataset.id, p_public: true })); toast("Added to your impact CV."); render(); } catch (err) { toast(errorMessage(err)); } },
  "toggle-public": async (el) => { try { await result(db.rpc("set_contribution_visibility", { p_id: el.dataset.id, p_public: el.checked })); toast(el.checked ? "Added to your impact CV." : "Removed from your impact CV."); } catch (err) { el.checked = !el.checked; toast(errorMessage(err)); } },
  "switch-org": (el) => { sessionStorage.setItem("ia-org", el.value); render(); },
  "switch-role": async (el) => { await db.auth.updateUser({ data: { role: el.dataset.id } }); await loadSession(); render(); },
  "read-one": async (el) => { await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", el.dataset.id); state.unread = Math.max(0, state.unread - 1); },
  "read-all": async () => { await db.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", state.user.id).is("read_at", null); state.unread = 0; render(); },
  "admin-org": (el) => adm.adminDecision("org", el.dataset.id, el.dataset.decision),
  "admin-profile": (el) => adm.adminDecision("profile", el.dataset.id, el.dataset.decision),
  "admin-org-delete": (el) => adl.deleteOrgDialog(el.dataset.id, el.dataset.name, !!el.dataset.blocked),
  "admin-contrib-delete": (el) => adl.deleteContribDialog(el.dataset.id, el.dataset.title),
  "admin-contrib-close": (el) => adl.closeContribDialog(el.dataset.id, el.dataset.title),
  // Approve straight away; declining asks for an optional note to the organisation.
  "org-changes": async (el) => {
    if (el.dataset.approve) { await result(db.rpc("admin_review_org_changes", { p_id: el.dataset.id, p_approve: true, p_note: "" })); toast("Approved. The new details are live."); return render(); }
    const { openDialog } = await import("./core.js");
    openDialog("Decline these changes?", `<form class="form" data-form="org-changes-decline" data-id="${e(el.dataset.id)}"><p>The organisation keeps its current public details and is told.</p><div class="field"><label for="f-note">Note to the organisation (optional)</label><textarea id="f-note" name="note" maxlength="600"></textarea></div><div class="row"><button class="btn" type="submit">Decline changes</button><button class="btn secondary" type="button" data-action="close">Cancel</button></div></form>`);
  },
  "admin-need": (el) => adm.adminDecision("need", el.dataset.id, el.dataset.decision),
  "admin-report-resolve": (el) => ws.decisionDialog("Resolve this report?", "Write what was done, for the record: who you spoke to, what was decided, and whether anyone else was told. Only Handova sees this note.", "admin-report-resolve", el.dataset.id, `<label class="field" for="f-outcome">Outcome<textarea id="f-outcome" name="note" required minlength="10" maxlength="2000"></textarea></label>`, "Resolve report"),
  "admin-report": (el) => rpc("admin_update_report", { p_id: el.dataset.id, p_status: el.dataset.status, p_note: "" }, "Report updated."),
  // Admin safety tools (policies v1.0): every action asks for a reason, kept in the activity log.
  "admin-suspend": (el) => ws.decisionDialog("Suspend this person?", "Their profile goes offline and they can’t message, apply, accept invitations, log hours or sign until you lift it. They are told their account is suspended while Handova looks into a concern.", "admin-suspend", el.dataset.id, REASON("Kept in the activity log. Not shown to them."), "Suspend", true),
  "admin-remove": (el) => ws.decisionDialog("Remove this person from Handova?", "For a serious breach. Their profile goes offline, their impact CV entries are hidden, and the same verified identity is flagged if it tries to come back. They can ask for a review within 30 days.", "admin-remove", el.dataset.id, REASON("Kept in the activity log. Not shown to them."), "Remove", true),
  "admin-lift": (el) => ws.decisionDialog("Lift the suspension?", "They can use Handova again and publish their profile.", "admin-lift", el.dataset.id, `<label class="field" for="f-reason">Note (optional)<textarea id="f-reason" name="reason" maxlength="1000"></textarea></label>`, "Lift suspension"),
  "admin-freeze": (el) => ws.decisionDialog("Pause this conversation?", "Nobody can send new messages. Everything written so far is kept.", "admin-freeze", el.dataset.id, REASON("Kept in the activity log."), "Pause conversation", true),
  "admin-unfreeze": (el) => ws.decisionDialog("Reopen this conversation?", "Both sides can write again.", "admin-unfreeze", el.dataset.id, `<label class="field" for="f-reason">Note (optional)<textarea id="f-reason" name="reason" maxlength="500"></textarea></label>`, "Reopen"),
  "admin-takedown": (el) => ws.decisionDialog("Take down this need?", "It stops taking applications straight away, and anyone waiting is told. The organisation sees your reason.", "admin-takedown", el.dataset.id, REASON("The organisation sees this."), "Take down", true),
  "admin-hide-cv": (el) => ws.decisionDialog("Hide this impact CV entry?", "The entry and its endorsement come off the public impact CV, and the professional can’t publish it again until you restore it. They are told.", "admin-hide-cv", el.dataset.id, REASON("Kept in the activity log."), "Hide entry", true),
  "admin-restore-cv": (el) => ws.decisionDialog("Restore this impact CV entry?", "The professional can choose to show it on their impact CV again.", "admin-restore-cv", el.dataset.id, REASON("Kept in the activity log."), "Restore"),
  "admin-id-video": (el) => ws.decisionDialog("Confirm identity after a video call", "Only confirm if you saw a valid passport or ID card on camera and the face matched the person on the call.", "admin-id-video", el.dataset.id, `<label class="field" for="f-docname">Name exactly as on the ID<input id="f-docname" name="docname" required minlength="2" maxlength="160"></label>`, "Confirm identity"),
  "admin-case": (el) => adm.caseDialog(el.dataset.id),
  "delete-account": () => acc.deleteAccount(),
  "cookie-settings": () => initConsent(true),
};

const forms = {
  signup: (f) => acc.submitAccount("signup", f), signin: (f) => acc.submitAccount("signin", f), reset: (f) => acc.submitAccount("reset", f),
  "new-password": (f) => acc.submitAccount("new-password", f), "change-password": (f) => acc.submitAccount("change-password", f), "email-settings": (f) => acc.submitAccount("email-settings", f),
  "org-create": (f) => acc.submitAccount("org-create", f), "resend-confirm": (f) => acc.submitAccount("resend-confirm", f), "org-edit": (f) => acc.submitAccount("org-edit", f), "org-resign": (f) => acc.submitAccount("org-resign", f), "mfa-verify": (f) => acc.submitAccount("mfa-verify", f), "mfa-enroll-verify": (f) => acc.submitAccount("mfa-enroll-verify", f), profile: (f) => acc.submitAccount("profile", f),
  "confirm-delete": (f) => acc.confirmDelete(f), "public-report": (f) => legal.submitPublicReport(f),
  apply: (f) => pub.submitApply(f), invite: (f) => ws.submitInvite(f), introduce: (f) => ws.submitIntroduce(f), report: (f) => ws.submitReport(f), need: (f) => ws.submitNeed(f), "need-revise": (f) => ws.submitRevise(f), "first-call": (f) => ws.submitFirstCall(f), complete: (f) => ws.submitComplete(f), "endorse-correction": (f) => ws.submitCorrection(f), "endorse-edit": (f) => ws.submitEditEndorsement(f),
  sign: (f) => eng.submitEngagement("sign", f), "log-hours": (f) => eng.submitEngagement("log-hours", f), message: (f) => eng.submitEngagement("message", f),
  survey: (f) => ws.submitSurvey(f), "hours-change": (f) => ws.submitHours(f), "staff-size": (f) => ws.submitStaffSize(f), "career-stage": (f) => ws.submitCareerStage(f), followup: (f) => ws.submitFollowup(f),
  "admin-org": (f) => adm.submitAdmin("admin-org", f), "admin-case": (f) => adm.submitCase(f), "admin-org-delete": (f) => adl.submitDeleteOrg(f), "rs-del": (f) => rsp.submitDeleteResponse(f), "admin-contrib-delete": (f) => adl.submitDeleteContrib(f), "admin-contrib-close": (f) => adl.submitCloseContrib(f), "org-changes-decline": async (f) => { const { withForm } = await import("./core.js"); return withForm(f, async (fd) => { await result(db.rpc("admin_review_org_changes", { p_id: f.dataset.id, p_approve: false, p_note: String(fd.get("note") || "") })); closeDialog(); toast("Declined. The organisation has been told."); render(); }); }, "admin-profile": (f) => adm.submitAdmin("admin-profile", f), "admin-need": (f) => adm.submitAdmin("admin-need", f),
};
const confirmRpc = {
  withdraw: ["withdraw_application", (id) => ({ p_id: id }), "Application withdrawn."],
  "invite-accept": ["respond_invitation", (id) => ({ p_id: id, p_accept: true }), "Invitation accepted. Please sign the agreement."],
  "invite-decline": ["respond_invitation", (id) => ({ p_id: id, p_accept: false }), "Invitation declined."],
  "app-accept": ["decide_application", (id) => ({ p_id: id, p_accept: true }), "Application accepted. Please sign the agreement."],
  "app-decline": ["decide_application", (id) => ({ p_id: id, p_accept: false }), "Application declined."],
  "hours-changes": ["review_hours", (id, fd) => ({ p_id: id, p_approve: false, p_note: String(fd.get("note") || "") }), "Changes requested."],
  "hours-amend": ["amend_hours", (id, fd) => ({ p_id: id, p_date: String(fd.get("work_date") || ""), p_hours: Number(fd.get("hours")), p_description: String(fd.get("description") || ""), p_evidence: String(fd.get("evidence") || "").trim() }), "Corrected and sent for review."],
  "mark-delivered": ["mark_delivered", (id) => ({ p_id: id }), "Thank you. The organisation has been asked to finish and endorse."],
  "end-engagement": ["end_engagement", (id, fd) => ({ p_id: id, p_reason: String(fd.get("reason") || "") }), "Contribution ended."],
  "admin-report-resolve": ["admin_update_report", (id, fd) => ({ p_id: id, p_status: "resolved", p_note: String(fd.get("note") || "") }), "Report resolved."],
  "close-conversation": ["close_conversation", (id) => ({ p_id: id }), "Conversation ended."],
  "admin-suspend": ["admin_suspend_user", (id, fd) => ({ p_user: id, p_reason: String(fd.get("reason") || ""), p_remove: false }), "Suspended."],
  "admin-remove": ["admin_suspend_user", (id, fd) => ({ p_user: id, p_reason: String(fd.get("reason") || ""), p_remove: true }), "Removed from Handova."],
  "admin-lift": ["admin_lift_suspension", (id, fd) => ({ p_user: id, p_note: String(fd.get("reason") || "") }), "Suspension lifted."],
  "admin-freeze": ["admin_set_conversation_frozen", (id, fd) => ({ p_id: id, p_frozen: true, p_reason: String(fd.get("reason") || "") }), "Conversation paused."],
  "admin-unfreeze": ["admin_set_conversation_frozen", (id, fd) => ({ p_id: id, p_frozen: false, p_reason: String(fd.get("reason") || "") }), "Conversation reopened."],
  "admin-takedown": ["admin_take_down_need", (id, fd) => ({ p_id: id, p_reason: String(fd.get("reason") || "") }), "Need taken down."],
  "admin-hide-cv": ["admin_hide_contribution", (id, fd) => ({ p_id: id, p_hidden: true, p_reason: String(fd.get("reason") || "") }), "Entry hidden."],
  "admin-restore-cv": ["admin_hide_contribution", (id, fd) => ({ p_id: id, p_hidden: false, p_reason: String(fd.get("reason") || "") }), "Entry restored."],
  "admin-id-video": ["admin_confirm_id_video", (id, fd) => ({ p_user: id, p_document_name: String(fd.get("docname") || "") }), "Identity confirmed."],

};

// Keyboard: Escape closes an open menu and returns focus to its button; tabbing out of a menu closes it.
const OPEN_MENUS = ".account-menu[open], .lang-menu[open], .nav-drop[open]";
document.addEventListener("keydown", (ev) => { if (ev.key !== "Escape") return; const nav = document.querySelector("#main-nav.open"); if (nav) { nav.classList.remove("open"); const b = document.querySelector("[data-action=\"menu\"]"); if (b) { b.setAttribute("aria-expanded", "false"); b.setAttribute("aria-label", "Open menu"); b.focus(); } return; } const d = document.querySelector(OPEN_MENUS); if (d) { d.removeAttribute("open"); d.querySelector("summary")?.focus(); } });
document.addEventListener("focusout", (ev) => { const d = ev.target.closest?.(OPEN_MENUS); if (d && ev.relatedTarget && !d.contains(ev.relatedTarget)) d.removeAttribute("open"); });
document.addEventListener("click", async (ev) => {
  const el = ev.target.closest("[data-action]");
  if (!el) {
    document.querySelectorAll(".account-menu[open], .lang-menu[open], .nav-drop[open]").forEach((d) => { if (!d.contains(ev.target)) d.removeAttribute("open"); });
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
// Forms with several submit buttons (e.g. "Send for review" / "Save as draft") say which one was used.
// Need safety questions: show the explanation box only when the answer needs one.
document.addEventListener("change", (ev) => { const r = ev.target.closest(".sg-q input[type=radio]"); if (!r) return; const note = r.closest(".sg-q").querySelector(".sg-note"); if (note) note.hidden = r.value !== note.dataset.when; });
document.addEventListener("click", (ev) => { const b = ev.target.closest("button[data-set-status]"); if (b?.form?.elements.status) b.form.elements.status.value = b.dataset.setStatus; });
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
    return withForm(f, async () => { await result(db.from("needs").update({ status: "closed" }).eq("id", f.dataset.id)); closeDialog(); toast("Applications stopped."); render(); });
  }
});

// A tap outside a dialog closes it only when nothing has been typed; the close button, Cancel and Esc always close,
// and typed text stays as a draft (see saveDialogDraft in core.js).
$("#dialog").addEventListener("click", (ev) => {
  if (ev.target.closest(".dialog-close")) return closeDialog();
  if (ev.target === $("#dialog") && !$("#dialog").hasAttribute("data-dirty")) closeDialog();
});
const keepDraft = (ev) => { const f = ev.target.closest?.("form[data-form]"); if (!f) return; $("#dialog").setAttribute("data-dirty", "1"); saveDialogDraft(f); };
$("#dialog").addEventListener("input", keepDraft);
$("#dialog").addEventListener("change", keepDraft);
window.addEventListener("hashchange", () => { if ($("#dialog").open) $("#dialog").close(); render(); });
db.auth.onAuthStateChange(async (event) => {
  if (event === "PASSWORD_RECOVERY") setTimeout(acc.newPasswordDialog, 50);
  if (event === "SIGNED_IN" && state.ready && !state.user) { await loadSession(); render(); }
});

$(".skip").addEventListener("click", (ev) => { ev.preventDefault(); $("#main").focus(); $("#main").scrollIntoView(); });
await loadLang(initialLang(), (document.querySelector('script[src*="app.js"]')?.src.match(/\?v=[\w.-]+/) || [""])[0]);
startTranslating();
document.documentElement.classList.remove("i18n-wait");
// Changing language reloads the page: warn first if a form has unsaved typing.
document.addEventListener("input", (ev) => { if (ev.target.closest?.("form") && !ev.target.closest(".lang-menu")) window.__hvDirty = true; });
window.addEventListener("hashchange", () => { window.__hvDirty = false; });
window.addEventListener("beforeprint", () => document.querySelectorAll("#main details").forEach((d) => { d.dataset.wasOpen = d.open ? "1" : ""; d.open = true; }));
window.addEventListener("afterprint", () => document.querySelectorAll("details[data-was-open]").forEach((d) => { d.open = d.dataset.wasOpen === "1"; delete d.dataset.wasOpen; }));
$("#site-footer").innerHTML = footer(config);
try { await loadSession(); } catch { toast("Your session could not be restored. Please sign in again."); }
bindHeader();
bindLanguagePickers();
bindEntryEditors();
acc.bindPhotoFields();
render();
