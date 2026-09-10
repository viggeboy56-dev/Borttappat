import test from "node:test";
import assert from "node:assert/strict";
import {createMemberJoinCode,hashMemberJoinCode,normalizeMemberJoinCode,normalizeMemberJoinSlug,normalizeMemberName} from "../src/lib/member-onboarding/code.ts";

test("skapar en stark läsbar skolkod",()=>{const code=createMemberJoinCode();assert.match(code,/^(?:[A-F0-9]{4}-){5}[A-F0-9]{4}$/);assert.equal(normalizeMemberJoinCode(code)?.length,24)});
test("normaliserar kod utan att acceptera andra tecken",()=>{assert.equal(normalizeMemberJoinCode(" abcd-1234-efgh-5678 "),"ABCD1234EFGH5678");assert.equal(normalizeMemberJoinCode("abcd!1234!efgh!5678"),null)});
test("hashar normaliserade kodvarianter lika",()=>assert.equal(hashMemberJoinCode("ABCD-1234-EFGH-5678"),hashMemberJoinCode("abcd 1234 efgh 5678")));
test("genererar unika koder",()=>assert.notEqual(createMemberJoinCode(),createMemberJoinCode()));
test("normaliserar medlemsnamn",()=>{assert.equal(normalizeMemberName("  Anna   Andersson "),"Anna Andersson");assert.equal(normalizeMemberName("A"),null)});
test("normaliserar och validerar skolslug",()=>{assert.equal(normalizeMemberJoinSlug(" Test-Skola "),"test-skola");assert.equal(normalizeMemberJoinSlug("fel skola"),null)});
