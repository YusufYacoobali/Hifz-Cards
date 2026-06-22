import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";

// everyayah.com reciter folder. Surah + āyah are zero-padded to 3 digits each.
const RECITER = "Alafasy_128kbps";
const AUDIO_DIR = "ayah-audio";

let player: AudioPlayer | null = null;
let audioModeReady = false;

function pad3(value: number) {
  return String(value).padStart(3, "0");
}

function fileName(surah: number, ayah: number) {
  return `${pad3(surah)}${pad3(ayah)}.mp3`;
}

function remoteUrl(surah: number, ayah: number) {
  return `https://everyayah.com/data/${RECITER}/${fileName(surah, ayah)}`;
}

function cacheDir() {
  const dir = new Directory(Paths.document, AUDIO_DIR);
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
async function resolveSource(surah: number, ayah: number): Promise<string> {
  try {
    const file = new File(cacheDir(), fileName(surah, ayah));
    if (file.exists) return file.uri;
    const downloaded = await File.downloadFileAsync(remoteUrl(surah, ayah), file);
    return downloaded.uri;
  } catch {
    return remoteUrl(surah, ayah);
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

export async function playAyah(surah: number, ayah: number) {
  if (!surah || !ayah) return;
  await ensureAudioMode();
  const source = await resolveSource(surah, ayah);
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
export async function prefetchAyat(items: Array<{ surah: number; ayah: number }>) {
  const dir = cacheDir();
  for (const item of items) {
    if (!item.surah || !item.ayah) continue;
    const file = new File(dir, fileName(item.surah, item.ayah));
    if (file.exists) continue;
    try {
      await File.downloadFileAsync(remoteUrl(item.surah, item.ayah), file);
    } catch {
      // offline or unavailable — skip, will retry on demand
    }
  }
}
