import test from 'node:test';
import assert from 'node:assert/strict';
import { auditText } from '../scripts/content-gate.mjs';

const values = {
  'pr.required_days': 730,
  'citizenship.required_days': 1095,
  'citizenship.pre_pr_max': 365,
  'tax.deemed_resident_days': 183,
  'citizenship.language_min_age': 18,
  'citizenship.language_max_age': 54,
  'pr.renounce_form': 'IMM 5782',
  'pr.renounce_checklist': 'IMM 5783',
  'departure_tax.t1243': 'T1243',
  'departure_tax.t1244': 'T1244'
};

test('canonical day, age and form claims pass', () => {
  const text = 'PR 居住义务至少 730 天。成人入籍要求至少 1,095 天。PR 前最多折 365 天。没有重要居所联系但停留满 183 天可能是视同居民。入籍考试 18 到 54 岁。放弃 PR 的申请表是 IMM 5782，文件清单是 IMM 5783。用 T1243 计算视同处置的资本利得，用 T1244 延付。';
  assert.deepEqual(auditText(text, values), []);
});

test('conflicting day, age and form claims fail', () => {
  const text = 'PR 居住义务至少 731 天。成人入籍要求至少 1,096 天。PR 前最多折 366 天。没有重要居所联系但停留满 184 天可能是视同居民。入籍考试 19 到 55 岁。放弃 PR 的申请表是 IMM 5784，文件清单是 IMM 5785。用 T1245 计算视同处置的资本利得，用 T1246 延付。';
  const errors = auditText(text, values);
  assert.ok(errors.length >= 8, errors.join('\n'));
});

test('worked examples do not masquerade as thresholds', () => {
  const text = '她现在有 616 天，距离 730 天还差 114 天。另一个人有 742 天，高于 730 天。';
  assert.deepEqual(auditText(text, values), []);
});
