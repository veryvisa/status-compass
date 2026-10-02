import data from '../../data/rules.json' with { type: 'json' };

export const rules = data.rules;

const day = (value) => {
  const text = value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error(`Invalid rule date: ${value}`);
  return text;
};

export function selectRuleVersion(id, asOf, collection = rules) {
  const candidates = collection.filter((item) => item.status === 'verified' && (item.id === id || item.rule_key === id));
  if (candidates.length === 0) throw new Error(`Rule is unavailable or pending: ${id}`);
  const ordered = [...candidates].sort((a, b) => a.effective_from.localeCompare(b.effective_from));
  if (asOf == null) return ordered.at(-1);
  const target = day(asOf);
  const applicable = ordered.filter((item) => item.effective_from <= target);
  if (applicable.length > 0) return applicable.at(-1);
  if (ordered.length === 1) return { ...ordered[0], baseline_assumed_before_effective_from: true };
  throw new Error(`No ${id} rule version applies on ${target}`);
}

export function rule(id, asOf) {
  return selectRuleVersion(id, asOf);
}

export const value = (id, asOf) => rule(id, asOf).value;
