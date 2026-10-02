import { locale } from "./i18n.js";
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

// Professional areas and their skills: one standard list for profiles, needs and the filters.
// Each skill belongs to exactly one area, so the Professional area filter matches by the skills people pick.
export const SKILL_GROUPS = [
  ["Strategy & planning", ["Strategy", "Strategic planning", "Theory of change", "Business planning", "Organisational development", "Change management", "Entrepreneurship", "Start-up leadership"]],
  ["Programme & project management", ["Programme management", "Project management", "Programme design", "Logframes and results frameworks", "Work planning", "Agile and lean methods"]],
  ["Operations & administration", ["Operations", "Administration", "Process improvement", "Procurement", "Logistics and supply chain", "Office and systems set-up"]],
  ["Governance, risk & compliance", ["Governance", "Board development", "Compliance and risk", "Risk management", "Policies and procedures", "Donor compliance", "Due diligence", "Anti-fraud and anti-corruption", "Internal audit"]],
  ["Safeguarding & protection", ["Safeguarding", "Safeguarding policy", "Protection from sexual exploitation and abuse (PSEA)", "Child safeguarding", "Code of conduct", "Incident reporting systems", "Duty of care"]],
  ["Legal", ["Legal", "Legal research", "Contracts", "Registration and legal structures", "Employment law", "Data protection and privacy (GDPR)", "Intellectual property", "Human rights", "Access to justice"]],
  ["Policy & advocacy", ["Policy", "Policy analysis", "Advocacy", "Campaigning", "Public affairs", "Coalition building"]],
  ["Fundraising & grants", ["Fundraising", "Fundraising strategy", "Grant writing", "Proposal writing", "Donor research", "Donor relations", "Award and grant management", "Donor reporting", "Individual giving", "Corporate partnerships", "Major gifts", "Crowdfunding", "Fundraising events"]],
  ["Finance & accounting", ["Accounting", "Bookkeeping", "Budgeting", "Financial management", "Financial reporting", "Financial modelling", "Payroll", "Tax", "Audit preparation"]],
  ["Monitoring, evaluation & learning", ["Monitoring and evaluation (MEL)", "Program evaluation", "Indicators and data collection tools", "Impact measurement", "Learning and knowledge management", "Results reporting"]],
  ["Research & data", ["Research", "Qualitative research", "Quantitative research", "Surveys", "Data analysis", "Statistics", "Data visualisation", "Dashboards", "Data management", "GIS and mapping"]],
  ["Communications & media", ["Communications", "Communications strategy", "Storytelling", "Ethical storytelling", "Copywriting", "Content writing", "Editing and proofreading", "Plain language", "Social media", "Media relations", "Newsletters", "Internal communications", "Crisis communications"]],
  ["Marketing", ["Marketing", "Digital marketing", "Brand strategy", "Email marketing", "SEO", "Market research"]],
  ["Design & creative", ["Graphic design", "Branding", "Illustration", "Layout and publications", "Presentation design", "Infographics", "Print design"]],
  ["UX & digital products", ["UX research", "UI design", "Service design", "Product management", "User testing", "Digital accessibility"]],
  ["Technology & IT", ["Website development", "Software development", "Digital tools", "IT support", "Cybersecurity", "Databases", "CRM set-up", "Microsoft 365 and Google Workspace", "No-code and automation", "AI tools"]],
  ["HR & people", ["Human resources", "Recruitment", "HR policies", "People management", "Performance management", "People and wellbeing", "Volunteer management", "Organisational culture"]],
  ["Training, coaching & facilitation", ["Training", "Training design", "Facilitation", "Workshop design", "Coaching", "Mentoring", "Leadership development", "E-learning"]],
  ["Inclusion & accessibility", ["Accessibility", "Inclusion", "Disability inclusion", "Gender equality and inclusion", "Diversity, equity and inclusion", "Youth engagement"]],
  ["Partnerships & community", ["Partnerships", "Stakeholder engagement", "Community engagement", "Network building", "Localisation"]],
  ["Sector expertise", ["Health", "Mental health", "Education", "Climate and environment", "Conservation", "Agriculture and food security", "Water, sanitation and hygiene (WASH)", "Livelihoods and economic development", "Humanitarian response", "Peacebuilding", "Migration and refugees", "Animal welfare"]],
  ["Translation & languages", ["Translation", "Interpretation", "Localisation of content", "Subtitling"]],
  ["Video, photo & audio", ["Video editing", "Videography", "Photography", "Film", "Animation", "Podcasts and audio"]],
];
// Keywords per area, only used for older records whose skills are not on the standard list.
const STOP = new Set(["and", "of", "the", "for", "to", "in", "a", "set", "up", "e", "g"]);
export const professionalAreas = SKILL_GROUPS.map(([label, skills]) => ({ label, keywords: [...new Set(skills.join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !STOP.has(w)))] }));

const words = (text) => String(text || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").split(/[^a-z0-9]+/).filter(Boolean);
const norm = (text) => words(text).join(" ");

// Whole-word matching so short keywords like "it" or "ui" never match inside other words.
export function filterRecords(rows, f = {}) {
  const area = professionalAreas.find((a) => a.label === f.area);
  return rows.filter((r) => {
    const hay = norm([r.name, r.title, r.headline, r.description, r.output, r.bio, (r.skills || []).join(" "), r.organisation?.name, r.country, r.location, ...(r.experience_items || []).map((x) => `${x.title} ${x.organisation} ${x.country}`)].join(" "));
    // Areas come from what someone offers (skills, headline) or what a need asks for, not from past job titles.
    const hayWords = new Set(norm([r.title, r.headline, r.description, r.output, (r.skills || []).join(" ")].join(" ")).split(" "));
    if (f.search && !norm(f.search).split(" ").every((w) => hay.includes(w))) return false;
    if (area) {
      // Records that use the standard skill list match by skill; older free-text ones fall back to keywords.
      const skills = (r.skills || []).map((x) => String(x).toLowerCase());
      const standard = f.standardSkills && skills.some((x) => f.standardSkills.has(x));
      const ok = standard ? (f.areaSkills || []).some((x) => skills.includes(x)) : area.keywords.some((k) => hayWords.has(k) || (k.length >= 4 && [...hayWords].some((w) => w.startsWith(k))));
      if (!ok) return false;
    }
    if (f.country && norm(`${r.country || r.organisation?.country || ""} ${r.location}`).indexOf(norm(f.country)) === -1) return false;
    if (f.language && !(r.languages || []).some((l) => norm(l) === norm(f.language))) return false;
    if (f.arrangement && r.arrangement !== f.arrangement) return false;
    // Needs: estimated hours. Talent: hours offered a month (more than 16 counts in the top bracket).
    const h = Number(r.hours ?? r.hours_available ?? 0);
    // Separate brackets, so each record appears under exactly one.
    if (f.hours === "4" && !(h > 0 && h <= 4)) return false;
    if (f.hours === "8" && !(h > 4 && h <= 8)) return false;
    if (f.hours === "16" && !(h > 8)) return false;
    if (f.available && !(r.hours_available > 0)) return false;
    return true;
  });
}

export function date(value, opts = { day: "numeric", month: "short", year: "numeric" }) {
  if (!value) return "";
  const d = new Date(String(value).length === 10 ? value + "T12:00:00" : value);
  return isNaN(d) ? "" : d.toLocaleDateString(locale(), opts);
}

export const today = () => new Date().toISOString().slice(0, 10);
export const initials = (name) => (String(name || "?").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("") || "?").toUpperCase();
export const plural = (n, one, many = one + "s") => `${n} ${n === 1 ? one : many}`;
export function hashOf(text) {
  let h = 0;
  for (const c of String(text)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}
