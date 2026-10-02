// Production build: bundles src/ into app.js (committed, served by GitHub Pages) and writes dist/ for preview.
// Optional: SUPABASE_SRC=/path/to/supabase-js/packages bundles the client from source (used where npm is unavailable).
import { build } from "esbuild";
import { mkdir, cp } from "node:fs/promises";
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
const out = process.env.OUT || "dist";
await mkdir(out, { recursive: true });
for (const f of ["index.html", "styles.css", "favicon.svg", "og-image.png", "apple-touch-icon.png", "404.html", "robots.txt", "CNAME"]) await cp(f, `${out}/${f}`);
await cp("fonts", `${out}/fonts`, { recursive: true });
await cp("assets", `${out}/assets`, { recursive: true });
if (!process.env.OUT) await cp("app.js", `${out}/app.js`);
console.log("built", out);
