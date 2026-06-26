import { DimensionValue } from "react-native";
import { HifzCard, revisionFlows, RevisionFlow, newDeck } from "./data";
import { ayahText, ayahTranslation, firstWords, surahVerses } from "./quran";
import { allSurahs } from "./surahs";
import { colors } from "./theme";
import { ArabicScript, MemorisationRange, ReviewRecord, RevisionOrder, SessionMode, SurahRange } from "./types";

export type PracticeItem = HifzCard | RevisionFlow;

export type DeckContext = {
  newRange: MemorisationRange;
  revisionRanges: SurahRange[];
  history?: ReviewRecord[];
  arabicScript?: ArabicScript;
  revisionOrder?: RevisionOrder;
};

// How many new āyāt to surface in one sabaq session, counting from the start point.
const NEW_SESSION_SIZE = 8;
// Cap how many sūrahs a single revision session walks through.
const MAX_REVISION_SURAHS = 15;

function surahNumberOf(label: string) {
  return Number(label.split("·")[0]?.trim()) || 0;
}

function surahMeta(number: number) {
  return allSurahs.find((surah) => surah.number === number);
}

// Build a single memorisation card (full āyah + Hilali/Khan translation) for any sūrah:āyah.
export function ayahCard(surah: number, ayah: number, script: ArabicScript = "uthmani"): HifzCard {
  const meta = surahMeta(surah);
  const text = ayahText(surah, ayah, script);
  return {
    num: ayah,
    prompt: firstWords(text, 4),
    full: text,
    tr: ayahTranslation(surah, ayah),
    surah: meta ? `${surah} · ${meta.english}` : `Sūrah ${surah}`,
    surahArabic: meta?.arabic
  };
}

// New memorisation: the next āyāt starting from where the user is, moving forward to the end.
export function buildNewDeck(newRange: MemorisationRange, script: ArabicScript = "uthmani"): HifzCard[] {
  const number = surahNumberOf(newRange.surah);
  const meta = surahMeta(number);
  const verses = surahVerses(number, script);
  if (!verses.length) return newDeck;
  const start = Math.max(1, newRange.from || 1);
  return verses
    .filter((verse) => verse.num >= start)
    .slice(0, NEW_SESSION_SIZE)
    .map((verse) => ({
      num: verse.num,
      prompt: firstWords(verse.text, 4),
      full: verse.text,
      tr: ayahTranslation(number, verse.num),
      surah: newRange.surah,
      surahArabic: meta?.arabic ?? newRange.arabic
    }));
}

// Weak deck = āyāt the user marked shaky/forgot/stuck, newest first, de-duplicated.
export function buildWeakDeck(history: ReviewRecord[] = [], script: ArabicScript = "uthmani"): HifzCard[] {
  const seen = new Set<string>();
  const cards: HifzCard[] = [];
  for (const record of history) {
    const isWeak =
      record.result === "shaky" || record.result === "forgot" || String(record.result).startsWith("stuck@");
    if (!isWeak || !record.surah || !record.ayah) continue;
    const key = `${record.surah}:${record.ayah}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const card = ayahCard(record.surah, record.ayah, script);
    if (card.full) cards.push(card);
  }
  return cards;
}

// Revision: each known sūrah becomes a flow you recite end-to-end, tapping where you stop.
export function buildRevisionDeck(
  ranges: SurahRange[],
  script: ArabicScript = "uthmani",
  order: RevisionOrder = "forward"
): RevisionFlow[] {
  const numbers: number[] = [];
  ranges.forEach((range) => {
    const from = Math.min(range.fromSurah, range.toSurah);
    const to = Math.max(range.fromSurah, range.toSurah);
    for (let surah = from; surah <= to; surah += 1) numbers.push(surah);
  });
  let ordered = Array.from(new Set(numbers));
  if (order === "backward") ordered = ordered.reverse();
  const unique = ordered.slice(0, MAX_REVISION_SURAHS);
  const flows = unique
    .map((number) => {
      const meta = surahMeta(number);
      const passage = surahVerses(number, script);
      if (!passage.length) return null;
      return {
        start: 1,
        surah: number,
        label: meta ? `${number} · ${meta.english}` : `Sūrah ${number}`,
        passage
      } as RevisionFlow;
    })
    .filter(Boolean) as RevisionFlow[];
  return flows;
}

export function getDeck(mode: SessionMode, ctx?: DeckContext): PracticeItem[] {
  if (mode === "weak") {
    const built = buildWeakDeck(ctx?.history, ctx?.arabicScript);
    return built;
  }
  if (mode === "revision") {
    if (!ctx) return revisionFlows;
    const built = buildRevisionDeck(ctx.revisionRanges, ctx.arabicScript, ctx.revisionOrder);
    return built.length ? built : revisionFlows;
  }
  if (!ctx) return newDeck;
  const built = buildNewDeck(ctx.newRange, ctx.arabicScript);
  return built.length ? built : newDeck;
}

export function isRevisionFlow(item: PracticeItem): item is RevisionFlow {
  return "passage" in item;
}

export function sessionProgressWidth(index: number, total: number): DimensionValue {
  return `${Math.round(((index + 1) / total) * 100)}%`;
}

export function ayahCellStyle(type: string) {
  if (type === "solid") return { backgroundColor: colors.mint };
  if (type === "weak") return { backgroundColor: "#e9d3a3" };
  if (type === "failed") return { backgroundColor: "#e3a59c" };
  return { backgroundColor: "#f0ebe0" };
}
