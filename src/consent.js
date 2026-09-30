import { config } from "./config.js";

const KEY = "ia-consent-v1";
const get = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const set = (v) => { try { localStorage.setItem(KEY, v); } catch {} };

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
  if (window.gtag && get() === "accepted") window.gtag("event", "page_view", { page_title: title, page_location: location.href.split("?")[0] });
}

export function initConsent(show = false) {
  if (!config.gaMeasurementId) return;
  const choice = get();
  if (choice === "accepted") loadAnalytics();
  if (choice && !show) return;
  document.querySelector(".consent")?.remove();
  const el = document.createElement("div");
  el.className = "consent";
  el.setAttribute("role", "region");
  el.setAttribute("aria-label", "Cookie choice");
  el.innerHTML = `<p>We’d like to use analytics cookies to understand which pages help people. No advertising. <a href="#cookies">Cookie notice</a></p><div class="row"><button class="btn secondary sm" type="button" data-consent="declined">Decline</button><button class="btn sm" type="button" data-consent="accepted">Accept analytics</button></div>`;
  el.addEventListener("click", (ev) => {
    const v = ev.target.closest("[data-consent]")?.dataset.consent;
    if (!v) return;
    set(v);
    el.remove();
    if (v === "accepted") loadAnalytics();
  });
  document.body.appendChild(el);
}
