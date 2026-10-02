import { calculateLedger, normalizeTrips, parseTripInput } from './day-ledger.mjs';

const MEMBER_FIELDS = ['id','name','citizenshipStatus','spouseId','claimAccompanying','prDate','temporaryStart','canadaStart','birthDate','province','trips'];

export function normalizeFamilyFile(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('家庭文件必须是 JSON 对象');
  const asOf = input.asOf;
  if (!asOf) throw new Error('家庭文件缺少 asOf 判断日');
  const sourceMembers = Array.isArray(input.members) ? input.members : [input];
  if (sourceMembers.length === 0) throw new Error('家庭文件至少要有一名成员');
  const members = sourceMembers.map((source, index) => {
    const member = Object.fromEntries(MEMBER_FIELDS.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]));
    member.id = member.id || `member-${index + 1}`;
    member.name = member.name || `成员 ${index + 1}`;
    member.citizenshipStatus = member.citizenshipStatus || 'pr';
    member.province = member.province || 'bc';
    member.claimAccompanying = Boolean(member.claimAccompanying);
    member.trips = parseTripInput(member.trips || []);
    return member;
  });
  const ids = new Set();
  for (const member of members) {
    if (ids.has(member.id)) throw new Error(`家庭成员 id 重复：${member.id}`);
    ids.add(member.id);
  }
  for (const member of members) if (member.spouseId && !ids.has(member.spouseId)) throw new Error(`${member.name} 的配偶 id 不在家庭文件中`);
  return { schemaVersion: 2, asOf, members };
}

export function serializeFamilyFile(input) {
  const family = normalizeFamilyFile(input);
  if (family.members.length > 1) return family;
  const member = family.members[0];
  const legacy = { ...member, asOf: family.asOf };
  delete legacy.id;
  delete legacy.name;
  if (!legacy.spouseId) delete legacy.spouseId;
  if (!legacy.claimAccompanying) delete legacy.claimAccompanying;
  return legacy;
}

function absenceBounds(trip) {
  const normalized = normalizeTrips([trip])[0];
  return { start: normalized.departure.valueOf(), end: normalized.return?.valueOf() ?? Infinity };
}

function covers(companionTrip, claimedTrip) {
  const companion = absenceBounds(companionTrip);
  const claimed = absenceBounds(claimedTrip);
  return companion.start <= claimed.start && companion.end >= claimed.end;
}

export function matchAccompanyingCitizen(member, members) {
  const markedTrips = member.trips.filter((trip) => trip.exception);
  if (markedTrips.length === 0) return [];
  const spouse = members.find((candidate) => candidate.id === member.spouseId);
  return markedTrips.map((trip) => {
    if (!member.claimAccompanying) return { trip, matched: false, reason: '未勾选主张陪同公民配偶例外' };
    if (!spouse) return { trip, matched: false, reason: '未在家庭文件中选择配偶' };
    if (spouse.citizenshipStatus !== 'citizen') return { trip, matched: false, reason: `${spouse.name} 未标为加拿大公民` };
    if (spouse.spouseId && spouse.spouseId !== member.id) return { trip, matched: false, reason: '配偶关系未在家庭内对上' };
    const companionTrip = spouse.trips.find((candidate) => covers(candidate, trip));
    if (!companionTrip) return { trip, matched: false, reason: '公民配偶的境外行程未覆盖该时段' };
    return { trip, matched: true, spouseId: spouse.id, spouseName: spouse.name, reason: '已与公民配偶的同期境外记录对上；仍只作证据标注' };
  });
}

export function calculateFamilyLedger(input) {
  const family = normalizeFamilyFile(input);
  return {
    ...family,
    results: family.members.map((member) => ({
      member,
      calculation: member.prDate ? calculateLedger({ ...member, asOf: family.asOf }) : null,
      accompanyingCitizen: matchAccompanyingCitizen(member, family.members)
    }))
  };
}
