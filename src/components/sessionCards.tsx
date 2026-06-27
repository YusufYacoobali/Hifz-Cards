import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { ayahCard } from "../deck";
import { HifzCard, RevisionFlow } from "../data";
import { getDashboardStats } from "../hifzModel";
import { juzForLocation } from "../planning";
import { colors } from "../theme";
import { AppState, ArabicScript } from "../types";
import { styles } from "../styles";
import { Arabic, Divider } from "./primitives";

export function HeroHeader({ state, safeTop }: { state: AppState; safeTop: number }) {
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

export function AyahCard({ card, note, arScale = 1, hideMeta }: { card: HifzCard; note?: string; arScale?: number; hideMeta?: boolean }) {
  const surahName = card.surah ? card.surah.split("·").slice(1).join("·").trim() || card.surah : "Al-Mulk";
  return (
    <ScrollView style={styles.ayahCardScroll} contentContainerStyle={styles.ayahCardBody} showsVerticalScrollIndicator={false}>
      {!hideMeta && <Text style={styles.sessionMeta}>Sūrah {surahName} · Āyah {card.num}</Text>}
      {!!note && <Text style={styles.continueNote}>{note}</Text>}
      <Arabic style={[styles.memoriseArabic, { fontSize: 27 * arScale, lineHeight: 54 * arScale }]}>{card.full}</Arabic>
      {!!card.tr && (
        <View style={styles.revealBlock}>
          <Divider />
          <Text style={styles.translation}>{card.tr}</Text>
        </View>
      )}
    </ScrollView>
  );
}

export function RevisionCard({
  item,
  startAt,
  revealed,
  script,
  onReveal,
  onStuck,
  onMarkWeak,
  isWeak,
  arScale = 1
}: {
  item: RevisionFlow;
  startAt: number;
  revealed: boolean;
  script: ArabicScript;
  onReveal: () => void;
  onStuck: (ayah: number) => void;
  onMarkWeak: (ayah: number) => void;
  isWeak: (ayah: number) => boolean;
  arScale?: number;
}) {
  const [showFromJuz, setShowFromJuz] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const passage = item.passage.filter((ayah) => ayah.num >= startAt);
  const availableJuz = Array.from(new Set(passage.map((ayah) => juzForLocation(item.surah ?? 1, ayah.num))));
  const visiblePassage = showFromJuz
    ? item.passage.filter((ayah) => juzForLocation(item.surah ?? 1, ayah.num) >= showFromJuz)
    : passage;
  const firstAyah = visiblePassage[0] ?? passage[0] ?? item.passage[0];
  const currentJuz = juzForLocation(item.surah ?? 1, startAt);
  return (
    <View style={styles.revisionBody}>
      {!revealed ? (
        <AyahCard
          card={ayahCard(item.surah ?? 1, startAt, script)}
          note="Recite from memory — how far can you go?"
          arScale={arScale}
          hideMeta
        />
      ) : (
        null
      )}
      {revealed && (
        <>
          <View style={styles.revisionHeaderBar}>
            <Text style={styles.revisionHeaderText}>Tap the āyah you stop at</Text>
            <View style={styles.revisionHeaderRight}>
              {availableJuz.length > 1 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.juzChipRail}>
                  <Pressable style={[styles.juzChip, showFromJuz === 0 && styles.juzChipSelected]} onPress={() => setShowFromJuz(0)}>
                    <Text style={[styles.juzChipText, showFromJuz === 0 && styles.juzChipTextSelected]}>All</Text>
                  </Pressable>
                  {availableJuz.map((juz) => (
                    <Pressable key={juz} style={[styles.juzChip, showFromJuz === juz && styles.juzChipSelected]} onPress={() => setShowFromJuz(juz)}>
                      <Text style={[styles.juzChipText, showFromJuz === juz && styles.juzChipTextSelected]}>{juz}+</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <Pressable style={styles.helpDot} onPress={() => setShowHelp((value) => !value)} hitSlop={8}>
                <Ionicons name={showHelp ? "close" : "help"} size={14} color={colors.mintDark} />
              </Pressable>
            </View>
          </View>
          {showHelp && (
            <View style={styles.helpBubble}>
              <Text style={styles.helpBubbleText}>
                Recite from memory. Tap the āyah where you stop to practise from there, or use the bookmark beside any āyah to
                add it to weak cards without leaving the list. You're at Juz {currentJuz}; the chips hide earlier Juz so you can jump ahead.
              </Text>
            </View>
          )}
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
                  <View style={styles.passageRow}>
                    <View style={styles.passageLeftRail}>
                      <Text style={styles.ayahBadge}>{ayah.num}</Text>
                      <Pressable
                        style={[styles.weakQuickButton, isWeak(ayah.num) && styles.weakQuickButtonDone]}
                        onPress={() => onMarkWeak(ayah.num)}
                        hitSlop={8}
                      >
                        <Ionicons name={isWeak(ayah.num) ? "checkmark" : "bookmark-outline"} size={13} color={isWeak(ayah.num) ? "#fff" : colors.goldDark} />
                      </Pressable>
                    </View>
                    <Pressable style={styles.passageMain} onPress={() => onStuck(ayah.num)}>
                      <Arabic style={[styles.passageText, { fontSize: 21 * arScale, lineHeight: 42 * arScale }]}>{ayah.text}</Arabic>
                    </Pressable>
                  </View>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </>
      )}
    </View>
  );
}
