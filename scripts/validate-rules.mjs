import fs from 'node:fs';
import { questions } from '../src/lib/questions.mjs';

const payload = JSON.parse(fs.readFileSync(new URL('../data/rules.json', import.meta.url)));
if (!Array.isArray(payload.rules)) throw new Error('data/rules.json must contain rules[]');
const required = ['id','claim','value','unit','source_url','source_quote','checked_at','status'];
const ids = new Set();
for (const item of payload.rules) {
  for (const key of required) if (!(key in item)) throw new Error(`${item.id || 'unknown'} missing ${key}`);
  if (ids.has(item.id)) throw new Error(`duplicate rule id: ${item.id}`);
  ids.add(item.id);
  if (!['verified','pending'].includes(item.status)) throw new Error(`${item.id} invalid status`);
  if (!/^https:\/\/(www\.|ircc\.)?(canada\.ca|ontario\.ca|www2\.gov\.bc\.ca|www\.bclaws\.gov\.bc\.ca)\//.test(item.source_url)) throw new Error(`${item.id} source is not an allowed primary authority`);
  if (!/^2026-10-01$/.test(item.checked_at)) throw new Error(`${item.id} checked_at is not this review date`);
  if (item.status === 'verified' && (item.value === null || item.source_quote.startsWith('pending'))) throw new Error(`${item.id} cannot be verified without value and quote`);
}
const verified = payload.rules.filter((item) => item.status === 'verified').length;
if (verified < 25) throw new Error(`verified rules ${verified} < 25`);
if (questions.length < 120) throw new Error(`question bank ${questions.length} < 120`);
for (const q of questions) {
  if (!q.source_url || !q.source_label || !q.chapter) throw new Error(`${q.id} has no guide chapter source`);
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) throw new Error(`${q.id} invalid answer`);
}
console.log(JSON.stringify({ rules: payload.rules.length, verified, pending: payload.rules.length - verified, questions: questions.length }));
