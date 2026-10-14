import facts from '../../data/citizenship-question-facts.json' with { type: 'json' };
import paused from '../../data/quiz-paused.json' with { type: 'json' };

const sourceUrl = 'https://www.canada.ca/en/immigration-refugees-citizenship/corporate/publications-manuals/discover-canada.html';
const rotate = (items, n) => [...items.slice(n % items.length), ...items.slice(0, n % items.length)];

// 复习题（-c）原来与直答题（-a）同一考点、同一组选项，只换了题干，等于重复。
// 现改为“反向辨认”：给出指南答案，从同章其他问题里认出它回答的是哪一个。
// 题干含本题答案、或本题题干含它答案的同章问题不进选项，避免两个选项都说得通；
// 字面查不出、但意思重叠的成对问题在事实表里用 reverse_exclude 人工排除（如 1867 年发生了什么 与 联邦化进程）。
export function reverseCandidates(fact, pool) {
  return pool.filter((other) => other.id !== fact.id
    && other.chapter === fact.chapter
    && other.correct !== fact.correct
    && !(fact.reverse_exclude || []).includes(other.id)
    && !(other.reverse_exclude || []).includes(fact.id)
    && !other.question.includes(fact.correct)
    && !fact.question.includes(other.correct));
}

export function buildQuestions(factList) {
  return factList.flatMap((fact, index) => {
    const baseOptions = [fact.correct, ...fact.distractors];
    const directOptions = rotate(baseOptions, index);
    const falseVariant = index % 2 === 1;
    const statement = falseVariant ? `指南把“${fact.distractors[0]}”列为“${fact.question}”的正确答案。` : fact.statement;
    const label = `Discover Canada · ${fact.chapter}`;
    const out = [
      { id: `${fact.id}-a`, fact: fact.id, kind: 'direct', chapter: fact.chapter, prompt: fact.question, options: directOptions, answer: directOptions.indexOf(fact.correct), source_url: sourceUrl, source_label: label },
      { id: `${fact.id}-b`, fact: fact.id, kind: 'true_false', chapter: fact.chapter, prompt: `判断：${statement}`, options: ['正确', '错误'], answer: falseVariant ? 1 : 0, source_url: sourceUrl, source_label: label }
    ];
    const others = reverseCandidates(fact, factList).slice(0, 3);
    if (others.length >= 2) {
      const reverseOptions = rotate([fact.question, ...others.map((other) => other.question)], index + 2);
      out.push({ id: `${fact.id}-c`, fact: fact.id, kind: 'reverse', chapter: fact.chapter, prompt: `复习“${fact.chapter}”：按官方指南，“${fact.correct}”回答的是下面哪个问题？`, options: reverseOptions, answer: reverseOptions.indexOf(fact.question), source_url: sourceUrl, source_label: label });
    }
    return out;
  });
}

// 全部题（含暂停题）：独立复判批次与交叉比对用。
export const allQuestions = buildQuestions(facts);
// 两个不同引擎答案不一致的题记入 data/quiz-paused.json，站上不再出。
export const pausedIds = new Set(paused.paused.map((item) => item.id));
export const questions = allQuestions.filter((question) => !pausedIds.has(question.id));
export const chapters = [...new Set(questions.map((question) => question.chapter))];
