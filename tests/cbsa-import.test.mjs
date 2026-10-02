import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCbsaColumns } from '../src/lib/cbsa-import.mjs';

test('CBSA manual comma columns pair an exit with the next entry', () => {
  const parsed = parseCbsaColumns('direction,date,port\nexit,2025-03-01,YVR\nentry,2025-04-01,YVR');
  assert.deepEqual(parsed.trips, [{ departure: '2025-03-01', return: '2025-04-01', exception: false, note: 'YVR → YVR' }]);
});

test('CBSA manual tab columns can put the date first and leave an ongoing trip', () => {
  const parsed = parseCbsaColumns('date\tdirection\tlocation\n2026/08/01\texit\tYYZ');
  assert.deepEqual(parsed.trips, [{ departure: '2026-08-01', exception: false, note: 'YYZ 出境；尚无返加记录' }]);
});

test('CBSA parser accepts Chinese direction labels but never guesses ambiguous dates', () => {
  assert.equal(parseCbsaColumns('方向,日期\n出境,2025-01-02\n入境,2025-01-03').trips.length, 1);
  assert.throws(() => parseCbsaColumns('direction,date\nexit,01/02/2025'), /YYYY-MM-DD/);
});

test('CBSA parser rejects broken event sequences as a whole', () => {
  assert.throws(() => parseCbsaColumns('direction,date\nexit,2025-01-01\nexit,2025-02-01\nentry,2025-03-01'), /缺少入境记录/);
});
