import data from '../../data/rules.json' with { type: 'json' };

export const rules = data.rules;
export const ruleMap = Object.fromEntries(rules.map((rule) => [rule.id, rule]));
export function rule(id) {
  const found = ruleMap[id];
  if (!found || found.status !== 'verified') throw new Error(`Rule is unavailable or pending: ${id}`);
  return found;
}
export const value = (id) => rule(id).value;
