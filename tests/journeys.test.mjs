import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { build } from "esbuild";
import { JSDOM } from "jsdom";
import path from "node:path";
const bundle = await build({
  entryPoints: ["src/app.js"],
  bundle: true,
  write: false,
  format: "esm",
  alias: { "@supabase/supabase-js": path.resolve("tests/mock-client.js") },
});
const source = bundle.outputFiles[0].text;
async function setup() {
  const dom = new JSDOM(await readFile("index.html", "utf8"), {
    url: "http://localhost/",
    runScripts: "outside-only",
    pretendToBeVisual: true,
  });
  const w = dom.window;
  w.scrollTo = () => {};
  w.HTMLElement.prototype.scrollIntoView = () => {};
  w.HTMLDialogElement.prototype.showModal = function () {
    this.open = true;
  };
  w.HTMLDialogElement.prototype.close = function () {
    this.open = false;
  };
  await w.eval(`(async()=>{${source}\n})()`);
  return dom;
}
async function until(w, predicate) {
  for (let i = 0; i < 100; i++) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
  throw Error("UI did not settle: " + w.document.body.textContent.slice(-1500));
}
const q = (w, s) => w.document.querySelector(s);
function set(w, name, value) {
  q(w, `dialog [name="${name}"]`).value = value;
}
async function submit(w) {
  q(w, "dialog form").dispatchEvent(
    new w.Event("submit", { bubbles: true, cancelable: true }),
  );
  await until(
    w,
    () => !q(w, "dialog").open || q(w, ".form-error")?.textContent,
  );
}
async function navigate(w, hash) {
  w.location.hash = hash;
  await new Promise((r) => setTimeout(r, 25));
}
async function login(w, email = "talent@example.test") {
  q(w, "#account").click();
  set(w, "email", email);
  set(w, "password", "local-test-only");
  await submit(w);
  await until(w, () => q(w, "#account").textContent === "Account");
}
test("example directories lead to generated, filterable impact records without manual editing", async () => {
  const dom = await setup(),
    w = dom.window;
  try {
    assert.equal(q(w, '#navigation a[href="#portfolio"]'), null);
    await navigate(w, "talent");
    assert.equal(q(w, "#example-count").textContent, "7 examples");
    q(w, "#filters [name=search]").value = "Maria";
    q(w, "#filters").dispatchEvent(new w.Event("input", { bubbles: true }));
    assert.equal(q(w, "#example-count").textContent, "1 example");
    q(w, 'a[href="#profile/example-maria-lopez"]').click();
    await until(w, () => q(w, "#contribution-list"));
    assert.match(q(w, "h1").textContent, /Maria Lopez/);
    assert.equal(q(w, "[data-action=add-work]"), null);
    const metrics = [
      ...w.document.querySelectorAll(".impact-metrics strong"),
    ].map((x) => x.textContent);
    assert.deepEqual(metrics, ["7", "5", "86", "4.9 / 5"]);
    assert.equal(w.document.querySelectorAll(".contribution-card").length, 9);
    q(w, "#contribution-status").value = "ongoing";
    q(w, "#contribution-status").dispatchEvent(new w.Event("change"));
    assert.equal(w.document.querySelectorAll(".contribution-card").length, 1);
    assert.equal(q(w, ".endorsement"), null);
    q(w, "[data-action=example-linkedin]").click();
    await until(w, () => q(w, "dialog").open);
    assert.match(q(w, "dialog").textContent, /fictional/);
    q(w, "dialog .close").click();
    await navigate(w, "needs");
    assert.equal(q(w, "#example-count").textContent, "7 examples");
    q(w, 'a[href="#need/example-accessibility"]').click();
    await until(w, () =>
      q(w, "main h1")?.textContent.includes("accessibility"),
    );
    assert.match(q(w, "main").textContent, /does not accept applications/);
    assert.equal(q(w, "[data-action=apply]"), null);
  } finally {
    w.close();
  }
});

test("profile editing saves availability and explicit privacy choice", async () => {
  const dom = await setup(),
    w = dom.window;
  try {
    await login(w);
    q(w, "[data-action=edit-profile]").click();
    await until(w, () => q(w, "[name=hours_available]"));
    set(w, "hours_available", "6");
    set(w, "languages", "English, Spanish, english");
    q(w, "[name=published]").checked = false;
    await submit(w);
    const p = JSON.parse(w.localStorage.getItem("accelerator-qa-records-v1"))
      .ia_profiles[0];
    assert.equal(p.hours_available, 6);
    assert.deepEqual(p.languages, ["English", "Spanish"]);
    assert.equal(p.published, false);
    assert.match(q(w, "main").textContent, /Your profile is private/);
  } finally {
    w.close();
  }
});
test("application and private message are saved with correct participants", async () => {
  const dom = await setup(),
    w = dom.window;
  try {
    await login(w);
    await navigate(w, "need/40000000-0000-4000-8000-000000000001");
    q(w, "[data-action=apply]").click();
    await until(w, () => q(w, "[name=message]"));
    set(w, "message", "I can contribute research and accessible reporting.");
    await submit(w);
    await navigate(w, "workspace");
    q(w, "[data-action=conversation]").click();
    await until(w, () => q(w, "[name=body]"));
    set(w, "body", "Can we agree the scope?");
    q(w, "dialog form").dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    await until(w, () =>
      q(w, ".messages").textContent.includes("Can we agree"),
    );
    const records = JSON.parse(
      w.localStorage.getItem("accelerator-qa-records-v1"),
    );
    assert.equal(records.ia_applications.length, 1);
    assert.equal(
      records.ia_messages[0].sender_id,
      records.ia_profiles[0].user_id,
    );
    assert.equal(records.ia_messages[0].need_id, records.ia_needs[0].id);
  } finally {
    w.close();
  }
});
test("accepted match requires both agreement signatures before time entry", async () => {
  const dom = await setup(),
    w = dom.window;
  try {
    await login(w);
    await navigate(w, "need/40000000-0000-4000-8000-000000000001");
    q(w, "[data-action=apply]").click();
    await until(w, () => q(w, "[name=message]"));
    set(w, "message", "I can prepare the report and accessible handover.");
    await submit(w);
    q(w, "#account").click();
    q(w, "[data-action=signout]").click();
    await until(w, () => q(w, "#account").textContent === "Sign in / Join");
    await login(w, "org@example.test");
    await navigate(w, "organisation");
    q(w, "[data-action=accept-application]").click();
    await until(w, () => q(w, 'form[data-form="accept-application"]'));
    q(w, 'form[data-form="accept-application"]').dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    await until(w, () => q(w, 'form[data-form="agreement"]'));
    assert.match(q(w, ".agreement-document").textContent, /Never be shared/iu);
    for (const name of ["scope", "security", "terms"])
      q(w, `[name="${name}"]`).checked = true;
    set(w, "signature_name", "Organisation Reviewer");
    await submit(w);
    q(w, "#account").click();
    q(w, "[data-action=signout]").click();
    await until(w, () => q(w, "#account").textContent === "Sign in / Join");
    await login(w);
    await navigate(w, "workspace");
    q(w, "[data-action=agreement]").click();
    await until(w, () => q(w, 'form[data-form="agreement"]'));
    for (const name of ["scope", "security", "terms"])
      q(w, `[name="${name}"]`).checked = true;
    set(w, "signature_name", "Amina Okoro");
    await submit(w);
    await navigate(w, "hours");
    q(w, "[data-action=log-time]").click();
    await until(w, () => q(w, 'form[data-form="hours"]'));
    const records = JSON.parse(
      w.localStorage.getItem("accelerator-qa-records-v1"),
    );
    assert.ok(records.ia_agreements[0].talent_signed_at);
    assert.ok(records.ia_agreements[0].organisation_signed_at);
  } finally {
    w.close();
  }
});
test("organisation creates a draft need with correct ownership", async () => {
  const dom = await setup(),
    w = dom.window;
  try {
    await login(w, "org@example.test");
    await navigate(w, "organisation");
    q(w, "[data-action=add-need]").click();
    await until(w, () => q(w, "[name=title]"));
    set(w, "title", "Design a research toolkit");
    set(
      w,
      "description",
      "Help us design a clear and reusable community research toolkit.",
    );
    set(w, "output", "A toolkit and staff handover");
    set(w, "skills", "Research, Training");
    set(w, "languages", "French, Swahili");
    await submit(w);
    assert.equal(q(w, ".form-error")?.textContent || "", "");
    const n = JSON.parse(
      w.localStorage.getItem("accelerator-qa-records-v1"),
    ).ia_needs.at(-1);
    assert.equal(n.status, "draft");
    assert.deepEqual(n.languages, ["French", "Swahili"]);
    assert.equal(n.organisation_id, "20000000-0000-4000-8000-000000000001");
  } finally {
    w.close();
  }
});

test("home introduces the Alliance, protects sensitive information and links all pathways", async () => {
  const dom = await setup(),
    w = dom.window;
  try {
    assert.match(
      q(w, ".alliance-intro").textContent,
      /Part of Local Impact Alliance/,
    );
    assert.equal(w.document.querySelectorAll(".journey-card").length, 3);
    assert.match(
      q(w, ".trust-panel").textContent,
      /Never share passwords, payment-card details/,
    );
    assert.match(
      q(w, ".trust-resources").textContent,
      /Please read these sections before participating/,
    );
    assert.deepEqual(
      [...w.document.querySelectorAll(".trust-links a")].map((a) => a.hash),
      ["#guide", "#privacy", "#safeguarding", "#about"],
    );
    assert.match(
      q(w, ".responsibility").textContent,
      /no breach of our own duties/,
    );
    await navigate(w, "about");
    assert.equal(w.document.querySelectorAll(".platform-card").length, 3);
    assert.ok(q(w, 'a[href="https://ethicalbridge.github.io/mobilise/"]'));
    assert.ok(q(w, 'a[href="https://julimapea.com/"]'));
    await navigate(w, "talent");
    q(w, "#filters [name=language]").value = "Spanish";
    q(w, "#filters").dispatchEvent(new w.Event("input", { bubbles: true }));
    assert.match(q(w, "#example-results").textContent, /Maria Lopez/);
    assert.doesNotMatch(q(w, "#example-results").textContent, /Samira Khan/);
  } finally {
    w.close();
  }
});
