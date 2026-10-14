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

test('OAS output stays as days plus evidence and never returns decimal years or a pension fraction', () => {
  const result = calculateLedger({ prDate: '2020-01-01', canadaStart: '2020-01-01', birthDate: '1980-01-01', asOf: '2026-01-01', province: 'bc', trips: [] });
  assert.equal(Number.isInteger(result.oas.days), true);
  assert.ok(result.oas.evidenceChecklist.length >= 6);
  assert.equal('years' in result.oas, false);
  assert.equal('fraction' in result.oas, false);
  assert.equal(result.timeline.some((event) => event.label.includes('OAS')), false);
});

test('OAS splits physical presence from residence that s.21(4)(a) may keep unbroken', () => {
  const input = { prDate: '2015-01-01', canadaStart: '2015-01-01', birthDate: '1960-01-01', asOf: '2026-10-14', province: 'bc', trips: [
    { departure: '2018-01-01', return: '2018-07-01' },
    { departure: '2020-01-01', return: '2021-06-01' },
    { departure: '2026-09-01' }
  ] };
  const oas = calculateLedger(input).oas;
  const span = Math.round((Date.parse('2026-10-14') - Date.parse('2015-01-01')) / 86400000) + 1;
  assert.equal(span - oas.absences.reduce((sum, item) => sum + item.absentDays, 0), oas.days, 'absences must reconcile with presence days');
  assert.deepEqual(oas.absences.map((item) => item.withinOneYear), [true, false, false]);
  assert.equal(oas.residenceIfShortAbsencesTemporary, span - oas.longAbsences.reduce((sum, item) => sum + item.absentDays, 0));
  assert.equal(oas.residenceIfShortAbsencesTemporary - oas.days, 180);
  assert.equal(oas.absences[2].totalAbsentDays, oas.absences[2].absentDays);
});

test('a 365-day absence is within one year, a 366-day absence is not', () => {
  const run = (ret) => calculateLedger({ prDate: '2015-01-01', canadaStart: '2015-01-01', asOf: '2026-10-14', province: 'bc', trips: [{ departure: '2021-01-01', return: ret }] }).oas.absences[0];
  assert.equal(run('2022-01-02').totalAbsentDays, 365);
  assert.equal(run('2022-01-02').withinOneYear, true);
  assert.equal(run('2022-01-03').totalAbsentDays, 366);
  assert.equal(run('2022-01-03').withinOneYear, false);
});

test('OAS evidence groups cite official sources and every group names what it proves', async () => {
  const evidence = JSON.parse(fs.readFileSync(new URL('../data/oas-residence-evidence.json', import.meta.url)));
  for (const source of Object.values(evidence.sources)) assert.match(source.url, /^https:\/\/(laws-lois\.justice\.gc\.ca|www\.canada\.ca)\//);
  for (const group of evidence.groups) {
    assert.ok(group.proves && group.items.length, group.id);
    for (const basis of group.basis) assert.ok(evidence.sources[basis], `${group.id} basis ${basis}`);
  }
});
