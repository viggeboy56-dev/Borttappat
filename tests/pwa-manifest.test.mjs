import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import manifest from "../src/app/manifest.ts";

test("manifestet innehåller installationskraven", () => {
  const result = manifest();

  assert.equal(result.name, "Borttappat");
  assert.equal(result.short_name, "Borttappat");
  assert.equal(result.start_url, "/");
  assert.equal(result.scope, "/");
  assert.equal(result.display, "standalone");
  assert.equal(result.orientation, "portrait-primary");
  assert.equal(result.background_color, "#f7f7f5");
  assert.equal(result.theme_color, "#065f46");
  assert.equal(result.lang, "sv");
});

test("manifestet har vanliga och maskbara appikoner", () => {
  const icons = manifest().icons ?? [];

  assert.ok(icons.some((icon) => icon.sizes === "192x192"));
  assert.ok(
    icons.some(
      (icon) => icon.sizes === "512x512" && icon.purpose === "any",
    ),
  );
  assert.ok(
    icons.some(
      (icon) => icon.sizes === "512x512" && icon.purpose === "maskable",
    ),
  );
});

test("service workern cachar eller fångar inga privata anrop", () => {
  const serviceWorker = readFileSync(
    new URL("../public/sw.js", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(serviceWorker, /addEventListener\(["']fetch["']/);
  assert.doesNotMatch(serviceWorker, /respondWith|caches\./);
});
