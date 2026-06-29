import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Animated,
  DimensionValue,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  View
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { buildDeckContext } from "./src/appStateSelectors";
import { ayahCard, ayahCellStyle, buildNewDeck, buildRecentRevisionDeck, buildRevisionDeck, buildWeakDeck, buildYesterdayWeakDeck, getDeck, isRevisionFlow, sessionProgressWidth } from "./src/deck";
import { HifzCard } from "./src/data";
import {
  getDashboardStats,
  getProgressStats,
  getWeeklyRecap,
  leaderboardEntries
} from "./src/hifzModel";
import { useHifzAppState } from "./src/hooks/useHifzAppState";
import * as Sharing from "expo-sharing";
import { captureRef } from "react-native-view-shot";
import { playAyah, prefetchAyat, stopAyah } from "./src/audio";
import { reciterById, reciters } from "./src/reciters";
import { currentKhatmStats, makeSurahRange, monthConsistency, remainingRevisionRoundItems, revisionRoundItems, revisionTotals, surahNumberFromLabel } from "./src/planning";
import { colors } from "./src/theme";
import { styles } from "./src/styles";
import { NewOnboardingScreen } from "./src/screens/NewOnboardingScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { Arabic, ArabicDisplayCard, ArabicFontContext, AyahCard, BottomTabs, Divider, Header, HeroHeader, IconButton, KnownSurahRangeCard, Legend, MarkButton, ModeCard, OutlineButton, Overline, Panel, Podium, PrimaryButton, ProfileStat, ProgressLine, RecapStat, ResultBox, RevisionCard, Segmented, SettingsRow, StatCard, formatDueDate, formatHistoryTime, resultColor, resultLabel, tabBarHeight } from "./src/components";
import { AppState, arabicSizeScale, ResultStatus, Screen, SessionMode } from "./src/types";

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
  const { state, showTabs, patch, nav, beginApp, startSession, startQuiz, markQuiz, resetQuiz, markCard, completeRevisionSurah, stopAtAyah, addReadWeak, resumeRevision } = useHifzAppState();
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
          {state.screen === "home" && <HomeScreen state={state} safeTop={safe.top} safeBottom={safe.bottom} onNav={nav} onModes={() => nav("modes")} onQuiz={() => nav("quizSetup")} />}
          {state.screen === "notif" && <NotificationsScreen state={state} safeTop={safe.top} safeBottom={safe.bottom} onPatch={patch} onNav={nav} />}
          {state.screen === "modes" && <ModeScreen state={state} safeTop={safe.top} safeBottom={safe.bottom} onNav={nav} onStart={startSession} onCompleteSurah={completeRevisionSurah} />}
          {state.screen === "quizSetup" && <QuizSetupScreen state={state} safeTop={safe.top} safeBottom={safe.bottom} onPatch={patch} onNav={nav} onStart={startQuiz} />}
          {state.screen === "quizSession" && <QuizSessionScreen state={state} safeTop={safe.top} safeBottom={safe.bottom} onPatch={patch} onMark={markQuiz} onExit={resetQuiz} />}
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
              onAddWeak={addReadWeak}
              onResumeRevision={resumeRevision}
            />
          )}
          {state.screen === "progress" && <ProgressScreen state={state} safeTop={safe.top} onNav={nav} onStart={startSession} />}
          {state.screen === "khatms" && <KhatmsScreen state={state} safeTop={safe.top} onNav={nav} onStart={startSession} />}
          {state.screen === "board" && <BoardScreen state={state} safeTop={safe.top} onPatch={patch} />}
          {state.screen === "recap" && <RecapScreen state={state} safeTop={safe.top} onNav={nav} />}
          {state.screen === "profile" && <ProfileScreen state={state} safeTop={safe.top} onPatch={patch} onNav={nav} />}
          {showTabs && <BottomTabs screen={state.screen} safeBottom={safe.bottom} onNav={nav} />}
        </ArabicFontContext.Provider>
      </View>
    </View>
  );
}

function HomeScreen({
  state,
  safeTop,
  safeBottom,
  onNav,
  onModes,
  onQuiz
}: {
  state: AppState;
  safeTop: number;
  safeBottom: number;
  onNav: (screen: Screen) => void;
  onModes: () => void;
  onQuiz: () => void;
}) {
  const dashboard = getDashboardStats(state);
  const revision = revisionTotals(state);
  const homeKhatm = currentKhatmStats(state);
  const homeHistory = state.reviewHistory ?? [];

  return (
    <View style={styles.fullScreen}>
      <ScrollView contentContainerStyle={[styles.withTabsScroll, styles.homeScrollPad]} showsVerticalScrollIndicator={false}>
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
                  {state.sabaqOn ? `${state.perDay} new/day` : "New paused"} · {state.revisionOn ? `${revision.remainingToday} āyāt to revise today` : "revision off"}
                </Text>
                <Text style={styles.cardSubtitle}>
                  {state.revisionOn
                    ? `${revision.doneToday}/${revision.dailyTarget} revised today · full khatm ${revision.rounds + 1}`
                    : `New memorisation continues from ${dashboard.currentSurah} ${dashboard.rangeLabel}.`}
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
          {state.revisionOn && (
            <Pressable style={[styles.panel, styles.homeKhatmCard]} onPress={() => onNav("khatms")}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <Overline>Current khatm</Overline>
                  <Text style={styles.cardTitle}>{homeKhatm.done} of {homeKhatm.total} āyāt revised</Text>
                </View>
                <View style={styles.homeKhatmRing}>
                  <Text style={styles.homeKhatmPct}>{homeKhatm.pct}%</Text>
                </View>
              </View>
              <View style={styles.khatmBar}>
                <View style={{ width: `${homeKhatm.strongPct}%`, backgroundColor: colors.mint }} />
                <View style={{ width: `${homeKhatm.weakPct}%`, backgroundColor: homeKhatm.weakPct > 25 ? colors.red : colors.goldDark }} />
                <View style={{ width: `${homeKhatm.remainPct}%`, backgroundColor: colors.line }} />
              </View>
              <View style={styles.rowBetween}>
                <Text style={styles.cardSubtitle}>{homeKhatm.weakAyahs.length} weak so far · khatm {homeKhatm.rounds + 1}</Text>
                <Text style={styles.greenStrong}>See khatms ›</Text>
              </View>
            </Pressable>
          )}
          <Pressable style={[styles.panel, styles.quizHomeCard]} onPress={onQuiz}>
            <View style={styles.settingRowInner}>
              <View style={styles.iconTile}>
                <Ionicons name="help-buoy-outline" size={20} color={colors.mint} />
              </View>
              <View style={styles.flex}>
                <Overline>Quiz mode</Overline>
                <Text style={styles.cardTitle}>Random continuation test</Text>
                <Text style={styles.cardSubtitle}>Get a random āyah from your revision, then recite the next 5 āyāt. Results stay private to this quiz.</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.faint} />
            </View>
          </Pressable>
          <Panel style={styles.notificationSummary}>
            <View style={styles.flex}>
              <Overline>Reminders today</Overline>
              <Text style={styles.cardTitle}>New memorisation and revision</Text>
              <Text style={styles.cardSubtitle}>Custom nudges inside your active hours.</Text>
            </View>
            <IconButton name="notifications-outline" onPress={() => onNav("notif")} />
          </Panel>
          <Panel>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>Recent review journal</Text>
              <Text style={styles.greenStrong}>{homeHistory.length} saved</Text>
            </View>
            {(homeHistory.length ? homeHistory.slice(0, 4) : [
              { id: "empty", ayahLabel: "No session marks yet", result: "Start a card session", timestamp: new Date().toISOString() }
            ]).map((record) => (
              <View key={record.id} style={styles.journalRow}>
                <View style={[styles.journalDot, { backgroundColor: homeHistory.length ? resultColor(record.result) : colors.lineDark }]} />
                <View style={styles.flex}>
                  <Text style={styles.cardTitle}>{record.ayahLabel}</Text>
                  <Text style={styles.cardSubtitle}>{homeHistory.length ? `${resultLabel(record.result)} · ${formatHistoryTime(record.timestamp)}` : "Your results will appear here automatically."}</Text>
                </View>
              </View>
            ))}
          </Panel>
        </View>
      </ScrollView>
      <View style={[styles.homeStickyBar, { bottom: tabBarHeight(safeBottom), paddingBottom: 12 }]}>
        <PrimaryButton label="Start card session" icon="arrow-forward" onPress={onModes} />
      </View>
    </View>
  );
}

function ModeScreen({
  state,
  safeTop,
  safeBottom,
  onNav,
  onStart,
  onCompleteSurah
}: {
  state: AppState;
  safeTop: number;
  safeBottom: number;
  onNav: (screen: Screen) => void;
  onStart: (mode: SessionMode, startIndex?: number, startAyah?: number) => void;
  onCompleteSurah: (index: number) => void;
}) {
  const [revisionDetailOpen, setRevisionDetailOpen] = useState(false);
  const newCount = buildNewDeck(state.newRange, state.arabicScript).length;
  const revisionDeck = buildRevisionDeck(state.revisionRanges, state.arabicScript, state.revisionOrder);
  const weakCount = buildWeakDeck(state.reviewHistory, state.arabicScript).length;
  const yesterdayWeakCount = buildYesterdayWeakDeck(state.reviewHistory, state.arabicScript).length;
  const recentCount = buildRecentRevisionDeck(state.reviewHistory, state.newRange, state.arabicScript).length;
  const revisionCount = revisionDeck.length;
  const revision = revisionTotals(state);
  const roundItems = revisionRoundItems(state);
  const remainingItems = remainingRevisionRoundItems(state);
  const startName = state.newRange.surah.split("\u00b7").slice(1).join("\u00b7").trim() || state.newRange.surah;
  const continueIndex = remainingItems[0]?.index ?? Math.min(Math.max(0, state.revisionProgressIndex), Math.max(0, revisionDeck.length - 1));
  const continueAyah = remainingItems[0]?.startAyah ?? state.revisionProgressAyah ?? 1;

  const startRevision = (index = continueIndex, ayah = continueAyah) => {
    if (!yesterdayWeakCount) {
      onStart("revision", index, ayah);
      return;
    }
    Alert.alert("Review yesterday's weak cards first?", `You have ${yesterdayWeakCount} weak āyah${yesterdayWeakCount === 1 ? "" : "s"} from yesterday. Warm those up before continuing revision?`, [
      { text: "Skip", style: "cancel", onPress: () => onStart("revision", index, ayah) },
      { text: "Review weak", onPress: () => onStart("yesterdayWeak") }
    ]);
  };
  const startWeak = () => {
    if (!weakCount) {
      Alert.alert("No weak cards yet", "Mark an ayah as shaky, forgotten, or stuck during a session and it will appear here.");
      return;
    }
    onStart("weak");
  };

  if (revisionDetailOpen) {
    return (
      <ScrollView style={styles.fullScreen} contentContainerStyle={[styles.settingsContent, { paddingTop: safeTop + 8, paddingBottom: Math.max(110, safeBottom + 96) }]} showsVerticalScrollIndicator={false}>
        <Header title="Pick revision" onBack={() => setRevisionDetailOpen(false)} />
        <Panel>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Overline>Current revision cycle</Overline>
              <Text style={styles.cardTitle}>{revision.done} of {revision.total} ayat complete</Text>
              <Text style={styles.cardSubtitle}>Full khatm {revision.rounds + 1} - {revision.remaining} ayat left - target {revision.dailyTarget}/day</Text>
            </View>
            <View style={styles.todayRing}>
              <Text style={styles.todayRingValue}>{revision.pct}%</Text>
              <Text style={styles.todayRingLabel}>done</Text>
            </View>
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${revision.pct}%`, backgroundColor: colors.mint }]} />
          </View>
        </Panel>

        <Panel>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Revision cycle record</Text>
            <Text style={styles.greenStrong}>{remainingItems.length} left</Text>
          </View>
          <ScrollView style={{ maxHeight: 360 }} nestedScrollEnabled showsVerticalScrollIndicator>
            {roundItems.map((entry) => {
              const pct = entry.totalAyahs ? Math.round((entry.doneAyahs / entry.totalAyahs) * 100) : 0;
              const completed = entry.status === "completed";
              const current = entry.status === "current";
              return (
                <View key={entry.flow.surah ?? entry.index} style={styles.journalRow}>
                  <View style={[styles.journalDot, { backgroundColor: completed ? colors.mint : current ? colors.goldDark : colors.lineDark }]} />
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{entry.flow.label}</Text>
                    <Text style={styles.cardSubtitle}>
                      {completed ? "Completed in this cycle" : current ? `Current - continue from ayah ${entry.startAyah}` : `Not started - ${entry.totalAyahs} ayat`}
                    </Text>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: completed ? colors.mint : colors.goldDark }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Panel>

        <Panel>
          <Text style={styles.sectionTitle}>Choose unfinished surah</Text>
          <Text style={styles.cardSubtitle}>Open any remaining surah, or mark small surahs complete from here.</Text>
          <View style={styles.revisionPickList}>
            {remainingItems.map((entry) => (
              <View key={entry.flow.surah ?? entry.index} style={styles.revisionPickRow}>
                <Pressable style={styles.revisionPickMain} onPress={() => startRevision(entry.index, entry.startAyah)}>
                  <Text style={styles.revisionPickBadge}>{entry.flow.surah}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.revisionPickLabel}>{entry.flow.label}</Text>
                    <Text style={styles.cardSubtitle}>Start from ayah {entry.startAyah} - {entry.totalAyahs - entry.doneAyahs} left</Text>
                  </View>
                </Pressable>
                <Pressable style={styles.revisionQuickDone} onPress={() => onCompleteSurah(entry.index)} hitSlop={8}>
                  <Ionicons name="checkmark" size={18} color={colors.mintDark} />
                </Pressable>
              </View>
            ))}
            {remainingItems.length === 0 && <Text style={styles.cardSubtitle}>Full revision khatm complete. Start any revision session to begin the next khatm.</Text>}
          </View>
        </Panel>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={[styles.settingsContent, { paddingTop: safeTop + 8, paddingBottom: Math.max(110, safeBottom + 96) }]} showsVerticalScrollIndicator={false}>
      <Header title="Choose your session" onBack={() => onNav("home")} />
      <Overline>Three ways to drill</Overline>
      <ModeCard
        icon="leaf-outline"
        title="New Hifz Cards"
        subtitle={`${startName} - next ${newCount} ayat from ayah ${state.newRange.from}`}
        quote="Recite this ayah, then continue to the next one."
        onPress={() => onStart("new")}
      />
      <ModeCard
        icon="repeat-outline"
        title="Revision Flow Cards"
        subtitle={`Pick from ${remainingItems.length || revisionCount} surah${(remainingItems.length || revisionCount) === 1 ? "" : "s"} - ${revision.remaining} ayat left in this full revision`}
        quote="See your revision cycle, then continue from any surah."
        onPress={() => setRevisionDetailOpen(true)}
      />
      <ModeCard
        icon="shield-checkmark-outline"
        title="Recent Sūrah Solidifier"
        subtitle={`Revise the ${recentCount || 3} most recent learnt sūrah${(recentCount || 3) === 1 ? "" : "s"} end-to-end`}
        quote="A focused pass over fresh memorisation before it has time to fade."
        onPress={() => onStart("recent")}
      />
      <Panel>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Overline>Revision cycle</Overline>
            <Text style={styles.cardTitle}>{revision.pct}% complete</Text>
            <Text style={styles.cardSubtitle}>{revision.done}/{revision.total} ayat - {revision.remaining} left</Text>
          </View>
          <Text style={styles.greenStrong}>Full khatm {revision.rounds + 1}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${revision.pct}%`, backgroundColor: colors.mint }]} />
        </View>
      </Panel>
      <ModeCard
        icon="warning-outline"
        title="Weak Spot Cards"
        subtitle={weakCount ? `Repeat the ${weakCount} ayat you slipped on` : "Marked slips will appear here"}
        quote={weakCount ? "Drill the shaky ones until they settle." : "Start with revision or new cards to build this deck."}
        warn
        onPress={startWeak}
      />
    </ScrollView>
  );
}

function QuizSetupScreen({
  state,
  safeTop,
  safeBottom,
  onPatch,
  onNav,
  onStart
}: {
  state: AppState;
  safeTop: number;
  safeBottom: number;
  onPatch: (next: Partial<AppState>) => void;
  onNav: (screen: Screen) => void;
  onStart: () => void;
}) {
  const quizRange = state.quizRange ?? state.revisionRanges[0];
  const revisionSummary = state.revisionRanges.map((range) => range.label).join(" · ");
  const updateQuizRange = (fromSurah: number, toSurah: number) => {
    onPatch({ quizRange: makeSurahRange(fromSurah, toSurah, quizRange?.id ?? "quiz-custom") });
  };

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={[styles.settingsContent, { paddingTop: safeTop + 8, paddingBottom: Math.max(110, safeBottom + 96) }]} showsVerticalScrollIndicator={false}>
      <Header title="Quiz mode" onBack={() => onNav("home")} />
      <Panel style={styles.quizIntroCard}>
        <View style={styles.settingRowInner}>
          <View style={styles.iconTile}>
            <Ionicons name="shuffle-outline" size={21} color={colors.mint} />
          </View>
          <View style={styles.flex}>
            <Overline>Random continuation test</Overline>
            <Text style={styles.cardTitle}>Start from any known āyah</Text>
            <Text style={styles.cardSubtitle}>Each question gives you one starting āyah. Recite from there for the next 5 āyāt, then mark how clean it felt. Nothing here is saved to your normal progress.</Text>
          </View>
        </View>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Questions</Text>
        <Text style={styles.cardSubtitle}>Choose a short drill or a deeper spot-check.</Text>
        <Segmented
          values={["5", "10", "15", "20"]}
          labels={["5", "10", "15", "20"]}
          active={String(state.quizQuestionCount || 5)}
          onChange={(value) => onPatch({ quizQuestionCount: Number(value) })}
        />
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Prompt style</Text>
        <Text style={styles.cardSubtitle}>Text shows the āyah on the card. Audio-only hides the text and asks you to recognise it by listening.</Text>
        <Segmented
          values={["text", "audio"]}
          labels={["Text", "Audio only"]}
          active={state.quizPromptMode ?? "text"}
          onChange={(value) => onPatch({ quizPromptMode: value as AppState["quizPromptMode"] })}
        />
      </Panel>

      {state.quizPromptMode !== "audio" && (
        <Panel>
          <Text style={styles.sectionTitle}>Recitation button</Text>
          <Text style={styles.cardSubtitle}>Keep a playback button on each text question, or make the quiz fully visual.</Text>
          <Segmented
            values={["on", "off"]}
            labels={["Show", "Hide"]}
            active={state.quizReciteButton === false ? "off" : "on"}
            onChange={(value) => onPatch({ quizReciteButton: value === "on" })}
          />
        </Panel>
      )}

      <Panel>
        <Text style={styles.sectionTitle}>Range</Text>
        <Text style={styles.cardSubtitle}>{state.quizCustomRange ? "Use a temporary range just for this quiz." : `Default: your revision range (${revisionSummary || "not set"}).`}</Text>
        <Segmented
          values={["revision", "custom"]}
          labels={["My revision", "Custom"]}
          active={state.quizCustomRange ? "custom" : "revision"}
          onChange={(value) => onPatch({ quizCustomRange: value === "custom" })}
        />
      </Panel>

      {state.quizCustomRange && quizRange && (
        <KnownSurahRangeCard
          index={0}
          range={quizRange}
          onChange={updateQuizRange}
        />
      )}

      <PrimaryButton label="Start quiz" icon="arrow-forward" onPress={onStart} />
    </ScrollView>
  );
}

function QuizSessionScreen({
  state,
  safeTop,
  safeBottom,
  onPatch,
  onMark,
  onExit
}: {
  state: AppState;
  safeTop: number;
  safeBottom: number;
  onPatch: (next: Partial<AppState>) => void;
  onMark: (status: ResultStatus) => void;
  onExit: (screen?: Screen) => void;
}) {
  const total = state.quizDeck.length;
  const index = Math.min(state.quizIndex, Math.max(0, total - 1));
  const question = state.quizDeck[index];
  const progress: DimensionValue = total ? `${Math.round(((index + 1) / total) * 100)}%` : "0%";
  const arScale = arabicSizeScale[state.arabicSize] ?? 1;
  const actionBottom = safeBottom + (Platform.OS === "android" ? 28 : 34);
  const cardBottom = actionBottom + (Platform.OS === "android" ? 88 : 98);
  const values = Object.values(state.quizResults ?? {});
  const solid = values.filter((value) => value === "solid").length;
  const shaky = values.filter((value) => value === "shaky").length;
  const forgot = values.filter((value) => value === "forgot").length;

  useEffect(() => () => stopAyah(), []);

  if (state.quizPhase === "done" || !question) {
    return (
      <ScrollView style={styles.sessionBg} contentContainerStyle={[styles.doneContent, { paddingTop: safeTop + 50, paddingBottom: safeBottom + 30 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.doneCheck}>
          <Ionicons name="checkmark" size={42} color={colors.gold} />
        </View>
        <Text style={styles.doneTitle}>Quiz complete</Text>
        <Text style={styles.doneSub}>{values.length} temporary question{values.length === 1 ? "" : "s"} checked</Text>
        <View style={styles.statRow}>
          <ResultBox value={solid} label="Solid" color={colors.mint} />
          <ResultBox value={shaky} label="Shaky" color={colors.goldDark} />
          <ResultBox value={forgot} label="Forgot" color={colors.red} />
        </View>
        <Panel>
          <Text style={styles.sectionTitle}>Not saved to progress</Text>
          <Text style={styles.cardSubtitle}>Quiz marks are just a live self-check. Your weak āyāt, streak, khatm progress, and review journal were not changed.</Text>
        </Panel>
        <OutlineButton label="Run another quiz" onPress={() => onPatch({ screen: "quizSetup", quizPhase: "idle", quizDeck: [], quizIndex: 0, quizResults: {} })} />
        <PrimaryButton label="Back to home" onPress={() => onExit("home")} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.sessionBg}>
      <View style={[styles.sessionTop, { paddingTop: safeTop + 12 }]}>
        <IconButton name="close" onPress={() => onExit("home")} />
        <Text style={[styles.counterPill, styles.revisionTitlePill]} numberOfLines={1}>QUIZ · {index + 1}/{total}</Text>
        <IconButton name="settings-outline" onPress={() => onPatch({ screen: "quizSetup" })} />
      </View>
      <Text style={styles.sessionSubtitle}>{question.label} · start at āyah {question.ayah}</Text>
      <View style={styles.sessionProgressTrack}>
        <LinearGradient colors={[colors.mint, "#6aa991"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.sessionProgress, { width: progress }]} />
      </View>
      <View style={[styles.cardStack, styles.memoriseCardStack, { top: safeTop + (Platform.OS === "android" ? 108 : 116), bottom: cardBottom }]}>
        <View style={[styles.behindCard, styles.behindCardOne]} />
        <View style={[styles.behindCard, styles.behindCardTwo]} />
        <View style={[styles.practiceCard, styles.quizPracticeCard]}>
          <View style={styles.quizCardBody}>
            <Text style={styles.modeChip}>CONTINUE FOR 5 ĀYĀT</Text>
            <Text style={styles.quizInstruction}>Recite from āyah {question.ayah} to āyah {question.continueTo}, then mark the attempt.</Text>
            {state.quizPromptMode === "audio" ? (
              <View style={styles.quizAudioOnly}>
                <Ionicons name="volume-high-outline" size={34} color={colors.mint} />
                <Text style={styles.cardTitle}>Audio-only prompt</Text>
                <Text style={styles.cardSubtitle}>Listen first. Try to identify the āyah and continue from memory before checking anything.</Text>
              </View>
            ) : (
              <>
                <Arabic style={[styles.quizArabic, { fontSize: 27 * arScale, lineHeight: 54 * arScale }]}>{question.full}</Arabic>
                <Text style={styles.translation}>{question.translation}</Text>
              </>
            )}
          </View>
          {(state.quizPromptMode === "audio" || state.quizReciteButton !== false) && (
            <Pressable style={styles.audioButton} onPress={() => playAyah(question.surah, question.ayah, state.reciterId)}>
              <View style={styles.audioIcon}>
                <Ionicons name="play" size={12} color="#fff" />
              </View>
              <Text style={styles.audioText}>Play recitation</Text>
            </Pressable>
          )}
        </View>
      </View>
      <View style={[styles.markRow, { bottom: actionBottom }]}>
        <View style={styles.markRowInner}>
          <MarkButton label="Forgot" sub="lost place" color={colors.red} onPress={() => onMark("forgot")} />
          <MarkButton label="Shaky" sub="hesitated" color={colors.goldDark} onPress={() => onMark("shaky")} />
          <MarkButton label="Solid" sub="clean run" color="#fff" filled onPress={() => onMark("solid")} />
        </View>
      </View>
    </View>
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
  onAddWeak,
  onResumeRevision
}: {
  state: AppState;
  safeTop: number;
  safeBottom: number;
  onNav: (screen: Screen) => void;
  onPatch: (next: Partial<AppState>) => void;
  onStart: (mode: SessionMode) => void;
  onMark: (status: ResultStatus) => void;
  onStopAt: (surah: number, ayah: number) => void;
  onAddWeak: (surah: number, ayah: number, label: string) => void;
  onResumeRevision: () => void;
}) {
  const deck = getDeck(state.sessionMode, buildDeckContext(state));
  const item = deck[Math.min(state.cardIndex, deck.length - 1)];
  const total = deck.length;
  const progress = sessionProgressWidth(state.cardIndex, total);
  const translateX = useRef(new Animated.Value(0)).current;
  const isRev = isRevisionFlow(item);
  const isRecent = state.sessionMode === "recent";
  const isWeakReview = state.sessionMode === "weak" || state.sessionMode === "yesterdayWeak";
  const reading = isRev && state.revisionReadAyah > 0;
  const arScale = arabicSizeScale[state.arabicSize] ?? 1;
  const readCard = reading ? ayahCard(item.surah ?? 0, state.revisionReadAyah, state.arabicScript) : null;
  const currentSurahNumber = isRev ? item.surah ?? 0 : surahNumberFromLabel(item.surah ?? "67");
  const currentAyahNumber = reading ? state.revisionReadAyah : isRev ? item.start : item.num;
  const readAlreadyWeak = reading && !!state.results[`${currentSurahNumber}:${state.revisionReadAyah}`];
  const revisionEndAyah = isRev ? item.passage[item.passage.length - 1]?.num ?? item.start : 1;
  const revisionStartAyah = isRev ? Math.min(revisionEndAyah, Math.max(item.start, state.revisionResumeAyah || item.start)) : 1;
  const actionBottom = safeBottom + (Platform.OS === "android" ? 28 : 34);
  const actionHeight = !isRev ? (Platform.OS === "android" ? 56 : 64) : 54;
  const cardBottom = actionBottom + actionHeight + (Platform.OS === "android" ? 26 : 34);
  const memoSurahName = isRev ? "" : (item.surah?.split("·").slice(1).join("·").trim() || item.surah || "Al-Mulk");
  const topTitle = isRev
    ? isRecent ? "RECENT · SOLIDIFY" : "REVISION · RECITE FROM HERE"
    : isWeakReview
      ? "REPEAT · YOU SLIPPED HERE"
      : "TODAY'S MEMORISATION";
  const topSubtitle = isRev
    ? `${item.label} · from āyah ${reading ? state.revisionReadAyah : revisionStartAyah}`
    : `Sūrah ${memoSurahName} · āyah ${item.num}`;
  // Push the card below the (safe-area-aware) top bar + progress + subtitle so they never overlap.
  const cardTop = safeTop + (Platform.OS === "android" ? 80 : 86) + 28;

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

  const navigateRevisionReadAyah = (direction: 1 | -1) => {
    if (!isRevisionFlow(item) || !reading) return false;
    const nextAyah = state.revisionReadAyah + direction;
    const minAyah = item.passage[0]?.num ?? 1;
    const maxAyah = item.passage[item.passage.length - 1]?.num ?? minAyah;
    if (nextAyah < minAyah || nextAyah > maxAyah) return false;
    onPatch({ revisionReadAyah: nextAyah, revisionResumeAyah: nextAyah, revisionProgressAyah: nextAyah });
    return true;
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

  // Swipe navigates memorisation/weak cards; in revision read mode it moves between nearby ayahs.
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 14 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => translateX.setValue(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if ((!isRev || reading) && Math.abs(gesture.dx) > 120) {
            const direction = gesture.dx > 0 ? 1 : -1;
            if (!reading && direction < 0 && state.cardIndex <= 0) {
              Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
              return;
            }
            if (reading && !navigateRevisionReadAyah(direction)) {
              Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
              return;
            }
            Animated.timing(translateX, {
              toValue: gesture.dx > 0 ? 520 : -520,
              duration: 220,
              useNativeDriver: true
            }).start(() => {
              if (reading) translateX.setValue(0);
              else navigateMemoriseCard(direction);
            });
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true }).start();
          }
        }
      }),
    [isRev, navigateMemoriseCard, navigateRevisionReadAyah, reading, state.cardIndex, translateX]
  );

  const confirmFinishedSurah = () => {
    Alert.alert("Mark surah complete?", isRecent ? "This completes the surah for this recent-solidifier session only." : "This marks only this surah as complete inside the current revision cycle.", [
      { text: "Cancel", style: "cancel" },
      { text: "Finished", onPress: () => onMark("finished") }
    ]);
  };

  if (state.sessionPhase === "done") {
    const values = Object.values(state.results);
    const isRev = state.sessionMode === "revision";
    const sessionRecords = (state.reviewHistory ?? []).slice(0, Math.max(1, Math.min(total, 4)));
    return (
      <ScrollView style={styles.sessionBg} contentContainerStyle={[styles.doneContent, { paddingTop: safeTop + 50, paddingBottom: safeBottom + 30 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.doneCheck}>
          <Ionicons name="checkmark" size={42} color={colors.gold} />
        </View>
        <Text style={styles.doneTitle}>
          {state.sessionMode === "new"
            ? "Sabaq locked in"
            : state.sessionMode === "weak"
              ? "Weak spots revisited"
              : state.sessionMode === "yesterdayWeak"
                ? "Yesterday's weak spots reviewed"
                : state.sessionMode === "recent"
                  ? "Recent sūrahs strengthened"
                  : "Revision complete"}
        </Text>
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
        <Text style={[styles.counterPill, styles.revisionTitlePill, state.sessionMode === "weak" && styles.weakTitlePill]} numberOfLines={1}>{topTitle}</Text>
        <IconButton name="settings-outline" onPress={() => onNav("notif")} />
      </View>
      <Text style={styles.sessionSubtitle}>{topSubtitle}</Text>
      <View style={styles.sessionProgressTrack}>
        <LinearGradient colors={[colors.mint, "#6aa991"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.sessionProgress, { width: progress }]} />
      </View>
      <View style={[styles.cardStack, !isRev && styles.memoriseCardStack, { top: cardTop, bottom: cardBottom }]}>
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
          {reading && readCard ? (
            <AyahCard card={readCard} note="Practise this āyah, then continue the revision from here." arScale={arScale} hideMeta />
          ) : isRev ? (
            <RevisionCard
              item={item}
              startAt={revisionStartAyah}
              revealed={state.revealed}
              script={state.arabicScript}
              onReveal={() => onPatch({ revealed: true })}
              arScale={arScale}
              onStuck={(ayah) => onStopAt(item.surah ?? 0, ayah)}
              onMarkWeak={(ayah) => onAddWeak(item.surah ?? 0, ayah, item.label)}
              isWeak={(ayah) => Boolean(state.results[`${item.surah ?? 0}:${ayah}`])}
            />
          ) : (
            <AyahCard card={item} arScale={arScale} hideMeta />
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
        <View style={[styles.markRow, { bottom: actionBottom }]}>
          <View style={styles.markRowInner}>
            <MarkButton label="Forgot" sub="show soon" color={colors.red} onPress={() => onMark("forgot")} />
            <MarkButton label="Shaky" sub="review later" color={colors.goldDark} onPress={() => onMark("shaky")} />
            <MarkButton label="Solid" sub="space it out" color="#fff" filled onPress={() => onMark("solid")} />
          </View>
        </View>
      ) : reading ? (
        <View style={[styles.markRow, { bottom: actionBottom }]}>
          <View style={styles.readActionStack}>
            <PrimaryButton
              label={readAlreadyWeak ? "In weak" : "Add to weak"}
              icon={readAlreadyWeak ? undefined : "bookmark-outline"}
              onPress={() => onAddWeak(currentSurahNumber, state.revisionReadAyah, isRevisionFlow(item) ? item.label : "")}
              style={readAlreadyWeak ? styles.weakActionDone : styles.weakActionButton}
              textColor={colors.green}
            />
            <PrimaryButton
              label={`Continue from āyah ${state.revisionReadAyah}`}
              icon="return-down-forward"
              onPress={onResumeRevision}
              style={styles.readContinueButton}
            />
          </View>
        </View>
      ) : !state.revealed ? (
        <View style={[styles.markRow, { bottom: actionBottom }]}>
          <View style={styles.markRowInner}>
            <PrimaryButton label="I've recited · mark where I stopped" icon="arrow-down" onPress={() => onPatch({ revealed: true })} style={styles.flex} />
          </View>
        </View>
      ) : (
        <View style={[styles.markRow, { bottom: actionBottom }]}>
          <View style={styles.markRowInner}>
            <PrimaryButton label="Finish this sūrah" icon="checkmark" onPress={confirmFinishedSurah} style={styles.sessionPrimaryAction} />
          </View>
        </View>
      )}
    </View>
  );
}

function ProgressScreen({ state, safeTop, onNav, onStart }: { state: AppState; safeTop: number; onNav: (screen: Screen) => void; onStart: (mode: SessionMode, startIndex?: number) => void }) {
  const progress = getProgressStats(state.reviewHistory);
  const dashboard = getDashboardStats(state);
  const revision = revisionTotals(state);
  const roundItems = revisionRoundItems(state);
  const weakCards = buildWeakDeck(state.reviewHistory, state.arabicScript);
  const month = monthConsistency(state.reviewHistory);

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={styles.withTabsScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, { paddingTop: safeTop + 8 }]}>
        <Text style={styles.screenTitle}>Progress</Text>
        <Text style={styles.screenSub}>Memorising {state.newRange.surah}</Text>
        <Pressable style={[styles.panel, styles.rowBetween]} onPress={() => onNav("khatms")}>
          <View style={styles.flex}>
            <Overline>Completed full khatms</Overline>
            <Text style={styles.cardTitle}>{revision.rounds} complete {revision.rounds === 1 ? "khatm" : "khatms"}</Text>
            <Text style={styles.cardSubtitle}>Tap to see all your past khatms ›</Text>
          </View>
          <View style={styles.todayRing}>
            <Text style={styles.todayRingValue}>{revision.rounds}</Text>
            <Text style={styles.todayRingLabel}>khatms</Text>
          </View>
        </Pressable>
        <Panel>
          <ProgressLine label="Memorisation" value={`${dashboard.memorisedPercent}%`} pct={dashboard.memorisedPercent} color={colors.mint} />
          <ProgressLine label="Current revision cycle" value={`${revision.pct}%`} pct={revision.pct} color={colors.goldDark} />
          <Text style={styles.cardSubtitle}>Full khatm pace: {revision.dailyTarget} ayat/day · {revision.remainingToday} left today</Text>
        </Panel>
        <Panel>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Current revision cycle</Text>
            <Text style={styles.greenStrong}>{revision.remaining} left</Text>
          </View>
          <ScrollView style={{ maxHeight: 300 }} nestedScrollEnabled showsVerticalScrollIndicator>
            {roundItems.map((entry) => {
              const pct = entry.totalAyahs ? Math.round((entry.doneAyahs / entry.totalAyahs) * 100) : 0;
              return (
                <View key={entry.flow.surah ?? entry.index} style={styles.journalRow}>
                  <View style={[styles.journalDot, { backgroundColor: entry.status === "completed" ? colors.mint : entry.status === "current" ? colors.goldDark : colors.lineDark }]} />
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>{entry.flow.label}</Text>
                    <Text style={styles.cardSubtitle}>
                      {entry.status === "completed" ? "Completed" : entry.status === "current" ? `Current · from ayah ${entry.startAyah}` : `${entry.totalAyahs} ayat left`}
                    </Text>
                    <View style={styles.track}>
                      <View style={[styles.fill, { width: `${pct}%`, backgroundColor: entry.status === "completed" ? colors.mint : colors.goldDark }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        </Panel>
        <View style={styles.statRow}>
          <ResultBox value={progress.easy} label="Easy" color={colors.mint} />
          <ResultBox value={progress.weak} label="Weak" color={colors.goldDark} />
          <ResultBox value={progress.failed} label="Failed" color={colors.red} />
        </View>
        <Panel>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Weak āyāt to drill</Text>
            <Text style={styles.greenStrong}>{weakCards.length} marked</Text>
          </View>
          {weakCards.length ? (
            <View style={styles.weakPillWrap}>
              {weakCards.map((card, index) => (
                <Pressable
                  key={`${card.surah}:${card.num}`}
                  style={styles.weakPill}
                  onPress={() => onStart("weak", index)}
                >
                  <Text style={styles.weakPillText}>{surahNumberFromLabel(card.surah ?? "")}:{card.num}</Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Text style={styles.cardSubtitle}>Nothing flagged yet — āyāt you slip on during revision show up here to drill.</Text>
          )}
        </Panel>
        <Panel>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>{month.label}</Text>
            <Text style={[styles.greenStrong, { color: month.color }]}>{month.active} / {month.days} days</Text>
          </View>
          <View style={styles.monthStrip}>
            {Array.from({ length: month.days }, (_, i) => i + 1).map((day) => (
              <View
                key={day}
                style={[
                  styles.monthStripBar,
                  { backgroundColor: month.activeDays.has(day) ? colors.mint : colors.line },
                  day === month.today && styles.monthStripToday
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

function KhatmsScreen({ state, safeTop, onNav, onStart }: { state: AppState; safeTop: number; onNav: (screen: Screen) => void; onStart: (mode: SessionMode, startIndex?: number) => void }) {
  const khatms = state.khatms ?? [];
  const [openKhatmId, setOpenKhatmId] = useState(khatms[0]?.id ?? "");
  const totals = revisionTotals(state);
  const khatm = currentKhatmStats(state);
  const currentWeak = khatm.weakAyahs;
  const curWeakPct = khatm.weakPct;
  const curStrongPct = khatm.strongPct;
  const curRemainPct = khatm.remainPct;
  const weakDeck = buildWeakDeck(state.reviewHistory, state.arabicScript);
  const openWeak = (surah: number, ayah: number) => {
    const idx = weakDeck.findIndex((card) => surahNumberFromLabel(card.surah ?? "") === surah && card.num === ayah);
    if (idx >= 0) onStart("weak", idx);
  };
  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={[styles.settingsContent, { paddingTop: safeTop + 8 }]} showsVerticalScrollIndicator={false}>
      <Header title="Revision khatms" onBack={() => onNav("progress")} />
      <Text style={styles.cardSubtitle}>Every time you complete the full revision cycle for what you know, it is saved here as a khatm. The bar shows how solid that khatm was — green is clean, red is āyāt you slipped on.</Text>
      <Panel style={[styles.khatmCard, styles.khatmCurrent]}>
        <View style={styles.rowBetween}>
          <Text style={styles.cardTitle}>Current khatm · in progress</Text>
          <Text style={[styles.greenStrong, { color: colors.gold }]}>{totals.pct}%</Text>
        </View>
        <View style={styles.khatmBar}>
          <View style={{ width: `${curStrongPct}%`, backgroundColor: colors.mint }} />
          <View style={{ width: `${curWeakPct}%`, backgroundColor: curWeakPct > 25 ? colors.red : colors.goldDark }} />
          <View style={{ width: `${curRemainPct}%`, backgroundColor: colors.line }} />
        </View>
        <Text style={styles.khatmMeta}>{totals.done} of {totals.total} āyāt · {currentWeak.length} weak so far</Text>
        {currentWeak.length > 0 && (
          <View style={styles.khatmWeakList}>
            {currentWeak.map((a) => (
              <Pressable key={`cur-${a.surah}:${a.ayah}`} style={styles.khatmWeakChip} onPress={() => openWeak(a.surah, a.ayah)}>
                <Text style={styles.khatmWeakText}>{a.surah}:{a.ayah}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </Panel>
      <Overline style={styles.spacedOverline}>Completed khatms</Overline>
      {khatms.length === 0 ? (
        <Panel style={styles.khatmEmpty}>
          <Ionicons name="ribbon-outline" size={26} color={colors.mint} />
          <Text style={styles.cardTitle}>No khatms yet</Text>
          <Text style={styles.cardSubtitle}>Finish a full revision cycle and it'll appear here.</Text>
        </Panel>
      ) : (
        khatms.map((khatm, index) => {
          const weakPct = khatm.total ? Math.min(100, Math.round((khatm.weak / khatm.total) * 100)) : 0;
          const strongPct = 100 - weakPct;
          const expanded = openKhatmId === khatm.id;
          return (
            <Pressable
              key={khatm.id}
              style={[styles.panel, styles.khatmCard]}
              onPress={() => setOpenKhatmId(expanded ? "" : khatm.id)}
            >
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>Khatm #{khatms.length - index}</Text>
                <Text style={styles.cardSubtitle}>{expanded ? "Hide weak āyāt" : "Show weak āyāt"}</Text>
              </View>
              <Text style={styles.cardSubtitle}>{formatHistoryTime(khatm.completedAt)}</Text>
              <View style={styles.khatmBar}>
                <View style={{ width: `${strongPct}%`, backgroundColor: colors.mint }} />
                <View style={{ width: `${weakPct}%`, backgroundColor: weakPct > 25 ? colors.red : colors.goldDark }} />
              </View>
              <Text style={styles.khatmMeta}>{khatm.total} āyāt revised · {khatm.weak} weak ({weakPct}%)</Text>
              {expanded && (
                <View style={styles.khatmWeakList}>
                  {khatm.weakAyahs?.length ? (
                    khatm.weakAyahs.map((ayah) => (
                      <Pressable key={`${khatm.id}-${ayah.surah}:${ayah.ayah}`} style={styles.khatmWeakChip} onPress={() => openWeak(ayah.surah, ayah.ayah)}>
                        <Text style={styles.khatmWeakText}>{ayah.surah}:{ayah.ayah}</Text>
                      </Pressable>
                    ))
                  ) : (
                    <Text style={styles.cardSubtitle}>No weak āyāt were recorded for this khatm.</Text>
                  )}
                </View>
              )}
            </Pressable>
          );
        })
      )}
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
        <LinearGradient colors={[colors.green2, "#0c3128"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.comingSoonHero}>
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonBadgeText}>COMING SOON</Text>
          </View>
          <Ionicons name="people" size={34} color={colors.gold} style={{ marginTop: 14 }} />
          <Text style={styles.comingSoonTitle}>Compete in good deeds with friends & family</Text>
          <Text style={styles.comingSoonBody}>
            Soon you'll be able to revise together — gentle leaderboards ranked by effort and consistency, group khatms, and
            encouragement, never by how much you know.
          </Text>
        </LinearGradient>
        <Overline style={styles.spacedOverline}>A sneak peek</Overline>
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
  const cardRef = useRef<View>(null);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const weekLabel = `Week of ${weekStart.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
  const shareText = `Hifz Cards weekly recap: ${recap.cardsTested} cards reviewed, ${recap.ayahsRevised} āyāt revised, ${recap.newMemorised} new memorised, ${recap.effortPoints} effort points.`;
  const shareRecap = async () => {
    try {
      const uri = await captureRef(cardRef, { format: "png", quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share your Hifz recap" });
        return;
      }
      await Share.share({ url: uri, message: shareText });
    } catch {
      Share.share({ message: shareText }).catch(() => undefined);
    }
  };

  return (
    <ScrollView style={styles.recapScreen} contentContainerStyle={styles.recapContent} showsVerticalScrollIndicator={false}>
      <View style={[styles.recapHeader, { paddingTop: safeTop + 12 }]}>
        <IconButton name="arrow-back" onPress={() => onNav("progress")} dark />
        <Text style={styles.recapHeaderText}>Weekly recap</Text>
        <View style={{ width: 38 }} />
      </View>
      <View ref={cardRef} collapsable={false} style={styles.recapShareArea}>
        <Panel style={styles.shareCard}>
          <View style={styles.rowBetween}>
            <Overline>{weekLabel}</Overline>
            <View style={styles.miniLogo}>
              <Text style={styles.miniLogoText}>ﷺ</Text>
            </View>
          </View>
          <Text style={styles.bigNumber}>{recap.cardsTested}</Text>
          <Text style={styles.shareSub}>cards reviewed this week</Text>
          <Divider />
          {[
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
        <View style={styles.recapStats}>
          <RecapStat value={String(recap.ayahsRevised)} label="āyāt revised" />
          <RecapStat value={`+${recap.newMemorised}`} label="new memorised" />
          <RecapStat value={String(recap.effortPoints)} label="effort pts" />
        </View>
      </View>
      <PrimaryButton label="Share recap card" icon="share-outline" onPress={shareRecap} style={{ backgroundColor: colors.gold }} textColor={colors.green} />
      <Text style={styles.effortNote}>
        Effort points reward showing up: you earn points for each card you review and each day you keep your streak — it's about
        consistency, not how much you already know.
      </Text>
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
            <Text style={styles.profileInitial}>H</Text>
          </View>
          <View>
            <Text style={styles.profileName}>Your Hifz profile</Text>
            <Text style={styles.profileSub}>{communityLabel} · local progress on this device</Text>
          </View>
        </View>
        <View style={styles.profileStats}>
          <ProfileStat value={String(dashboard.securedCount)} label="āyāt secured" />
          <ProfileStat value={String(history.length)} label="journal marks" />
          <ProfileStat value={String(dashboard.streak)} label="day streak" />
        </View>
      </LinearGradient>
      <View style={styles.content}>
        <Overline>Display</Overline>
        <ArabicDisplayCard
          script={state.arabicScript ?? "uthmani"}
          size={state.arabicSize ?? "medium"}
          onScript={(arabicScript) => onPatch({ arabicScript })}
          onSize={(arabicSize) => onPatch({ arabicSize })}
        />
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
        <View style={styles.profileActionRow}>
          <Pressable style={styles.profileActionTile} onPress={() => onNav("board")}>
            <View style={styles.profileActionIcon}>
              <Ionicons name="people-outline" size={20} color={colors.mint} />
            </View>
            <Text style={styles.profileActionLabel}>Friends & classes</Text>
          </Pressable>
          <Pressable style={styles.profileActionTile} onPress={restartOnboarding}>
            <View style={styles.profileActionIcon}>
              <Ionicons name="refresh-outline" size={20} color={colors.mint} />
            </View>
            <Text style={styles.profileActionLabel}>Restart setup</Text>
          </Pressable>
          <Pressable style={[styles.profileActionTile, styles.profileActionDanger]} onPress={clearHistory}>
            <View style={[styles.profileActionIcon, styles.profileActionIconDanger]}>
              <Ionicons name="trash-outline" size={20} color={colors.red} />
            </View>
            <Text style={[styles.profileActionLabel, { color: colors.red }]}>Clear journal</Text>
          </Pressable>
        </View>
        <Panel style={styles.premium}>
          <Text style={styles.premiumMark}>ﷺ</Text>
          <Text style={styles.premiumTitle}>Change Current Plan</Text>
          <Text style={styles.premiumBody}>Adjust active hours, new memorisation nudges, revision order and days, and your khatm pace — all in one place.</Text>
          <PrimaryButton label="Open plan settings" onPress={() => onNav("notif")} style={{ backgroundColor: colors.gold }} textColor={colors.green} />
        </Panel>
      </View>
    </ScrollView>
  );
}
