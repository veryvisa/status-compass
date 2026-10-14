import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { assess, contentHash, pageText, quoteFound, run, sourcesFromRules } from '../scripts/source-watch.mjs';

const expiry = fileURLToPath(new URL('../scripts/rules-expiry.mjs', import.meta.url));

test('quote matching survives tags inside words, entities and ellipsis, but not paraphrase', () => {
  const text = pageText('<main><p>The penalty is $25 pe<span>r d</span>ay for up to 100&nbsp;days (minimum $100 and maximum $2,500).</p><p>You&rsquo;re away</p></main>');
  assert.equal(quoteFound(text, '$25 per day for up to 100 days (minimum $100 and maximum $2,500)'), true);
  assert.equal(quoteFound(text, '$25 per day ... maximum $2,500'), true);
  assert.equal(quoteFound(text, "you're away"), true);
  assert.equal(quoteFound(text, 'maximum $2,500 ... $25 per day'), false, 'fragments must appear in order');
  assert.equal(quoteFound(text, '$25 per day for up to 120 days'), false);
});

test('content hash ignores the Date modified stamp but not real text changes', () => {
  assert.equal(contentHash(pageText('<main>Rule text. Date modified: 2026-01-01</main>')), contentHash(pageText('<main>Rule text. Date modified: 2026-10-01</main>')));
  assert.notEqual(contentHash(pageText('<main>Rule text 730 days.</main>')), contentHash(pageText('<main>Rule text 1095 days.</main>')));
});

test('assess separates missing quotes, hash changes, unreachable pages and new baselines', () => {
  const source = { url: 'https://www.canada.ca/x', rules: [{ rule_id: 'a', quote: 'at least 730 days' }] };
  const page = { ok: true, text: 'You must be in Canada at least 730 days.' };
  assert.equal(assess(source, page, undefined).state, 'no_baseline');
  assert.equal(assess(source, page, { sha256: contentHash(page.text) }).state, 'unchanged');
  assert.equal(assess(source, page, { sha256: 'old' }).state, 'changed');
  assert.equal(assess(source, { ok: true, text: 'at least 1095 days' }, { sha256: 'x' }).state, 'quote_missing');
  assert.equal(assess(source, { ok: false, error: 'HTTP 404' }, undefined).state, 'unreachable');
});

test('offline run never edits rules, only baselines quotes that are present, and refuses to accept a missing quote', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-test-'));
  const pages = path.join(dir, 'pages');
  fs.mkdirSync(pages);
  const rulesFile = path.join(dir, 'rules.json');
  const rules = { rules: [
    { id: 'good', status: 'verified', source_url: 'https://www.canada.ca/good', source_quote: 'at least 730 days' },
    { id: 'bad', status: 'verified', source_url: 'https://www.canada.ca/bad', source_quote: 'at least 1095 days' },
    { id: 'skip', status: 'pending', source_url: 'https://www.canada.ca/pending', source_quote: 'x' }
  ] };
  fs.writeFileSync(rulesFile, JSON.stringify(rules));
  const before = fs.readFileSync(rulesFile, 'utf8');
  const put = (url, html) => fs.writeFileSync(path.join(pages, `${crypto.createHash('sha1').update(url).digest('hex')}.html`), html);
  put('https://www.canada.ca/good', '<main>at least 730 days</main>');
  put('https://www.canada.ca/bad', '<main>at least 730 days</main>');
  const baseline = path.join(dir, 'baseline.json');
  const out = path.join(dir, 'report.json');
  const quiet = console.log; console.log = () => {};
  try {
    assert.equal(await run(['--rules', rulesFile, '--baseline', baseline, '--out', out, '--offline', pages, '--init-missing']), 1);
    const report = JSON.parse(fs.readFileSync(out, 'utf8'));
    assert.deepEqual(report.results.map((item) => [item.url, item.state]), [['https://www.canada.ca/bad', 'quote_missing'], ['https://www.canada.ca/good', 'baseline_created']]);
    assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(baseline, 'utf8')).sources), ['https://www.canada.ca/good']);
    await assert.rejects(run(['--rules', rulesFile, '--baseline', baseline, '--out', out, '--offline', pages, '--accept', 'https://www.canada.ca/bad']), /refuse to accept/);
    put('https://www.canada.ca/bad', '<main>at least 1095 days</main>');
    put('https://www.canada.ca/good', '<main>Now: at least 730 days, with a new paragraph.</main>');
    assert.equal(await run(['--rules', rulesFile, '--baseline', baseline, '--out', out, '--offline', pages]), 1);
    assert.equal(JSON.parse(fs.readFileSync(out, 'utf8')).results.find((item) => item.url.endsWith('good')).state, 'changed');
    assert.equal(await run(['--rules', rulesFile, '--baseline', baseline, '--out', out, '--offline', pages, '--accept', 'https://www.canada.ca/good', '--init-missing']), 0);
  } finally { console.log = quiet; }
  assert.equal(fs.readFileSync(rulesFile, 'utf8'), before);
  assert.equal(sourcesFromRules(rules).length, 2);
});

test('the shipped baseline only covers verified rule sources', () => {
  const rules = JSON.parse(fs.readFileSync(new URL('../data/rules.json', import.meta.url)));
  const baseline = JSON.parse(fs.readFileSync(new URL('../data/source-watch-baseline.json', import.meta.url)));
  const urls = new Set(sourcesFromRules(rules).map((item) => item.url));
  for (const url of Object.keys(baseline.sources)) assert.ok(urls.has(url), url);
});

test('rules-expiry --fail-on-due turns the due list into a gate', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'due-test-'));
  const rulesFile = path.join(dir, 'rules.json');
  fs.writeFileSync(rulesFile, JSON.stringify({ rules: [{ id: 'r', status: 'verified', source_url: 'https://www.canada.ca/r', checked_at: '2026-01-01' }] }));
  const call = (asOf, extra = []) => spawnSync(process.execPath, [expiry, '--rules', rulesFile, '--as-of', asOf, '--max-age-days', '90', '--out', path.join(dir, 'out.json'), ...extra], { encoding: 'utf8' });
  assert.equal(call('2026-03-01', ['--fail-on-due']).status, 0);
  assert.equal(call('2026-10-14', ['--fail-on-due']).status, 1);
  assert.equal(call('2026-10-14').status, 0, 'without the flag it stays a report');
  assert.equal(call('today', ['--fail-on-due']).status, 1);
});
