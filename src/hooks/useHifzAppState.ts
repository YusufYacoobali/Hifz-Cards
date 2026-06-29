import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { AppState as RNAppState } from "react-native";
import { buildDeckContext, buildReminderSettings, serializableState, shouldShowTabs } from "../appStateSelectors";
import { buildQuizDeck, getDeck, isRevisionFlow, PracticeItem } from "../deck";
import {
  cancelComebackReminder,
  maybeRequestNativeReviewEveryOtherDay,
  scheduleComebackReminder,
  scheduleHifzNotifications
} from "../native";
import { AppState, initialState, KhatmRecord, ResultStatus, ReviewRecord, Screen, SessionMode } from "../types";

const STORAGE_KEY = "hifz:app-state";

export function useHifzAppState() {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((value) => {
        if (!value) return;
        const saved = migrateSavedState(JSON.parse(value) as Partial<AppState>);
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serializableState(state))).catch(() => undefined);
  }, [hydrated, state]);

  const reminderSettings = buildReminderSettings(state);
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
  const deckContext = buildDeckContext(state);

  const startSession = (mode: SessionMode, startIndex?: number, startAyah?: number) => {
    const deck = getDeck(mode, deckContext);
    // When the user explicitly picks a revision section, start from its unfinished ayah; otherwise resume.
    const picked = startIndex !== undefined;
    const revisionIndex = picked
      ? Math.min(Math.max(0, startIndex), Math.max(0, deck.length - 1))
      : Math.min(Math.max(0, state.revisionProgressIndex), Math.max(0, deck.length - 1));
    const revisionItem = deck[revisionIndex];
    const revisionEndAyah = isRevisionFlow(revisionItem) ? revisionItem.passage[revisionItem.passage.length - 1]?.num ?? 1 : 1;
    const revisionAyah = picked ? Math.max(1, startAyah ?? 1) : Math.min(revisionEndAyah, Math.max(1, state.revisionProgressAyah || 1));
    const pickedIndex = Math.min(Math.max(0, startIndex ?? 0), Math.max(0, deck.length - 1));
    patch({
      screen: "session",
      sessionMode: mode,
      sessionPhase: "running",
      cardIndex: mode === "revision" ? revisionIndex : picked ? pickedIndex : 0,
      revealed: false,
      revisionReadAyah: 0,
      revisionResumeAyah: mode === "revision" ? revisionAyah : 0,
      revisionProgressIndex: mode === "revision" ? revisionIndex : state.revisionProgressIndex,
      revisionProgressAyah: picked ? revisionAyah : state.revisionProgressAyah,
      results: {}
    });
  };

  const startQuiz = () => {
    const ranges = state.quizCustomRange ? [state.quizRange] : state.revisionRanges;
    const deck = buildQuizDeck(ranges, state.quizQuestionCount || 5, state.arabicScript);
    patch({
      screen: "quizSession",
      quizDeck: deck,
      quizIndex: 0,
      quizResults: {},
      quizPhase: deck.length ? "running" : "done"
    });
  };

  const markQuiz = (status: ResultStatus) => {
    const question = state.quizDeck[state.quizIndex];
    if (!question) {
      patch({ quizPhase: "done" });
      return;
    }
    const nextResults = { ...(state.quizResults ?? {}), [question.id]: status };
    const nextIndex = state.quizIndex + 1;
    patch({
      quizResults: nextResults,
      quizIndex: nextIndex,
      quizPhase: nextIndex >= state.quizDeck.length ? "done" : "running"
    });
  };

  const resetQuiz = (screen: Screen = "home") => {
    patch({ screen, quizDeck: [], quizIndex: 0, quizResults: {}, quizPhase: "idle" });
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
    if (isRevisionFlow(item) && state.sessionMode === "revision" && status === "finished") {
      const completedSurahs = { ...(state.revisionCompletedSurahs ?? {}), [String(item.surah ?? state.cardIndex)]: true };
      const allDone = deck.every((entry, index) => {
        if (!isRevisionFlow(entry)) return true;
        return completedSurahs[String(entry.surah ?? index)];
      });
      const nextRemainingIndex = deck.findIndex((entry, index) => isRevisionFlow(entry) && !completedSurahs[String(entry.surah ?? index)]);
      next.revisionCompletedSurahs = allDone ? {} : completedSurahs;
      next.revisionProgressIndex = allDone ? 0 : Math.max(0, nextRemainingIndex);
      next.revisionProgressAyah = 1;
      if (allDone) {
        next.revisionRounds = (state.revisionRounds ?? 0) + 1;
        next.khatms = [buildKhatmRecord(state, deck), ...(state.khatms ?? [])].slice(0, 50);
      }
      const flowEnd = item.passage[item.passage.length - 1]?.num ?? item.start;
      const resume = Math.max(item.start, state.revisionResumeAyah || item.start);
      Object.assign(next, dailyRevisionFields(state, flowEnd - resume + 1));
    }
    patch(next);
    setTimeout(advance, 120);
  };

  const completeRevisionSurah = (index: number) => {
    const deck = getDeck("revision", deckContext);
    const item = deck[index];
    if (!isRevisionFlow(item)) return;
    const key = String(item.surah ?? index);
    const completedSurahs = { ...(state.revisionCompletedSurahs ?? {}), [key]: true };
    const allDone = deck.every((entry, entryIndex) => !isRevisionFlow(entry) || completedSurahs[String(entry.surah ?? entryIndex)]);
    const nextRemainingIndex = deck.findIndex((entry, entryIndex) => isRevisionFlow(entry) && !completedSurahs[String(entry.surah ?? entryIndex)]);
    const flowEnd = item.passage[item.passage.length - 1]?.num ?? item.start;
    const record: ReviewRecord = {
      id: `revision-${key}-quick-${Date.now()}`,
      mode: "revision",
      ayahLabel: `${item.label} · completed`,
      result: "finished",
      timestamp: new Date().toISOString(),
      surah: item.surah ?? 0,
      ayah: flowEnd
    };
    patch({
      revisionCompletedSurahs: allDone ? {} : completedSurahs,
      revisionProgressIndex: allDone ? 0 : Math.max(0, nextRemainingIndex),
      revisionProgressAyah: 1,
      revisionRounds: allDone ? (state.revisionRounds ?? 0) + 1 : state.revisionRounds,
      khatms: allDone ? [buildKhatmRecord(state, deck), ...(state.khatms ?? [])].slice(0, 50) : state.khatms,
      reviewHistory: [record, ...(state.reviewHistory ?? [])].slice(0, 80),
      ...dailyRevisionFields(state, item.passage.length)
    });
  };

  // Revision: user taps the āyah where they got stuck — enter "read" mode to practise it.
  const stopAtAyah = (surah: number, ayah: number) => {
    if (state.sessionMode !== "revision") {
      patch({
        revisionReadAyah: ayah,
        revisionResumeAyah: ayah
      });
      return;
    }
    const previous = state.revisionProgressIndex === state.cardIndex
      ? state.revisionProgressAyah || state.revisionResumeAyah || ayah
      : state.revisionResumeAyah || ayah;
    const covered = Math.max(0, ayah - previous);
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
    if (state.sessionMode !== "revision") {
      if (state.results[key]) {
        patch({ revisionResumeAyah: Math.max(state.revisionResumeAyah || ayah, ayah) });
        return;
      }
      const record: ReviewRecord = {
        id: `${state.sessionMode}-${key}-${Date.now()}`,
        mode: state.sessionMode,
        ayahLabel: `${surahNameOf(label)} ${ayah}`,
        result: `stuck@${ayah}`,
        timestamp: new Date().toISOString(),
        surah,
        ayah
      };
      patch({
        revisionResumeAyah: Math.max(state.revisionResumeAyah || ayah, ayah),
        results: { ...state.results, [key]: `stuck@${ayah}` },
        reviewHistory: [record, ...(state.reviewHistory ?? [])].slice(0, 80)
      });
      return;
    }
    const previous = state.revisionProgressIndex === state.cardIndex
      ? state.revisionProgressAyah || state.revisionResumeAyah || ayah
      : state.revisionResumeAyah || ayah;
    const checkpointAyah = Math.max(previous, ayah);
    const covered = Math.max(0, checkpointAyah - previous);
    const checkpoint = {
      revisionResumeAyah: checkpointAyah,
      revisionProgressIndex: state.cardIndex,
      revisionProgressAyah: checkpointAyah,
      ...dailyRevisionFields(state, covered)
    };
    if (state.results[key]) {
      patch(checkpoint);
      return;
    }
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
      ...checkpoint,
      results: { ...state.results, [key]: `stuck@${ayah}` },
      reviewHistory: [record, ...(state.reviewHistory ?? [])].slice(0, 80)
    });
  };

  // Revision read mode: after practising the missed āyah, return to the same revision flow.
  const resumeRevision = () => {
    patch({ revisionReadAyah: 0, revealed: true });
  };

  const showTabs = shouldShowTabs(state.screen);

  return {
    state,
    showTabs,
    patch,
    nav,
    beginApp,
    startSession,
    startQuiz,
    markQuiz,
    resetQuiz,
    advance,
    markCard,
    completeRevisionSurah,
    stopAtAyah,
    addReadWeak,
    resumeRevision
  };
}

// Snapshot a completed khatm: total āyāt revised and how many distinct āyāt were weak this round.
function buildKhatmRecord(state: AppState, deck: PracticeItem[]): KhatmRecord {
  const total = deck.reduce((sum, entry) => sum + (isRevisionFlow(entry) ? entry.passage.length : 0), 0);
  const since = state.khatms?.[0] ? new Date(state.khatms[0].completedAt).getTime() : 0;
  const weak = new Map<string, { surah: number; ayah: number; label: string }>();
  (state.reviewHistory ?? []).forEach((r) => {
    const isWeak = r.result === "shaky" || r.result === "forgot" || String(r.result).startsWith("stuck@");
    if (isWeak && r.surah && r.ayah && new Date(r.timestamp).getTime() >= since) {
      weak.set(`${r.surah}:${r.ayah}`, { surah: r.surah, ayah: r.ayah, label: r.ayahLabel });
    }
  });
  return { id: `khatm-${Date.now()}`, completedAt: new Date().toISOString(), weak: weak.size, total, weakAyahs: Array.from(weak.values()) };
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

  const deckContext = buildDeckContext(current);
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

function migrateSavedState(saved: Partial<AppState>): Partial<AppState> {
  const legacyRevisionOrder = (saved as unknown as { revisionOrder?: string }).revisionOrder;
  const normalized: Partial<AppState> = legacyRevisionOrder === "select" ? { ...saved, revisionOrder: "forward" } : saved;
  const oldDefaultRange =
    normalized.revisionRanges?.length === 1 &&
    normalized.revisionRanges[0].id === "rev-default" &&
    normalized.revisionRanges[0].fromSurah === 1 &&
    normalized.revisionRanges[0].toSurah === 114;
  if (!oldDefaultRange) return normalized;
  return {
    ...normalized,
    revisionLoad: normalized.revisionLoad === 30 ? 5 : normalized.revisionLoad,
    revisionRanges: [{ id: "rev-default", fromSurah: 1, toSurah: 1, label: "1 · Al-Fatihah" }],
    revisionProgressIndex: 0,
    revisionProgressAyah: 1,
    revisionCompletedSurahs: {}
  };
}
