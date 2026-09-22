import { aboutAlliance } from "./alliance.js";
import { conversation } from "./messages.js";
import {
  db,
  state,
  $,
  e,
  btn,
  empty,
  head,
  area,
  result,
  profile,
  notify,
  showDialog,
  closeDialog,
  errorMessage,
} from "./core.js";
import {
  home,
  directory,
  profilePage,
  portfolio,
  workPage,
  needPage,
} from "./pages.js";
import { workspace, organisation, hours } from "./workspace.js";
import { guides } from "./guides.js";
import {
  authForm,
  requireUser,
  editProfile,
  editWork,
  editNeed,
  apply,
  invite,
  logTime,
  decision,
  recoveryForm,
  submit,
} from "./forms.js";
let routeVersion = 0;
async function render() {
  const version = ++routeVersion;
  const [raw = "home", id] = location.hash.slice(1).split("/");
  const route =
    {
      organisations: "needs",
      pool: "workspace",
      "organisation-view": "organisation",
      projects: "needs",
      dashboard: "workspace",
    }[raw] ||
    raw ||
    "home";
  state.afterRender = () => {};
  $("#main").innerHTML = '<div class="loading" role="status">Loading…</div>';
  $("#navigation").classList.remove("open");
  $("#menu").setAttribute("aria-expanded", "false");
  document.querySelectorAll("#navigation a").forEach((a) => {
    if (a.hash === `#${route}`) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  try {
    let html;
    if (route === "home") html = await home();
    else if (route === "about") html = aboutAlliance();
    else if (["needs", "talent"].includes(route)) html = await directory(route);
    else if (route === "profile" && id) html = await profilePage(id);
    else if (route === "need" && id) html = await needPage(id);
    else if (route === "work" && id) html = await workPage(id);
    else if (route === "portfolio") html = await portfolio();
    else if (route === "workspace") html = await workspace();
    else if (route === "organisation") html = await organisation();
    else if (route === "hours") html = await hours();
    else if (guides[route]) {
      const [title, copy, body] = guides[route];
      html = `<article class="reading">${head("Impact Accelerator", title, copy)}${body}</article>`;
    } else
      html = empty(
        "Page not found",
        "Use the navigation to find your way back.",
        '<a href="#home" class="button">Go home</a>',
      );
    if (version !== routeVersion) return;
    $("#main").innerHTML = html;
    state.afterRender();
    document.title = `${$("#main h1")?.textContent || "Impact Accelerator"} · Impact Accelerator`;
    $("#main").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  } catch (err) {
    if (version !== routeVersion) return;
    $("#main").innerHTML = empty(
      "We could not load this page",
      e(errorMessage(err)),
      btn("Try again", "reload"),
    );
  }
}
state.render = render;
async function saveNeed(id) {
  if (!requireUser()) return;
  const existing = await result(
    db
      .from("ia_saved")
      .select("need_id")
      .eq("user_id", state.user.id)
      .eq("need_id", id)
      .maybeSingle(),
  );
  await result(
    existing
      ? db
          .from("ia_saved")
          .delete()
          .eq("user_id", state.user.id)
          .eq("need_id", id)
      : db.from("ia_saved").insert({ user_id: state.user.id, need_id: id }),
  );
  notify(
    existing ? "Removed from saved needs." : "Need saved to your workspace.",
  );
  await render();
}
async function exportPortfolio() {
  if (!requireUser()) return;
  const p = await profile();
  const items = await result(
    db.from("ia_portfolio").select("*").eq("user_id", state.user.id),
  );
  const blob = new Blob(
    [
      JSON.stringify(
        { exported_at: new Date().toISOString(), profile: p, portfolio: items },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = "impact-accelerator-portfolio.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify(
    "Portfolio exported. For a PDF, use Print / Save PDF on your profile.",
  );
}
const actions = {
  conversation,
  auth: () => authForm(),
  signup: () => authForm("signup"),
  reset: () => authForm("reset"),
  close: closeDialog,
  reload: render,
  "edit-profile": editProfile,
  "example-linkedin": () =>
    showDialog(
      "LinkedIn ' Example",
      "<p>This example shows where a talent's LinkedIn profile appears. Maria is fictional, so no real person's profile is linked.</p><p>Real members can add a LinkedIn URL in Edit profile. A supplied link is not proof of identity. LinkedIn identity verification is not connected.</p>",
    ),
  "add-need": () => editNeed(),
  "edit-need": editNeed,
  apply,
  invite,
  "log-time": logTime,
  "save-need": saveNeed,
  export: exportPortfolio,
  print: () => window.print(),
  "clear-filters": () => $("#filters")?.reset(),
  share: async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      notify("Link copied.");
    } catch {
      showDialog(
        "Share this page",
        `<label>Page link<input readonly value="${e(url)}"></label><p>Select and copy this link.</p>`,
      );
    }
  },
  "delete-work": (id) =>
    decision(
      "Delete this portfolio entry?",
      "This permanently removes this work entry. You can cancel to keep it.",
      "delete-work",
      id,
    ),
  withdraw: (id) =>
    decision(
      "Withdraw your application?",
      "The organisation will see it as withdrawn. The original application is kept for your records.",
      "withdraw",
      id,
    ),
  "accept-application": (id) =>
    decision(
      "Accept this application?",
      "The professional will see the decision in their workspace and can submit contribution hours. Agree on scope and contact arrangements before starting.",
      "accept-application",
      id,
    ),
  "decline-application": (id) =>
    decision(
      "Decline this application?",
      "The professional will see the decision in their workspace. This decision is final.",
      "decline-application",
      id,
    ),
  "accept-invite": (id) =>
    decision(
      "Accept this invitation?",
      "Confirm that the scope and availability fit. You can then record contribution hours.",
      "accept-invite",
      id,
    ),
  "decline-invite": (id) =>
    decision(
      "Decline this invitation?",
      "The organisation will see your decision.",
      "decline-invite",
      id,
    ),
  "approve-hours": (id) =>
    decision(
      "Approve these contribution hours?",
      "Confirm you have reviewed the work. Approval records your account and the review date and cannot be edited.",
      "approve-hours",
      id,
    ),
  "changes-hours": (id) =>
    decision(
      "Request changes",
      "Explain what needs correcting. The original record is retained and the professional can submit a corrected entry.",
      "changes-hours",
      id,
      area("review_note", "Changes needed", "", true, 2000),
    ),
  signout: async () => {
    await result(db.auth.signOut());
    state.user = null;
    closeDialog();
    $("#account").textContent = "Sign in / Join";
    location.hash = "home";
    await render();
    notify("Signed out.");
  },
};
document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target) return;
  if (target.tagName === "BUTTON") event.preventDefault();
  const action = actions[target.dataset.action];
  if (!action) return;
  target.disabled = true;
  try {
    await action(target.dataset.id);
  } catch (err) {
    notify(errorMessage(err));
  } finally {
    target.disabled = false;
  }
});
document.addEventListener(
  "error",
  (event) => {
    if (event.target.tagName === "IMG") event.target.hidden = true;
  },
  true,
);
document.addEventListener("submit", submit);
$(".skip").addEventListener("click", (event) => {
  event.preventDefault();
  $("#main").focus();
  $("#main").scrollIntoView();
});
$("#menu").addEventListener("click", () => {
  const open = $("#navigation").classList.toggle("open");
  $("#menu").setAttribute("aria-expanded", String(open));
});
$("#account").addEventListener("click", () =>
  state.user
    ? showDialog(
        "Your account",
        `<p>${e(state.user.email)}</p><p>Your account is shared with Ethical Bridge. Your Accelerator profile and portfolio visibility are managed separately.</p><div class="actions">${btn("Edit profile", "edit-profile")}${btn("Sign out", "signout", "", "secondary")}</div>`,
      )
    : authForm(),
);
$("#dialog .close").addEventListener("click", closeDialog);
window.addEventListener("hashchange", () => {
  if ($("#dialog").open) closeDialog();
  render();
});
db.auth.onAuthStateChange((event, session) => {
  state.user = session?.user || null;
  $("#account").textContent = state.user ? "Account" : "Sign in / Join";
  if (event === "PASSWORD_RECOVERY") setTimeout(recoveryForm, 0);
  if (event === "SIGNED_OUT") setTimeout(render, 0);
});
try {
  const { data, error } = await db.auth.getSession();
  if (error) throw error;
  state.user = data.session?.user || null;
  $("#account").textContent = state.user ? "Account" : "Sign in / Join";
} catch {
  notify("Your session could not be restored. Please sign in again.");
}
await render();
