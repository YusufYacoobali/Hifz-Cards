import { Platform, StyleSheet } from "react-native";
import { colors, heavyShadow, shadow } from "./theme";

export const styles = StyleSheet.create({
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
  homeScrollPad: {
    paddingBottom: Platform.OS === "android" ? 196 : 184
  },
  homeStickyBar: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line
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
  collapseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4
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
  profileActionRow: {
    flexDirection: "row",
    gap: 10
  },
  profileActionTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    gap: 8,
    ...shadow
  },
  profileActionDanger: {
    borderColor: colors.redPale
  },
  profileActionIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.mintPale,
    alignItems: "center",
    justifyContent: "center"
  },
  profileActionIconDanger: {
    backgroundColor: colors.redPale
  },
  profileActionLabel: {
    fontSize: 11.5,
    fontWeight: "800",
    color: colors.text,
    textAlign: "center",
    lineHeight: 15
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
  revisionPickList: {
    gap: 8,
    marginTop: 12
  },
  revisionPickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14
  },
  revisionPickMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  revisionQuickDone: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.mintPale,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  revisionPickBadge: {
    minWidth: 26,
    color: colors.mint,
    fontWeight: "900",
    textAlign: "center"
  },
  revisionPickLabel: {
    flex: 1,
    color: colors.text,
    fontWeight: "800",
    fontSize: 14
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
  revisionTitlePill: {
    maxWidth: "62%",
    paddingHorizontal: 12,
    textAlign: "center",
    fontSize: Platform.OS === "android" ? 10.5 : 11,
    letterSpacing: 0.5
  },
  weakTitlePill: {
    color: colors.goldDark
  },
  sessionSubtitle: {
    marginTop: 7,
    paddingHorizontal: 26,
    color: colors.muted,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "800"
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
    left: Platform.OS === "android" ? 18 : 22,
    right: Platform.OS === "android" ? 18 : 22,
    top: Platform.OS === "android" ? 122 : 140,
    bottom: Platform.OS === "android" ? 150 : 122
  },
  memoriseCardStack: {
    bottom: Platform.OS === "android" ? 166 : 122
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
    left: 0,
    right: 0,
    bottom: 30,
    paddingHorizontal: Platform.OS === "android" ? 18 : 22,
    alignItems: "center"
  },
  markRowInner: {
    flexDirection: "row",
    width: "100%",
    maxWidth: 460,
    gap: Platform.OS === "android" ? 8 : 10
  },
  sessionPrimaryAction: {
    flex: 1,
    minWidth: 0
  },
  weakActionButton: {
    backgroundColor: colors.gold,
    paddingHorizontal: 16,
    flexGrow: 0
  },
  weakActionDone: {
    backgroundColor: colors.mintPale,
    paddingHorizontal: 16,
    flexGrow: 0
  },
  readWeakButton: {
    flex: 0.8,
    minWidth: 108
  },
  readContinueButton: {
    flex: 1.35,
    paddingHorizontal: Platform.OS === "android" ? 10 : 14
  },
  markButton: {
    flex: 1,
    minWidth: 0,
    minHeight: Platform.OS === "android" ? 56 : 64,
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
  revisionHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 8
  },
  revisionHeaderText: {
    flexShrink: 1,
    color: colors.goldDark,
    fontWeight: "900",
    fontSize: 12
  },
  revisionHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1
  },
  helpDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: "#cfe0d8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card
  },
  helpBubble: {
    backgroundColor: colors.mintPale,
    borderRadius: 12,
    padding: 11,
    marginBottom: 8
  },
  helpBubbleText: {
    color: "#2f5d4f",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "600"
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
    gap: 8,
    paddingVertical: Platform.OS === "android" ? 7 : 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f4efe5"
  },
  passageMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10
  },
  passageLeftRail: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 4,
    flexShrink: 0
  },
  weakQuickButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.goldPale,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  weakQuickButtonDone: {
    backgroundColor: colors.mint
  },
  ayahBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 7,
    paddingHorizontal: 4,
    backgroundColor: colors.mintPale,
    color: "#2f5d4f",
    textAlign: "center",
    lineHeight: 24,
    fontSize: 11,
    fontWeight: "900"
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
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginTop: 14
  },
  monthDay: {
    width: "12.4%",
    aspectRatio: 1,
    borderRadius: 6
  },
  monthStrip: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    marginTop: 14,
    height: 30
  },
  monthStripBar: {
    flex: 1,
    height: "100%",
    borderRadius: 2
  },
  monthStripToday: {
    borderWidth: 1.5,
    borderColor: colors.gold
  },
  weakPillWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12
  },
  weakPill: {
    backgroundColor: colors.goldPale,
    borderRadius: 10,
    paddingVertical: 7,
    paddingHorizontal: 11
  },
  weakPillText: {
    color: colors.goldDark,
    fontWeight: "900",
    fontSize: 12.5
  },
  khatmEmpty: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 26
  },
  khatmCard: {
    gap: 9
  },
  khatmCurrent: {
    borderWidth: 1.5,
    borderColor: colors.gold
  },
  homeKhatmCard: {
    gap: 11
  },
  homeKhatmRing: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: colors.gold,
    backgroundColor: colors.goldPale,
    alignItems: "center",
    justifyContent: "center"
  },
  homeKhatmPct: {
    fontSize: 13,
    fontWeight: "900",
    color: colors.green
  },
  khatmBar: {
    flexDirection: "row",
    height: 10,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: colors.line
  },
  khatmWeakList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 4
  },
  khatmWeakChip: {
    borderRadius: 999,
    backgroundColor: colors.goldPale,
    paddingVertical: 6,
    paddingHorizontal: 10
  },
  khatmWeakText: {
    color: colors.goldDark,
    fontSize: 11,
    fontWeight: "900"
  },
  khatmMeta: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "700"
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
  comingSoonHero: {
    borderRadius: 24,
    padding: 22,
    alignItems: "center",
    marginTop: 14,
    ...heavyShadow
  },
  comingSoonBadge: {
    backgroundColor: "rgba(233,217,168,.18)",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 14
  },
  comingSoonBadgeText: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4
  },
  comingSoonTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 25,
    marginTop: 12
  },
  comingSoonBody: {
    color: "#bcd8cf",
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8
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
  recapShareArea: {
    backgroundColor: colors.green,
    borderRadius: 26,
    padding: 14,
    gap: 14
  },
  recapStats: {
    flexDirection: "row",
    gap: 10
  },
  effortNote: {
    color: "#bcd8cf",
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: 6,
    marginTop: 2
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
