// Production build: bundles src/ into app.js plus code-split chunks/ (both committed while GitHub Pages serves the branch
// root) and writes dist/, the folder the Pages workflow publishes. It also sets every ?v= in index.html from a short hash
// of the file it points to, and the Content-Security-Policy hash of the inline boot script, so neither can go stale.
// Optional: SUPABASE_SRC=/path/to/supabase-js/packages bundles the client from source (used where npm is unavailable).
// Builds made that way are only reproducible from the same supabase-js commit: see scripts/supabase-src-commit.txt.
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { mkdir, cp, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { resolve } from "node:path";
import { home } from "../src/pages/public.js";
import { header, footer } from "../src/ui.js";
import { config } from "../src/config.js";
// esbuild names chunks with a hash that includes source paths relative to this folder, so the source tree is reached
// through a fixed link (node_modules/.supabase-src) and the same commit builds the same files on any machine.
let src = process.env.SUPABASE_SRC;
if (src) {
  await rm("node_modules/.supabase-src", { force: true, recursive: true });
  await mkdir("node_modules", { recursive: true });
  await symlink(resolve(src), "node_modules/.supabase-src", "dir");
  src = "./node_modules/.supabase-src";
}
const alias = src
  ? {
      "@supabase/supabase-js": `${src}/core/supabase-js/src/index.ts`, "@supabase/auth-js": `${src}/core/auth-js/src/index.ts`,
      "@supabase/postgrest-js": `${src}/core/postgrest-js/src/index.ts`, "@supabase/realtime-js": `${src}/core/realtime-js/src/index.ts`,
      "@supabase/storage-js": `${src}/core/storage-js/src/index.ts`, "@supabase/functions-js": `${src}/core/functions-js/src/index.ts`,
      "@supabase/tracing": `${src}/shared/tracing/src/index.ts`, "@supabase/phoenix": "./scripts/realtime-stub.js", "iceberg-js": "./scripts/realtime-stub.js",
    }
  : {};
if (src && !process.env.MOCK) {
  const pinned = (await readFile("scripts/supabase-src-commit.txt", "utf8")).trim();
  let head = "";
  try { head = execFileSync("git", ["-C", src, "rev-parse", "HEAD"], { encoding: "utf8" }).trim(); } catch {}
  if (head !== pinned) console.warn(`SUPABASE_SRC is at ${head || "an unknown commit"}, not ${pinned} (scripts/supabase-src-commit.txt): CI will not reproduce this app.js. Check out that commit, or update the file in the same change.`);
}
if (process.env.MOCK && !process.env.OUT) throw Error("MOCK builds must set OUT so the local test backend never replaces the production app.js");
if (process.env.MOCK) alias["@supabase/supabase-js"] = "./tests/mock-supabase.js";
const out = process.env.OUT || "dist";
// Where the scripts go: the repo root for the production build (GitHub Pages serves it), otherwise OUT.
const jsDir = process.env.OUT || ".";
await rm(`${jsDir}/chunks`, { recursive: true, force: true });
// Admin, workspace and agreement code are loaded with import() from the router, so esbuild puts them in their own chunks.
await build({ entryPoints: ["src/app.js"], bundle: true, splitting: true, minify: !process.env.MOCK, format: "esm", target: "es2022", outdir: jsDir, entryNames: "[name]", chunkNames: "chunks/[name]-[hash]", alias, preserveSymlinks: !!src, legalComments: "none", logLevel: "warning" });
await build({ entryPoints: ["src/consent-boot.js"], bundle: true, minify: !process.env.MOCK, format: "iife", target: "es2022", outfile: `${jsDir}/consent-boot.js`, legalComments: "none", logLevel: "warning" });
await mkdir(out, { recursive: true });

const short = (buf) => createHash("sha256").update(buf).digest("hex").slice(0, 10);
const i18nFiles = ["es", "pt", "fr"].map((l) => `i18n/${l}.json`);
const versions = {
  "app.js": short(await readFile(`${jsDir}/app.js`)),
  "consent-boot.js": short(await readFile(`${jsDir}/consent-boot.js`)),
  "styles.css": short(await readFile("styles.css")),
  i18n: short(Buffer.concat(await Promise.all(i18nFiles.map((f) => readFile(f))))),
};

let indexHtml = await readFile("index.html", "utf8");
const sections = { header: header(), home: home().html, footer: footer(config) };
for (const [name, html] of Object.entries(sections)) {
  const start = `<!-- static-${name}:start -->`, end = `<!-- static-${name}:end -->`;
  if (!indexHtml.includes(start) || !indexHtml.includes(end)) throw Error(`Missing ${name} markers in index.html`);
  indexHtml = indexHtml.replace(new RegExp(`${start}[\\s\\S]*?${end}`), `${start}\n${html}\n${end}`);
}
for (const f of ["app.js", "consent-boot.js", "styles.css"]) {
  const re = new RegExp(`((?:src|href)="${f.replace(".", "\\.")})\\?v=[^"]*"`, "g");
  if (!re.test(indexHtml)) throw Error(`index.html does not load ${f} with a ?v= version`);
  indexHtml = indexHtml.replace(re, `$1?v=${versions[f]}"`);
}
if (!/<html [^>]*data-i18n-v="[^"]*"/.test(indexHtml)) throw Error("index.html: <html> needs a data-i18n-v attribute");
indexHtml = indexHtml.replace(/(<html [^>]*data-i18n-v=")[^"]*"/, `$1${versions.i18n}"`);
// The Content-Security-Policy allows exactly the inline boot script(s) in the page, by hash.
// Browsers read CR LF line ends as LF before hashing, so the hash is taken the same way.
const inline = [...indexHtml.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => `'sha256-${createHash("sha256").update(m[1].replace(/\r\n?/g, "\n")).digest("base64")}'`);
if (!/script-src 'self'( 'sha256-[^']+')*/.test(indexHtml)) throw Error("index.html: CSP script-src not found");
indexHtml = indexHtml.replace(/script-src 'self'( 'sha256-[^']+')*/, `script-src 'self'${inline.map((h) => " " + h).join("")}`);

if (!process.env.OUT) await writeFile("index.html", indexHtml);
await writeFile(`${out}/index.html`, indexHtml);
for (const f of ["styles.css", "favicon.svg", "og-image.png", "apple-touch-icon.png", "404.html", "robots.txt", "sitemap.xml", "CNAME"]) await cp(f, `${out}/${f}`);
for (const d of ["fonts", "assets", "i18n"]) await cp(d, `${out}/${d}`, { recursive: true });
if (!process.env.OUT) {
  await rm(`${out}/chunks`, { recursive: true, force: true });
  for (const f of ["app.js", "consent-boot.js", "chunks"]) await cp(f, `${out}/${f}`, { recursive: true });
}
console.log("built", out, versions);
