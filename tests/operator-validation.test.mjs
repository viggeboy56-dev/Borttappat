import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSchoolName, normalizeSchoolSlug, parseStaffList, validateStaffCandidates } from "../src/lib/operator/validation.ts";

test("normaliserar skolnamn och slug", () => { assert.equal(normalizeSchoolName("  Test   skolan "),"Test skolan"); assert.equal(normalizeSchoolSlug(" Test-Skolan "),"test-skolan"); });
test("avvisar ogiltig slug", () => assert.equal(normalizeSchoolSlug("Test skola!"),null));
test("tolkar flera personalrader med whitespace", () => { const rows=parseStaffList(" Anna Andersson , ANNA@SKOLA.SE\nErik Eriksson, erik@skola.se "); assert.deepEqual(rows.map(({fullName,email,error})=>({fullName,email,error})),[{fullName:"Anna Andersson",email:"anna@skola.se",error:null},{fullName:"Erik Eriksson",email:"erik@skola.se",error:null}]); });
test("markerar felaktigt radformat", () => assert.match(parseStaffList("Saknar e-post")[0].error,/formatet/));
test("upptäcker dubbletter i inklistrad lista", () => { const rows=parseStaffList("Anna, a@test.se\nAnnan, A@test.se"); assert.equal(rows[1].error,"E-postadressen finns flera gånger i listan."); });
test("servervalidering avvisar tom och för stor batch", () => { assert.equal(validateStaffCandidates([]).errors.length,1); assert.equal(validateStaffCandidates(Array(101).fill({fullName:"Namn",email:"a@test.se"})).errors.length,1); });
test("servervalidering normaliserar och upptäcker dubbletter", () => { const result=validateStaffCandidates([{fullName:" Anna  Andersson ",email:" A@Test.se "},{fullName:"Erik",email:"a@test.se"}]); assert.equal(result.candidates[0].fullName,"Anna Andersson"); assert.ok(result.errors.some((error)=>error.includes("flera gånger"))); });
