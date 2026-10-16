import test from "node:test";
import assert from "node:assert/strict";
import { removeAccountPhotos } from "../src/account-photos.js";

test("account deletion removes profile photos but preserves organisation logos", async () => {
  const calls = [];
  const storage = {
    async list(prefix) {
      calls.push(["list", prefix]);
      return { data: [
        { id: "photo-1", name: "old.jpg" },
        { id: "photo-2", name: "new.jpeg" },
        { id: null, name: "logos" },
      ], error: null };
    },
    async remove(paths) { calls.push(["remove", paths]); return { error: null }; },
  };
  await removeAccountPhotos(storage, "member-id");
  assert.deepEqual(calls, [
    ["list", "member-id"],
    ["remove", ["member-id/old.jpg", "member-id/new.jpeg"]],
  ]);
});

test("account deletion stops when a photo cannot be removed", async () => {
  const storage = {
    async list() { return { data: [{ id: "photo", name: "photo.jpg" }], error: null }; },
    async remove() { return { error: Error("Storage unavailable") }; },
  };
  await assert.rejects(removeAccountPhotos(storage, "member-id"), /Storage unavailable/);
});
