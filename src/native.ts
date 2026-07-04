import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as StoreReview from "expo-store-review";
import { AppState as RNAppState, Platform } from "react-native";
import { buildNewDeck, buildRevisionDeck } from "./deck";
import { ActiveHoursMode, ArabicScript, DailyActiveHours, Days, MemorisationRange, RevisionOrder, SessionMode, SurahRange } from "./types";

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

const sabaqNotificationTitles = [
  "A small new-surah moment is ready",
  "Your next ayah is waiting",
  "Keep your new memorisation warm",
  "A gentle Qur'an nudge",
  "Five quiet minutes for new memorisation",
  "Your next recall is ready",
  "A fresh ayah, one calm pass",
  "Stay close to today's new ayah",
  "A little memorisation now",
  "Your new-surah card is ready",
  "A soft prompt for new memorisation",
  "Keep the next ayah fresh",
  "A quick recall window",
  "Your memorisation rhythm is here",
  "One ayah, one focused moment",
  "Time for a light new-ayah check",
  "Your new memorisation is waiting",
  "A calm step forward"
];

const sabaqNotificationBodies = [
  "Five minutes now can keep it fresh.",
  "Open a card and see how much comes back.",
  "A short recall now is enough.",
  "One focused pass, then carry on.",
  "Keep it gentle: recall first, reveal if needed.",
  "This is a good moment to strengthen today's ayah.",
  "A tiny session still counts.",
  "Come back while it is still close.",
  "Test the next ayah without pressure.",
  "Your future self will thank you for this small pass.",
  "A quiet recall keeps the chain warm.",
  "No rush. Just one card.",
  "Lock in a little more of today's new memorisation.",
  "A short attempt is better than waiting for perfect time.",
  "See if the opening words are still there.",
  "Keep the new ayah moving from short-term to strong.",
  "A gentle review now makes later easier.",
  "Open the app and continue where you left off."
];

const revisionNotificationTitles = [
  "Your Qur'an revision is waiting",
  "Keep your revision fresh",
  "A soft revision reminder",
  "Five minutes now keeps it fresh",
  "Your next revision pass is ready",
  "Come back to what you know",
  "A calm moment for revision",
  "Your memorisation needs a light pass",
  "A quick revision check",
  "Stay connected to your revision",
  "A little revision goes far",
  "Your khatm cycle is waiting",
  "Keep the old memorisation alive",
  "One section, gently",
  "A quiet check-in for revision",
  "Your next recall point is ready",
  "Return before it fades",
  "Strengthen what you already know"
];

const revisionNotificationBodies = [
  "Open where you left off and see how far you can go.",
  "A short pass now keeps the path familiar.",
  "No pressure. Recite what comes, then mark your stop.",
  "Keep the chain warm with a quick recall.",
  "Start from your saved place and continue gently.",
  "A few ayat now can stop revision getting heavy.",
  "Your next section is ready when you are.",
  "One calm attempt is enough to keep it moving.",
  "Test from memory first; the card will help if needed.",
  "A small revision window is open.",
  "Come back to your current place for a few minutes.",
  "Keep today's revision light and consistent.",
  "This is a good time to refresh what you know.",
  "Short, steady revision beats a long delay.",
  "Your saved checkpoint is ready.",
  "A gentle pass now protects yesterday's effort.",
  "Open the app and continue your revision.",
  "Five quiet minutes can keep it settled."
];

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
          const copy = notificationCopy("sabaq", plan.length + dayOffset + index, `${settings.newRange.label}: ${card.prompt}`);
          plan.push({
            date,
            title: copy.title,
            body: copy.body,
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
          const copy = notificationCopy(
            "revision",
            plan.length + dayOffset + index,
            `${revision?.label ?? "Revision"} · āyah ${prompt?.num ?? startAyah}`
          );
          plan.push({
            date,
            title: copy.title,
            body: copy.body,
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

function notificationCopy(type: "sabaq" | "revision", seed: number, context: string) {
  const titles = type === "sabaq" ? sabaqNotificationTitles : revisionNotificationTitles;
  const bodies = type === "sabaq" ? sabaqNotificationBodies : revisionNotificationBodies;
  const title = titles[seed % titles.length];
  const body = bodies[(seed * 7 + 3) % bodies.length];
  return { title, body: `${body} ${context}` };
}

function surahNumberOf(label: string) {
  return Number(label.split("·")[0]?.trim()) || 1;
}
