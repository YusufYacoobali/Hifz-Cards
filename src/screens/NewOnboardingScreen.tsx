import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ActiveHoursPanel, Arabic, DailyTargetCard, Divider, IconButton, InfoRow, KnownSurahRangeCard, Muted, OptionCard, OutlineButton, Overline, Panel, PrimaryButton, Segmented, ServiceScheduleCard, Stack, Stepper, SurahSearchList, Title, Toggle, activeHoursSummary } from "../components";
import { activeDayCount, makeNewRange, makeSurahRange, newStartLabel, nextFreeRange, rebalanceRevisionRanges, recommendedNewAyat, recommendedRevisionAyat, revisionRecommendationText, selectableSurahsForRange, surahAyahCount, surahNumberFromLabel } from "../planning";
import { allSurahs, SurahInfo } from "../surahs";
import { colors } from "../theme";
import { styles } from "../styles";
import { AppState, Days, RevisionOrder } from "../types";

type OnbStepKey =
  | "welcome"
  | "goal"
  | "newFocus"
  | "newReminders"
  | "revisionFocus"
  | "revisionReminders"
  | "schedule"
  | "summary";

export function NewOnboardingScreen({
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
  const revisionDailyTarget = recommendedRevisionAyat(state.revisionRanges, state.revisionRoundDays);

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
    onPatch({ newRange: range, sabaqTargetId: range.id, ayahFrom: 1, ayahTo: surah.ayahs, newProgressBySurah: { ...state.newProgressBySurah, [String(surah.number)]: 1 } });
  };
  const setNewStart = (from: number) => {
    const surah = surahNumberFromLabel(state.newRange.surah);
    onPatch({
      newRange: { ...state.newRange, from, label: newStartLabel(state.newRange.surah, from) },
      ayahFrom: from,
      newProgressBySurah: { ...state.newProgressBySurah, [String(surah)]: from }
    });
  };

  const updateRevisionRange = (id: string, fromSurah: number, toSurah: number) => {
    const revisionRanges = rebalanceRevisionRanges(state.revisionRanges, id, fromSurah, toSurah);
    onPatch({
      revisionRanges,
      revisionProgressIndex: 0,
      revisionProgressAyah: 1,
      revisionCompletedSurahs: {}
    });
  };
  const addRevisionRange = () => {
    const free = nextFreeRange(state.revisionRanges) ?? { from: 114, to: 114 };
    const range = makeSurahRange(free.from, free.to, `rev-${Date.now()}`);
    const revisionRanges = [...state.revisionRanges, range];
    onPatch({
      revisionRanges,
      revisionTargetId: range.id,
      revisionProgressIndex: 0,
      revisionProgressAyah: 1,
      revisionCompletedSurahs: {}
    });
  };
  const removeRevisionRange = (id: string) => {
    if (state.revisionRanges.length <= 1) return;
    const revisionRanges = state.revisionRanges.filter((range) => range.id !== id);
    onPatch({
      revisionRanges,
      revisionTargetId: state.revisionTargetId === id ? revisionRanges[0].id : state.revisionTargetId,
      revisionProgressIndex: 0,
      revisionProgressAyah: 1,
      revisionCompletedSurahs: {}
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
          <View style={styles.welcomeIntro}>
            <Title>Your Qur'an{"\n"}revision rhythm</Title>
            <Muted>
              Customise gentle reminders throughout the day for new memorisation and revision, then test yourself with cards that help weak ayat come back at the right time.
            </Muted>
            <View style={[styles.stack, styles.welcomeStack]}>
              <InfoRow
                icon="leaf-outline"
                title="You choose the rhythm"
                text="Set how often the app reminds you, from short recall nudges to daily revision."
              />
              <InfoRow
                icon="repeat-outline"
                title="Separate plans"
                text="Keep new memorisation and revision on their own schedules, days, and active hours."
              />
              <InfoRow
                icon="albums-outline"
                title="Cards that adapt"
                text="Swipe, reveal, and mark confidence so shaky ayat stay close and solid ones move on."
              />
            </View>
            <Panel style={styles.darkQuote}>
              <Arabic style={styles.darkQuoteArabic}>فَٱذْكُرُونِىٓ أَذْكُرْكُمْ</Arabic>
              <Text style={styles.darkQuoteText}>So remember Me; I will remember you. · 2:152</Text>
            </Panel>
          </View>
        )}

        {step === "goal" && (
          <View>
            <Title>What should{"\n"}we support?</Title>
            <Muted>
              Pick what you need right now. We will only set up the services that fit your choice. You can change this later.
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
            <Muted>Pick the sūrah and āyah you are starting new memorisation from. We'll keep moving you forward from there.</Muted>
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
            <Muted>
              These notifications are for repetitive reinforcement of new memorisation: recall the next ayah often, before it fades.
            </Muted>
            <Stack>
              <ServiceScheduleCard
                icon="leaf-outline"
                title="Today's memorisation"
                subtitle="For the new ayah or surah you are learning"
                enabled={state.sabaqOn}
                onToggle={() => onPatch({ sabaqOn: !state.sabaqOn })}
                frequency={state.sabaqFreq}
                frequencyLabel="New ayah reminder frequency"
                onFrequency={(sabaqFreq) => onPatch({ sabaqFreq, freq: sabaqFreq })}
                days={state.sabaqDays}
                daysLabel="New ayah reminder days"
                onToggleDay={(day) => onPatch({ sabaqDays: { ...state.sabaqDays, [day]: !state.sabaqDays[day] } })}
              />
              <DailyTargetCard
                icon="albums-outline"
                title="Daily new target"
                value={state.perDay}
                unit="ayat/day"
                note={`How many new ayat to attempt each day. Recommended: ${recommendedNewAyat(state.newRange)}`}
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
              Add the surah ranges you already know. Revision cards and revision notifications will only pull from these sections.
            </Muted>
            <Stack>
              {state.revisionRanges.map((range, index) => (
                <KnownSurahRangeCard
                  key={range.id}
                  index={index}
                  range={range}
                  fromOptions={selectableSurahsForRange(state.revisionRanges, range.id, "from")}
                  toOptions={selectableSurahsForRange(state.revisionRanges, range.id, "to")}
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
            <Muted>
              These notifications reinforce older memorisation. Pick the rhythm, then set how quickly you want to complete a full revision khatm.
            </Muted>
            <Stack>
              <ServiceScheduleCard
                icon="repeat-outline"
                title="Revision"
                subtitle={`${revisionDailyTarget} ayat per day from your known sections`}
                enabled={state.revisionOn}
                onToggle={() => onPatch({ revisionOn: !state.revisionOn })}
                frequency={state.revisionFreq}
                frequencyLabel="Revision reminder frequency"
                onFrequency={(revisionFreq) => onPatch({ revisionFreq })}
                days={state.revisionDays}
                daysLabel="Revision reminder days"
                onToggleDay={(day) => onPatch({ revisionDays: { ...state.revisionDays, [day]: !state.revisionDays[day] } })}
              />
              <Panel>
                <View style={styles.settingRowInner}>
                  <View style={styles.iconTile}>
                    <Ionicons name="swap-vertical-outline" size={20} color={colors.mint} />
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.cardTitle}>Revision order</Text>
                    <Text style={styles.cardSubtitle}>How to move through what you know. You always resume where you left off.</Text>
                  </View>
                </View>
                <Segmented
                  values={["forward", "backward"]}
                  labels={["Front → back", "Back → front"]}
                  active={state.revisionOrder ?? "forward"}
                  onChange={(value) => onPatch({ revisionOrder: value as RevisionOrder, revisionProgressIndex: 0, revisionProgressAyah: 1, revisionCompletedSurahs: {} })}
                />
              </Panel>
              <DailyTargetCard
                icon="calendar-outline"
                title="Khatm completion goal"
                value={state.revisionRoundDays}
                unit="days/khatm"
                note={revisionRecommendationText(state.revisionRanges, state.revisionRoundDays)}
                min={3}
                max={60}
                step={1}
                options={[3, 5, 7, 10, 12, 14, 30]}
                onChange={(revisionRoundDays) =>
                  onPatch({
                    revisionRoundDays
                  })
                }
              />
            </Stack>
          </View>
        )}

        {step === "schedule" && (
          <View>
            <Title>When can we{"\n"}reach you?</Title>
            <Muted>Active hours apply to both new memorisation and revision notifications. Prompts pause outside this window.</Muted>
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
                      ? `Reminders ${state.revisionFreq} · ${revisionDailyTarget} āyāt/day · ${activeDayCount(state.revisionDays)} days a week`
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
                title="Friends & classes"
                subtitle="Coming soon - keep your plan solo for now"
                selected={false}
                onPress={() => onPatch({ communityMode: "solo" })}
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
