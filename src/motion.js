// Motion and small interactions for public pages: scroll reveal, count-ups,
// the five-step stepper, a gently responsive hero and a header that settles on scroll.
// Zero dependencies. Everything is skipped under prefers-reduced-motion.

const reduce = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
const PUBLIC = new Set(["home", "about", "professionals", "organisations", "needs", "need", "talent", "profile", "how", "join", "signin", "privacy", "terms", "cookies", "safety", "report"]);
const AUTO = ".page-head, .card, .contribution, .j-stage, .how-fact, .how-agree, .how-concern, details.faq, .stats-dark, .filters, .trust-strip > div, .steps li, .banner, .notice, .hv-compare > *, .hv-cta";

let io = null;
let cleanups = [];

export function enhance(root, route) {
  cleanups.forEach((f) => f()); cleanups = [];
  // Organisation logos come from Ethical Bridge; if one cannot load, the initials underneath show instead.
  root.querySelectorAll(".c-logo img, .hs-org img").forEach((img) => {
    const drop = () => img.remove();
    if (img.complete && !img.naturalWidth) drop(); else img.addEventListener("error", drop, { once: true });
  });
  io?.disconnect(); io = null;
  bindStepper(root);
  bindFaq(root);
  if (reduce() || !("IntersectionObserver" in window)) { root.querySelectorAll("[data-counter]").forEach(setFinal); return; }
  document.documentElement.classList.add("motion");
  if (PUBLIC.has(route)) {
    const els = new Set([...root.querySelectorAll(AUTO), ...root.querySelectorAll("[data-reveal]")]);
    const groups = new Map();
    els.forEach((el) => {
      if (el.closest(".hv-hero, dialog, .no-reveal") || [...els].some((o) => o !== el && o.contains(el))) return;
      const n = groups.get(el.parentElement) || 0; groups.set(el.parentElement, n + 1);
      el.style.setProperty("--d", `${Math.min(n, 6) * 70}ms`);
      el.classList.add("reveal");
    });
  }
  io = new IntersectionObserver((entries) => entries.forEach((en) => {
    if (!en.isIntersecting) return;
    const el = en.target;
    if (el.classList.contains("reveal")) el.classList.add("in");
    if (el.dataset.counter !== undefined) countUp(el);
    io.unobserve(el);
  }), { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  root.querySelectorAll(".reveal, [data-counter]").forEach((el) => io.observe(el));
  // Safety net: never leave content hidden if an observer misses it.
  const t = setTimeout(() => root.querySelectorAll(".reveal:not(.in)").forEach((el) => { if (el.getBoundingClientRect().top < innerHeight) el.classList.add("in"); }), 1600);
  cleanups.push(() => clearTimeout(t));
  bindHeroTilt(root);
}

function setFinal(el) { el.textContent = (el.dataset.prefix || "") + el.dataset.counter + (el.dataset.suffix || ""); }
function countUp(el) {
  const target = Number(el.dataset.counter) || 0, start = performance.now(), dur = 1300;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const step = (now) => {
    const t = Math.min((now - start) / dur, 1);
    el.textContent = (el.dataset.prefix || "") + Math.round(target * ease(t)) + (el.dataset.suffix || "");
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

// Five steps: arrow keys, click, and a slow auto-advance that stops for good once someone interacts.
function bindStepper(root) {
  root.querySelectorAll("[data-stepper]").forEach((box) => {
    const tabs = [...box.querySelectorAll('[role="tab"]')], panels = [...box.querySelectorAll('[role="tabpanel"]')];
    if (!tabs.length) return;
    let i = 0, timer = null, stopped = reduce();
    const show = (n, focus = false) => {
      i = (n + tabs.length) % tabs.length;
      tabs.forEach((t, k) => { const on = k === i; t.setAttribute("aria-selected", String(on)); t.tabIndex = on ? 0 : -1; t.classList.toggle("done", k < i); });
      panels.forEach((p, k) => { p.hidden = k !== i; });
      box.style.setProperty("--progress", `${(i / (tabs.length - 1)) * 100}%`);
      if (focus) tabs[i].focus();
    };
    const stop = () => { stopped = true; clearInterval(timer); box.classList.add("manual"); };
    tabs.forEach((t, k) => {
      t.addEventListener("click", () => { stop(); show(k); });
      t.addEventListener("keydown", (ev) => {
        const map = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };
        if (map[ev.key]) { ev.preventDefault(); stop(); show(i + map[ev.key], true); }
        if (ev.key === "Home") { ev.preventDefault(); stop(); show(0, true); }
        if (ev.key === "End") { ev.preventDefault(); stop(); show(tabs.length - 1, true); }
      });
    });
    box.addEventListener("pointerenter", () => clearInterval(timer));
    box.addEventListener("pointerleave", () => { if (!stopped) start(); });
    box.addEventListener("focusin", stop);
    const start = () => { clearInterval(timer); timer = setInterval(() => show(i + 1), 5200); };
    show(0);
    if (!stopped) start();
    cleanups.push(() => clearInterval(timer));
  });
}

// FAQ: only one answer open at a time, so the list stays short.
function bindFaq(root) {
  root.querySelectorAll("[data-faq]").forEach((list) => {
    const items = [...list.querySelectorAll("details")];
    items.forEach((d) => d.addEventListener("toggle", () => { if (d.open) items.forEach((o) => { if (o !== d) o.open = false; }); }));
  });
}

// Hero cards drift a little toward the pointer.
function bindHeroTilt(root) {
  const stage = root.querySelector(".hv-stage");
  if (!stage || !matchMedia("(pointer: fine)").matches) return;
  const move = (ev) => {
    const r = stage.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
    stage.style.setProperty("--mx", x.toFixed(3)); stage.style.setProperty("--my", y.toFixed(3));
  };
  const hero = stage.closest(".hv-hero") || stage;
  hero.addEventListener("pointermove", move);
  hero.addEventListener("pointerleave", () => { stage.style.setProperty("--mx", 0); stage.style.setProperty("--my", 0); });
}

// Header gains a shadow once the page scrolls.
let headerBound = false;
export function bindHeader() {
  if (headerBound) return; headerBound = true;
  const h = document.getElementById("site-header");
  const on = () => h?.classList.toggle("scrolled", scrollY > 8);
  addEventListener("scroll", on, { passive: true }); on();
}
