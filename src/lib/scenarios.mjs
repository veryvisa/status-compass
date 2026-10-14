import { addDays, addYears, buildTimeline, citizenshipMeasure, date, isAbsentOn, iso, normalizeTrips, parseTripInput, presenceDays } from './day-ledger.mjs';
import { value } from './rules.mjs';

// 情景分叉：在“以后不再离境”的基线之外，叠加一段假设的离境（如回国三个月、一年），
// 比较 PR 达标日、入籍达标日与 PR 居住义务是否会断。所有情景都只在浏览器内计算，不保存。
export const SCENARIO_PRESETS = [
  { id: 'stay', label: '以后不再离境', months: 0 },
  { id: 'away-3m', label: '离境三个月', months: 3 },
  { id: 'away-1y', label: '离境一年', months: 12 }
];

export const HORIZON_YEARS = 5;

export function addMonths(input, months) {
  const d = date(input);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d;
}

function assumedTrip(member, preset, departure) {
  if (!preset.months) return null;
  const start = date(departure);
  const end = addMonths(start, preset.months);
  const existing = normalizeTrips(member.trips);
  if (existing.some((trip) => !trip.return)) throw new Error('现有记录里有一段还没填返加日；先补上返加日（或预计返加日），情景才能叠加');
  const clash = existing.find((trip) => trip.departure <= end && trip.return >= start);
  if (clash) throw new Error(`假设的离境 ${iso(start)} 至 ${iso(end)} 与已有行程 ${iso(clash.departure)} 至 ${iso(clash.return)} 重叠`);
  return { departure: iso(start), return: iso(end), exception: false, note: `情景假设：${preset.label}` };
}

// 逐日扫描 PR 五年窗口；用前缀和避免每天重算整段窗口。口径与 prMeasure 相同（测试里逐日对拍）。
export function firstPrBreach(input, horizonEnd) {
  const asOf = date(input.asOf);
  const prDate = date(input.prDate);
  const trips = normalizeTrips(input.trips);
  const windowYears = value('pr.window_years', asOf);
  const firstFiveYearEnd = addYears(prDate, windowYears);
  const scanFrom = firstFiveYearEnd > asOf ? firstFiveYearEnd : asOf;
  if (scanFrom > horizonEnd) return null;
  const origin = prDate < addYears(asOf, -windowYears) ? addDays(addYears(asOf, -windowYears), 0) : prDate;
  const span = Math.round((horizonEnd - origin) / 86400000) + 1;
  const cumulative = new Int32Array(span + 1);
  for (let index = 0; index < span; index += 1) {
    const day = addDays(origin, index);
    cumulative[index + 1] = cumulative[index] + (trips.some((trip) => isAbsentOn(day, trip)) ? 0 : 1);
  }
  const offset = (day) => Math.round((day - origin) / 86400000);
  for (let cursor = scanFrom; cursor <= horizonEnd; cursor = addDays(cursor, 1)) {
    const years = value('pr.window_years', cursor);
    const required = value('pr.required_days', cursor);
    const fiveYearAnniversary = addYears(prDate, years);
    const windowStart = cursor < fiveYearAnniversary ? prDate : addDays(addYears(cursor, -years), 1);
    const days = cumulative[offset(cursor) + 1] - cumulative[Math.max(0, offset(windowStart))];
    if (days < required) return { date: iso(cursor), days, required, windowStart: iso(windowStart) };
  }
  return null;
}

export function monthlyCalendar(input, months = HORIZON_YEARS * 12) {
  const asOf = date(input.asOf);
  const rows = [];
  for (let index = 0; index < months; index += 1) {
    const monthStart = new Date(Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth() + index, 1));
    const monthEnd = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0));
    const from = index === 0 ? asOf : monthStart;
    const total = Math.round((monthEnd - from) / 86400000) + 1;
    const present = presenceDays(from, monthEnd, input.trips);
    rows.push({ month: iso(monthStart).slice(0, 7), from: iso(from), to: iso(monthEnd), days: total, present, absent: total - present });
  }
  return rows;
}

export function buildScenarios(member, { asOf, departure, presets = SCENARIO_PRESETS } = {}) {
  if (!member?.prDate) throw new Error('情景比较需要 PR 日期');
  if (!asOf) throw new Error('缺少计算日');
  const trips = parseTripInput(member.trips || []);
  const needsDeparture = presets.some((preset) => preset.months);
  if (needsDeparture) {
    if (!departure) throw new Error('请填写假设的离境日');
    if (date(departure) <= date(asOf)) throw new Error('假设的离境日必须晚于计算日');
  }
  const horizonEnd = addYears(asOf, HORIZON_YEARS);
  return presets.map((preset) => {
    const trip = assumedTrip({ ...member, trips }, preset, departure);
    const input = { ...member, asOf, trips: trip ? [...trips, trip] : trips };
    const timeline = buildTimeline(input);
    const find = (prefix) => timeline.find((event) => event.label.startsWith(prefix))?.date ?? null;
    const prBreach = firstPrBreach(input, horizonEnd);
    const assumptions = [
      trip ? `${trip.departure} 离境、${trip.return} 返加（离境日与返加日都算在加拿大）` : '计算日之后不再离境',
      '已填的行程按原样计入；未来其余日子都假设在加拿大',
      '只看天数：入籍还要报税、语言与禁限条件，PR 例外与人道考量不在此计算'
    ];
    return {
      id: preset.id,
      label: preset.label,
      assumptions,
      trip,
      prThresholdDate: find('PR'),
      citizenshipDate: find('入籍'),
      citizenshipTodayMissing: citizenshipMeasure(input).missing,
      prBreach,
      calendar: monthlyCalendar(input)
    };
  });
}
