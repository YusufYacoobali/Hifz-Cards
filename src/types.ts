export type Screen = "onboarding" | "home" | "notif" | "modes" | "session" | "progress" | "board" | "recap" | "profile" | "khatms";

export type KhatmRecord = {
  id: string;
  completedAt: string;
  weak: number;
  total: number;
  weakAyahs?: Array<{ surah: number; ayah: number; label: string }>;
};
export type Goal = "new" | "revision" | "both";
export type SessionMode = "new" | "revision" | "weak";
export type ResultStatus = "solid" | "shaky" | "forgot" | "finished" | string;
export type CommunityMode = "solo" | "friends" | "class";
export type ActiveHoursMode = "same" | "weekend" | "daily";
export type ArabicScript = "uthmani" | "indopak";
export type ArabicSize = "small" | "medium" | "large";
export type RevisionOrder = "forward" | "backward";

export const arabicSizeScale: Record<ArabicSize, number> = { small: 0.85, medium: 1, large: 1.2 };

export type ReviewRecord = {
  id: string;
  mode: SessionMode;
  ayahLabel: string;
  result: ResultStatus;
  timestamp: string;
  surah?: number;
  ayah?: number;
};

export type Days = {
  Mon: boolean;
  Tue: boolean;
  Wed: boolean;
  Thu: boolean;
  Fri: boolean;
  Sat: boolean;
  Sun: boolean;
};

export type DailyActiveHours = Record<keyof Days, { start: number; end: number }>;

export type MemorisationRange = {
  id: string;
  label: string;
  surah: string;
  arabic: string;
  from: number;
  to: number;
};

// A contiguous block of whole sūrahs the user already knows (e.g. An-Naba → An-Nās).
export type SurahRange = {
  id: string;
  fromSurah: number;
  toSurah: number;
  label: string;
};

export type AppState = {
  screen: Screen;
  onbStep: number;
  goal: Goal;
  ayahFrom: number;
  ayahTo: number;
  perDay: number;
  knownUpTo: number;
  revisionLoad: number;
  revisionRoundDays: number;
  freq: string;
  newRange: MemorisationRange;
  revisionRanges: SurahRange[];
  activeStartHour: number;
  activeEndHour: number;
  activeHoursMode: ActiveHoursMode;
  splitActiveHours: boolean;
  weekdayStartHour: number;
  weekdayEndHour: number;
  weekendStartHour: number;
  weekendEndHour: number;
  dailyActiveHours: DailyActiveHours;
  hoursOn: boolean;
  soundOn: boolean;
  sabaqOn: boolean;
  revisionOn: boolean;
  sabaqFreq: string;
  revisionFreq: string;
  sabaqDays: Days;
  revisionDays: Days;
  sabaqTargetId: string;
  revisionTargetId: string;
  boardTab: "friends" | "class";
  sessionMode: SessionMode;
  cardIndex: number;
  revealed: boolean;
  revisionReadAyah: number;
  revisionResumeAyah: number;
  revisionProgressIndex: number;
  revisionProgressAyah: number;
  revisionCompletedSurahs: Record<string, boolean>;
  revisionRounds: number;
  revisionOrder: RevisionOrder;
  revisionDoneToday: number;
  revisionDoneDate: string;
  khatms: KhatmRecord[];
  sessionPhase: "idle" | "running" | "done";
  results: Record<string, ResultStatus>;
  notificationsScheduled: number;
  notificationPermission: string;
  notificationAutoplaySurah: number;
  notificationAutoplayAyah: number;
  communityMode: CommunityMode;
  reviewHistory: ReviewRecord[];
  reciterId: string;
  arabicScript: ArabicScript;
  arabicSize: ArabicSize;
};

export const weekdays: Days = { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false };
export const everyDay: Days = { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: true };

export const initialState: AppState = {
  screen: "onboarding",
  onbStep: 0,
  goal: "new",
  ayahFrom: 1,
  ayahTo: 30,
  perDay: 3,
  knownUpTo: 11,
  revisionLoad: 5,
  revisionRoundDays: 7,
  freq: "30 min",
  newRange: {
    id: "new-67",
    label: "67 · Al-Mulk · from the start",
    surah: "67 · Al-Mulk",
    arabic: "الملك",
    from: 1,
    to: 30
  },
  revisionRanges: [
    {
      id: "rev-default",
      fromSurah: 1,
      toSurah: 1,
      label: "1 · Al-Fatihah"
    }
  ],
  activeStartHour: 6,
  activeEndHour: 21,
  activeHoursMode: "same",
  splitActiveHours: false,
  weekdayStartHour: 6,
  weekdayEndHour: 22,
  weekendStartHour: 8,
  weekendEndHour: 24,
  dailyActiveHours: {
    Mon: { start: 6, end: 22 },
    Tue: { start: 6, end: 22 },
    Wed: { start: 6, end: 22 },
    Thu: { start: 6, end: 22 },
    Fri: { start: 6, end: 22 },
    Sat: { start: 8, end: 24 },
    Sun: { start: 8, end: 24 }
  },
  hoursOn: true,
  soundOn: true,
  sabaqOn: true,
  revisionOn: true,
  sabaqFreq: "30 min",
  revisionFreq: "daily",
  sabaqDays: weekdays,
  revisionDays: everyDay,
  sabaqTargetId: "new-67",
  revisionTargetId: "rev-default",
  boardTab: "friends",
  sessionMode: "new",
  cardIndex: 0,
  revealed: false,
  revisionReadAyah: 0,
  revisionResumeAyah: 0,
  revisionProgressIndex: 0,
  revisionProgressAyah: 1,
  revisionCompletedSurahs: {},
  revisionRounds: 0,
  revisionOrder: "forward",
  revisionDoneToday: 0,
  revisionDoneDate: "",
  khatms: [],
  sessionPhase: "idle",
  results: {},
  notificationsScheduled: 0,
  notificationPermission: "pending",
  notificationAutoplaySurah: 0,
  notificationAutoplayAyah: 0,
  communityMode: "solo",
  reviewHistory: [],
  reciterId: "alafasy",
  arabicScript: "uthmani",
  arabicSize: "medium"
};
