import { cards, leaderboard, newDeck, weakDeck } from "./data";
import { allSurahs } from "./surahs";
import { AppState, ReviewRecord } from "./types";

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

export const ayahCards: AyahCardModel[] = cards.map((card) => ({
  id: `67:${card.num}`,
  surah: "Al-Mulk",
  ayahNumber: card.num,
  text: card.full,
  prompt: card.prompt,
  translation: card.tr
}));

export const reviewAttempts: ReviewAttempt[] = [
  { ayahId: "67:12", mode: "revision", result: "solid", timestamp: "2026-06-15T08:10:00.000Z", mistakeType: "none" },
  { ayahId: "67:13", mode: "revision", result: "solid", timestamp: "2026-06-15T08:14:00.000Z", mistakeType: "none" },
  { ayahId: "67:14", mode: "weak", result: "shaky", timestamp: "2026-06-16T13:35:00.000Z", mistakeType: "hesitation" },
  { ayahId: "67:16", mode: "weak", result: "shaky", timestamp: "2026-06-17T17:20:00.000Z", mistakeType: "wording" },
  { ayahId: "67:17", mode: "weak", result: "forgot", timestamp: "2026-06-18T11:05:00.000Z", mistakeType: "sequence" },
  { ayahId: "67:19", mode: "weak", result: "forgot", timestamp: "2026-06-19T18:45:00.000Z", mistakeType: "ending" },
  { ayahId: "67:20", mode: "new", result: "shaky", timestamp: "2026-06-20T07:30:00.000Z", mistakeType: "hesitation" },
  { ayahId: "67:21", mode: "new", result: "shaky", timestamp: "2026-06-20T12:20:00.000Z", mistakeType: "wording" },
  { ayahId: "67:22", mode: "new", result: "solid", timestamp: "2026-06-21T09:00:00.000Z", mistakeType: "none" }
];

export const weakSpots: WeakSpot[] = [
  { ayahId: "67:17", weaknessScore: 92, lastReviewedAt: "2026-06-18T11:05:00.000Z", nextDueAt: "2026-06-21T16:00:00.000Z" },
  { ayahId: "67:19", weaknessScore: 86, lastReviewedAt: "2026-06-19T18:45:00.000Z", nextDueAt: "2026-06-21T18:00:00.000Z" },
  { ayahId: "67:14", weaknessScore: 68, lastReviewedAt: "2026-06-16T13:35:00.000Z", nextDueAt: "2026-06-22T08:00:00.000Z" },
  { ayahId: "67:16", weaknessScore: 61, lastReviewedAt: "2026-06-17T17:20:00.000Z", nextDueAt: "2026-06-22T10:00:00.000Z" },
  { ayahId: "67:20", weaknessScore: 54, lastReviewedAt: "2026-06-20T07:30:00.000Z", nextDueAt: "2026-06-22T12:00:00.000Z" },
  { ayahId: "67:21", weaknessScore: 49, lastReviewedAt: "2026-06-20T12:20:00.000Z", nextDueAt: "2026-06-22T14:00:00.000Z" }
];

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

export function getWeakSpotCards() {
  return weakSpots
    .map((weakSpot) => {
      const card = ayahCards.find((ayah) => ayah.id === weakSpot.ayahId);
      return card ? { ...weakSpot, card } : null;
    })
    .filter(Boolean) as Array<WeakSpot & { card: AyahCardModel }>;
}

function getAllAttempts(history: LiveReviewEntry[] = []) {
  const liveAttempts: ReviewAttempt[] = history.map((entry) => ({
    ayahId: `67:${extractAyahNumber(entry.ayahLabel)}`,
    mode: entry.mode,
    result: normalizeResult(entry.result),
    timestamp: entry.timestamp,
    mistakeType: mistakeFromResult(entry.result),
    gotStuckAtAyah: entry.result.startsWith("stuck@") ? Number(entry.result.replace("stuck@", "")) : undefined
  }));

  return [...liveAttempts, ...reviewAttempts];
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

function trailingNumber(label: string) {
  const match = label.match(/(\d+)\s*$/);
  return match ? Number(match[1]) : undefined;
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
  const startMin = (state.hoursOn ? state.activeStartHour : 7) * 60;
  const endMin = (state.hoursOn ? state.activeEndHour : 22) * 60;
  const now = new Date();
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
  const history = state.reviewHistory ?? [];
  const newRange = state.newRange;
  const surahNumber = Number(newRange.surah.split("·")[0]?.trim()) || 67;
  const surahInfo = allSurahs.find((surah) => surah.number === surahNumber);
  const totalInRange = surahInfo?.ayahs ?? 30;
  const englishName = newRange.surah.split("·").slice(1).join("·").trim() || "Al-Mulk";

  const solidAyahs = new Set<number>();
  const weakAyahs = new Set<number>();
  history.forEach((record) => {
    if (!record.ayahLabel.includes(englishName)) return;
    const ayahNumber = trailingNumber(record.ayahLabel);
    if (!ayahNumber) return;
    if (record.result === "solid" || record.result === "finished") solidAyahs.add(ayahNumber);
    else if (record.result === "shaky" || record.result === "forgot" || String(record.result).startsWith("stuck@")) {
      weakAyahs.add(ayahNumber);
    }
  });

  const priorKnown = Math.max(0, (newRange.from || 1) - 1);
  const securedCount = Math.min(totalInRange, priorKnown + solidAyahs.size);
  const memorisedPercent = totalInRange ? Math.round((securedCount / totalInRange) * 100) : 0;
  const weeklyDays = weekActivity(history);
  const prompt = nextPrompt(state);
  const sortedWeak = Array.from(weakAyahs).sort((a, b) => a - b);

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
    weakCount: sortedWeak.length,
    weakAyahs: sortedWeak.length ? sortedWeak.join(", ") : "none marked yet",
    completedCards: history.length,
    weeklyDays,
    weeklyCompletedDays: weeklyDays.filter(Boolean).length
  };
}

export function getProgressStats(history: LiveReviewEntry[] = []) {
  const attempts = getAllAttempts(history);
  const easy = attempts.filter((attempt) => attempt.result === "solid" || attempt.result === "finished").length + 31;
  const weak = attempts.filter((attempt) => attempt.result === "shaky").length + 7;
  const failed = attempts.filter((attempt) => attempt.result === "forgot").length + 2;
  const total = easy + weak + failed;
  const memorisedPercent = Math.min(100, Math.round((easy / total) * 100));
  const revisionPercent = Math.min(100, Math.round(((easy + weak * 0.45) / total) * 100));

  return {
    memorisedPercent,
    revisionPercent,
    easy,
    weak,
    failed,
    weakSpots: getWeakSpotCards(),
    ayahMap: [
      { label: "12", status: "solid" },
      { label: "13", status: "solid" },
      { label: "14", status: "weak" },
      { label: "15", status: "solid" },
      { label: "16", status: "weak" },
      { label: "17", status: "failed" },
      { label: "18", status: "solid" },
      { label: "19", status: "failed" },
      { label: "20", status: "weak" },
      { label: "21", status: "weak" },
      { label: "22", status: "solid" },
      { label: "+", status: "empty" }
    ]
  };
}

export function getWeeklyRecap(history: LiveReviewEntry[] = []) {
  const attempts = getAllAttempts(history);
  const liveCount = history.length;
  const weakImproved = attempts.filter((attempt) => attempt.result === "solid" && weakSpots.some((spot) => spot.ayahId === attempt.ayahId)).length;

  return {
    cardsTested: 84 + liveCount,
    ayahsRevised: 320 + history.filter((entry) => entry.mode !== "new").length,
    newMemorised: newDeck.length,
    effortPoints: 91 + liveCount * 2,
    strongestRange: "Āyāt 12-15",
    weakestRange: "Āyāt 17 & 19",
    improved: `${12 + weakImproved} weak cards turned solid`,
    streakMaintained: true
  };
}

export function getNextRevisionStart() {
  const dueWeak = getWeakSpotCards()[0];
  if (dueWeak) return dueWeak.card.ayahNumber;
  return weakDeck[0]?.num ?? 12;
}

