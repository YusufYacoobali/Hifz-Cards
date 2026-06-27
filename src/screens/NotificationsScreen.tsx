import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, ScrollView, Text, View } from "react-native";
import { ActiveHoursPanel, Arabic, DailyTargetCard, Divider, Header, KnownSurahRangeCard, Overline, OutlineButton, Panel, ReminderCard, Stack, Stepper, SurahSearchList, SwitchRow } from "../components";
import { makeNewRange, makeSurahRange, newStartLabel, nextFreeRange, rebalanceRevisionRanges, recommendedNewAyat, recommendedRevisionAyat, revisionRecommendationText, selectableSurahsForRange, surahAyahCount, surahNumberFromLabel } from "../planning";
import { SurahInfo } from "../surahs";
import { colors } from "../theme";
import { styles } from "../styles";
import { AppState, Days, Screen } from "../types";

export function NotificationsScreen({
  state,
  safeTop,
  safeBottom,
  onPatch,
  onNav
}: {
  state: AppState;
  safeTop: number;
  safeBottom: number;
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
    const revisionRanges = rebalanceRevisionRanges(state.revisionRanges, id, fromSurah, toSurah);
    onPatch({ revisionRanges, revisionProgressIndex: 0, revisionProgressAyah: 1, revisionCompletedSurahs: {} });
  };
  const addRevisionRange = () => {
    const free = nextFreeRange(state.revisionRanges) ?? { from: 114, to: 114 };
    const range = makeSurahRange(free.from, free.to, `rev-${Date.now()}`);
    onPatch({ revisionRanges: [...state.revisionRanges, range], revisionTargetId: range.id, revisionProgressIndex: 0, revisionProgressAyah: 1, revisionCompletedSurahs: {} });
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

  const [open, setOpen] = React.useState({ new: true, revision: false });
  const toggle = (key: "new" | "revision") => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <ScrollView style={styles.fullScreen} contentContainerStyle={[styles.settingsContent, { paddingTop: safeTop + 8, paddingBottom: safeBottom + (Platform.OS === "android" ? 48 : 32) }]} showsVerticalScrollIndicator={false}>
      <Header title="Card settings" onBack={() => onNav("home")} />
      <View style={styles.settingsSection}>
        <Pressable style={styles.collapseHeader} onPress={() => toggle("new")}>
          <Overline>New memorisation</Overline>
          <Ionicons name={open.new ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />
        </Pressable>
        {open.new && (
          <>
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
          unit="ayat/day"
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
        />
          </>
        )}
      </View>

      <View style={styles.settingsSection}>
        <Pressable style={styles.collapseHeader} onPress={() => toggle("revision")}>
          <Overline>Revision</Overline>
          <Ionicons name={open.revision ? "chevron-up" : "chevron-down"} size={18} color={colors.faint} />
        </Pressable>
        {open.revision && (
          <>
        <Panel style={styles.revisionSettingsPanel}>
          <View style={styles.settingRowInner}>
            <View style={styles.iconTile}>
              <Ionicons name="repeat-outline" size={20} color={colors.mint} />
            </View>
            <View style={styles.flex}>
              <Text style={styles.cardTitle}>Revision sections</Text>
              <Text style={styles.cardSubtitle}>{revisionRecommendationText(state.revisionRanges, state.revisionRoundDays)}</Text>
            </View>
          </View>
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
            <OutlineButton label="Add another revision section" onPress={addRevisionRange} />
          </Stack>
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
              revisionRoundDays,
              revisionLoad: recommendedRevisionAyat(state.revisionRanges, revisionRoundDays)
            })
          }
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
          order={state.revisionOrder ?? "forward"}
          onOrder={(revisionOrder) => onPatch({ revisionOrder, revisionProgressIndex: 0, revisionProgressAyah: 1, revisionCompletedSurahs: {} })}
        />
          </>
        )}
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
            <Text style={styles.cardSubtitle}>
              {state.sabaqOn ? `New: ${state.sabaqFreq}` : "New: off"} · {state.revisionOn ? `Revision: ${state.revisionFreq}` : "Revision: off"}
            </Text>
            <Text style={styles.cardSubtitle}>Permission: {state.notificationPermission}. Plan refreshes when you edit settings.</Text>
          </View>
        </Panel>
      </View>
    </ScrollView>
  );
}
