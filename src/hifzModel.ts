import { leaderboard } from "./data";
import { ayahCard } from "./deck";
import { allPracticeEvents, dueWeakEntries, learningWeakEntries, memorisedCountFromProgress } from "./progressModel";
import { allSurahs } from "./surahs";
import { AppState, KhatmRecord, ReviewRecord, WeakSpotQueueEntry } from "./types";

export type ReviewMode = "new" | "revision" | "weak";
export type ReviewResult = "solid" | "shaky" | "forgot" | "finished";
export type MistakeType = "hesitation" | "wording" | "sequence" | "ending" | "none";

export type UserGoal = {
  id: string;
  type: "new" | "revision";
  surah: string;
  rangeLabel: string;
  fromAyah: number;
  toAyah: number;
  active: boolean;
};

export type ReminderSchedule = {
  id: string;
  type: "today" | "revision";
  frequency: string;
  activeHours: { from: number; to: number };
  enabled: boolean;
};

export type AyahCardModel = {
  id: string;
  surah: string;
  ayahNumber: number;
  text: string;
  prompt: string;
  translation?: string;
  audio?: string;
};

export type ReviewAttempt = {
  ayahId: string;
  mode: ReviewMode;
  result: ReviewResult;
  timestamp: string;
  mistakeType: MistakeType;
  gotStuckAtAyah?: number;
};

export type LiveReviewEntry = {
  mode: ReviewMode;
  result: string;
  ayahLabel: string;
  timestamp: string;
};

export type WeakSpot = {
  ayahId: string;
  weaknessScore: number;
  lastReviewedAt: string;
  nextDueAt: string;
};

export type LeaderboardEntry = {
  userId: string;
  name: string;
  weeklyPoints: number;
  streak: number;
  cardsCompleted: number;
  revisionPoints: number;
  initial: string;
  color: string;
};

export const leaderboardEntries: LeaderboardEntry[] = leaderboard.map((entry, index) => ({
  userId: entry.name.toLowerCase(),
  name: entry.name,
  weeklyPoints: entry.pts,
  revisionPoints: Math.max(20, entry.pts - 18 - index * 3),
  streak: entry.streak,
  cardsCompleted: entry.cards,
  initial: entry.initial,
  color: entry.color
}));

export function ayahLabel(ayahId: string) {
  const [, ayah] = ayahId.split(":");
  return `Al-Mulk ${ayah}`;
}

function getAllAttempts(history: ReviewRecord[] = []) {
  const liveAttempts: ReviewAttempt[] = history.map((entry) => ({
    ayahId: `${entry.surah ?? 67}:${entry.ayah ?? extractAyahNumber(entry.ayahLabel)}`,
    mode: normalizeMode(entry.mode),
    result: normalizeResult(entry.result),
    timestamp: entry.timestamp,
    mistakeType: mistakeFromResult(entry.result),
    gotStuckAtAyah: entry.result.startsWith("stuck@") ? Number(entry.result.replace("stuck@", "")) : undefined
  }));

  return liveAttempts;
}

function normalizeMode(mode: ReviewRecord["mode"]): ReviewMode {
  if (mode === "yesterdayWeak" || mode === "quiz") return "weak";
  if (mode === "recent") return "revision";
  return mode;
}

function extractAyahNumber(label: string) {
  const explicit = label.match(/Al-Mulk\s+(\d+)/i)?.[1];
  if (explicit) return Number(explicit);
  const start = label.match(/start\s+(\d+)/i)?.[1];
  if (start) return Number(start);
  return 12;
}

function normalizeResult(result: string): ReviewResult {
  if (result === "solid" || result === "shaky" || result === "forgot" || result === "finished") return result;
  if (result.startsWith("stuck@")) return "forgot";
  return "shaky";
}

function mistakeFromResult(result: string): MistakeType {
  if (result === "solid" || result === "finished") return "none";
  if (result.startsWith("stuck@")) return "sequence";
  if (result === "forgot") return "ending";
  return "hesitation";
}

function dayStart(value: string | number | Date) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function inWindow(timestamp: string, start: number, end = Date.now()) {
  const time = new Date(timestamp).getTime();
  return Number.isFinite(time) && time >= start && time <= end;
}

function surahAyahCount(number?: number) {
  return allSurahs.find((surah) => surah.number === number)?.ayahs ?? 1;
}

function inferredRevisionAyahs(record: ReviewRecord) {
  if (record.mode === "new") return 0;
  if (typeof record.coveredAyahs === "number") return Math.max(0, record.coveredAyahs);
  if (record.result === "finished") {
    const total = surahAyahCount(record.surah);
    if (record.ayahLabel.toLowerCase().includes("completed")) return total;
    return Math.max(1, total - (record.ayah ?? 1) + 1);
  }
  return 1;
}

function periodRevisionAyahs(periodHistory: ReviewRecord[], khatms: KhatmRecord[] = [], start: number, end = Date.now()) {
  const historyTotal = periodHistory.reduce((sum, record) => sum + inferredRevisionAyahs(record), 0);
  const khatmTotal = khatms
    .filter((khatm) => inWindow(khatm.completedAt, start, end))
    .reduce((sum, khatm) => sum + Math.max(0, khatm.total || 0), 0);
  return Math.max(historyTotal, khatmTotal);
}

function computeStreak(history: ReviewRecord[]) {
  if (!history.length) return 0;
  const days = new Set(history.map((record) => dayStart(record.timestamp)));
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  if (!days.has(cursor.getTime())) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.getTime())) return 0;
  }
  let streak = 0;
  while (days.has(cursor.getTime())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// Mon→Sun activity for the current week, derived from the review journal.
function weekActivity(history: ReviewRecord[]) {
  const now = new Date();
  const mondayOffset = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(now.getDate() - mondayOffset);
  return Array.from({ length: 7 }, (_, index) => {
    const start = new Date(monday);
    start.setDate(monday.getDate() + index);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return history.some((record) => {
      const time = new Date(record.timestamp).getTime();
      return time >= start.getTime() && time < end.getTime();
    });
  });
}

function freqMinutes(value: string) {
  if (value.includes("20")) return 20;
  if (value.includes("30")) return 30;
  if (value.includes("1 hour")) return 60;
  if (value.includes("2")) return 120;
  if (value.includes("3")) return 180;
  if (value.includes("6")) return 360;
  if (value.toLowerCase().includes("hour")) return 60;
  return 24 * 60;
}

function formatClock(minuteOfDay: number) {
  const hour = Math.floor(minuteOfDay / 60) % 24;
  const minute = minuteOfDay % 60;
  const suffix = hour < 12 ? "am" : "pm";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:${String(minute).padStart(2, "0")} ${suffix}`;
}

// Next reminder time computed from the live schedule (no OS round-trip needed).
function nextPrompt(state: AppState) {
  const freqs: number[] = [];
  if (state.sabaqOn) freqs.push(freqMinutes(state.sabaqFreq));
  if (state.revisionOn) freqs.push(freqMinutes(state.revisionFreq));
  if (!freqs.length) return { time: "Off", inLabel: "no reminders on" };
  const step = Math.min(...freqs);
  const now = new Date();
  const dayKeys = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
  const day = dayKeys[now.getDay()];
  const mode = state.activeHoursMode ?? (state.splitActiveHours ? "weekend" : "same");
  const weekend = day === "Sat" || day === "Sun";
  const startHour = !state.hoursOn
    ? 7
    : mode === "daily"
      ? state.dailyActiveHours?.[day]?.start ?? state.activeStartHour
      : mode === "weekend"
        ? weekend
          ? state.weekendStartHour
          : state.weekdayStartHour
        : state.activeStartHour;
  const endHour = !state.hoursOn
    ? 22
    : mode === "daily"
      ? state.dailyActiveHours?.[day]?.end ?? state.activeEndHour
      : mode === "weekend"
        ? weekend
          ? state.weekendEndHour
          : state.weekdayEndHour
        : state.activeEndHour;
  const startMin = startHour * 60;
  const endMin = endHour * 60;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let nextMin: number;
  if (nowMin < startMin) nextMin = startMin;
  else if (nowMin >= endMin) nextMin = startMin + 24 * 60;
  else {
    nextMin = Math.ceil((nowMin + 1) / step) * step;
    if (nextMin > endMin) nextMin = startMin + 24 * 60;
  }
  const diff = Math.max(1, nextMin - nowMin);
  return {
    time: formatClock(nextMin % (24 * 60)),
    inLabel: diff < 60 ? `in ${diff} min` : `in ${Math.round(diff / 60)} hr`
  };
}

export function getDashboardStats(state: AppState) {
  const history = allPracticeEvents(state);
  const newRange = state.newRange;
  const surahNumber = Number(newRange.surah.split("·")[0]?.trim()) || 67;
  const surahInfo = allSurahs.find((surah) => surah.number === surahNumber);
  const totalInRange = surahInfo?.ayahs ?? 30;
  const englishName = newRange.surah.split("·").slice(1).join("·").trim() || "Al-Mulk";

  const dueWeak = dueWeakEntries({ weakSpotQueue: state.weakSpotQueue ?? {} });
  const scheduledWeakCount = Math.max(0, learningWeakEntries({ weakSpotQueue: state.weakSpotQueue ?? {} }).length - dueWeak.length);

  const securedCount = memorisedCountFromProgress(newRange, state.newProgressBySurah ?? {});
  const memorisedPercent = totalInRange ? Math.round((securedCount / totalInRange) * 100) : 0;
  const weeklyDays = weekActivity(history);
  const prompt = nextPrompt(state);
  const weakLabels = dueWeak.slice(0, 4).map((entry) => `${entry.surah}:${entry.ayah}`);

  return {
    currentSurah: `Sūrah ${englishName}`,
    currentArabic: newRange.arabic,
    rangeLabel: (newRange.from || 1) <= 1 ? "from the start" : `from āyah ${newRange.from}`,
    memorisedPercent,
    securedCount,
    totalInRange,
    nextNotification: prompt.time,
    nextNotificationIn: prompt.inLabel,
    streak: computeStreak(history),
    weakCount: dueWeak.length,
    scheduledWeakCount,
    weakAyahs: weakLabels.length ? weakLabels.join(", ") : "none marked yet",
    completedCards: history.length,
    weeklyDays,
    weeklyCompletedDays: weeklyDays.filter(Boolean).length
  };
}

function getWeakSpotCardsFromQueue(queue: Record<string, WeakSpotQueueEntry> = {}) {
  return dueWeakEntries({ weakSpotQueue: queue })
    .map((entry) => {
      const built = ayahCard(entry.surah, entry.ayah);
      return {
        ayahId: entry.ayahId,
        weaknessScore: Math.min(99, 35 + entry.weaknessCount * 15),
        lastReviewedAt: entry.lastReviewedAt,
        nextDueAt: entry.nextDueAt,
        card: {
          id: entry.ayahId,
          surah: built.surah ?? `Surah ${entry.surah}`,
          ayahNumber: built.num,
          text: built.full,
          prompt: built.prompt,
          translation: built.tr
        }
      };
    })
    .sort((a, b) => b.weaknessScore - a.weaknessScore);
}
export function getProgressStats(history: ReviewRecord[] = [], weakSpotQueue: Record<string, WeakSpotQueueEntry> = {}) {
  const attempts = getAllAttempts(history);
  const easy = attempts.filter((attempt) => attempt.result === "solid" || attempt.result === "finished").length;
  const weak = attempts.filter((attempt) => attempt.result === "shaky" || Boolean(attempt.gotStuckAtAyah)).length;
  const failed = attempts.filter((attempt) => attempt.result === "forgot" && !attempt.gotStuckAtAyah).length;
  const total = easy + weak + failed;
  const memorisedPercent = total ? Math.min(100, Math.round((easy / total) * 100)) : 0;
  const revisionPercent = total ? Math.min(100, Math.round(((easy + weak * 0.45) / total) * 100)) : 0;
  const latestByAyah = new Map<string, ReviewAttempt>();
  attempts.forEach((attempt) => latestByAyah.set(attempt.ayahId, attempt));
  const ayahMap = Array.from(latestByAyah.values())
    .sort((a, b) => {
      const [aSurah, aAyah] = a.ayahId.split(":").map(Number);
      const [bSurah, bAyah] = b.ayahId.split(":").map(Number);
      return aSurah - bSurah || aAyah - bAyah;
    })
    .slice(-36)
    .map((attempt) => ({
      label: attempt.ayahId,
      status: attempt.result === "solid" || attempt.result === "finished" ? "solid" : attempt.result === "forgot" ? "failed" : "weak"
    }));

  return {
    memorisedPercent,
    revisionPercent,
    easy,
    weak,
    failed,
    weakSpots: getWeakSpotCardsFromQueue(weakSpotQueue),
    ayahMap
  };
}

function getPeriodRecap(history: ReviewRecord[] = [], periodHistory: ReviewRecord[], requiredActiveDays: number, start: number, khatms: KhatmRecord[] = []) {
  const attempts = getAllAttempts(periodHistory);
  const weakByAyah = new Set<string>();
  let weakImproved = 0;
  history.slice().reverse().forEach((entry) => {
    const ayahId = `${entry.surah ?? 67}:${entry.ayah ?? extractAyahNumber(entry.ayahLabel)}`;
    if (entry.result === "shaky" || entry.result === "forgot" || String(entry.result).startsWith("stuck@")) weakByAyah.add(ayahId);
    if ((entry.result === "solid" || entry.result === "finished") && weakByAyah.has(ayahId)) {
      weakImproved += 1;
      weakByAyah.delete(ayahId);
    }
  });
  const weakest = attempts.find((attempt) => attempt.result === "forgot" || attempt.result === "shaky" || attempt.gotStuckAtAyah);
  const strongest = attempts.find((attempt) => attempt.result === "solid" || attempt.result === "finished");

  return {
    cardsTested: periodHistory.length,
    ayahsRevised: periodRevisionAyahs(periodHistory, khatms, start),
    newMemorised: periodHistory.filter((entry) => entry.mode === "new" && (entry.result === "solid" || entry.result === "finished")).length,
    effortPoints: attempts.reduce((sum, attempt) => sum + (attempt.result === "solid" || attempt.result === "finished" ? 3 : 1), 0),
    strongestRange: strongest ? strongest.ayahId : "No solid marks yet",
    weakestRange: weakest ? weakest.ayahId : "No weak marks yet",
    improved: `${weakImproved} weak cards turned solid`,
    activeDays: new Set(periodHistory.map((entry) => dayStart(entry.timestamp))).size,
    streakMaintained: periodHistory.length > 0 && new Set(periodHistory.map((entry) => dayStart(entry.timestamp))).size >= requiredActiveDays
  };
}

export function getWeeklyRecap(history: ReviewRecord[] = [], khatms: KhatmRecord[] = []) {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weekHistory = history.filter((entry) => new Date(entry.timestamp).getTime() >= weekAgo);
  return getPeriodRecap(history, weekHistory, 7, weekAgo, khatms);
}

export function getMonthlyRecap(history: ReviewRecord[] = [], khatms: KhatmRecord[] = []) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthHistory = history.filter((entry) => new Date(entry.timestamp).getTime() >= monthStart);
  const daysSoFar = now.getDate();
  return getPeriodRecap(history, monthHistory, Math.min(daysSoFar, 24), monthStart, khatms);
}
