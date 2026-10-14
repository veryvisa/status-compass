// 规则源页巡检：只读官方页，核两件事——
// ① 每条 verified 规则的 source_quote 是否仍出现在原页正文里；② 正文哈希与基线比有没有变。
// 任何一处不对，只进“待人工核读”清单，绝不改 data/rules.json 的 status / value / checked_at。
// 用法：
//   node scripts/source-watch.mjs --out reports/source-watch-YYYY-MM-DD.json [--baseline data/source-watch-baseline.json] [--init-missing] [--accept <url>]...
// 退出码：0＝全部引文仍在且哈希未变；1＝有待核读项（引文消失、取不到、哈希变化）；2＝用法或文件错误。
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const ALLOWED_HOST = /(^|\.)(canada\.ca|gc\.ca|gov\.bc\.ca|ontario\.ca|gov\.cn)$/i;
const USAGE = 'Usage: node scripts/source-watch.mjs --out <report.json> [--rules data/rules.json] [--baseline data/source-watch-baseline.json] [--init-missing] [--accept <url>]... [--offline <dir>]';

export function pageText(html) {
  const body = String(html)
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg)\b[\s\S]*?<\/\1>/gi, ' ');
  const main = body.match(/<main\b[\s\S]*?<\/main>/i)?.[0] ?? body;
  return main
    // 行内标签（span/a/strong 等）可能切在单词中间，去掉时不补空格；块级标签换成空格。
    .replace(/<\/?(?:span|a|strong|em|b|i|abbr|sup|sub|code|small|mark|dfn|time)\b[^>]*>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&#039;|&rsquo;|&lsquo;/g, "'").replace(/&ldquo;|&rdquo;/g, '"').replace(/&mdash;|&ndash;/g, '-')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeForQuote(text) {
  return String(text)
    .toLowerCase()
    .replace(/[‘’′]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[‐-―]/g, '-')
    .replace(/ /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// “Date modified”行每次小改都会变，单独记录，不进正文哈希，避免把排版更新当成规则变化。
// 引文比对：去掉全部空白再比（网页常把一个词拆进几个标签）；引文里的“...”表示省略，各段须按顺序出现。
export function quoteFound(haystack, quote) {
  const squash = (text) => normalizeForQuote(text).replace(/\s+/g, '');
  const page = squash(haystack);
  let from = 0;
  for (const fragment of String(quote).split(/\.{3}|…/).map(squash).filter(Boolean)) {
    const at = page.indexOf(fragment, from);
    if (at < 0) return false;
    from = at + fragment.length;
  }
  return true;
}

export function contentHash(text) {
  const stable = text.replace(/(date modified|date de modification)\s*:?\s*\d{4}-\d{2}-\d{2}/gi, ' ');
  return crypto.createHash('sha256').update(stable).digest('hex');
}

export function dateModified(text) {
  return text.match(/(?:date modified|date de modification)\s*:?\s*(\d{4}-\d{2}-\d{2})/i)?.[1] ?? null;
}

export function sourcesFromRules(payload) {
  const map = new Map();
  for (const rule of payload.rules || []) {
    if (rule.status !== 'verified' || typeof rule.source_url !== 'string') continue;
    if (!map.has(rule.source_url)) map.set(rule.source_url, []);
    map.get(rule.source_url).push({ rule_id: rule.id, quote: rule.source_quote ?? null });
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([url, rules]) => ({ url, rules }));
}

export function assess(source, fetched, baselineEntry) {
  if (!fetched.ok) return { url: source.url, state: 'unreachable', detail: fetched.error, rules: source.rules.map((rule) => ({ rule_id: rule.rule_id, quote_found: null })) };
  const rules = source.rules.map((rule) => ({ rule_id: rule.rule_id, quote_found: rule.quote ? quoteFound(fetched.text, rule.quote) : null }));
  const hash = contentHash(fetched.text);
  const missingQuotes = rules.filter((rule) => rule.quote_found === false).map((rule) => rule.rule_id);
  const noQuote = rules.filter((rule) => rule.quote_found === null).map((rule) => rule.rule_id);
  let state = 'unchanged';
  if (missingQuotes.length) state = 'quote_missing';
  else if (!baselineEntry) state = 'no_baseline';
  else if (baselineEntry.sha256 !== hash) state = 'changed';
  return { url: source.url, state, sha256: hash, date_modified: dateModified(fetched.text), baseline_sha256: baselineEntry?.sha256 ?? null, missing_quotes: missingQuotes, rules_without_quote: noQuote, rules };
}

// PDF 用本机 pdftotext 取字（brew poppler）；没有就报 unreachable，不假装读过。
function pdfText(buffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'source-watch-'));
  try {
    const file = path.join(dir, 'page.pdf');
    fs.writeFileSync(file, buffer);
    const result = spawnSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (result.error || result.status !== 0) return { ok: false, error: `pdftotext unavailable or failed: ${result.error?.code || result.status}` };
    return { ok: true, text: result.stdout.replace(/-\n\s*/g, '').replace(/\s+/g, ' ').trim() };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

async function fetchPage(url, offlineDir) {
  if (offlineDir) {
    const file = path.join(offlineDir, `${crypto.createHash('sha1').update(url).digest('hex')}.html`);
    if (!fs.existsSync(file)) return { ok: false, error: 'offline fixture missing' };
    return { ok: true, text: pageText(fs.readFileSync(file, 'utf8')) };
  }
  const host = new URL(url).hostname;
  if (!ALLOWED_HOST.test(host)) return { ok: false, error: `host not on official allowlist: ${host}` };
  try {
    const response = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(30000) });
    if (!response.ok) return { ok: false, error: `HTTP ${response.status}` };
    if (/pdf/i.test(response.headers.get('content-type') || '') || /\.pdf$/i.test(new URL(url).pathname)) return pdfText(Buffer.from(await response.arrayBuffer()));
    return { ok: true, text: pageText(await response.text()) };
  } catch (error) {
    return { ok: false, error: String(error?.cause?.code || error?.name || error) };
  }
}

export function parseArgs(argv) {
  const args = { rules: 'data/rules.json', baseline: 'data/source-watch-baseline.json', out: null, initMissing: false, accept: [], offline: null };
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const next = () => {
      const value = argv[index + 1];
      if (value === undefined || value.startsWith('--')) throw new Error(`missing value for ${flag}`);
      index += 1;
      return value;
    };
    if (flag === '--rules') args.rules = next();
    else if (flag === '--baseline') args.baseline = next();
    else if (flag === '--out') args.out = next();
    else if (flag === '--offline') args.offline = next();
    else if (flag === '--accept') args.accept.push(next());
    else if (flag === '--init-missing') args.initMissing = true;
    else throw new Error(`unknown argument: ${flag}`);
  }
  if (!args.out) throw new Error('missing required argument: --out');
  if ([args.rules, args.baseline].some((file) => path.resolve(file) === path.resolve(args.out))) throw new Error('--out must not overwrite rules or baseline');
  return args;
}

export async function run(argv) {
  const args = parseArgs(argv);
  const payload = JSON.parse(fs.readFileSync(args.rules, 'utf8'));
  const baseline = fs.existsSync(args.baseline) ? JSON.parse(fs.readFileSync(args.baseline, 'utf8')) : { schema_version: 1, sources: {} };
  const sources = sourcesFromRules(payload);
  for (const url of args.accept) if (!sources.some((source) => source.url === url)) throw new Error(`--accept url is not a verified rule source: ${url}`);
  const results = [];
  const queue = [...sources];
  const worker = async () => {
    while (queue.length) {
      const source = queue.shift();
      results.push(assess(source, await fetchPage(source.url, args.offline), baseline.sources[source.url]));
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  results.sort((a, b) => a.url.localeCompare(b.url));
  const fetchedAt = new Date().toISOString();
  let baselineChanged = false;
  for (const result of results) {
    const accept = args.accept.includes(result.url);
    const init = args.initMissing && result.state === 'no_baseline';
    if (!(accept || init) || !result.sha256) continue;
    if (accept && result.missing_quotes.length) throw new Error(`refuse to accept ${result.url}: quotes still missing for ${result.missing_quotes.join(', ')}; fix rules.json by human reread first`);
    baseline.sources[result.url] = { sha256: result.sha256, date_modified: result.date_modified, accepted_at: fetchedAt, how: accept ? 'accepted_after_human_reread' : 'initial_baseline_quotes_present' };
    result.state = accept ? 'accepted' : 'baseline_created';
    baselineChanged = true;
  }
  const counts = results.reduce((acc, result) => ({ ...acc, [result.state]: (acc[result.state] || 0) + 1 }), {});
  const needsReread = results.filter((result) => ['quote_missing', 'changed', 'unreachable', 'no_baseline'].includes(result.state));
  const report = {
    schema_version: 1,
    fetched_at: fetchedAt,
    rules_file: args.rules,
    baseline_file: args.baseline,
    policy: 'Read-only. A missing quote, changed hash or unreachable page only queues a human reread; rules.json is never modified by this script.',
    counts: { sources: results.length, ...counts, needs_reread: needsReread.length },
    needs_reread: needsReread.map((result) => ({ url: result.url, state: result.state, detail: result.detail ?? null, missing_quotes: result.missing_quotes ?? [] })),
    results
  };
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(report, null, 2)}\n`);
  if (baselineChanged) fs.writeFileSync(args.baseline, `${JSON.stringify({ schema_version: 1, sources: Object.fromEntries(Object.entries(baseline.sources).sort(([a], [b]) => a.localeCompare(b))) }, null, 2)}\n`);
  console.log(JSON.stringify(report.counts));
  return needsReread.length ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  run(process.argv.slice(2)).then((code) => { process.exitCode = code; }, (error) => {
    console.error(`source-watch: ${error.message}`);
    console.error(USAGE);
    process.exitCode = 2;
  });
}
