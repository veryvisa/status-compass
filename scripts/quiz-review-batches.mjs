import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { questions } from '../src/lib/questions.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'data', 'quiz-review');
const size = 30;
fs.mkdirSync(output, { recursive: true });
for (const old of fs.readdirSync(output).filter((name) => /^batch-\d+\.md$/.test(name))) fs.unlinkSync(path.join(output, old));

const letter = (index) => String.fromCharCode(65 + index);
for (let start = 0; start < questions.length; start += size) {
  const batch = questions.slice(start, start + size);
  const number = String(start / size + 1).padStart(2, '0');
  const body = [
    `# 入籍题库独立作答批次 ${number}`,
    '',
    `本批 ${batch.length} 题。请不看题库答案独立作答；只返回每题的题号和选项字母，一行一题，格式为 \`rr01-a\tA\`。不要改题号，不要跳题。`,
    '',
    ...batch.flatMap((question, index) => [
      `## ${start + index + 1}. ${question.id} · ${question.chapter}`,
      '',
      question.prompt,
      '',
      ...question.options.map((option, optionIndex) => `- ${letter(optionIndex)}. ${option}`),
      ''
    ])
  ].join('\n');
  fs.writeFileSync(path.join(output, `batch-${number}.md`), body);
}
console.log(JSON.stringify({ questions: questions.length, batches: Math.ceil(questions.length / size), output }));
