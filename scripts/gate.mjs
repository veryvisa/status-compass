import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const ruleData = JSON.parse(fs.readFileSync(new URL('../data/rules.json', import.meta.url)));
const status = Object.fromEntries(ruleData.rules.map((item) => [item.id, item.status]));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name));
const htmlFiles = walk(dist).filter((file) => file.endsWith('.html'));
if (htmlFiles.length < 18) throw new Error(`expected at least 18 built pages, got ${htmlFiles.length}`);
let pendingRefs = [], missingViewport = [], externalForms = [], nonLinkCards = [];
for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (!/<meta name="viewport" content="width=device-width,\s*initial-scale=1"\s*\/?>/.test(source)) missingViewport.push(file);
  for (const id of source.matchAll(/data-rule="([^"]+)"/g)) if (status[id[1]] !== 'verified') pendingRefs.push(`${file}:${id[1]}`);
  if (/<form[^>]+action=/i.test(source)) externalForms.push(file);
  for (const tag of source.matchAll(/<([a-z][\w-]*)\b([^>]*)>/gi)) {
    const className = tag[2].match(/\bclass="([^"]*)"/i)?.[1] || '';
    if (!className.split(/\s+/).includes('card')) continue;
    if (tag[1].toLowerCase() !== 'a' || !/\bhref="[^"]+"/i.test(tag[2])) nonLinkCards.push(`${file}:${tag[1]}`);
  }
}
if (pendingRefs.length) throw new Error(`pages reference pending or unknown rules:\n${pendingRefs.join('\n')}`);
if (missingViewport.length) throw new Error(`mobile viewport missing:\n${missingViewport.join('\n')}`);
if (externalForms.length) throw new Error(`forms must not transmit data:\n${externalForms.join('\n')}`);
if (nonLinkCards.length) throw new Error(`every .card must be one keyboard-reachable link:\n${nonLinkCards.join('\n')}`);

const relative = (file) => path.relative(dist, file).split(path.sep).join('/');
const pathPages = htmlFiles.filter((file) => /^paths\/[^/]+\/index\.html$/.test(relative(file)));
const guidePages = htmlFiles.filter((file) => /^guides\/[^/]+\/index\.html$/.test(relative(file)));
const guideFullPages = htmlFiles.filter((file) => /^guides\/[^/]+\/full\/index\.html$/.test(relative(file)));
if (pathPages.length !== 9 || guidePages.length !== 9) throw new Error(`content route contract failed: paths=${pathPages.length}, guides=${guidePages.length}`);
if (htmlFiles.some((file) => relative(file).split('/').some((part) => part.startsWith('_')))) throw new Error('underscore-prefixed content leaked into a public route');

for (const file of pathPages) {
  const source = fs.readFileSync(file, 'utf8');
  for (const required of ['class="situation-nav"', 'aria-current="page"', 'class="toc toc-mobile"', 'class="toc toc-desktop"', 'class="prev-next"', 'class="prose"']) {
    if (!source.includes(required)) throw new Error(`${relative(file)} missing ${required}`);
  }
}
for (const file of guidePages) {
  const source = fs.readFileSync(file, 'utf8');
  if (!source.includes('class="situation-nav"') || !source.includes('class="prose digest"') || !source.includes('class="prev-next"')) throw new Error(`${relative(file)} missing guide navigation or digest`);
  if (!/class="detail-action"[\s\S]*href="(?:https:\/\/bbs\.fcgvisa\.com\/t\/\d+|\/status-compass\/guides\/[^/]+\/full\/)"/.test(source)) throw new Error(`${relative(file)} missing forum/full fallback action`);
}
for (const file of guideFullPages) {
  const source = fs.readFileSync(file, 'utf8');
  for (const required of ['class="situation-nav"', 'class="toc toc-mobile"', 'class="toc toc-desktop"', 'class="prev-next"', 'class="prose"']) {
    if (!source.includes(required)) throw new Error(`${relative(file)} missing ${required}`);
  }
}

const home = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const pathCards = (home.match(/<a class="card" href="\/status-compass\/paths\/[^/]+\/"/g) || []).length;
const guideCards = (home.match(/<a class="card" href="\/status-compass\/guides\/[^/]+\/"/g) || []).length;
if (pathCards !== 9 || guideCards !== 9) throw new Error(`home card contract failed: paths=${pathCards}, guides=${guideCards}`);
for (const label of ['处境', '工具', '专题', '入籍考试', '怎么算的']) if (!home.includes(`>${label}</a>`)) throw new Error(`top navigation missing ${label}`);

const assets = walk(dist).filter((file) => /\.(css|js)$/.test(file));
const code = assets.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const forbidden of [/XMLHttpRequest/, /sendBeacon\s*\(/, /new WebSocket\s*\(/, /new EventSource\s*\(/]) if (forbidden.test(code)) throw new Error(`network API found: ${forbidden}`);
const css = assets.filter((file) => file.endsWith('.css')).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const fixedWidths = [...css.matchAll(/(?<!max-)(?:min-)?width:\s*(\d{3,4})px/g)].map((match) => Number(match[1])).filter((width) => width > 390);
if (fixedWidths.length) throw new Error(`mobile overflow risk: fixed width ${fixedWidths.join(', ')}`);
if (!/overflow-x:hidden/.test(css) || !/table\{[^}]*overflow-x:auto/.test(css)) throw new Error('mobile overflow containment contract missing');
if (!/\.card:hover,\.card:focus-visible/.test(css) || !/\.card:focus-visible\{[^}]*outline:/.test(css)) throw new Error('whole-card hover/focus contract missing');

const dayPage = fs.readFileSync(new URL('../dist/tools/day-ledger/index.html', import.meta.url), 'utf8');
if (!/数据不离开浏览器/.test(dayPage) || /https?:\/\/(?!veryvisa\.github\.io)/.test(dayPage.replace(/<a[\s\S]*?<\/a>/g,''))) throw new Error('calculator privacy contract failed');
console.log(JSON.stringify({ pages: htmlFiles.length, path_pages: pathPages.length, guide_pages: guidePages.length, guide_full_fallbacks: guideFullPages.length, whole_link_cards: true, pending_rule_references: 0, external_forms: 0, network_apis: 0, mobile_overflow_static_risks: 0 }));
