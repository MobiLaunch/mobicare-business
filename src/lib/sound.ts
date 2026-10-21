import { create } from "zustand";

/**
 * Synthesised UI sounds (Web Audio — no audio files shipped, nothing to
 * download, nothing copyrighted). They're intentionally small and bell-like
 * in the spirit of 2012-era handset sounds.
 *
 * Browsers only allow audio after a user gesture, so the AudioContext is
 * created lazily on the first play() that follows one; anything requested
 * before that is silently dropped rather than queued.
 */

export type SoundName =
  | "tap"
  | "tick"
  | "launch"
  | "unlock"
  | "send"
  | "receive"
  | "success"
  | "error"
  | "cart";

const STORAGE_KEY = "mobicare:sound-muted";

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface SoundState {
  muted: boolean;
  toggle: () => void;
}

export const useSoundStore = create<SoundState>((set, get) => ({
  muted: readMuted(),
  toggle: () => {
    const muted = !get().muted;

    try {
      localStorage.setItem(STORAGE_KEY, muted ? "1" : "0");
    } catch {
      /* private mode — preference just won't persist */
    }
    set({ muted });
    if (!muted) play("tap");
  },
}));

let ctx: AudioContext | null = null;
let userGestured = false;

function getCtx(): AudioContext | null {
  if (!userGestured || typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();

  return ctx;
}

/** Call from any pointer/key handler to unlock audio for the session. */
export function markUserGesture() {
  userGestured = true;
}

if (typeof window !== "undefined") {
  const unlock = () => markUserGesture();

  window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
  window.addEventListener("keydown", unlock, { capture: true, passive: true });
}

function tone(
  c: AudioContext,
  when: number,
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; to?: number } = {},
) {
  const osc = c.createOscillator();
  const g = c.createGain();
  const { type = "sine", gain = 0.18, to } = opts;

  osc.type = type;
  osc.frequency.setValueAtTime(freq, when);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, when + dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  osc.connect(g).connect(c.destination);
  osc.start(when);
  osc.stop(when + dur + 0.05);
}

/** A bell: a sine plus a quiet inharmonic partial, which is what makes it "ding" rather than "beep". */
function bell(c: AudioContext, when: number, freq: number, dur = 0.5, gain = 0.2) {
  tone(c, when, freq, dur, { gain });
  tone(c, when, freq * 2.76, dur * 0.5, { gain: gain * 0.25 });
}

function noiseSweep(c: AudioContext, when: number, dur: number, from: number, to: number, gain = 0.2) {
  const frames = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, frames, c.sampleRate);
  const data = buf.getChannelData(0);

  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  const filter = c.createBiquadFilter();
  const g = c.createGain();

  src.buffer = buf;
  filter.type = "bandpass";
  filter.Q.value = 1.2;
  filter.frequency.setValueAtTime(from, when);
  filter.frequency.exponentialRampToValueAtTime(to, when + dur);
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(gain, when + dur * 0.35);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(filter).connect(g).connect(c.destination);
  src.start(when);
}

export function play(name: SoundName) {
  if (useSoundStore.getState().muted) return;

  const c = getCtx();

  if (!c) return;

  const t = c.currentTime + 0.01;

  switch (name) {
    case "tap":
      tone(c, t, 1200, 0.04, { type: "triangle", gain: 0.07, to: 700 });
      break;
    case "tick":
      // The picker-wheel detent: a dry, woody click with a touch of body.
      noiseSweep(c, t, 0.03, 3800, 2200, 0.1);
      tone(c, t, 1500, 0.025, { type: "square", gain: 0.045, to: 700 });
      break;
    case "launch":
      noiseSweep(c, t, 0.55, 300, 3400, 0.22);
      tone(c, t + 0.05, 220, 0.5, { type: "sine", gain: 0.08, to: 660 });
      break;
    case "unlock":
      bell(c, t, 784, 0.35, 0.16);
      bell(c, t + 0.1, 1175, 0.5, 0.16);
      break;
    case "send":
      noiseSweep(c, t, 0.28, 1800, 5200, 0.16);
      break;
    case "receive":
      bell(c, t, 1568, 0.45, 0.16);
      bell(c, t + 0.12, 1319, 0.45, 0.16);
      bell(c, t + 0.24, 1047, 0.7, 0.18);
      break;
    case "success":
      bell(c, t, 880, 0.3, 0.15);
      bell(c, t + 0.11, 1320, 0.6, 0.15);
      break;
    case "error":
      tone(c, t, 180, 0.22, { type: "sawtooth", gain: 0.1, to: 120 });
      tone(c, t + 0.14, 160, 0.26, { type: "sawtooth", gain: 0.1, to: 100 });
      break;
    case "cart":
      tone(c, t, 500, 0.08, { type: "triangle", gain: 0.12, to: 900 });
      bell(c, t + 0.06, 1760, 0.4, 0.12);
      break;
  }
}
