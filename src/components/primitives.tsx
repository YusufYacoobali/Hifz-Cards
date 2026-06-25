import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleProp, Text, TextStyle, View, ViewStyle } from "react-native";
import { colors } from "../theme";
import { AppState, ArabicScript, ResultStatus, Screen } from "../types";
import { styles } from "../styles";

export const ArabicFontContext = React.createContext<ArabicScript>("uthmani");

export function BottomTabs({ screen, safeBottom, onNav }: { screen: Screen; safeBottom: number; onNav: (screen: Screen) => void }) {
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

export function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.header}>
      <IconButton name="arrow-back" onPress={onBack} />
      <Text style={styles.headerTitle}>{title}</Text>
    </View>
  );
}

export const Panel = React.forwardRef<View, { children: React.ReactNode; style?: StyleProp<ViewStyle> }>(
  function Panel({ children, style }, ref) {
    return (
      <View ref={ref} collapsable={false} style={[styles.panel, style]}>
        {children}
      </View>
    );
  }
);

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.onboardingTitle}>{children}</Text>;
}

export function Muted({ children }: { children: React.ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Arabic({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  const script = React.useContext(ArabicFontContext);
  return <Text style={[styles.arabic, script === "indopak" && styles.indopakArabic, style]}>{children}</Text>;
}

export function Overline({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.overline, style]}>{children}</Text>;
}

export function Stack({ children }: { children: React.ReactNode }) {
  return <View style={styles.stack}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

export function PrimaryButton({
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

export function OutlineButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.outlineButton} onPress={onPress}>
      <Text style={styles.outlineText}>{label}</Text>
    </Pressable>
  );
}

export function IconButton({ name, onPress, dark }: { name: string; onPress: () => void; dark?: boolean }) {
  return (
    <Pressable style={[styles.iconButton, dark && styles.iconButtonDark]} onPress={onPress}>
      <Ionicons name={name as never} size={20} color={dark ? "#cfe3db" : colors.muted} />
    </Pressable>
  );
}

export function OptionCard({
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

export function InfoRow({ icon, title, text }: { icon: string; title: string; text: string }) {
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

export function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
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

export function Toggle({ value, onPress }: { value: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.toggle, { backgroundColor: value ? colors.mint : "#d8d0c1" }]} onPress={onPress}>
      <View style={[styles.toggleKnob, { left: value ? 23 : 3 }]} />
    </Pressable>
  );
}

export function SwitchRow({ title, subtitle, value, onPress }: { title: string; subtitle: string; value: boolean; onPress: () => void }) {
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

export function ModeCard({
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

export function MarkButton({ label, sub, color, onPress, filled }: { label: string; sub: string; color: string; onPress: () => void; filled?: boolean }) {
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

export function ResultBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Panel style={styles.resultBox}>
      <Text style={[styles.resultValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Panel>
  );
}

export function ProgressLine({ label, value, pct, color }: { label: string; value: string; pct: number; color: string }) {
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

export function Legend() {
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

export function Podium({ name, rank, points, height, color, crown }: { name: string; rank: number; points: number; height: number; color: string; crown?: boolean }) {
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

export function RecapStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.recapStat}>
      <Text style={styles.recapStatValue}>{value}</Text>
      <Text style={styles.recapStatLabel}>{label}</Text>
    </View>
  );
}

export function ProfileStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.profileStat}>
      <Text style={styles.profileStatValue}>{value}</Text>
      <Text style={styles.profileStatLabel}>{label}</Text>
    </View>
  );
}

export function SettingsRow({ icon, label, meta, onPress }: { icon: string; label: string; meta?: string; onPress: () => void }) {
  return (
    <Pressable style={styles.settingsRow} onPress={onPress}>
      <Ionicons name={icon as never} size={18} color={colors.mint} />
      <Text style={styles.settingsLabel}>{label}</Text>
      <Text style={styles.settingsMeta}>{meta ?? "›"}</Text>
    </Pressable>
  );
}

export function formatHour(hour: number) {
  if (hour === 24) return "12:00 am";
  const suffix = hour < 12 ? "am" : "pm";
  const display = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${display}:00 ${suffix}`;
}

// Approximate height of the bottom tab bar, so sticky content can sit just above it.
export function tabBarHeight(safeBottom: number) {
  return Platform.OS === "android" ? Math.max(96, safeBottom + 78) : Math.max(84, safeBottom + 58);
}

export function activeHoursSummary(state: AppState) {
  if (!state.hoursOn) return "Any time";
  const mode = state.activeHoursMode ?? (state.splitActiveHours ? "weekend" : "same");
  if (mode === "same") return `${formatHour(state.activeStartHour)} - ${formatHour(state.activeEndHour)} every day`;
  if (mode === "weekend") return `Mon-Fri ${formatHour(state.weekdayStartHour)}-${formatHour(state.weekdayEndHour)} · Weekend ${formatHour(state.weekendStartHour)}-${formatHour(state.weekendEndHour)}`;
  return "Custom time window for each day";
}

export function formatDueDate(value: string) {
  const date = new Date(value);
  const day = date.toLocaleDateString("en-GB", { weekday: "short" });
  return `${day} ${formatHour(date.getHours())}`;
}

export function formatHistoryTime(value: string) {
  const date = new Date(value);
  return date.toLocaleDateString("en-GB", { weekday: "short", hour: "numeric", minute: "2-digit" });
}

export function resultColor(result: ResultStatus) {
  if (result === "solid" || result === "finished") return colors.mint;
  if (result === "forgot" || String(result).startsWith("stuck@")) return colors.red;
  return colors.goldDark;
}

export function resultLabel(result: ResultStatus) {
  if (result === "solid") return "Solid";
  if (result === "shaky") return "Shaky";
  if (result === "forgot") return "Forgot";
  if (result === "finished") return "Finished";
  if (String(result).startsWith("stuck@")) return `Stopped at ayah ${String(result).replace("stuck@", "")}`;
  return String(result);
}
