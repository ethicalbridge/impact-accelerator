import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
  entryPoints: ["src/app.js"],
  bundle: true,
  minify: true,
  outfile: "app.js",
  format: "esm",
  target: "es2022",
});
for (const file of ["index.html", "styles.css", "app.js"])
  await copyFile(file, `dist/${file}`);
