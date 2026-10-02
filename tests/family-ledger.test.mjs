import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateFamilyLedger, normalizeFamilyFile, serializeFamilyFile } from '../src/lib/family-ledger.mjs';

const cases = JSON.parse(fs.readFileSync(new URL('./family-cases.json', import.meta.url)));

test('family known-answer inventory has four cases', () => assert.equal(cases.length, 4));
test('legacy single-person JSON imports as one family member', () => {
  const family = normalizeFamilyFile(cases[0].input);
  assert.equal(family.members.length, cases[0].expected.members);
  assert.equal(family.members[0].name, cases[0].expected.memberName);
});
test('single-member export remains readable as the legacy shape', () => {
  const output = serializeFamilyFile(cases[1].input);
  assert.equal(output.prDate, cases[1].expected.legacyPrDate);
  assert.equal('members' in output, cases[1].expected.hasMembers);
});
test('multi-member export keeps the versioned family shape', () => {
  const output = serializeFamilyFile(cases[2].input);
  assert.equal(output.schemaVersion, 2);
  assert.equal(output.members.length, 2);
});
for (const sample of cases.slice(2)) test(`family exception: ${sample.id}`, () => {
  const result = calculateFamilyLedger(sample.input);
  assert.equal(result.results[0].accompanyingCitizen[0].matched, sample.expected.matched);
  if (sample.expected.results) assert.equal(result.results.length, sample.expected.results);
  assert.equal(result.results[0].calculation.pr.days, 1312, '例外天数仍不自动加回');
});
