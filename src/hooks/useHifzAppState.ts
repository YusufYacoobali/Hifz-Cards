import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import { buildDeckContext, buildReminderSettings, serializableState, shouldShowTabs } from "../appStateSelectors";
import { buildQuizDeck, getDeck, isRevisionFlow, PracticeItem } from "../deck";
import {
  canOpenStoreReviewPage,
  maybeRequestNativeReviewOccasionally,
  openStoreReviewPage,
  scheduleHifzNotifications
} from "../native";
import { allPracticeEvents, buildProgressPatch, buildRevisionCoveragePatch, migratePracticeState } from "../progressModel";
import { AppState, initialState, KhatmRecord, ResultStatus, ReviewRecord, Screen, SessionMode } from "../types";

const STORAGE_KEY = "hifz:app-state";

export function useHifzAppState() {
  const [state, setState] = useState(initialState);
  const [hydrated, setHydrated] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

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

  // Ask for native review only after meaningful usage. Store limits and platform rules are handled by the helper.
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(() => maybeRequestNativeReviewOccasionally(), 10 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [hydrated]);

  // Session-level store prompt after the user has actually spent time in the app.
  useEffect(() => {
    if (!hydrated) return;
    const timer = setTimeout(async () => {
      if (stateRef.current.screen === "onboarding") return;
      if (!(await canOpenStoreReviewPage())) return;
      Alert.alert(
        "Enjoying Hifz Cards?",
        "If the app is helping your revision, a quick rating helps more students find it.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Rate app", onPress: () => openStoreReviewPage() }
        ]
      );
    }, 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(serializableState(state))).catch(() => undefined);
  }, [hydrated, state]);

  const reminderSettings = buildReminderSettings(state);
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
    // Quiz marks feed real progress: shaky/forgot answers join the weak-spot queue (a solid
    // answer counts as a solid rep for an existing weak entry), and the attempt counts toward
    // streak/daily activity. Khatm position and sabaq advancement are untouched (mode "quiz").
    const record: ReviewRecord = {
      id: `quiz-${question.id}-${Date.now()}`,
      mode: "quiz",
      ayahLabel: `${question.label} ${question.ayah}`,
      result: status,
      timestamp: new Date().toISOString(),
      surah: question.surah,
      ayah: question.ayah
    };
    const nextResults = { ...(state.quizResults ?? {}), [question.id]: status };
    const nextIndex = state.quizIndex + 1;
    patch({
      quizResults: nextResults,
      quizIndex: nextIndex,
      quizPhase: nextIndex >= state.quizDeck.length ? "done" : "running",
      ...buildProgressPatch(state, record)
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
    const flowEnd = isRevisionFlow(item) ? item.passage[item.passage.length - 1]?.num ?? item.start : 0;
    const resume = isRevisionFlow(item) ? Math.max(item.start, state.revisionResumeAyah || item.start) : 0;
    const coveredAyahs = isRevisionFlow(item) && status === "finished" ? Math.max(1, flowEnd - resume + 1) : undefined;
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
      ayah: ayahNum,
      coveredAyahs
    };
    const next: Partial<AppState> = {
      results: { ...state.results, [key]: status },
      ...buildProgressPatch(state, record)
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
    }
    if (state.sessionMode === "weak" || state.sessionMode === "yesterdayWeak") {
      // Marking reschedules the entry, so the due-only deck rebuilds without this card.
      // Adjust index/phase in the same patch so there's never an empty "running" render
      // and no card gets skipped by advancing over a shifted deck.
      const nextDeck = getDeck(state.sessionMode, { ...deckContext, weakSpotQueue: next.weakSpotQueue ?? state.weakSpotQueue });
      if (!nextDeck.length) next.sessionPhase = "done";
      else next.cardIndex = Math.min(state.cardIndex, nextDeck.length - 1);
      next.revealed = false;
      patch(next);
      return;
    }
    patch(next);
    const securedNew = state.sessionMode === "new" && status === "solid";
    setTimeout(() => {
      if (securedNew) patch({ cardIndex: 0, revealed: false });
      else advance();
    }, 120);
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
    // Credit only what hasn't been counted yet: the current-progress surah may already have
    // checkpointed coverage today, so quick-completing it credits just the remainder.
    const alreadyAt = state.revisionProgressIndex === index
      ? Math.max(item.start, state.revisionProgressAyah || item.start)
      : item.start;
    const record: ReviewRecord = {
      id: `revision-${key}-quick-${Date.now()}`,
      mode: "revision",
      ayahLabel: `${item.label} · completed`,
      result: "finished",
      timestamp: new Date().toISOString(),
      surah: item.surah ?? 0,
      ayah: flowEnd,
      coveredAyahs: Math.max(1, flowEnd - alreadyAt + 1)
    };
    patch({
      revisionCompletedSurahs: allDone ? {} : completedSurahs,
      revisionProgressIndex: allDone ? 0 : Math.max(0, nextRemainingIndex),
      revisionProgressAyah: 1,
      revisionRounds: allDone ? (state.revisionRounds ?? 0) + 1 : state.revisionRounds,
      khatms: allDone ? [buildKhatmRecord(state, deck), ...(state.khatms ?? [])].slice(0, 50) : state.khatms,
      ...buildProgressPatch(state, record)
    });
  };

  // Revision: user taps the āyah where they got stuck — enter "read" mode to practise it.
  // Tapping an āyah ABOVE the current position (re-checking something already passed) must
  // never rewind the khatm markers — practise the tapped āyah, but resume from the real position.
  const stopAtAyah = (surah: number, ayah: number) => {
    if (state.sessionMode !== "revision") {
      patch({
        revisionReadAyah: ayah,
        revisionResumeAyah: Math.max(state.revisionResumeAyah || ayah, ayah)
      });
      return;
    }
    const previous = state.revisionProgressIndex === state.cardIndex
      ? state.revisionProgressAyah || state.revisionResumeAyah || ayah
      : state.revisionResumeAyah || ayah;
    const checkpointAyah = Math.max(previous, ayah);
    const covered = Math.max(0, ayah - previous);
    patch({
      revisionReadAyah: ayah,
      revisionResumeAyah: checkpointAyah,
      revisionProgressIndex: state.cardIndex,
      revisionProgressAyah: checkpointAyah,
      ...buildRevisionCoveragePatch(state, covered)
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
        ...buildProgressPatch(state, record)
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
      revisionProgressAyah: checkpointAyah
    };
    if (state.results[key]) {
      patch({ ...checkpoint, ...buildRevisionCoveragePatch(state, covered) });
      return;
    }
    const record: ReviewRecord = {
      id: `revision-${key}-${Date.now()}`,
      mode: "revision",
      ayahLabel: `${surahNameOf(label)} ${ayah}`,
      result: `stuck@${ayah}`,
      timestamp: new Date().toISOString(),
      surah,
      ayah,
      coveredAyahs: covered > 0 ? covered : undefined
    };
    patch({
      ...checkpoint,
      results: { ...state.results, [key]: `stuck@${ayah}` },
      ...buildProgressPatch(state, record)
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
// Only revision-session slips count — sabaq stumbles on āyāt still being memorised, weak drills,
// and quiz misses say nothing about how solid THIS khatm's recitation was.
function buildKhatmRecord(state: AppState, deck: PracticeItem[]): KhatmRecord {
  const total = deck.reduce((sum, entry) => sum + (isRevisionFlow(entry) ? entry.passage.length : 0), 0);
  const since = state.khatms?.[0] ? new Date(state.khatms[0].completedAt).getTime() : 0;
  const weak = new Map<string, { surah: number; ayah: number; label: string }>();
  allPracticeEvents(state).forEach((r) => {
    const isWeak = r.result === "shaky" || r.result === "forgot" || String(r.result).startsWith("stuck@");
    if (isWeak && r.mode === "revision" && r.surah && r.ayah && new Date(r.timestamp).getTime() >= since) {
      weak.set(`${r.surah}:${r.ayah}`, { surah: r.surah, ayah: r.ayah, label: r.ayahLabel });
    }
  });
  return { id: `khatm-${Date.now()}`, completedAt: new Date().toISOString(), weak: weak.size, total, weakAyahs: Array.from(weak.values()) };
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
  let autoplaySurah = surah;
  let autoplayAyah = ayah;

  if (mode === "revision") {
    // A delivered notification can outlive the plan that created it (the tray keeps it even
    // after we cancel and reschedule). Its payload was computed from khatm progress at build
    // time anyway, so never trust it to set position — resolve to the user's CURRENT progress
    // so a stale tap can't rewind the khatm.
    cardIndex = Math.min(Math.max(0, current.revisionProgressIndex), Math.max(0, deck.length - 1));
    const item = deck[cardIndex];
    const start = isRevisionFlow(item) ? item.start : 1;
    const end = isRevisionFlow(item) ? item.passage[item.passage.length - 1]?.num ?? start : start;
    revisionResumeAyah = Math.min(end, Math.max(start, current.revisionProgressAyah || start));
    revisionProgressIndex = cardIndex;
    revisionProgressAyah = revisionResumeAyah;
    autoplaySurah = isRevisionFlow(item) ? item.surah ?? surah : surah;
    autoplayAyah = revisionResumeAyah;
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
    notificationAutoplaySurah: autoplaySurah,
    notificationAutoplayAyah: autoplayAyah,
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
  const { lastCelebratedDailyGoalKey: _legacyCelebrationKey, ...withoutLegacyCelebration } = saved as Partial<AppState> & { lastCelebratedDailyGoalKey?: string };
  const base: Partial<AppState> = migratePracticeState({
    ...withoutLegacyCelebration,
    celebratedDailyGoalKeys: Array.isArray(withoutLegacyCelebration.celebratedDailyGoalKeys) ? withoutLegacyCelebration.celebratedDailyGoalKeys : []
  });
  const legacyRevisionOrder = (base as unknown as { revisionOrder?: string }).revisionOrder;
  const normalized: Partial<AppState> = legacyRevisionOrder === "select" ? { ...base, revisionOrder: "forward" } : base;
  const oldDefaultRange =
    normalized.revisionRanges?.length === 1 &&
    normalized.revisionRanges[0].id === "rev-default" &&
    normalized.revisionRanges[0].fromSurah === 1 &&
    normalized.revisionRanges[0].toSurah === 114;
  if (!oldDefaultRange) return normalized;
  return {
    ...normalized,
    revisionRanges: [{ id: "rev-default", fromSurah: 1, toSurah: 1, label: "1 · Al-Fatihah" }],
    revisionProgressIndex: 0,
    revisionProgressAyah: 1,
    revisionCompletedSurahs: {}
  };
}
