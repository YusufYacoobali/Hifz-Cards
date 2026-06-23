import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ayahCard, ayahCellStyle, buildNewDeck, buildRevisionDeck, getDeck, isRevisionFlow, sessionProgressWidth } from "./src/deck";
import { HifzCard, RevisionFlow, weakDeck } from "./src/data";
import {
  getDashboardStats,
  getProgressStats,
  getWeeklyRecap,
  leaderboardEntries
} from "./src/hifzModel";
import { useHifzAppState } from "./src/hooks/useHifzAppState";
import { playAyah, prefetchAyat, stopAyah } from "./src/audio";
import { reciterById, reciters } from "./src/reciters";
import { allSurahs, SurahInfo } from "./src/surahs";
import { colors, heavyShadow, shadow } from "./src/theme";
import { AppState, ArabicScript, Days, MemorisationRange, ResultStatus, Screen, SessionMode, SurahRange } from "./src/types";

const ArabicFontContext = React.createContext<ArabicScript>("uthmani");

export default function App() {
  const [fontsLoaded] = useFonts({
    Uthmani: require("./assets/fonts/uthmani2.ttf"),
    IndoPak: require("./assets/fonts/DigitalKhattIndoPak.otf")
  });
  return (
    <SafeAreaProvider>
      <StatusBar hidden />
      {fontsLoaded ? <AppContent /> : <View style={styles.safe} />}
    </SafeAreaProvider>
  );
}

function AppContent() {
  const { state, showTabs, patch, nav, beginApp, startSession, markCard, stopAtAyah, resumeRevision } = useHifzAppState();
  const insets = useSafeAreaInsets();
  const safe = {
    top: Math.max(insets.top, Platform.OS === "ios" ? 44 : 0),
    bottom: insets.bottom
  };

  return (
    <View style={styles.safe}>
      <StatusBar hidden />
      <View style={styles.appShell}>
        <ArabicFontContext.Provider value={state.arabicScript ?? "uthmani"}>
          {state.screen === "onboarding" && (
            <NewOnboardingScreen
              state={state}
              safeTop={safe.top}
              safeBottom={safe.bottom}
              onPatch={patch}
              onComplete={beginApp}
            />
          )}
          {state.screen === "home" && <HomeScreen state={state} safeTop={safe.top} safeBottom={safe.bottom} onNav={nav} onModes={() => nav("modes")} />}
          {state.screen === "notif" && <NotificationsScreen state={state} safeTop={safe.top} onPatch={patch} onNav={nav} />}
          {state.screen === "modes" && <ModeScreen state={state} safeTop={safe.top} onNav={nav} onStart={startSession} />}
          {state.screen === "session" && (
            <SessionScreen
              state={state}
              safeTop={safe.top}
              safeBottom={safe.bottom}
              onNav={nav}
              onPatch={patch}
              onStart={startSession}
              onMark={markCard}
              onStopAt={stopAtAyah}
              onResumeRevision={resumeRevision}
            />
          )}
          {state.screen === "progress" && <ProgressScreen state={state} safeTop={safe.top} onNav={nav} onStart={startSession} />}
          {state.screen === "board" && <BoardScreen state={state} safeTop={safe.top} onPatch={patch} />}
          {state.screen === "recap" && <RecapScreen state={state} safeTop={safe.top} onNav={nav} />}
          {state.screen === "profile" && <ProfileScreen state={state} safeTop={safe.top} onPatch={patch} onNav={nav} />}
          {showTabs && <BottomTabs screen={state.screen} safeBottom={safe.bottom} onNav={nav} />}
        </ArabicFontContext.Provider>
      </View>
    </View>
  );
}

type OnbStepKey =
  | "welcome"
  | "goal"
  | "newFocus"
  | "newReminders"
  | "revisionFocus"
  | "revisionReminders"
  | "schedule"
  | "summary";

function NewOnboardingScreen({
  state,
  safeTop,
  safeBottom,
  onPatch,
  onComplete
}: {
  state: AppState;
  safeTop: number;
  safeBottom: number;
  onPatch: (next: Partial<AppState>) => void;
  onComplete: () => void;
}) {
  const wantsNew = state.goal === "new" || state.goal === "both";
  const wantsRevision = state.goal === "revision" || state.goal === "both";

  const steps = useMemo<OnbStepKey[]>(() => {
    const list: OnbStepKey[] = ["welcome", "goal"];
    if (wantsNew) list.push("newFocus", "newReminders");
    if (wantsRevision) list.push("revisionFocus", "revisionReminders");
    list.push("schedule", "summary");
    return list;
  }, [wantsNew, wantsRevision]);

  const stepIndex = Math.min(state.onbStep, steps.length - 1);
  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;

  const goNext = () => {
    if (isLast) {
      onComplete();
      return;
    }
    onPatch({ onbStep: stepIndex + 1 });
  };
  const goBack = () => onPatch({ onbStep: Math.max(0, stepIndex - 1) });

  const setNewSurah = (surah: SurahInfo) => {
    const range = makeNewRange(surah, 1);
    onPatch({ newRange: range, sabaqTargetId: range.id, ayahFrom: 1, ayahTo: surah.ayahs });
  };
  const setNewStart = (from: number) => {
    onPatch({
      newRange: { ...state.newRange, from, label: newStartLabel(state.newRange.surah, from) },
      ayahFrom: from
    });
  };

  const updateRevisionRange = (id: string, fromSurah: number, toSurah: number) => {
    const revisionRanges = state.revisionRanges.map((range) =>
      range.id === id ? makeSurahRange(fromSurah, toSurah, id) : range
    );
    onPatch({ revisionRanges });
  };
  const addRevisionRange = () => {
    const range = makeSurahRange(1, 1, `rev-${Date.now()}`);
    onPatch({ revisionRanges: [...state.revisionRanges, range], revisionTargetId: range.id });
  };
  const removeRevisionRange = (id: string) => {
    if (state.revisionRanges.length <= 1) return;
    const revisionRanges = state.revisionRanges.filter((range) => range.id !== id);
    onPatch({
      revisionRanges,
      revisionTargetId: state.revisionTargetId === id ? revisionRanges[0].id : state.revisionTargetId
    });
  };

  const buttonLabel = isLast ? "Begin memorising" : step === "welcome" ? "Set up my plan" : "Continue";

  return (
    <View style={styles.fullScreen}>
      <View style={[styles.progressDots, { paddingTop: safeTop + 12 }]}>
        {steps.map((key, index) => (
          <View
            key={key}
            style={[styles.progressDot, { backgroundColor: index <= stepIndex ? colors.mint : "#e3ddcf" }]}
          />
        ))}
      </View>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.onboardingBody}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {step === "welcome" && (
          <View>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>ق</Text>
            </View>
            <Title>Memorise with{"\n"}gentle recall</Title>
            <Muted>
              Hifz Cards keeps Qur'an review present through the day without making it noisy or complicated.
            </Muted>
            <Stack>
              <InfoRow
                icon="leaf-outline"
                title="New memorisation"
                text="A reminder service that nudges you through the sūrah you are learning."
              />
              <InfoRow
                icon="repeat-outline"
                title="Revision"
                text="A separate service that resurfaces what you already know."
              />
              <InfoRow
                icon="albums-outline"
                title="Swipeable test cards"
                text="Reveal, mark, and repeat āyāt until they settle."
              />
            </Stack>
            <Panel style={styles.darkQuote}>
              <Arabic style={styles.darkQuoteArabic}>وَلَقَدْ يَسَّرْنَا ٱلْقُرْءَانَ لِلذِّكْرِ</Arabic>
              <Text style={styles.darkQuoteText}>And We have certainly made the Qur'an easy to remember. · 54:17</Text>
            </Panel>
          </View>
        )}

        {step === "goal" && (
          <View>
            <Title>What should{"\n"}we support?</Title>
            <Muted>
              Pick what you need right now. We will only set up the services that fit your choice — you can change this later.
            </Muted>
            <Stack>
              <OptionCard
                icon="leaf-outline"
                title="New memorisation"
                subtitle="Help me learn the sūrah I am working on"
                selected={state.goal === "new"}
                onPress={() => onPatch({ goal: "new", sabaqOn: true, revisionOn: false })}
              />
              <OptionCard
                icon="repeat-outline"
                title="Revision"
                subtitle="Help me keep what I already know solid"
                selected={state.goal === "revision"}
                onPress={() => onPatch({ goal: "revision", sabaqOn: false, revisionOn: true })}
              />
              <OptionCard
                icon="scale-outline"
                title="Both"
                subtitle="Separate plans for new memorisation and revision"
                selected={state.goal === "both"}
                onPress={() => onPatch({ goal: "both", sabaqOn: true, revisionOn: true })}
              />
            </Stack>
          </View>
        )}

        {step === "newFocus" && (
          <View>
            <Title>Where are you{"\n"}starting from?</Title>
            <Muted>Pick the sūrah and āyah you are starting new memorisation from — we'll keep moving you forward from there.</Muted>
            <Panel style={styles.focusPanel}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Overline>Starting sūrah</Overline>
                  <Text style={styles.cardTitle}>{state.newRange.surah}</Text>
                </View>
                <Arabic style={styles.focusArabic}>{state.newRange.arabic}</Arabic>
              </View>
              <SurahSearchList selectedNumber={surahNumberFromLabel(state.newRange.surah)} onSelect={setNewSurah} />
              <Divider />
              <Overline>Start from āyah</Overline>
              <View style={styles.singleStepperRow}>
                <Stepper
                  value={state.newRange.from}
                  label={`of ${surahAyahCount(state.newRange.surah)}`}
                  onMinus={() => setNewStart(Math.max(1, state.newRange.from - 1))}
                  onPlus={() => setNewStart(Math.min(surahAyahCount(state.newRange.surah), state.newRange.from + 1))}
                />
              </View>
            </Panel>
          </View>
        )}

        {step === "newReminders" && (
          <View>
            <Title>New memorisation{"\n"}reminders</Title>
            <Muted>Its own schedule — gentle nudges to recite the next new āyah from {state.newRange.surah}.</Muted>
            <Stack>
              <ServiceScheduleCard
                icon="leaf-outline"
                title="Today's memorisation"
                subtitle={`${state.perDay} āyāt per day`}
                enabled={state.sabaqOn}
                onToggle={() => onPatch({ sabaqOn: !state.sabaqOn })}
                frequency={state.sabaqFreq}
                onFrequency={(sabaqFreq) => onPatch({ sabaqFreq, freq: sabaqFreq })}
                days={state.sabaqDays}
                onToggleDay={(day) => onPatch({ sabaqDays: { ...state.sabaqDays, [day]: !state.sabaqDays[day] } })}
              />
              <DailyTargetCard
                icon="albums-outline"
                title="Daily new target"
                value={state.perDay}
                unit="āyāt/day"
                note={`Recommended: ${recommendedNewAyat(state.newRange)} āyāt/day for this sūrah`}
                min={1}
                max={20}
                step={1}
                onChange={(perDay) => onPatch({ perDay })}
              />
            </Stack>
          </View>
        )}

        {step === "revisionFocus" && (
          <View>
            <Title>What have you{"\n"}already memorised?</Title>
            <Muted>
              Add the sūrah ranges you know — e.g. An-Naba → An-Nās, or Al-Fātiḥah → Al-Baqarah. They can be separate blocks;
              revision resurfaces all of them.
            </Muted>
            <Stack>
              {state.revisionRanges.map((range, index) => (
                <KnownSurahRangeCard
                  key={range.id}
                  index={index}
                  range={range}
                  onChange={(fromSurah, toSurah) => updateRevisionRange(range.id, fromSurah, toSurah)}
                  onDelete={state.revisionRanges.length > 1 ? () => removeRevisionRange(range.id) : undefined}
                />
              ))}
              <OutlineButton label="Add another range" onPress={addRevisionRange} />
            </Stack>
          </View>
        )}

        {step === "revisionReminders" && (
          <View>
            <Title>Revision{"\n"}reminders</Title>
            <Muted>A separate schedule for strengthening what you already know.</Muted>
            <Stack>
              <ServiceScheduleCard
                icon="repeat-outline"
                title="Revision"
                subtitle={`${state.revisionLoad} āyāt per day`}
                enabled={state.revisionOn}
                onToggle={() => onPatch({ revisionOn: !state.revisionOn })}
                frequency={state.revisionFreq}
                onFrequency={(revisionFreq) => onPatch({ revisionFreq })}
                days={state.revisionDays}
                onToggleDay={(day) => onPatch({ revisionDays: { ...state.revisionDays, [day]: !state.revisionDays[day] } })}
              />
              <DailyTargetCard
                icon="repeat-outline"
                title="Daily revision target"
                value={state.revisionLoad}
                unit="āyāt/day"
                note={revisionRecommendationText(state.revisionRanges)}
                min={5}
                max={300}
                step={5}
                onChange={(revisionLoad) => onPatch({ revisionLoad })}
              />
            </Stack>
          </View>
        )}

        {step === "schedule" && (
          <View>
            <Title>When can we{"\n"}reach you?</Title>
            <Muted>Both reminder services stay inside these hours — nothing arrives outside them.</Muted>
            <ActiveHoursPanel state={state} onPatch={onPatch} />
            <Panel style={[styles.settingRow, styles.scheduleSpacer]}>
              <View style={styles.iconTile}>
                <Ionicons name="notifications-outline" size={20} color={colors.mint} />
              </View>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>Sound & haptics</Text>
                <Text style={styles.cardSubtitle}>Gentle chime when a prompt arrives.</Text>
              </View>
              <Toggle value={state.soundOn} onPress={() => onPatch({ soundOn: !state.soundOn })} />
            </Panel>
          </View>
        )}

        {step === "summary" && (
          <View>
            <Title>You're{"\n"}all set</Title>
            <Muted>Here is your plan. You can fine-tune any of it later from Reminders.</Muted>
            <Stack>
              {wantsNew && (
                <Panel style={styles.summaryCard}>
                  <View style={styles.summaryHead}>
                    <View style={styles.iconTile}>
                      <Ionicons name="leaf-outline" size={18} color={colors.mint} />
                    </View>
                    <Text style={styles.cardTitle}>New memorisation</Text>
                  </View>
                  <Text style={styles.summaryLine}>{state.newRange.label}</Text>
                  <Text style={styles.summaryMeta}>
                    {state.sabaqOn
                      ? `Reminders ${state.sabaqFreq} · ${activeDayCount(state.sabaqDays)} days a week`
                      : "Reminders off"}
                  </Text>
                </Panel>
              )}
              {wantsRevision && (
                <Panel style={styles.summaryCard}>
                  <View style={styles.summaryHead}>
                    <View style={styles.iconTile}>
                      <Ionicons name="repeat-outline" size={18} color={colors.mint} />
                    </View>
                    <Text style={styles.cardTitle}>Revision</Text>
                  </View>
                  {state.revisionRanges.map((range) => (
                    <Text key={range.id} style={styles.summaryLine}>
                      {range.label}
                    </Text>
                  ))}
                  <Text style={styles.summaryMeta}>
                    {state.revisionOn
                      ? `Reminders ${state.revisionFreq} · ${state.revisionLoad} āyāt/day · ${activeDayCount(state.revisionDays)} days a week`
                      : "Reminders off"}
                  </Text>
                </Panel>
              )}
              <Panel style={styles.summaryCard}>
                <View style={styles.summaryHead}>
                  <View style={styles.iconTile}>
                    <Ionicons name="time-outline" size={18} color={colors.mint} />
                  </View>
                  <Text style={styles.cardTitle}>Active hours</Text>
                </View>
                <Text style={styles.summaryLine}>
                  {activeHoursSummary(state)}
                </Text>
              </Panel>
            </Stack>
            <Overline style={styles.spacedOverline}>Accountability</Overline>
            <Stack>
              <OptionCard
                icon="person-outline"
                title="Solo for now"
                subtitle="Keep my memorisation private"
                selected={state.communityMode !== "friends"}
                onPress={() => onPatch({ communityMode: "solo" })}
              />
              <OptionCard
                icon="people-outline"
                title="Add friends later"
                subtitle="Use the Circle tab when you are ready"
                selected={state.communityMode === "friends"}
                onPress={() => onPatch({ communityMode: "friends", boardTab: "friends" })}
              />
            </Stack>
          </View>
        )}
      </ScrollView>
      <View style={[styles.footer, stepIndex === 0 && styles.footerFirst, { paddingBottom: Math.max(14, safeBottom + 10) }]}>
        {stepIndex > 0 && (
          <IconButton name="arrow-back" onPress={goBack} />
        )}
        <PrimaryButton label={buttonLabel} onPress={goNext} style={stepIndex > 0 ? styles.flex : styles.footerSoloButton} />
      </View>
    </View>
  );
}

function HomeScreen({
  state,
  safeTop,
  safeBottom,
  onNav,
  onModes
}: {
  state: AppState;
  safeTop: number;
  safeBottom: number;
  onNav: (screen: Screen) => void;
  onModes: () => void;
}) {
  const dashboard = getDashboardStats(state);

  return (
    <View style={styles.fullScreen}>
      <ScrollView contentContainerStyle={styles.withTabsScroll} showsVerticalScrollIndicator={false}>
        <HeroHeader state={state} safeTop={safeTop} />
        <View style={styles.content}>
          <View style={styles.statRow}>
            <StatCard icon="flame" value={String(dashboard.streak)} label="day streak" />
            <Panel style={styles.statCard}>
              <Text style={styles.statValue}>{dashboard.nextNotification}</Text>
              <Text style={styles.nextPrompt}>next prompt · {dashboard.nextNotificationIn}</Text>
            </Panel>
          </View>
          <Panel>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Overline>Today</Overline>
                <Text style={styles.cardTitle}>
                  {state.sabaqOn ? `${state.perDay} new/day` : "New paused"} · {state.revisionOn ? `${state.revisionLoad} to revise` : "revision off"}
                </Text>
                <Text style={styles.cardSubtitle}>
                  New memorisation continues from {dashboard.currentSurah} {dashboard.rangeLabel}.
                </Text>
              </View>
              <View style={styles.todayRing}>
                <Text style={styles.todayRingValue}>{dashboard.completedCards}</Text>
                <Text style={styles.todayRingLabel}>cards</Text>
              </View>
            </View>
          </Panel>
          <Pressable style={styles.weakButton} onPress={() => onNav("progress")}>
            <View style={styles.iconTileWarn}>
              <Ionicons name="warning-outline" size={20} color={colors.goldDark} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>{dashboard.weakCount} weak āyāt to revise</Text>
              <Text style={styles.cardSubtitle}>{dashboard.weakCount ? `${dashboard.currentSurah}: āyāt ${dashboard.weakAyahs}` : "Nothing flagged yet — marks from sessions show here"}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.faint} />
          </Pressable>
          <Panel>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>This week</Text>
              <Text style={styles.greenStrong}>{dashboard.weeklyCompletedDays} / 7 days</Text>
            </View>
            <View style={styles.weekBars}>
              {dashboard.weeklyDays.map((done, index) => (
                <View key={index} style={[styles.weekBar, { backgroundColor: done ? colors.mint : colors.line }]} />
              ))}
            </View>
            <View style={styles.weekLabels}>
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <Text key={`${day}-${index}`} style={styles.weekLabel}>
                  {day}
                </Text>
              ))}
            </View>
          </Panel>
          <Panel style={styles.notificationSummary}>
            <View style={styles.flex}>
              <Overline>Reminders today</Overline>
              <Text style={styles.cardTitle}>New memorisation and revision</Text>
              <Text style={styles.cardSubtitle}>Custom nudges inside your active hours.</Text>
            </View>
            <IconButton name="notifications-outline" onPress={() => onNav("notif")} />
          </Panel>
          <PrimaryButton label="Start card session" icon="arrow-forward" onPress={onModes} />
        </View>
      </ScrollView>
    </View>
  );
}

function NotificationsScreen({
  state,
  safeTop,
  onPatch,
  onNav
}: {
  state: AppState;
  safeTop: number;
  onPatch: (next: Partial<AppState>) => void;
  onNav: (screen: Screen) => void;
}) {
  const targetOptions = [
    { id: state.newRange.id, label: state.newRange.label },
    ...state.revisionRanges.map((range) => ({ id: range.id, label: range.label }))
  ];
  const togglePlanDay = (key: "sabaqDays" | "revisionDays", day: keyof Days) => {
    onPatch({ [key]: { ...state[key], [day]: !state[key][day] } } as Partial<AppState>);
  };
  const setNewSurah = (surah: SurahInfo) => {
    const range = makeNewRange(surah, 1);
    onPatch({ newRange: range, sabaqTargetId: range.id, ayahFrom: 1, ayahTo: surah.ayahs, cardIndex: 0 });
  };
  const setNewStart = (from: number) => {
    onPatch({
      newRange: { ...state.newRange, from, label: newStartLabel(state.newRange.surah, from) },
      ayahFrom: from,
      cardIndex: 0
    });
  };
  const updateRevisionRange = (id: string, fromSurah: number, toSurah: number) => {
    const revisionRanges = state.revisionRanges.map((range) =>
      range.id === id ? makeSurahRange(fromSurah, toSurah, id) : range
    );
    onPatch({ revisionRanges, revisionProgressIndex: 0, revisionProgressAyah: 1 });
  };
  const addRevisionRange = () => {
    const range = makeSurahRange(1, 1, `rev-${Date.now()}`);
    onPatch({ revisionRanges: [...state.revisionRanges, range], revisionTargetId: range.id, revisionProgressIndex: 0, revisionProgressAyah: 1 });
  };
  const removeRevisionRange = (id: string) => {
    if (state.revisionRanges.length <= 1) return;
    const revisionRanges = state.revisionRanges.filter((range) => range.id !== id);
    onPatch({
      revisionRanges,
      revisionTargetId: state.revisionTargetId === id ? revisionRanges[0].id : state.revisionTargetId,
      revisionProgressIndex: 0,
      revisionProgressAyah: 1
    });
  };

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={[styles.settingsContent, { paddingTop: safeTop + 8 }]} showsVerticalScrollIndicator={false}>
      <Header title="Card settings" onBack={() => onNav("home")} />
      <View style={styles.settingsSection}>
        <Overline>New memorisation</Overline>
        <Panel style={styles.focusPanel}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Current sūrah</Text>
              <Text style={styles.cardSubtitle}>{state.newRange.label}</Text>
            </View>
            <Arabic style={styles.focusArabic}>{state.newRange.arabic}</Arabic>
          </View>
          <SurahSearchList selectedNumber={surahNumberFromLabel(state.newRange.surah)} onSelect={setNewSurah} height={220} />
          <Divider />
          <Overline>Start from āyah</Overline>
          <Stepper
            value={state.newRange.from}
            label={`of ${surahAyahCount(state.newRange.surah)}`}
            onMinus={() => setNewStart(Math.max(1, state.newRange.from - 1))}
            onPlus={() => setNewStart(Math.min(surahAyahCount(state.newRange.surah), state.newRange.from + 1))}
          />
        </Panel>
        <DailyTargetCard
          icon="albums-outline"
          title="Daily new target"
          value={state.perDay}
          unit="āyāt/day"
          note={`Recommended: ${recommendedNewAyat(state.newRange)} āyāt/day for this sūrah`}
          min={1}
          max={20}
          step={1}
          onChange={(perDay) => onPatch({ perDay })}
        />
        <ReminderCard
          icon="leaf-outline"
          title="New reminders"
          subtitle="New sabaq · one āyah at a time"
          quote="Recite this āyah, then continue to the next one."
          enabled={state.sabaqOn}
          onToggle={() => onPatch({ sabaqOn: !state.sabaqOn })}
          active={state.sabaqFreq}
          onFrequency={(sabaqFreq) => onPatch({ sabaqFreq })}
          days={state.sabaqDays}
          onToggleDay={(day) => togglePlanDay("sabaqDays", day)}
          targetId={state.sabaqTargetId}
          targetOptions={[{ id: state.newRange.id, label: state.newRange.label }]}
          onTarget={(sabaqTargetId) => onPatch({ sabaqTargetId })}
        />
      </View>

      <View style={styles.settingsSection}>
        <Overline>Revision</Overline>
        <Panel style={styles.revisionSettingsPanel}>
          <View style={styles.settingRowInner}>
            <View style={styles.iconTile}>
              <Ionicons name="repeat-outline" size={20} color={colors.mint} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Revision sections</Text>
              <Text style={styles.cardSubtitle}>{revisionRecommendationText(state.revisionRanges)}</Text>
            </View>
          </View>
          <Stack>
            {state.revisionRanges.map((range, index) => (
              <KnownSurahRangeCard
                key={range.id}
                index={index}
                range={range}
                onChange={(fromSurah, toSurah) => updateRevisionRange(range.id, fromSurah, toSurah)}
                onDelete={state.revisionRanges.length > 1 ? () => removeRevisionRange(range.id) : undefined}
              />
            ))}
            <OutlineButton label="Add another revision section" onPress={addRevisionRange} />
          </Stack>
        </Panel>
        <DailyTargetCard
          icon="repeat-outline"
          title="Daily revision target"
          value={state.revisionLoad}
          unit="āyāt/day"
          note={revisionRecommendationText(state.revisionRanges)}
          min={5}
          max={300}
          step={5}
          onChange={(revisionLoad) => onPatch({ revisionLoad })}
        />
        <ReminderCard
          icon="repeat-outline"
          title="Revision reminders"
          subtitle="Older hifz · recite in flow"
          quote="Start from this āyah. How far can you continue?"
          enabled={state.revisionOn}
          onToggle={() => onPatch({ revisionOn: !state.revisionOn })}
          active={state.revisionFreq}
          onFrequency={(revisionFreq) => onPatch({ revisionFreq })}
          days={state.revisionDays}
          onToggleDay={(day) => togglePlanDay("revisionDays", day)}
          targetId={state.revisionTargetId}
          targetOptions={targetOptions.filter((target) => target.id !== state.newRange.id)}
          onTarget={(revisionTargetId) => onPatch({ revisionTargetId })}
        />
      </View>

      <View style={styles.settingsSection}>
        <Overline>Display</Overline>
        <ScriptSelector active={state.arabicScript ?? "uthmani"} onChange={(arabicScript) => onPatch({ arabicScript })} />
      </View>

      <View style={styles.settingsSection}>
        <Overline>Reminder delivery</Overline>
        <Panel style={styles.listPanel}>
          <View style={styles.inlineActiveHours}>
            <ActiveHoursPanel state={state} onPatch={onPatch} compact />
          </View>
          <Divider />
          <SwitchRow title="Sound & haptics" subtitle="Gentle chime on prompt" value={state.soundOn} onPress={() => onPatch({ soundOn: !state.soundOn })} />
        </Panel>
        <Panel style={styles.notificationStatus}>
          <Ionicons name="calendar-outline" size={20} color={colors.mint} />
          <View style={styles.flex}>
            <Text style={styles.cardTitle}>{state.notificationsScheduled} local prompts scheduled</Text>
            <Text style={styles.cardSubtitle}>Permission: {state.notificationPermission}. Plan refreshes when you edit settings.</Text>
          </View>
        </Panel>
      </View>
    </ScrollView>
  );
}

function ModeScreen({ state, safeTop, onNav, onStart }: { state: AppState; safeTop: number; onNav: (screen: Screen) => void; onStart: (mode: SessionMode) => void }) {
  const newCount = buildNewDeck(state.newRange, state.arabicScript).length;
  const revisionCount = buildRevisionDeck(state.revisionRanges, state.arabicScript).length;
  const startName = state.newRange.surah.split("·").slice(1).join("·").trim() || state.newRange.surah;
  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={[styles.settingsContent, { paddingTop: safeTop + 8 }]} showsVerticalScrollIndicator={false}>
      <Header title="Choose your session" onBack={() => onNav("home")} />
      <Overline>Three ways to drill</Overline>
      <ModeCard
        icon="leaf-outline"
        title="New Hifz Cards"
        subtitle={`${startName} · next ${newCount} āyāt from āyah ${state.newRange.from}`}
        quote="Recite this āyah, then continue to the next one."
        onPress={() => onStart("new")}
      />
      <ModeCard
        icon="repeat-outline"
        title="Revision Flow Cards"
        subtitle={`${revisionCount} sūrah${revisionCount === 1 ? "" : "s"} from what you've memorised`}
        quote="Start from this āyah. How far can you continue?"
        onPress={() => onStart("revision")}
      />
      <ModeCard
        icon="warning-outline"
        title="Weak Spot Cards"
        subtitle={`Repeat the ${weakDeck.length} āyāt you slipped on`}
        quote="Drill the shaky ones until they settle."
        warn
        onPress={() => onStart("weak")}
      />
    </ScrollView>
  );
}

function SessionScreen({
  state,
  safeTop,
  safeBottom,
  onNav,
  onPatch,
  onStart,
  onMark,
  onStopAt,
  onResumeRevision
}: {
  state: AppState;
  safeTop: number;
  safeBottom: number;
  onNav: (screen: Screen) => void;
  onPatch: (next: Partial<AppState>) => void;
  onStart: (mode: SessionMode) => void;
  onMark: (status: ResultStatus) => void;
  onStopAt: (surah: number, ayah: number, label: string) => void;
  onResumeRevision: () => void;
}) {
  const deck = getDeck(state.sessionMode, { newRange: state.newRange, revisionRanges: state.revisionRanges, history: state.reviewHistory, arabicScript: state.arabicScript });
  const item = deck[Math.min(state.cardIndex, deck.length - 1)];
  const total = deck.length;
  const progress = sessionProgressWidth(state.cardIndex, total);
  const translateX = useRef(new Animated.Value(0)).current;
  const isRev = isRevisionFlow(item);
  const reading = isRev && state.revisionReadAyah > 0;
  const readCard = reading ? ayahCard(item.surah ?? 0, state.revisionReadAyah, state.arabicScript) : null;
  const currentSurahNumber = isRev ? item.surah ?? 0 : surahNumberFromLabel(item.surah ?? "67");
  const currentAyahNumber = reading ? state.revisionReadAyah : isRev ? item.start : item.num;
  const revisionEndAyah = isRev ? item.passage[item.passage.length - 1]?.num ?? item.start : 1;
  const revisionStartAyah = isRev ? Math.min(revisionEndAyah, Math.max(item.start, state.revisionResumeAyah || item.start)) : 1;

  const navigateMemoriseCard = (direction: 1 | -1) => {
    if (direction > 0) {
      if (state.cardIndex >= total - 1) {
        onPatch({ sessionPhase: "done" });
        return;
      }
      onPatch({ cardIndex: state.cardIndex + 1, revealed: false, revisionReadAyah: 0, revisionResumeAyah: 0 });
      return;
    }
    onPatch({ cardIndex: Math.max(0, state.cardIndex - 1), revealed: false, revisionReadAyah: 0, revisionResumeAyah: 0 });
  };

  // Warm the offline audio cache for memorisation/weak decks (small, fixed-size sessions).
  useEffect(() => {
    if (state.sessionPhase !== "running" || state.sessionMode === "revision") return;
    const ayat = deck
      .filter((entry): entry is HifzCard => !isRevisionFlow(entry))
      .map((card) => ({ surah: surahNumberFromLabel(card.surah ?? "67"), ayah: card.num }));
    prefetchAyat(ayat, state.reciterId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.sessionMode, state.sessionPhase, state.reciterId]);

  // Stop any playback when leaving the card.
  useEffect(() => () => stopAyah(), []);

  useEffect(() => {
    if (state.sessionPhase !== "running" || !state.notificationAutoplaySurah || !state.notificationAutoplayAyah) return;
    playAyah(state.notificationAutoplaySurah, state.notificationAutoplayAyah, state.reciterId);
    onPatch({ notificationAutoplaySurah: 0, notificationAutoplayAyah: 0 });
  }, [
    state.sessionPhase,
    state.notificationAutoplaySurah,
    state.notificationAutoplayAyah,
    state.reciterId,
    onPatch
  ]);

  useEffect(() => {
    translateX.setValue(0);
  }, [state.cardIndex, translateX]);

  // Swipe navigates memorisation/weak cards; revision keeps swipes disabled because it has a flow UI.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => translateX.setValue(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (!isRev && Math.abs(gesture.dx) > 120) {
            const direction = gesture.dx > 0 ? 1 : -1;
            if (direction < 0 && state.cardIndex <= 0) {
              Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
              return;
            }
            Animated.timing(translateX, {
              toValue: gesture.dx > 0 ? 520 : -520,
              duration: 220,
              useNativeDriver: true
            }).start(() => navigateMemoriseCard(direction));
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          }
        }
      }),
    [isRev, navigateMemoriseCard, state.cardIndex, translateX]
  );

  if (state.sessionPhase === "done") {
    const values = Object.values(state.results);
    const isRev = state.sessionMode === "revision";
    const sessionRecords = (state.reviewHistory ?? []).slice(0, Math.max(1, Math.min(total, 4)));
    return (
      <ScrollView style={styles.sessionBg} contentContainerStyle={[styles.doneContent, { paddingTop: safeTop + 50, paddingBottom: safeBottom + 30 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.doneCheck}>
          <Ionicons name="checkmark" size={42} color={colors.gold} />
        </View>
        <Text style={styles.doneTitle}>{state.sessionMode === "new" ? "Sabaq locked in" : state.sessionMode === "weak" ? "Weak spots revisited" : "Revision complete"}</Text>
        <Text style={styles.doneSub}>{total} card{total === 1 ? "" : "s"} reviewed</Text>
        <View style={styles.statRow}>
          <ResultBox value={isRev ? values.filter((v) => v === "finished").length : values.filter((v) => v === "solid").length} label={isRev ? "Finished" : "Solid"} color={colors.mint} />
          <ResultBox value={isRev ? values.filter((v) => String(v).startsWith("stuck@")).length : values.filter((v) => v === "shaky").length} label={isRev ? "Got stuck" : "Shaky"} color={colors.goldDark} />
          <ResultBox value={isRev ? total : values.filter((v) => v === "forgot").length} label={isRev ? "Sections" : "Forgot"} color={isRev ? colors.mintDark : colors.red} />
        </View>
        <Panel style={styles.duaPanel}>
          <Arabic style={styles.duaArabic}>رَبِّ زِدْنِى عِلْمًا</Arabic>
          <Text style={styles.cardSubtitle}>“My Lord, increase me in knowledge.” · 20:114</Text>
        </Panel>
        {sessionRecords.length > 0 && (
          <Panel style={styles.sessionReviewPanel}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Saved to review journal</Text>
              <Text style={styles.greenStrong}>{sessionRecords.length} marks</Text>
            </View>
            {sessionRecords.map((record) => (
              <View key={record.id} style={styles.journalRow}>
                <View style={[styles.journalDot, { backgroundColor: resultColor(record.result) }]} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{record.ayahLabel}</Text>
                  <Text style={styles.cardSubtitle}>{resultLabel(record.result)} · {formatHistoryTime(record.timestamp)}</Text>
                </View>
              </View>
            ))}
          </Panel>
        )}
        <OutlineButton label="Review weak āyāt again" onPress={() => onStart("weak")} />
        <PrimaryButton label="Back to home" onPress={() => onNav("home")} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.sessionBg}>
      <View style={[styles.sessionTop, { paddingTop: safeTop + 12 }]}>
        <IconButton name="close" onPress={() => onNav("modes")} />
        <Text style={styles.counterPill}>{state.cardIndex + 1} / {total}</Text>
        <IconButton name="settings-outline" onPress={() => onNav("notif")} />
      </View>
      <View style={styles.sessionProgressTrack}>
        <LinearGradient colors={[colors.mint, "#6aa991"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.sessionProgress, { width: progress }]} />
      </View>
      <View style={[styles.cardStack, !isRev && styles.memoriseCardStack]}>
        <View style={[styles.behindCard, styles.behindCardOne]} />
        <View style={[styles.behindCard, styles.behindCardTwo]} />
        <Animated.View
          {...responder.panHandlers}
          style={[
            styles.practiceCard,
            {
              transform: [
                { translateX },
                {
                  rotate: translateX.interpolate({
                    inputRange: [-180, 180],
                    outputRange: ["-8deg", "8deg"]
                  })
                }
              ]
            }
          ]}
        >
          <Text style={[styles.modeChip, state.sessionMode === "weak" && styles.modeChipWarn]}>
            {state.sessionMode === "new"
              ? "RECITE FROM HERE"
              : state.sessionMode === "weak"
                ? "REPEAT · YOU SLIPPED HERE"
                : reading
                  ? "CARRY ON FROM HERE"
                  : "REVISION · RECITE FROM MEMORY"}
          </Text>
          {reading && readCard ? (
            <AyahCard card={readCard} note="Practise this āyah, then continue the revision from here." />
          ) : isRev ? (
            <RevisionCard
              item={item}
              startAt={revisionStartAyah}
              revealed={state.revealed}
              onReveal={() => onPatch({ revealed: true })}
              onStuck={(ayah) => onStopAt(item.surah ?? 0, ayah, item.label)}
            />
          ) : (
            <AyahCard card={item} />
          )}
          {(!isRev || reading) && (
            <Pressable style={styles.audioButton} onPress={() => playAyah(currentSurahNumber, currentAyahNumber, state.reciterId)}>
              <View style={styles.audioIcon}>
                <Ionicons name="play" size={12} color="#fff" />
              </View>
              <Text style={styles.audioText}>Play recitation</Text>
            </Pressable>
          )}
        </Animated.View>
      </View>
      {!isRev ? (
        <View style={[styles.markRow, { bottom: safeBottom + (Platform.OS === "android" ? 14 : 24) }]}>
          <MarkButton label="Forgot" sub="show soon" color={colors.red} onPress={() => onMark("forgot")} />
          <MarkButton label="Shaky" sub="review later" color={colors.goldDark} onPress={() => onMark("shaky")} />
          <MarkButton label="Solid" sub="space it out" color="#fff" filled onPress={() => onMark("solid")} />
        </View>
      ) : reading ? (
        <View style={[styles.markRow, { bottom: safeBottom + (Platform.OS === "android" ? 14 : 24) }]}>
          <PrimaryButton
            label={`Continue from āyah ${state.revisionReadAyah}`}
            icon="return-down-forward"
            onPress={onResumeRevision}
            style={styles.flex}
          />
        </View>
      ) : !state.revealed ? (
        <View style={[styles.markRow, { bottom: safeBottom + (Platform.OS === "android" ? 14 : 24) }]}>
          <PrimaryButton label="I've recited · mark where I stopped" icon="arrow-down" onPress={() => onPatch({ revealed: true })} style={styles.flex} />
        </View>
      ) : (
        <View style={[styles.markRow, { bottom: safeBottom + (Platform.OS === "android" ? 14 : 24) }]}>
          <PrimaryButton label="I reached the end · finished the sūrah" icon="checkmark" onPress={() => onMark("finished")} style={styles.flex} />
        </View>
      )}
    </View>
  );
}

function ProgressScreen({ state, safeTop, onNav, onStart }: { state: AppState; safeTop: number; onNav: (screen: Screen) => void; onStart: (mode: SessionMode) => void }) {
  const progress = getProgressStats(state.reviewHistory);

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={styles.withTabsScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, { paddingTop: safeTop + 8 }]}>
        <Text style={styles.screenTitle}>Progress</Text>
        <Text style={styles.screenSub}>Sūrah Al-Mulk · Āyāt 12-22</Text>
        <Panel>
          <ProgressLine label="Memorisation" value={`${progress.memorisedPercent}%`} pct={progress.memorisedPercent} color={colors.mint} />
          <ProgressLine label="Revision strength" value={`${progress.revisionPercent}%`} pct={progress.revisionPercent} color={colors.goldDark} />
        </Panel>
        <View style={styles.statRow}>
          <ResultBox value={progress.easy} label="Easy" color={colors.mint} />
          <ResultBox value={progress.weak} label="Weak" color={colors.goldDark} />
          <ResultBox value={progress.failed} label="Failed" color={colors.red} />
        </View>
        <Panel>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Āyah map</Text>
            <Text style={styles.cardSubtitle}>tap any to drill</Text>
          </View>
          <View style={styles.ayahMap}>
            {progress.ayahMap.map(({ label, status }) => (
              <Pressable key={label} style={[styles.ayahCell, ayahCellStyle(status)]} onPress={() => onStart(status === "solid" ? "revision" : "weak")}>
                <Text style={[styles.ayahCellText, status === "empty" && { color: colors.faint }]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Legend />
        </Panel>
        <Panel>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Weak spots due</Text>
            <Text style={styles.greenStrong}>{progress.weakSpots.length} ayat</Text>
          </View>
          <View style={styles.weakSpotList}>
            {progress.weakSpots.slice(0, 4).map((spot) => (
              <Pressable key={spot.ayahId} style={styles.weakSpotRow} onPress={() => onStart("weak")}>
                <View style={styles.weakSpotBadge}>
                  <Text style={styles.weakSpotBadgeText}>{spot.card.ayahNumber}</Text>
                </View>
                <View style={styles.flex}>
                  <Arabic style={styles.weakSpotArabic}>{spot.card.prompt}</Arabic>
                  <Text style={styles.cardSubtitle}>Next due {formatDueDate(spot.nextDueAt)}</Text>
                </View>
                <View style={styles.weakScore}>
                  <Text style={styles.weakScoreValue}>{spot.weaknessScore}</Text>
                  <Text style={styles.pointsLabel}>risk</Text>
                </View>
              </Pressable>
            ))}
          </View>
        </Panel>
        <Panel>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Streak · June</Text>
            <Text style={styles.greenStrong}>14 days</Text>
          </View>
          <View style={styles.calendarGrid}>
            {Array.from({ length: 21 }).map((_, index) => (
              <View
                key={index}
                style={[
                  styles.calendarDay,
                  { backgroundColor: [0, 8, 20].includes(index) ? colors.line : index % 4 === 1 ? "#cfe6dd" : colors.mint },
                  index === 19 && styles.todayOutline
                ]}
              />
            ))}
          </View>
        </Panel>
        <PrimaryButton label="See weekly recap" icon="arrow-forward" onPress={() => onNav("recap")} />
      </View>
    </ScrollView>
  );
}

function BoardScreen({ state, safeTop, onPatch }: { state: AppState; safeTop: number; onPatch: (next: Partial<AppState>) => void }) {
  const topThree = leaderboardEntries.slice(0, 3);
  const groupCards = leaderboardEntries.reduce((total, person) => total + person.cardsCompleted, 0);

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={styles.withTabsScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, { paddingTop: safeTop + 8 }]}>
        <Text style={styles.screenTitle}>Circle</Text>
        <Text style={styles.screenSub}>Ranked by effort and consistency, not how much you know.</Text>
        <Segmented
          values={["friends", "class"]}
          labels={["Friends", "My Class"]}
          active={state.boardTab}
          onChange={(boardTab) => onPatch({ boardTab: boardTab as AppState["boardTab"] })}
        />
        <View style={styles.podium}>
          <Podium name={topThree[1].name} rank={2} points={topThree[1].weeklyPoints} height={46} color="#cfe0d8" />
          <Podium name={topThree[0].name} rank={1} points={topThree[0].weeklyPoints} height={66} color={colors.mint} crown />
          <Podium name={topThree[2].name} rank={3} points={topThree[2].weeklyPoints} height={36} color={colors.gold} />
        </View>
        <Panel style={styles.leaderList}>
          {leaderboardEntries.map((person, index) => (
            <View key={person.userId} style={[styles.leaderRow, index < leaderboardEntries.length - 1 && styles.leaderBorder]}>
              <Text style={styles.rankText}>{index + 1}</Text>
              <View style={[styles.avatar, { backgroundColor: person.color }]}>
                <Text style={styles.avatarText}>{person.initial}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, person.name === "You" && { color: colors.goldDark }]}>{person.name}</Text>
                <Text style={styles.cardSubtitle}>{person.streak} day streak · {person.cardsCompleted} cards · {person.revisionPoints} revision pts</Text>
              </View>
              <View style={styles.pointsBox}>
                <Text style={styles.points}>{person.weeklyPoints}</Text>
                <Text style={styles.pointsLabel}>pts</Text>
              </View>
            </View>
          ))}
        </Panel>
        <Panel style={styles.groupGoal}>
          <View style={styles.rowBetween}>
            <Text style={styles.groupTitle}>Group goal · this week</Text>
            <Text style={styles.groupMeta}>{groupCards} / 500 cards</Text>
          </View>
          <View style={styles.groupTrack}>
            <View style={[styles.groupFill, { width: `${Math.min(100, Math.round((groupCards / 500) * 100))}%` }]} />
          </View>
          <Text style={styles.groupText}>{Math.max(0, 500 - groupCards)} cards to go together. Every card counts. Keep showing up.</Text>
        </Panel>
      </View>
    </ScrollView>
  );
}

function RecapScreen({ state, safeTop, onNav }: { state: AppState; safeTop: number; onNav: (screen: Screen) => void }) {
  const recap = getWeeklyRecap(state.reviewHistory);
  const shareRecap = () => {
    Share.share({
      message: `Hifz Cards weekly recap: ${recap.cardsTested} cards reviewed, ${recap.ayahsRevised} ayat revised, ${recap.newMemorised} new memorised, ${recap.effortPoints} effort points.`
    }).catch(() => undefined);
  };

  return (
    <ScrollView style={styles.recapScreen} contentContainerStyle={styles.recapContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.recapHeader, { paddingTop: safeTop + 12 }]}>
        <IconButton name="arrow-back" onPress={() => onNav("progress")} dark />
        <Text style={styles.recapHeaderText}>Weekly recap</Text>
        <View style={{ width: 38 }} />
      </View>
      <Panel style={styles.shareCard}>
        <View style={styles.rowBetween}>
          <Overline>Week of 15 June</Overline>
          <View style={styles.miniLogo}>
            <Text style={styles.miniLogoText}>ﷺ</Text>
          </View>
        </View>
        <Text style={styles.bigNumber}>{recap.cardsTested}</Text>
        <Text style={styles.shareSub}>cards reviewed this week</Text>
        <Divider />
        {[
          ["barbell-outline", "Strongest range:", recap.strongestRange],
          ["radio-button-on-outline", "Weakest:", recap.weakestRange],
          ["trending-up-outline", "Improved:", recap.improved],
          ["flame-outline", "Streak:", recap.streakMaintained ? "maintained all 7 days" : "ready to rebuild"]
        ].map(([icon, lead, text]) => (
          <View key={lead} style={styles.insightRow}>
            <Ionicons name={icon as never} size={18} color={colors.mint} />
            <Text style={styles.insightText}>
              <Text style={styles.bold}>{lead} </Text>
              {text}
            </Text>
          </View>
        ))}
        <View style={styles.recapAyah}>
          <Arabic style={styles.recapAyahText}>فَٱذْكُرُونِىٓ أَذْكُرْكُمْ</Arabic>
          <Text style={styles.darkQuoteText}>“So remember Me; I will remember you.” · 2:152</Text>
        </View>
      </Panel>
      <PrimaryButton label="Share recap card" icon="share-outline" onPress={shareRecap} style={{ backgroundColor: colors.gold }} textColor={colors.green} />
      <View style={styles.recapStats}>
        <RecapStat value={String(recap.ayahsRevised)} label="āyāt revised" />
        <RecapStat value={`+${recap.newMemorised}`} label="new memorised" />
        <RecapStat value={String(recap.effortPoints)} label="effort pts" />
      </View>
    </ScrollView>
  );
}

function ProfileScreen({
  state,
  safeTop,
  onPatch,
  onNav
}: {
  state: AppState;
  safeTop: number;
  onPatch: (next: Partial<AppState>) => void;
  onNav: (screen: Screen) => void;
}) {
  const dashboard = getDashboardStats(state);
  const progress = getProgressStats(state.reviewHistory);
  const history = state.reviewHistory ?? [];
  const communityLabel = state.communityMode === "class" ? "Class circle" : state.communityMode === "friends" ? "Friends circle" : "Private mode";
  const selectedReciter = reciterById(state.reciterId);
  const [reciterDropdownOpen, setReciterDropdownOpen] = useState(false);
  const clearHistory = () => {
    Alert.alert("Clear review journal?", "This removes saved local session marks on this device.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: () => onPatch({ reviewHistory: [], results: {} }) }
    ]);
  };
  const restartOnboarding = () => {
    Alert.alert("Restart onboarding?", "You can review and change your setup without losing your review journal.", [
      { text: "Cancel", style: "cancel" },
      { text: "Restart", onPress: () => onPatch({ screen: "onboarding", onbStep: 0 }) }
    ]);
  };

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={styles.withTabsScroll} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={[colors.green2, "#0c3128"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.profileHero, { paddingTop: safeTop + 18 }]}>
        <View style={styles.profileRow}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileInitial}>Y</Text>
          </View>
          <View>
            <Text style={styles.profileName}>Yusuf Rahman</Text>
            <Text style={styles.profileSub}>{communityLabel} · memorising since Muharram 1447</Text>
          </View>
        </View>
        <View style={styles.profileStats}>
          <ProfileStat value={String(dashboard.securedCount)} label="āyāt secured" />
          <ProfileStat value={String(history.length)} label="journal marks" />
          <ProfileStat value={String(dashboard.streak)} label="day streak" />
        </View>
      </LinearGradient>
      <View style={styles.content}>
        <Overline>Current goal</Overline>
        <Panel style={styles.goalPanel}>
          <View>
            <Text style={styles.cardTitle}>Finish {dashboard.currentSurah}</Text>
            <Text style={styles.cardSubtitle}>{dashboard.securedCount} of {dashboard.totalInRange} āyāt secured · {progress.weakSpots.length} weak due</Text>
          </View>
          <Arabic style={styles.goalArabic}>{dashboard.currentArabic}</Arabic>
        </Panel>
        <Panel>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Recent review journal</Text>
            <Text style={styles.greenStrong}>{history.length} saved</Text>
          </View>
          {(history.length ? history.slice(0, 4) : [
            { id: "empty", ayahLabel: "No session marks yet", result: "Start a card session", timestamp: new Date().toISOString() }
          ]).map((record) => (
            <View key={record.id} style={styles.journalRow}>
              <View style={[styles.journalDot, { backgroundColor: history.length ? resultColor(record.result) : colors.lineDark }]} />
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{record.ayahLabel}</Text>
                <Text style={styles.cardSubtitle}>{history.length ? `${resultLabel(record.result)} · ${formatHistoryTime(record.timestamp)}` : "Your results will appear here automatically."}</Text>
              </View>
            </View>
          ))}
        </Panel>
        <Overline style={styles.spacedOverline}>Settings</Overline>
        <Panel style={styles.reciterPanel}>
          <Pressable style={styles.settingRowInner} onPress={() => setReciterDropdownOpen((open) => !open)}>
            <View style={styles.iconTile}>
              <Ionicons name="mic-outline" size={20} color={colors.mint} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Reciter</Text>
              <Text style={styles.cardSubtitle}>{selectedReciter.name} · used for every playback button</Text>
            </View>
            <Ionicons name={reciterDropdownOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />
          </Pressable>
          {reciterDropdownOpen && (
            <View style={styles.reciterDropdown}>
              {reciters.map((reciter, index) => {
                const selected = state.reciterId === reciter.id;
                return (
                  <Pressable
                    key={reciter.id}
                    style={[styles.reciterOption, selected && styles.reciterOptionSelected, index < reciters.length - 1 && styles.reciterOptionBorder]}
                    onPress={() => {
                      onPatch({ reciterId: reciter.id });
                      setReciterDropdownOpen(false);
                    }}
                  >
                    <View style={styles.flex}>
                      <Text style={[styles.reciterName, selected && styles.reciterTextSelected]}>{reciter.name}</Text>
                    </View>
                    {selected && <Ionicons name="checkmark-circle" size={18} color={colors.gold} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </Panel>
        <Panel style={styles.listPanel}>
          <SettingsRow icon="notifications-outline" label="Reminder preferences" onPress={() => onNav("notif")} />
          <Divider />
          <SettingsRow icon="people-outline" label="Friends & classes" meta="4 friends" onPress={() => onNav("board")} />
          <Divider />
          <SettingsRow icon="radio-button-on-outline" label="Memorisation focus" onPress={() => onPatch({ screen: "onboarding", onbStep: 2 })} />
          <Divider />
          <SettingsRow icon="refresh-outline" label="Restart onboarding" meta="setup" onPress={restartOnboarding} />
          <Divider />
          <SettingsRow icon="trash-outline" label="Clear review journal" meta={`${history.length} marks`} onPress={clearHistory} />
        </Panel>
        <Panel style={styles.premium}>
          <Text style={styles.premiumMark}>ﷺ</Text>
          <Text style={styles.premiumChip}>REVISION PLAN</Text>
          <Text style={styles.premiumTitle}>Tune your reminders</Text>
          <Text style={styles.premiumBody}>Adjust active hours, sabaq frequency, revision days, and weak-ayah prioritisation from one calm control surface.</Text>
          <PrimaryButton label="Open reminder plan" onPress={() => onNav("notif")} style={{ backgroundColor: colors.gold }} textColor={colors.green} />
        </Panel>
      </View>
    </ScrollView>
  );
}

function HeroHeader({ state, safeTop }: { state: AppState; safeTop: number }) {
  const dashboard = getDashboardStats(state);

  return (
    <LinearGradient colors={[colors.green2, "#0c3128"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { paddingTop: safeTop + 18 }]}>
      <View style={styles.heroMain}>
        <View style={styles.flex}>
          <Text style={styles.heroOverline}>Currently memorising</Text>
          <Text style={styles.heroTitle}>{dashboard.currentSurah}</Text>
          <Text style={styles.heroSub}>{dashboard.rangeLabel} · {dashboard.securedCount} secured</Text>
        </View>
        <Arabic style={styles.heroArabic}>{dashboard.currentArabic}</Arabic>
      </View>
      <View style={styles.heroTrack}>
        <View style={[styles.heroFill, { width: `${dashboard.memorisedPercent}%` }]} />
      </View>
      <View style={styles.rowBetween}>
        <Text style={styles.heroGold}>{dashboard.memorisedPercent}% memorised</Text>
        <Text style={styles.heroSub}>{dashboard.securedCount} of {dashboard.totalInRange} āyāt secured</Text>
      </View>
    </LinearGradient>
  );
}

function AyahCard({ card, note }: { card: HifzCard; note?: string }) {
  const surahName = card.surah ? card.surah.split("·").slice(1).join("·").trim() || card.surah : "Al-Mulk";
  return (
    <ScrollView style={styles.ayahCardScroll} contentContainerStyle={styles.ayahCardBody} showsVerticalScrollIndicator={false}>
      <Text style={styles.sessionMeta}>Sūrah {surahName} · Āyah {card.num}</Text>
      {!!note && <Text style={styles.continueNote}>{note}</Text>}
      <Arabic style={styles.memoriseArabic}>{card.full}</Arabic>
      {!!card.tr && (
        <View style={styles.revealBlock}>
          <Divider />
          <Text style={styles.translation}>{card.tr}</Text>
        </View>
      )}
    </ScrollView>
  );
}

function RevisionCard({
  item,
  startAt,
  revealed,
  onReveal,
  onStuck
}: {
  item: RevisionFlow;
  startAt: number;
  revealed: boolean;
  onReveal: () => void;
  onStuck: (ayah: number) => void;
}) {
  const [showFromJuz, setShowFromJuz] = useState(0);
  const passage = item.passage.filter((ayah) => ayah.num >= startAt);
  const availableJuz = Array.from(new Set(passage.map((ayah) => juzForLocation(item.surah ?? 1, ayah.num))));
  const visiblePassage = showFromJuz ? passage.filter((ayah) => juzForLocation(item.surah ?? 1, ayah.num) >= showFromJuz) : passage;
  const firstAyah = visiblePassage[0] ?? passage[0] ?? item.passage[0];
  const currentJuz = juzForLocation(item.surah ?? 1, startAt);
  return (
    <View style={styles.revisionBody}>
      <Text style={styles.sessionMeta}>Sūrah {item.label} · from āyah {startAt}</Text>
      {!revealed ? (
        <Pressable style={styles.revisionStart} onPress={onReveal}>
          <Arabic style={styles.promptArabic}>{firstAyah?.text}</Arabic>
          <Text style={styles.revisionPill}>Recite from memory — how far can you go?</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.stuckHint}>Tap the next āyah you get stuck at ↓</Text>
          <View style={styles.juzJumpPanel}>
            <Text style={styles.juzHint}>Current place: Juz {currentJuz}. Hide earlier Juz to jump faster.</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.juzChipRail}>
              <Pressable style={[styles.juzChip, showFromJuz === 0 && styles.juzChipSelected]} onPress={() => setShowFromJuz(0)}>
                <Text style={[styles.juzChipText, showFromJuz === 0 && styles.juzChipTextSelected]}>Show all</Text>
              </Pressable>
              {availableJuz.map((juz) => (
                <Pressable key={juz} style={[styles.juzChip, showFromJuz === juz && styles.juzChipSelected]} onPress={() => setShowFromJuz(juz)}>
                  <Text style={[styles.juzChipText, showFromJuz === juz && styles.juzChipTextSelected]}>Juz {juz}+</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <ScrollView showsVerticalScrollIndicator style={styles.revisionScroll} contentContainerStyle={styles.revisionScrollBody}>
            {visiblePassage.map((ayah, index) => {
              const juz = juzForLocation(item.surah ?? 1, ayah.num);
              const previous = visiblePassage[index - 1];
              const showBreak = index === 0 || (previous && juzForLocation(item.surah ?? 1, previous.num) !== juz);
              return (
                <React.Fragment key={ayah.num}>
                  {showBreak && (
                    <View style={styles.juzDivider}>
                      <View style={styles.juzDividerLine} />
                      <Text style={styles.juzDividerText}>Juz {juz}</Text>
                      <View style={styles.juzDividerLine} />
                    </View>
                  )}
                  <Pressable style={styles.passageRow} onPress={() => onStuck(ayah.num)}>
                    <Text style={styles.ayahBadge}>{ayah.num}</Text>
                    <Arabic style={styles.passageText}>{ayah.text}</Arabic>
                  </Pressable>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}

function BottomTabs({ screen, safeBottom, onNav }: { screen: Screen; safeBottom: number; onNav: (screen: Screen) => void }) {
  const tabs: Array<[Screen, string, string]> = [
    ["home", "home-outline", "Home"],
    ["progress", "bar-chart-outline", "Progress"],
    ["board", "trophy-outline", "Circle"],
    ["profile", "person-outline", "Profile"]
  ];
  return (
    <View style={[styles.tabs, { paddingBottom: Platform.OS === "android" ? Math.max(26, safeBottom + 18) : Math.max(14, safeBottom + 8) }]}>
      {tabs.map(([tab, icon, label]) => {
        const active = screen === tab;
        return (
          <Pressable key={tab} style={styles.tabButton} onPress={() => onNav(tab)}>
            <Ionicons name={icon as never} size={23} color={active ? colors.green : colors.faint} />
            <Text style={[styles.tabLabel, { color: active ? colors.green : colors.faint }]}>{label}</Text>
          </Pressable>
        );
      })}
      <View style={styles.homeIndicator} />
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <IconButton name="arrow-back" onPress={onBack} />
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

function Panel({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.onboardingTitle}>{children}</Text>;
}

function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

function Arabic({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const script = React.useContext(ArabicFontContext);
  return <Text style={[styles.arabic, script === "indopak" && styles.indopakArabic, style]}>{children}</Text>;
}

function Overline({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.overline, style]}>{children}</Text>;
}

function Stack({ children }: { children: React.ReactNode }) {
  return <View style={styles.stack}>{children}</View>;
}

function Divider() {
  return <View style={styles.divider} />;
}

function PrimaryButton({
  label,
  onPress,
  style,
  textColor = "#fff",
  icon
}: {
  label: string;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  icon?: string;
}) {
  return (
    <Pressable style={[styles.primaryButton, style]} onPress={onPress}>
      <Text style={[styles.primaryText, { color: textColor }]} numberOfLines={2}>
        {label}
      </Text>
      {icon && <Ionicons name={icon as never} size={17} color={textColor} />}
    </Pressable>
  );
}

function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.outlineButton} onPress={onPress}>
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  );
}

function IconButton({ name, onPress, dark }: { name: string; onPress: () => void; dark?: boolean }) {
  return (
    <Pressable style={[styles.iconButton, dark && styles.iconButtonDark]} onPress={onPress}>
      <Ionicons name={name as never} size={20} color={dark ? "#cfe3db" : colors.muted} />
    </Pressable>
  );
}

function OptionCard({
  icon,
  title,
  subtitle,
  selected,
  onPress
}: {
  icon: string;
  title: string;
  subtitle: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.optionCard, selected && styles.selectedCard]} onPress={onPress}>
      <View style={[styles.iconTile, selected && { backgroundColor: colors.green }]}>
        <Ionicons name={icon as never} size={21} color={selected ? colors.gold : colors.mint} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

function InfoRow({ icon, title, text }: { icon: string; title: string; text: string }) {
  return (
    <Panel style={styles.infoRow}>
      <View style={styles.iconTile}>
        <Ionicons name={icon as never} size={20} color={colors.mint} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{text}</Text>
      </View>
    </Panel>
  );
}

function ServiceScheduleCard({
  icon,
  title,
  subtitle,
  enabled,
  frequency,
  onToggle,
  onFrequency,
  days,
  onToggleDay,
  warn
}: {
  icon: string;
  title: string;
  subtitle: string;
  enabled: boolean;
  frequency: string;
  onToggle: () => void;
  onFrequency: (value: string) => void;
  days: Days;
  onToggleDay: (day: keyof Days) => void;
  warn?: boolean;
}) {
  return (
    <Panel style={styles.reminderCard}>
      <View style={styles.settingRowInner}>
        <View style={warn ? styles.iconTileWarn : styles.iconTile}>
          <Ionicons name={icon as never} size={20} color={warn ? colors.goldDark : colors.mint} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <Toggle value={enabled} onPress={onToggle} />
      </View>
      {enabled && (
        <>
          <Overline>How often</Overline>
          <FrequencyScroller active={frequency} onChange={onFrequency} />
          <Overline>Days</Overline>
          <DayPicker days={days} onToggle={onToggleDay} />
        </>
      )}
    </Panel>
  );
}

function DailyTargetCard({
  icon,
  title,
  value,
  unit,
  note,
  min,
  max,
  step,
  onChange
}: {
  icon: string;
  title: string;
  value: number;
  unit: string;
  note: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  const quickValues = targetQuickValues(min, max);
  return (
    <Panel style={styles.dailyTargetCard}>
      <View style={styles.settingRowInner}>
        <View style={styles.iconTile}>
          <Ionicons name={icon as never} size={20} color={colors.mint} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{note}</Text>
        </View>
      </View>
      <View style={styles.dailyTargetControls}>
        <Stepper
          value={value}
          label={unit}
          onMinus={() => onChange(Math.max(min, value - step))}
          onPlus={() => onChange(Math.min(max, value + step))}
        />
        <ScrollView horizontal style={styles.targetQuickScroll} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.targetQuickRail}>
          {quickValues.map((quickValue) => {
            const selected = value === quickValue;
            return (
              <Pressable key={quickValue} style={[styles.targetQuickChip, selected && styles.targetQuickChipSelected]} onPress={() => onChange(quickValue)}>
                <Text style={[styles.targetQuickText, selected && styles.targetQuickTextSelected]}>{quickValue}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Panel>
  );
}

function Segmented({
  values,
  labels,
  active,
  onChange
}: {
  values: string[];
  labels: string[];
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.segmented}>
      {values.map((value, index) => {
        const selected = active === value;
        return (
          <Pressable key={value} style={[styles.segmentButton, selected && styles.segmentSelected]} onPress={() => onChange(value)}>
            <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>{labels[index]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Stepper({ value, label, onMinus, onPlus }: { value: number; label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepperButton} onPress={onMinus}>
        <Text style={styles.stepperSign}>−</Text>
      </Pressable>
      <View style={styles.stepperMid}>
        <Text style={styles.stepperValue}>{value}</Text>
        <Text style={styles.stepperLabel}>{label}</Text>
      </View>
      <Pressable style={styles.stepperButton} onPress={onPlus}>
        <Text style={styles.stepperSign}>+</Text>
      </Pressable>
    </View>
  );
}

function surahLabel(surah: SurahInfo) {
  return `${surah.number} · ${surah.english}`;
}

function surahNumberFromLabel(label: string) {
  return Number(label.split("·")[0]?.trim()) || 1;
}

function surahByLabel(label: string) {
  return allSurahs.find((surah) => surah.number === surahNumberFromLabel(label));
}

function surahByNumber(number: number) {
  return allSurahs.find((surah) => surah.number === number);
}

function surahAyahCount(label: string) {
  return surahByLabel(label)?.ayahs ?? 30;
}

// New memorisation is a single starting point — you keep going to the end.
function newStartLabel(surah: string, from: number) {
  return from <= 1 ? `${surah} · from the start` : `${surah} · from āyah ${from}`;
}

function makeNewRange(surah: SurahInfo, from: number): MemorisationRange {
  const label = surahLabel(surah);
  return { id: `new-${surah.number}`, surah: label, arabic: surah.arabic, from, to: surah.ayahs, label: newStartLabel(label, from) };
}

// Revision ranges span whole sūrahs (e.g. An-Naba → An-Nās), and can be disconnected.
function surahRangeLabel(fromSurah: number, toSurah: number) {
  const from = surahByNumber(fromSurah);
  const to = surahByNumber(toSurah);
  if (!from || !to) return "Select a range";
  if (from.number === to.number) return `${from.number} · ${from.english}`;
  return `${from.english} → ${to.english}`;
}

function makeSurahRange(fromSurah: number, toSurah: number, id: string): SurahRange {
  return { id, fromSurah, toSurah, label: surahRangeLabel(fromSurah, toSurah) };
}

function activeDayCount(days: Days) {
  return (Object.values(days) as boolean[]).filter(Boolean).length;
}

function rangeAyahCount(range: SurahRange) {
  const from = Math.min(range.fromSurah, range.toSurah);
  const to = Math.max(range.fromSurah, range.toSurah);
  return allSurahs
    .filter((surah) => surah.number >= from && surah.number <= to)
    .reduce((total, surah) => total + surah.ayahs, 0);
}

function knownRevisionAyahs(ranges: SurahRange[]) {
  return ranges.reduce((total, range) => total + rangeAyahCount(range), 0);
}

function targetQuickValues(min: number, max: number) {
  const base = max <= 20 ? [1, 2, 3, 5, 10, 15, 20] : [5, 10, 15, 30, 45, 60, 100, 150, 200, 250, 300];
  return base.filter((value) => value >= min && value <= max);
}

function surahStartOrdinal(surahNumber: number) {
  return allSurahs
    .filter((surah) => surah.number < surahNumber)
    .reduce((total, surah) => total + surah.ayahs, 0);
}

function ayahOrdinal(surahNumber: number, ayahNumber: number) {
  return surahStartOrdinal(surahNumber) + ayahNumber;
}

function juzPositionForLocation(surahNumber: number, ayahNumber: number) {
  const ordinal = ayahOrdinal(surahNumber, ayahNumber);
  const starts = juzStarts.map(([surah, ayah], index) => ({
    juz: index + 1,
    ordinal: ayahOrdinal(surah, ayah)
  }));
  const current = starts.reduce((best, start) => (start.ordinal <= ordinal ? start : best), starts[0]);
  const next = starts.find((start) => start.juz === current.juz + 1);
  if (!next) return 30;
  const span = Math.max(1, next.ordinal - current.ordinal);
  return current.juz + Math.max(0, Math.min(0.999, (ordinal - current.ordinal) / span));
}

function estimatedJuzFromRanges(ranges: SurahRange[]) {
  return ranges.reduce((total, range) => {
    const from = Math.min(range.fromSurah, range.toSurah);
    const to = Math.max(range.fromSurah, range.toSurah);
    const toInfo = surahByNumber(to);
    if (!toInfo) return total;
    const start = juzPositionForLocation(from, 1);
    const end = juzPositionForLocation(to, toInfo.ayahs);
    return total + Math.max(0.25, end - start);
  }, 0);
}

function formatQuarterJuz(value: number) {
  const rounded = Math.max(0.25, Math.round(value * 4) / 4);
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(/\.25$/, ".25").replace(/\.5$/, ".5").replace(/\.75$/, ".75");
}

function recommendedRevisionAyat(ranges: SurahRange[]) {
  const ayahs = knownRevisionAyahs(ranges);
  if (!ayahs) return 15;
  return Math.max(5, Math.round(ayahs / 7 / 5) * 5);
}

function revisionRecommendationText(ranges: SurahRange[]) {
  const juz = estimatedJuzFromRanges(ranges);
  const dailyJuz = Math.max(0.25, juz / 7);
  const roundedDailyJuz = dailyJuz >= 1 ? Math.round(dailyJuz * 2) / 2 : Math.round(dailyJuz * 4) / 4;
  return `Recommended: about ${formatQuarterJuz(roundedDailyJuz)} juz/day (${recommendedRevisionAyat(ranges)} āyāt/day) for ${formatQuarterJuz(juz)} juz known`;
}

function recommendedNewAyat(range: MemorisationRange) {
  const remaining = Math.max(1, (surahAyahCount(range.surah) || range.to) - range.from + 1);
  if (remaining <= 20) return 2;
  if (remaining <= 80) return 3;
  return 5;
}

const juzStarts = [
  [1, 1],
  [2, 142],
  [2, 253],
  [3, 93],
  [4, 24],
  [4, 148],
  [5, 82],
  [6, 111],
  [7, 88],
  [8, 41],
  [9, 93],
  [11, 6],
  [12, 53],
  [15, 1],
  [17, 1],
  [18, 75],
  [21, 1],
  [23, 1],
  [25, 21],
  [27, 56],
  [29, 46],
  [33, 31],
  [36, 28],
  [39, 32],
  [41, 47],
  [46, 1],
  [51, 31],
  [58, 1],
  [67, 1],
  [78, 1]
] as const;

function juzForLocation(surah: number, ayah: number) {
  let current = 1;
  juzStarts.forEach(([startSurah, startAyah], index) => {
    if (surah > startSurah || (surah === startSurah && ayah >= startAyah)) current = index + 1;
  });
  return current;
}

function SurahSearchList({
  selectedNumber,
  onSelect,
  height = 320
}: {
  selectedNumber: number;
  onSelect: (surah: SurahInfo) => void;
  height?: number;
}) {
  const [query, setQuery] = React.useState("");
  const needle = query.trim().toLowerCase();
  const filtered = needle
    ? allSurahs.filter((surah) => `${surah.number} ${surah.english} ${surah.arabic}`.toLowerCase().includes(needle))
    : allSurahs;

  return (
    <View style={styles.surahPicker}>
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search all 114 sūrahs"
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
          autoCorrect={false}
        />
      </View>
      <ScrollView
        style={[styles.surahList, { height }]}
        nestedScrollEnabled
        showsVerticalScrollIndicator
        keyboardShouldPersistTaps="handled"
      >
        {filtered.map((surah) => {
          const active = surah.number === selectedNumber;
          return (
            <Pressable
              key={surah.number}
              style={[styles.surahRow, active && styles.surahRowSelected]}
              onPress={() => onSelect(surah)}
            >
              <Text style={[styles.surahNumber, active && styles.surahSelectedText]}>{surah.number}</Text>
              <View style={styles.flex}>
                <Text style={[styles.cardTitle, active && styles.surahSelectedText]}>{surah.english}</Text>
                <Text style={[styles.cardSubtitle, active && styles.surahSelectedSubtext]}>{surah.ayahs} āyāt</Text>
              </View>
              <Arabic style={[styles.surahRowArabic, active && styles.surahSelectedText]}>{surah.arabic}</Arabic>
            </Pressable>
          );
        })}
        {filtered.length === 0 && <Text style={styles.surahEmpty}>No sūrah matches “{query.trim()}”.</Text>}
      </ScrollView>
    </View>
  );
}

function SurahEndpoint({
  label,
  surah,
  active,
  onPress
}: {
  label: string;
  surah: SurahInfo | undefined;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable style={[styles.rangePick, active && styles.rangePickActive]} onPress={onPress}>
      <Text style={styles.rangePickLabel}>{label}</Text>
      <Text style={styles.rangePickName} numberOfLines={1}>
        {surah ? surah.english : "—"}
      </Text>
      <Arabic style={styles.rangePickArabic}>{surah ? surah.arabic : ""}</Arabic>
    </Pressable>
  );
}

function KnownSurahRangeCard({
  index,
  range,
  onChange,
  onDelete
}: {
  index: number;
  range: SurahRange;
  onChange: (fromSurah: number, toSurah: number) => void;
  onDelete?: () => void;
}) {
  const [open, setOpen] = React.useState<null | "from" | "to">(null);
  const fromSurah = surahByNumber(range.fromSurah);
  const toSurah = surahByNumber(range.toSurah);
  const span = range.toSurah - range.fromSurah + 1;

  return (
    <Panel style={styles.rangePanel}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Overline>Range {index + 1}</Overline>
          <Text style={styles.cardTitle}>{range.label}</Text>
          <Text style={styles.cardSubtitle}>{span} sūrah{span === 1 ? "" : "s"}</Text>
        </View>
        {onDelete && (
          <Pressable style={styles.deleteRangeButton} onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.red} />
          </Pressable>
        )}
      </View>
      <View style={styles.rangePickRow}>
        <SurahEndpoint
          label="FROM SŪRAH"
          surah={fromSurah}
          active={open === "from"}
          onPress={() => setOpen((value) => (value === "from" ? null : "from"))}
        />
        <Text style={styles.arrowText}>→</Text>
        <SurahEndpoint
          label="TO SŪRAH"
          surah={toSurah}
          active={open === "to"}
          onPress={() => setOpen((value) => (value === "to" ? null : "to"))}
        />
      </View>
      {open && (
        <SurahSearchList
          selectedNumber={open === "from" ? range.fromSurah : range.toSurah}
          height={260}
          onSelect={(surah) => {
            if (open === "from") {
              onChange(surah.number, Math.max(surah.number, range.toSurah));
            } else {
              onChange(Math.min(range.fromSurah, surah.number), surah.number);
            }
            setOpen(null);
          }}
        />
      )}
    </Panel>
  );
}

const frequencyOptions = ["20 min", "30 min", "1 hour", "2 hours", "3 hours", "6 hours", "daily"];

function FrequencyScroller({ active, onChange }: { active: string; onChange: (value: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frequencyRail}>
      {frequencyOptions.map((option) => {
        const selected = active === option;
        return (
          <Pressable key={option} style={[styles.frequencyChip, selected && styles.frequencyChipSelected]} onPress={() => onChange(option)}>
            <Text style={[styles.frequencyText, selected && styles.frequencyTextSelected]}>{option}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TargetScroller({
  options,
  active,
  onChange
}: {
  options: Array<{ id: string; label: string }>;
  active: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.frequencyRail}>
      {options.map((option) => {
        const selected = active === option.id;
        return (
          <Pressable key={option.id} style={[styles.targetChip, selected && styles.frequencyChipSelected]} onPress={() => onChange(option.id)}>
            <Text style={[styles.frequencyText, selected && styles.frequencyTextSelected]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function TimeBlock({ label, time, hint }: { label: string; time: string; hint: string }) {
  return (
    <View style={styles.timeBlock}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeText}>{time}</Text>
      <Text style={styles.timeHint}>{hint}</Text>
    </View>
  );
}

function ActiveHoursPanel({
  state,
  onPatch,
  compact
}: {
  state: AppState;
  onPatch: (next: Partial<AppState>) => void;
  compact?: boolean;
}) {
  const mode = state.activeHoursMode ?? (state.splitActiveHours ? "weekend" : "same");
  const setMode = (activeHoursMode: AppState["activeHoursMode"]) =>
    onPatch({
      activeHoursMode,
      splitActiveHours: activeHoursMode === "weekend",
      weekdayStartHour: state.weekdayStartHour || state.activeStartHour,
      weekdayEndHour: state.weekdayEndHour || state.activeEndHour,
      weekendStartHour: state.weekendStartHour || state.activeStartHour,
      weekendEndHour: state.weekendEndHour || state.activeEndHour,
      dailyActiveHours: state.dailyActiveHours
    });
  const updateDailyWindow = (day: keyof Days, next: Partial<{ start: number; end: number }>) => {
    const current = state.dailyActiveHours?.[day] ?? { start: state.activeStartHour, end: state.activeEndHour };
    onPatch({ dailyActiveHours: { ...state.dailyActiveHours, [day]: { ...current, ...next } } });
  };

  return (
    <Panel style={[styles.timeWindowPanel, compact && styles.compactTimeWindowPanel]}>
      <View style={styles.activeHoursHeader}>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Active hours</Text>
          <Text style={styles.cardSubtitle} numberOfLines={3}>{activeHoursSummary(state)}</Text>
        </View>
        <Toggle value={state.hoursOn} onPress={() => onPatch({ hoursOn: !state.hoursOn })} />
      </View>
      {state.hoursOn && (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.activeHoursModeRail}>
            {[
              ["same", "Every day"],
              ["weekend", "Weekday / weekend"],
              ["daily", "Each day"]
            ].map(([value, label]) => {
              const selected = mode === value;
              return (
                <Pressable key={value} style={[styles.activeHoursModeChip, selected && styles.activeHoursModeChipSelected]} onPress={() => setMode(value as AppState["activeHoursMode"])}>
                  <Text style={[styles.activeHoursModeText, selected && styles.activeHoursModeTextSelected]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {mode === "same" ? (
            <TimeWindowEditor
              label="Every day"
              start={state.activeStartHour}
              end={state.activeEndHour}
              onStart={(activeStartHour) => onPatch({ activeStartHour })}
              onEnd={(activeEndHour) => onPatch({ activeEndHour })}
            />
          ) : mode === "weekend" ? (
            <>
              <TimeWindowEditor
                label="Mon-Fri"
                start={state.weekdayStartHour}
                end={state.weekdayEndHour}
                onStart={(weekdayStartHour) => onPatch({ weekdayStartHour })}
                onEnd={(weekdayEndHour) => onPatch({ weekdayEndHour })}
              />
              <TimeWindowEditor
                label="Weekend"
                start={state.weekendStartHour}
                end={state.weekendEndHour}
                onStart={(weekendStartHour) => onPatch({ weekendStartHour })}
                onEnd={(weekendEndHour) => onPatch({ weekendEndHour })}
              />
            </>
          ) : (
            <View style={styles.dailyHoursList}>
              {(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as Array<keyof Days>).map((day) => {
                const window = state.dailyActiveHours?.[day] ?? { start: state.activeStartHour, end: state.activeEndHour };
                return (
                  <TimeWindowEditor
                    key={day}
                    label={day}
                    start={window.start}
                    end={window.end}
                    compact
                    onStart={(start) => updateDailyWindow(day, { start })}
                    onEnd={(end) => updateDailyWindow(day, { end })}
                  />
                );
              })}
            </View>
          )}
        </>
      )}
    </Panel>
  );
}

function TimeWindowEditor({
  label,
  start,
  end,
  onStart,
  onEnd,
  compact
}: {
  label: string;
  start: number;
  end: number;
  onStart: (value: number) => void;
  onEnd: (value: number) => void;
  compact?: boolean;
}) {
  return (
    <View style={[styles.timeWindowEditor, compact && styles.compactDayWindowEditor]}>
      <View style={[styles.hoursVisual, compact && styles.compactHoursVisual]}>
        <TimeBlock label={label.toUpperCase()} time={`${formatHour(start)} - ${formatHour(end)}`} hint="notification window" />
      </View>
      <View style={styles.rangeSteppers}>
        <Stepper
          value={start}
          label="start"
          onMinus={() => onStart(Math.max(0, start - 1))}
          onPlus={() => onStart(Math.min(end - 1, start + 1))}
        />
        <Text style={styles.arrowText}>→</Text>
        <Stepper
          value={end}
          label="end"
          onMinus={() => onEnd(Math.max(start + 1, end - 1))}
          onPlus={() => onEnd(Math.min(24, end + 1))}
        />
      </View>
    </View>
  );
}

function DayPicker({ days, onToggle }: { days: Days; onToggle: (day: keyof Days) => void }) {
  return (
    <View style={styles.days}>
      {(Object.keys(days) as Array<keyof Days>).map((day) => (
        <Pressable key={day} style={[styles.dayButton, days[day] && styles.dayButtonSelected]} onPress={() => onToggle(day)}>
          <Text style={[styles.dayText, days[day] && styles.dayTextSelected]}>{day[0]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function ScriptSelector({ active, onChange }: { active: ArabicScript; onChange: (script: ArabicScript) => void }) {
  return (
    <Panel style={styles.scriptPanel}>
      <View style={styles.settingRowInner}>
        <View style={styles.iconTile}>
          <Ionicons name="text-outline" size={20} color={colors.mint} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Arabic script</Text>
          <Text style={styles.cardSubtitle}>Choose the mushaf style used across cards and revision lists.</Text>
        </View>
      </View>
      <Segmented
        values={["uthmani", "indopak"]}
        labels={["Uthmani", "IndoPak"]}
        active={active}
        onChange={(value) => onChange(value as ArabicScript)}
      />
      <View style={styles.scriptPreview}>
        <Arabic style={active === "indopak" ? styles.scriptPreviewIndopak : styles.scriptPreviewArabic}>
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </Arabic>
      </View>
    </Panel>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <Panel style={styles.statCard}>
      <View style={styles.statInline}>
        <Ionicons name={icon as never} size={18} color={colors.goldDark} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
      <Text style={styles.statLabel}>{label}</Text>
    </Panel>
  );
}

function ReminderCard({
  icon,
  title,
  subtitle,
  quote,
  enabled,
  onToggle,
  active,
  onFrequency,
  days,
  onToggleDay,
  targetId,
  targetOptions,
  onTarget,
  warn
}: {
  icon: string;
  title: string;
  subtitle: string;
  quote: string;
  enabled: boolean;
  onToggle: () => void;
  active: string;
  onFrequency: (value: string) => void;
  days: Days;
  onToggleDay: (day: keyof Days) => void;
  targetId: string;
  targetOptions: Array<{ id: string; label: string }>;
  onTarget: (value: string) => void;
  warn?: boolean;
}) {
  return (
    <Panel style={styles.reminderCard}>
      <View style={styles.settingRowInner}>
        <View style={warn ? styles.iconTileWarn : styles.iconTile}>
          <Ionicons name={icon as never} size={20} color={warn ? colors.goldDark : colors.mint} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <Toggle value={enabled} onPress={onToggle} />
      </View>
      <Text style={styles.reminderQuote}>“{quote}”</Text>
      <Overline>Frequency</Overline>
      <FrequencyScroller active={active} onChange={onFrequency} />
      <Overline>What to go over</Overline>
      <TargetScroller options={targetOptions} active={targetId} onChange={onTarget} />
      <Overline>Days</Overline>
      <DayPicker days={days} onToggle={onToggleDay} />
    </Panel>
  );
}

function Toggle({ value, onPress }: { value: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.toggle, { backgroundColor: value ? colors.mint : "#d8d0c1" }]} onPress={onPress}>
      <View style={[styles.toggleKnob, { left: value ? 23 : 3 }]} />
    </Pressable>
  );
}

function SwitchRow({ title, subtitle, value, onPress }: { title: string; subtitle: string; value: boolean; onPress: () => void }) {
  return (
    <View style={styles.switchRow}>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      </View>
      <Toggle value={value} onPress={onPress} />
    </View>
  );
}

function NotificationPreview({ type, title, ayah }: { type: string; title: string; ayah: string }) {
  return (
    <Panel style={styles.preview}>
      <View style={styles.previewHeader}>
        <View style={styles.previewLogo}>
          <Text style={styles.previewLogoText}>ﷺ</Text>
        </View>
        <Text style={styles.previewType}>HIFZ CARDS · {type}</Text>
        <Text style={styles.previewNow}>now</Text>
      </View>
      <Text style={styles.previewTitle}>{title}</Text>
      <Arabic style={styles.previewArabic}>{ayah}</Arabic>
    </Panel>
  );
}

function ModeCard({
  icon,
  title,
  subtitle,
  quote,
  onPress,
  warn
}: {
  icon: string;
  title: string;
  subtitle: string;
  quote: string;
  onPress: () => void;
  warn?: boolean;
}) {
  return (
    <Pressable style={styles.modeCard} onPress={onPress}>
      <View style={styles.settingRowInner}>
        <View style={warn ? styles.iconTileWarn : styles.iconTile}>
          <Ionicons name={icon as never} size={22} color={warn ? colors.goldDark : colors.mint} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.modeTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.faint} />
      </View>
      <Text style={styles.reminderQuote}>“{quote}”</Text>
    </Pressable>
  );
}

function MarkButton({ label, sub, color, onPress, filled }: { label: string; sub: string; color: string; onPress: () => void; filled?: boolean }) {
  const icon = label === "Solid" ? "checkmark-circle" : label === "Shaky" ? "warning" : "close-circle";
  return (
    <Pressable style={[styles.markButton, filled && styles.markFilled, { borderColor: filled ? colors.mint : color }]} onPress={onPress}>
      <View style={[styles.markIcon, { backgroundColor: filled ? "rgba(255,255,255,.18)" : `${color}1f` }]}>
        <Ionicons name={icon as never} size={18} color={filled ? "#fff" : color} />
      </View>
      <View style={styles.markCopy}>
        <Text style={[styles.markLabel, { color }]}>{label}</Text>
        <Text style={[styles.markSub, filled && { color: "#d9eee7" }]}>{sub}</Text>
      </View>
    </Pressable>
  );
}

function ResultBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Panel style={styles.resultBox}>
      <Text style={[styles.resultValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Panel>
  );
}

function ProgressLine({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
  return (
    <View style={styles.progressLine}>
      <View style={styles.rowBetween}>
        <Text style={styles.sectionTitle}>{label}</Text>
        <Text style={[styles.greenStrong, { color }]}>{value}</Text>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

function Legend() {
  return (
    <View style={styles.legend}>
      {[
        ["Solid", colors.mint],
        ["Weak", "#e9d3a3"],
        ["Failed", "#e3a59c"]
      ].map(([label, color]) => (
        <View key={label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: color }]} />
          <Text style={styles.legendText}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

function Podium({ name, rank, points, height, color, crown }: { name: string; rank: number; points: number; height: number; color: string; crown?: boolean }) {
  return (
    <View style={styles.podiumItem}>
      <Text style={styles.crown}>{crown ? "♛" : " "}</Text>
      <View style={[styles.podiumAvatar, { backgroundColor: rank === 1 ? colors.green : rank === 3 ? colors.gold : "#dfe9e4" }]}>
        <Text style={[styles.podiumInitial, rank === 1 && { color: colors.gold }]}>{name[0]}</Text>
      </View>
      <Text style={styles.podiumName}>{name}</Text>
      <Text style={styles.podiumPoints}>{points} pts</Text>
      <View style={[styles.podiumBlock, { height, backgroundColor: color }]}>
        <Text style={styles.podiumRank}>{rank}</Text>
      </View>
    </View>
  );
}

function RecapStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.recapStat}>
      <Text style={styles.recapStatValue}>{value}</Text>
      <Text style={styles.recapStatLabel}>{label}</Text>
    </View>
  );
}

function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

function SettingsRow({ icon, label, meta, onPress }: { icon: string; label: string; meta?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <Ionicons name={icon as never} size={18} color={colors.mint} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <Text style={styles.settingsMeta}>{meta ?? "›"}</Text>
    </Pressable>
  );
}

function formatHour(hour: number) {
  if (hour === 24) return "12:00 am";
  const suffix = hour < 12 ? "am" : "pm";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:00 ${suffix}`;
}

function activeHoursSummary(state: AppState) {
  if (!state.hoursOn) return "Any time";
  const mode = state.activeHoursMode ?? (state.splitActiveHours ? "weekend" : "same");
  if (mode === "same") return `${formatHour(state.activeStartHour)} - ${formatHour(state.activeEndHour)} every day`;
  if (mode === "weekend") return `Mon-Fri ${formatHour(state.weekdayStartHour)}-${formatHour(state.weekdayEndHour)} · Weekend ${formatHour(state.weekendStartHour)}-${formatHour(state.weekendEndHour)}`;
  return "Custom time window for each day";
}

function formatDueDate(value: string) {
  const date = new Date(value);
  const day = date.toLocaleDateString("en-GB", { weekday: "short" });
  return `${day} ${formatHour(date.getHours())}`;
}

function formatHistoryTime(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

function resultColor(result: ResultStatus) {
  if (result === "solid" || result === "finished") return colors.mint;
  if (result === "forgot" || String(result).startsWith("stuck@")) return colors.red;
  return colors.goldDark;
}

function resultLabel(result: ResultStatus) {
  if (result === "solid") return "Solid";
  if (result === "shaky") return "Shaky";
  if (result === "forgot") return "Forgot";
  if (result === "finished") return "Finished";
  if (String(result).startsWith("stuck@")) return `Stopped at ayah ${String(result).replace("stuck@", "")}`;
  return String(result);
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.paper
  },
  appShell: {
    flex: 1,
    backgroundColor: colors.paper
  },
  fullScreen: {
    flex: 1,
    backgroundColor: colors.paper
  },
  flex: {
    flex: 1
  },
  progressDots: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 26,
    paddingTop: 22
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 3
  },
  onboardingBody: {
    paddingHorizontal: 26,
    paddingTop: 24,
    paddingBottom: 26
  },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center"
  },
  brandMarkText: {
    fontSize: 26,
    color: colors.gold,
    fontFamily: "Uthmani"
  },
  onboardingTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "800",
    color: colors.ink,
    marginTop: 20
  },
  muted: {
    fontSize: 14,
    color: colors.muted,
    lineHeight: 21,
    marginTop: 8
  },
  stack: {
    gap: 12,
    marginTop: 24
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16
  },
  selectedCard: {
    borderColor: colors.mint,
    backgroundColor: colors.mintPale,
    shadowColor: colors.mint,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 }
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    shadowOpacity: 0.06
  },
  iconTile: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.mintPale,
    alignItems: "center",
    justifyContent: "center"
  },
  iconTileWarn: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: colors.goldPale,
    alignItems: "center",
    justifyContent: "center"
  },
  cardTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: colors.text
  },
  cardSubtitle: {
    fontSize: 12.2,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 17
  },
  segmented: {
    flexDirection: "row",
    gap: 8
  },
  frequencyRail: {
    gap: 8,
    paddingVertical: 4,
    paddingRight: 10
  },
  frequencyChip: {
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: 86,
    alignItems: "center"
  },
  targetChip: {
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    maxWidth: 220
  },
  surahChipArabic: {
    color: colors.mint,
    fontSize: 18,
    marginTop: 3,
    textAlign: "center"
  },
  surahPicker: {
    marginTop: 8,
    gap: 10
  },
  surahToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 13
  },
  surahToggleText: {
    color: colors.mintDark,
    fontWeight: "800",
    fontSize: 12.5
  },
  surahEmpty: {
    color: colors.muted,
    fontSize: 12.5,
    textAlign: "center",
    paddingVertical: 16
  },
  focusPanel: {
    marginTop: 18
  },
  scheduleSpacer: {
    marginTop: 12
  },
  singleStepperRow: {
    flexDirection: "row",
    marginTop: 12
  },
  hoursVisual: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  rangePickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 14
  },
  rangePick: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 2
  },
  rangePickActive: {
    borderColor: colors.mint,
    backgroundColor: colors.mintPale
  },
  rangePickLabel: {
    fontSize: 9.5,
    color: "#a59a82",
    fontWeight: "800",
    letterSpacing: 0.8
  },
  rangePickName: {
    fontSize: 14,
    fontWeight: "800",
    color: colors.text
  },
  rangePickArabic: {
    fontSize: 18,
    color: colors.green,
    marginTop: 2,
    textAlign: "left"
  },
  focusArabic: {
    fontSize: 28,
    color: colors.green
  },
  summaryCard: {
    gap: 6
  },
  summaryHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2
  },
  summaryLine: {
    fontSize: 13,
    color: colors.text,
    fontWeight: "700",
    lineHeight: 18
  },
  summaryMeta: {
    fontSize: 12,
    color: colors.mintDark,
    fontWeight: "700",
    marginTop: 2
  },
  footerBackSpacer: {
    width: 38,
    height: 38
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    borderRadius: 13,
    paddingHorizontal: 12,
    height: 46
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    paddingVertical: 0
  },
  surahList: {
    borderRadius: 14
  },
  surahRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fffdf8",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8
  },
  surahRowSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green
  },
  surahNumber: {
    width: 30,
    color: colors.mint,
    fontWeight: "900",
    textAlign: "center"
  },
  surahRowArabic: {
    color: colors.green,
    fontSize: 22,
    minWidth: 58,
    textAlign: "left"
  },
  surahSelectedText: {
    color: "#fff"
  },
  surahSelectedSubtext: {
    color: "#cfe3db"
  },
  deleteRangeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.redPale,
    alignItems: "center",
    justifyContent: "center"
  },
  frequencyChipSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green
  },
  frequencyText: {
    color: "#6b675c",
    fontWeight: "800",
    fontSize: 12.5
  },
  frequencyTextSelected: {
    color: "#fff"
  },
  segmentButton: {
    flex: 1,
    borderRadius: 13,
    paddingVertical: 11,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: "center"
  },
  segmentSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green
  },
  segmentText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#6b675c"
  },
  segmentTextSelected: {
    color: "#fff"
  },
  panel: {
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    ...shadow
  },
  rangePanel: {},
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  overline: {
    color: "#a59a82",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 1.1
  },
  spacedOverline: {
    marginTop: 22,
    marginBottom: 10
  },
  arabic: {
    writingDirection: "rtl",
    textAlign: "right",
    fontFamily: "Uthmani"
  },
  indopakArabic: {
    fontFamily: "IndoPak"
  },
  surahName: {
    fontSize: 30,
    color: colors.green
  },
  divider: {
    height: 1,
    backgroundColor: "#f0ebe0",
    marginVertical: 16
  },
  rangeSteppers: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 12
  },
  activeHoursEditor: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 4,
    paddingBottom: 16
  },
  stepper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 8
  },
  stepperButton: {
    width: 28,
    height: 28,
    borderRadius: 9,
    backgroundColor: "#f3efe6",
    alignItems: "center",
    justifyContent: "center"
  },
  stepperSign: {
    fontSize: 18,
    color: colors.mint,
    fontWeight: "700"
  },
  stepperMid: {
    alignItems: "center"
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.text
  },
  stepperLabel: {
    fontSize: 9.5,
    color: "#a59a82"
  },
  arrowText: {
    color: "#cbc4b6",
    fontWeight: "800"
  },
  pillInfo: {
    marginTop: 14,
    backgroundColor: colors.mintPale,
    color: "#2f5d4f",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    fontSize: 12.5,
    fontWeight: "700"
  },
  twoCol: {
    flexDirection: "row",
    gap: 10
  },
  miniSelect: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 13
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 22
  },
  quotePanel: {
    marginTop: 18,
    backgroundColor: colors.goldPale
  },
  quoteArabic: {
    textAlign: "center",
    fontSize: 23,
    color: colors.green,
    lineHeight: 42
  },
  quoteText: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 12.5,
    marginTop: 8,
    lineHeight: 18
  },
  hoursPanel: {
    marginTop: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  timeWindowPanel: {
    marginTop: 22,
    gap: 14
  },
  compactTimeWindowPanel: {
    marginTop: 0,
    padding: 0,
    backgroundColor: "transparent",
    shadowOpacity: 0,
    elevation: 0
  },
  inlineActiveHours: {
    paddingVertical: 14
  },
  activeHoursHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0
  },
  activeHoursModeRail: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8
  },
  activeHoursModeChip: {
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: "#fffdf8",
    borderRadius: 999,
    paddingVertical: 9,
    paddingHorizontal: 13
  },
  activeHoursModeChipSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green
  },
  activeHoursModeText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  activeHoursModeTextSelected: {
    color: "#fff"
  },
  timeWindowEditor: {
    gap: 10
  },
  compactDayWindowEditor: {
    borderTopWidth: 1,
    borderTopColor: colors.line,
    paddingTop: 10
  },
  dailyHoursList: {
    gap: 10
  },
  compactHoursVisual: {
    gap: 0
  },
  timeWindowGrid: {
    flexDirection: "row",
    gap: 10
  },
  timeBlock: {
    alignItems: "center",
    flex: 1,
    minWidth: 0,
    backgroundColor: colors.paper,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8
  },
  timeLabel: {
    fontSize: 11,
    color: "#a59a82",
    fontWeight: "800"
  },
  timeText: {
    fontSize: Platform.OS === "android" ? 16 : 18,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center"
  },
  timeSuffix: {
    fontSize: 13,
    color: "#a59a82"
  },
  timeHint: {
    fontSize: 11,
    color: colors.mint,
    fontWeight: "800"
  },
  timeLine: {
    flex: 1,
    height: 4,
    borderRadius: 3
  },
  onboardingSummary: {
    marginTop: 16,
    gap: 5,
    backgroundColor: "#fdfbf6"
  },
  days: {
    flexDirection: "row",
    gap: 7
  },
  dayButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.line,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center"
  },
  dayButtonSelected: {
    backgroundColor: colors.mint,
    borderColor: colors.mint
  },
  dayText: {
    color: "#6b675c",
    fontWeight: "800"
  },
  dayTextSelected: {
    color: "#fff"
  },
  darkQuote: {
    marginTop: 22,
    backgroundColor: colors.green
  },
  darkQuoteArabic: {
    fontSize: 22,
    textAlign: "center",
    color: colors.gold,
    lineHeight: 40
  },
  darkQuoteText: {
    color: "#bcd8cf",
    textAlign: "center",
    fontSize: 12,
    marginTop: 8,
    lineHeight: 17
  },
  footer: {
    padding: 14,
    paddingHorizontal: 26,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  footerFirst: {
    justifyContent: "center"
  },
  footerSoloButton: {
    width: "78%",
    maxWidth: 320
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14
  },
  primaryText: {
    fontSize: 14.5,
    fontWeight: "800",
    lineHeight: 18,
    textAlign: "center",
    flexShrink: 1
  },
  outlineButton: {
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#cfe0d8",
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    width: "100%"
  },
  outlineText: {
    fontSize: 14.5,
    color: colors.mintDark,
    fontWeight: "800",
    lineHeight: 18
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1.3,
    borderColor: colors.lineDark,
    backgroundColor: "rgba(255,255,255,.85)",
    alignItems: "center",
    justifyContent: "center"
  },
  iconButtonDark: {
    backgroundColor: "rgba(255,255,255,.12)",
    borderColor: "transparent"
  },
  withTabsScroll: {
    paddingBottom: Platform.OS === "android" ? 124 : 108
  },
  hero: {
    paddingTop: 30,
    paddingHorizontal: 24,
    paddingBottom: 26,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  heroMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  heroOverline: {
    color: colors.blueGreen,
    textTransform: "uppercase",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.2
  },
  heroLabel: {
    color: "#6fa593",
    textTransform: "uppercase",
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 12
  },
  heroTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 23,
    marginTop: 3
  },
  heroSub: {
    color: "#bcd8cf",
    fontSize: 12.5,
    marginTop: 2
  },
  heroArabic: {
    color: colors.gold,
    fontSize: 34,
    marginTop: 24
  },
  heroTrack: {
    marginTop: 18,
    height: 9,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,.16)",
    overflow: "hidden"
  },
  heroFill: {
    width: "72%",
    height: 9,
    backgroundColor: colors.gold,
    borderRadius: 6
  },
  heroGold: {
    color: colors.gold,
    fontWeight: "800",
    fontSize: 11.5,
    marginTop: 8
  },
  content: {
    padding: 20,
    gap: 12
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "stretch"
  },
  statCard: {
    flex: 1,
    padding: 14,
    minHeight: 82,
    alignItems: "center",
    justifyContent: "center"
  },
  statInline: {
    flexDirection: "row",
    gap: 5,
    alignItems: "center",
    justifyContent: "center"
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
    color: colors.text
  },
  statSuffix: {
    fontSize: 12,
    color: "#a59a82"
  },
  statLabel: {
    fontSize: 11.5,
    color: "#8a8475",
    fontWeight: "700",
    marginTop: 2,
    textAlign: "center",
    lineHeight: 15
  },
  nextPrompt: {
    fontSize: 11.5,
    color: colors.mint,
    fontWeight: "800",
    marginTop: 4,
    textAlign: "center",
    lineHeight: 16
  },
  todayRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 5,
    borderColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.goldPale,
    flexShrink: 0
  },
  todayRingValue: {
    fontSize: 18,
    color: colors.green,
    fontWeight: "900",
    lineHeight: 20
  },
  todayRingLabel: {
    fontSize: 9.5,
    color: colors.goldDark,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  weakButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 16,
    ...shadow
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: colors.text
  },
  greenStrong: {
    fontSize: 12.5,
    color: colors.mint,
    fontWeight: "800"
  },
  weekBars: {
    flexDirection: "row",
    gap: 5,
    marginTop: 13
  },
  weekBar: {
    flex: 1,
    height: 8,
    borderRadius: 4
  },
  weekLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 7
  },
  weekLabel: {
    fontSize: 10.5,
    color: colors.faint,
    fontWeight: "700"
  },
  notificationSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  floatingAction: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: Platform.OS === "android" ? 104 : 90,
    ...heavyShadow
  },
  settingsContent: {
    padding: 20,
    paddingTop: 18,
    gap: 12
  },
  settingsSection: {
    gap: 12
  },
  header: {
    paddingTop: 2,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.ink
  },
  reminderCard: {
    gap: 12
  },
  scriptPanel: {
    gap: 12
  },
  scriptPreview: {
    minHeight: 82,
    borderRadius: 16,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    padding: 14
  },
  scriptPreviewArabic: {
    fontSize: 24,
    lineHeight: 44,
    color: colors.green,
    textAlign: "center"
  },
  scriptPreviewIndopak: {
    fontSize: 27,
    lineHeight: 48,
    color: colors.green,
    textAlign: "center"
  },
  dailyTargetCard: {
    gap: 12
  },
  dailyTargetControls: {
    width: "100%",
    alignItems: "center",
    gap: 10
  },
  targetQuickScroll: {
    width: "100%"
  },
  targetQuickRail: {
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2
  },
  targetQuickChip: {
    minWidth: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "#fffdf8",
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center"
  },
  targetQuickChipSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green
  },
  targetQuickText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900"
  },
  targetQuickTextSelected: {
    color: "#fff"
  },
  revisionSettingsPanel: {
    gap: 12
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64
  },
  settingRowInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48
  },
  reminderQuote: {
    backgroundColor: colors.paper,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 13,
    fontSize: 12,
    color: "#5a574d",
    fontStyle: "italic"
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 16,
    position: "relative"
  },
  toggleKnob: {
    position: "absolute",
    top: 3,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff"
  },
  listPanel: {
    paddingVertical: 0
  },
  reciterPanel: {
    gap: 12
  },
  reciterDropdown: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fffdf8",
    overflow: "hidden"
  },
  reciterOption: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 13
  },
  reciterOptionSelected: {
    backgroundColor: colors.green
  },
  reciterOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.line
  },
  reciterName: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: "900",
    lineHeight: 17
  },
  reciterTextSelected: {
    color: "#fff"
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14
  },
  notificationStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fdfbf6"
  },
  preview: {
    backgroundColor: "rgba(255,255,255,.78)",
    borderWidth: 1,
    borderColor: colors.line
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8
  },
  previewLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center"
  },
  previewLogoText: {
    color: colors.gold,
    fontSize: 12
  },
  previewType: {
    flex: 1,
    color: "#6b675c",
    fontSize: 11,
    fontWeight: "800"
  },
  previewNow: {
    color: colors.faint,
    fontSize: 11
  },
  previewTitle: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: "800"
  },
  previewArabic: {
    fontSize: 21,
    color: colors.ink,
    lineHeight: 40,
    marginTop: 6
  },
  modeCard: {
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.line,
    borderRadius: 20,
    padding: 18,
    gap: 13,
    ...shadow
  },
  modeTitle: {
    fontSize: 16,
    color: colors.text,
    fontWeight: "800"
  },
  sessionBg: {
    flex: 1,
    backgroundColor: "#eef3f0"
  },
  sessionTop: {
    paddingTop: 38,
    paddingHorizontal: 22,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  counterPill: {
    backgroundColor: colors.card,
    borderRadius: 14,
    paddingVertical: 7,
    paddingHorizontal: 16,
    color: colors.mint,
    fontWeight: "800",
    fontSize: 13,
    ...shadow
  },
  sessionProgressTrack: {
    height: 5,
    marginHorizontal: 22,
    marginTop: 14,
    backgroundColor: "#e4ddcf",
    borderRadius: 3,
    overflow: "hidden"
  },
  sessionProgress: {
    height: 5,
    borderRadius: 3
  },
  cardStack: {
    position: "absolute",
    left: Platform.OS === "android" ? 16 : 22,
    right: Platform.OS === "android" ? 16 : 22,
    top: Platform.OS === "android" ? 112 : 130,
    bottom: Platform.OS === "android" ? 142 : 112
  },
  memoriseCardStack: {
    bottom: Platform.OS === "android" ? 158 : 112
  },
  behindCard: {
    position: "absolute",
    backgroundColor: "#fff",
    borderRadius: 30,
    left: 0,
    right: 0,
    height: "94%",
    ...shadow
  },
  behindCardOne: {
    top: Platform.OS === "android" ? 10 : 14,
    left: 0,
    right: 0,
    opacity: 0.5
  },
  behindCardTwo: {
    top: Platform.OS === "android" ? 5 : 7,
    left: 0,
    right: 0,
    opacity: 0.75
  },
  practiceCard: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "#fff",
    borderRadius: Platform.OS === "android" ? 24 : 30,
    padding: Platform.OS === "android" ? 18 : 24,
    alignItems: "center",
    overflow: "hidden",
    ...heavyShadow
  },
  modeChip: {
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    backgroundColor: colors.mintPale,
    color: "#2f5d4f",
    fontSize: Platform.OS === "android" ? 10.5 : 11.5,
    fontWeight: "900",
    letterSpacing: 1
  },
  modeChipWarn: {
    backgroundColor: colors.goldPale,
    color: colors.goldDark
  },
  ayahCardScroll: {
    flex: 1,
    width: "100%"
  },
  ayahCardBody: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingVertical: 8
  },
  sessionMeta: {
    fontSize: 12,
    color: colors.faint,
    fontWeight: "700",
    marginBottom: 14,
    textAlign: "center"
  },
  continueNote: {
    fontSize: 12,
    color: colors.mintDark,
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 14,
    paddingHorizontal: 8,
    lineHeight: 17
  },
  memoriseArabic: {
    fontSize: Platform.OS === "android" ? 24 : 27,
    color: "#1f2d27",
    lineHeight: Platform.OS === "android" ? 46 : 54,
    textAlign: "center"
  },
  promptArabic: {
    fontSize: Platform.OS === "android" ? 25 : 30,
    color: "#1f2d27",
    lineHeight: Platform.OS === "android" ? 48 : 58,
    textAlign: "center"
  },
  revealBlock: {
    width: "100%",
    marginTop: 14
  },
  fullArabic: {
    fontSize: 23,
    color: colors.text,
    lineHeight: 47,
    textAlign: "center"
  },
  translation: {
    color: colors.muted,
    textAlign: "center",
    fontSize: 12.5,
    lineHeight: 19,
    fontStyle: "italic",
    marginTop: 12
  },
  audioButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "#f3efe7",
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  audioIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.mint,
    alignItems: "center",
    justifyContent: "center"
  },
  audioText: {
    color: "#6b675c",
    fontWeight: "800",
    fontSize: 13
  },
  markRow: {
    position: "absolute",
    left: Platform.OS === "android" ? 18 : 22,
    right: Platform.OS === "android" ? 18 : 22,
    bottom: 30,
    flexDirection: "row",
    gap: Platform.OS === "android" ? 7 : 9
  },
  markButton: {
    flex: 1,
    minWidth: 0,
    minHeight: Platform.OS === "android" ? 58 : 72,
    borderRadius: Platform.OS === "android" ? 16 : 20,
    borderWidth: 1.5,
    backgroundColor: "#fffdf8",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Platform.OS === "android" ? 8 : 10,
    paddingHorizontal: 6,
    ...shadow
  },
  markFilled: {
    backgroundColor: colors.mint
  },
  markIcon: {
    width: Platform.OS === "android" ? 20 : 28,
    height: Platform.OS === "android" ? 20 : 28,
    borderRadius: Platform.OS === "android" ? 10 : 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Platform.OS === "android" ? 4 : 6
  },
  markCopy: {
    alignItems: "center",
    minWidth: 0
  },
  markLabel: {
    fontSize: Platform.OS === "android" ? 12 : 13,
    fontWeight: "900",
    lineHeight: 17,
    textAlign: "center"
  },
  markSub: {
    fontSize: Platform.OS === "android" ? 9.5 : 10,
    color: colors.muted,
    marginTop: 2,
    lineHeight: 13,
    textAlign: "center"
  },
  revisionBody: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    minHeight: 0
  },
  revisionStart: {
    flex: 1,
    width: "100%",
    alignItems: "center",
    justifyContent: "center"
  },
  revisionPill: {
    backgroundColor: colors.mintPale,
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 14,
    color: "#2f5d4f",
    fontSize: Platform.OS === "android" ? 12 : 13,
    fontWeight: "800",
    marginTop: 26
  },
  revisionScroll: {
    width: "100%",
    flex: 1,
    minHeight: 0
  },
  revisionScrollBody: {
    paddingBottom: Platform.OS === "android" ? 340 : 132
  },
  stuckHint: {
    backgroundColor: colors.goldPale,
    borderRadius: 12,
    padding: Platform.OS === "android" ? 8 : 10,
    color: colors.goldDark,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
    fontSize: Platform.OS === "android" ? 11.5 : 12
  },
  juzJumpPanel: {
    width: "100%",
    backgroundColor: colors.paper,
    borderRadius: 14,
    padding: Platform.OS === "android" ? 8 : 10,
    marginBottom: 8,
    gap: 8
  },
  juzHint: {
    color: colors.muted,
    fontSize: 11.5,
    fontWeight: "700",
    lineHeight: 16,
    textAlign: "center"
  },
  juzChipRail: {
    gap: 8,
    paddingHorizontal: 2
  },
  juzChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.lineDark,
    backgroundColor: "#fffdf8",
    paddingVertical: 7,
    paddingHorizontal: 12
  },
  juzChipSelected: {
    backgroundColor: colors.green,
    borderColor: colors.green
  },
  juzChipText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "900"
  },
  juzChipTextSelected: {
    color: "#fff"
  },
  juzDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    marginBottom: 2
  },
  juzDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line
  },
  juzDividerText: {
    color: colors.goldDark,
    fontSize: 11,
    fontWeight: "900"
  },
  passageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: Platform.OS === "android" ? 7 : 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f4efe5"
  },
  ayahBadge: {
    width: 24,
    height: 24,
    borderRadius: 7,
    backgroundColor: colors.mintPale,
    color: "#2f5d4f",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 11,
    fontWeight: "900",
    marginTop: 7
  },
  passageText: {
    flex: 1,
    fontSize: Platform.OS === "android" ? 18.5 : 21,
    color: colors.ink,
    lineHeight: Platform.OS === "android" ? 35 : 42
  },
  doneContent: {
    paddingHorizontal: 26,
    paddingTop: 90,
    paddingBottom: 30,
    alignItems: "center",
    gap: 14
  },
  doneCheck: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center",
    ...heavyShadow
  },
  doneTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 6
  },
  doneSub: {
    color: colors.muted,
    fontSize: 14
  },
  resultBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16
  },
  resultValue: {
    fontSize: 24,
    fontWeight: "900"
  },
  duaPanel: {
    width: "100%",
    alignItems: "center"
  },
  sessionReviewPanel: {
    width: "100%",
    gap: 10
  },
  journalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingTop: 2
  },
  journalDot: {
    width: 10,
    height: 10,
    borderRadius: 5
  },
  duaArabic: {
    fontSize: 24,
    color: colors.green,
    lineHeight: 44,
    textAlign: "center"
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: colors.ink,
    marginTop: 28
  },
  screenSub: {
    fontSize: 13,
    color: colors.muted,
    marginTop: -8
  },
  progressLine: {
    gap: 8,
    marginBottom: 10
  },
  track: {
    height: 10,
    backgroundColor: "#eee8dc",
    borderRadius: 6,
    overflow: "hidden"
  },
  fill: {
    height: 10,
    borderRadius: 6
  },
  ayahMap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 14
  },
  ayahCell: {
    width: "15.2%",
    aspectRatio: 1,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center"
  },
  ayahCellText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "900"
  },
  weakSpotList: {
    marginTop: 10,
    gap: 9
  },
  weakSpotRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#fffdf8",
    borderRadius: 15,
    padding: 11
  },
  weakSpotBadge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    backgroundColor: colors.goldPale,
    alignItems: "center",
    justifyContent: "center"
  },
  weakSpotBadgeText: {
    color: colors.goldDark,
    fontWeight: "900"
  },
  weakSpotArabic: {
    color: colors.green,
    fontSize: 18,
    lineHeight: 30
  },
  weakScore: {
    minWidth: 42,
    alignItems: "flex-end"
  },
  weakScoreValue: {
    color: colors.red,
    fontWeight: "900",
    fontSize: 16
  },
  legend: {
    flexDirection: "row",
    gap: 14,
    marginTop: 14
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  legendSwatch: {
    width: 10,
    height: 10,
    borderRadius: 3
  },
  legendText: {
    fontSize: 11,
    color: colors.muted,
    fontWeight: "700"
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14
  },
  calendarDay: {
    width: "13.4%",
    aspectRatio: 1,
    borderRadius: 7
  },
  todayOutline: {
    borderWidth: 2,
    borderColor: colors.gold
  },
  podium: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 12,
    marginTop: 8
  },
  podiumItem: {
    alignItems: "center"
  },
  crown: {
    color: colors.goldDark,
    fontSize: 16
  },
  podiumAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  podiumInitial: {
    fontSize: 18,
    fontWeight: "900",
    color: colors.mintDark
  },
  podiumName: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.text,
    marginTop: 6
  },
  podiumPoints: {
    fontSize: 11,
    color: colors.muted
  },
  podiumBlock: {
    width: 60,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6
  },
  podiumRank: {
    fontSize: 16,
    fontWeight: "900",
    color: "#fff"
  },
  leaderList: {
    paddingVertical: 4
  },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13
  },
  leaderBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#f2ede3"
  },
  rankText: {
    width: 22,
    color: colors.faint,
    fontSize: 13,
    fontWeight: "900",
    textAlign: "center"
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: "#fff",
    fontWeight: "900"
  },
  pointsBox: {
    alignItems: "flex-end"
  },
  points: {
    fontSize: 15,
    fontWeight: "900",
    color: colors.mintDark
  },
  pointsLabel: {
    fontSize: 10,
    color: "#a59a82"
  },
  groupGoal: {
    backgroundColor: colors.green
  },
  groupTitle: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 13
  },
  groupMeta: {
    color: colors.blueGreen,
    fontWeight: "800",
    fontSize: 12
  },
  groupTrack: {
    height: 9,
    backgroundColor: "rgba(255,255,255,.16)",
    borderRadius: 6,
    marginTop: 12,
    overflow: "hidden"
  },
  groupFill: {
    width: "82%",
    height: 9,
    backgroundColor: colors.gold
  },
  groupText: {
    color: "#bcd8cf",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 9
  },
  recapScreen: {
    flex: 1,
    backgroundColor: colors.green
  },
  recapContent: {
    padding: 22,
    paddingBottom: 30,
    gap: 14
  },
  recapHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 30
  },
  recapHeaderText: {
    color: "#cfe3db",
    fontSize: 14,
    fontWeight: "800"
  },
  shareCard: {
    borderRadius: 26,
    padding: 24,
    backgroundColor: "#fbfaf5",
    ...heavyShadow
  },
  miniLogo: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: colors.green,
    alignItems: "center",
    justifyContent: "center"
  },
  miniLogoText: {
    color: colors.gold,
    fontSize: 14
  },
  bigNumber: {
    fontSize: 48,
    fontWeight: "900",
    color: colors.green,
    marginTop: 12
  },
  shareSub: {
    color: "#6b675c",
    fontSize: 15,
    fontWeight: "700"
  },
  insightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12
  },
  insightText: {
    color: colors.text,
    fontSize: 13.5
  },
  bold: {
    fontWeight: "900"
  },
  recapAyah: {
    backgroundColor: colors.green,
    borderRadius: 16,
    padding: 14,
    marginTop: 6
  },
  recapAyahText: {
    color: colors.gold,
    textAlign: "center",
    fontSize: 20,
    lineHeight: 36
  },
  recapStats: {
    flexDirection: "row",
    gap: 10
  },
  recapStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,.08)",
    borderRadius: 14,
    padding: 14,
    alignItems: "center"
  },
  recapStatValue: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "900"
  },
  recapStatLabel: {
    color: colors.blueGreen,
    fontSize: 11,
    textAlign: "center"
  },
  profileHero: {
    paddingTop: 50,
    paddingHorizontal: 22,
    paddingBottom: 28,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  profileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16
  },
  profileAvatar: {
    width: 66,
    height: 66,
    borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center"
  },
  profileInitial: {
    fontSize: 26,
    fontWeight: "900",
    color: colors.green
  },
  profileName: {
    color: "#fff",
    fontSize: 21,
    fontWeight: "900"
  },
  profileSub: {
    color: "#bcd8cf",
    fontSize: 12.5,
    marginTop: 2
  },
  profileStats: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20
  },
  profileStat: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,.1)",
    borderRadius: 14,
    padding: 12,
    alignItems: "center"
  },
  profileStatValue: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900"
  },
  profileStatLabel: {
    color: "#bcd8cf",
    fontSize: 10.5
  },
  goalPanel: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  goalArabic: {
    fontSize: 26,
    color: colors.green
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingVertical: 15
  },
  settingsLabel: {
    flex: 1,
    color: colors.text,
    fontSize: 14.5,
    fontWeight: "800",
    lineHeight: 19
  },
  settingsMeta: {
    color: "#a59a82",
    fontSize: 12,
    lineHeight: 16
  },
  premium: {
    backgroundColor: colors.green,
    overflow: "hidden"
  },
  premiumMark: {
    position: "absolute",
    right: -16,
    top: -22,
    color: "rgba(233,217,168,.12)",
    fontSize: 90
  },
  premiumChip: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(233,217,168,.18)",
    color: colors.gold,
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 12,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden"
  },
  premiumTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12
  },
  premiumBody: {
    color: "#bcd8cf",
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 6,
    marginBottom: 16
  },
  tabs: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: Platform.OS === "android" ? 96 : 84,
    backgroundColor: "rgba(255,255,255,.94)",
    borderTopWidth: 1,
    borderTopColor: colors.line,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "android" ? 26 : 14
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    gap: 4
  },
  tabLabel: {
    fontSize: 10.5,
    fontWeight: "800"
  },
  homeIndicator: {
    position: "absolute",
    bottom: 7,
    left: "50%",
    marginLeft: -64,
    width: 128,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(40,45,40,.25)",
    display: Platform.OS === "android" ? "none" : "flex"
  }
});
