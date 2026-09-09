import assert from "node:assert/strict";
import test from "node:test";
import { CLAIM_STATUS_LABELS, validateClaimMessage } from "../src/lib/claims/constants.ts";

test("requires an ownership description", () => {
  assert.match(validateClaimMessage("   "), /Beskriv/);
  assert.equal(validateClaimMessage("Mitt namn står under sulan."), null);
});

test("limits ownership descriptions to 2 000 characters", () => {
  assert.equal(validateClaimMessage("a".repeat(2000)), null);
  assert.match(validateClaimMessage("a".repeat(2001)), /2 000/);
});

test("provides Swedish claim status labels", () => {
  assert.equal(CLAIM_STATUS_LABELS.pending, "Väntar på granskning");
  assert.equal(CLAIM_STATUS_LABELS.approved, "Godkänt");
  assert.equal(CLAIM_STATUS_LABELS.rejected, "Avslaget");
});
