import test from 'node:test';
import assert from 'node:assert/strict';
import { findDuplicates } from '../scripts/quiz-dedupe.mjs';
import { allQuestions, buildQuestions, questions, reverseCandidates } from '../src/lib/questions.mjs';

test('the shipped bank has no duplicated prompt or duplicated option-set-and-answer pair', () => {
  assert.deepEqual(findDuplicates(allQuestions), []);
  assert.equal(allQuestions.filter((question) => question.kind === 'reverse').length, 45);
});

test('the dedupe gate flags the old pattern where the review item repeated the direct item', () => {
  const direct = { id: 'x-a', prompt: 'Q?', options: ['A1', 'B1', 'C1', 'D1'], answer: 0 };
  const review = { id: 'x-c', prompt: '复习：哪一项一致？', options: ['C1', 'D1', 'A1', 'B1'], answer: 2 };
  const twin = { id: 'y-c', prompt: '复习：哪一项一致？', options: ['E', 'F', 'G', 'H'], answer: 0 };
  assert.deepEqual(findDuplicates([direct, review, twin]).map((item) => item.kind), ['same_options_same_answer', 'same_prompt']);
});

test('reverse items never offer a question whose wording contains the target answer', () => {
  const facts = [
    { id: 'f1', chapter: 'c', question: '这更接近哪类内容？', correct: '公民责任' },
    { id: 'f2', chapter: 'c', question: '陪审义务体现了哪项公民责任？', correct: '担任陪审员' },
    { id: 'f3', chapter: 'c', question: '官方语言是什么？', correct: '英语和法语' },
    { id: 'f4', chapter: 'c', question: '首都是哪座城市？', correct: '渥太华', reverse_exclude: ['f3'] }
  ];
  assert.deepEqual(reverseCandidates(facts[0], facts).map((fact) => fact.id), ['f3', 'f4']);
  assert.deepEqual(reverseCandidates(facts[3], facts).map((fact) => fact.id), ['f1', 'f2']);
  const built = buildQuestions(facts.map((fact) => ({ ...fact, distractors: ['甲', '乙', '丙'], statement: 's' })));
  for (const item of built.filter((question) => question.kind === 'reverse')) assert.equal(item.options[item.answer], facts.find((fact) => `${fact.id}-c` === item.id).question);
});

test('paused questions are removed from what the site serves', () => {
  assert.equal(questions.length, allQuestions.length);
});
