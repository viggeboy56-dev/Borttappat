import test from "node:test";
import assert from "node:assert/strict";
import { getEmailConfirmationNextPath } from "../src/lib/auth/confirmation.ts";

test("tillåter en giltig personalinbjudan", () => {
  const path = `/invite/${"A".repeat(43)}`;
  assert.equal(getEmailConfirmationNextPath(path), path);
});

test("tillåter en giltig medlemslänk", () => {
  assert.equal(getEmailConfirmationNextPath("/join/test-skolan"), "/join/test-skolan");
});

test("avvisar externa och orelaterade omdirigeringar", () => {
  assert.equal(getEmailConfirmationNextPath("//evil.example"), "/login");
  assert.equal(getEmailConfirmationNextPath("https://evil.example"), "/login");
  assert.equal(getEmailConfirmationNextPath("/dashboard"), "/login");
  assert.equal(getEmailConfirmationNextPath("/join/Test-Skolan"), "/login");
  assert.equal(getEmailConfirmationNextPath(null), "/login");
});
