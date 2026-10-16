import { test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM, VirtualConsole } from "jsdom";
import { initConsent, trackPage } from "../src/consent.js";

test("Analytics loads only after consent and stops tracking after withdrawal", () => {
  const dom = new JSDOM("<!doctype html><title>Handova</title><div class='consent'></div>", {
    url: "https://handova.org/#profile/private-person",
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
    assert.ok(window.dataLayer.some((entry) => entry[0] === "event" && entry[2].page_location === "https://handova.org/#profile"));

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
