import { config } from "./config.js";

const KEY = "ia-consent-v1";
const PAGE_NAMES = {
  home: "Home", about: "About", organisations: "Organisations", professionals: "Professionals",
  needs: "Open needs", need: "Need", talent: "Talent", profile: "Professional profile",
  how: "How it works", join: "Join", signin: "Sign in", reset: "Reset password",
  onboarding: "Onboarding", account: "Account", workspace: "Workspace", org: "Organisation workspace",
  agreement: "Agreement", conversation: "Conversation", "conversation-for": "Conversation",
  notifications: "Notifications", admin: "Admin", "verify-done": "Verification",
  privacy: "Privacy notice", terms: "Terms of use", cookies: "Cookie notice",
  safety: "Working responsibly", report: "Report a concern", contact: "Contact", policies: "Policies",
};
const get = () => { try { const v = localStorage.getItem(KEY); return config.gaMeasurementId && v === "essential" ? null : v; } catch { return null; } };
const set = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

function clearAnalyticsCookies() {
  const names = document.cookie.split(";").map((cookie) => cookie.trim().split("=")[0]).filter((name) => name === "_ga" || name.startsWith("_ga_"));
  const host = location.hostname;
  const domains = ["", host, `.${host}`];
  if (host.startsWith("www.")) domains.push(host.slice(4), `.${host.slice(4)}`);
  for (const name of names) for (const domain of domains) {
    document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
  }
}

function loadAnalytics() {
  if (!config.gaMeasurementId || window.__iaGa) return;
  window.__iaGa = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.gaMeasurementId)}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", config.gaMeasurementId, {
    anonymize_ip: true,
    send_page_view: false,
    page_title: "Handova",
    page_location: `${location.origin}${location.pathname}`,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
  });
}

// Campaign links (LinkedIn, WhatsApp, newsletters) keep their source: utm_source, utm_medium, utm_campaign and
// utm_content, read from before or after the #, go with the first page view of the visit. Nothing else from the
// address is ever sent: no ids, no names, no other parameters.
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content"];
export function campaignQuery() {
  const from = [new URLSearchParams(location.search), new URLSearchParams(location.hash.split("?")[1] || "")];
  const keep = new URLSearchParams();
  for (const k of UTM) {
    const v = from.map((p) => p.get(k)).find((x) => x && x.trim());
    if (v) keep.set(k, v.trim().slice(0, 100));
  }
  const q = keep.toString();
  return q ? `?${q}` : "";
}
// consent-boot.js and app.js each carry a copy of this file, so "first page view" is kept on window, shared by both.
export function trackPage() {
  if (window.gtag && get() === "accepted") {
    const requestedRoute = location.hash.slice(1).split(/[/?]/)[0] || "home";
    const route = Object.hasOwn(PAGE_NAMES, requestedRoute) ? requestedRoute : "other";
    const campaign = window.__hvViewSent ? "" : campaignQuery();
    window.__hvViewSent = true;
    window.gtag("event", "page_view", {
      page_title: PAGE_NAMES[route] || "Other page",
      page_location: `${location.origin}${location.pathname}${campaign}#${route}`,
    });
  }
}

export function initConsent(show = false) {
  const choice = get();
  if (config.gaMeasurementId && choice === "accepted") loadAnalytics();
  const existing = document.querySelector(".consent");
  if (choice && !show) { existing?.remove(); return; }
  existing?.remove();
  const el = document.createElement("div");
  el.className = "consent";
  el.setAttribute("role", "region");
  el.setAttribute("aria-label", "Cookies");
  el.innerHTML = config.gaMeasurementId
      ? `<p><strong>Cookies.</strong> Essential storage keeps you signed in. With your permission, analytics cookies show us which pages help. No ads. <a href="#cookies">Cookie notice</a></p><div class="row"><button class="btn sm" type="button" data-consent="declined">Decline</button><button class="btn sm" type="button" data-consent="accepted">Accept analytics</button></div>`
      : `<p><strong>Cookies.</strong> Essential storage keeps you signed in and remembers your choice. No analytics, tracking or ads. <a href="#cookies">Cookie notice</a></p><div class="row"><button class="btn sm" type="button" data-consent="essential">OK, got it</button></div>`;
  el.addEventListener("click", (ev) => {
    const v = ev.target.closest("[data-consent]")?.dataset.consent;
    if (!v) return;
    set(v);
    el.remove();
    if (v === "accepted") {
      loadAnalytics();
      trackPage();
    } else if (v === "declined") {
      clearAnalyticsCookies();
      // A loaded Google tag cannot be unloaded reliably; reload with consent denied.
      if (window.__iaGa) location.reload();
    }
  });
  // Early in the tab order, right after the skip link, so keyboard users meet it first.
  if (!el.isConnected) { const skip = document.querySelector(".skip"); document.body.insertBefore(el, skip ? skip.nextSibling : document.body.firstChild); }
}
