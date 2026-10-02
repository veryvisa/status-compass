import audiences from '../../data/audiences.json';

export const pathOrder = audiences.map((item) => item.slug);

export const tools = {
  'day-ledger': { label: '天数总账', href: 'tools/day-ledger/', summary: '一份行程同时量 PR、入籍、税务、省医保与 OAS。' },
  'tax-residency': { label: '税务居民问卷', href: 'tools/tax-residency/', summary: '把住所、家人、天数与协定冲突拆开整理。' },
  benefits: { label: '福利影响器', href: 'tools/benefits/', summary: '逐项看离境对福利、养老金与医保的影响。' },
  'departure-tax': { label: '离境税估算', href: 'tools/departure-tax/', summary: '先估视同处置量级，再识别需要专业复核的资产。' },
  'decision-trees': { label: '三棵决策树', href: 'tools/decision-trees/', summary: '比较续卡、PRTD、放弃、入籍与弃籍的后果。' },
  'citizenship-test': { label: '入籍考试练习', href: 'citizenship-test/', summary: '按官方指南分章练习和限时模拟。' }
};

export function sortPaths(entries) {
  return [...entries].sort((a, b) => pathOrder.indexOf(a.data.slug) - pathOrder.indexOf(b.data.slug));
}

export function sortGuides(entries) {
  return [...entries].sort((a, b) => a.data.title.localeCompare(b.data.title, 'zh-CN'));
}

export function adjacent(entries, slug) {
  const index = entries.findIndex((entry) => entry.data.slug === slug);
  if (index < 0) return { previous: null, next: null };
  return {
    previous: index > 0 ? entries[index - 1] : null,
    next: index < entries.length - 1 ? entries[index + 1] : null
  };
}
