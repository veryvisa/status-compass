import fs from 'node:fs';
import path from 'node:path';
import { questions } from '../src/lib/questions.mjs';
import { crosscheckQuizAnswers, parseQuizAnswers } from '../src/lib/quiz-crosscheck.mjs';

const args = process.argv.slice(2);
const usage = '用法：node scripts/quiz-crosscheck.mjs [--out report.md] answer-1.tsv [answer-2.tsv ...]';

try {
  let output = null;
  const inputs = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--out') {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) throw new Error('--out 后必须提供输出路径');
      if (output !== null) throw new Error('--out 只能指定一次');
      output = value;
      index += 1;
    } else if (argument.startsWith('--')) {
      throw new Error(`未知参数 ${argument}`);
    } else {
      inputs.push(argument);
    }
  }
  if (inputs.length === 0) throw new Error(`至少需要一个答案文件\n${usage}`);

  const answerSets = inputs.map((file) => {
    const label = path.basename(file);
    let contents;
    try {
      contents = fs.readFileSync(file, 'utf8');
    } catch {
      throw new Error(`${label}: 无法读取答案文件`);
    }
    return { label, answers: parseQuizAnswers(contents, label) };
  });
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
  if (output) {
    try {
      fs.writeFileSync(output, markdown);
    } catch {
      throw new Error(`${path.basename(output)}: 无法写入比较报告`);
    }
  }
  else process.stdout.write(markdown);
} catch (error) {
  console.error(`错误：${error instanceof Error ? error.message : '无法处理答案文件'}`);
  process.exitCode = 2;
}
