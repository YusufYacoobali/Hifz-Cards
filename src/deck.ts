import { DimensionValue } from "react-native";
import { HifzCard, revisionFlows, RevisionFlow, newDeck } from "./data";
import { ayahText, ayahTranslation, firstWords, surahVerses } from "./quran";
import { allSurahs } from "./surahs";
import { colors } from "./theme";
import { dueWeakEntries, yesterdayWeakEntries } from "./progressModel";
import { ArabicScript, MemorisationRange, QuizQuestion, ReviewRecord, RevisionOrder, SessionMode, SurahRange, WeakSpotQueueEntry } from "./types";

export type PracticeItem = HifzCard | RevisionFlow;

export type DeckContext = {
  newRange: MemorisationRange;
  revisionRanges: SurahRange[];
  history?: ReviewRecord[];
  weakSpotQueue?: Record<string, WeakSpotQueueEntry>;
  arabicScript?: ArabicScript;
  revisionOrder?: RevisionOrder;
  recentSurahLimit?: number;
  recentSelectedSurahs?: number[];
};

// How many new āyāt to surface in one sabaq session, counting from the start point.
const NEW_SESSION_SIZE = 8;

function surahNumberOf(label: string) {
  return Number(label.match(/^\d+/)?.[0] ?? 0);
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

export function buildDueWeakDeck(queue: Record<string, WeakSpotQueueEntry> = {}, script: ArabicScript = "uthmani"): HifzCard[] {
  return dueWeakEntries({ weakSpotQueue: queue })
    .map((entry) => ayahCard(entry.surah, entry.ayah, script))
    .filter((card) => Boolean(card.full));
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
  const flows = ordered
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

export function buildYesterdayDueWeakDeck(queue: Record<string, WeakSpotQueueEntry> = {}, script: ArabicScript = "uthmani"): HifzCard[] {
  return yesterdayWeakEntries({ weakSpotQueue: queue })
    .map((entry) => ayahCard(entry.surah, entry.ayah, script))
    .filter((card) => Boolean(card.full));
}

export function buildRecentRevisionDeck(
  history: ReviewRecord[] = [],
  ranges: SurahRange[] = [],
  script: ArabicScript = "uthmani",
  selectedSurahs: number[] = [],
  limit = 3
): RevisionFlow[] {
  const known = buildRevisionDeck(ranges, script, "forward");
  const knownBySurah = new Map(known.map((flow) => [flow.surah ?? 0, flow]));
  const max = Math.max(1, limit || 3);
  const seen = new Set<number>();
  const numbers: number[] = [];

  selectedSurahs.forEach((surah) => {
    if (!knownBySurah.has(surah) || seen.has(surah)) return;
    seen.add(surah);
    numbers.push(surah);
  });

  if (!numbers.length) history.forEach((record) => {
    if (record.mode !== "new" || !record.surah) return;
    if (record.result !== "solid" && record.result !== "finished") return;
    if (!knownBySurah.has(record.surah)) return;
    if (seen.has(record.surah)) return;
    seen.add(record.surah);
    numbers.push(record.surah);
  });

  if (!numbers.length) {
    known
      .slice()
      .reverse()
      .forEach((flow) => {
        const surah = flow.surah ?? 0;
        if (!surah || seen.has(surah)) return;
        seen.add(surah);
        numbers.push(surah);
      });
  }

  return numbers.slice(0, max).map((number) => knownBySurah.get(number)).filter(Boolean) as RevisionFlow[];
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
      // Every āyah is quizzable — including sūrah endings, a classic weak point.
      // continueTo clamps at the last āyah, so near-end prompts just continue less far.
      verses.forEach((verse) => {
        pool.push({
          id: `${surah}:${verse.num}`,
          surah,
          ayah: verse.num,
          label: meta ? `${surah} · ${meta.english}` : `Surah ${surah}`,
          prompt: firstWords(verse.text, 5),
          full: verse.text,
          translation: ayahTranslation(surah, verse.num),
          continueTo: Math.min(verses.length, verse.num + 4)
        });
      });
    }
  });
  // Identical openings (e.g. «يَا أَيُّهَا الَّذِينَ آمَنُوا») make a "continue from here" prompt
  // genuinely ambiguous — prefer prompts unique in the pool, topping up only if that leaves too few.
  const promptCounts = new Map<string, number>();
  pool.forEach((question) => promptCounts.set(question.prompt, (promptCounts.get(question.prompt) ?? 0) + 1));
  const target = Math.max(1, count);
  const unique = pool.filter((question) => promptCounts.get(question.prompt) === 1);
  const source = unique.length >= target ? unique : pool;
  return source
    .map((question) => ({ question, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .slice(0, target)
    .map(({ question }) => question);
}

export function getDeck(mode: SessionMode, ctx?: DeckContext): PracticeItem[] {
  if (mode === "weak") {
    const built = buildDueWeakDeck(ctx?.weakSpotQueue, ctx?.arabicScript);
    return built;
  }
  if (mode === "yesterdayWeak") {
    return buildYesterdayDueWeakDeck(ctx?.weakSpotQueue, ctx?.arabicScript);
  }
  if (mode === "recent") {
    if (!ctx) return revisionFlows.slice(0, 3);
    const built = buildRecentRevisionDeck(ctx.history, ctx.revisionRanges, ctx.arabicScript, ctx.recentSelectedSurahs, ctx.recentSurahLimit);
    return built.length ? built : buildRevisionDeck(ctx.revisionRanges, ctx.arabicScript, "forward").slice(0, ctx.recentSurahLimit ?? 3);
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
