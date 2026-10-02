import fs from 'node:fs';
import path from 'node:path';
import { questions } from '../src/lib/questions.mjs';
import { crosscheckQuizAnswers, parseQuizAnswers } from '../src/lib/quiz-crosscheck.mjs';

const args = process.argv.slice(2);
const outAt = args.indexOf('--out');
const output = outAt >= 0 ? args.splice(outAt, 2)[1] : null;
if (args.length === 0) {
  console.error('用法：node scripts/quiz-crosscheck.mjs [--out report.md] answer-1.tsv [answer-2.tsv ...]');
  process.exit(2);
}
const answerSets = args.map((file) => ({ label: path.basename(file), answers: parseQuizAnswers(fs.readFileSync(file, 'utf8'), path.basename(file)) }));
const report = crosscheckQuizAnswers(questions, answerSets);
const lines = [
  '# 入籍题库独立作答分歧', '',
  `- 题库：${report.questionCount} 题`,
  `- 答案文件：${answerSets.length} 份`,
  `- 需复判：${report.disagreements.length} 题`,
  `- 未知题号：${report.unknown.length} 条`, '',
  '## 分歧题', ''
];
if (report.disagreements.length === 0) lines.push('无。', '');
else for (const item of report.disagreements) lines.push(`### ${item.id} · ${item.chapter}`, '', item.prompt, '', `- 题库选项：${item.expected}`, ...item.submitted.map((answer) => `- ${answer.label}：${answer.answer}`), '');
lines.push('## 缺答统计', '', ...report.missing.map((item) => `- ${item.label}：缺 ${item.ids.length} 题`), '');
if (report.unknown.length) lines.push('## 未知题号', '', ...report.unknown.map((item) => `- ${item.label}：${item.id}`), '');
const markdown = lines.join('\n');
if (output) fs.writeFileSync(output, markdown);
else process.stdout.write(markdown);
