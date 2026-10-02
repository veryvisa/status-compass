const normalizeChoice = (value) => {
  const text = String(value ?? '').trim().toUpperCase();
  if (/^[A-D]$/.test(text)) return text;
  if (/^[1-4]$/.test(text)) return String.fromCharCode(64 + Number(text));
  return null;
};

export function parseQuizAnswers(text, label = 'answers') {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error(`${label}: 答案文件为空`);
  const answers = new Map();
  const add = (id, value, row) => {
    const choice = normalizeChoice(value);
    if (!choice) throw new Error(`${label}: ${row} 的选项必须是 A-D 或 1-4`);
    if (answers.has(String(id))) throw new Error(`${label}: 题号重复 ${id}`);
    answers.set(String(id), choice);
  };
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) parsed.forEach((row, index) => add(row.id, row.answer ?? row.choice, `JSON 第 ${index + 1} 项`));
    else Object.entries(parsed).forEach(([id, value]) => add(id, value, `JSON ${id}`));
    return answers;
  }
  trimmed.split(/\r?\n/).forEach((line, index) => {
    const clean = line.trim();
    if (!clean || clean.startsWith('#')) return;
    const match = clean.match(/^([\w-]+)\s*(?:\t|,|:|：)\s*([A-Da-d1-4])(?:\s|$)/);
    if (!match) throw new Error(`${label}: 第 ${index + 1} 行应为 题号<Tab>选项字母`);
    add(match[1], match[2], `第 ${index + 1} 行`);
  });
  return answers;
}

export function crosscheckQuizAnswers(questions, answerSets) {
  const expected = new Map(questions.map((question) => [question.id, String.fromCharCode(65 + question.answer)]));
  const disagreements = [];
  for (const question of questions) {
    const submitted = answerSets.map((set) => ({ label: set.label, answer: set.answers.get(question.id) })).filter((item) => item.answer);
    const distinct = new Set(submitted.map((item) => item.answer));
    if (submitted.some((item) => item.answer !== expected.get(question.id)) || distinct.size > 1) disagreements.push({ id: question.id, chapter: question.chapter, prompt: question.prompt, expected: expected.get(question.id), submitted });
  }
  const unknown = answerSets.flatMap((set) => [...set.answers.keys()].filter((id) => !expected.has(id)).map((id) => ({ label: set.label, id })));
  const missing = answerSets.map((set) => ({ label: set.label, ids: questions.filter((question) => !set.answers.has(question.id)).map((question) => question.id) }));
  return { disagreements, unknown, missing, questionCount: questions.length };
}
