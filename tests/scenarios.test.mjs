import test from 'node:test';
import assert from 'node:assert/strict';
import { addDays, addYears, date, iso, prMeasure } from '../src/lib/day-ledger.mjs';
import { addMonths, buildScenarios, firstPrBreach, monthlyCalendar } from '../src/lib/scenarios.mjs';

function bruteBreach(input, horizonEnd) {
  const asOf = date(input.asOf);
  const five = addYears(input.prDate, 5);
  for (let cursor = five > asOf ? five : asOf; cursor <= horizonEnd; cursor = addDays(cursor, 1)) {
    if (prMeasure(input, cursor).missing > 0) return iso(cursor);
  }
  return null;
}

test('addMonths clamps to month end instead of spilling into the next month', () => {
  assert.equal(iso(addMonths('2027-01-31', 1)), '2027-02-28');
  assert.equal(iso(addMonths('2027-11-15', 3)), '2028-02-15');
  assert.equal(iso(addMonths('2027-03-01', 12)), '2028-03-01');
});

test('prefix-sum PR breach scan matches the day-by-day prMeasure scan', () => {
  const samples = [
    { prDate: '2019-01-01', asOf: '2026-10-14', trips: [{ departure: '2021-03-01', return: '2024-01-01' }, { departure: '2027-02-01', return: '2028-06-01' }] },
    { prDate: '2023-06-01', asOf: '2026-10-14', trips: [{ departure: '2024-01-01', return: '2026-01-01' }, { departure: '2026-12-01', return: '2027-12-01' }] },
    { prDate: '2022-01-01', asOf: '2026-10-14', trips: [] }
  ];
  for (const input of samples) {
    const horizon = addYears(input.asOf, 5);
    assert.equal(firstPrBreach(input, horizon)?.date ?? null, bruteBreach(input, horizon), JSON.stringify(input));
  }
});

test('a one-year departure is flagged when it breaks the rolling PR window, the baseline is not', () => {
  const member = { prDate: '2023-01-01', canadaStart: '2023-01-01', province: 'bc', trips: [{ departure: '2023-03-01', return: '2025-06-01' }] };
  const [stay, threeMonths, oneYear] = buildScenarios(member, { asOf: '2026-10-14', departure: '2026-11-01' });
  assert.equal(stay.prBreach, null);
  assert.equal(threeMonths.prBreach, null);
  assert.ok(oneYear.prBreach, 'one-year scenario should breach');
  assert.equal(oneYear.prBreach.days < oneYear.prBreach.required, true);
  assert.equal(oneYear.prBreach.date, bruteBreach({ ...member, asOf: '2026-10-14', trips: [...member.trips, oneYear.trip] }, addYears('2026-10-14', 5)));
  assert.equal(oneYear.trip.return, '2027-11-01');
  assert.match(oneYear.assumptions[0], /2026-11-01 离境、2027-11-01 返加/);
});

test('a departure before the citizenship date pushes that date back by the days spent away', () => {
  const member = { prDate: '2024-06-01', canadaStart: '2024-06-01', province: 'bc', trips: [] };
  const [stay, threeMonths] = buildScenarios(member, { asOf: '2026-10-14', departure: '2026-12-01' });
  const shift = Math.round((date(threeMonths.citizenshipDate) - date(stay.citizenshipDate)) / 86400000);
  const awayDays = Math.round((date(threeMonths.trip.return) - date(threeMonths.trip.departure)) / 86400000) - 1;
  assert.equal(shift, awayDays);
});

test('scenario inputs are validated rather than silently assumed', () => {
  const member = { prDate: '2024-06-01', trips: [{ departure: '2026-12-10', return: '2027-01-05' }] };
  assert.throws(() => buildScenarios(member, { asOf: '2026-10-14', departure: '2026-12-01' }), /重叠/);
  assert.throws(() => buildScenarios({ prDate: '2024-06-01', trips: [{ departure: '2026-09-01' }] }, { asOf: '2026-10-14', departure: '2026-12-01' }), /还没填返加日/);
  assert.throws(() => buildScenarios(member, { asOf: '2026-10-14', departure: '2026-10-14' }), /必须晚于计算日/);
  assert.throws(() => buildScenarios({ trips: [] }, { asOf: '2026-10-14', departure: '2026-12-01' }), /PR 日期/);
});

test('printable calendar covers sixty months and its absent days add up to the assumed trip', () => {
  const [, threeMonths] = buildScenarios({ prDate: '2024-06-01', trips: [] }, { asOf: '2026-10-14', departure: '2026-12-01' });
  assert.equal(threeMonths.calendar.length, 60);
  assert.equal(threeMonths.calendar[0].from, '2026-10-14');
  const absent = threeMonths.calendar.reduce((sum, row) => sum + row.absent, 0);
  assert.equal(absent, Math.round((date('2027-03-01') - date('2026-12-01')) / 86400000) - 1);
  for (const row of monthlyCalendar({ asOf: '2026-10-14', trips: [] }, 3)) assert.equal(row.present, row.days);
});
