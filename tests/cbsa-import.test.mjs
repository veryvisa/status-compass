import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCbsaColumns, parseCbsaSplit, parseTravelDate } from '../src/lib/cbsa-import.mjs';

test('CBSA manual comma columns preserve quoted ports and escaped quotes', () => {
  const parsed = parseCbsaColumns('direction,date,port\nexit,2025-03-01,"Vancouver, BC"\nentry,2025-04-01,"Pacific ""Highway"", BC"');
  assert.deepEqual(parsed, {
    trips: [{ departure: '2025-03-01', return: '2025-04-01', exception: false, note: 'Vancouver, BC → Pacific "Highway", BC' }],
    warnings: [],
    events: [
      { direction: 'exit', date: '2025-03-01', port: 'Vancouver, BC' },
      { direction: 'entry', date: '2025-04-01', port: 'Pacific "Highway", BC' }
    ]
  });
});

test('CBSA manual tab columns can put the date first and leave an ongoing trip', () => {
  const parsed = parseCbsaColumns('date\tdirection\tlocation\n2026/08/01\texit\t"Toronto\tPearson"');
  assert.deepEqual(parsed.trips, [{ departure: '2026-08-01', exception: false, note: 'Toronto\tPearson 出境；尚无返加记录' }]);
});

test('CBSA parser accepts Chinese headers and CRLF but never guesses ambiguous dates', () => {
  assert.deepEqual(
    parseCbsaColumns('方向,日期,口岸\r\n出境,2025-01-02,温哥华\r\n入境,2025-01-03,多伦多\r\n').trips,
    [{ departure: '2025-01-02', return: '2025-01-03', exception: false, note: '温哥华 → 多伦多' }]
  );
  assert.throws(() => parseCbsaColumns('direction,date\nexit,01/02/2025'), /YYYY-MM-DD/);
});

test('CBSA manual semicolon columns only split delimiters outside quotes', () => {
  const parsed = parseCbsaColumns('direction;date;port\nexit;2025-05-01;"Saint-Bernard; QC"');
  assert.equal(parsed.events[0].port, 'Saint-Bernard; QC');
});

test('CBSA parser rejects extra or missing columns instead of silently importing shifted data', () => {
  assert.throws(
    () => parseCbsaColumns('direction,date,port\nexit,2025-03-01,YVR,extra'),
    /第 2 行列数不匹配：应为 3 列，实际为 4 列/
  );
  assert.throws(
    () => parseCbsaColumns('direction,date,port\nexit,2025-03-01'),
    /第 2 行列数不匹配：应为 3 列，实际为 2 列/
  );
});

test('CBSA parser rejects duplicate direction and date semantic columns', () => {
  assert.throws(() => parseCbsaColumns('direction,type,date\nexit,exit,2025-01-01'), /第 1 行 direction 语义列重复/);
  assert.throws(() => parseCbsaColumns('direction,date,event date\nexit,2025-01-01,2025-01-01'), /第 1 行 date 语义列重复/);
});

test('CBSA parser reports physical line numbers across blank lines', () => {
  assert.throws(
    () => parseCbsaColumns('direction,date,port\n\nexit,2025-01-01,YVR,extra'),
    /第 3 行列数不匹配/
  );
});

test('CBSA parser rejects malformed quotes and multiline fields', () => {
  assert.throws(() => parseCbsaColumns('direction,date,port\nexit,2025-01-01,"Vancouver'), /第 2 行引号未闭合.*不支持字段内换行/);
  assert.throws(() => parseCbsaColumns('direction,date,port\nexit,2025-01-01,"Vancouver" BC'), /第 2 行引号后的字符无效/);
  assert.throws(() => parseCbsaColumns('direction,date,port\nexit,2025-01-01,Van"couver'), /第 2 行引号位置无效/);
  assert.throws(() => parseCbsaColumns('direction,date,port\nexit,2025-01-01,"Vancouver\nBC"'), /第 2 行引号未闭合.*不支持字段内换行/);
});

test('CBSA parser rejects a broken batch instead of returning its valid prefix', () => {
  assert.throws(() => parseCbsaColumns('direction,date\nexit,2025-01-01\nexit,2025-02-01\nentry,2025-03-01'), /缺少入境记录/);
});

test('wizard date parser accepts unambiguous month names and strips time, but never guesses numeric order', () => {
  assert.equal(parseTravelDate('01-MAR-2025', 2), '2025-03-01');
  assert.equal(parseTravelDate('2025-Mar-01', 2), '2025-03-01');
  assert.equal(parseTravelDate('Mar 1, 2025', 2), '2025-03-01');
  assert.equal(parseTravelDate('1 avril 2025', 2), '2025-04-01');
  assert.equal(parseTravelDate('2025年3月1日', 2), '2025-03-01');
  assert.equal(parseTravelDate('20250301', 2), '2025-03-01');
  assert.equal(parseTravelDate('2025-03-01 14:22', 2), '2025-03-01');
  assert.throws(() => parseTravelDate('03/04/2025', 2), /日月顺序有歧义/);
  assert.equal(parseTravelDate('03/04/2025', 2, 'dmy'), '2025-04-03');
  assert.equal(parseTravelDate('03/04/2025', 2, 'mdy'), '2025-03-04');
  assert.throws(() => parseTravelDate('25/04/2025', 2, 'mdy'), /矛盾/);
  assert.throws(() => parseTravelDate('2025-02-30', 2), /日期无效/);
  assert.throws(() => parseTravelDate('01-FOO-2025', 2), /月份无法识别/);
});

test('wizard pairs separately pasted entry and exit tables and drops identity columns', () => {
  const parsed = parseCbsaSplit({
    entries: 'Date of Entry,Location of the Port of Entry,Document Number,Name\n2025-04-01,Pacific Highway,AB123456,ZHANG\n2025-04-01,Pacific Highway,CD999999,ZHANG',
    exits: '2025-03-01,YVR'
  });
  assert.deepEqual(parsed.trips, [{ departure: '2025-03-01', return: '2025-04-01', exception: false, note: 'YVR → Pacific Highway' }]);
  assert.equal(JSON.stringify(parsed.trips).includes('AB123456'), false);
  assert.equal(JSON.stringify(parsed.events).includes('ZHANG'), false);
  assert.ok(parsed.warnings.some((item) => /重复出现/.test(item)));
  assert.ok(parsed.warnings.some((item) => /Document Number、Name/.test(item)));
});

test('wizard reports entries without exits instead of inventing departure dates', () => {
  const parsed = parseCbsaSplit({ entries: '2018-06-10\n2025-04-01', exits: '2025-03-01' });
  assert.deepEqual(parsed.unmatchedEntries, ['2018-06-10']);
  assert.equal(parsed.trips.length, 1);
  assert.ok(parsed.warnings.some((item) => /2018-06-10.*早于 2019-07-11/.test(item)));
});

test('wizard rejects the whole batch on any bad row and labels which table failed', () => {
  assert.throws(() => parseCbsaSplit({ entries: '2025-04-01\n2025-13-01', exits: '2025-03-01' }), /入境表第 2 行日期无效/);
  assert.throws(() => parseCbsaSplit({ entries: '2025-04-01,YVR,extra', exits: '' }), /入境表第 1 行无列名时只允许/);
  assert.throws(() => parseCbsaSplit({ entries: '', exits: '' }), /都为空/);
  assert.throws(() => parseCbsaSplit({ entries: '2025-04-01', exits: '2025-03-01\n2025-03-15' }), /缺少入境记录/);
});

test('column mode honours an explicit numeric date order', () => {
  const parsed = parseCbsaColumns('direction,date\nexit,15/03/2025\nentry,01/04/2025', { dateOrder: 'dmy' });
  assert.deepEqual(parsed.trips.map((trip) => [trip.departure, trip.return]), [['2025-03-15', '2025-04-01']]);
});
