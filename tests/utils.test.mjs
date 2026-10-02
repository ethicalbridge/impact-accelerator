import test from "node:test";
import assert from "node:assert/strict";
import { e, safeURL, list, languages, filterRecords, plural, initials } from "../src/utils.js";

test("untrusted text cannot become executable markup", () => {
  assert.equal(e(`<img onerror="x">&'`), "&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;");
  assert.equal(e(null), "");
});

test("links reject executable protocols and relative URLs", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,hi", "/relative", "file:///etc/passwd", "  "]) assert.equal(safeURL(url), "");
  assert.equal(safeURL("https://example.org/report"), "https://example.org/report");
  assert.equal(safeURL("http://example.org", true), "", "evidence links must be https");
});

test("comma lists are trimmed, de-duplicated and capped", () => {
  assert.deepEqual(list(" Data, design ,Data,, "), ["Data", "design"]);
  assert.equal(list(Array.from({ length: 40 }, (_, i) => `s${i}`).join(",")).length, 30);
});

test("languages are required, de-duplicated case-insensitively and bounded", () => {
  assert.deepEqual(languages("English, Swahili, english"), ["English", "Swahili"]);
  assert.throws(() => languages(" , "), /at least one language/);
  assert.throws(() => languages(Array.from({ length: 21 }, (_, i) => `L${i}`).join(",")), /up to 20/);
});

test("directory filters combine search, area, country, language, hours and availability", () => {
  const rows = [
    { id: 1, title: "Build a monitoring dashboard", skills: ["Data"], country: "Kenya", languages: ["English", "Swahili"], hours: 8, arrangement: "Remote" },
    { id: 2, title: "Edit a fundraising video", skills: ["Video"], country: "Ghana", languages: ["English"], hours: 20, arrangement: "Hybrid" },
    { id: 3, name: "Leo", headline: "UX designer", skills: [], country: "Peru", languages: ["Spanish"], hours_available: 0 },
  ];
  const ids = (f) => filterRecords(rows, f).map((r) => r.id);
  assert.deepEqual(ids({ search: "dashboard" }), [1]);
  assert.deepEqual(ids({ area: "Research & data" }), [1]);
  assert.deepEqual(ids({ area: "Design & creative" }), [3], "prefix match: designer → design");
  assert.deepEqual(ids({ area: "Technology & IT" }), [], "short keywords such as 'it' never match inside words");
  assert.deepEqual(ids({ country: "ghana" }), [2]);
  assert.deepEqual(ids({ language: "swahili" }), [1]);
  assert.deepEqual(ids({ hours: "4" }), []);
  assert.deepEqual(ids({ hours: "8" }), [1], "5 to 8 hours");
  assert.deepEqual(ids({ hours: "16" }), [2]);
  const std = new Set(["data analysis", "graphic design"]);
  const rows2 = [{ id: 4, skills: ["Data analysis"] }, { id: 5, skills: ["Graphic design"], title: "data" }];
  assert.deepEqual(filterRecords(rows2, { area: "Research & data", areaSkills: ["data analysis"], standardSkills: std }).map((r) => r.id), [4], "standard skills match by area, not by words");
  assert.deepEqual(ids({ arrangement: "Hybrid" }), [2]);
  assert.deepEqual(ids({ available: true }), []);
  assert.deepEqual(ids({ search: "fundrais video", country: "Ghana" }), [2]);
});

test("small formatting helpers", () => {
  assert.equal(plural(1, "place"), "1 place");
  assert.equal(plural(3, "place"), "3 places");
  assert.equal(initials("Amina Okoro Wanjiru"), "AO");
});
