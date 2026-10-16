import { config } from "./config.js";

const KEY = "ia-consent-v1";
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
  window.gtag("config", config.gaMeasurementId, { anonymize_ip: true, send_page_view: false });
}

export function trackPage(title) {
  if (window.gtag && get() === "accepted") {
    const route = location.hash.slice(1).split("/")[0] || "home";
    window.gtag("event", "page_view", { page_title: title, page_location: `${location.origin}${location.pathname}#${route}` });
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
      ? `<p><strong>Cookies.</strong> We use essential storage to keep you signed in. With your permission we’d also use analytics cookies to understand which pages help people. No advertising. <a href="#cookies">Cookie notice</a></p><div class="row"><button class="btn secondary sm" type="button" data-consent="declined">Decline</button><button class="btn sm" type="button" data-consent="accepted">Accept analytics</button></div>`
      : `<p><strong>Cookies.</strong> Essential storage keeps you signed in and remembers your choice. No analytics, tracking or ads. <a href="#cookies">Cookie notice</a></p><div class="row"><button class="btn sm" type="button" data-consent="essential">OK, got it</button></div>`;
  el.addEventListener("click", (ev) => {
    const v = ev.target.closest("[data-consent]")?.dataset.consent;
    if (!v) return;
    set(v);
    el.remove();
    if (v === "accepted") {
      loadAnalytics();
      trackPage(document.title);
    } else if (v === "declined") {
      clearAnalyticsCookies();
      // A loaded Google tag cannot be unloaded reliably; reload with consent denied.
      if (window.__iaGa) location.reload();
    }
  });
  if (!el.isConnected) document.body.appendChild(el);
}
