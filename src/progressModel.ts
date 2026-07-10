import { allSurahs } from "./surahs";
import { AppState, DailyPracticeStats, MemorisationRange, ResultStatus, ReviewRecord, WeakSpotQueueEntry } from "./types";

const MAX_PRACTICE_EVENTS = 5000;
const MAX_RECENT_HISTORY = 40;

export function localDateKey(date = new Date()) {
  return date.toDateString();
}

export function ayahId(surah: number, ayah: number) {
  return `${surah}:${ayah}`;
}

export function isWeakResult(result: ResultStatus) {
  return result === "shaky" || result === "forgot" || String(result).startsWith("stuck@");
}

export function isSecureResult(result: ResultStatus) {
  return result === "solid" || result === "finished";
}

export function allPracticeEvents(state: Pick<AppState, "practiceEvents" | "reviewHistory">) {
  return state.practiceEvents?.length ? state.practiceEvents : state.reviewHistory ?? [];
}

export function recentPracticeEvents(state: Pick<AppState, "practiceEvents" | "reviewHistory">, limit = 4) {
  return allPracticeEvents(state).slice(0, limit);
}

export function dailyStatsFor(state: Pick<AppState, "dailyStatsByDate">, date = new Date()): DailyPracticeStats {
  const dateKey = localDateKey(date);
  return (
    state.dailyStatsByDate?.[dateKey] ?? {
      dateKey,
      securedNewAyahs: [],
      revisedAyahs: 0,
      weakMarkedAyahs: []
    }
  );
}

export function buildProgressPatch(state: AppState, record: ReviewRecord): Partial<AppState> {
  const events = [record, ...allPracticeEvents(state)].slice(0, MAX_PRACTICE_EVENTS);
  const recent = [record, ...(state.reviewHistory ?? [])].slice(0, MAX_RECENT_HISTORY);
  const dailyStatsByDate = updateDailyStats(state, record);
  const weakSpotQueue = updateWeakQueue(state.weakSpotQueue ?? {}, record);
  const progressPatch = updateNewProgress(state, record);

  return {
    ...progressPatch,
    dailyStatsByDate,
    weakSpotQueue,
    practiceEvents: events,
    reviewHistory: recent
  };
}

export function buildRevisionCoveragePatch(state: AppState, coveredAyahs: number): Partial<AppState> {
  if (coveredAyahs <= 0) return {};
  const dateKey = localDateKey();
  const stats = dailyStatsFor(state);
  return {
    dailyStatsByDate: {
      ...(state.dailyStatsByDate ?? {}),
      [dateKey]: {
        ...stats,
        revisedAyahs: stats.revisedAyahs + coveredAyahs
      }
    }
  };
}

// Only āyāt whose review is actually due — drilling early re-tests short-term echo,
// not memory, so upcoming entries stay out of the deck until their time comes.
export function dueWeakEntries(state: Pick<AppState, "weakSpotQueue">, now = new Date()) {
  const nowTime = now.getTime();
  return Object.values(state.weakSpotQueue ?? {})
    .filter((entry) => entry.status !== "retired" && new Date(entry.nextDueAt).getTime() <= nowTime)
    .sort((a, b) => {
      const aDue = new Date(a.nextDueAt).getTime();
      const bDue = new Date(b.nextDueAt).getTime();
      return aDue - bDue || b.weaknessCount - a.weaknessCount;
    });
}

// Every weak āyah still being learned (due or scheduled), for browse lists and counts.
export function learningWeakEntries(state: Pick<AppState, "weakSpotQueue">) {
  return Object.values(state.weakSpotQueue ?? {})
    .filter((entry) => entry.status !== "retired")
    .sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());
}

export function yesterdayWeakEntries(state: Pick<AppState, "weakSpotQueue">, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Object.values(state.weakSpotQueue ?? {})
    .filter((entry) => {
      const time = new Date(entry.lastReviewedAt).getTime();
      return entry.status !== "retired" && time >= start && time < end;
    })
    .sort((a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime());
}

export function migratePracticeState(saved: Partial<AppState>): Partial<AppState> {
  const practiceEvents = saved.practiceEvents?.length ? saved.practiceEvents : saved.reviewHistory ?? [];
  const dailyStatsByDate = saved.dailyStatsByDate ?? deriveDailyStats(practiceEvents);
  const weakSpotQueue = saved.weakSpotQueue ?? deriveWeakQueue(practiceEvents);
  const newProgressBySurah = saved.newProgressBySurah ?? deriveNewProgress(saved, practiceEvents);
  const normalizedNewRange = normalizeNewRangeProgress(saved.newRange, newProgressBySurah);
  return {
    ...saved,
    newRange: normalizedNewRange ?? saved.newRange,
    practiceEvents,
    reviewHistory: (saved.reviewHistory?.length ? saved.reviewHistory : practiceEvents).slice(0, MAX_RECENT_HISTORY),
    dailyStatsByDate,
    weakSpotQueue,
    newProgressBySurah
  };
}

function updateDailyStats(state: AppState, record: ReviewRecord) {
  const dateKey = localDateKey(new Date(record.timestamp));
  const stats = state.dailyStatsByDate?.[dateKey] ?? {
    dateKey,
    securedNewAyahs: [],
    revisedAyahs: 0,
    weakMarkedAyahs: []
  };
  const secured = new Set(stats.securedNewAyahs);
  const weak = new Set(stats.weakMarkedAyahs);
  if (record.surah && record.ayah && record.mode === "new" && record.result === "solid") {
    secured.add(ayahId(record.surah, record.ayah));
  }
  if (record.surah && record.ayah && isWeakResult(record.result)) {
    weak.add(ayahId(record.surah, record.ayah));
  }
  const revised = record.mode === "revision" ? Math.max(0, record.coveredAyahs ?? 0) : 0;
  return {
    ...(state.dailyStatsByDate ?? {}),
    [dateKey]: {
      dateKey,
      securedNewAyahs: Array.from(secured),
      revisedAyahs: stats.revisedAyahs + revised,
      weakMarkedAyahs: Array.from(weak)
    }
  };
}

function updateWeakQueue(queue: Record<string, WeakSpotQueueEntry>, record: ReviewRecord) {
  if (!record.surah || !record.ayah) return queue;
  const key = ayahId(record.surah, record.ayah);
  const current = queue[key];
  if (!isWeakResult(record.result) && !isSecureResult(record.result)) return queue;
  const next = { ...queue };
  if (isWeakResult(record.result)) {
    const weaknessCount = (current?.weaknessCount ?? 0) + 1;
    const urgent = record.result === "forgot" || String(record.result).startsWith("stuck@") || weaknessCount > 1;
    next[key] = {
      ayahId: key,
      surah: record.surah,
      ayah: record.ayah,
      label: record.ayahLabel,
      weaknessCount,
      solidStreak: 0,
      lastReviewedAt: record.timestamp,
      nextDueAt: addTime(record.timestamp, urgent ? 8 : 24, "hours"),
      status: "due"
    };
    return next;
  }
  if (!current) return next;
  // A solid rep only advances the schedule when the āyah was actually due — nailing it
  // minutes after the slip (quiz, sabaq overlap, drilling ahead) measures short-term echo,
  // not memory, and would retire the āyah on false evidence.
  const wasDue = new Date(record.timestamp).getTime() >= new Date(current.nextDueAt).getTime();
  if (!wasDue) {
    next[key] = { ...current, lastReviewedAt: record.timestamp };
    return next;
  }
  const solidStreak = current.solidStreak + 1;
  const days = solidStreak >= 3 ? 7 : solidStreak === 2 ? 4 : 2;
  next[key] = {
    ...current,
    weaknessCount: Math.max(0, current.weaknessCount - 1),
    solidStreak,
    lastReviewedAt: record.timestamp,
    nextDueAt: addTime(record.timestamp, days, "days"),
    status: solidStreak >= 3 ? "retired" : "learning"
  };
  return next;
}

function updateNewProgress(state: AppState, record: ReviewRecord): Partial<AppState> {
  if (record.mode !== "new" || record.result !== "solid" || !record.surah || !record.ayah) return {};
  const currentStart = state.newProgressBySurah?.[String(record.surah)] ?? state.newRange.from ?? 1;
  const nextStart = Math.max(currentStart, record.ayah + 1);
  const newProgressBySurah = {
    ...(state.newProgressBySurah ?? {}),
    [String(record.surah)]: nextStart
  };
  if (surahNumberOf(state.newRange.surah) !== record.surah || nextStart === state.newRange.from) {
    return { newProgressBySurah };
  }
  const capped = Math.min(Math.max(1, nextStart), state.newRange.to + 1);
  return {
    newProgressBySurah,
    newRange: {
      ...state.newRange,
      from: capped,
      label: newStartLabel(state.newRange.surah, capped)
    },
    ayahFrom: capped
  };
}

function deriveDailyStats(events: ReviewRecord[]) {
  return events.reduce<Record<string, DailyPracticeStats>>((statsByDate, record) => {
    const dateKey = localDateKey(new Date(record.timestamp));
    const stats = statsByDate[dateKey] ?? { dateKey, securedNewAyahs: [], revisedAyahs: 0, weakMarkedAyahs: [] };
    const secured = new Set(stats.securedNewAyahs);
    const weak = new Set(stats.weakMarkedAyahs);
    if (record.surah && record.ayah && record.mode === "new" && record.result === "solid") secured.add(ayahId(record.surah, record.ayah));
    if (record.surah && record.ayah && isWeakResult(record.result)) weak.add(ayahId(record.surah, record.ayah));
    statsByDate[dateKey] = {
      dateKey,
      securedNewAyahs: Array.from(secured),
      revisedAyahs: stats.revisedAyahs + (record.mode === "revision" ? Math.max(0, record.coveredAyahs ?? 0) : 0),
      weakMarkedAyahs: Array.from(weak)
    };
    return statsByDate;
  }, {});
}

function deriveWeakQueue(events: ReviewRecord[]) {
  return events.slice().reverse().reduce<Record<string, WeakSpotQueueEntry>>((queue, record) => updateWeakQueue(queue, record), {});
}

function deriveNewProgress(saved: Partial<AppState>, events: ReviewRecord[]) {
  const progress: Record<string, number> = {};
  if (saved.newRange) progress[String(surahNumberOf(saved.newRange.surah))] = saved.newRange.from;
  events
    .slice()
    .reverse()
    .forEach((record) => {
      if (record.mode !== "new" || record.result !== "solid" || !record.surah || !record.ayah) return;
      progress[String(record.surah)] = Math.max(progress[String(record.surah)] ?? 1, record.ayah + 1);
    });
  return progress;
}

function normalizeNewRangeProgress(range: MemorisationRange | undefined, progress: Record<string, number>) {
  if (!range) return undefined;
  const surah = surahNumberOf(range.surah);
  const from = progress[String(surah)] ?? range.from;
  return { ...range, from, label: newStartLabel(range.surah, from) };
}

function newStartLabel(surah: string, from: number) {
  return from <= 1 ? `${surah} · from the start` : `${surah} · from āyah ${from}`;
}

function surahNumberOf(label: string) {
  return Number(label.match(/^\d+/)?.[0] ?? 0);
}

function addTime(timestamp: string, amount: number, unit: "hours" | "days") {
  const date = new Date(timestamp);
  date.setTime(date.getTime() + amount * (unit === "days" ? 24 : 1) * 60 * 60 * 1000);
  return date.toISOString();
}

export function memorisedCountFromProgress(range: MemorisationRange, progress: Record<string, number>) {
  const surah = surahNumberOf(range.surah);
  const total = allSurahs.find((item) => item.number === surah)?.ayahs ?? range.to;
  const next = progress[String(surah)] ?? range.from;
  return Math.min(total, Math.max(0, next - 1));
}
