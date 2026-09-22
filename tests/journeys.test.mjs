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
test("talent creates a portfolio case study and untrusted text remains text", async () => {
  const dom = await setup(),
    w = dom.window;
  try {
    assert.match(q(w, "main").textContent, /Good work/);
    await login(w);
    await navigate(w, "portfolio");
    q(w, "[data-action=add-work]").click();
    await until(w, () => q(w, "[name=title]"));
    set(w, "title", "<img src=x onerror=alert(1)>");
    set(w, "description", "A detailed research and evidence case study.");
    set(w, "role", "Lead researcher");
    set(w, "skills", "Research, Data analysis");
    q(w, "[name=published]").checked = true;
    await submit(w);
    assert.match(q(w, "main").textContent, /<img src=x onerror=alert\(1\)>/);
    assert.equal(q(w, "main img[onerror]"), null);
    const records = JSON.parse(
      w.localStorage.getItem("accelerator-qa-records-v1"),
    );
    const created = records.ia_portfolio.at(-1);
    assert.equal(created.published, true);
    assert.deepEqual(created.skills, ["Research", "Data analysis"]);
    assert.equal(created.user_id, records.ia_profiles[0].user_id);
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
    q(w, "[name=published]").checked = false;
    await submit(w);
    const p = JSON.parse(w.localStorage.getItem("accelerator-qa-records-v1"))
      .ia_profiles[0];
    assert.equal(p.hours_available, 6);
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
    await submit(w);
    assert.equal(q(w, ".form-error")?.textContent || "", "");
    const n = JSON.parse(
      w.localStorage.getItem("accelerator-qa-records-v1"),
    ).ia_needs.at(-1);
    assert.equal(n.status, "draft");
    assert.equal(n.organisation_id, "20000000-0000-4000-8000-000000000001");
  } finally {
    w.close();
  }
});
