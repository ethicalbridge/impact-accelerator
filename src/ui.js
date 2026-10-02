import { e, initials, hashOf, date, plural, safeURL } from "./utils.js";
import { state } from "./core.js";

const IC = {
  check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
  shield: '<path d="M12 3l8 3v6c0 4.6-3.4 8.2-8 9-4.6-.8-8-4.4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  doc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>',
  people: '<circle cx="9" cy="8" r="3.2"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3 20v-1.5a6 6 0 0 1 12 0V20M15.5 14.2a4.6 4.6 0 0 1 5.5 4.3V20"/>',
  pen: '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.6 3.6 5.4 3.6 8.5s-1.1 5.9-3.6 8.5c-2.5-2.6-3.6-5.4-3.6-8.5S9.5 6.1 12 3.5z"/>',
  chat: '<path d="M4 5h16v11H9l-5 4z"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
  flag: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  bookmark: '<path d="M7 4h10v17l-5-3.5L7 21z"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  download: '<path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/>',
  gift: '<rect x="4" y="9" width="16" height="11" rx="1.5"/><path d="M12 9v11M4 13h16M12 9c-1.5-3-5-3.5-5-1.2C7 9 12 9 12 9zM12 9c1.5-3 5-3.5 5-1.2C17 9 12 9 12 9z"/>',
  home: '<path d="M4 11l8-6.5 8 6.5V20h-5v-5.5H9V20H4z"/>',
  grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
  inbox: '<path d="M4 13l2.5-8h11L20 13v6H4z"/><path d="M4 13h5l1 2.5h4L15 13h5"/>',
  user: '<circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20.5a7.5 7.5 0 0 1 15 0"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  map: '<path d="M12 21s-6.5-6.2-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/>',
  language: '<path d="M4 6h9M8.5 4v2M6 6c.5 3 3 5.5 6 6.5M11 6c-.6 3.4-3.2 6-6.5 7"/><path d="M13 20l3.5-8 3.5 8M14.2 17.3h4.6"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  calendar: '<rect x="4" y="5.5" width="16" height="14.5" rx="2"/><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4"/>',
  logout: '<path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10"/>',
  linkedin: '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="M8 10.5V16M8 7.6v.3M11.5 16v-5.5M11.5 13.1c0-1.7 1-2.7 2.4-2.7s2.1 1 2.1 2.7V16"/>',
  alert: '<path d="M12 4l9 16H3z"/><path d="M12 10v4.5M12 17.2v.3"/>',
};
export const icon = (name, size = 20, color = "currentColor", sw = 1.7) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${IC[name] || ""}</svg>`;

// Handova mark: two curves passing a dot between them (the handover).
export const mark = (size = 34, light = false, cls = "") =>
  `<svg class="hv-mark ${cls}" width="${size}" height="${size}" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><path class="hv-a" d="M18 72 Q18 28 50 28" fill="none" stroke="${light ? "#fffdf8" : "#123e3a"}" stroke-width="11" stroke-linecap="round"/><path class="hv-b" d="M82 28 Q82 72 50 72" fill="none" stroke="${light ? "#7fa99b" : "#0f6f63"}" stroke-width="11" stroke-linecap="round"/><circle class="hv-dot" cx="50" cy="50" r="11" fill="${light ? "#e0a07f" : "#b85c38"}"/></svg>`;

const PALETTE = ["#0f6f63", "#c68a2e", "#123e3a", "#b85c38", "#7fa99b"];
export function avatar(name, size = 56) {
  const c = PALETTE[hashOf(name) % PALETTE.length];
  const fs = Math.round(size * 0.38), r = size / 2;
  return `<svg class="avatar" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true" focusable="false"><circle cx="${r}" cy="${r}" r="${r}" fill="${c}"/><circle cx="${size * 0.78}" cy="${size * 0.22}" r="${size * 0.3}" fill="#fff" fill-opacity="0.12"/><text x="${r}" y="${r + fs * 0.36}" text-anchor="middle" font-family="Newsreader, Georgia, serif" font-size="${fs}" font-weight="600" fill="#fff">${e(initials(name))}</text></svg>`;
}

// A real photo when the profile has one (only the founder's, a static asset), otherwise initials.
export const avatarFor = (p, size = 56) => (p.photo || p.photo_url)
  ? `<img class="avatar photo" src="${e(p.photo || p.photo_url)}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`
  : avatar(p.name, size);

// Illustrations: drawn, not photographed, so no real person or place is implied.
const KINDS = ["data", "fund", "finance", "access", "people", "video", "train", "design"];
export const COVER_BG = { data: "#dcebe6", fund: "#efe6d4", finance: "#e7efe0", access: "#e3ecf2", people: "#f3e2d6", video: "#e9e3f0", train: "#f6e8cc", design: "#e3ecf2" };
export function coverKind(skills = [], text = "") {
  const s = (skills.join(" ") + " " + text).toLowerCase();
  if (/data|mel|evaluat|research|survey|monitor/.test(s)) return "data";
  if (/fundrais|grant|donor/.test(s)) return "fund";
  if (/financ|budget|account/.test(s)) return "finance";
  if (/access|inclus|disab/.test(s)) return "access";
  if (/hr|recruit|people|policy|safeguard|legal/.test(s)) return "people";
  if (/video|film|photo|story/.test(s)) return "video";
  if (/train|facilitat|workshop|coach/.test(s)) return "train";
  if (/design|ux|web|brand/.test(s)) return "design";
  return KINDS[hashOf(s) % KINDS.length];
}
export function cover(kind, { w = 384, h = 176, fit = "slice", cls = "cover" } = {}) {
  const T = "#0f6f63", D = "#123e3a", O = "#c68a2e", S = "#7fa99b", P = "#fffdf8", C = "#b85c38";
  const s = [];
  if (kind === "data") {
    [[40, 70], [82, 104], [124, 52], [166, 120], [208, 88]].forEach(([x, bh]) => s.push(`<rect x="${x}" y="${h - 28 - bh}" width="28" height="${bh}" rx="4" fill="${T}" fill-opacity="${(0.35 + bh / 300).toFixed(2)}"/>`));
    const pts = [[54, h - 110], [96, h - 140], [138, h - 96], [180, h - 150], [222, h - 120]];
    s.push(`<path d="M${pts.map((p) => p.join(" ")).join(" L")}" fill="none" stroke="${O}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`);
    pts.forEach(([x, y]) => s.push(`<circle cx="${x}" cy="${y}" r="6" fill="${P}" stroke="${O}" stroke-width="3"/>`));
    s.push(`<rect x="${w - 120}" y="30" width="84" height="${h - 60}" rx="10" fill="${P}"/><rect x="${w - 106}" y="46" width="56" height="8" rx="4" fill="${D}"/><rect x="${w - 106}" y="64" width="40" height="6" rx="3" fill="${S}"/><rect x="${w - 106}" y="80" width="48" height="6" rx="3" fill="${S}"/><rect x="${w - 106}" y="96" width="32" height="6" rx="3" fill="${S}"/>`);
  } else if (kind === "fund") {
    [[90, h - 60, 40], [140, h - 78, 34], [70, h - 100, 26]].forEach(([cx, cy, r], i) => s.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${O}" fill-opacity="${0.55 + i * 0.15}"/><circle cx="${cx}" cy="${cy}" r="${r - 9}" fill="none" stroke="${P}" stroke-width="3" stroke-opacity="0.7"/>`));
    s.push(`<path d="M200 ${h - 40} L260 ${h - 80} L300 ${h - 64} L350 ${h - 128}" fill="none" stroke="${D}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M330 ${h - 128} H350 V${h - 108}" fill="none" stroke="${D}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`);
  } else if (kind === "finance") {
    s.push(`<rect x="36" y="28" width="170" height="${h - 56}" rx="10" fill="${P}"/>`);
    for (let i = 0; i < 5; i++) s.push(`<rect x="52" y="${46 + i * 20}" width="${70 + ((i * 23) % 60)}" height="8" rx="4" fill="${S}"/><rect x="166" y="${46 + i * 20}" width="24" height="8" rx="4" fill="${D}" fill-opacity="0.7"/>`);
    const cx = w - 100, cy = h / 2;
    s.push(`<circle cx="${cx}" cy="${cy}" r="56" fill="${T}" fill-opacity="0.25"/><path d="M${cx} ${cy} L${cx} ${cy - 56} A56 56 0 0 1 ${cx + 53.3} ${cy + 17.3} Z" fill="${T}"/><path d="M${cx} ${cy} L${cx + 53.3} ${cy + 17.3} A56 56 0 0 1 ${cx - 20} ${cy + 52.3} Z" fill="${O}"/>`);
  } else if (kind === "access") {
    s.push(`<circle cx="${w / 2}" cy="${h / 2}" r="60" fill="${P}"/><circle cx="${w / 2}" cy="${h / 2 - 30}" r="9" fill="${D}"/><path d="M${w / 2 - 30} ${h / 2 - 12} H${w / 2 + 30} M${w / 2} ${h / 2 - 12} V${h / 2 + 14} M${w / 2} ${h / 2 + 14} L${w / 2 - 16} ${h / 2 + 42} M${w / 2} ${h / 2 + 14} L${w / 2 + 16} ${h / 2 + 42}" stroke="${D}" stroke-width="6" stroke-linecap="round" fill="none"/>`);
    [D, T, S, O].forEach((c, i) => s.push(`<rect x="36" y="${30 + i * 30}" width="46" height="22" rx="5" fill="${c}"/><rect x="${w - 82}" y="${30 + i * 30}" width="46" height="22" rx="5" fill="${c}" fill-opacity="${1 - i * 0.2}"/>`));
  } else if (kind === "people") {
    [T, O, D, C, S].forEach((c, i) => { const x = 60 + i * 66; s.push(`<circle cx="${x}" cy="${h / 2 - 18}" r="18" fill="${c}"/><path d="M${x - 28} ${h - 28} v-18 a28 28 0 0 1 56 0 v18 z" fill="${c}" fill-opacity="0.85"/>`); });
    s.push(`<path d="M40 40 H${w - 40}" stroke="${D}" stroke-width="2" stroke-dasharray="3 8" stroke-linecap="round"/>`);
  } else if (kind === "video") {
    s.push(`<rect x="60" y="30" width="${w - 120}" height="${h - 60}" rx="12" fill="${D}"/>`);
    for (let i = 0; i < 8; i++) s.push(`<rect x="${72 + i * 33}" y="38" width="18" height="10" rx="2" fill="${P}" fill-opacity="0.35"/><rect x="${72 + i * 33}" y="${h - 48}" width="18" height="10" rx="2" fill="${P}" fill-opacity="0.35"/>`);
    s.push(`<circle cx="${w / 2}" cy="${h / 2}" r="30" fill="${O}"/><path d="M${w / 2 - 8} ${h / 2 - 13} L${w / 2 + 14} ${h / 2} L${w / 2 - 8} ${h / 2 + 13} Z" fill="${P}"/>`);
  } else if (kind === "train") {
    s.push(`<rect x="60" y="26" width="200" height="${h - 70}" rx="10" fill="${P}" stroke="${D}" stroke-width="3"/><path d="M160 ${h - 44} V${h - 20} M120 ${h - 20} H200" stroke="${D}" stroke-width="4" stroke-linecap="round"/><rect x="84" y="50" width="100" height="10" rx="5" fill="${T}"/><rect x="84" y="72" width="150" height="8" rx="4" fill="${S}"/><rect x="84" y="90" width="120" height="8" rx="4" fill="${S}"/>`);
    [T, C, D].forEach((c, i) => s.push(`<circle cx="${292 + (i % 2) * 34}" cy="${56 + i * 38}" r="15" fill="${c}"/>`));
  } else {
    s.push(`<rect x="44" y="30" width="${w - 88}" height="${h - 60}" rx="12" fill="${P}"/><rect x="64" y="50" width="120" height="${h - 100}" rx="8" fill="${T}" fill-opacity="0.2"/><circle cx="124" cy="${h / 2}" r="26" fill="${T}"/><rect x="204" y="54" width="120" height="12" rx="6" fill="${D}"/><rect x="204" y="78" width="96" height="8" rx="4" fill="${S}"/><rect x="204" y="96" width="110" height="8" rx="4" fill="${S}"/><rect x="204" y="${h - 66}" width="70" height="22" rx="11" fill="${O}"/>`);
  }
  return `<svg class="${cls}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid ${fit}" aria-hidden="true" focusable="false"><rect width="${w}" height="${h}" fill="${COVER_BG[kind] || COVER_BG.design}"/>${s.join("")}</svg>`;
}

export const exampleBadge = () => `<span class="example-badge">Example</span>`;
export const exampleNotice = (text = "Design preview. People, organisations and contributions shown here are illustrative, not real records.") =>
  `<div class="notice" role="note">${exampleBadge()}<span>${text}</span></div>`;
export const tags = (arr = []) => (arr.length ? `<div class="tags">${arr.map((t) => `<span class="tag">${e(t)}</span>`).join("")}</div>` : "");
export const pill = (text, tone = "") => `<span class="pill ${tone}">${e(text)}</span>`;
export const eyebrow = (text) => `<span class="eyebrow">${text}</span>`;
export const empty = (title, text, action = "") => `<div class="empty"><p class="empty-title">${title}</p><p class="muted">${text}</p>${action}</div>`;
export const btn = (label, href, cls = "") => `<a class="btn ${cls}" href="${href}">${label}</a>`;
export const actionBtn = (label, action, id = "", cls = "") => `<button type="button" class="btn ${cls}" data-action="${action}" data-id="${e(id)}">${label}</button>`;
export const back = (label, href) => `<a class="back" href="${href}">${icon("back", 18)}${label}</a>`;

export const STATUS = {
  pending: ["Under review", "ochre"], accepted: ["Accepted", ""], declined: ["Not selected", "grey"], withdrawn: ["Withdrawn", "grey"],
  awaiting_signatures: ["Awaiting signatures", "ochre"], active: ["In progress", ""], completed: ["Completed", ""], ended: ["Ended", "grey"],
  approved: ["Approved", ""], changes_requested: ["Changes requested", "clay"], rejected: ["Not approved", "grey"], draft: ["Draft", "grey"],
  open: ["Open", ""], closed: ["Closed", "grey"], suspended: ["Suspended", "grey"],
};
export const status = (s) => { const [t, tone] = STATUS[s] || [s, "grey"]; return pill(t, tone); };

export function field(name, label, { value = "", type = "text", required = false, hint = "", attrs = "", full = false } = {}) {
  const id = `f-${name}`;
  const control = type === "textarea"
    ? `<textarea id="${id}" name="${name}" ${required ? "required" : ""} ${attrs}>${e(value)}</textarea>`
    : `<input id="${id}" name="${name}" type="${type}" value="${e(value)}" ${required ? "required" : ""} ${attrs}>`;
  return `<label class="field ${full ? "full" : ""}" for="${id}"><span>${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</span>${control}${hint ? `<span class="hint">${hint}</span>` : ""}</label>`;
}
// Language picker: a dropdown of common working languages with search, plus "add another" for local and sign languages.
// It writes a comma-separated list into a hidden input, so forms read it exactly like the old text field.
export const LANGUAGES = ["English", "Spanish", "French", "Portuguese", "Arabic", "Swahili", "Hindi", "Bengali", "Urdu", "Indonesian", "Malay", "Tagalog / Filipino", "Vietnamese", "Thai", "Burmese", "Khmer", "Nepali", "Chinese (Mandarin)", "Chinese (Cantonese)", "Japanese", "Korean", "Russian", "Ukrainian", "Turkish", "Persian (Farsi / Dari)", "Pashto", "Kurdish", "Amharic", "Tigrinya", "Somali", "Oromo", "Hausa", "Yoruba", "Igbo", "Zulu", "Xhosa", "Afrikaans", "Shona", "Kinyarwanda", "Luganda", "Lingala", "Wolof", "Fula", "Twi / Akan", "Krio", "Malagasy", "German", "Italian", "Dutch", "Polish", "Romanian", "Greek", "Hebrew", "Swedish", "Danish", "Norwegian", "Finnish", "Czech", "Hungarian", "Serbian / Croatian / Bosnian", "Albanian", "Armenian", "Georgian", "Quechua", "Guarani", "Aymara", "Haitian Creole", "Tetum", "Tok Pisin", "Samoan", "Tongan", "Fijian", "Māori", "International Sign", "American Sign Language", "British Sign Language", "French Sign Language", "Ghanaian Sign Language", "Kenyan Sign Language", "Indonesian Sign Language", "Spanish Sign Language"];
// Standard skills, grouped by the same professional areas the Talent and Needs filters use.
export const SKILL_GROUPS = [
  ["Accessibility & inclusion", ["Accessibility", "Inclusion", "Disability inclusion", "Gender equality and inclusion"]],
  ["Accounting & finance", ["Accounting", "Bookkeeping", "Budgeting", "Financial management", "Payroll"]],
  ["Communications & storytelling", ["Communications", "Storytelling", "Ethical storytelling", "Advocacy", "Social media", "Copywriting", "Content writing", "Media relations"]],
  ["Data, MEL & research", ["Data analysis", "Monitoring and evaluation (MEL)", "Program evaluation", "Research", "Qualitative research", "Quantitative research", "Surveys", "Dashboards"]],
  ["Design & UX", ["Graphic design", "Branding", "UX research", "UI design", "Illustration"]],
  ["Fundraising & grants", ["Fundraising", "Grant writing", "Proposal writing", "Award and grant management", "Donor relations", "Donor research", "Individual giving"]],
  ["HR & people", ["Human resources", "Recruitment", "People and wellbeing", "People management"]],
  ["Legal & policy", ["Legal", "Legal research", "Human rights", "Access to justice", "Policy", "Compliance and risk", "Governance", "Contracts"]],
  ["Strategy & operations", ["Strategy", "Strategic planning", "Theory of change", "Operations", "Project management", "Programme management", "Partnerships", "Entrepreneurship", "Start-up leadership"]],
  ["Technology & web", ["Website development", "Software development", "Digital tools", "IT support"]],
  ["Training & facilitation", ["Training", "Facilitation", "Workshop design", "Coaching", "Mentoring"]],
  ["Translation & languages", ["Translation", "Interpretation", "Localisation"]],
  ["Video & photography", ["Video editing", "Photography", "Film", "Animation"]],
];

// A dropdown of checkboxes with search. It writes a comma-separated list into a hidden input,
// so forms read it exactly like the old text field. `other` lets people add their own entry.
export function optionPicker(name, label, groups, selected = [], { required = true, hint = "", other = "", placeholder = "Choose", search = "Search" } = {}) {
  const known = new Set(groups.flatMap(([, opts]) => opts.map((o) => o.toLowerCase())));
  const extra = selected.filter((s) => !known.has(s.toLowerCase()));
  const all = extra.length ? [["Your additions", extra], ...groups] : groups;
  const isOn = (l) => selected.some((s) => s.toLowerCase() === l.toLowerCase());
  const chips = selected.length ? selected.map((l) => `<span class="tag">${e(l)}</span>`).join("") : `<span class="muted">${placeholder}</span>`;
  return `<div class="field full lang-picker" data-lang-picker data-placeholder="${e(placeholder)}">
    <span id="lp-${name}-label">${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</span>
    <input type="hidden" name="${name}" value="${e(selected.join(", "))}">
    <details class="lp">
      <summary aria-labelledby="lp-${name}-label"><span class="lp-chips">${chips}</span>${icon("plus", 18)}</summary>
      <div class="lp-panel">
        <input type="search" class="lp-search" placeholder="${e(search)}" aria-label="${e(search)}" autocomplete="off">
        <div class="lp-list" role="group" aria-labelledby="lp-${name}-label">${all.map(([g, opts]) => `<div class="lp-group">${g ? `<span class="lp-glabel">${e(g)}</span>` : ""}${opts.map((l) => `<label class="check lp-item"><input type="checkbox" value="${e(l)}" ${isOn(l) ? "checked" : ""}><span>${e(l)}</span></label>`).join("")}</div>`).join("")}</div>
        ${other ? `<div class="lp-other"><input type="text" class="lp-add-input" placeholder="${e(other)}" maxlength="60" aria-label="${e(other)}"><button type="button" class="btn secondary sm lp-add">Add</button></div>` : ""}
      </div>
    </details>
    ${hint ? `<span class="hint">${hint}</span>` : ""}
  </div>`;
}
export const languagePicker = (name, label, selected = [], opts = {}) => optionPicker(name, label, [["", LANGUAGES]], selected, { placeholder: "Choose languages", search: "Search languages", other: "Another language, e.g. a local or sign language", ...opts });
export const skillPicker = (name, label, selected = [], opts = {}) => optionPicker(name, label, SKILL_GROUPS, selected, { placeholder: "Choose skills", search: "Search skills", ...opts });
export function bindLanguagePickers(root = document) {
  const sync = (box) => {
    const on = [...box.querySelectorAll(".lp-list input:checked")].map((i) => i.value);
    box.querySelector('input[type="hidden"]').value = on.join(", ");
    box.querySelector(".lp-chips").innerHTML = on.length ? on.map((l) => `<span class="tag">${e(l)}</span>`).join("") : `<span class="muted">${e(box.dataset.placeholder || "Choose")}</span>`;
  };
  root.addEventListener("change", (ev) => { const box = ev.target.closest("[data-lang-picker]"); if (box && ev.target.matches(".lp-list input")) sync(box); });
  root.addEventListener("input", (ev) => {
    if (!ev.target.matches(".lp-search")) return;
    const q = ev.target.value.trim().toLowerCase();
    const box = ev.target.closest("[data-lang-picker]");
    box.querySelectorAll(".lp-group").forEach((g) => {
      const gl = (g.querySelector(".lp-glabel")?.textContent || "").toLowerCase();
      g.querySelectorAll(".lp-item").forEach((it) => { it.hidden = !!q && !gl.includes(q) && !it.textContent.toLowerCase().includes(q); });
    });
    box.querySelectorAll(".lp-group").forEach((g) => { g.hidden = ![...g.querySelectorAll(".lp-item")].some((it) => !it.hidden); });
  });
  const add = (box) => {
    const inp = box.querySelector(".lp-add-input"), v = inp.value.trim().replace(/,/g, " ");
    if (!v) return;
    const found = [...box.querySelectorAll(".lp-list input")].find((i) => i.value.toLowerCase() === v.toLowerCase());
    if (found) found.checked = true;
    else box.querySelector(".lp-group").insertAdjacentHTML("afterbegin", `<label class="check lp-item"><input type="checkbox" value="${e(v)}" checked><span>${e(v)}</span></label>`);
    inp.value = ""; sync(box);
  };
  root.addEventListener("click", (ev) => { if (ev.target.closest(".lp-add")) add(ev.target.closest("[data-lang-picker]")); });
  root.addEventListener("keydown", (ev) => { if (ev.key === "Enter" && ev.target.matches(".lp-add-input")) { ev.preventDefault(); add(ev.target.closest("[data-lang-picker]")); } });
}

// Countries (UN members and observers, plus a few widely used territories), for profiles and entries.
export const COUNTRIES = ["Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Côte d’Ivoire", "Croatia", "Cuba", "Cyprus", "Czechia", "Democratic Republic of the Congo", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia", "Fiji", "Finland", "France", "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica", "Japan", "Jordan", "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg", "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal", "Puerto Rico", "Qatar", "Romania", "Russia", "Rwanda", "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "São Tomé and Príncipe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Türkiye", "Turkmenistan", "Tuvalu", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen", "Zambia", "Zimbabwe"];
const countryOptions = (value, empty = "Choose a country") => {
  const list = value && !COUNTRIES.includes(value) ? [value, ...COUNTRIES] : COUNTRIES;
  return `<option value="">${empty}</option><option value="Remote / several countries" ${value === "Remote / several countries" ? "selected" : ""}>Remote / several countries</option>${list.map((c) => `<option ${c === value ? "selected" : ""}>${e(c)}</option>`).join("")}`;
};
export const countrySelect = (name, label, value = "", { required = false, full = false } = {}) =>
  `<label class="field ${full ? "full" : ""}" for="f-${name}"><span>${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</span><select id="f-${name}" name="${name}" ${required ? "required" : ""} autocomplete="country-name">${countryOptions(value)}</select></label>`;

// Experience and education entries, laid out like LinkedIn. Everything with a fixed set of answers is a dropdown.
// Experience: { title, organisation, employment_type, start, end, country, work_mode, description, skills[] }
// Education:  { organisation (school), title (degree), field, start, end, country, description }
// Dates are "YYYY-MM" (or "YYYY" when no month is given); end is "present" while ongoing.
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR + 6 - 1959 }, (_, i) => String(THIS_YEAR + 5 - i));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Self-employed", "Freelance", "Contract", "Internship", "Apprenticeship", "Volunteer", "Seasonal"];
export const WORK_MODES = ["On-site", "Hybrid", "Remote"];
export const DEGREES = ["Doctorate (PhD)", "Master", "MBA", "Postgraduate diploma", "Specialisation", "Bachelor", "Diploma", "Certificate", "Associate degree", "Professional qualification", "Short course", "Secondary school"];
export const FIELDS = ["Accounting", "Agriculture", "Anthropology", "Architecture", "Business administration", "Communications", "Computer science", "Criminology and forensic science", "Data science", "Design", "Development studies", "Economics", "Education", "Engineering", "Environmental science", "Finance", "Gender studies", "Geography", "Health sciences", "History", "Human resources", "Human rights", "International relations", "Journalism", "Languages and linguistics", "Law", "Marketing", "Mathematics and statistics", "Media and film", "Medicine", "Nursing", "Peace and conflict studies", "Philosophy", "Political science", "Psychology", "Public health", "Public policy", "Regional studies (e.g. African, Latin American)", "Social work", "Sociology", "Other"];
export const TIMEZONES = Array.from({ length: 27 }, (_, i) => i - 12).map((h) => `UTC${h === 0 ? "" : h > 0 ? "+" + h : "−" + -h}`).concat(["UTC+5:30", "UTC+5:45", "UTC+9:30", "UTC+3:30", "UTC+4:30", "UTC+6:30"]).sort((a, b) => tzNum(a) - tzNum(b));
function tzNum(t) { const m = t.replace("−", "-").match(/UTC([+-]\d+)?(?::(\d+))?/); const h = Number(m?.[1] || 0); return h + Math.sign(h || 1) * (Number(m?.[2] || 0) / 60); }

const opt = (v, cur, label = v) => `<option value="${e(v)}" ${String(v) === String(cur ?? "") ? "selected" : ""}>${e(label)}</option>`;
const withCurrent = (list, cur) => (cur && !list.some((x) => String(Array.isArray(x) ? x[0] : x) === String(cur)) ? [cur, ...list] : list);
// A plain dropdown for profile and need forms.
export function dropdown(name, label, list, value = "", { required = false, full = false, empty = "Choose", hint = "" } = {}) {
  return `<label class="field ${full ? "full" : ""}" for="f-${name}"><span>${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</span><select id="f-${name}" name="${name}" ${required ? "required" : ""}><option value="">${empty}</option>${withCurrent(list, value).map((x) => (Array.isArray(x) ? opt(x[0], value, x[1]) : opt(x, value))).join("")}</select>${hint ? `<span class="hint">${hint}</span>` : ""}</label>`;
}
const sel = (cls, label, list, cur, empty, req = false) => `<label class="field"><span>${label}${req ? ' <span class="req" aria-hidden="true">*</span>' : ""}</span><select class="${cls}"><option value="">${empty}</option>${withCurrent(list, cur).map((x) => (Array.isArray(x) ? opt(x[0], cur, x[1]) : opt(x, cur))).join("")}</select></label>`;
const split = (d) => { const [y, m] = String(d || "").split("-"); return { y: y || "", m: m || "" }; };
function dateSel(cls, label, value, presentLabel) {
  const present = value === "present", { y, m } = present ? { y: "", m: "" } : split(value);
  return `<div class="entry-date"><span class="date-label">${label} <span class="req" aria-hidden="true">*</span></span><div class="date-pair">
    <select class="${cls}-m" aria-label="${label}: month"><option value="">Month</option>${MONTHS.map((n, i) => opt(String(i + 1).padStart(2, "0"), m, n)).join("")}</select>
    <select class="${cls}-y" aria-label="${label}: year"><option value="">Year</option>${presentLabel ? opt("present", present ? "present" : "", presentLabel) : ""}${YEARS.map((x) => opt(x, y)).join("")}</select>
  </div></div>`;
}
let entrySeq = 0;
export function entryRow(kind, it = {}) {
  const tools = `<div class="entry-tools"><button type="button" class="link-btn" data-entry-move="up">Move up</button><button type="button" class="link-btn" data-entry-move="down">Move down</button><button type="button" class="link-btn entry-remove" data-entry-remove>Remove</button></div>`;
  const yearOnly = (cls, label, value, present) => sel(`${cls}-y`, label, [...(present ? [["present", present]] : []), ...YEARS], value === "present" ? "present" : split(value).y, "Year", true);
  if (kind === "education") return `<fieldset class="entry" data-entry="education"><legend class="visually-hidden">Qualification</legend>
    <div class="entry-grid">
      ${sel("en-title", "Qualification", DEGREES, it.title, "Choose a qualification", true)}
      ${sel("en-field", "Field of study", FIELDS, it.field, "Choose a field", true)}
      <label class="field"><span>University or institution <span class="req" aria-hidden="true">*</span></span><input class="en-org" value="${e(it.organisation || "")}" maxlength="140" placeholder="e.g. University of Copenhagen"></label>
      <div class="field entry-logo"><span>Logo (optional)</span><div class="row" style="--gap:10px;flex-wrap:nowrap"><span class="logo-preview">${orgTile(it.organisation, it.logo)}</span><label class="btn secondary sm logo-pick">${icon("plus", 16)}<span>${it.logo ? "Change logo" : "Add logo"}</span><input type="file" accept="image/png,image/jpeg,image/webp" class="visually-hidden logo-file"></label><button type="button" class="link-btn logo-remove" ${it.logo ? "" : "hidden"}>Remove</button></div><input type="hidden" class="en-logo" value="${e(it.logo || "")}"><span class="small logo-status" role="status"></span></div>
      ${sel("en-country", "Country", ["Online", ...COUNTRIES], it.country, "Choose a country", true)}
      ${yearOnly("en-start", "From", it.start)}
      ${yearOnly("en-end", "To", it.end, "Studying now")}
      <details class="entry-opt full" ${it.description ? "open" : ""}><summary>Add details (optional)</summary><textarea class="en-desc" maxlength="2000" rows="3" placeholder="Focus, thesis or honours.">${e(it.description || "")}</textarea></details>
    </div>${tools}</fieldset>`;
  return `<fieldset class="entry" data-entry="experience"><legend class="visually-hidden">Role</legend>
    <div class="entry-grid">
      <label class="field"><span>Role <span class="req" aria-hidden="true">*</span></span><input class="en-title" value="${e(it.title || "")}" maxlength="140" placeholder="e.g. Compliance & Awards Officer"></label>
      <label class="field"><span>Organisation <span class="req" aria-hidden="true">*</span></span><input class="en-org" value="${e(it.organisation || "")}" maxlength="140" placeholder="e.g. Save the Children Denmark"></label>
      ${sel("en-country", "Country", ["Remote / several countries", ...COUNTRIES], it.country, "Choose a country", true)}
      <div class="field entry-logo"><span>Logo (optional)</span><div class="row" style="--gap:10px;flex-wrap:nowrap"><span class="logo-preview">${orgTile(it.organisation, it.logo)}</span><label class="btn secondary sm logo-pick">${icon("plus", 16)}<span>${it.logo ? "Change logo" : "Add logo"}</span><input type="file" accept="image/png,image/jpeg,image/webp" class="visually-hidden logo-file"></label><button type="button" class="link-btn logo-remove" ${it.logo ? "" : "hidden"}>Remove</button></div><input type="hidden" class="en-logo" value="${e(it.logo || "")}"><span class="small logo-status" role="status"></span></div>

      ${dateSel("en-start", "From", it.start)}
      ${dateSel("en-end", "To", it.end, "Present")}
      <details class="entry-opt full" ${it.description ? "open" : ""}><summary>Add details (optional)</summary><textarea class="en-desc" maxlength="2000" rows="3" placeholder="What you did and achieved.">${e(it.description || "")}</textarea></details>
    </div>${tools}</fieldset>`;
}
const LABELS = {
  experience: { none: "No roles added yet.", add: "Add a role" },
  education: { none: "No qualifications added yet.", add: "Add a qualification" },
};
export function entryEditor(kind, label, items = [], hint = "") {
  const k = LABELS[kind];
  return `<div class="field full entry-editor" data-entry-editor="${kind}"><span class="visually-hidden">${label}</span>${hint ? `<span class="hint">${hint}</span>` : ""}
    <div class="entry-list">${items.map((it) => entryRow(kind, it)).join("")}</div>
    <p class="muted small entry-none" ${items.length ? "hidden" : ""}>${k.none}</p>
    <div><button type="button" class="btn secondary sm" data-entry-add="${kind}">${icon("plus", 16)}${k.add}</button></div>
  </div>`;
}
const dkey = (d) => (d === "present" ? 999999 : (() => { const { y, m } = split(d); return y ? Number(y) * 100 + Number(m || 0) : 0; })());
// Newest first, like LinkedIn: ongoing, then by end date, then by start date.
export const sortEntries = (list) => [...list].sort((a, b) => (dkey(b.end) || dkey(b.start)) - (dkey(a.end) || dkey(a.start)) || dkey(b.start) - dkey(a.start));
export function readEntries(form, kind) {
  const out = [];
  for (const row of form.querySelectorAll(`[data-entry="${kind}"]`)) {
    const v = (c) => row.querySelector(c)?.value.trim() || "";
    const date = (c) => { const y = v(`${c}-y`), m = v(`${c}-m`); return y === "present" ? "present" : y ? (m ? `${y}-${m}` : y) : ""; };
    const it = kind === "experience"
      ? { title: v(".en-title"), organisation: v(".en-org"), country: v(".en-country"), start: date(".en-start"), end: date(".en-end"), description: v(".en-desc"), logo: v(".en-logo") }
      : { title: v(".en-title"), field: v(".en-field"), organisation: v(".en-org"), country: v(".en-country"), start: date(".en-start"), end: date(".en-end"), description: v(".en-desc"), logo: v(".en-logo") };
    if (!it.title && !it.organisation && !it.country && !it.start) continue;
    const name = kind === "experience" ? `the role “${it.title || "untitled"}”` : `the qualification at “${it.organisation || "your university"}”`;
    const missing = kind === "experience"
      ? [!it.title && "role", !it.organisation && "organisation", !it.country && "country", !it.start && "start year", !it.end && "end year or Present"]
      : [!it.title && "qualification", !it.field && "field of study", !it.organisation && "university", !it.country && "country", !it.start && "start year", !it.end && "end year or Studying now"];
    const gaps = missing.filter(Boolean);
    if (gaps.length) throw Error(`Complete ${name}: add the ${gaps.join(", ")}.`);
    if (it.end !== "present" && dkey(it.end) < dkey(it.start)) throw Error(`Check the dates for ${name}: it ends before it starts.`);
    out.push(it);
  }
  return out;
}
export let entryLogoUpload = null; // set by the account page: (file) => Promise<url>
export const setEntryLogoUpload = (fn) => { entryLogoUpload = fn; };
export function bindEntryEditors(root = document) {
  root.addEventListener("change", async (ev) => {
    if (!ev.target.matches(".logo-file")) return;
    const box = ev.target.closest(".entry-logo"), file = ev.target.files?.[0], status = box.querySelector(".logo-status");
    ev.target.value = "";
    if (!file || !entryLogoUpload) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) { status.textContent = "Use a PNG, JPG or WebP image."; return; }
    status.textContent = "Uploading…";
    try { const url = await entryLogoUpload(file); setLogo(box, url); status.textContent = "Logo ready. Save your profile to keep it."; }
    catch (err) { status.textContent = err.message || "The logo could not be uploaded."; }
  });
  root.addEventListener("click", (ev) => { const rm = ev.target.closest(".logo-remove"); if (rm) { const box = rm.closest(".entry-logo"); setLogo(box, ""); box.querySelector(".logo-status").textContent = "Logo removed. Save your profile to confirm."; } });
  root.addEventListener("click", (ev) => {
    const add = ev.target.closest("[data-entry-add]");
    if (add) {
      const ed = add.closest("[data-entry-editor]");
      ed.querySelector(".entry-list").insertAdjacentHTML("afterbegin", entryRow(add.dataset.entryAdd));
      ed.querySelector(".entry-none").hidden = true;
      ed.querySelector(".entry-list .entry:first-child input").focus();
      return;
    }
    const mv = ev.target.closest("[data-entry-move]");
    if (mv) {
      const row = mv.closest(".entry"), up = mv.dataset.entryMove === "up";
      const sib = up ? row.previousElementSibling : row.nextElementSibling;
      if (sib) { up ? sib.before(row) : sib.after(row); mv.focus(); }
      return;
    }
    const rm = ev.target.closest("[data-entry-remove]");
    if (rm) {
      const ed = rm.closest("[data-entry-editor]");
      rm.closest(".entry").remove();
      ed.querySelector(".entry-none").hidden = !!ed.querySelector(".entry");
      ed.querySelector("[data-entry-add]").focus();
    }
  });
  // Choosing "Present" clears the month next to it.
  root.addEventListener("change", (ev) => { if (ev.target.matches(".en-end-y") && ev.target.value === "present") { const m = ev.target.parentElement.querySelector(".en-end-m"); if (m) m.value = ""; } });
}
function setLogo(box, url) {
  box.querySelector(".en-logo").value = url;
  box.querySelector(".logo-preview").innerHTML = orgTile(box.closest(".entry").querySelector(".en-org").value, url);
  box.querySelector(".logo-remove").hidden = !url;
  box.querySelector(".logo-pick span").textContent = url ? "Change logo" : "Add logo";
}
// "Apr 2026", "2019", or "Present"
const fmt = (d, present) => { if (d === "present") return present; const { y, m } = split(d); return y ? (m ? `${MONTHS[Number(m) - 1]} ${y}` : y) : ""; };
// LinkedIn-style duration, counting both the first and the last month: Apr–Oct is 7 mos.
export function duration(start, end, now = new Date()) {
  const s = split(start); if (!s.y || !s.m) return "";
  const e2 = end === "present" ? { y: String(now.getFullYear()), m: String(now.getMonth() + 1) } : split(end);
  if (!e2.y || !e2.m) return "";
  const n = (Number(e2.y) * 12 + Number(e2.m)) - (Number(s.y) * 12 + Number(s.m)) + 1;
  if (n < 1) return "";
  const y = Math.floor(n / 12), m = n % 12;
  return [y ? `${y} yr${y > 1 ? "s" : ""}` : "", m ? `${m} mo${m > 1 ? "s" : ""}` : ""].filter(Boolean).join(" ");
}
export const entryDates = (it, kind = "experience") => {
  const present = kind === "education" ? "Present" : "Present";
  const a = fmt(it.start, present), b = fmt(it.end, present);
  const range = a && b ? (a === b ? a : `${a} - ${b}`) : a || b;
  const d = kind === "experience" ? duration(it.start, it.end) : "";
  return [range, d].filter(Boolean).join(" · ");
};
// The organisation's logo when one was added, otherwise its initials.
const logoSrc = (u) => (/^data:image\/(png|jpeg|webp);/.test(u || "") ? u : safeURL(u));
const orgTile = (name, logo) => logo && logoSrc(logo)
  ? `<span class="xp-logo has-img" aria-hidden="true"><img src="${e(logoSrc(logo))}" alt="" loading="lazy" decoding="async"></span>`
  : `<span class="xp-logo" aria-hidden="true">${e(orgInitials(name || "?"))}</span>`;
// A logo added to one role is used for every role and qualification at the same organisation.
const logoMap = (items) => { const m = new Map(); items.forEach((x) => { const k = (x.organisation || "").trim().toLowerCase(); if (k && x.logo && !m.has(k)) m.set(k, x.logo); }); return m; };
function orgInitials(name) { return String(name).replace(/\(.*?\)/g, "").split(/\s+/).filter((w) => /^[A-Za-zÀ-ÿ]/.test(w) && !/^(of|the|and|de|la|for)$/i.test(w)).slice(0, 2).map((w) => w[0].toUpperCase()).join(""); }
const moreUnused = (text) => !text ? "" : text.length <= 160 ? `<p class="xp-desc">${e(text)}</p>` : `<details class="xp-more"><summary><span class="xp-desc">${e(text.slice(0, 140).replace(/\s+\S*$/, ""))}…</span> <span class="xp-more-btn">more</span></summary><p class="xp-desc">${e(text)}</p></details>`;
// Public view, LinkedIn order: title, organisation · type, dates · duration, place · location type, description, skills.
// Public view, CV style: role in bold, then organisation · country, then years.
function roleLines(it, kind, inGroup) {
  const title = kind === "education" ? (it.field && it.field !== "Other" ? `${it.title} in ${it.field}` : it.title) || it.organisation : it.title || it.organisation;
  const place = inGroup ? "" : [title === it.organisation ? "" : it.organisation, it.country].filter(Boolean).join(" · ");
  return [`<strong class="xp-title">${e(title)}</strong>`, place ? `<span>${e(place)}</span>` : "", entryDates(it, kind) ? `<span class="xp-muted">${e(entryDates(it, kind))}</span>` : ""];
}
const roleExtra = (it) => (it.description || (it.skills || []).length) ? `<details class="xp-more"><summary>Show details</summary>${it.description ? `<p class="xp-desc">${e(it.description)}</p>` : ""}${(it.skills || []).length ? `<span class="xp-skills">${icon("check", 15)}${e(it.skills.join(", "))}</span>` : ""}</details>` : "";
export function entryList(items, kind = "experience") {
  const logos = logoMap(items), lg = (it) => logos.get((it.organisation || "").trim().toLowerCase()) || "";
  // All roles at the same organisation sit together, at the place of the most recent one.
  const groups = [], byOrg = new Map();
  for (const it of items) {
    const key = kind === "experience" && it.organisation ? it.organisation.trim().toLowerCase() : null;
    if (key && byOrg.has(key)) byOrg.get(key).push(it);
    else { const g = [it]; groups.push(g); if (key) byOrg.set(key, g); }
  }
  return `<ul class="xp-li">${groups.map((g) => {
    if (g.length === 1) return `<li>${orgTile(g[0].organisation, lg(g[0]))}<div class="xp-body">${roleLines(g[0], kind, false).join("")}${roleExtra(g[0])}</div></li>`;
    const starts = g.map((x) => x.start).filter(Boolean).sort(), ends = g.map((x) => x.end).filter(Boolean);
    const end = ends.includes("present") ? "present" : ends.sort().pop();
    const total = duration(starts[0], end);
    const types = [...new Set(g.map((x) => x.employment_type).filter(Boolean))], modes = [...new Set(g.map((x) => x.work_mode).filter(Boolean))], countries = [...new Set(g.map((x) => x.country).filter(Boolean))];
    const gCountry = countries.length === 1 && g.every((x) => x.country === countries[0]) ? countries[0] : "";
    const range = [fmt(starts[0], "Present"), fmt(end, "Present")].filter(Boolean).join(" - ");
    return `<li>${orgTile(g[0].organisation, lg(g[0]))}<div class="xp-body"><strong class="xp-title">${e([g[0].organisation, gCountry].filter(Boolean).join(" · "))}</strong>${range ? `<span class="xp-muted">${e([range, total].filter(Boolean).join(" · "))}</span>` : ""}
      <ul class="xp-roles">${g.map((it) => `<li><strong class="xp-title">${e(it.title)}</strong>${!gCountry && it.country ? `<span>${e(it.country)}</span>` : ""}${entryDates(it, kind) ? `<span class="xp-muted">${e(entryDates(it, kind))}</span>` : ""}${roleExtra(it)}</li>`).join("")}</ul></div></li>`;
  }).join("")}</ul>`;
}

export function select(name, label, options, value = "", { full = false, required = false } = {}) {
  const id = `f-${name}`;
  return `<label class="field ${full ? "full" : ""}" for="${id}"><span>${label}${required ? ' <span class="req" aria-hidden="true">*</span>' : ""}</span><select id="${id}" name="${name}" ${required ? "required" : ""}>${options
    .map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${e(v)}" ${String(v) === String(value) ? "selected" : ""}>${e(t)}</option>`; })
    .join("")}</select></label>`;
}
export const check = (name, label, checked = false, required = false) =>
  `<label class="check"><input type="checkbox" name="${name}" ${checked ? "checked" : ""} ${required ? "required" : ""}><span>${label}</span></label>`;
export const formEnd = (label, extra = "") => `<p class="form-error" role="alert"></p><div class="row">${`<button class="btn" type="submit">${label}</button>`}${extra}</div>`;

// Who handed it over → the handover → who keeps it.
export function handoverStrip(n, size = 56) {
  const who = n.contributor || {};
  const person = who.photo ? `<img class="hs-face" src="${e(who.photo)}" alt="" width="${size}" height="${size}">` : avatar(who.name || "Professional", size);
  const org = n.organisation || {};
  const logo = `<span class="hs-org" style="width:${size}px;height:${size}px">${avatar(org.name || "Organisation", size)}${n.logo && safeURL(n.logo) ? `<img src="${e(safeURL(n.logo))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ""}</span>`;
  return `<div class="h-strip" role="img" aria-label="${e(who.name || "A professional")} handed this over to ${e(org.name || "the organisation")}">
    <span class="hs-end">${person}<span class="hs-cap">${e(String(who.name || "").split(" ")[0])}</span></span>
    <i class="hs-line"></i><span class="hs-mark">${mark(30)}<span class="hs-cap">handed over</span></span><i class="hs-line"></i>
    <span class="hs-end">${logo}<span class="hs-cap">${e(org.name || "")}</span></span>
  </div>`;
}

export function needCard(n) {
  const org = n.organisation || {};
  const kind = coverKind(n.skills, n.title);
  const place = [org.city || n.location, org.country || n.country].filter(Boolean).join(", ");
  return `<a class="card flush card-link${n.handed ? " handed" : ""}" href="${n.handed ? `#organisations/${e(n.org_id)}` : `#need/${e(n.id)}`}">
  ${n.handed ? handoverStrip(n) : cover(kind)}
  <div class="card-body">
    <div class="row between">${n.handed ? `<span class="small muted">Handed over by ${e(n.contributor.name.split(" ")[0])}</span>` : n.example ? exampleBadge() : `<span class="small muted">Posted ${date(n.created_at, { day: "numeric", month: "short" })}</span>`}${n.handed ? pill("Handed over", "ochre") : pill(n.status === "open" ? "Open" : "Closed", n.status === "open" ? "" : "grey")}</div>
    <span class="small muted">${e(org.name || "Organisation")}${place ? " · " + e(place) : ""}</span>
    <span class="card-title">${e(n.title)}</span>
    <p class="muted">${e(String(n.output || "").split(/\n+/).map((s) => s.trim()).filter(Boolean).join(" · "))}</p>
    <div class="meta"><span>${icon("clock", 17)}${plural(n.hours, "hour")}${n.handed ? " delivered" : ""}</span><span>${icon("globe", 17)}${e(n.arrangement)}</span><span>${icon("language", 17)}${e((n.languages || []).join(" · "))}</span></div>
    ${tags((n.skills || []).slice(0, 4))}
  </div></a>`;
}

export function talentCard(p) {
  return `<a class="card card-link" href="#profile/${e(p.user_id)}">
  <div class="stack" style="--gap:14px">
    <div class="row between">${avatarFor(p, 64)}${p.founder ? pill("Founder") : p.example ? exampleBadge() : p.inactive_since ? pill("Inactive", "ochre") : ""}</div>
    <div><span class="card-title">${e(p.name)}</span><p class="muted">${e(p.headline || "Professional")}</p></div>
    <div class="meta" style="flex-direction:column;gap:6px">
      <span>${icon("map", 17)}${e([...new Set([p.location, p.country].filter(Boolean))].join(", ") || "Location not given")}</span>
      <span>${icon("language", 17)}${e((p.languages || []).join(" · ") || "Languages not given")}</span>
      <span>${icon("clock", 17)}${p.hours_available ? `${p.hours_available} hours a month available` : p.founder ? "Availability on request" : "Not available right now"}</span>
    </div>
    ${tags((p.skills || []).slice(0, 4))}
    <span class="row between small" style="padding-top:14px;border-top:1px solid var(--line)"><span>${p.founder ? `${icon("clock", 17)} ${plural(p.contributions || 0, "contribution")} · endorsements pending` : p.example ? `${icon("shield", 17)} ${plural(p.contributions || 0, "reviewed contribution")}` : e(p.arrangement || "Remote")}</span><span style="color:var(--teal);font-weight:700;display:inline-flex;gap:6px;align-items:center">View impact CV ${icon("arrow", 16)}</span></span>
  </div></a>`;
}

// Compact contribution: a small card that opens to show the need, the output, what was delivered and the endorsement.
export function contributionCard(c, { example = false, owner = false } = {}) {
  const when = c.period || (c.completed ? date(c.completed, { month: "short", year: "numeric" }) : "");
  const hasHours = c.hours !== undefined && c.hours !== null;
  const url = safeURL(c.org_url);
  const logo = c.org_logo && safeURL(c.org_logo)
    ? `<span class="c-logo">${avatar(c.organisation || "Organisation", 48)}<img src="${e(safeURL(c.org_logo))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></span>`
    : `<span class="c-logo">${avatar(c.organisation || "Organisation", 48)}</span>`;
  const org = `${c.org_page ? `<a href="${e(c.org_page)}">${e(c.organisation)}</a>` : e(c.organisation)}${c.organisation_country ? `<span class="muted"> · ${e(c.organisation_country)}</span>` : ""}`;
  return `<details class="contrib">
  <summary>
    ${logo}
    <span class="c-main">
      <span class="c-title">${e(c.need_title)}</span>
      <span class="c-org">${org}</span>
      <span class="c-pills">${c.pending ? pill("Endorsement pending", "ochre") : pill("Reviewed")}${c.still_in_use ? pill("Still in use at 6 months") : ""}${owner ? pill(c.public ? "Public" : "Private", c.public ? "" : "grey") : ""}${when ? `<span class="small muted">${e(when)}</span>` : ""}</span>
    </span>
    ${hasHours ? `<span class="c-hours"><strong>${Number(c.hours || 0)}</strong><span>${Number(c.hours) === 1 ? "hour" : "hours"}</span></span>` : ""}
    <span class="c-toggle" aria-hidden="true"></span>
  </summary>
  <div class="c-body">
    <div class="grid-2" style="gap:18px"><div><span class="label-cap">The need</span><p>${e(c.need)}</p></div><div><span class="label-cap">Expected output</span><p>${e(c.output)}</p></div></div>
    ${c.deliverables ? `<div><span class="label-cap">Handed over</span><ul class="bullets">${String(c.deliverables).split(/\n+/).map((d) => d.trim()).filter(Boolean).map((d) => `<li>${e(d)}</li>`).join("")}</ul></div>` : ""}
    ${c.endorsement ? `<blockquote class="endorse"><p>“${e(c.endorsement)}”</p><span class="small muted">Endorsed by ${e(c.endorsed_by_role || "the organisation")} · ${e(c.organisation)}${example ? " · Example" : ""}</span></blockquote>` : c.pending ? `<p class="small c-note">${icon("clock", 16)}<span>${e(c.organisation)} will review this work and add its endorsement here.</span></p>` : ""}
    <div class="row between">${tags(c.skills || [])}${c.need_link ? `<a class="small c-link" href="${e(c.need_link)}">See the need on ${e(c.organisation)}’s page ${icon("arrow", 15)}</a>` : ""}${url ? `<a class="small c-link" href="${e(url)}" target="_blank" rel="noopener noreferrer">About ${e(c.organisation)} on Ethical Bridge ${icon("arrow", 15)}<span class="visually-hidden">(opens in a new tab)</span></a>` : ""}</div>
  </div>
</details>`;
}

export function header(active) {
  const links = [["About", "#about"], ["How it works", "#how"], ["Needs", "#needs"], ["Talent", "#talent"]];
  const nav = links.map(([l, h]) => `<a href="${h}" ${active === h ? 'aria-current="page"' : ""}>${l}</a>`).join("");
  let right;
  if (state.user) {
    const name = state.profile?.name || state.memberships[0]?.full_name || state.user.email;
    const ws = state.memberships.length ? `<a href="#org">${icon("grid", 18)}Organisation workspace</a>` : "";
    const pw = state.profile ? `<a href="#workspace">${icon("user", 18)}My workspace</a>` : "";
    right = `<a class="icon-btn" href="#notifications" aria-label="Notifications${state.unread ? `, ${state.unread} unread` : ""}">${icon("bell", 20)}${state.unread ? `<span class="count">${state.unread > 9 ? "9+" : state.unread}</span>` : ""}</a>
      <details class="account-menu"><summary>${avatar(name, 36)}<span class="hide-sm">${e(String(name).split(" ")[0])}</span></summary><div class="menu">${ws}${pw}${!ws && !pw ? `<a href="#onboarding">${icon("user", 18)}Finish setting up</a>` : ""}${state.isAdmin ? `<a href="#admin">${icon("shield", 18)}Admin</a>` : ""}<a href="#account">${icon("settings", 18)}Account and privacy</a><button type="button" data-action="signout">${icon("logout", 18)}Sign out</button></div></details>`;
  } else {
    right = `<a class="btn secondary sm hide-sm" href="#signin">Sign in</a><a class="btn sm" href="#join">Join free</a>`;
  }
  return `<div class="wrap"><a class="brand" href="#home" aria-label="Handova home">${mark(34)}<span>Handova</span></a><nav class="main-nav" id="main-nav" aria-label="Main">${nav}${state.user ? "" : '<a class="nav-signin" href="#signin">Sign in</a>'}</nav><div class="header-actions">${right}<button type="button" class="icon-btn menu-toggle" aria-controls="main-nav" aria-expanded="false" aria-label="Open menu" data-action="menu">${icon("menu", 22)}</button></div></div>`;
}

export function footer(cfg) {
  return `<div class="wrap"><div class="footer-grid">
    <div class="stack" style="--gap:16px"><a class="brand" href="#home" style="color:var(--paper)">${mark(34, true)}<span>Handova</span></a><p class="serif" style="font-size:1.6rem;line-height:1.3">Skills handed over.<br><span style="color:#e0a07f">Capability that stays.</span></p><p style="color:var(--on-deep);max-width:360px">Skilled people contributing to the needs locally led organisations define. Free for everyone.</p></div>
    <nav aria-label="Platform"><h2>Platform</h2><ul><li><a href="#about">About</a></li><li><a href="#how">How it works</a></li><li><a href="#organisations">For organisations</a></li><li><a href="#professionals">For professionals</a></li><li><a href="#needs">Explore needs</a></li><li><a href="#talent">Discover talent</a></li><li><a href="#join">Join free</a></li></ul></nav>
    <nav aria-label="Trust"><h2>Trust</h2><ul><li><a href="#safety">Working responsibly</a></li><li><a href="#privacy">Privacy notice</a></li><li><a href="#terms">Terms of use</a></li><li><a href="#cookies">Cookies</a></li><li><a href="#report">Report a concern</a></li></ul></nav>
    <div><h2>Contact</h2><ul><li><a href="mailto:${e(cfg.contactEmail)}">${e(cfg.contactEmail)}</a></li><li><a href="https://ethicalbridge.org/" rel="noopener" target="_blank">Ethical Bridge <span class="visually-hidden">(opens in a new tab)</span></a></li><li><a href="https://ethicalbridge.org/directory.html" rel="noopener" target="_blank">Ethical Bridge directory <span class="visually-hidden">(opens in a new tab)</span></a></li></ul>
      <div class="footer-social">${[["LinkedIn", "https://www.linkedin.com/company/ethicalbridge/"], ["Instagram", "https://instagram.com/ethical.bridge"], ["Facebook", "https://www.facebook.com/profile.php?id=61588796042823"], ["YouTube", "https://www.youtube.com/@EthicalBridge"], ["TikTok", "https://www.tiktok.com/@ethical.bridge"]].map(([n, h]) => `<a href="${h}" rel="noopener" target="_blank">${n}<span class="visually-hidden"> (Ethical Bridge, opens in a new tab)</span></a>`).join("")}</div></div>
  </div><div class="footer-bottom"><span>© ${new Date().getFullYear()} Handova · An initiative of Ethical Bridge</span><span>Free for organisations and professionals</span></div></div>`;
}

export const safeLink = (url, label) => (safeURL(url) ? `<a href="${e(safeURL(url))}" target="_blank" rel="noopener noreferrer">${e(label)} <span class="visually-hidden">(opens in a new tab)</span></a>` : "");
