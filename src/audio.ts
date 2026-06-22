import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import { defaultReciterId, reciterById } from "./reciters";

// everyayah.com reciter folder. Surah + āyah are zero-padded to 3 digits each.
const AUDIO_DIR = "ayah-audio";

let player: AudioPlayer | null = null;
let audioModeReady = false;

function pad3(value: number) {
  return String(value).padStart(3, "0");
}

function fileName(surah: number, ayah: number) {
  return `${pad3(surah)}${pad3(ayah)}.mp3`;
}

function remoteUrl(surah: number, ayah: number, reciterId = defaultReciterId) {
  return `https://everyayah.com/data/${reciterById(reciterId).folder}/${fileName(surah, ayah)}`;
}

function cacheDir(reciterId = defaultReciterId) {
  const dir = new Directory(Paths.document, AUDIO_DIR, reciterById(reciterId).id);
  if (!dir.exists) {
    try {
      dir.create({ intermediates: true, idempotent: true });
    } catch {
      // best effort — fall back to streaming if the directory can't be created
    }
  }
  return dir;
}

// Returns a playable URI: the cached file if present, otherwise download + cache,
// falling back to the remote stream URL when offline and not yet cached.
async function resolveSource(surah: number, ayah: number, reciterId = defaultReciterId): Promise<string> {
  try {
    const file = new File(cacheDir(reciterId), fileName(surah, ayah));
    if (file.exists) return file.uri;
    const downloaded = await File.downloadFileAsync(remoteUrl(surah, ayah, reciterId), file);
    return downloaded.uri;
  } catch {
    return remoteUrl(surah, ayah, reciterId);
  }
}

async function ensureAudioMode() {
  if (audioModeReady) return;
  try {
    await setAudioModeAsync({ playsInSilentMode: true });
  } catch {
    // non-fatal
  }
  audioModeReady = true;
}

export async function playAyah(surah: number, ayah: number, reciterId = defaultReciterId) {
  if (!surah || !ayah) return;
  await ensureAudioMode();
  const source = await resolveSource(surah, ayah, reciterId);
  if (!player) {
    player = createAudioPlayer(source);
  } else {
    player.replace(source);
  }
  try {
    player.seekTo(0);
  } catch {
    // ignore seek errors on a fresh source
  }
  player.play();
}

export function stopAyah() {
  try {
    player?.pause();
  } catch {
    // ignore
  }
}

// Warm the offline cache for a set of āyāt (e.g. a session's deck).
export async function prefetchAyat(items: Array<{ surah: number; ayah: number }>, reciterId = defaultReciterId) {
  const dir = cacheDir(reciterId);
  for (const item of items) {
    if (!item.surah || !item.ayah) continue;
    const file = new File(dir, fileName(item.surah, item.ayah));
    if (file.exists) continue;
    try {
      await File.downloadFileAsync(remoteUrl(item.surah, item.ayah, reciterId), file);
    } catch {
      // offline or unavailable — skip, will retry on demand
    }
  }
}
