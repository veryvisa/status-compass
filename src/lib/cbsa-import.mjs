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
const DELIMITERS = ['\t', ';', ','];

function delimiterCounts(line, row) {
  const counts = new Map(DELIMITERS.map((delimiter) => [delimiter, 0]));
  let state = 'start';
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (state === 'quoted') {
      if (character !== '"') continue;
      if (line[index + 1] === '"') index += 1;
      else state = 'after-quote';
      continue;
    }
    if (character === '"') {
      if (state !== 'start') throw new Error(`第 ${row} 行引号位置无效`);
      state = 'quoted';
      continue;
    }
    if (DELIMITERS.includes(character)) {
      counts.set(character, counts.get(character) + 1);
      state = 'start';
      continue;
    }
    if (/\s/.test(character) && (state === 'start' || state === 'after-quote')) continue;
    if (state === 'after-quote') throw new Error(`第 ${row} 行引号后的字符无效`);
    state = 'unquoted';
  }
  if (state === 'quoted') throw new Error(`第 ${row} 行引号未闭合；不支持字段内换行`);
  return counts;
}

function detectDelimiter(line, row) {
  const counts = delimiterCounts(line, row);
  if (counts.get('\t')) return '\t';
  if (counts.get(';')) return ';';
  return ',';
}

function splitLine(line, delimiter, row) {
  const parts = [];
  let value = '';
  let state = 'start';
  const finish = () => {
    parts.push(value.trim());
    value = '';
    state = 'start';
  };
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (state === 'quoted') {
      if (character !== '"') {
        value += character;
      } else if (line[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        state = 'after-quote';
      }
    } else if (character === delimiter) {
      finish();
    } else if (character === '"') {
      if (state !== 'start') throw new Error(`第 ${row} 行引号位置无效`);
      state = 'quoted';
    } else if (/\s/.test(character) && (state === 'start' || state === 'after-quote')) {
      // Keep the old trim behavior while permitting spaces around quoted fields.
    } else if (state === 'after-quote') {
      throw new Error(`第 ${row} 行引号后的字符无效`);
    } else {
      value += character;
      state = 'unquoted';
    }
  }
  if (state === 'quoted') throw new Error(`第 ${row} 行引号未闭合；不支持字段内换行`);
  finish();
  return parts;
}

function headerIndexes(parts, key) {
  return parts.flatMap((part, index) => HEADER[key].has(clean(part)) ? [index] : []);
}

function isoDate(value, row) {
  const normalized = String(value || '').trim().replaceAll('/', '-');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) throw new Error(`第 ${row} 行日期必须为 YYYY-MM-DD`);
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized) throw new Error(`第 ${row} 行日期无效：${value}`);
  return normalized;
}

export function parseCbsaColumns(input) {
  const lines = String(input || '').split(/\r?\n/)
    .map((line, index) => ({ line, row: index + 1 }))
    .filter(({ line }) => line.trim());
  if (lines.length < 2) throw new Error('至少需要一行列名和一行记录');
  const delimiter = detectDelimiter(lines[0].line, lines[0].row);
  const headers = splitLine(lines[0].line, delimiter, lines[0].row);
  const directionColumns = headerIndexes(headers, 'direction');
  const dateColumns = headerIndexes(headers, 'date');
  if (directionColumns.length > 1) throw new Error(`第 ${lines[0].row} 行 direction 语义列重复`);
  if (dateColumns.length > 1) throw new Error(`第 ${lines[0].row} 行 date 语义列重复`);
  const directionAt = directionColumns[0] ?? -1;
  const dateAt = dateColumns[0] ?? -1;
  const portAt = headerIndexes(headers, 'port')[0] ?? -1;
  if (directionAt < 0 || dateAt < 0) throw new Error('列名必须包含 direction 和 date（顺序可交换）');
  const events = lines.slice(1).map(({ line, row }) => {
    const parts = splitLine(line, delimiter, row);
    if (parts.length !== headers.length) throw new Error(`第 ${row} 行列数不匹配：应为 ${headers.length} 列，实际为 ${parts.length} 列`);
    const direction = DIRECTION.get(clean(parts[directionAt]));
    if (!direction) throw new Error(`第 ${row} 行方向只能是 entry 或 exit`);
    return { direction, date: isoDate(parts[dateAt], row), port: portAt >= 0 ? parts[portAt] || '' : '' };
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
