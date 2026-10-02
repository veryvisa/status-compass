import test from 'node:test';
import assert from 'node:assert/strict';
import { crosscheckQuizAnswers, parseQuizAnswers } from '../src/lib/quiz-crosscheck.mjs';

const questions = [
  { id: 'q1', chapter: 'A', prompt: '问题一', options: ['x','y'], answer: 0 },
  { id: 'q2', chapter: 'B', prompt: '问题二', options: ['x','y'], answer: 1 }
];

test('quiz answer parser reads tab, colon and numeric choices', () => {
  assert.deepEqual([...parseQuizAnswers('q1\tA\nq2: 2').entries()], [['q1','A'],['q2','B']]);
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
  assert.throws(() => parseQuizAnswers('not an answer'), /题号/);
});
