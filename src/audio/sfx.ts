// Sound effects — the Nobody's Business drop-in.
//
// Copy this file into any app in the line, change SOURCES to that game's own
// events, and wire play() into the handlers. Nothing else differs.
//
// The WAVs are shared across the line on purpose: a word landing should sound
// the same in Letter Grid as a category filling does in Word Flock, because it
// means the same thing to the player.
//
// ---------------------------------------------------------------------------
// No hogs
//
// Tings and pings only. No music, no ambient beds, no loops — those cost the
// download and the listener, and this app removed an 8.6 MB ambient track that
// was 93% of its size and switched off by default.
//
// The session posture is the part that matters:
//
//   mixWithOthers        request no audio focus at all. Whatever the player is
//                        already listening to keeps playing, undisturbed and
//                        unducked. These are games you play WHILE listening to
//                        something else.
//   playsInSilentMode    false. On Android this silences the app whenever the
//                        ringer is silent OR on vibrate. That is deliberate:
//                        a phone told to be quiet is quiet. The speaker button
//                        in the header is a second, separate switch.
//
// WAV rather than mp3 on purpose: these fire on touch, and a decode between the
// tap and the sound is worse than no sound. At this length the difference is a
// couple of hundred kilobytes.

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";

const SOURCES = {
  /** A letter joins the trace. The commonest sound here by far, so the quietest. */
  tap: require("../../assets/sfx/tap.wav"),
  /** A real word, not yet found. */
  found: require("../../assets/sfx/found.wav"),
  /** Not a word, or already found. Never a buzzer. */
  nope: require("../../assets/sfx/nope.wav"),
  /** A fresh grid. */
  deal: require("../../assets/sfx/deal.wav"),
} as const;

export type Sfx = keyof typeof SOURCES;

const players: Partial<Record<Sfx, AudioPlayer>> = {};
let enabled = true;
let ready = false;

/** Built once, up front — loading a file between the tap and the sound is the
 *  one thing a UI tick cannot afford. */
export async function initSfx(on: boolean): Promise<void> {
  enabled = on;
  if (ready) return;
  try {
    await setAudioModeAsync({
      // FALSE. The phone's ringer wins.
      //
      // On Android this suppresses playback whenever the ringer is silent OR on
      // vibrate — the OS checks it in the native play() before a sample is read.
      // That is the whole behaviour, and it is the intended one: a phone set to
      // be quiet is quiet, and the app does not get a vote.
      //
      // It was briefly set to true while chasing a silence bug, on the argument
      // that Android games play on the media stream and do not answer to the
      // ringer. That argument is true of other games and was not asked for here.
      // Someone who silences their phone in a waiting room has already said what
      // they want, and a game that talks anyway is exactly the kind of app this
      // line exists not to be.
      //
      // Consequence, stated plainly: on silent or vibrate there is no sound at
      // all, and nothing in the log to say why. That is not a bug to re-diagnose.
      playsInSilentMode: false,
      interruptionMode: "mixWithOthers",
      shouldPlayInBackground: false,
    });
    for (const key of Object.keys(SOURCES) as Sfx[]) {
      players[key] = createAudioPlayer(SOURCES[key]);
      // Set explicitly rather than trusting a default nobody checked.
      players[key]!.volume = 1;
    }
    ready = true;
  } catch (err) {
    // Sound is a nicety: a device that will not give us a player should
    // still play the game. But failing SILENTLY cost an evening of
    // hunting — a dev build made before expo-audio was added throws
    // here, and the app then looks identical to one with the volume
    // down. Say so in the log, then carry on quietly.
    console.warn(
      "[sfx] audio unavailable — the app will run silently. " +
        "If this is a development build, it may predate expo-audio; " +
        "rebuild the dev client.",
      err
    );
    ready = false;
  }
}

export function setSfxEnabled(on: boolean): void {
  enabled = on;
}

export function play(name: Sfx): void {
  if (!enabled || !ready) return;
  const p = players[name];
  if (!p) return;
  try {
    // Rewind, then play — and in that order for real.
    //
    // The obvious two lines, seekTo(0) followed by play(), do NOT run in the
    // order they are written. In expo-audio's Android module play() is a
    // synchronous Function while seekTo() is an AsyncFunction queued onto the
    // main thread, so the seek lands AFTER the play it was meant to precede.
    //
    // A sound fired several times a second survives that, because the next tap
    // covers for it. A sound fired ONCE PER GAME does not get a next tap: the
    // win chord went out over a player that was still being seeked, and what
    // came out was nothing at all — no clip, no hiss, no truncated note.
    //
    // So: only rewind when there is something to rewind, and when there is,
    // wait for the seek to finish before playing.
    if (p.currentTime > 0.001) {
      void p.seekTo(0).then(() => p.play()).catch(() => {});
    } else {
      p.play();
    }
  } catch {
    /* never let a sound break a word */
  }
}
