// 题库去重门：同题干、或同一组选项且同一正确项的两道题＝重复考点，退出码 1。
// 也核暂停表里的题号都真实存在（防止写错题号导致“以为暂停了其实还在出”）。
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { allQuestions, pausedIds } from '../src/lib/questions.mjs';

export function findDuplicates(bank) {
  const problems = [];
  const byPrompt = new Map();
  const byOptions = new Map();
  for (const question of bank) {
    const prompt = question.prompt.trim();
    if (byPrompt.has(prompt)) problems.push({ kind: 'same_prompt', ids: [byPrompt.get(prompt), question.id] });
    else byPrompt.set(prompt, question.id);
    if (question.options.length > 2) {
      const key = `${[...question.options].sort().join('\u0001')}=>${question.options[question.answer]}`;
      if (byOptions.has(key)) problems.push({ kind: 'same_options_same_answer', ids: [byOptions.get(key), question.id] });
      else byOptions.set(key, question.id);
    }
    if (new Set(question.options).size !== question.options.length) problems.push({ kind: 'repeated_option', ids: [question.id] });
    if (!Number.isInteger(question.answer) || question.answer < 0 || question.answer >= question.options.length) problems.push({ kind: 'answer_out_of_range', ids: [question.id] });
  }
  return problems;
}

export function main() {
  const problems = findDuplicates(allQuestions);
  const known = new Set(allQuestions.map((question) => question.id));
  for (const id of pausedIds) if (!known.has(id)) problems.push({ kind: 'paused_id_unknown', ids: [id] });
  const kinds = allQuestions.reduce((acc, question) => ({ ...acc, [question.kind]: (acc[question.kind] || 0) + 1 }), {});
  console.log(JSON.stringify({ questions: allQuestions.length, served: allQuestions.length - pausedIds.size, paused: pausedIds.size, kinds, problems }));
  return problems.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) process.exitCode = main();
