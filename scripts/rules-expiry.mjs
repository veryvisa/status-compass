import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const CATEGORY_ORDER = [
  'pending',
  'missing_source',
  'missing_checked_at',
  'invalid_checked_at',
  'future_checked_at',
  'due',
  'current'
];

const usage = 'Usage: node scripts/rules-expiry.mjs --rules <file> --as-of YYYY-MM-DD --max-age-days <positive integer> --out <file>';

function compareText(left, right) {
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

function parseIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

function ageInDays(checkedAt, asOf) {
  return Math.floor((asOf.getTime() - checkedAt.getTime()) / 86_400_000);
}

function sortRuleEntries(items) {
  return items.sort((left, right) => compareText(left.rule_id, right.rule_id));
}

function groupBySource(items) {
  const groups = new Map();
  for (const item of items) {
    if (!groups.has(item.source_url)) groups.set(item.source_url, []);
    groups.get(item.source_url).push({
      rule_id: item.rule_id,
      checked_at: item.checked_at,
      age_days: item.age_days
    });
  }
  return [...groups.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([source_url, rules]) => {
      sortRuleEntries(rules);
      return {
        source_url,
        rule_ids: rules.map((item) => item.rule_id),
        rules
      };
    });
}

function exceptionEntry(rule, ruleId) {
  const entry = { rule_id: ruleId };
  if (typeof rule.status === 'string') entry.status = rule.status;
  if (typeof rule.source_url === 'string') entry.source_url = rule.source_url;
  if (typeof rule.checked_at === 'string') entry.checked_at = rule.checked_at;
  return entry;
}

export function buildExpiryReport(payload, options) {
  if (!payload || !Array.isArray(payload.rules)) throw new Error('rules file must contain rules[]');
  const asOfDate = parseIsoDate(options.asOf);
  if (!asOfDate) throw new Error('--as-of must be a valid ISO date (YYYY-MM-DD)');
  if (!Number.isSafeInteger(options.maxAgeDays) || options.maxAgeDays < 1) {
    throw new Error('--max-age-days must be a positive integer');
  }

  const buckets = Object.fromEntries(CATEGORY_ORDER.map((name) => [name, []]));
  const ids = new Set();

  payload.rules.forEach((rule, index) => {
    if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
      throw new Error(`rules[${index}] must be an object`);
    }
    if (typeof rule.id !== 'string' || rule.id.trim() === '') {
      throw new Error(`rules[${index}] must have a non-empty id`);
    }
    if (ids.has(rule.id)) throw new Error(`duplicate rule id: ${rule.id}`);
    ids.add(rule.id);

    if (rule.status === 'pending') {
      buckets.pending.push(exceptionEntry(rule, rule.id));
      return;
    }
    if (typeof rule.source_url !== 'string' || rule.source_url.trim() === '') {
      buckets.missing_source.push(exceptionEntry(rule, rule.id));
      return;
    }
    if (rule.checked_at === undefined || rule.checked_at === null || rule.checked_at === '') {
      buckets.missing_checked_at.push(exceptionEntry(rule, rule.id));
      return;
    }
    const checkedAtDate = parseIsoDate(rule.checked_at);
    if (!checkedAtDate) {
      buckets.invalid_checked_at.push(exceptionEntry(rule, rule.id));
      return;
    }

    const ageDays = ageInDays(checkedAtDate, asOfDate);
    if (ageDays < 0) {
      buckets.future_checked_at.push(exceptionEntry(rule, rule.id));
      return;
    }
    const category = ageDays >= options.maxAgeDays ? 'due' : 'current';
    buckets[category].push({
      rule_id: rule.id,
      source_url: rule.source_url,
      checked_at: rule.checked_at,
      age_days: ageDays
    });
  });

  for (const name of CATEGORY_ORDER.slice(0, 5)) sortRuleEntries(buckets[name]);
  const categoryCounts = Object.fromEntries(CATEGORY_ORDER.map((name) => [name, buckets[name].length]));
  const categorizedRules = Object.values(categoryCounts).reduce((sum, count) => sum + count, 0);
  const due = groupBySource(buckets.due);
  const current = groupBySource(buckets.current);

  return {
    schema_version: 1,
    rules_file: options.rulesFile,
    rules_sha256: options.rulesSha256,
    as_of: options.asOf,
    max_age_days: options.maxAgeDays,
    policy: {
      due_boundary: 'age_days >= max_age_days',
      meaning: 'The maintenance interval identifies local reread candidates; it is not a legal-validity period.',
      date_field: 'Only checked_at is used. effective_from is never substituted.',
      mutation: 'This report does not change rule status, verified state, or value.',
      primary_category_precedence: CATEGORY_ORDER
    },
    counts: {
      input_rules: payload.rules.length,
      categorized_rules: categorizedRules,
      category_rules: categoryCounts,
      due_sources: due.length,
      current_sources: current.length
    },
    categories: {
      due,
      current,
      pending: buckets.pending,
      missing_checked_at: buckets.missing_checked_at,
      invalid_checked_at: buckets.invalid_checked_at,
      future_checked_at: buckets.future_checked_at,
      missing_source: buckets.missing_source
    }
  };
}

export function parseArgs(argv) {
  const allowed = new Set(['--rules', '--as-of', '--max-age-days', '--out']);
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    const value = argv[index + 1];
    if (!allowed.has(flag)) throw new Error(`unknown argument: ${flag ?? '(missing)'}`);
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${flag}`);
    if (flag in values) throw new Error(`duplicate argument: ${flag}`);
    values[flag] = value;
  }
  for (const flag of allowed) if (!(flag in values)) throw new Error(`missing required argument: ${flag}`);
  if (!parseIsoDate(values['--as-of'])) throw new Error('--as-of must be a valid ISO date (YYYY-MM-DD)');
  if (!/^[1-9]\d*$/.test(values['--max-age-days'])) {
    throw new Error('--max-age-days must be a positive integer');
  }
  const maxAgeDays = Number(values['--max-age-days']);
  if (!Number.isSafeInteger(maxAgeDays)) throw new Error('--max-age-days is too large');
  if (path.resolve(values['--rules']) === path.resolve(values['--out'])) {
    throw new Error('--out must not overwrite --rules');
  }
  return {
    rules: values['--rules'],
    asOf: values['--as-of'],
    maxAgeDays,
    out: values['--out']
  };
}

export function main(argv = process.argv.slice(2)) {
  try {
    const args = parseArgs(argv);
    const raw = fs.readFileSync(args.rules);
    let payload;
    try {
      payload = JSON.parse(raw.toString('utf8'));
    } catch (error) {
      throw new Error(`cannot parse rules JSON: ${error.message}`);
    }
    const report = buildExpiryReport(payload, {
      asOf: args.asOf,
      maxAgeDays: args.maxAgeDays,
      rulesFile: args.rules,
      rulesSha256: crypto.createHash('sha256').update(raw).digest('hex')
    });
    fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
    fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    console.log(JSON.stringify(report.counts));
    return 0;
  } catch (error) {
    console.error(`rules-expiry: ${error.message}`);
    console.error(usage);
    return 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  process.exitCode = main();
}
