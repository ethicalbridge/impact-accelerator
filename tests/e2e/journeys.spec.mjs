// The main journeys, end to end, on the test copy: sign up, apply, accept, sign (both sides), log hours, approve.
// Each test gets a fresh browser, so a fresh fake database seeded by tests/mock-supabase.js.
import { test, expect } from "playwright/test";

const NEED = "00000000-0000-4000-8000-0000000000bb";
const TALENT = "00000000-0000-4000-8000-00000000000c";
const PASSWORD = "a-long-test-password";

// No page may throw or log an error while a journey runs.
let problems;
test.beforeEach(async ({ page }) => {
  problems = [];
  page.on("pageerror", (err) => problems.push(String(err)));
  page.on("console", (m) => { if (m.type() === "error") problems.push(m.text()); });
});
test.afterEach(() => expect(problems, "browser errors").toEqual([]));

const mockDb = (page, fn, arg) => page.evaluate(fn, arg);
async function signIn(page, email) {
  await page.goto("/#signin");
  const form = page.locator("form[data-form=signin]");
  await form.locator("input[type=email]").fill(email);
  await form.locator("input[type=password]").fill(PASSWORD);
  await form.locator("[type=submit]").click();
  await expect(page).not.toHaveURL(/#signin/);
}
async function signOut(page) {
  await page.evaluate(() => localStorage.removeItem("ia-mock-session-v1"));
  await page.goto("/#home");
  await page.reload();
}
// Tick every required box and fill every empty required text field, then sign.
async function signAgreement(page) {
  const form = page.locator("form[data-form=sign]");
  await expect(form).toBeVisible();
  for (const box of await form.locator("input[type=checkbox][required]").all()) await box.check();
  for (const input of await form.locator("input[type=text][required]").all()) {
    if (!(await input.inputValue())) await input.fill((await input.getAttribute("name")) === "role" ? "Programme director" : "Wanjiru Kamau, wk@example.test");
  }
  await form.locator("[type=submit]").click();
}
const toast = (page) => page.locator("#toast");

test("a professional signs up, then signs in to finish their profile", async ({ page }) => {
  await page.goto("/#join");
  const form = page.locator("form[data-form=signup]");
  await form.locator("[name=role][value=professional]").check();
  await form.locator("[name=name]").fill("Lucía Fernández");
  await form.locator("[name=headline]").fill("Monitoring and evaluation");
  await form.locator("[name=email]").fill("lucia@example.test");
  await form.locator("[name=password]").fill(PASSWORD);
  await form.locator("[name=password2]").fill(PASSWORD);
  await form.locator("[name=adult]").check();
  await form.locator("[name=terms]").check();
  await form.locator("[type=submit]").click();
  await expect(page.getByText(/check your (email|inbox)/i).first()).toBeVisible();
  await signIn(page, "lucia@example.test");
  await expect(page).toHaveURL(/#onboarding/);
});

test("apply, accept, both sign, log hours and approve them", async ({ page }) => {
  // The professional applies.
  await signIn(page, "talent@example.test");
  await page.goto(`/#need/${NEED}`);
  await page.locator("[data-action=apply]:visible").first().click();
  const apply = page.locator("form[data-form=apply]");
  await apply.locator("[name=message]").fill("I would build the template in week one and run the handover session in week two.");
  await apply.locator("[name=conflict][value=no]").check();
  await apply.locator("[type=submit]").click();
  await expect(toast(page)).toContainText("Application sent");

  // The organisation accepts and signs.
  await signOut(page);
  await signIn(page, "org@example.test");
  await page.goto(`/#org/needs/${NEED}`);
  await page.locator("[data-action=app-accept]").click();
  await page.locator("form[data-form=app-accept] [type=submit]").click();
  await expect(toast(page)).toContainText("Application accepted");
  const agreement = await page.locator("a[href^='#agreement/']").first().getAttribute("href");
  await page.goto("/" + agreement);
  await signAgreement(page);
  await expect(toast(page)).toContainText("Signed");

  // The professional (identity already checked) signs and logs time.
  await signOut(page);
  await mockDb(page, (id) => {
    const d = JSON.parse(localStorage.getItem("ia-mock-db-v1"));
    Object.assign(d.profiles.find((p) => p.user_id === id), { id_status: "approved", id_verified_at: new Date().toISOString() });
    localStorage.setItem("ia-mock-db-v1", JSON.stringify(d));
  }, TALENT);
  await signIn(page, "talent@example.test");
  await page.goto("/" + agreement);
  await signAgreement(page);
  await expect(toast(page)).toContainText("Signed by both");
  const hours = page.locator("form[data-form=log-hours]");
  await hours.locator("[name=hours]").fill("2.5");
  await hours.locator("[name=description]").fill("Drafted the report template and shared it for comments.");
  await hours.locator("[type=submit]").click();
  await expect(toast(page)).toContainText("Time submitted for review");

  // The organisation approves, with an impatient double click: it must count once.
  await signOut(page);
  await signIn(page, "org@example.test");
  await page.goto(`/#org/needs/${NEED}`);
  await page.locator("[data-action=hours-approve]").dblclick();
  await expect(toast(page)).toContainText("Hours approved");
  const rows = await mockDb(page, () => JSON.parse(localStorage.getItem("ia-mock-db-v1")).hours.map((h) => [h.status, h.hours]));
  expect(rows).toEqual([["approved", 2.5]]);
});

test("a double click on Save need saves it once (it does not save and then remove it)", async ({ page }) => {
  await signIn(page, "talent@example.test");
  await page.goto(`/#need/${NEED}`);
  await page.locator("[data-action=save-need]:visible").first().dblclick();
  await expect(toast(page)).toContainText("Saved");
  await page.waitForTimeout(500);
  const saved = await mockDb(page, () => JSON.parse(localStorage.getItem("ia-mock-db-v1")).saved_needs.length);
  expect(saved).toBe(1);
});

test("?lang= in a link chooses the language and is remembered", async ({ page }) => {
  await page.goto("/?lang=pt#needs");
  await expect(page.locator("html")).toHaveAttribute("lang", "pt");
  await expect(page).toHaveURL(/\/#needs$/);
  expect(await page.evaluate(() => localStorage.getItem("hv-lang"))).toBe("pt");
  await page.goto("/#how?lang=fr");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(page).toHaveURL(/\/#how$/);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
});

test("inside another site's frame, Handova shows only a link to open it normally", async ({ page, baseURL }) => {
  await page.setContent(`<iframe src="${baseURL}" style="width:800px;height:600px"></iframe>`);
  const frame = page.frameLocator("iframe");
  const link = frame.locator(".hv-framed-note a");
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute("target", "_top");
  await expect(frame.locator("#main")).toBeHidden();
});
