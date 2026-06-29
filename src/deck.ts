import { DimensionValue } from "react-native";
import { HifzCard, revisionFlows, RevisionFlow, newDeck } from "./data";
import { ayahText, ayahTranslation, firstWords, surahVerses } from "./quran";
import { allSurahs } from "./surahs";
import { colors } from "./theme";
import { ArabicScript, MemorisationRange, QuizQuestion, ReviewRecord, RevisionOrder, SessionMode, SurahRange } from "./types";

export type PracticeItem = HifzCard | RevisionFlow;

export type DeckContext = {
  newRange: MemorisationRange;
  revisionRanges: SurahRange[];
  history?: ReviewRecord[];
  arabicScript?: ArabicScript;
  revisionOrder?: RevisionOrder;
};

// How many new ÄyÄt to surface in one sabaq session, counting from the start point.
const NEW_SESSION_SIZE = 8;

function surahNumberOf(label: string) {
  return Number(label.match(/^\d+/)?.[0] ?? 0);
}

function surahMeta(number: number) {
  return allSurahs.find((surah) => surah.number === number);
}

// Build a single memorisation card (full Äyah + Hilali/Khan translation) for any sÅ«rah:Äyah.
export function ayahCard(surah: number, ayah: number, script: ArabicScript = "uthmani"): HifzCard {
  const meta = surahMeta(surah);
  const text = ayahText(surah, ayah, script);
  return {
    num: ayah,
    prompt: firstWords(text, 4),
    full: text,
    tr: ayahTranslation(surah, ayah),
    surah: meta ? `${surah} Â· ${meta.english}` : `SÅ«rah ${surah}`,
    surahArabic: meta?.arabic
  };
}

// New memorisation: the next ÄyÄt starting from where the user is, moving forward to the end.
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

// Weak deck = ÄyÄt the user marked shaky/forgot/stuck, newest first, de-duplicated.
export function buildWeakDeck(history: ReviewRecord[] = [], script: ArabicScript = "uthmani"): HifzCard[] {
  const seen = new Set<string>();
  const cards: HifzCard[] = [];
  for (const record of history) {
    if (!record.surah || !record.ayah) continue;
    const key = `${record.surah}:${record.ayah}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const isWeak =
      record.result === "shaky" || record.result === "forgot" || String(record.result).startsWith("stuck@");
    if (!isWeak) continue;
    const card = ayahCard(record.surah, record.ayah, script);
    if (card.full) cards.push(card);
  }
  return cards;
}

export function buildYesterdayWeakDeck(history: ReviewRecord[] = [], script: ArabicScript = "uthmani"): HifzCard[] {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).getTime();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const seen = new Set<string>();
  const cards: HifzCard[] = [];
  for (const record of history) {
    if (!record.surah || !record.ayah) continue;
    const key = `${record.surah}:${record.ayah}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const time = new Date(record.timestamp).getTime();
    const isYesterday = time >= start && time < end;
    const isWeak =
      record.result === "shaky" || record.result === "forgot" || String(record.result).startsWith("stuck@");
    if (!isYesterday || !isWeak) continue;
    const card = ayahCard(record.surah, record.ayah, script);
    if (card.full) cards.push(card);
  }
  return cards;
}

// Revision: each known sÅ«rah becomes a flow you recite end-to-end, tapping where you stop.
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
  const flows = ordered
    .map((number) => {
      const meta = surahMeta(number);
      const passage = surahVerses(number, script);
      if (!passage.length) return null;
      return {
        start: 1,
        surah: number,
        label: meta ? `${number} Â· ${meta.english}` : `SÅ«rah ${number}`,
        passage
      } as RevisionFlow;
    })
    .filter(Boolean) as RevisionFlow[];
  return flows;
}

export function buildRecentRevisionDeck(
  history: ReviewRecord[] = [],
  newRange: MemorisationRange,
  script: ArabicScript = "uthmani"
): RevisionFlow[] {
  const seen = new Set<number>();
  const numbers: number[] = [];
  history.forEach((record) => {
    if (record.mode !== "new" || !record.surah) return;
    if (record.result !== "solid" && record.result !== "finished") return;
    if (seen.has(record.surah)) return;
    seen.add(record.surah);
    numbers.push(record.surah);
  });
  const currentNewSurah = surahNumberOf(newRange.surah);
  if (currentNewSurah && !seen.has(currentNewSurah)) numbers.push(currentNewSurah);
  return numbers
    .slice(0, 3)
    .map((number) => {
      const meta = surahMeta(number);
      const passage = surahVerses(number, script);
      if (!passage.length) return null;
      return {
        start: 1,
        surah: number,
        label: meta ? `${number} · ${meta.english}` : `Surah ${number}`,
        passage
      } as RevisionFlow;
    })
    .filter(Boolean) as RevisionFlow[];
}

export function buildQuizDeck(
  ranges: SurahRange[],
  count: number,
  script: ArabicScript = "uthmani"
): QuizQuestion[] {
  const pool: QuizQuestion[] = [];
  ranges.forEach((range) => {
    const from = Math.min(range.fromSurah, range.toSurah);
    const to = Math.max(range.fromSurah, range.toSurah);
    for (let surah = from; surah <= to; surah += 1) {
      const meta = surahMeta(surah);
      const verses = surahVerses(surah, script);
      if (!verses.length) continue;
      const maxStart = Math.max(1, verses.length - 4);
      verses
        .filter((verse) => verse.num <= maxStart)
        .forEach((verse) => {
          pool.push({
            id: `${surah}:${verse.num}`,
            surah,
            ayah: verse.num,
            label: meta ? `${surah} Â· ${meta.english}` : `Surah ${surah}`,
            prompt: firstWords(verse.text, 5),
            full: verse.text,
            translation: ayahTranslation(surah, verse.num),
            continueTo: Math.min(verses.length, verse.num + 4)
          });
        });
    }
  });
  return pool
    .map((question) => ({ question, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, Math.max(1, count))
    .map(({ question }) => question);
}

export function getDeck(mode: SessionMode, ctx?: DeckContext): PracticeItem[] {
  if (mode === "weak") {
    const built = buildWeakDeck(ctx?.history, ctx?.arabicScript);
    return built;
  }
  if (mode === "yesterdayWeak") {
    return buildYesterdayWeakDeck(ctx?.history, ctx?.arabicScript);
  }
  if (mode === "recent") {
    if (!ctx) return revisionFlows.slice(0, 3);
    const built = buildRecentRevisionDeck(ctx.history, ctx.newRange, ctx.arabicScript);
    return built.length ? built : revisionFlows.slice(0, 3);
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
