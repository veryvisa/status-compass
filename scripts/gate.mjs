import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const ruleData = JSON.parse(fs.readFileSync(new URL('../data/rules.json', import.meta.url)));
const status = Object.fromEntries(ruleData.rules.map((item) => [item.id, item.status]));
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name));
const htmlFiles = walk(dist).filter((file) => file.endsWith('.html'));
if (htmlFiles.length < 18) throw new Error(`expected at least 18 built pages, got ${htmlFiles.length}`);
let pendingRefs = [], missingViewport = [], externalForms = [];
for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  if (!/<meta name="viewport" content="width=device-width,\s*initial-scale=1"\s*\/?>/.test(source)) missingViewport.push(file);
  for (const id of source.matchAll(/data-rule="([^"]+)"/g)) if (status[id[1]] !== 'verified') pendingRefs.push(`${file}:${id[1]}`);
  if (/<form[^>]+action=/i.test(source)) externalForms.push(file);
}
if (pendingRefs.length) throw new Error(`pages reference pending or unknown rules:\n${pendingRefs.join('\n')}`);
if (missingViewport.length) throw new Error(`mobile viewport missing:\n${missingViewport.join('\n')}`);
if (externalForms.length) throw new Error(`forms must not transmit data:\n${externalForms.join('\n')}`);

const assets = walk(dist).filter((file) => /\.(css|js)$/.test(file));
const code = assets.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
for (const forbidden of [/XMLHttpRequest/, /sendBeacon\s*\(/, /new WebSocket\s*\(/, /new EventSource\s*\(/]) if (forbidden.test(code)) throw new Error(`network API found: ${forbidden}`);
const css = assets.filter((file) => file.endsWith('.css')).map((file) => fs.readFileSync(file, 'utf8')).join('\n');
const fixedWidths = [...css.matchAll(/(?<!max-)(?:min-)?width:\s*(\d{3,4})px/g)].map((match) => Number(match[1])).filter((width) => width > 390);
if (fixedWidths.length) throw new Error(`mobile overflow risk: fixed width ${fixedWidths.join(', ')}`);
if (!/overflow-x:hidden/.test(css) || !/table\{[^}]*overflow-x:auto/.test(css)) throw new Error('mobile overflow containment contract missing');

const dayPage = fs.readFileSync(new URL('../dist/tools/day-ledger/index.html', import.meta.url), 'utf8');
if (!/数据不离开浏览器/.test(dayPage) || /https?:\/\/(?!veryvisa\.github\.io)/.test(dayPage.replace(/<a[\s\S]*?<\/a>/g,''))) throw new Error('calculator privacy contract failed');
console.log(JSON.stringify({ pages: htmlFiles.length, pending_rule_references: 0, external_forms: 0, network_apis: 0, mobile_overflow_static_risks: 0 }));
