// Lets `node --test tests/` run every unit test (Node 22 treats a folder argument as a module path, not a glob).
// `pnpm test` (node --test tests/*.test.mjs) runs the same files. The browser tests in tests/e2e run with `pnpm e2e`.
import { readdirSync } from "node:fs";
for (const f of readdirSync(new URL(".", import.meta.url)).filter((n) => n.endsWith(".test.mjs")).sort()) await import(`./${f}`);
