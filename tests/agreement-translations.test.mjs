// The reading copies must match the English agreements section by section, so a changed English text is never shown
// next to an outdated translation without anyone noticing. Signing and hashing must not depend on the language.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PRO_AGREEMENT, PRO_AGREEMENT_VERSION, ORG_AGREEMENT, ORG_AGREEMENT_VERSION, CONTRIBUTION_VERSION, PRO_SUMMARY, ORG_SUMMARY,
  AGREEMENT_TRANSLATIONS, translatedSections, translatedContribution, contributionSections, contributionText, proAgreementText, orgAgreementText,
  loadAgreementCopy,
} from "../src/agreement.js";

// The reading copies are downloaded only when needed (W15); load all three for the checks below.
for (const lang of ["es", "pt", "fr"]) await loadAgreementCopy(lang);

const scope = { need_title: "Need", organisation: "Org", organisation_country: "Kenya", talent: "Pro", talent_country: "Brazil", output: "Out", description: "Desc", hours: 8, languages: ["English", "Spanish"] };

for (const lang of ["es", "pt", "fr"]) {
  const tr = AGREEMENT_TRANSLATIONS[lang];
  test(`${lang}: platform agreements are complete and current`, () => {
    assert.equal(tr.professional.version, PRO_AGREEMENT_VERSION);
    assert.equal(tr.organisation.version, ORG_AGREEMENT_VERSION);
    for (const [kind, en] of [["professional", PRO_AGREEMENT], ["organisation", ORG_AGREEMENT]]) {
      assert.deepEqual(Object.keys(tr[kind].sections), en.map(([h]) => h), `${kind} headings`);
      for (const [h, items] of en) assert.equal(tr[kind].sections[h][1].length, items.length, `${kind} ${h}`);
      assert.ok(translatedSections(kind, lang), `${kind} reading copy is shown`);
    }
    assert.equal(tr.professional.summary.length, PRO_SUMMARY.length);
    assert.equal(tr.organisation.summary.length, ORG_SUMMARY.length);
    for (const k of ["toTranslation", "toEnglish", "englishNote", "readingNote", "englishOnly", "readingCopy", "download", "summaryTitle", "summaryNote", "textLabel", "englishText"]) assert.ok(tr.ui[k], `ui.${k}`);
  });
  test(`${lang}: contribution agreement v3 reading copy matches the English sections`, () => {
    assert.equal(tr.contribution.version, CONTRIBUTION_VERSION);
    const out = translatedContribution(scope, CONTRIBUTION_VERSION, lang);
    assert.ok(out);
    assert.equal(out.length, contributionSections(scope).length);
    const text = out.flatMap(([, ps]) => ps).join("\n");
    for (const v of ["Org", "Pro", "Out", "Desc", "8"]) assert.ok(text.includes(v), `includes ${v}`);
    assert.equal(translatedContribution(scope, "contribution-2026-10-v2", lang), null, "older versions have no reading copy");
  });
}

test("the signed text is the English text, whatever the language", () => {
  assert.ok(proAgreementText().startsWith("Handova professional agreement (professional-2026-10-20-v3)"));
  assert.ok(orgAgreementText().startsWith("Handova organisation agreement (organisation-2026-10-20-v3)"));
  assert.ok(contributionText(scope).includes("This agreement is between Org (Kenya)"));
});
