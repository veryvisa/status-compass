import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const readJson = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, name), 'utf8'));
const readJsonl = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8')
  .split(/\n/)
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const data = readJson('data/rules.json');
const candidates = [
  ...readJsonl('content/paths/_new-rules.jsonl'),
  ...readJsonl('content/guides/_new-rules.jsonl')
];
const automatic = readJson('reports/round3-rule-verification.json');
const manual = readJson('reports/round3-manual-verification.json');
const rejected = new Set(readJson('reports/round3-rejected-rules.json').rejected_ids);
const automaticById = new Map(automatic.results.map((item) => [item.id, item]));
const manualById = new Map(manual.results.map((item) => [item.id, item]));

const existingIds = new Set(data.rules.map((item) => item.id));
const candidateIds = new Set();
for (const candidate of candidates) {
  if (existingIds.has(candidate.id)) throw new Error(`candidate duplicates existing rule: ${candidate.id}`);
  if (candidateIds.has(candidate.id)) throw new Error(`candidate duplicated across jsonl files: ${candidate.id}`);
  candidateIds.add(candidate.id);
}

const effectiveFrom = new Map([
  ['vdp.relief_unprompted', '2025-10-01'],
  ['cgeb.renamed', '2026-07-01'],
  ['cn_ssa.in_force', '2017-01-01']
]);

const overrides = new Map([
  ['cn_iit.domicile', {
    source_url: 'https://www.chinatax.gov.cn/n810356/n3255681/c4251584/content.html',
    source_quote: '因户籍、家庭、经济利益关系而在中国境内习惯性居住的个人'
  }],
  ['t1135.gross_negligence_penalty', {
    source_url: 'https://www.canada.ca/en/revenue-agency/services/tax/international-non-residents/information-been-moved/foreign-reporting/questions-answers-about-penalties.html',
    source_quote: '$500 per month for up to 24 months, to a maximum of $12,000'
  }],
  ['pr.status_loss_ways', {
    source_quote: 'You will only lose your PR status if'
  }],
  ['departure_tax.t2061a', {
    source_quote: 'complete Form T2061A, Election by an Emigrant to Report Deemed Dispositions of Taxable Canadian Property'
  }]
]);

const merged = [];
const unresolved = [];
for (const candidate of candidates) {
  if (rejected.has(candidate.id)) continue;
  const auto = automaticById.get(candidate.id);
  const manuallyAccepted = manualById.get(candidate.id)?.result === 'accepted';
  if (!auto || (!['exact', 'near'].includes(auto.result) && !manuallyAccepted)) {
    unresolved.push(candidate.id);
    continue;
  }
  const { writer: _writer, ...clean } = candidate;
  merged.push({
    ...clean,
    ...overrides.get(candidate.id),
    checked_at: '2026-10-01',
    status: 'verified',
    effective_from: effectiveFrom.get(candidate.id) || '2026-10-01'
  });
}
if (unresolved.length) throw new Error(`unresolved candidates: ${unresolved.join(', ')}`);
if (merged.length + rejected.size !== candidates.length) throw new Error('candidate accounting mismatch');

const output = {
  version: '2026-10-01.2',
  rules: [...data.rules, ...merged]
};
fs.writeFileSync(path.join(ROOT, 'data/rules.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify({ candidates: candidates.length, merged: merged.length, rejected: rejected.size, total_rules: output.rules.length }));
