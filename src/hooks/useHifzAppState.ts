import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";
import { getDeck, isRevisionFlow } from "../deck";
import { maybeRequestNativeReviewEveryOtherDay, scheduleHifzNotifications } from "../native";
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
        maybeRequestNativeReviewEveryOtherDay();
      });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const { notificationsScheduled, notificationPermission, ...persistable } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(persistable)).catch(() => undefined);
  }, [hydrated, state]);

  useEffect(() => {
    if (!hydrated) return;
    scheduleHifzNotifications({
      sabaqOn: state.sabaqOn,
      revisionOn: state.revisionOn,
      weakOn: state.weakOn,
      sabaqFreq: state.sabaqFreq,
      revisionFreq: state.revisionFreq,
      sabaqDays: state.sabaqDays,
      revisionDays: state.revisionDays,
      activeStartHour: state.activeStartHour,
      activeEndHour: state.activeEndHour,
      hoursOn: state.hoursOn,
      soundOn: state.soundOn,
      newRange: state.newRange,
      revisionRanges: state.revisionRanges,
      sabaqTargetId: state.sabaqTargetId,
      revisionTargetId: state.revisionTargetId
    }).then((result) => {
      setState((current) => ({
        ...current,
        notificationsScheduled: result.scheduled,
        notificationPermission: result.permission
      }));
    });
  }, [
    hydrated,
    state.sabaqOn,
    state.revisionOn,
    state.weakOn,
    state.sabaqFreq,
    state.revisionFreq,
    state.sabaqDays,
    state.revisionDays,
    state.activeStartHour,
    state.activeEndHour,
    state.hoursOn,
    state.soundOn,
    state.newRange,
    state.revisionRanges,
    state.sabaqTargetId,
    state.revisionTargetId
  ]);

  const patch = (next: Partial<AppState>) => setState((current) => ({ ...current, ...next }));
  const nav = (screen: Screen) => patch({ screen });
  const beginApp = () => patch({ screen: "home" });

  const startSession = (mode: SessionMode) => {
    patch({ screen: "session", sessionMode: mode, sessionPhase: "running", cardIndex: 0, revealed: false, revisionReadAyah: 0, results: {} });
  };

  const deckContext = { newRange: state.newRange, revisionRanges: state.revisionRanges, history: state.reviewHistory };

  const surahNumberOf = (label: string) => Number(label.split("·")[0]?.trim()) || 0;
  const surahNameOf = (label: string) => label.split("·").slice(1).join("·").trim() || label;

  const advance = () => {
    const total = getDeck(state.sessionMode, deckContext).length;
    if (state.cardIndex >= total - 1) {
      patch({ sessionPhase: "done" });
      return;
    }
    patch({ cardIndex: state.cardIndex + 1, revealed: false, revisionReadAyah: 0 });
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
    patch({
      results: { ...state.results, [key]: status },
      reviewHistory: [record, ...(state.reviewHistory ?? [])].slice(0, 80)
    });
    setTimeout(advance, 120);
  };

  // Revision: user taps the āyah where they got stuck — record it as weak, then enter "read" mode.
  const stopAtAyah = (surah: number, ayah: number, label: string) => {
    const key = `${surah}:${ayah}`;
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
      reviewHistory: [record, ...(state.reviewHistory ?? [])].slice(0, 80),
      revisionReadAyah: ayah
    });
  };

  // Revision read mode: move forward one āyah; once past the end of the sūrah, finish the flow.
  const readNextAyah = (surahLength: number) => {
    if (state.revisionReadAyah >= surahLength) {
      advance();
      return;
    }
    patch({ revisionReadAyah: state.revisionReadAyah + 1 });
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
    readNextAyah
  };
}

