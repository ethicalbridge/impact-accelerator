// Pure helpers: no DOM, no network. Covered by tests/utils.test.mjs.
export const e = (value) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function safeURL(value, httpsOnly = false) {
  if (!value) return "";
  try {
    const u = new URL(String(value).trim());
    if (u.protocol === "https:" || (!httpsOnly && u.protocol === "http:")) return u.href;
  } catch {}
  return "";
}

export const list = (value, max = 30) =>
  [...new Set(String(value || "").split(",").map((x) => x.trim()).filter(Boolean))].slice(0, max);

export function languages(value) {
  const seen = new Set();
  const out = String(value || "")
    .split(",")
    .map((x) => x.trim())
    .filter((x) => x && !seen.has(x.toLowerCase()) && seen.add(x.toLowerCase()));
  if (!out.length) throw Error("Add at least one language you can work in.");
  if (out.length > 20 || out.some((x) => x.length > 80)) throw Error("Use up to 20 languages, each under 80 characters.");
  return out;
}

export const professionalAreas = [
  ["Accessibility & inclusion", "accessibility inclusive inclusion disability"],
  ["Accounting & finance", "accounting bookkeeping finance financial budgeting budget payroll"],
  ["Communications & storytelling", "communications communication storytelling media social content copywriting writing"],
  ["Data, MEL & research", "data analysis analytics monitoring evaluation learning mel research survey dashboard"],
  ["Design & UX", "design ux ui user experience figma graphic branding illustration"],
  ["Fundraising & grants", "fundraising grant grants donor donors philanthropy"],
  ["HR & people", "human resources recruitment people wellbeing hr"],
  ["Legal & policy", "legal law policy compliance governance contracts"],
  ["Strategy & operations", "strategy operations planning project management programme"],
  ["Technology & web", "software web website development developer technology digital it"],
  ["Training & facilitation", "training facilitation workshop coaching mentoring"],
  ["Translation & languages", "translation interpretation localisation localization"],
  ["Video & photography", "video photography film editing animation"],
].map(([label, keywords]) => ({ label, keywords: keywords.split(" ") }));

const words = (text) => String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
const norm = (text) => words(text).join(" ");

// Whole-word matching so short keywords like "it" or "ui" never match inside other words.
export function filterRecords(rows, f = {}) {
  const area = professionalAreas.find((a) => a.label === f.area);
  return rows.filter((r) => {
    const hay = norm([r.name, r.title, r.headline, r.description, r.output, r.bio, (r.skills || []).join(" "), r.organisation?.name, r.country, r.location, ...(r.experience_items || []).map((x) => `${x.title} ${x.organisation} ${x.country}`)].join(" "));
    const hayWords = new Set(hay.split(" "));
    if (f.search && !norm(f.search).split(" ").every((w) => hay.includes(w))) return false;
    if (area && !area.keywords.some((k) => hayWords.has(k) || (k.length >= 4 && [...hayWords].some((w) => w.startsWith(k))))) return false;
    if (f.country && norm(`${r.country || r.organisation?.country || ""} ${r.location}`).indexOf(norm(f.country)) === -1) return false;
    if (f.language && !(r.languages || []).some((l) => norm(l) === norm(f.language))) return false;
    if (f.arrangement && r.arrangement !== f.arrangement) return false;
    if (f.hours === "short" && !(r.hours <= 8)) return false;
    if (f.hours === "medium" && !(r.hours > 8 && r.hours <= 16)) return false;
    if (f.hours === "long" && !(r.hours > 16)) return false;
    if (f.available && !(r.hours_available > 0)) return false;
    return true;
  });
}

export function date(value, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "";
  const d = new Date(String(value).length === 10 ? value + "T12:00:00" : value);
  return isNaN(d) ? "" : d.toLocaleDateString("en-GB", opts);
}

export const today = () => new Date().toISOString().slice(0, 10);
export const initials = (name) => (String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
export function hashOf(text) {
  let h = 0;
  for (const c of String(text)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
