import facts from '../../data/citizenship-question-facts.json' with { type: 'json' };

const sourceUrl = 'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada.html';
const rotate = (items, n) => [...items.slice(n % items.length), ...items.slice(0, n % items.length)];

export const questions = facts.flatMap((fact, index) => {
  const baseOptions = [fact.correct, ...fact.distractors];
  const directOptions = rotate(baseOptions, index);
  const falseVariant = index % 2 === 1;
  const statement = falseVariant ? `指南把“${fact.distractors[0]}”列为“${fact.question}”的正确答案。` : fact.statement;
  const reviewOptions = rotate(baseOptions, index + 2);
  return [
    { id: `${fact.id}-a`, chapter: fact.chapter, prompt: fact.question, options: directOptions, answer: directOptions.indexOf(fact.correct), source_url: sourceUrl, source_label: `Discover Canada · ${fact.chapter}` },
    { id: `${fact.id}-b`, chapter: fact.chapter, prompt: `判断：${statement}`, options: ['正确', '错误'], answer: falseVariant ? 1 : 0, source_url: sourceUrl, source_label: `Discover Canada · ${fact.chapter}` },
    { id: `${fact.id}-c`, chapter: fact.chapter, prompt: `复习“${fact.chapter}”：下面哪一项与官方指南一致？`, options: reviewOptions, answer: reviewOptions.indexOf(fact.correct), source_url: sourceUrl, source_label: `Discover Canada · ${fact.chapter}` }
  ];
});

export const chapters = [...new Set(questions.map((question) => question.chapter))];
