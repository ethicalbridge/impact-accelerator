// Builds an isolated local UI test harness. Never copied into dist or deployed.
import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";
const out = path.resolve("../qa-site");
await mkdir(out, { recursive: true });
await build({
  entryPoints: ["src/app.js"],
  bundle: true,
  outfile: path.join(out, "app.js"),
  format: "esm",
  alias: { "@supabase/supabase-js": path.resolve("tests/mock-client.js") },
});
for (const f of ["index.html", "styles.css"])
  await copyFile(f, path.join(out, f));
console.log(out);
