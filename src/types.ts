export type Screen = "onboarding" | "home" | "notif" | "modes" | "session" | "progress" | "board" | "recap" | "profile";
export type Goal = "new" | "revision" | "both";
export type SessionMode = "new" | "revision" | "weak";
export type ResultStatus = "solid" | "shaky" | "forgot" | "finished" | string;
export type CommunityMode = "solo" | "friends" | "class";

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
  freq: string;
  newRange: MemorisationRange;
  revisionRanges: SurahRange[];
  activeStartHour: number;
  activeEndHour: number;
  intensity: "light" | "balanced" | "intense";
  hoursOn: boolean;
  soundOn: boolean;
  sabaqOn: boolean;
  revisionOn: boolean;
  weakOn: boolean;
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
  sessionPhase: "idle" | "running" | "done";
  results: Record<string, ResultStatus>;
  notificationsScheduled: number;
  notificationPermission: string;
  communityMode: CommunityMode;
  reviewHistory: ReviewRecord[];
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
  revisionLoad: 20,
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
  intensity: "balanced",
  hoursOn: true,
  soundOn: true,
  sabaqOn: true,
  revisionOn: true,
  weakOn: true,
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
  sessionPhase: "idle",
  results: {},
  notificationsScheduled: 0,
  notificationPermission: "pending",
  communityMode: "solo",
  reviewHistory: []
};

