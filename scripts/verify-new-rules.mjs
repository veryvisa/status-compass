import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);
const FILES = ['content/paths/_new-rules.jsonl', 'content/guides/_new-rules.jsonl'];

export function readCandidates() {
  return FILES.flatMap((name) => fs.readFileSync(path.join(ROOT, name), 'utf8').split(/\n/).filter(Boolean).map((line, index) => {
    try { return { ...JSON.parse(line), _file: name, _line: index + 1 }; }
    catch (error) { throw new Error(`${name}:${index + 1}: ${error.message}`); }
  }));
}

function normalized(text) {
  return String(text).normalize('NFKC').toLowerCase().replace(/https?:\/\/\S+/g, '').replace(/[^\p{L}\p{N}]+/gu, '');
}

function tokenCoverage(quote, page) {
  const tokens = String(quote).normalize('NFKC').toLowerCase().match(/[a-z0-9]+|[\p{Script=Han}]{2,}/gu) || [];
  if (tokens.length < 4) return 0;
  const haystack = String(page).normalize('NFKC').toLowerCase();
  return tokens.filter((token) => haystack.includes(token)).length / tokens.length;
}

async function fetchText(url) {
  const attempts = [`https://r.jina.ai/${url}`, url];
  const errors = [];
  for (const target of attempts) {
    try {
      const response = await fetch(target, { headers: { 'User-Agent': 'status-compass-rule-verifier/1.0' }, signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      if (text.length < 80) throw new Error(`short body ${text.length}`);
      return { text, fetched_via: target.startsWith('https://r.jina.ai/') ? 'agent-reach-jina' : 'direct-primary' };
    } catch (error) { errors.push(`${target}: ${error.message}`); }
  }
  throw new Error(errors.join(' | '));
}

async function mapLimit(items, limit, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      output[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return output;
}

export async function verifyCandidates(candidates = readCandidates()) {
  const urls = [...new Set(candidates.map((item) => item.source_url))];
  const fetched = new Map();
  await mapLimit(urls, 6, async (url) => {
    try { fetched.set(url, { ok: true, ...(await fetchText(url)) }); }
    catch (error) { fetched.set(url, { ok: false, error: error.message, text: '' }); }
  });
  const results = candidates.map((item) => {
    const page = fetched.get(item.source_url);
    const exact = page.ok && normalized(page.text).includes(normalized(item.source_quote));
    const coverage = page.ok ? tokenCoverage(item.source_quote, page.text) : 0;
    const result = exact ? 'exact' : coverage >= 0.8 ? 'near' : page.ok ? 'unmatched' : 'fetch_error';
    return { id: item.id, source_url: item.source_url, source_quote: item.source_quote, result, token_coverage: Number(coverage.toFixed(3)), fetched_via: page.fetched_via || null, error: page.error || null, file: item._file, line: item._line };
  });
  return {
    checked_at: new Date().toISOString(),
    method: 'agent-reach Jina Reader first; direct primary page fallback; normalized exact quote or token coverage',
    candidates: candidates.length,
    unique_urls: urls.length,
    counts: Object.fromEntries(['exact', 'near', 'unmatched', 'fetch_error'].map((key) => [key, results.filter((item) => item.result === key).length])),
    results
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const report = await verifyCandidates();
  const reportPath = path.join(ROOT, process.argv[2] || 'reports/round3-rule-verification.json');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ report: path.relative(ROOT, reportPath), ...report.counts, candidates: report.candidates, unique_urls: report.unique_urls }));
  if (report.counts.unmatched || report.counts.fetch_error) process.exitCode = 1;
}
