import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildExpiryReport } from '../scripts/rules-expiry.mjs';

const script = fileURLToPath(new URL('../scripts/rules-expiry.mjs', import.meta.url));

function rule(id, checkedAt, overrides = {}) {
  return {
    id,
    status: 'verified',
    source_url: `https://example.test/${id}`,
    checked_at: checkedAt,
    effective_from: '1900-01-01',
    ...overrides
  };
}

function reportFor(rules, overrides = {}) {
  return buildExpiryReport({ rules }, {
    asOf: '2026-10-03',
    maxAgeDays: 30,
    rulesFile: 'fixture.json',
    rulesSha256: 'fixture-hash',
    ...overrides
  });
}

test('boundary is current the day before and due on or after max age', () => {
  const report = reportFor([
    rule('before', '2026-09-04'),
    rule('on', '2026-09-03'),
    rule('after', '2026-09-02')
  ]);
  assert.deepEqual(report.counts.category_rules, {
    pending: 0,
    missing_source: 0,
    missing_checked_at: 0,
    invalid_checked_at: 0,
    future_checked_at: 0,
    due: 2,
    current: 1
  });
  assert.deepEqual(report.categories.due.flatMap((item) => item.rule_ids), ['after', 'on']);
  assert.equal(report.categories.current[0].rules[0].age_days, 29);
});

test('UTC calendar arithmetic handles leap day', () => {
  const report = reportFor([rule('leap', '2024-02-29')], {
    asOf: '2024-03-30',
    maxAgeDays: 30
  });
  assert.equal(report.categories.due[0].rules[0].age_days, 30);
});

test('exceptions are separate primary categories and classification is exhaustive', () => {
  const rules = [
    rule('pending', '2020-01-01', { status: 'pending' }),
    rule('missing-source', '2026-09-03', { source_url: '' }),
    rule('missing-date', undefined),
    rule('bad-date', '2026-02-30'),
    rule('future', '2026-10-04'),
    rule('current', '2026-10-02')
  ];
  const report = reportFor(rules);
  assert.equal(report.counts.input_rules, rules.length);
  assert.equal(report.counts.categorized_rules, rules.length);
  assert.deepEqual(report.categories.pending.map((item) => item.rule_id), ['pending']);
  assert.deepEqual(report.categories.missing_source.map((item) => item.rule_id), ['missing-source']);
  assert.deepEqual(report.categories.missing_checked_at.map((item) => item.rule_id), ['missing-date']);
  assert.deepEqual(report.categories.invalid_checked_at.map((item) => item.rule_id), ['bad-date']);
  assert.deepEqual(report.categories.future_checked_at.map((item) => item.rule_id), ['future']);
});

test('due rules sharing a URL are grouped without losing rule ids', () => {
  const source = 'https://example.test/shared';
  const report = reportFor([
    rule('z-rule', '2026-09-01', { source_url: source }),
    rule('a-rule', '2026-08-01', { source_url: source })
  ]);
  assert.equal(report.counts.due_sources, 1);
  assert.deepEqual(report.categories.due[0].rule_ids, ['a-rule', 'z-rule']);
});

test('CLI leaves input bytes unchanged and writes their SHA-256', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-expiry-'));
  const rulesPath = path.join(directory, 'rules.json');
  const outPath = path.join(directory, 'report.json');
  const input = `${JSON.stringify({ rules: [rule('one', '2026-09-03')] }, null, 2)}\n`;
  fs.writeFileSync(rulesPath, input);
  const before = crypto.createHash('sha256').update(fs.readFileSync(rulesPath)).digest('hex');

  const result = spawnSync(process.execPath, [script, '--rules', rulesPath, '--as-of', '2026-10-03', '--max-age-days', '30', '--out', outPath], { encoding: 'utf8' });
  const after = crypto.createHash('sha256').update(fs.readFileSync(rulesPath)).digest('hex');
  const report = JSON.parse(fs.readFileSync(outPath));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(after, before);
  assert.equal(report.rules_sha256, before);
});

test('bad parameters and malformed input exit with rc 2', () => {
  const badDate = spawnSync(process.execPath, [script, '--rules', 'unused.json', '--as-of', '2026-02-30', '--max-age-days', '30', '--out', 'unused-output.json'], { encoding: 'utf8' });
  assert.equal(badDate.status, 2);

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'rules-expiry-bad-'));
  const rulesPath = path.join(directory, 'rules.json');
  fs.writeFileSync(rulesPath, '{not json}\n');
  const malformed = spawnSync(process.execPath, [script, '--rules', rulesPath, '--as-of', '2026-10-03', '--max-age-days', '30', '--out', path.join(directory, 'out.json')], { encoding: 'utf8' });
  assert.equal(malformed.status, 2);
});
