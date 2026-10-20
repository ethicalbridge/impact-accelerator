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

// ?lang=es|pt|fr|en in the address, before or after the # (e.g. handova.org/?lang=pt or handova.org/#needs?lang=fr).
const LANG_PARAM = /([?&])lang=(en|es|pt|fr)(?=&|$)/;
export function urlLang() {
  return (location.search.match(LANG_PARAM) || location.hash.match(LANG_PARAM) || [])[2] || null;
}
// After reading it, take ?lang= out of the address, so the language menu (which reloads the page) still works.
export function stripLangParam() {
  const drop = (q) => q.replace(/([?&])lang=[^&#]*&?/, "$1").replace(/[?&]$/, "");
  const search = drop(location.search), hash = drop(location.hash);
  if (search === location.search && hash === location.hash) return;
  history.replaceState(history.state, "", location.pathname + search + (hash === "#" ? "" : hash));
}

export function initialLang() {
  const fromUrl = urlLang();
  if (fromUrl) { try { localStorage.setItem("hv-lang", fromUrl); } catch {} return fromUrl; }
  try { const s = localStorage.getItem("hv-lang"); if (s && LANGS.some((l) => l[0] === s)) return s; } catch {}
  const n = (navigator.language || "en").slice(0, 2).toLowerCase();
  return LANGS.some((l) => l[0] === n) ? n : "en";
}

const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
// The small script in the page head starts downloading the dictionary at the same time as the app (window.__hvI18n);
// it is reused here when it is for the same language. The file's ?v= is set by the build (data-i18n-v on <html>).
export async function loadLang(l) {
  lang = LANGS.some((x) => x[0] === l) ? l : "en";
  document.documentElement.lang = lang;
  dict = null; patterns = [];
  const early = window.__hvI18n;
  window.__hvI18n = null;
  if (lang === "en") return;
  const v = document.documentElement.dataset.i18nV;
  try {
    dict = await ((early?.lang === lang && early.p) || Promise.reject()).catch(async () => {
      const r = await fetch(`i18n/${lang}.json${v ? `?v=${v}` : ""}`);
      if (!r.ok) throw Error("missing");
      return r.json();
    });
  } catch { dict = null; lang = "en"; document.documentElement.lang = "en"; return; }
  // Keys with placeholders become patterns, longest first so the most specific wins.
  for (const [k, v] of Object.entries(dict)) {
    if (!/\{\w+\}/.test(k)) continue;
    const names = [];
    const re = "^" + esc(k).replace(/\\?\{(\w+)\\?\}/g, (_, name) => { names.push(name); return name === "n" ? "(\\d+(?:[.,]\\d+)?)" : "(.*?)"; }) + "$";
    patterns.push({ re: new RegExp(re), names, v, len: k.length, lit: k.replace(/\{\w+\}/g, "").trim().length });
  }
  patterns.sort((a, b) => b.len - a.len);
}

export function setLang(l) {
  if (window.__hvDirty && !window.confirm(t("Changing the language reloads the page, and what you have typed in this form will be lost. Continue?"))) return;
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
      // A short pattern such as "{degree} in {field}" must not swallow a whole sentence that merely contains " in ".
      // (A full stop followed by a capital starts a new sentence; "oct. 2026" or "out. de 2026" in a date does not.)
      if (p.lit < 25 && p.names.some((name, i) => name !== "n" && (m[i + 1].length > (p.lit < 8 ? 30 : 60) || /[!?·:]\s|\s[·:]|\.\s+[A-ZÀ-Þ¿¡]/.test(m[i + 1])))) continue;
      const vals = {}; const seen = {};
      p.names.forEach((name, i) => { (vals[name] = vals[name] || []).push(m[i + 1]); });
      out = p.v.replace(/\{(\w+)\}/g, (_, name) => { const i = seen[name] = (seen[name] ?? -1) + 1; const arr = vals[name] || []; return t(arr[Math.min(i, arr.length - 1)] ?? ""); });
      break;
    }
  }
  // Lines built from parts, such as "8 hours · created 3 Oct 2026", are translated part by part.
  if (out === undefined && /\s·\s|^·\s/.test(k)) {
    const parts = k.split(/(\s*·\s*)/);
    const tr = parts.map((x, i) => (i % 2 || !x ? x : t(x)));
    if (tr.some((x, i) => x !== parts[i])) out = tr.join("");
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
    acceptNode: (n) => { if (n.nodeName === "TEXTAREA" && !n.hasAttribute("data-no-i18n")) attrsOf(n); return n.nodeType === 1 && (SKIP.has(n.nodeName) || n.hasAttribute("data-no-i18n")) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; },
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
  return `<details class="lang-menu"><summary aria-label="Language: ${cur[1]}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/></svg><span>${cur[2]}</span></summary><div class="menu" data-no-i18n>${LANGS.map(([code, name]) => `<button type="button" aria-pressed="${code === lang}" data-action="set-lang" data-id="${code}" lang="${code}">${name}${code === lang ? '<span aria-hidden="true">✓</span>' : ""}</button>`).join("")}</div></details>`;
}
