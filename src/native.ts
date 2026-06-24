import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as StoreReview from "expo-store-review";
import { AppState as RNAppState, Platform } from "react-native";
import { buildNewDeck, buildRevisionDeck } from "./deck";
import { firstWords } from "./quran";
import { ActiveHoursMode, ArabicScript, DailyActiveHours, Days, MemorisationRange, RevisionOrder, SessionMode, SurahRange } from "./types";

// Minutes after the user leaves the app before the "come back" reminder fires.
export const COMEBACK_DELAY_MIN = 20;

export type ReminderSettings = {
  sabaqOn: boolean;
  revisionOn: boolean;
  sabaqFreq: string;
  revisionFreq: string;
  sabaqDays: Days;
  revisionDays: Days;
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
  newRange: MemorisationRange;
  revisionRanges: SurahRange[];
  sabaqTargetId: string;
  revisionTargetId: string;
  revisionProgressIndex: number;
  revisionProgressAyah: number;
  arabicScript?: ArabicScript;
  revisionOrder?: RevisionOrder;
};

const REVIEW_KEY = "hifz:last-native-review";
const NOTIFICATION_CACHE_KEY = "hifz:last-notification-plan";

Notifications.setNotificationHandler({
  // Don't pop a banner/sound while the user is actively in the app — reminders are for when they've left.
  handleNotification: async () => {
    const active = RNAppState.currentState === "active";
    return {
      shouldShowBanner: !active,
      shouldShowList: true,
      shouldPlaySound: !active,
      shouldSetBadge: false
    };
  }
});

const COMEBACK_ID_KEY = "hifz:comeback-id";

export async function maybeRequestNativeReviewEveryOtherDay() {
  try {
    const now = Date.now();
    const last = Number(await AsyncStorage.getItem(REVIEW_KEY));
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    if (last && now - last < twoDays) return;

    const available = await StoreReview.isAvailableAsync();
    const hasAction = await StoreReview.hasAction();
    if (available && hasAction) {
      await StoreReview.requestReview();
      await AsyncStorage.setItem(REVIEW_KEY, String(now));
    }
  } catch {
    // Native review availability is intentionally best-effort.
  }
}

export async function scheduleHifzNotifications(settings: ReminderSettings) {
  try {
    const permissions = await Notifications.getPermissionsAsync();
    const status =
      permissions.status === "granted"
        ? permissions.status
        : (await Notifications.requestPermissionsAsync()).status;
    if (status !== "granted") return { scheduled: 0, permission: "denied" as const };

    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("hifz-cards", {
        name: "Hifz Cards",
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: "#0f3b30",
        vibrationPattern: [0, 120, 80, 120]
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();
    const plan = buildNotificationPlan(settings);

    for (const item of plan) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: item.title,
          body: item.body,
          sound: settings.soundOn,
          data: {
            mode: item.mode,
            screen: `session:${item.mode}`,
            surah: item.surah,
            ayah: item.ayah,
            cardIndex: item.cardIndex,
            autoplay: true
          }
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: item.date,
          channelId: "hifz-cards"
        }
      });
    }

    await AsyncStorage.setItem(
      NOTIFICATION_CACHE_KEY,
      JSON.stringify(plan.map((item) => ({ ...item, date: item.date.toISOString() })))
    );

    return { scheduled: plan.length, permission: "granted" as const };
  } catch {
    return { scheduled: 0, permission: "error" as const };
  }
}

function buildNotificationPlan(settings: ReminderSettings) {
  const plan: Array<{
    date: Date;
    title: string;
    body: string;
    mode: SessionMode;
    surah: number;
    ayah: number;
    cardIndex: number;
  }> = [];
  const dayNames: Array<keyof Days> = ["Sun" as never, "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const now = new Date();
  const maxItems = 48;
  const newCards = buildNewDeck(settings.newRange, settings.arabicScript);
  const revisionCards = buildRevisionDeck(settings.revisionRanges, settings.arabicScript, settings.revisionOrder);
  const newSurah = surahNumberOf(settings.newRange.surah);

  for (let dayOffset = 0; dayOffset < 14 && plan.length < maxItems; dayOffset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);
    const label = dayNames[day.getDay()];
    const window = activeWindowForDay(settings, label);

    // Start reminders at the active-hours start time. When both services run, nudge revision a
    // few minutes later so the two notifications don't land on the exact same minute.
    const bothOn =
      settings.sabaqOn && settings.sabaqDays[label] && settings.revisionOn && settings.revisionDays[label];
    const slots: Array<{ minute: number; type: "sabaq" | "revision" }> = [];
    if (settings.sabaqOn && settings.sabaqDays[label]) {
      addIntervalSlots(slots, "sabaq", window.from, window.until, frequencyMinutes(settings.sabaqFreq));
    }
    if (settings.revisionOn && settings.revisionDays[label]) {
      addIntervalSlots(slots, "revision", window.from + (bothOn ? 5 : 0), window.until, frequencyMinutes(settings.revisionFreq));
    }
    slots
      .sort((a, b) => a.minute - b.minute)
      .forEach((slot, index) => {
        if (plan.length >= maxItems) return;
        const date = new Date(day);
        date.setHours(Math.floor(slot.minute / 60), slot.minute % 60, 0, 0);
        if (date <= now) return;

        if (slot.type === "sabaq") {
          const cardIndex = newCards.length ? (index + dayOffset) % newCards.length : 0;
          const card = newCards[cardIndex];
          if (!card) return;
          plan.push({
            date,
            title: "Hifz Cards · Today's Memorisation",
            body: `${settings.newRange.label}: recite this āyah, then continue: ${card.prompt}`,
            mode: "new",
            surah: newSurah,
            ayah: card.num,
            cardIndex
          });
        } else if (slot.type === "revision") {
          // Always resume revision exactly where the user left off — never rotate to a random known sūrah.
          const revisionIndex = revisionCards.length
            ? Math.min(Math.max(0, settings.revisionProgressIndex), revisionCards.length - 1)
            : 0;
          const revision = revisionCards[revisionIndex];
          const startAyah = revision
            ? Math.max(revision.start, settings.revisionProgressAyah || revision.start)
            : 1;
          const prompt = revision?.passage.find((ayah) => ayah.num >= startAyah) ?? revision?.passage[0];
          plan.push({
            date,
            title: "Hifz Cards · Revision",
            body: `${revision?.label ?? "Revision"}: continue from āyah ${prompt?.num ?? startAyah}. ${prompt?.text ? firstWords(prompt.text, 5) : "How far can you continue?"}`,
            mode: "revision",
            surah: revision?.surah ?? 1,
            ayah: prompt?.num ?? startAyah,
            cardIndex: revisionIndex
          });
        }
      });
  }

  return plan;
}

function activeWindowForDay(settings: ReminderSettings, day: keyof Days) {
  if (!settings.hoursOn) return { from: 7 * 60, until: 22 * 60 };
  const mode = settings.activeHoursMode ?? (settings.splitActiveHours ? "weekend" : "same");
  if (mode === "daily") {
    const window = settings.dailyActiveHours?.[day];
    return { from: (window?.start ?? settings.activeStartHour) * 60, until: (window?.end ?? settings.activeEndHour) * 60 };
  }
  const weekend = day === "Sat" || day === "Sun";
  const grouped = mode === "weekend";
  const fromHour = grouped
    ? weekend
      ? settings.weekendStartHour
      : settings.weekdayStartHour
    : settings.activeStartHour;
  const untilHour = grouped
    ? weekend
      ? settings.weekendEndHour
      : settings.weekdayEndHour
    : settings.activeEndHour;
  return { from: fromHour * 60, until: untilHour * 60 };
}

function addIntervalSlots(slots: Array<{ minute: number; type: "sabaq" | "revision" }>, type: "sabaq" | "revision", start: number, end: number, step: number) {
  for (let minute = start; minute <= end; minute += step) slots.push({ minute, type });
}

function frequencyMinutes(value: string) {
  if (value.includes("20")) return 20;
  if (value.includes("30")) return 30;
  if (value.includes("1 hour")) return 60;
  if (value.includes("2")) return 120;
  if (value.includes("3")) return 180;
  if (value.includes("6")) return 360;
  if (value.toLowerCase().includes("hour")) return 60;
  return 24 * 60;
}

function surahNumberOf(label: string) {
  return Number(label.split("·")[0]?.trim()) || 1;
}

// The first active moment at/after `minutes` from now, respecting active hours.
function nextActiveDate(settings: ReminderSettings, minutes: number) {
  const probe = new Date(Date.now() + minutes * 60 * 1000);
  if (!settings.hoursOn) return probe;
  const dayNames: Array<keyof Days> = ["Sun" as never, "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < 8; i += 1) {
    const window = activeWindowForDay(settings, dayNames[probe.getDay()]);
    const minute = probe.getHours() * 60 + probe.getMinutes();
    if (minute < window.from) {
      probe.setHours(Math.floor(window.from / 60), window.from % 60, 0, 0);
      return probe;
    }
    if (minute <= window.until) return probe;
    probe.setDate(probe.getDate() + 1);
    probe.setHours(0, 0, 0, 0);
  }
  return probe;
}

function comebackContent(settings: ReminderSettings) {
  if (settings.sabaqOn) {
    const card = buildNewDeck(settings.newRange, settings.arabicScript)[0];
    return {
      title: "Hifz Cards · Pick up your sabaq",
      body: card ? `${settings.newRange.label}: ${card.prompt}` : "Time for today's memorisation.",
      data: {
        mode: "new" as SessionMode,
        screen: "session:new",
        surah: surahNumberOf(settings.newRange.surah),
        ayah: card?.num ?? 1,
        cardIndex: 0,
        autoplay: true
      }
    };
  }
  const revisionCards = buildRevisionDeck(settings.revisionRanges, settings.arabicScript, settings.revisionOrder);
  const idx = Math.min(Math.max(0, settings.revisionProgressIndex), Math.max(0, revisionCards.length - 1));
  const revision = revisionCards[idx];
  const startAyah = revision ? Math.max(revision.start, settings.revisionProgressAyah || revision.start) : 1;
  return {
    title: "Hifz Cards · Time to revise",
    body: revision ? `${revision.label}: start from āyah ${startAyah}.` : "Time to revise what you know.",
    data: {
      mode: "revision" as SessionMode,
      screen: "session:revision",
      surah: revision?.surah ?? 1,
      ayah: startAyah,
      cardIndex: idx,
      autoplay: true
    }
  };
}

// Schedule a single reminder ~20 min after the user leaves the app (within active hours).
export async function scheduleComebackReminder(settings: ReminderSettings, minutes = COMEBACK_DELAY_MIN) {
  try {
    await cancelComebackReminder();
    if (!settings.sabaqOn && !settings.revisionOn) return;
    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status !== "granted") return;
    const date = nextActiveDate(settings, minutes);
    const { title, body, data } = comebackContent(settings);
    const id = await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: settings.soundOn, data },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: "hifz-cards" }
    });
    await AsyncStorage.setItem(COMEBACK_ID_KEY, id);
  } catch {
    // best effort
  }
}

export async function cancelComebackReminder() {
  try {
    const id = await AsyncStorage.getItem(COMEBACK_ID_KEY);
    if (id) {
      await Notifications.cancelScheduledNotificationAsync(id);
      await AsyncStorage.removeItem(COMEBACK_ID_KEY);
    }
  } catch {
    // best effort
  }
}
