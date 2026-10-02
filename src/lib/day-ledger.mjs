import { rule, value } from './rules.mjs';

const DAY = 86400000;
export const iso = (date) => new Date(date).toISOString().slice(0, 10);
export function date(value) {
  const parsed = value instanceof Date ? new Date(value) : new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.valueOf())) throw new Error(`Invalid date: ${value}`);
  return parsed;
}
export const addDays = (input, days) => new Date(date(input).valueOf() + days * DAY);
export function addYears(input, years) {
  const d = date(input);
  const month = d.getUTCMonth();
  d.setUTCFullYear(d.getUTCFullYear() + years);
  if (d.getUTCMonth() !== month) d.setUTCDate(0);
  return d;
}
export const daysInclusive = (start, end) => Math.max(0, Math.round((date(end) - date(start)) / DAY) + 1);
export const maxDate = (...values) => new Date(Math.max(...values.map((v) => date(v).valueOf())));
export const minDate = (...values) => new Date(Math.min(...values.map((v) => date(v).valueOf())));

export function normalizeTrips(trips = []) {
  return trips.map((trip, index) => {
    const departure = date(trip.departure);
    const returned = trip.return ? date(trip.return) : null;
    if (returned && returned < departure) throw new Error(`第 ${index + 1} 段行程的返加日早于离境日`);
    return { departure, return: returned, exception: Boolean(trip.exception), note: trip.note || '' };
  });
}

export function parseTripInput(input) {
  if (Array.isArray(input)) return input;
  const text = String(input || '').trim();
  if (!text) return [];
  if (text.startsWith('[')) return JSON.parse(text);
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean).filter((line) => !/^(departure|离境)/i.test(line)).map((line, index) => {
    const [departure, returned = '', flag = ''] = line.split(/[\t,，]/).map((part) => part.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(departure) || (returned && !/^\d{4}-\d{2}-\d{2}$/.test(returned))) throw new Error(`第 ${index + 1} 行应为 YYYY-MM-DD, YYYY-MM-DD`);
    return { departure, ...(returned ? { return: returned } : {}), exception: /^(1|yes|true|例外)$/i.test(flag) };
  });
}

export function isAbsentOn(day, trip) {
  const t = date(day).valueOf();
  return t > trip.departure.valueOf() && (!trip.return || t < trip.return.valueOf());
}

export function presenceDays(start, end, trips = []) {
  const a = date(start), b = date(end);
  if (b < a) return 0;
  const normalized = normalizeTrips(trips);
  let present = 0;
  for (let cursor = a; cursor <= b; cursor = addDays(cursor, 1)) {
    if (!normalized.some((trip) => isAbsentOn(cursor, trip))) present += 1;
  }
  return present;
}

export function yearPresence(year, asOf, trips = [], canadaStart) {
  const start = maxDate(`${year}-01-01`, canadaStart || `${year}-01-01`);
  const end = minDate(`${year}-12-31`, asOf);
  return presenceDays(start, end, trips);
}

export function prMeasure(input, asOfOverride) {
  const asOf = date(asOfOverride || input.asOf);
  const v = (id) => value(id, asOf);
  const prDate = date(input.prDate);
  if (asOf < prDate) return { days: 0, required: v('pr.required_days'), missing: v('pr.required_days'), windowStart: iso(prDate), underFiveYears: true };
  const fiveYearAnniversary = addYears(prDate, v('pr.window_years'));
  const underFiveYears = asOf < fiveYearAnniversary;
  const windowStart = underFiveYears ? prDate : addDays(addYears(asOf, -v('pr.window_years')), 1);
  const days = presenceDays(windowStart, asOf, input.trips);
  return { days, required: v('pr.required_days'), missing: Math.max(0, v('pr.required_days') - days), windowStart: iso(windowStart), underFiveYears, firstFiveYearEnd: iso(fiveYearAnniversary) };
}

export function citizenshipMeasure(input, asOfOverride) {
  const signingDate = date(asOfOverride || input.asOf);
  const v = (id) => value(id, signingDate);
  const periodStart = addYears(signingDate, -v('citizenship.window_years'));
  const periodEnd = addDays(signingDate, -1);
  const prDate = date(input.prDate);
  const prStart = maxDate(periodStart, prDate);
  const prDays = periodEnd >= prStart ? presenceDays(prStart, periodEnd, input.trips) : 0;
  let prePrRaw = 0;
  if (input.temporaryStart) {
    const preStart = maxDate(periodStart, input.temporaryStart);
    const preEnd = minDate(periodEnd, addDays(prDate, -1));
    prePrRaw = preEnd >= preStart ? presenceDays(preStart, preEnd, input.trips) : 0;
  }
  const prePrCredit = Math.min(v('citizenship.pre_pr_max'), prePrRaw * v('citizenship.pre_pr_factor'));
  const total = prDays + prePrCredit;
  return { total, prDays, prePrRaw, prePrCredit, required: v('citizenship.required_days'), missing: Math.max(0, v('citizenship.required_days') - total), periodStart: iso(periodStart), periodEnd: iso(periodEnd) };
}

export function healthMeasure(input) {
  const asOf = date(input.asOf);
  const v = (id) => value(id, asOf);
  const residenceStart = date(input.canadaStart || input.temporaryStart || input.prDate);
  if (input.province === 'on') {
    const rollingStart = maxDate(addDays(addYears(asOf, -1), 1), residenceStart);
    const days = presenceDays(rollingStart, asOf, input.trips);
    const initialEnd = addDays(residenceStart, 182);
    const initialAssessedThrough = minDate(asOf, initialEnd);
    const initialDays = presenceDays(residenceStart, initialAssessedThrough, input.trips);
    const initialComplete = asOf >= initialEnd;
    const required = v('ohip.presence_days');
    const initialRequired = v('ohip.initial_presence_days');
    return {
      province: 'Ontario', days, required,
      windowType: 'rolling_12_months', windowStart: iso(rollingStart), windowEnd: iso(asOf),
      meetsRolling: days >= required,
      initial: {
        days: initialDays, required: initialRequired,
        periodStart: iso(residenceStart), periodEnd: iso(initialEnd), assessedThrough: iso(initialAssessedThrough),
        complete: initialComplete, meets: initialComplete ? initialDays >= initialRequired : null
      },
      signal: `${iso(rollingStart)} 至 ${iso(asOf)} 共 ${days} 天；${days >= required ? '达到' : '未达到'}当前滚动窗口的 ${required} 天信号`
    };
  }
  const year = asOf.getUTCFullYear();
  const calendarStart = maxDate(`${year}-01-01`, residenceStart);
  const days = presenceDays(calendarStart, asOf, input.trips);
  return {
    province: 'British Columbia', days, required: null, requiredMonths: v('msp.presence_months'),
    windowType: 'calendar_year', windowStart: iso(calendarStart), windowEnd: iso(asOf),
    signal: `${year} 日历年截至计算日记录 ${days} 天；官方单位为六个月，本工具不硬换成固定天数`
  };
}

export function oasMeasure(input) {
  const start = maxDate(input.canadaStart || input.temporaryStart || input.prDate, input.birthDate ? addYears(input.birthDate, 18) : input.canadaStart || input.prDate);
  const days = presenceDays(start, input.asOf, input.trips);
  const years = Math.floor(days / 365.2425 * 100) / 100;
  return { days, years, fraction: Math.min(1, years / value('oas.full_years', input.asOf)), thresholds: [value('oas.minimum_years_canada', input.asOf), value('oas.minimum_years_abroad', input.asOf), value('oas.full_years', input.asOf)] };
}

function firstDate(start, years, predicate) {
  const limit = addYears(start, years);
  for (let cursor = addDays(start, 1); cursor <= limit; cursor = addDays(cursor, 1)) if (predicate(cursor)) return iso(cursor);
  return null;
}

export function buildTimeline(input) {
  const start = date(input.asOf);
  const prDate = prMeasure(input, start).missing === 0 ? iso(start) : firstDate(start, 5, (d) => prMeasure(input, d).missing === 0);
  const citizenshipDate = citizenshipMeasure(input, start).missing === 0 ? iso(start) : firstDate(start, 5, (d) => citizenshipMeasure(input, d).missing === 0);
  const year = start.getUTCFullYear();
  const taxDate = yearPresence(year, start, input.trips, input.canadaStart || input.prDate) >= value('tax.deemed_resident_days', start) ? iso(start) : firstDate(start, 1, (d) => d.getUTCFullYear() === year && yearPresence(year, d, input.trips, input.canadaStart || input.prDate) >= value('tax.deemed_resident_days', d));
  const oas = oasMeasure(input);
  const oasEvents = oas.thresholds.filter((threshold) => oas.years < threshold).map((threshold) => ({ label: `OAS 居住年数达到 ${threshold} 年`, date: iso(addDays(start, Math.ceil((threshold - oas.years) * 365.2425))) })).filter((event) => date(event.date) <= addYears(start, 5));
  return [
    { label: 'PR 天数达到门槛（假设以后不再离境）', date: prDate },
    { label: '入籍实际居住达到门槛（仍须核报税、语言及禁限条件）', date: citizenshipDate },
    { label: '本税年达到 183 天信号（不能单独决定税务居民）', date: taxDate },
    ...oasEvents
  ].filter((event) => event.date).sort((a, b) => a.date.localeCompare(b.date));
}

export function calculateLedger(input) {
  const cleaned = { ...input, trips: parseTripInput(input.trips || []) };
  const pr = prMeasure(cleaned);
  const citizenship = citizenshipMeasure(cleaned);
  const taxDays = yearPresence(date(cleaned.asOf).getUTCFullYear(), cleaned.asOf, cleaned.trips, cleaned.canadaStart || cleaned.temporaryStart || cleaned.prDate);
  const provinceRule = cleaned.province === 'on' ? 'ohip.presence_days' : 'msp.presence_months';
  return {
    pr, citizenship,
    tax: { days: taxDays, signal: taxDays >= value('tax.deemed_resident_days', cleaned.asOf) },
    health: healthMeasure(cleaned), oas: oasMeasure(cleaned), timeline: buildTimeline(cleaned),
    ruleVersions: {
      pr: rule('pr.required_days', cleaned.asOf).effective_from,
      citizenship: rule('citizenship.required_days', cleaned.asOf).effective_from,
      tax: rule('tax.deemed_resident_days', cleaned.asOf).effective_from,
      health: rule(provinceRule, cleaned.asOf).effective_from,
      oas: rule('oas.full_years', cleaned.asOf).effective_from
    }
  };
}
