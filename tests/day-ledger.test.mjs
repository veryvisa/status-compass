import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { calculateLedger, parseTripInput, presenceDays } from '../src/lib/day-ledger.mjs';

const cases = JSON.parse(fs.readFileSync(new URL('./cases.json', import.meta.url)));
const at = (object, dotted) => dotted.split('.').reduce((value, key) => value[key], object);

test('known-answer case inventory has at least 26 cases', () => assert.ok(cases.length >= 26));
for (const sample of cases) {
  test(`known answer: ${sample.id}`, () => {
    const actual = calculateLedger(sample.input);
    for (const [path, expected] of Object.entries(sample.expected)) assert.deepEqual(at(actual, path), expected, `${sample.id}: ${path}`);
  });
}

test('exceptions are annotations and never silently counted', () => {
  const trip = [{ departure: '2026-01-01', return: '2026-01-11', exception: true }];
  assert.equal(presenceDays('2026-01-01', '2026-01-11', trip), 2);
});

test('an already-met threshold is placed on the as-of date, not tomorrow', () => {
  const result = calculateLedger({ prDate: '2023-01-01', canadaStart: '2023-01-01', asOf: '2026-10-01', province: 'bc', trips: [] });
  assert.equal(result.timeline.find((event) => event.label.startsWith('PR')).date, '2026-10-01');
  assert.equal(result.timeline.find((event) => event.label.startsWith('入籍')).date, '2026-10-01');
});

test('pasted CSV-style trips and JSON imports normalize to the same records', () => {
  const pasted = parseTripInput('离境日,返加日,例外\n2025-03-01,2025-04-01\n2026-08-01,,例外');
  const imported = parseTripInput(JSON.stringify(pasted));
  assert.deepEqual(imported, pasted);
  assert.equal(pasted[1].exception, true);
});

test('calculator source has a zero-network contract', () => {
  const files = ['../src/scripts/day-ledger.mjs','../src/pages/tools/day-ledger.astro'];
  const source = files.map((path) => fs.readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
  for (const forbidden of [/\bfetch\s*\(/, /XMLHttpRequest/, /sendBeacon/, /WebSocket/, /EventSource/, /<form[^>]+action=/i]) assert.doesNotMatch(source, forbidden);
});
