// Translation check: lists interface text written in src/ that has no Spanish, Portuguese or French entry in i18n/*.json.
// Run with `npm run i18n:check` (or `node scripts/i18n-check.mjs`). Exits with code 1 when anything is missing.
//   --json        print the missing strings as a JSON skeleton {"English": ["es", "pt", "fr"]} ready to fill in
//   --lang=es     check one language only
//   --all         also list text built around a value ({…}) that has no matching {placeholder} key (--strict fails on them)
//   --unused      also list dictionary keys that no longer appear anywhere in src/ (informational, never fails)
// No dependencies: it reads the source as text. It collects
//   - text between HTML tags in string and template literals (skipping anything inside a data-no-i18n element),
//   - placeholder, aria-label, title and alt attribute values,
//   - plain string literals that read like interface text (start with a capital letter and contain a lower-case word),
// and checks each one the way src/i18n.js translates at run time: exact key, or a key with {placeholders}.
// Text that cannot be known statically (pieces glued to a ${value} or to +) is skipped rather than guessed.
// Agreements (src/agreement.js, src/agreement-translations/) are excluded: the English text is shown untranslated
// with data-no-i18n, and its reading copies live in their own files.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "../..");
const args = process.argv.slice(2);
const LANGS = (args.find((a) => a.startsWith("--lang="))?.slice(7).split(",")) || ["es", "pt", "fr"];
const EXCLUDE = [/^src\/agreement\.js$/, /^src\/agreement-translations\//, /^src\/config\.js$/];
// Parts of files that are not interface text: analytics page names, and the founder's own profile (people's own
// content is never translated).
const SKIP_RANGES = { "src/consent.js": [[/const PAGE_NAMES = \{/, /\n\};/]], "src/examples.js": [[/export const exampleProfile = \{/, /\n\};/]] };
// Object properties whose string values are names, places or addresses, not interface text.
const DATA_KEYS = new Set(["name", "city", "location", "organisation", "logo", "photo", "photo_url", "id", "user_id", "linkedin", "website", "href", "src", "url", "email", "slug", "key", "org_logo"]);

// Names and tokens that are the same in every language and never need an entry.
const SAME = new Set(["Handova", "Ethical Bridge", "Ethical Bridge LLC", "Didit", "Supabase", "GitHub Pages", "Hostinger", "Google Analytics", "Google", "LinkedIn",
  "Facebook", "Instagram", "TikTok", "YouTube", "WhatsApp", "Zoom", "Google Meet", "Microsoft Teams", "Jitsi", "Whereby", "CSV", "PDF", "SEO", "UTC", "MEL", "OK",
  "Julieta Castiñeira de Dios", "Water for Tomorrow", "Bahasa Indonesia", "English", "Español", "Português", "Français", "Wyoming", "Escape", "Enter", "Tab", "ArrowDown", "ArrowUp",
  "ArrowLeft", "ArrowRight", "Home", "End", "Backspace", "Delete", "Esc", "Ctrl", "Meta", "Shift", "Alt", "Spacebar"]);
// Text in src/ that is never shown in the interface (sent to other services).
const NOT_UI = new Set(["Handova admin {…}", "Handova contribution: {…}"]);
const IGNORE_RE = [/^[^A-Za-z]*$/, /^https?:\/\//, /@[\w-]+\.\w/, /^[\w.-]+\.(org|com|net|test|js|css|json|html|pdf|svg|png|jpg|webp|mp4|vtt)\b/i, /^UTC[+−-]?\d/, /^[A-Z0-9_]+$/, /^#/, /(^|[\s,])\.[a-z][\w-]*[\s,]/];

const walk = (dir) => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith(".js") ? [p] : []; });
const files = walk(join(ROOT, "src")).map((p) => relative(ROOT, p).split("\\").join("/")).filter((f) => !EXCLUDE.some((re) => re.test(f))).sort();

// ---------- a small JavaScript tokenizer: strings, templates (with nested ${}), comments, regular expressions ----------
// Each literal becomes { parts: [text, expr, text, ...], line, before, after } where before/after are the neighbouring tokens.
function tokenize(src) {
  const lits = [];
  let i = 0, line = 1, lastSig = "";
  const toks = []; // significant tokens, for neighbour lookup
  const push = (t) => { toks.push(t); lastSig = t.t === "lit" ? "lit" : t.v; };
  const regexOk = () => !lastSig || /^[(,=:[!&|?{};+\-*%<>~^]$|^(return|typeof|case|in|of|delete|void|throw|new|=>|&&|\|\||\?\?)$/.test(lastSig);
  const unescape = (c) => (c === "n" ? "\n" : c === "t" ? "\t" : c);
  function readQuoted(q) {
    let s = ""; i++;
    while (i < src.length && src[i] !== q) {
      if (src[i] === "\\") { s += unescape(src[i + 1]); i += 2; continue; }
      if (src[i] === "\n") line++;
      s += src[i++];
    }
    i++;
    return s;
  }
  function readTemplate() {
    const parts = [""]; i++;
    while (i < src.length && src[i] !== "`") {
      if (src[i] === "\\") { parts[parts.length - 1] += unescape(src[i + 1]); i += 2; continue; }
      if (src[i] === "$" && src[i + 1] === "{") {
        i += 2; const start = i;
        scan(true); // the expression, up to its closing brace
        parts.push(src.slice(start, i - 1), "");
        continue;
      }
      if (src[i] === "\n") line++;
      parts[parts.length - 1] += src[i++];
    }
    i++;
    return { parts };
  }
  // Scans code; inside a template expression it stops after the matching "}".
  function scan(inExpr) {
    let depth = 0;
    while (i < src.length) {
      const c = src[i];
      if (c === "\n") { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === "/" && src[i + 1] === "/") { while (i < src.length && src[i] !== "\n") i++; continue; }
      if (c === "/" && src[i + 1] === "*") { const end = src.indexOf("*/", i + 2); line += (src.slice(i, end).match(/\n/g) || []).length; i = end + 2; continue; }
      if (c === "'" || c === '"' || c === "`") {
        const l0 = line, before = lastSig;
        const lit = c === "`" ? readTemplate() : { parts: [readQuoted(c)] };
        lit.line = l0; lit.before = before; lit.afterIdx = i;
        if (before === ":") { const k = toks[toks.length - 2]; lit.key = k && k.t === "id" ? k.v : ""; }
        lits.push(lit); push({ t: "lit" });
        continue;
      }
      if (c === "/" && regexOk()) { // regular expression literal
        i++; let cls = false;
        while (i < src.length && (cls || src[i] !== "/")) { if (src[i] === "\\") i++; else if (src[i] === "[") cls = true; else if (src[i] === "]") cls = false; i++; }
        i++; while (/[a-z]/i.test(src[i] || "")) i++;
        push({ t: "op", v: "re" }); continue;
      }
      if (/[A-Za-z_$]/.test(c)) { let w = ""; while (/[\w$]/.test(src[i] || "")) w += src[i++]; push({ t: "id", v: w }); continue; }
      if (src.startsWith("=>", i) || src.startsWith("&&", i) || src.startsWith("||", i) || src.startsWith("??", i)) { push({ t: "op", v: src.slice(i, i + 2) }); i += 2; continue; }
      if (inExpr && c === "{") depth++;
      if (inExpr && c === "}" && depth-- === 0) { i++; push({ t: "op", v: "}" }); return; }
      push({ t: "op", v: c }); i++;
    }
  }
  scan(false);
  // What follows each literal (to spot "text " + value concatenation).
  for (const l of lits) { const m = src.slice(l.afterIdx).match(/^\s*(\S)/); l.after = m ? m[1] : ""; }
  return lits;
}

// ---------- turn literals into candidate strings ----------
const HTML_CALL = /^\s*(icon|btn|pill|check|field|select|eyebrow|avatar|avatarFor|empty|back|status|formEnd|mail|link|mark|tags|roleTag|exampleBadge|handedPill|exampleNotice|actionBtn|countrySelect|languagePicker|skillPicker|dropdown|sideNav|todoRow|legalBody|agreementBody|agreementHtml|contributionHtml|wsShell|card|sig|row|chip|stat|banner|toggle|radio|radios|choice|choices|q|qBlock|bar|bars)\s*\(/;
// Does an interpolation produce markup (so text on each side of it becomes separate text nodes)?
function isMarkup(expr) {
  const x = expr.trim();
  if (!x) return true;
  if (/^["'`]\s*</.test(x) || /`\s*</.test(x) && !/^[\w.]+\s*\(/.test(x)) return true;
  if (HTML_CALL.test(x)) return true;
  // .join(", ") or .join(" · ") of plain values is text; .map(...) building markup, or .join(""), is markup.
  if (/\.join\(\s*(["'`])[^"'`<]+\1\s*\)/.test(x) && !/["'`]\s*</.test(x) && !HTML_CALL.test(x.replace(/^[^(]*\(/, ""))) return false;
  if (/\.(map|join)\s*\(/.test(x)) return true;
  if (/\?[\s\S]*:/.test(x) && /<|\b(icon|btn|pill|check|field|eyebrow|empty|back|status|formEnd)\s*\(/.test(x)) return true;
  if (/^(html|body|cards|rows|inner|more|other|extra|head|banner|list|items|form|signForm|logForm|nav|main|content|section|block|note|notes|action|actions|buttons|links|footer|header|steps|table|grid)\w*$/i.test(x)) return true;
  if (/^\(\(\)\s*=>/.test(x)) return true;
  return false;
}
const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", ldquo: "“", rdquo: "”", hellip: "…", middot: "·", ndash: "–", mdash: "—", times: "×", copy: "©" };
const decode = (s) => s.replace(/&(#\d+|#x[0-9a-f]+|\w+);/gi, (m, n) => n[0] === "#" ? String.fromCodePoint(n[1] === "x" ? parseInt(n.slice(2), 16) : +n.slice(1)) : ENT[n] ?? m);
const norm = (s) => decode(s).replace(/\s+/g, " ").trim();
const VOID = new Set(["br", "img", "input", "hr", "meta", "link", "source", "track", "wbr", "col", "area", "base", "embed", "param"]);
const B = "\u0001", P = "\u0002"; // markup boundary, unknown value

function candidates(lit, file) {
  const out = [];
  const add = (text, kind, partial) => out.push({ text, kind, partial, file, line: lit.line });
  const isPlain = lit.parts.length === 1 && !/[<>]/.test(lit.parts[0]);
  if (isPlain) {
    const s = lit.parts[0];
    if (lit.before === "+" || lit.after === "+") return out; // glued to a value at run time
    if (lit.before === "[" && lit.after === "]") return out; // obj["key"]
    if (lit.key && DATA_KEYS.has(lit.key)) return out;
    // Interface text starts with a capital letter; lower-case pieces count only when they read like prose (three or more words).
    const prose = /^[\s·,;:.“"(]*[a-z][a-z’'-]*( [a-z0-9“"(][^\s]*){2,}/.test(s) && !/[_=#{}<>\\|]|\.(js|css|json|html)\b|\b(var|const|let|function|return)\b/.test(s);
    if (!prose && (!/^[\s“"(¿¡]*[A-Z]/.test(s) || !/[a-z]/.test(s))) return out;
    if (/[=;{}\\|]|^\s*#|\$\{|\/\w|_\w|\w\(|\.\w+\(|^[A-Z][\w-]*[A-Z][a-z]/.test(s) && !/[.!?…]\s*$/.test(s) && !/ /.test(s)) return out;
    if (/^[A-Z][a-z]+[A-Z]/.test(s) && !/ /.test(s)) return out; // camelCase identifiers
    add(norm(s), "string");
    return out;
  }
  // Template or string with markup: rebuild with markers, then walk the HTML.
  let s = "";
  lit.parts.forEach((p, k) => { s += k % 2 ? (isMarkup(p) ? B : P) : p; });
  const stack = []; // open elements: true when data-no-i18n
  let text = "", i = 0;
  const flush = () => {
    const raw = text; text = "";
    for (const seg of raw.split(B)) {
      if (stack.includes(true)) continue;
      const t = norm(seg.replace(new RegExp(P, "g"), "{…}"));
      if (!t || !/[A-Za-z]{2}/.test(t.replace(/\{…\}/g, ""))) continue;
      if (t.includes("{…}") && (!/[A-Za-z]{3}/.test(t.replace(/\{…\}/g, "")) || /[=[\]/\\]|\.(png|jpg|json|html|pdf)|^\W*\{…\}\W*$/.test(t))) continue;
      add(t, "text", t.includes("{…}"));
    }
  };
  while (i < s.length) {
    if (s[i] === "<" && /[a-zA-Z/!\u0001\u0002]/.test(s[i + 1] || "")) {
      flush();
      let j = i + 1, q = "";
      while (j < s.length && (q || s[j] !== ">")) { if (q) { if (s[j] === q) q = ""; } else if (s[j] === '"' || s[j] === "'") q = s[j]; j++; }
      const tag = s.slice(i + 1, j);
      if (tag.startsWith("/")) stack.pop();
      else if (!tag.startsWith("!")) {
        const name = (tag.match(/^[\w-]+/) || [""])[0].toLowerCase();
        for (const m of tag.matchAll(/\b(placeholder|aria-label|title|alt)="([^"]*)"/g)) {
          const v = norm(m[2].replace(new RegExp(B + "|" + P, "g"), "{…}"));
          if (v && /[A-Za-z]{2}/.test(v.replace(/\{…\}/g, ""))) add(v, "attr", v.includes("{…}"));
        }
        if (!VOID.has(name) && !tag.endsWith("/")) stack.push(/\bdata-no-i18n\b/.test(tag) || name === "code" || name === "script" || name === "style");
      }
      i = j + 1;
      continue;
    }
    text += s[i++];
  }
  flush();
  return out;
}

// ---------- dictionaries and the run-time matching rules of src/i18n.js ----------
const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, "\\$&");
function loadDict(lang) {
  const dict = JSON.parse(readFileSync(join(ROOT, "i18n", `${lang}.json`), "utf8"));
  const patterns = [];
  for (const k of Object.keys(dict)) {
    if (!/\{\w+\}/.test(k)) continue;
    const names = [];
    const re = "^" + esc(k).replace(/\\?\{(\w+)\\?\}/g, (_, name) => { names.push(name); return name === "n" ? "(\\d+(?:[.,]\\d+)?)" : "(.*?)"; }) + "$";
    patterns.push({ re: new RegExp(re, "s"), names, lit: k.replace(/\{\w+\}/g, "").trim().length, key: k });
  }
  // Keys as wildcard patterns, for source text that itself contains an unknown value.
  const shapes = Object.keys(dict).map((k) => k.replace(/\{\w+\}/g, "{…}"));
  return { dict, patterns, shapes: new Set(shapes), keys: Object.keys(dict) };
}
function known(D, text, partial) {
  if (Object.hasOwn(D.dict, text)) return true;
  if (partial) {
    if (D.shapes.has(text)) return true;
    // "{…}" stands for a value: accept any key that this text could produce, e.g. "Signed {…}" ~ "Signed {date}".
    const re = new RegExp("^" + esc(text).replace(/\\?\{…\\?\}/g, "[\\s\\S]*?") + "$");
    return D.keys.some((k) => re.test(k));
  }
  for (const p of D.patterns) {
    const m = text.match(p.re);
    if (!m) continue;
    if (p.lit < 25 && p.names.some((name, i) => name !== "n" && (m[i + 1].length > (p.lit < 8 ? 30 : 60) || /[!?·:]\s|\s[·:]|\.\s+[A-ZÀ-Þ¿¡]/.test(m[i + 1])))) continue;
    return true;
  }
  return false;
}
// As at run time, a line joined with " · " is also accepted when each of its parts is known (or is only a value).
function knownLine(D, text, partial) {
  if (known(D, text, partial)) return true;
  if (!/\s·\s|^·\s|\s·$/.test(text)) return false;
  const parts = text.split(/\s*·\s*/).filter((x) => x && /[A-Za-z]{2}/.test(x.replace(/\{…\}/g, "")));
  return parts.length > 0 && parts.every((x) => skip(x) || known(D, x, x.includes("{…}")));
}
const CODE_LIKE = /[A-Za-z]\(|[\w}]-\{|\}-[\w{]|\w_|_\w|\.csv\b|^mailto:|^UTC\{/;
const skip = (t) => SAME.has(t) || NOT_UI.has(t) || IGNORE_RE.some((re) => re.test(t)) || t.length < 2 || (t.includes("{…}") && CODE_LIKE.test(t));

// ---------- run ----------
const all = [];
const blank = (s) => s.replace(/[^\n]/g, " ");
function source(f) {
  let src = readFileSync(join(ROOT, f), "utf8");
  for (const [a, b] of SKIP_RANGES[f] || []) {
    const m = src.match(a); if (!m) continue;
    const end = src.slice(m.index).search(b); if (end < 0) continue;
    const stop = m.index + end + src.slice(m.index + end).match(b)[0].length;
    src = src.slice(0, m.index) + blank(src.slice(m.index, stop)) + src.slice(stop);
  }
  return src;
}
for (const f of files) for (const lit of tokenize(source(f))) all.push(...candidates(lit, f));
const seen = new Map();
for (const c of all) { if (skip(c.text)) continue; const k = c.text; if (!seen.has(k)) seen.set(k, { ...c, where: [] }); seen.get(k).where.push(`${c.file}:${c.line}`); }

const missing = new Map(); // text -> { langs:Set, where }
for (const lang of LANGS) {
  const D = loadDict(lang);
  for (const [text, c] of seen) {
    if (knownLine(D, text, c.partial)) continue;
    if (!missing.has(text)) missing.set(text, { langs: new Set(), where: c.where, partial: c.partial });
    missing.get(text).langs.add(lang);
  }
}

const errors = [...missing].filter(([, m]) => !m.partial), partial = [...missing].filter(([, m]) => m.partial);
const strict = args.includes("--strict");
if (args.includes("--json")) {
  const o = {};
  for (const [text, m] of missing) if (!m.partial) o[text] = ["", "", ""];
  console.log(JSON.stringify(o, null, 1));
} else {
  const show = (list) => { for (const [text, m] of list.sort((a, b) => a[1].where[0].localeCompare(b[1].where[0], "en", { numeric: true }))) console.log(`${m.where[0]}  [${[...m.langs].join(",")}]  ${text}`); };
  show(errors);
  if (partial.length && (strict || args.includes("--all"))) { console.log(`\n# Text built around a value ({…}); check these have a {placeholder} key:`); show(partial); }
}
if (args.includes("--unused")) {
  const D = loadDict("es");
  const srcText = files.map((f) => readFileSync(join(ROOT, f), "utf8")).join("\n") + readFileSync(join(ROOT, "src/agreement.js"), "utf8");
  const unused = D.keys.filter((k) => !seen.has(k) && !srcText.includes(k.replace(/\{\w+\}.*$/s, "").slice(0, 40)));
  console.error(`\n${unused.length} dictionary keys not found in src/ (check by hand before removing; some come from the database or policy pages):`);
  for (const k of unused) console.error("  " + k.slice(0, 140));
}
const n = errors.length + (strict ? partial.length : 0);
if (partial.length && !strict) console.error(`(${partial.length} strings built around a value were not checked strictly; see them with --all.)`);
console.error(n ? `\n${n} interface string${n === 1 ? "" : "s"} without a translation in ${LANGS.join("/")}. Add them to i18n/<lang>.json (keyed by the exact English).` : `All interface strings in src/ have ${LANGS.join("/")} translations (${seen.size} checked).`);
process.exit(n ? 1 : 0);
