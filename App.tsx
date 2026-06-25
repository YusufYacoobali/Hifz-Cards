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
  Text,
  View
} from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { buildDeckContext } from "./src/appStateSelectors";
import { ayahCard, ayahCellStyle, buildNewDeck, buildRevisionDeck, getDeck, isRevisionFlow, sessionProgressWidth } from "./src/deck";
import { HifzCard, weakDeck } from "./src/data";
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
import { remainingRevisionRoundItems, revisionRoundItems, revisionTotals, surahNumberFromLabel } from "./src/planning";
import { colors } from "./src/theme";
import { styles } from "./src/styles";
import { NewOnboardingScreen } from "./src/screens/NewOnboardingScreen";
import { NotificationsScreen } from "./src/screens/NotificationsScreen";
import { Arabic, ArabicFontContext, AyahCard, BottomTabs, Divider, Header, HeroHeader, IconButton, Legend, MarkButton, ModeCard, OutlineButton, Overline, Panel, Podium, PrimaryButton, ProfileStat, ProgressLine, RecapStat, ResultBox, RevisionCard, Segmented, SettingsRow, StatCard, formatDueDate, formatHistoryTime, resultColor, resultLabel, tabBarHeight } from "./src/components";
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
  const { state, showTabs, patch, nav, beginApp, startSession, markCard, stopAtAyah, addReadWeak, resumeRevision } = useHifzAppState();
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
          {state.screen === "notif" && <NotificationsScreen state={state} safeTop={safe.top} safeBottom={safe.bottom} onPatch={patch} onNav={nav} />}
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
              onAddWeak={addReadWeak}
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
  const revision = revisionTotals(state);

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
                    ? `${revision.doneToday}/${revision.dailyTarget} revised today · round ${revision.rounds + 1}`
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
          <Panel style={styles.notificationSummary}>
            <View style={styles.flex}>
              <Overline>Reminders today</Overline>
              <Text style={styles.cardTitle}>New memorisation and revision</Text>
              <Text style={styles.cardSubtitle}>Custom nudges inside your active hours.</Text>
            </View>
            <IconButton name="notifications-outline" onPress={() => onNav("notif")} />
          </Panel>
        </View>
      </ScrollView>
      <View style={[styles.homeStickyBar, { bottom: tabBarHeight(safeBottom), paddingBottom: 12 }]}>
        <PrimaryButton label="Start card session" icon="arrow-forward" onPress={onModes} />
      </View>
    </View>
  );
}

function ModeScreen({ state, safeTop, onNav, onStart }: { state: AppState; safeTop: number; onNav: (screen: Screen) => void; onStart: (mode: SessionMode, startIndex?: number, startAyah?: number) => void }) {
  const [revisionDetailOpen, setRevisionDetailOpen] = useState(false);
  const newCount = buildNewDeck(state.newRange, state.arabicScript).length;
  const revisionDeck = buildRevisionDeck(state.revisionRanges, state.arabicScript, state.revisionOrder);
  const revisionCount = revisionDeck.length;
  const revision = revisionTotals(state);
  const roundItems = revisionRoundItems(state);
  const remainingItems = remainingRevisionRoundItems(state);
  const startName = state.newRange.surah.split("\u00b7").slice(1).join("\u00b7").trim() || state.newRange.surah;
  const pickMode = (state.revisionOrder ?? "forward") === "select";
  const continueIndex = remainingItems[0]?.index ?? Math.min(Math.max(0, state.revisionProgressIndex), Math.max(0, revisionDeck.length - 1));
  const continueAyah = remainingItems[0]?.startAyah ?? state.revisionProgressAyah ?? 1;

  const startRevision = (index = continueIndex, ayah = continueAyah) => onStart("revision", index, ayah);

  if (revisionDetailOpen) {
    return (
      <ScrollView style={styles.fullScreen} contentContainerStyle={[styles.settingsContent, { paddingTop: safeTop + 8 }]} showsVerticalScrollIndicator={false}>
        <Header title={pickMode ? "Pick revision" : "Revision round"} onBack={() => setRevisionDetailOpen(false)} />
        <Panel>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Overline>Current round</Overline>
              <Text style={styles.cardTitle}>{revision.done} of {revision.total} ayat complete</Text>
              <Text style={styles.cardSubtitle}>Round {revision.rounds + 1} - {revision.remaining} ayat left - target {revision.dailyTarget}/day</Text>
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
            <Text style={styles.sectionTitle}>Round record</Text>
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
                      {completed ? "Completed this round" : current ? `Current - continue from ayah ${entry.startAyah}` : `Not started - ${entry.totalAyahs} ayat`}
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

        {pickMode ? (
          <Panel>
            <Text style={styles.sectionTitle}>Choose unfinished surah</Text>
            <Text style={styles.cardSubtitle}>Only sections left in this round are shown.</Text>
            <View style={styles.revisionPickList}>
              {remainingItems.map((entry) => (
                <Pressable key={entry.flow.surah ?? entry.index} style={styles.revisionPickRow} onPress={() => startRevision(entry.index, entry.startAyah)}>
                  <Text style={styles.revisionPickBadge}>{entry.flow.surah}</Text>
                  <View style={styles.flex}>
                    <Text style={styles.revisionPickLabel}>{entry.flow.label}</Text>
                    <Text style={styles.cardSubtitle}>Start from ayah {entry.startAyah} - {entry.totalAyahs - entry.doneAyahs} left</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </Pressable>
              ))}
              {remainingItems.length === 0 && <Text style={styles.cardSubtitle}>Round complete. Start any revision session to begin the next round.</Text>}
            </View>
          </Panel>
        ) : (
          <PrimaryButton label={remainingItems.length ? `Continue revision - ayah ${continueAyah}` : "Start next revision round"} icon="arrow-forward" onPress={() => startRevision()} />
        )}
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={[styles.settingsContent, { paddingTop: safeTop + 8 }]} showsVerticalScrollIndicator={false}>
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
        subtitle={pickMode ? `Pick from ${remainingItems.length} unfinished surah${remainingItems.length === 1 ? "" : "s"}` : `${revisionCount} surah${revisionCount === 1 ? "" : "s"} - ${revision.remaining} ayat left this round`}
        quote="See your round record, then continue revision."
        onPress={() => setRevisionDetailOpen(true)}
      />
      <Panel>
        <View style={styles.rowBetween}>
          <View style={styles.flex}>
            <Overline>Revision round</Overline>
            <Text style={styles.cardTitle}>{revision.pct}% complete</Text>
            <Text style={styles.cardSubtitle}>{revision.done}/{revision.total} ayat - {revision.remaining} left</Text>
          </View>
          <Text style={styles.greenStrong}>Round {revision.rounds + 1}</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${revision.pct}%`, backgroundColor: colors.mint }]} />
        </View>
      </Panel>
      <ModeCard
        icon="warning-outline"
        title="Weak Spot Cards"
        subtitle={`Repeat the ${weakDeck.length} ayat you slipped on`}
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
  const reading = isRev && state.revisionReadAyah > 0;
  const arScale = arabicSizeScale[state.arabicSize] ?? 1;
  const readCard = reading ? ayahCard(item.surah ?? 0, state.revisionReadAyah, state.arabicScript) : null;
  const currentSurahNumber = isRev ? item.surah ?? 0 : surahNumberFromLabel(item.surah ?? "67");
  const currentAyahNumber = reading ? state.revisionReadAyah : isRev ? item.start : item.num;
  const readAlreadyWeak = reading && !!state.results[`${currentSurahNumber}:${state.revisionReadAyah}`];
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

  const confirmFinishedSurah = () => {
    Alert.alert("Mark surah complete?", "This will count the current surah as finished for this revision round.", [
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
            <AyahCard card={readCard} note="Practise this āyah, then continue the revision from here." arScale={arScale} />
          ) : isRev ? (
            <RevisionCard
              item={item}
              startAt={revisionStartAyah}
              revealed={state.revealed}
              script={state.arabicScript}
              onReveal={() => onPatch({ revealed: true })}
              arScale={arScale}
              onStuck={(ayah) => onStopAt(item.surah ?? 0, ayah)}
            />
          ) : (
            <AyahCard card={item} arScale={arScale} />
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
        <View style={[styles.markRow, { bottom: safeBottom + (Platform.OS === "android" ? 20 : 28) }]}>
          <MarkButton label="Forgot" sub="show soon" color={colors.red} onPress={() => onMark("forgot")} />
          <MarkButton label="Shaky" sub="review later" color={colors.goldDark} onPress={() => onMark("shaky")} />
          <MarkButton label="Solid" sub="space it out" color="#fff" filled onPress={() => onMark("solid")} />
        </View>
      ) : reading ? (
        <View style={[styles.markRow, { bottom: safeBottom + (Platform.OS === "android" ? 20 : 28) }]}>
          <PrimaryButton
            label={readAlreadyWeak ? "In weak ✓" : "Add to weak"}
            icon={readAlreadyWeak ? "checkmark" : "bookmark-outline"}
            onPress={() => onAddWeak(currentSurahNumber, state.revisionReadAyah, isRevisionFlow(item) ? item.label : "")}
            style={readAlreadyWeak ? styles.weakActionDone : styles.weakActionButton}
            textColor={colors.green}
          />
          <PrimaryButton
            label={`Continue from āyah ${state.revisionReadAyah}`}
            icon="return-down-forward"
            onPress={onResumeRevision}
            style={styles.flex}
          />
        </View>
      ) : !state.revealed ? (
        <View style={[styles.markRow, { bottom: safeBottom + (Platform.OS === "android" ? 20 : 28) }]}>
          <PrimaryButton label="I've recited · mark where I stopped" icon="arrow-down" onPress={() => onPatch({ revealed: true })} style={styles.flex} />
        </View>
      ) : (
        <View style={[styles.markRow, { bottom: safeBottom + (Platform.OS === "android" ? 20 : 28) }]}>
          <PrimaryButton label="I reached the end · finished the sūrah" icon="checkmark" onPress={confirmFinishedSurah} style={styles.flex} />
        </View>
      )}
    </View>
  );
}

function ProgressScreen({ state, safeTop, onNav, onStart }: { state: AppState; safeTop: number; onNav: (screen: Screen) => void; onStart: (mode: SessionMode) => void }) {
  const progress = getProgressStats(state.reviewHistory);
  const dashboard = getDashboardStats(state);
  const revision = revisionTotals(state);
  const roundItems = revisionRoundItems(state);

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={styles.withTabsScroll} showsVerticalScrollIndicator={false}>
      <View style={[styles.content, { paddingTop: safeTop + 8 }]}>
        <Text style={styles.screenTitle}>Progress</Text>
        <Text style={styles.screenSub}>Memorising {state.newRange.surah}</Text>
        <Panel style={styles.rowBetween}>
          <View style={styles.flex}>
            <Overline>Revision rounds</Overline>
            <Text style={styles.cardTitle}>{revision.rounds} complete {revision.rounds === 1 ? "round" : "rounds"}</Text>
            <Text style={styles.cardSubtitle}>{revision.remaining} of {revision.total} āyāt left this round</Text>
          </View>
          <View style={styles.todayRing}>
            <Text style={styles.todayRingValue}>{revision.rounds}</Text>
            <Text style={styles.todayRingLabel}>rounds</Text>
          </View>
        </Panel>
        <Panel>
          <ProgressLine label="Memorisation" value={`${dashboard.memorisedPercent}%`} pct={dashboard.memorisedPercent} color={colors.mint} />
          <ProgressLine label="Revision round" value={`${revision.pct}%`} pct={revision.pct} color={colors.goldDark} />
          <Text style={styles.cardSubtitle}>Daily revision target: {revision.dailyTarget} ayat · {revision.remainingToday} left today</Text>
        </Panel>
        <Panel>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Current round record</Text>
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
  const cardRef = useRef<View>(null);
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
      <Panel ref={cardRef} style={styles.shareCard}>
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
