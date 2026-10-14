const DIRECTION = new Map([
  ['entry', 'entry'], ['arrival', 'entry'], ['entered', 'entry'], ['entrée', 'entry'], ['entree', 'entry'], ['入境', 'entry'], ['入境记录', 'entry'],
  ['exit', 'exit'], ['departure', 'exit'], ['departed', 'exit'], ['sortie', 'exit'], ['出境', 'exit'], ['出境记录', 'exit']
]);
const HEADER = {
  direction: new Set(['direction', 'type', 'event', 'movement', 'entry/exit', '方向', '类型']),
  date: new Set(['date', 'event date', 'travel date', 'date of entry', 'date of exit', 'entry date', 'exit date', 'date/time', 'date and time', '日期', '入境日期', '出境日期']),
  port: new Set(['port', 'port of entry', 'port of exit', 'location', 'location of the port of entry', '口岸', '地点'])
};
// CBSA 官方页列出报告每条记录还含姓名、出生日期、国籍、性别与证件号码。
// 这些列一律不读进行程，只报告“已丢弃”，以免把证件号写进家庭文件。
const SENSITIVE_HEADER = /(name|birth|dob|citizenship|nationality|gender|sex|document|passport|travel doc|姓名|出生|国籍|性别|证件|护照)/i;
// CBSA 官方页公布的出境数据起点：陆路全体旅客 2019-07-11，商业航空 2020-06-25。
export const CBSA_EXIT_DATA_FROM = { land: '2019-07-11', air: '2020-06-25' };

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

const MONTHS = new Map([
  ['jan', 1], ['january', 1], ['janv', 1], ['janvier', 1],
  ['feb', 2], ['february', 2], ['fev', 2], ['févr', 2], ['fevr', 2], ['février', 2], ['fevrier', 2],
  ['mar', 3], ['march', 3], ['mars', 3],
  ['apr', 4], ['april', 4], ['avr', 4], ['avril', 4],
  ['may', 5], ['mai', 5],
  ['jun', 6], ['june', 6], ['juin', 6],
  ['jul', 7], ['july', 7], ['juil', 7], ['juillet', 7],
  ['aug', 8], ['august', 8], ['aou', 8], ['août', 8], ['aout', 8],
  ['sep', 9], ['sept', 9], ['september', 9], ['septembre', 9],
  ['oct', 10], ['october', 10], ['octobre', 10],
  ['nov', 11], ['november', 11], ['novembre', 11],
  ['dec', 12], ['december', 12], ['déc', 12], ['decembre', 12], ['décembre', 12]
]);
export const DATE_ORDERS = ['ymd', 'dmy', 'mdy'];

function buildIso(year, month, day, value, row) {
  const normalized = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (!/^\d{4}$/.test(String(year)) || Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== normalized) throw new Error(`第 ${row} 行日期无效：${value}`);
  return normalized;
}

function monthNumber(token, value, row) {
  const month = MONTHS.get(String(token).toLowerCase().replace(/\.$/, ''));
  if (!month) throw new Error(`第 ${row} 行月份无法识别：${value}`);
  return month;
}

// 只接受无歧义写法；纯数字的日/月顺序必须由使用者在向导里明确选择，绝不猜。
export function parseTravelDate(value, row, dateOrder = 'ymd') {
  if (!DATE_ORDERS.includes(dateOrder)) throw new Error(`日期顺序只能是 ${DATE_ORDERS.join('/')}`);
  const raw = String(value || '').trim();
  // 去掉时刻部分（如 2025-03-01 14:22 或 2025-03-01T14:22:00）。
  const text = raw.replace(/[T\s]+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[AaPp][Mm])?\s*$/, '').trim();
  let match;
  if ((match = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/))) return buildIso(match[1], match[2], match[3], raw, row);
  if ((match = text.match(/^(\d{4})(\d{2})(\d{2})$/))) return buildIso(match[1], match[2], match[3], raw, row);
  if ((match = text.match(/^(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日?$/))) return buildIso(match[1], match[2], match[3], raw, row);
  if ((match = text.match(/^(\d{4})[-\s]([A-Za-zÀ-ÿ.]{3,10})[-\s](\d{1,2})$/))) return buildIso(match[1], monthNumber(match[2], raw, row), match[3], raw, row);
  if ((match = text.match(/^(\d{1,2})[-\s]([A-Za-zÀ-ÿ.]{3,10})[-\s,]+(\d{4})$/))) return buildIso(match[3], monthNumber(match[2], raw, row), match[1], raw, row);
  if ((match = text.match(/^([A-Za-zÀ-ÿ.]{3,10})\s+(\d{1,2}),?\s+(\d{4})$/))) return buildIso(match[3], monthNumber(match[1], raw, row), match[2], raw, row);
  if ((match = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/))) {
    if (dateOrder === 'ymd') throw new Error(`第 ${row} 行日期 ${raw} 的日月顺序有歧义：请改成 YYYY-MM-DD，或在向导里选择“日/月/年”或“月/日/年”`);
    const [first, second] = [Number(match[1]), Number(match[2])];
    const [day, month] = dateOrder === 'dmy' ? [first, second] : [second, first];
    if (month > 12) throw new Error(`第 ${row} 行日期 ${raw} 与所选顺序（${dateOrder === 'dmy' ? '日/月/年' : '月/日/年'}）矛盾：月份大于 12`);
    return buildIso(match[3], month, day, raw, row);
  }
  throw new Error(`第 ${row} 行日期必须为 YYYY-MM-DD、带英文/法文月份名或选定顺序的数字日期：${raw}`);
}

function pairEvents(events, { split = false } = {}) {
  const trips = [];
  const warnings = [];
  const unmatchedEntries = [];
  let open = null;
  for (const event of events) {
    if (event.direction === 'exit') {
      if (open) throw new Error(`${open.date} 出境后又出现 ${event.date} 出境，中间缺少入境记录`);
      open = event;
    } else if (open) {
      if (event.date < open.date) throw new Error('入境日早于出境日');
      trips.push({ departure: open.date, return: event.date, exception: false, note: [open.port, event.port].filter(Boolean).join(' → ') || 'CBSA 记录导入' });
      open = null;
    } else {
      unmatchedEntries.push(event.date);
      const beforeExitData = event.date < CBSA_EXIT_DATA_FROM.land;
      warnings.push(split
        ? `${event.date} 入境前没有出境记录${beforeExitData ? '（早于 2019-07-11，CBSA 当时一般不记出境）' : ''}；请手动补上离境日，本工具不替你猜`
        : `${event.date} 入境前没有同批出境记录，未生成行程`);
    }
  }
  if (open) trips.push({ departure: open.date, exception: false, note: open.port ? `${open.port} 出境；尚无返加记录` : 'CBSA 记录导入；尚无返加记录' });
  return { trips, warnings, unmatchedEntries };
}

const sortEvents = (events) => events.sort((a, b) => a.date.localeCompare(b.date) || (a.direction === 'exit' ? -1 : 1));

export function parseCbsaColumns(input, { dateOrder = 'ymd' } = {}) {
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
  const events = sortEvents(lines.slice(1).map(({ line, row }) => {
    const parts = splitLine(line, delimiter, row);
    if (parts.length !== headers.length) throw new Error(`第 ${row} 行列数不匹配：应为 ${headers.length} 列，实际为 ${parts.length} 列`);
    const direction = DIRECTION.get(clean(parts[directionAt]));
    if (!direction) throw new Error(`第 ${row} 行方向只能是 entry 或 exit`);
    return { direction, date: parseTravelDate(parts[dateAt], row, dateOrder), port: portAt >= 0 ? parts[portAt] || '' : '' };
  }));
  const { trips, warnings } = pairEvents(events);
  if (trips.length === 0) throw new Error('未从这批列中配对出任何离境行程');
  return { trips, warnings, events };
}

function parseOneSide(input, direction, label, dateOrder) {
  const lines = String(input || '').split(/\r?\n/)
    .map((line, index) => ({ line, row: index + 1 }))
    .filter(({ line }) => line.trim());
  if (lines.length === 0) return { events: [], droppedColumns: [] };
  const delimiter = detectDelimiter(lines[0].line, lines[0].row);
  const first = splitLine(lines[0].line, delimiter, lines[0].row);
  const dateColumns = headerIndexes(first, 'date');
  const prefix = `${label}第`;
  const relabel = (error) => new Error(error.message.replace(/^第/, prefix));
  if (dateColumns.length > 1) throw new Error(`${prefix} ${lines[0].row} 行 date 语义列重复`);
  let rows = lines;
  let dateAt = 0;
  let portAt = -1;
  let width = null;
  let droppedColumns = [];
  if (dateColumns.length === 1) {
    dateAt = dateColumns[0];
    portAt = headerIndexes(first, 'port')[0] ?? -1;
    width = first.length;
    droppedColumns = first.filter((header, index) => index !== dateAt && index !== portAt && header).map((header) => ({ header, sensitive: SENSITIVE_HEADER.test(header) }));
    rows = lines.slice(1);
  } else {
    portAt = first.length > 1 ? 1 : -1;
  }
  const events = rows.map(({ line, row }) => {
    try {
      const parts = splitLine(line, delimiter, row);
      if (width !== null && parts.length !== width) throw new Error(`第 ${row} 行列数不匹配：应为 ${width} 列，实际为 ${parts.length} 列`);
      if (width === null && parts.length > 2) throw new Error(`第 ${row} 行无列名时只允许“日期”或“日期,口岸”两列；多列请保留第一行列名`);
      return { direction, date: parseTravelDate(parts[dateAt], row, dateOrder), port: portAt >= 0 ? parts[portAt] || '' : '' };
    } catch (error) { throw relabel(error); }
  });
  return { events, droppedColumns };
}

// 向导模式：CBSA 报告按“入境”“出境”分别申请、分别列出，这里允许两张表分开粘贴。
// 出境记录不全是常态（官方页：出境信息有限，2019/2020 前多无记录），缺出境的入境只提示、不配对。
export function parseCbsaSplit({ entries = '', exits = '', dateOrder = 'ymd' } = {}) {
  const entrySide = parseOneSide(entries, 'entry', '入境表', dateOrder);
  const exitSide = parseOneSide(exits, 'exit', '出境表', dateOrder);
  if (entrySide.events.length === 0 && exitSide.events.length === 0) throw new Error('入境表和出境表都为空');
  const warnings = [];
  const seen = new Set();
  const events = sortEvents([...entrySide.events, ...exitSide.events].filter((event) => {
    const key = `${event.direction}|${event.date}`;
    if (seen.has(key)) { warnings.push(`${event.date} ${event.direction === 'entry' ? '入境' : '出境'}重复出现（常见于同一次过境登记了两本证件），只保留一条`); return false; }
    seen.add(key);
    return true;
  }));
  const paired = pairEvents(events, { split: true });
  const droppedColumns = [...entrySide.droppedColumns, ...exitSide.droppedColumns];
  const sensitive = [...new Set(droppedColumns.filter((column) => column.sensitive).map((column) => column.header))];
  if (sensitive.length) warnings.push(`已丢弃含个人身份信息的列：${sensitive.join('、')}；这些列不会进入行程或导出文件`);
  return { trips: paired.trips, warnings: [...warnings, ...paired.warnings], events, unmatchedEntries: paired.unmatchedEntries, droppedColumns };
}
