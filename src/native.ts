import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as StoreReview from "expo-store-review";
import { Platform } from "react-native";
import { buildNewDeck, buildRevisionDeck } from "./deck";
import { firstWords } from "./quran";
import { Days, MemorisationRange, SessionMode, SurahRange } from "./types";

export type ReminderSettings = {
  sabaqOn: boolean;
  revisionOn: boolean;
  sabaqFreq: string;
  revisionFreq: string;
  sabaqDays: Days;
  revisionDays: Days;
  activeStartHour: number;
  activeEndHour: number;
  hoursOn: boolean;
  soundOn: boolean;
  newRange: MemorisationRange;
  revisionRanges: SurahRange[];
  sabaqTargetId: string;
  revisionTargetId: string;
  revisionProgressIndex: number;
  revisionProgressAyah: number;
};

const REVIEW_KEY = "hifz:last-native-review";
const NOTIFICATION_CACHE_KEY = "hifz:last-notification-plan";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

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
  const activeFrom = settings.hoursOn ? settings.activeStartHour * 60 : 7 * 60;
  const activeUntil = settings.hoursOn ? settings.activeEndHour * 60 : 22 * 60;
  const now = new Date();
  const maxItems = 48;
  const newCards = buildNewDeck(settings.newRange);
  const revisionCards = buildRevisionDeck(settings.revisionRanges);
  const newSurah = surahNumberOf(settings.newRange.surah);

  for (let dayOffset = 0; dayOffset < 14 && plan.length < maxItems; dayOffset += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + dayOffset);
    const label = dayNames[day.getDay()];

    const slots: Array<{ minute: number; type: "sabaq" | "revision" }> = [];
    if (settings.sabaqOn && settings.sabaqDays[label]) {
      addIntervalSlots(slots, "sabaq", activeFrom + 30, activeUntil, frequencyMinutes(settings.sabaqFreq));
    }
    if (settings.revisionOn && settings.revisionDays[label]) {
      addIntervalSlots(slots, "revision", activeFrom + 90, activeUntil, frequencyMinutes(settings.revisionFreq));
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
          const revisionIndex = revisionCards.length
            ? (settings.revisionProgressIndex + index + dayOffset) % revisionCards.length
            : 0;
          const revision = revisionCards[revisionIndex];
          const startAyah =
            revision && revisionIndex === settings.revisionProgressIndex
              ? Math.max(revision.start, settings.revisionProgressAyah || revision.start)
              : revision?.start ?? 1;
          const prompt = revision?.passage.find((ayah) => ayah.num >= startAyah) ?? revision?.passage[0];
          plan.push({
            date,
            title: "Hifz Cards · Revision",
            body: `${revision?.label ?? "Revision"}: start from āyah ${prompt?.num ?? startAyah}. ${prompt?.text ? firstWords(prompt.text, 5) : "How far can you continue?"}`,
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
