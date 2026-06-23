import quranRaw from "./quran.json";
import indopakRaw from "./indopak.json";
import translationRaw from "./translation.json";
import { ArabicScript } from "./types";

// Uthmani text derived from assets/arabic-text/uthmani.db, keyed by sūrah number → āyāt (index 0 = āyah 1).
const quran = quranRaw as Record<string, string[]>;
const indopak = indopakRaw as Record<string, string[]>;
// Hilali & Muhsin Khan English translation derived from assets/translations/en.hilali.txt.
const translation = translationRaw as Record<string, string[]>;

export type Verse = { num: number; text: string };

function textDb(script: ArabicScript = "uthmani") {
  return script === "indopak" ? indopak : quran;
}

export function surahVerses(surah: number, script: ArabicScript = "uthmani"): Verse[] {
  const texts = textDb(script)[String(surah)] ?? [];
  return texts.map((text, index) => ({ num: index + 1, text }));
}

export function ayahText(surah: number, ayah: number, script: ArabicScript = "uthmani"): string {
  return textDb(script)[String(surah)]?.[ayah - 1] ?? "";
}

export function ayahTranslation(surah: number, ayah: number): string {
  return translation[String(surah)]?.[ayah - 1] ?? "";
}

// A short opening cue used as the prompt on a memorisation card.
export function firstWords(text: string, count = 4): string {
  return text.split(/\s+/).filter(Boolean).slice(0, count).join(" ");
}
