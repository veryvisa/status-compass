import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

function number(raw) { return Number(String(raw).replace(/[ ,，]/g, '')); }

export function auditText(text, values) {
  const errors = [];
  const clauses = String(text).replace(/https?:\/\/[^)\s]+/g, '').split(/[。；\n]/);
  const checks = [
    { id: 'pr.required_days', pattern: /(?:PR|永久居民|枫叶卡)[^；。\n]{0,24}?居住义务[^；。\n]{0,30}?(?:至少|最低|下限|满)\s*([\d,， ]+)\s*天/gi, expected: values['pr.required_days'] },
    { id: 'pr.required_days', pattern: /居住义务[^；。\n]{0,30}?(?:至少|最低|下限|满)\s*([\d,， ]+)\s*天/gi, expected: values['pr.required_days'] },
    { id: 'citizenship.required_days', pattern: /(?:成人|未成年人)?入籍[^；。\n]{0,65}?(?:至少|最低|下限|要求|满)[^\d]{0,10}([\d,， ]+)\s*天/gi, expected: values['citizenship.required_days'] },
    { id: 'citizenship.pre_pr_max', pattern: /PR\s*前[^；。\n]{0,65}?(?:最多|上限)[^\d]{0,10}([\d,， ]+)\s*天/gi, expected: values['citizenship.pre_pr_max'] },
    { id: 'tax.deemed_resident_days', pattern: /(?:视同居民|没有重要(?:居所)?联系)[^；。\n]{0,65}?(?:至少|满|达到|停留)[^\d]{0,10}([\d,， ]+)\s*天/gi, expected: values['tax.deemed_resident_days'] }
  ];
  for (const clause of clauses) for (const check of checks) {
    check.pattern.lastIndex = 0;
    for (const match of clause.matchAll(check.pattern)) if (check.expected != null && number(match[1]) !== Number(check.expected)) errors.push(`${check.id}: ${number(match[1])} != ${check.expected}: ${clause.trim().slice(0, 140)}`);
  }

  for (const clause of clauses) {
    const age = clause.match(/(?:入籍考试|语言(?:证明|要求)?)[^；。\n]{0,70}?(\d{1,2})\s*(?:到|至|[-–])\s*(\d{1,2})\s*岁/);
    if (age && (Number(age[1]) !== Number(values['citizenship.language_min_age']) || Number(age[2]) !== Number(values['citizenship.language_max_age']))) errors.push(`citizenship age range: ${age[1]}-${age[2]} != ${values['citizenship.language_min_age']}-${values['citizenship.language_max_age']}`);
    const imm = [...clause.matchAll(/IMM\s*(\d{4})/gi)].map((match) => `IMM ${match[1]}`);
    if (/放弃\s*PR|放弃永久居民/.test(clause) && /申请表/.test(clause) && imm.length && !imm.includes(values['pr.renounce_form'])) errors.push(`pr.renounce_form: ${imm.join(', ')} != ${values['pr.renounce_form']}`);
    if (/放弃\s*PR|放弃永久居民/.test(clause) && /(?:文件|材料)清单/.test(clause) && imm.length && !imm.includes(values['pr.renounce_checklist'])) errors.push(`pr.renounce_checklist: ${imm.join(', ')} != ${values['pr.renounce_checklist']}`);
    const deferral = clause.match(/(?:用|附|填写|提交|选择)\s*(T\s*\d{4}[A-Z]?)\s*(?:表)?\s*(?:办理|申请|选择|作出|来|以)?\s*(?:延后|延付)|(?:延后|延付)[^；。\n]{0,12}?(?:用|附|填写|提交|选择)?\s*(T\s*\d{4}[A-Z]?)/i);
    if (deferral) {
      const form = (deferral[1] || deferral[2]).replace(/\s/g, '').toUpperCase();
      if (form !== values['departure_tax.t1244']) errors.push(`departure-tax deferral form: ${form} != ${values['departure_tax.t1244']}`);
    }
    const gains = clause.match(/(?:用|附|填写|提交)\s*(T\s*\d{4}[A-Z]?)\s*(?:表)?[^；。\n]{0,35}?(?:计算|申报)[^；。\n]{0,20}?(?:视同处置|资本利得|损失)/i);
    if (gains) {
      const form = gains[1].replace(/\s/g, '').toUpperCase();
      if (form !== values['departure_tax.t1243']) errors.push(`departure-tax gain form: ${form} != ${values['departure_tax.t1243']}`);
    }
  }
  return errors;
}

function readJsonl(name) {
  return fs.readFileSync(path.join(ROOT, name), 'utf8').split(/\n/).filter(Boolean).map((line) => JSON.parse(line));
}

export function runGate() {
  const rules = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/rules.json'), 'utf8')).rules;
  const verified = rules.filter((item) => item.status === 'verified');
  const values = Object.fromEntries(verified.map((item) => [item.id, item.value]));
  const errors = [];
  const contentFiles = ['paths', 'guides'].flatMap((kind) => fs.readdirSync(path.join(ROOT, 'content', kind)).filter((name) => name.endsWith('.md') && !name.startsWith('_')).map((name) => `content/${kind}/${name}`));
  const pathFiles = contentFiles.filter((name) => name.startsWith('content/paths/'));
  const guideFiles = contentFiles.filter((name) => name.startsWith('content/guides/'));
  if (pathFiles.length !== 9) errors.push(`expected 9 path pages, got ${pathFiles.length}`);
  if (guideFiles.length !== 9) errors.push(`expected 9 guide pages, got ${guideFiles.length}`);
  for (const name of contentFiles) {
    const text = fs.readFileSync(path.join(ROOT, name), 'utf8');
    const body = text.replace(/^---[\s\S]*?---\s*/u, '');
    if (name.startsWith('content/paths/')) {
      const chinese = (body.match(/[\p{Script=Han}]/gu) || []).length;
      if (chinese < 1500) errors.push(`${name}: Chinese body ${chinese} < 1500`);
    }
    errors.push(...auditText(text, values).map((error) => `${name}: ${error}`));
  }

  const rejectedPath = path.join(ROOT, 'reports/round3-rejected-rules.json');
  const rejected = fs.existsSync(rejectedPath) ? new Set(JSON.parse(fs.readFileSync(rejectedPath, 'utf8')).rejected_ids || []) : new Set();
  for (const candidate of [...readJsonl('content/paths/_new-rules.jsonl'), ...readJsonl('content/guides/_new-rules.jsonl')]) {
    if (rejected.has(candidate.id)) continue;
    const merged = rules.find((item) => item.id === candidate.id);
    if (!merged) errors.push(`new rule not merged: ${candidate.id}`);
    else if (merged.status !== 'verified' || !merged.effective_from) errors.push(`new rule not verified/versioned: ${candidate.id}`);
    else if (JSON.stringify(merged.value) !== JSON.stringify(candidate.value)) errors.push(`new rule value changed without rejection record: ${candidate.id}`);
  }
  return { errors, files: contentFiles.length, paths: pathFiles.length, guides: guideFiles.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = runGate();
  if (result.errors.length) {
    console.error(result.errors.join('\n'));
    process.exitCode = 1;
  } else console.log(JSON.stringify({ ...result, errors: 0 }));
}
