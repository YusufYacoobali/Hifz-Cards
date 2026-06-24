import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";
import { getDeck, isRevisionFlow } from "../deck";
import {
  cancelComebackReminder,
  maybeRequestNativeReviewEveryOtherDay,
  ReminderSettings,
  scheduleComebackReminder,
  scheduleHifzNotifications
} from "../native";
import { AppState, initialState, ResultStatus, ReviewRecord, Screen, SessionMode } from "../types";

const STORAGE_KEY = "hifz:app-state";

export function useHifzAppState() {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) return;
        const saved = JSON.parse(value) as Partial<AppState>;
        setState((current) => ({ ...current, ...saved, screen: saved.screen ?? current.screen }));
      })
      .finally(() => {
        setHydrated(true);
      });
  }, []);

  // Ask for a store review after ~2 minutes of use (still gated to every other day inside the helper).
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => maybeRequestNativeReviewEveryOtherDay(), 2 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    const { notificationsScheduled, notificationPermission, ...persistable } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(() => undefined);
  }, [hydrated, state]);

  const reminderSettings: ReminderSettings = {
    sabaqOn: state.sabaqOn,
    revisionOn: state.revisionOn,
    sabaqFreq: state.sabaqFreq,
    revisionFreq: state.revisionFreq,
    sabaqDays: state.sabaqDays,
    revisionDays: state.revisionDays,
    activeStartHour: state.activeStartHour,
    activeEndHour: state.activeEndHour,
    activeHoursMode: state.activeHoursMode,
    splitActiveHours: state.splitActiveHours,
    weekdayStartHour: state.weekdayStartHour,
    weekdayEndHour: state.weekdayEndHour,
    weekendStartHour: state.weekendStartHour,
    weekendEndHour: state.weekendEndHour,
    dailyActiveHours: state.dailyActiveHours,
    hoursOn: state.hoursOn,
    soundOn: state.soundOn,
    newRange: state.newRange,
    revisionRanges: state.revisionRanges,
    sabaqTargetId: state.sabaqTargetId,
    revisionTargetId: state.revisionTargetId,
    revisionProgressIndex: state.revisionProgressIndex,
    revisionProgressAyah: state.revisionProgressAyah,
    arabicScript: state.arabicScript,
    revisionOrder: state.revisionOrder
  };
  const settingsRef = useRef(reminderSettings);
  settingsRef.current = reminderSettings;

  // Fire a single reminder ~20 min after the user leaves the app; cancel it when they return.
  useEffect(() => {
    if (!hydrated) return;
    const subscription = RNAppState.addEventListener("change", (next) => {
      if (next === "background" || next === "inactive") {
        scheduleComebackReminder(settingsRef.current);
      } else if (next === "active") {
        cancelComebackReminder();
      }
    });
    return () => subscription.remove();
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    scheduleHifzNotifications(reminderSettings).then((result) => {
      setState((current) => ({
        ...current,
        notificationsScheduled: result.scheduled,
        notificationPermission: result.permission
      }));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hydrated,
    state.sabaqOn,
    state.revisionOn,
    state.sabaqFreq,
    state.revisionFreq,
    state.sabaqDays,
    state.revisionDays,
    state.activeStartHour,
    state.activeEndHour,
    state.activeHoursMode,
    state.splitActiveHours,
    state.weekdayStartHour,
    state.weekdayEndHour,
    state.weekendStartHour,
    state.weekendEndHour,
    state.dailyActiveHours,
    state.hoursOn,
    state.soundOn,
    state.newRange,
    state.revisionRanges,
    state.sabaqTargetId,
    state.revisionTargetId,
    state.revisionProgressIndex,
    state.revisionProgressAyah,
    state.arabicScript
  ]);

  useEffect(() => {
    if (!hydrated) return;

    const openNotification = (data: Record<string, unknown>) => {
      setState((current) => routeNotificationToState(current, data));
    };

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      openNotification(lastResponse.notification.request.content.data);
      Notifications.clearLastNotificationResponse();
    }

    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      openNotification(response.notification.request.content.data);
      Notifications.clearLastNotificationResponse();
    });

    return () => subscription.remove();
  }, [hydrated]);

  const patch = (next: Partial<AppState>) => setState((current) => ({ ...current, ...next }));
  const nav = (screen: Screen) => patch({ screen });
  const beginApp = () => patch({ screen: "home" });
  const deckContext = { newRange: state.newRange, revisionRanges: state.revisionRanges, history: state.reviewHistory, arabicScript: state.arabicScript, revisionOrder: state.revisionOrder };

  const startSession = (mode: SessionMode, startIndex?: number) => {
    const deck = getDeck(mode, deckContext);
    // When the user explicitly picks a sūrah ("I'll choose"), start there from āyah 1; otherwise resume.
    const picked = startIndex !== undefined;
    const revisionIndex = picked
      ? Math.min(Math.max(0, startIndex), Math.max(0, deck.length - 1))
      : Math.min(Math.max(0, state.revisionProgressIndex), Math.max(0, deck.length - 1));
    const revisionItem = deck[revisionIndex];
    const revisionEndAyah = isRevisionFlow(revisionItem) ? revisionItem.passage[revisionItem.passage.length - 1]?.num ?? 1 : 1;
    const revisionAyah = picked ? 1 : Math.min(revisionEndAyah, Math.max(1, state.revisionProgressAyah || 1));
    patch({
      screen: "session",
      sessionMode: mode,
      sessionPhase: "running",
      cardIndex: mode === "revision" ? revisionIndex : 0,
      revealed: false,
      revisionReadAyah: 0,
      revisionResumeAyah: mode === "revision" ? revisionAyah : 0,
      revisionProgressIndex: mode === "revision" ? revisionIndex : state.revisionProgressIndex,
      revisionProgressAyah: picked ? 1 : state.revisionProgressAyah,
      results: {}
    });
  };

  const surahNumberOf = (label: string) => Number(label.split("·")[0]?.trim()) || 0;
  const surahNameOf = (label: string) => label.split("·").slice(1).join("·").trim() || label;

  const advance = () => {
    const total = getDeck(state.sessionMode, deckContext).length;
    if (state.cardIndex >= total - 1) {
      patch({ sessionPhase: "done" });
      return;
    }
    patch({ cardIndex: state.cardIndex + 1, revealed: false, revisionReadAyah: 0, revisionResumeAyah: 0 });
  };

  const markCard = (status: ResultStatus) => {
    const deck = getDeck(state.sessionMode, deckContext);
    const item = deck[state.cardIndex];
    const surahNum = isRevisionFlow(item) ? item.surah ?? 0 : surahNumberOf(item.surah ?? "");
    const ayahNum = isRevisionFlow(item) ? item.start : item.num;
    const key = isRevisionFlow(item) ? `w${item.surah ?? item.start}` : `${item.surah ?? ""}:${item.num}`;
    const ayahLabel = isRevisionFlow(item)
      ? `${item.label} · start ${item.start}`
      : `${surahNameOf(item.surah ?? "Al-Mulk")} ${item.num}`;
    const record: ReviewRecord = {
      id: `${state.sessionMode}-${key}-${Date.now()}`,
      mode: state.sessionMode,
      ayahLabel,
      result: status,
      timestamp: new Date().toISOString(),
      surah: surahNum,
      ayah: ayahNum
    };
    const next: Partial<AppState> = {
      results: { ...state.results, [key]: status },
      reviewHistory: [record, ...(state.reviewHistory ?? [])].slice(0, 80)
    };
    if (isRevisionFlow(item) && status === "finished") {
      const wrapped = state.cardIndex >= deck.length - 1;
      next.revisionProgressIndex = wrapped ? 0 : state.cardIndex + 1;
      next.revisionProgressAyah = 1;
      if (wrapped) next.revisionRounds = (state.revisionRounds ?? 0) + 1;
      const flowEnd = item.passage[item.passage.length - 1]?.num ?? item.start;
      const resume = Math.max(item.start, state.revisionResumeAyah || item.start);
      Object.assign(next, dailyRevisionFields(state, flowEnd - resume + 1));
    }
    patch(next);
    setTimeout(advance, 120);
  };

  // Revision: user taps the āyah where they got stuck — enter "read" mode to practise it.
  const stopAtAyah = (surah: number, ayah: number) => {
    const covered = Math.max(1, ayah - (state.revisionResumeAyah || ayah));
    patch({
      revisionReadAyah: ayah,
      revisionResumeAyah: ayah,
      revisionProgressIndex: state.cardIndex,
      revisionProgressAyah: ayah,
      ...dailyRevisionFields(state, covered)
    });
  };

  // Add the āyah currently being practised to the weak deck (from the read-mode button).
  const addReadWeak = (surah: number, ayah: number, label: string) => {
    const key = `${surah}:${ayah}`;
    if (state.results[key]) return;
    const record: ReviewRecord = {
      id: `revision-${key}-${Date.now()}`,
      mode: "revision",
      ayahLabel: `${surahNameOf(label)} ${ayah}`,
      result: `stuck@${ayah}`,
      timestamp: new Date().toISOString(),
      surah,
      ayah
    };
    patch({
      results: { ...state.results, [key]: `stuck@${ayah}` },
      reviewHistory: [record, ...(state.reviewHistory ?? [])].slice(0, 80)
    });
  };

  // Revision read mode: after practising the missed āyah, return to the same revision flow.
  const resumeRevision = () => {
    patch({ revisionReadAyah: 0, revealed: true });
  };

  const showTabs = ["home", "progress", "board", "profile"].includes(state.screen);

  return {
    state,
    showTabs,
    patch,
    nav,
    beginApp,
    startSession,
    advance,
    markCard,
    stopAtAyah,
    addReadWeak,
    resumeRevision
  };
}

// Track āyāt revised today (resets when the calendar day changes).
function dailyRevisionFields(state: AppState, covered: number): Partial<AppState> {
  const today = new Date().toDateString();
  const base = state.revisionDoneDate === today ? state.revisionDoneToday : 0;
  return { revisionDoneDate: today, revisionDoneToday: base + Math.max(0, covered) };
}

function routeNotificationToState(current: AppState, data: Record<string, unknown>): AppState {
  const mode = parseNotificationMode(data.mode, data.screen);
  if (!mode) return current;

  const deckContext = {
    newRange: current.newRange,
    revisionRanges: current.revisionRanges,
    history: current.reviewHistory,
    arabicScript: current.arabicScript,
    revisionOrder: current.revisionOrder
  };
  const deck = getDeck(mode, deckContext);
  const surah = Number(data.surah) || 0;
  const ayah = Number(data.ayah) || 1;
  const payloadIndex = Number(data.cardIndex);
  let cardIndex = Number.isFinite(payloadIndex) ? payloadIndex : 0;
  let revisionResumeAyah = 0;
  let revisionProgressIndex = current.revisionProgressIndex;
  let revisionProgressAyah = current.revisionProgressAyah;

  if (mode === "revision") {
    const matched = deck.findIndex((item) => isRevisionFlow(item) && (!surah || item.surah === surah));
    cardIndex = matched >= 0 ? matched : Math.min(Math.max(0, cardIndex), Math.max(0, deck.length - 1));
    const item = deck[cardIndex];
    const start = isRevisionFlow(item) ? item.start : 1;
    revisionResumeAyah = Math.max(start, ayah);
    revisionProgressIndex = cardIndex;
    revisionProgressAyah = revisionResumeAyah;
  } else {
    const matched = deck.findIndex((item) => {
      if (isRevisionFlow(item)) return false;
      const cardSurah = surahNumberOf(item.surah ?? "");
      return item.num === ayah && (!surah || cardSurah === surah);
    });
    cardIndex = matched >= 0 ? matched : Math.min(Math.max(0, cardIndex), Math.max(0, deck.length - 1));
  }

  return {
    ...current,
    screen: "session",
    sessionMode: mode,
    sessionPhase: "running",
    cardIndex,
    revealed: mode === "revision",
    revisionReadAyah: 0,
    revisionResumeAyah,
    revisionProgressIndex,
    revisionProgressAyah,
    notificationAutoplaySurah: surah,
    notificationAutoplayAyah: ayah,
    results: {}
  };
}

function parseNotificationMode(mode: unknown, screen: unknown): SessionMode | null {
  if (mode === "new" || mode === "revision" || mode === "weak") return mode;
  if (typeof screen === "string") {
    const fromScreen = screen.replace("session:", "");
    if (fromScreen === "new" || fromScreen === "revision" || fromScreen === "weak") return fromScreen;
  }
  return null;
}

function surahNumberOf(label: string) {
  return Number(label.split("·")[0]?.trim()) || 0;
}
