import test from "node:test";
import assert from "node:assert/strict";
import { escapeHTML, safeURL, filterRecords, list } from "../src/utils.js";
test("untrusted text cannot become executable markup", () => {
  assert.equal(
    escapeHTML('<img onerror="x">&\''),
    "&lt;img onerror=&quot;x&quot;&gt;&amp;&#39;",
  );
});
test("supporting links reject executable protocols and relative URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,hi",
    "/relative",
    "file:///etc/passwd",
  ])
    assert.equal(safeURL(url), "");
  assert.equal(
    safeURL("https://example.org/report"),
    "https://example.org/report",
  );
});
test("directory filters combine search, skills, arrangement and availability", () => {
  const rows = [
    {
      name: "Amina",
      skills: ["Data analysis"],
      hours_available: 4,
      arrangement: "Remote",
      location: "Accra",
    },
    {
      name: "Bela",
      skills: ["Design"],
      hours_available: 0,
      arrangement: "Hybrid",
    },
  ];
  assert.equal(
    filterRecords(rows, {
      search: "accra",
      skill: "DATA",
      availability: "available",
      arrangement: "Remote",
    }).length,
    1,
  );
  assert.equal(
    filterRecords(rows, { skill: "Design", availability: "available" }).length,
    0,
  );
  assert.equal(filterRecords(rows, {}).length, 2);
});
test("portfolio type filter distinguishes publications from research", () => {
  assert.equal(
    filterRecords([{ work_type: "Research" }, { work_type: "Publication" }], {
      type: "Publication",
    }).length,
    1,
  );
});
test("skill parsing trims empties and bounds input", () => {
  assert.deepEqual(list(" Design, , Research "), ["Design", "Research"]);
  assert.equal(list(Array(100).fill("skill").join(",")).length, 30);
});
