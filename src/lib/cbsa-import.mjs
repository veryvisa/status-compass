const DIRECTION = new Map([
  ['entry', 'entry'], ['arrival', 'entry'], ['entered', 'entry'], ['entrée', 'entry'], ['entree', 'entry'], ['入境', 'entry'], ['入境记录', 'entry'],
  ['exit', 'exit'], ['departure', 'exit'], ['departed', 'exit'], ['sortie', 'exit'], ['出境', 'exit'], ['出境记录', 'exit']
]);
const HEADER = {
  direction: new Set(['direction', 'type', 'event', 'movement', 'entry/exit', '方向', '类型']),
  date: new Set(['date', 'event date', 'travel date', 'date of entry', 'date of exit', '日期']),
  port: new Set(['port', 'port of entry', 'location', '口岸', '地点'])
};

const clean = (value) => String(value || '').trim().toLowerCase();
const split = (line, delimiter) => line.split(delimiter).map((part) => part.trim().replace(/^"|"$/g, ''));

function detectDelimiter(line) {
  if (line.includes('\t')) return '\t';
  if (line.includes(';')) return ';';
  return ',';
}

function headerIndex(parts, key) {
  return parts.findIndex((part) => HEADER[key].has(clean(part)));
}

function isoDate(value, row) {
  const normalized = String(value || '').trim().replaceAll('/', '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`第 ${row} 行日期必须为 YYYY-MM-DD`);
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized) throw new Error(`第 ${row} 行日期无效：${value}`);
  return normalized;
}

export function parseCbsaColumns(input) {
  const lines = String(input || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) throw new Error('至少需要一行列名和一行记录');
  const delimiter = detectDelimiter(lines[0]);
  const headers = split(lines[0], delimiter);
  const directionAt = headerIndex(headers, 'direction');
  const dateAt = headerIndex(headers, 'date');
  const portAt = headerIndex(headers, 'port');
  if (directionAt < 0 || dateAt < 0) throw new Error('列名必须包含 direction 和 date（顺序可交换）');
  const events = lines.slice(1).map((line, index) => {
    const parts = split(line, delimiter);
    const direction = DIRECTION.get(clean(parts[directionAt]));
    if (!direction) throw new Error(`第 ${index + 2} 行方向只能是 entry 或 exit`);
    return { direction, date: isoDate(parts[dateAt], index + 2), port: portAt >= 0 ? parts[portAt] || '' : '' };
  }).sort((a, b) => a.date.localeCompare(b.date) || (a.direction === 'exit' ? -1 : 1));
  const trips = [];
  const warnings = [];
  let open = null;
  for (const event of events) {
    if (event.direction === 'exit') {
      if (open) throw new Error(`${open.date} 出境后又出现 ${event.date} 出境，中间缺少入境记录`);
      open = event;
    } else if (open) {
      if (event.date < open.date) throw new Error('入境日早于出境日');
      trips.push({ departure: open.date, return: event.date, exception: false, note: [open.port, event.port].filter(Boolean).join(' → ') || 'CBSA 手动列导入' });
      open = null;
    } else {
      warnings.push(`${event.date} 入境前没有同批出境记录，未生成行程`);
    }
  }
  if (open) trips.push({ departure: open.date, exception: false, note: open.port ? `${open.port} 出境；尚无返加记录` : 'CBSA 手动列导入；尚无返加记录' });
  if (trips.length === 0) throw new Error('未从这批列中配对出任何离境行程');
  return { trips, warnings, events };
}
