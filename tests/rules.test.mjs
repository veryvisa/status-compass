import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { selectRuleVersion } from '../src/lib/rules.mjs';
import { validateRules } from '../scripts/validate-rules.mjs';

const payload = JSON.parse(fs.readFileSync(new URL('../data/rules.json', import.meta.url)));

test('every production rule has an ISO effective date', () => {
  assert.equal(payload.rules.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item.effective_from)).length, payload.rules.length);
});

test('rule selector switches versions on the judgment date', () => {
  const versions = [
    { id: 'sample.old', rule_key: 'sample', value: 10, effective_from: '2025-01-01', superseded_by: 'sample.current', status: 'verified' },
    { id: 'sample.current', rule_key: 'sample', value: 20, effective_from: '2026-07-01', status: 'verified' }
  ];
  assert.equal(selectRuleVersion('sample', '2026-06-30', versions).value, 10);
  assert.equal(selectRuleVersion('sample', '2026-07-01', versions).value, 20);
});

test('verified rule without effective_from fails the same validation used by npm run check', () => {
  const broken = structuredClone(payload);
  delete broken.rules.find((item) => item.status === 'verified').effective_from;
  assert.throws(() => validateRules(broken), /missing effective_from/);
});
