// Production build: bundles src/ into app.js (committed, served by GitHub Pages) and writes dist/ for preview.
// Optional: SUPABASE_SRC=/path/to/supabase-js/packages bundles the client from source (used where npm is unavailable).
import { build } from "esbuild";
import { mkdir, cp, readFile, writeFile } from "node:fs/promises";
import { homeHero } from "../src/pages/public.js";
const src = process.env.SUPABASE_SRC;
const alias = src
  ? {
      "@supabase/supabase-js": `${src}/core/supabase-js/src/index.ts`, "@supabase/auth-js": `${src}/core/auth-js/src/index.ts`,
      "@supabase/postgrest-js": `${src}/core/postgrest-js/src/index.ts`, "@supabase/realtime-js": `${src}/core/realtime-js/src/index.ts`,
      "@supabase/storage-js": `${src}/core/storage-js/src/index.ts`, "@supabase/functions-js": `${src}/core/functions-js/src/index.ts`,
      "@supabase/tracing": `${src}/shared/tracing/src/index.ts`, "@supabase/phoenix": "./scripts/realtime-stub.js", "iceberg-js": "./scripts/realtime-stub.js",
    }
  : {};
if (process.env.MOCK && !process.env.OUT) throw Error("MOCK builds must set OUT so the local test backend never replaces the production app.js");
if (process.env.MOCK) alias["@supabase/supabase-js"] = "./tests/mock-supabase.js";
await build({ entryPoints: ["src/app.js"], bundle: true, minify: !process.env.MOCK, format: "esm", target: "es2022", outfile: process.env.OUT ? `${process.env.OUT}/app.js` : "app.js", alias, legalComments: "none", logLevel: "warning" });
await build({ entryPoints: ["src/consent-boot.js"], bundle: true, minify: !process.env.MOCK, format: "iife", target: "es2022", outfile: process.env.OUT ? `${process.env.OUT}/consent-boot.js` : "consent-boot.js", legalComments: "none", logLevel: "warning" });
const out = process.env.OUT || "dist";
await mkdir(out, { recursive: true });
const sourceHtml = await readFile("index.html", "utf8");
const start = "<!-- home-hero:start -->", end = "<!-- home-hero:end -->";
if (!sourceHtml.includes(start) || !sourceHtml.includes(end)) throw Error("Missing home hero markers in index.html");
const indexHtml = sourceHtml.replace(/<!-- home-hero:start -->[\s\S]*?<!-- home-hero:end -->/, `${start}\n${homeHero()}\n${end}`);
if (!process.env.OUT) await writeFile("index.html", indexHtml);
await writeFile(`${out}/index.html`, indexHtml);
for (const f of ["styles.css", "favicon.svg", "og-image.png", "apple-touch-icon.png", "404.html", "robots.txt", "CNAME"]) await cp(f, `${out}/${f}`);
await cp("fonts", `${out}/fonts`, { recursive: true });
await cp("assets", `${out}/assets`, { recursive: true });
if (!process.env.OUT) {
  await cp("app.js", `${out}/app.js`);
  await cp("consent-boot.js", `${out}/consent-boot.js`);
}
console.log("built", out);
