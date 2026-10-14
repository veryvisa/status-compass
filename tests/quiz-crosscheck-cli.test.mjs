import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { questions } from '../src/lib/questions.mjs';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(repo, 'scripts/quiz-crosscheck.mjs');
const run = (args) => spawnSync(process.execPath, [script, ...args], { cwd: repo, encoding: 'utf8' });
const write = (directory, name, contents) => {
  const file = path.join(directory, name);
  fs.writeFileSync(file, contents);
  return file;
};

test('quiz crosscheck CLI writes the existing comparison report and returns zero', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-crosscheck-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const question = questions[0];
  const expected = String.fromCharCode(65 + question.answer);
  const wrong = expected === 'A' ? 'B' : 'A';
  const first = write(directory, 'one.json', JSON.stringify({ [question.id]: expected, 'future-q': 4 }));
  const second = write(directory, 'two.tsv', `${question.id}\t${wrong}\n`);
  const output = path.join(directory, 'report.md');

  const result = run(['--out', output, first, second]);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const report = fs.readFileSync(output, 'utf8');
  assert.match(report, new RegExp(`- 题库：${questions.length} 题`));
  assert.match(report, /- 答案文件：2 份/);
  assert.match(report, /- 需复判：1 题/);
  assert.match(report, /- 未知题号：1 条/);
  assert.match(report, new RegExp(`one\\.json：缺 ${questions.length - 1} 题`));
  assert.match(report, new RegExp(`two\\.tsv：缺 ${questions.length - 1} 题`));
  assert.match(report, /one\.json：future-q/);
});

test('quiz crosscheck CLI reports parse and read errors as rc 2 without stack or output', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-crosscheck-errors-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const cases = [
    { name: 'bad-json', input: write(directory, 'bad.json', '[{"id":]'), pattern: /JSON 格式无效/ },
    { name: 'missing-id', input: write(directory, 'missing.json', '[{"answer":"A"}]'), pattern: /第 1 项.*非空题号/ },
    { name: 'missing-file', input: path.join(directory, 'absent.tsv'), pattern: /无法读取答案文件/ }
  ];

  for (const item of cases) {
    const output = path.join(directory, `${item.name}.md`);
    fs.writeFileSync(output, '原有报告');
    const result = run(['--out', output, item.input]);
    assert.equal(result.status, 2, `${item.name}: ${result.stderr}`);
    assert.match(result.stderr, /^错误：/);
    assert.match(result.stderr, item.pattern);
    assert.doesNotMatch(result.stderr, /\n\s+at\s/);
    assert.equal(fs.readFileSync(output, 'utf8'), '原有报告');
  }
});

test('quiz crosscheck CLI rejects a missing --out value as rc 2', () => {
  const result = run(['--out']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^错误：--out 后必须提供输出路径/);
  assert.doesNotMatch(result.stderr, /\n\s+at\s/);

  const noInput = run([]);
  assert.equal(noInput.status, 2);
  assert.match(noInput.stderr, /^错误：至少需要一个答案文件/);
  assert.doesNotMatch(noInput.stderr, /\n\s+at\s/);
});

test('quiz crosscheck --write-paused records disagreements and never removes earlier pauses', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'quiz-paused-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const [first, second] = questions;
  const right = (question) => String.fromCharCode(65 + question.answer);
  const other = (question) => right(question) === 'A' ? 'B' : 'A';
  const one = write(directory, 'engine-a.tsv', `${first.id}\t${right(first)}\n${second.id}\t${right(second)}\n`);
  const two = write(directory, 'engine-b.tsv', `${first.id}\t${other(first)}\n${second.id}\t${right(second)}\n`);
  const paused = write(directory, 'paused.json', JSON.stringify({ schema_version: 1, paused: [{ id: 'old-q', since: '2026-01-01', reason: 'manual' }] }));
  const result = run(['--out', path.join(directory, 'r.md'), '--write-paused', paused, one, two]);
  assert.equal(result.status, 0, result.stderr);
  const ids = JSON.parse(fs.readFileSync(paused, 'utf8')).paused.map((item) => item.id);
  assert.deepEqual(ids, [first.id, 'old-q'].sort());
  const single = run(['--write-paused', paused, one]);
  assert.equal(single.status, 2);
  assert.match(single.stderr, /至少两份/);
});
