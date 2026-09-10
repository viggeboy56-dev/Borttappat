import test from "node:test";
import assert from "node:assert/strict";
import { isInvitationToken, normalizeInviteEmail } from "../src/lib/admin/validation.ts";
import { createInvitationToken, hashInvitationToken } from "../src/lib/admin/token.ts";

test("normaliserar giltig e-post", () => assert.equal(normalizeInviteEmail("  Person@Skola.SE "), "person@skola.se"));
test("avvisar ogiltig e-post", () => assert.equal(normalizeInviteEmail("inte-en-adress"), null));
test("skapar ett kryptografiskt engångstoken i rätt format", () => { const token = createInvitationToken(); assert.equal(token.length, 43); assert.equal(isInvitationToken(token), true); });
test("hashar token deterministiskt utan att lagra originalet", () => { const token = "A".repeat(43); const hash = hashInvitationToken(token); assert.match(hash, /^[0-9a-f]{64}$/); assert.equal(hash, hashInvitationToken(token)); assert.notEqual(hash, token); });
test("avvisar manipulerade tokenformat", () => { assert.equal(isInvitationToken("kort"), false); assert.equal(isInvitationToken("!".repeat(43)), false); });
