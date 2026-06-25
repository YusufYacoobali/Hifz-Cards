import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { allSurahs, SurahInfo } from "../surahs";
import { colors } from "../theme";
import { AppState, ArabicScript, ArabicSize, arabicSizeScale, Days, RevisionOrder, SurahRange } from "../types";
import { styles } from "../styles";
import { surahByNumber, targetQuickValues } from "../planning";
import { Arabic, activeHoursSummary, Divider, formatHour, Overline, Panel, Toggle } from "./primitives";

export function ServiceScheduleCard({
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

export function DailyTargetCard({
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

export function Segmented({
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

export function Stepper({ value, label, onMinus, onPlus }: { value: number; label: string; onMinus: () => void; onPlus: () => void }) {
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

export function SurahSearchList({
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

export function SurahEndpoint({
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

export function KnownSurahRangeCard({
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

export function FrequencyScroller({ active, onChange }: { active: string; onChange: (value: string) => void }) {
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

export function TargetScroller({
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

export function TimeBlock({ label, time, hint }: { label: string; time: string; hint: string }) {
  return (
    <View style={styles.timeBlock}>
      <Text style={styles.timeLabel}>{label}</Text>
      <Text style={styles.timeText}>{time}</Text>
      <Text style={styles.timeHint}>{hint}</Text>
    </View>
  );
}

export function ActiveHoursPanel({
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

export function TimeWindowEditor({
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

export function DayPicker({ days, onToggle }: { days: Days; onToggle: (day: keyof Days) => void }) {
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

export function ArabicDisplayCard({
  script,
  size,
  onScript,
  onSize
}: {
  script: ArabicScript;
  size: ArabicSize;
  onScript: (script: ArabicScript) => void;
  onSize: (size: ArabicSize) => void;
}) {
  const scale = arabicSizeScale[size] ?? 1;
  return (
    <Panel style={styles.scriptPanel}>
      <View style={styles.settingRowInner}>
        <View style={styles.iconTile}>
          <Ionicons name="text-outline" size={20} color={colors.mint} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.cardTitle}>Arabic display</Text>
          <Text style={styles.cardSubtitle}>Script and size for āyāt across cards and revision lists.</Text>
        </View>
      </View>
      <Overline>Script</Overline>
      <Segmented
        values={["uthmani", "indopak"]}
        labels={["Uthmani", "IndoPak"]}
        active={script}
        onChange={(value) => onScript(value as ArabicScript)}
      />
      <Overline style={styles.spacedOverline}>Text size</Overline>
      <Segmented
        values={["small", "medium", "large"]}
        labels={["Small", "Medium", "Large"]}
        active={size}
        onChange={(value) => onSize(value as ArabicSize)}
      />
      <View style={styles.scriptPreview}>
        <Arabic
          style={[
            script === "indopak" ? styles.scriptPreviewIndopak : styles.scriptPreviewArabic,
            { fontSize: 24 * scale, lineHeight: 44 * scale }
          ]}
        >
          بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
        </Arabic>
      </View>
    </Panel>
  );
}

export function ReminderCard({
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
  order,
  onOrder,
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
  order?: RevisionOrder;
  onOrder?: (value: RevisionOrder) => void;
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
      {order && onOrder && (
        <>
          <Overline>Revision order</Overline>
          <Segmented
            values={["forward", "backward", "select"]}
            labels={["Front → back", "Back → front", "I'll choose"]}
            active={order}
            onChange={(value) => onOrder(value as RevisionOrder)}
          />
        </>
      )}
      <Overline>Days</Overline>
      <DayPicker days={days} onToggle={onToggleDay} />
    </Panel>
  );
}

export function NotificationPreview({ type, title, ayah }: { type: string; title: string; ayah: string }) {
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
