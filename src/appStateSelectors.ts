import { DeckContext } from "./deck";
import { ReminderSettings } from "./native";
import { AppState, Screen } from "./types";

const tabScreens: Screen[] = ["home", "progress", "board", "profile"];

export function shouldShowTabs(screen: Screen) {
  return tabScreens.includes(screen);
}

export function buildDeckContext(state: AppState): DeckContext {
  return {
    newRange: state.newRange,
    revisionRanges: state.revisionRanges,
    history: state.reviewHistory,
    arabicScript: state.arabicScript,
    revisionOrder: state.revisionOrder
  };
}

export function buildReminderSettings(state: AppState): ReminderSettings {
  return {
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
}

export function serializableState(state: AppState): Omit<AppState, "notificationsScheduled" | "notificationPermission"> {
  const { notificationsScheduled, notificationPermission, ...persistable } = state;
  return persistable;
}
