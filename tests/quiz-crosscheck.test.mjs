import test from 'node:test';
import assert from 'node:assert/strict';
import { crosscheckQuizAnswers, parseQuizAnswers } from '../src/lib/quiz-crosscheck.mjs';

const questions = [
  { id: 'q1', chapter: 'A', prompt: '问题一', options: ['x','y'], answer: 0 },
  { id: 'q2', chapter: 'B', prompt: '问题二', options: ['x','y'], answer: 1 }
];

test('quiz answer parser keeps text, JSON map and JSON array formats', () => {
  assert.deepEqual([...parseQuizAnswers('q1\tA\nq2: 2').entries()], [['q1','A'],['q2','B']]);
  assert.deepEqual([...parseQuizAnswers('{"q1":"1","q2":"b"}').entries()], [['q1','A'],['q2','B']]);
  assert.deepEqual([...parseQuizAnswers('[{"id":"q1","answer":1},{"id":"q2","choice":"B"}]').entries()], [['q1','A'],['q2','B']]);
});

test('quiz crosscheck lists wrong and cross-reviewer disagreements', () => {
  const report = crosscheckQuizAnswers(questions, [
    { label: 'one', answers: parseQuizAnswers('q1\tA\nq2\tA') },
    { label: 'two', answers: parseQuizAnswers('q1\tB\nq2\tB') }
  ]);
  assert.deepEqual(report.disagreements.map((item) => item.id), ['q1','q2']);
});

test('quiz parser rejects duplicate ids and invalid lines', () => {
  assert.throws(() => parseQuizAnswers('q1\tA\nq1\tB'), /重复/);
  assert.throws(() => parseQuizAnswers('[{"id":"q1","answer":"A"},{"id":"q1","answer":"B"}]'), /第 2 项.*重复/);
  assert.throws(() => parseQuizAnswers('not an answer'), /题号/);
});

test('quiz parser rejects missing or blank JSON array ids with item numbers', () => {
  assert.throws(() => parseQuizAnswers('[{"answer":"A"}]'), /第 1 项.*非空题号/);
  assert.throws(() => parseQuizAnswers('[{"id":"   ","answer":"A"}]'), /第 1 项.*非空题号/);
  assert.throws(() => parseQuizAnswers('[{"id":" q1 ","answer":"A"}]'), /第 1 项.*首尾空白/);
});

test('quiz parser rejects null rows and non-string ids instead of coercing them', () => {
  for (const row of [null, [], 'q1', 7]) {
    assert.throws(() => parseQuizAnswers(JSON.stringify([row])), /第 1 项.*必须是.*对象/);
  }
  for (const id of [null, 7, [], {}]) {
    assert.throws(() => parseQuizAnswers(JSON.stringify([{ id, answer: 'A' }])), /第 1 项.*题号必须是字符串/);
  }
});

test('quiz parser rejects malformed JSON and invalid JSON top levels', () => {
  assert.throws(() => parseQuizAnswers('[{"id":]'), /JSON 格式无效/);
  assert.throws(() => parseQuizAnswers('null'), /JSON 顶层/);
  assert.throws(() => parseQuizAnswers('42'), /JSON 顶层/);
  assert.throws(() => parseQuizAnswers('"q1"'), /JSON 顶层/);
});

test('quiz crosscheck keeps a valid unknown id in the unknown bucket', () => {
  const report = crosscheckQuizAnswers(questions, [
    { label: 'one', answers: parseQuizAnswers('{"q1":"A","future-q":"4"}') }
  ]);
  assert.deepEqual(report.unknown, [{ label: 'one', id: 'future-q' }]);
  assert.deepEqual(report.missing, [{ label: 'one', ids: ['q2'] }]);
});
