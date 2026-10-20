import { test } from "node:test";
import assert from "node:assert/strict";
import { initConsent, trackPage, campaignQuery } from "../src/consent.js";

// jsdom comes from `pnpm install` (CI always has it). Without it this test is skipped with a clear note, not a crash.
const { JSDOM, VirtualConsole } = await import("jsdom").catch(() => ({}));
const needsDom = JSDOM ? {} : { skip: "jsdom is not installed: run pnpm install" };

test("campaign links keep only utm_source, utm_medium, utm_campaign and utm_content", () => {
  const at = (href) => { globalThis.location = new URL(href); return campaignQuery(); };
  try {
    assert.equal(at("https://handova.org/?utm_source=linkedin&utm_medium=social&utm_campaign=launch&utm_content=post1&fbclid=x&email=a@b.c#join"), "?utm_source=linkedin&utm_medium=social&utm_campaign=launch&utm_content=post1");
    assert.equal(at("https://handova.org/#join?utm_source=whatsapp&utm_term=private&lang=pt"), "?utm_source=whatsapp");
    assert.equal(at("https://handova.org/#profile/someone"), "");
    assert.equal(at(`https://handova.org/?utm_campaign=${"x".repeat(300)}`).length, "?utm_campaign=".length + 100);
  } finally { delete globalThis.location; }
});

test("Analytics loads only after consent and stops tracking after withdrawal", needsDom, () => {
  const dom = new JSDOM("<!doctype html><title>Handova</title><div class='consent'></div>", {
    url: "https://handova.org/?utm_source=newsletter&ref=private#profile/private-person",
    virtualConsole: new VirtualConsole(),
  });
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.location = dom.window.location;
  globalThis.localStorage = dom.window.localStorage;
  try {
    initConsent();
    assert.equal(document.querySelector("script[src*='googletagmanager']"), null);
    assert.ok(document.querySelector("[data-consent='declined']"));
    document.querySelector("[data-consent='declined']").click();
    assert.equal(document.querySelector("script[src*='googletagmanager']"), null);
    initConsent(true);
    document.querySelector("[data-consent='accepted']").click();
    assert.match(document.querySelector("script[src*='googletagmanager']").src, /G-151TT1KXTL/);
    assert.equal(localStorage.getItem("ia-consent-v1"), "accepted");
    // The first page view keeps the campaign source (and nothing else from the address); later ones carry only the page.
    assert.ok(window.dataLayer.some((entry) => entry[0] === "event" && entry[2].page_location === "https://handova.org/?utm_source=newsletter#profile"));
    trackPage();
    assert.equal(window.dataLayer.at(-1)[2].page_location, "https://handova.org/#profile");
    assert.ok(window.dataLayer.some((entry) => entry[0] === "event" && entry[2].page_title === "Professional profile"));
    assert.ok(window.dataLayer.some((entry) => entry[0] === "config" && entry[2].allow_google_signals === false));
    assert.ok(window.dataLayer.some((entry) => entry[0] === "config" && entry[2].page_title === "Handova"));

    document.cookie = "_ga=visitor; Path=/";
    document.cookie = "_ga_151TT1KXTL=session; Path=/";
    initConsent(true);
    document.querySelector("[data-consent='declined']").click();
    assert.equal(localStorage.getItem("ia-consent-v1"), "declined");
    assert.doesNotMatch(document.cookie, /_ga/);
    const count = window.dataLayer.length;
    trackPage("Another page");
    assert.equal(window.dataLayer.length, count);
  } finally {
    dom.window.close();
    delete globalThis.window;
    delete globalThis.document;
    delete globalThis.location;
    delete globalThis.localStorage;
  }
});
