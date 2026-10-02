// Interface translation. English is written in the code; Spanish, Portuguese and French live in i18n/<lang>.json,
// keyed by the exact English text. After each render, and whenever the page changes, visible interface text is
// swapped for its translation. People's own content (names, bios, roles, needs, messages) is never translated:
// it simply is not in the dictionaries, and containers marked data-no-i18n are skipped entirely.
// Placeholders: {n} matches a number, any other {name} matches free text (e.g. "Invite {name} to help").
export const LANGS = [["en", "English", "EN", "en-GB"], ["es", "Español", "ES", "es-ES"], ["pt", "Português", "PT", "pt-BR"], ["fr", "Français", "FR", "fr-FR"]];

let lang = "en";
let dict = null;
let patterns = [];
const ATTRS = ["placeholder", "aria-label", "title", "alt"];
const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "TEXTAREA"]);

export const getLang = () => lang;
export const locale = () => (LANGS.find((l) => l[0] === lang) || LANGS[0])[3];

export function initialLang() {
  try { const s = localStorage.getItem("hv-lang"); if (s && LANGS.some((l) => l[0] === s)) return s; } catch {}
  const n = (navigator.language || "en").slice(0, 2).toLowerCase();
  return LANGS.some((l) => l[0] === n) ? n : "en";
}

const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
export async function loadLang(l, version = "") {
  lang = LANGS.some((x) => x[0] === l) ? l : "en";
  document.documentElement.lang = lang;
  dict = null; patterns = [];
  if (lang === "en") return;
  try {
    const r = await fetch(`i18n/${lang}.json${version}`);
    if (!r.ok) throw Error("missing");
    dict = await r.json();
  } catch { dict = null; lang = "en"; document.documentElement.lang = "en"; return; }
  // Keys with placeholders become patterns, longest first so the most specific wins.
  for (const [k, v] of Object.entries(dict)) {
    if (!/\{\w+\}/.test(k)) continue;
    const names = [];
    const re = "^" + esc(k).replace(/\\?\{(\w+)\\?\}/g, (_, name) => { names.push(name); return name === "n" ? "(\\d+(?:[.,]\\d+)?)" : "(.*?)"; }) + "$";
    patterns.push({ re: new RegExp(re), names, v, len: k.length });
  }
  patterns.sort((a, b) => b.len - a.len);
}

export function setLang(l) {
  try { localStorage.setItem("hv-lang", l); } catch {}
  location.reload();
}

// Translate one string. Unknown text comes back unchanged.
export function t(s) {
  if (!dict || s == null) return s;
  const str = String(s);
  const raw = str.trim();
  if (!raw || !/[A-Za-z]/.test(raw)) return str;
  const k = raw.replace(/\s+/g, " ");
  let out = dict[k];
  if (out === undefined) {
    for (const p of patterns) {
      const m = k.match(p.re);
      if (!m) continue;
      const vals = {}; const seen = {};
      p.names.forEach((name, i) => { (vals[name] = vals[name] || []).push(m[i + 1]); });
      out = p.v.replace(/\{(\w+)\}/g, (_, name) => { const i = seen[name] = (seen[name] ?? -1) + 1; const arr = vals[name] || []; return t(arr[Math.min(i, arr.length - 1)] ?? ""); });
      break;
    }
  }
  if (out === undefined || out === k) return str;
  return str.replace(raw, out);
}

// Translate a template and fill it in: tf("{degree} in {field}", { degree, field }).
export function tf(key, vars = {}) {
  const tpl = (dict && dict[key]) || key;
  return tpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");
}

// Remember what was written so translated text is never translated twice (and the observer cannot loop).
const doneText = new WeakMap();
const doneAttr = new WeakMap();
function textNode(n) {
  const cur = n.nodeValue;
  if (doneText.get(n) === cur) return;
  const v = t(cur);
  doneText.set(n, v);
  if (v !== cur) n.nodeValue = v;
}
function attrsOf(n) {
  for (const a of ATTRS) {
    if (!n.hasAttribute(a)) continue;
    const cur = n.getAttribute(a), m = doneAttr.get(n) || {};
    if (m[a] === cur) continue;
    const v = t(cur); m[a] = v; doneAttr.set(n, m);
    if (v !== cur) n.setAttribute(a, v);
  }
  if (n.nodeName === "INPUT" && (n.type === "submit" || n.type === "button") && n.value) { const v = t(n.value); if (v !== n.value) n.value = v; }
}
function translateNode(root) {
  if (!dict || !root) return;
  if (root.nodeType === 3) { if (!root.parentElement?.closest("[data-no-i18n], script, style, textarea, code")) textNode(root); return; }
  if (root.nodeType !== 1 || SKIP.has(root.nodeName) || root.closest?.("[data-no-i18n]")) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeType === 1 && (SKIP.has(n.nodeName) || n.hasAttribute("data-no-i18n")) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [root];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const n of nodes) n.nodeType === 3 ? textNode(n) : attrsOf(n);
}

let observer = null;
export function startTranslating() {
  if (!dict || observer) return;
  translateNode(document.body);
  observer = new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === "characterData") translateNode(m.target);
      else if (m.type === "attributes") translateNode(m.target);
      else m.addedNodes.forEach(translateNode);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// The language menu in the header.
export function langMenu() {
  const cur = LANGS.find((l) => l[0] === lang) || LANGS[0];
  return `<details class="lang-menu"><summary aria-label="Language: ${cur[1]}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg><span>${cur[2]}</span></summary><div class="menu" role="menu" data-no-i18n>${LANGS.map(([code, name]) => `<button type="button" role="menuitemradio" aria-checked="${code === lang}" data-action="set-lang" data-id="${code}" lang="${code}">${name}${code === lang ? '<span aria-hidden="true">✓</span>' : ""}</button>`).join("")}</div></details>`;
}
