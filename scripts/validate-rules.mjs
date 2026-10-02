import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { questions } from '../src/lib/questions.mjs';

const allowedSource = /^https:\/\/([a-z0-9-]+\.)*(canada\.ca|justice\.gc\.ca|ontario\.ca|gov\.bc\.ca|bclaws\.gov\.bc\.ca|chinatax\.gov\.cn|china-embassy\.gov\.cn|sz\.gov\.cn)\//i;
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function validateRules(payload, questionBank = questions) {
  if (!Array.isArray(payload.rules)) throw new Error('data/rules.json must contain rules[]');
  const required = ['id','claim','value','unit','source_url','source_quote','checked_at','effective_from','status'];
  const ids = new Set();
  const versions = new Set();
  for (const item of payload.rules) {
    for (const key of required) if (!(key in item)) throw new Error(`${item.id || 'unknown'} missing ${key}`);
    if (ids.has(item.id)) throw new Error(`duplicate rule id: ${item.id}`);
    ids.add(item.id);
    if (!['verified','pending'].includes(item.status)) throw new Error(`${item.id} invalid status`);
    if (!allowedSource.test(item.source_url)) throw new Error(`${item.id} source is not an allowed primary authority`);
    if (!datePattern.test(item.checked_at)) throw new Error(`${item.id} checked_at is not an ISO date`);
    if (!datePattern.test(item.effective_from)) throw new Error(`${item.id} effective_from is not an ISO date`);
    const versionKey = `${item.rule_key || item.id}\u0000${item.effective_from}`;
    if (versions.has(versionKey)) throw new Error(`${item.rule_key || item.id} has duplicate version date ${item.effective_from}`);
    versions.add(versionKey);
    if (item.status === 'verified' && (item.value === null || item.source_quote.startsWith('pending'))) throw new Error(`${item.id} cannot be verified without value and quote`);
  }
  for (const item of payload.rules) {
    if (item.superseded_by && !ids.has(item.superseded_by)) throw new Error(`${item.id} superseded_by target does not exist: ${item.superseded_by}`);
    if (item.superseded_by) {
      const successor = payload.rules.find((candidate) => candidate.id === item.superseded_by);
      if ((successor.rule_key || successor.id) !== (item.rule_key || item.id)) throw new Error(`${item.id} successor must share rule_key`);
      if (successor.effective_from <= item.effective_from) throw new Error(`${item.id} successor must start later`);
    }
  }
  const verified = payload.rules.filter((item) => item.status === 'verified').length;
  if (verified < 25) throw new Error(`verified rules ${verified} < 25`);
  if (questionBank.length < 120) throw new Error(`question bank ${questionBank.length} < 120`);
  for (const q of questionBank) {
    if (!q.source_url || !q.source_label || !q.chapter) throw new Error(`${q.id} has no guide chapter source`);
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) throw new Error(`${q.id} invalid answer`);
  }
  return { rules: payload.rules.length, verified, pending: payload.rules.length - verified, questions: questionBank.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const payload = JSON.parse(fs.readFileSync(new URL('../data/rules.json', import.meta.url)));
  console.log(JSON.stringify(validateRules(payload)));
}
