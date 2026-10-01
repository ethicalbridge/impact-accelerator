import { config } from "./config.js";

const KEY = "ia-consent-v1";
const get = () => { try { const v = localStorage.getItem(KEY); return config.gaMeasurementId && v === "essential" ? null : v; } catch { return null; } };
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
  const choice = get();
  if (config.gaMeasurementId && choice === "accepted") loadAnalytics();
  if (choice && !show) return;
  document.querySelector(".consent")?.remove();
  const el = document.createElement("div");
  el.className = "consent";
  el.setAttribute("role", "region");
  el.setAttribute("aria-label", "Cookies");
  el.innerHTML = config.gaMeasurementId
    ? `<p><strong>Cookies.</strong> We use essential storage to keep you signed in. With your permission we’d also use analytics cookies to understand which pages help people. No advertising. <a href="#cookies">Cookie notice</a></p><div class="row"><button class="btn secondary sm" type="button" data-consent="declined">Decline</button><button class="btn sm" type="button" data-consent="accepted">Accept analytics</button></div>`
    : `<p><strong>Cookies.</strong> We only use essential storage to keep you signed in and remember this choice. No analytics, tracking or advertising. <a href="#cookies">Cookie notice</a></p><div class="row"><button class="btn sm" type="button" data-consent="essential">OK, got it</button></div>`;
  el.addEventListener("click", (ev) => {
    const v = ev.target.closest("[data-consent]")?.dataset.consent;
    if (!v) return;
    set(v);
    el.remove();
    if (v === "accepted") loadAnalytics();
  });
  document.body.appendChild(el);
}
