import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCbsaColumns } from '../src/lib/cbsa-import.mjs';

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
