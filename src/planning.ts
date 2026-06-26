import { buildRevisionDeck } from "./deck";
import { RevisionFlow } from "./data";
import { allSurahs, SurahInfo } from "./surahs";
import { AppState, Days, MemorisationRange, SurahRange } from "./types";

export function surahLabel(surah: SurahInfo) {
  return `${surah.number} · ${surah.english}`;
}

export function surahNumberFromLabel(label: string) {
  return Number(label.split("·")[0]?.trim()) || 1;
}

export function surahByLabel(label: string) {
  return allSurahs.find((surah) => surah.number === surahNumberFromLabel(label));
}

export function surahByNumber(number: number) {
  return allSurahs.find((surah) => surah.number === number);
}

export function surahAyahCount(label: string) {
  return surahByLabel(label)?.ayahs ?? 30;
}

// New memorisation is a single starting point — you keep going to the end.
export function newStartLabel(surah: string, from: number) {
  return from <= 1 ? `${surah} · from the start` : `${surah} · from āyah ${from}`;
}

export function makeNewRange(surah: SurahInfo, from: number): MemorisationRange {
  const label = surahLabel(surah);
  return { id: `new-${surah.number}`, surah: label, arabic: surah.arabic, from, to: surah.ayahs, label: newStartLabel(label, from) };
}

// Revision ranges span whole sūrahs (e.g. An-Naba → An-Nās), and can be disconnected.
export function surahRangeLabel(fromSurah: number, toSurah: number) {
  const from = surahByNumber(fromSurah);
  const to = surahByNumber(toSurah);
  if (!from || !to) return "Select a range";
  if (from.number === to.number) return `${from.number} · ${from.english}`;
  return `${from.english} → ${to.english}`;
}

export function makeSurahRange(fromSurah: number, toSurah: number, id: string): SurahRange {
  return { id, fromSurah, toSurah, label: surahRangeLabel(fromSurah, toSurah) };
}

export function rebalanceRevisionRanges(ranges: SurahRange[], id: string, fromSurah: number, toSurah: number) {
  const index = ranges.findIndex((range) => range.id === id);
  if (index < 0) return ranges;
  const start = Math.max(1, Math.min(114, Math.min(fromSurah, toSurah)));
  let end = Math.max(start, Math.min(114, Math.max(fromSurah, toSurah)));
  const nextRange = ranges[index + 1];
  if (nextRange) end = Math.min(end, Math.min(nextRange.fromSurah, nextRange.toSurah) - 1);
  end = Math.max(start, end);

  return ranges
    .map((range, rangeIndex) => {
      if (range.id === id) return makeSurahRange(start, end, id);
      if (rangeIndex < index && Math.max(range.fromSurah, range.toSurah) >= start) {
        const nextEnd = start - 1;
        if (nextEnd < Math.min(range.fromSurah, range.toSurah)) return null;
        return makeSurahRange(Math.min(range.fromSurah, range.toSurah), nextEnd, range.id);
      }
      if (rangeIndex > index && Math.min(range.fromSurah, range.toSurah) <= end) {
        const nextStart = end + 1;
        if (nextStart > Math.max(range.fromSurah, range.toSurah)) return null;
        return makeSurahRange(nextStart, Math.max(range.fromSurah, range.toSurah), range.id);
      }
      return range;
    })
    .filter(Boolean) as SurahRange[];
}

export function selectableSurahsForRange(ranges: SurahRange[], id: string, endpoint: "from" | "to") {
  const index = ranges.findIndex((range) => range.id === id);
  const range = ranges[index];
  if (!range) return allSurahs;
  if (endpoint === "from") {
    const previous = ranges[index - 1];
    const min = previous ? Math.min(114, Math.min(previous.fromSurah, previous.toSurah) + 1) : 1;
    const usedAfter = coveredSurahs(ranges.slice(index + 1));
    return allSurahs.filter((surah) => surah.number >= min && !usedAfter.has(surah.number));
  }
  const next = ranges[index + 1];
  const min = Math.min(range.fromSurah, range.toSurah);
  const max = next ? Math.min(next.fromSurah, next.toSurah) - 1 : 114;
  return allSurahs.filter((surah) => surah.number >= min && surah.number <= max);
}

// Sūrahs already claimed by other revision ranges (so we can prevent overlap).
export function coveredSurahs(ranges: SurahRange[], excludeId?: string) {
  const set = new Set<number>();
  ranges.forEach((range) => {
    if (range.id === excludeId) return;
    for (let s = Math.min(range.fromSurah, range.toSurah); s <= Math.max(range.fromSurah, range.toSurah); s += 1) set.add(s);
  });
  return set;
}

// Clamp a chosen [from,to] so it never overlaps another range; shrinks the end to the first taken sūrah.
export function clampSurahRange(from: number, to: number, ranges: SurahRange[], excludeId: string) {
  const covered = coveredSurahs(ranges, excludeId);
  let lo = Math.min(from, to);
  let hi = Math.max(from, to);
  while (lo <= 114 && covered.has(lo)) lo += 1;
  if (lo > 114) lo = Math.max(1, Math.min(from, to));
  hi = Math.max(hi, lo);
  for (let s = lo; s <= hi; s += 1) {
    if (covered.has(s)) {
      hi = s - 1;
      break;
    }
  }
  if (hi < lo) hi = lo;
  return { from: lo, to: hi };
}

// Add ranges in natural reading order: start with Al-Fatihah, then add the
// next unclaimed surah after the user's latest selected range.
export function nextFreeRange(ranges: SurahRange[]) {
  const covered = coveredSurahs(ranges);
  const furthestSelected = ranges.reduce((max, range) => Math.max(max, range.fromSurah, range.toSurah), 0);
  let lo = furthestSelected > 0 ? furthestSelected + 1 : 1;
  if (lo > 114 || covered.has(lo)) lo = 1;
  while (lo <= 114 && covered.has(lo)) lo += 1;
  if (lo > 114) return null;
  return { from: lo, to: lo };
}

// Total āyāt across the user's revision ranges, and how many remain in the current round.
export type RevisionRoundItem = {
  flow: RevisionFlow;
  index: number;
  status: "completed" | "current" | "remaining";
  doneAyahs: number;
  totalAyahs: number;
  startAyah: number;
};

export function revisionRoundItems(state: AppState): RevisionRoundItem[] {
  const deck = buildRevisionDeck(state.revisionRanges, state.arabicScript, state.revisionOrder);
  const idx = Math.min(Math.max(0, state.revisionProgressIndex), Math.max(0, deck.length - 1));
  const completed = state.revisionCompletedSurahs ?? {};
  return deck.map((flow, index) => {
    const totalAyahs = flow.passage.length;
    const key = String(flow.surah ?? index);
    const isCompleted = completed[key] || (state.revisionOrder !== "select" && index < idx);
    const rawStart = index === idx ? state.revisionProgressAyah || 1 : 1;
    const startAyah = Math.min(totalAyahs, Math.max(1, rawStart));
    const doneAyahs = isCompleted ? totalAyahs : index === idx ? Math.max(0, startAyah - 1) : 0;
    const status = isCompleted ? "completed" : index === idx ? "current" : "remaining";
    return { flow, index, status, doneAyahs, totalAyahs, startAyah };
  });
}

export function remainingRevisionRoundItems(state: AppState) {
  return revisionRoundItems(state).filter((item) => item.doneAyahs < item.totalAyahs);
}

export function revisionTotals(state: AppState) {
  const items = revisionRoundItems(state);
  const total = items.reduce((sum, item) => sum + item.totalAyahs, 0);
  const done = items.reduce((sum, item) => sum + item.doneAyahs, 0);
  const dailyTarget = Math.max(1, state.revisionLoad || recommendedRevisionAyat(state.revisionRanges, state.revisionRoundDays));
  const doneToday = state.revisionDoneDate === new Date().toDateString() ? state.revisionDoneToday ?? 0 : 0;
  const remainingToday = Math.max(0, dailyTarget - doneToday);
  const pct = total ? Math.round((done / total) * 100) : 0;
  return {
    total,
    done,
    remaining: Math.max(0, total - done),
    rounds: state.revisionRounds ?? 0,
    dailyTarget,
    doneToday,
    remainingToday,
    pct
  };
}

export function activeDayCount(days: Days) {
  return (Object.values(days) as boolean[]).filter(Boolean).length;
}

export function rangeAyahCount(range: SurahRange) {
  const from = Math.min(range.fromSurah, range.toSurah);
  const to = Math.max(range.fromSurah, range.toSurah);
  return allSurahs
    .filter((surah) => surah.number >= from && surah.number <= to)
    .reduce((total, surah) => total + surah.ayahs, 0);
}

export function knownRevisionAyahs(ranges: SurahRange[]) {
  return ranges.reduce((total, range) => total + rangeAyahCount(range), 0);
}

export function targetQuickValues(min: number, max: number) {
  const base = max <= 20 ? [1, 2, 3, 5, 10, 15, 20] : [5, 10, 15, 30, 45, 60, 100, 150, 200, 250, 300];
  return base.filter((value) => value >= min && value <= max);
}

export function surahStartOrdinal(surahNumber: number) {
  return allSurahs
    .filter((surah) => surah.number < surahNumber)
    .reduce((total, surah) => total + surah.ayahs, 0);
}

export function ayahOrdinal(surahNumber: number, ayahNumber: number) {
  return surahStartOrdinal(surahNumber) + ayahNumber;
}

export function juzPositionForLocation(surahNumber: number, ayahNumber: number) {
  const ordinal = ayahOrdinal(surahNumber, ayahNumber);
  const starts = juzStarts.map(([surah, ayah], index) => ({
    juz: index + 1,
    ordinal: ayahOrdinal(surah, ayah)
  }));
  const current = starts.reduce((best, start) => (start.ordinal <= ordinal ? start : best), starts[0]);
  const next = starts.find((start) => start.juz === current.juz + 1);
  if (!next) return 30;
  const span = Math.max(1, next.ordinal - current.ordinal);
  return current.juz + Math.max(0, Math.min(0.999, (ordinal - current.ordinal) / span));
}

export function estimatedJuzFromRanges(ranges: SurahRange[]) {
  return ranges.reduce((total, range) => {
    const from = Math.min(range.fromSurah, range.toSurah);
    const to = Math.max(range.fromSurah, range.toSurah);
    const toInfo = surahByNumber(to);
    if (!toInfo) return total;
    const start = juzPositionForLocation(from, 1);
    const end = juzPositionForLocation(to, toInfo.ayahs);
    return total + Math.max(0.25, end - start);
  }, 0);
}

export function formatQuarterJuz(value: number) {
  const rounded = Math.max(0.25, Math.round(value * 4) / 4);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.25$/, ".25").replace(/\.5$/, ".5").replace(/\.75$/, ".75");
}

export function recommendedRevisionAyat(ranges: SurahRange[], roundDays = 7) {
  const ayahs = knownRevisionAyahs(ranges);
  if (!ayahs) return 15;
  return Math.max(5, Math.round(ayahs / Math.max(1, roundDays) / 5) * 5);
}

export function revisionRecommendationText(ranges: SurahRange[], roundDays = 7) {
  const juz = estimatedJuzFromRanges(ranges);
  const dailyJuz = Math.max(0.25, juz / Math.max(1, roundDays));
  const roundedDailyJuz = dailyJuz >= 1 ? Math.round(dailyJuz * 2) / 2 : Math.round(dailyJuz * 4) / 4;
  return `Recommended: about ${formatQuarterJuz(roundedDailyJuz)} juz/day (${recommendedRevisionAyat(ranges, roundDays)} ayat/day) to finish ${formatQuarterJuz(juz)} juz in ${roundDays} days`;
}

export function recommendedNewAyat(range: MemorisationRange) {
  const remaining = Math.max(1, (surahAyahCount(range.surah) || range.to) - range.from + 1);
  if (remaining <= 20) return 2;
  if (remaining <= 80) return 3;
  return 5;
}

export const juzStarts = [
  [1, 1],
  [2, 142],
  [2, 253],
  [3, 93],
  [4, 24],
  [4, 148],
  [5, 82],
  [6, 111],
  [7, 88],
  [8, 41],
  [9, 93],
  [11, 6],
  [12, 53],
  [15, 1],
  [17, 1],
  [18, 75],
  [21, 1],
  [23, 1],
  [25, 21],
  [27, 56],
  [29, 46],
  [33, 31],
  [36, 28],
  [39, 32],
  [41, 47],
  [46, 1],
  [51, 31],
  [58, 1],
  [67, 1],
  [78, 1]
] as const;

export function juzForLocation(surah: number, ayah: number) {
  let current = 1;
  juzStarts.forEach(([startSurah, startAyah], index) => {
    if (surah > startSurah || (surah === startSurah && ayah >= startAyah)) current = index + 1;
  });
  return current;
}
