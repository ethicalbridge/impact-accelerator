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
export const avatarFor = (p, size = 56) => p.photo
  ? `<img class="avatar photo" src="${e(p.photo)}" width="${size}" height="${size}" alt="" loading="lazy" decoding="async">`
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
    <div class="row between">${avatarFor(p, 64)}${p.founder ? pill("Founder") : p.example ? exampleBadge() : ""}</div>
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
