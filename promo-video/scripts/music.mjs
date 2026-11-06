// Synthesizes the promo soundtrack: 106 BPM in A minor, laid out on the video's timeline.
// No samples, so there is nothing to license.
// Usage: node scripts/music.mjs music.wav && ffmpeg -i music.wav -c:a aac -b:a 192k public/music.m4a
import fs from "node:fs";

const SR = 44100;
const LEN = 32.9;
const N = Math.ceil(SR * LEN);
const BEAT = 60 / 106;
const T0 = 0.6; // first word of the hook lands here; every other beat is a word
const at = (n) => T0 + n * BEAT; // time of beat n
const DROP = 6; // beat where the groove starts, mid zoom into the stream scene
const BUILD = 48; // snare roll into the finale
const STOP = 52; // everything cuts for a breath
const HIT = 30.77; // the logo appears

// buses
const dry = [new Float32Array(N), new Float32Array(N)];
const send = [new Float32Array(N), new Float32Array(N)]; // goes through the reverb
const duck = [new Float32Array(N), new Float32Array(N)]; // pad and bass, pumped by the kick

let seed = 7;
const noise = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

function put(bus, t0, sig, pan = 0, gain = 1) {
  const i0 = Math.round(t0 * SR);
  const l = Math.cos(((pan + 1) * Math.PI) / 4) * gain;
  const r = Math.sin(((pan + 1) * Math.PI) / 4) * gain;
  for (let i = 0; i < sig.length && i0 + i < N; i++) {
    if (i0 + i < 0) continue;
    bus[0][i0 + i] += sig[i] * l;
    bus[1][i0 + i] += sig[i] * r;
  }
}

function lowpass(x, cutoff) {
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  let y = 0;
  for (let i = 0; i < x.length; i++) x[i] = y += a * (x[i] - y);
  return x;
}

// Warm pad: detuned saws through a two-pole lowpass, slow attack and release
function pad(midi, dur, amp, cutoff = 1400) {
  const len = Math.round((dur + 1.2) * SR);
  const x = new Float32Array(len);
  for (const det of [-0.11, 0, 0.09]) {
    const f = mtof(midi + det);
    let ph = (noise() + 1) / 2;
    for (let i = 0; i < len; i++) {
      ph += f / SR;
      ph -= Math.floor(ph);
      x[i] += (2 * ph - 1) / 3;
    }
  }
  lowpass(lowpass(x, cutoff), cutoff);
  for (let i = 0; i < len; i++) {
    const s = i / SR;
    const env = Math.min(1, s / 0.35) * (s < dur ? 1 : Math.exp(-(s - dur) * 4));
    x[i] *= env * amp;
  }
  return x;
}

// Karplus-Strong pluck
function pluck(midi, amp, decay = 0.996) {
  const f = mtof(midi);
  const p = Math.max(2, Math.round(SR / f));
  const len = Math.round(SR * 1.4);
  const buf = new Float32Array(p).map(() => noise());
  const y = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const k = i % p;
    const nx = (k + 1) % p;
    y[i] = buf[k];
    buf[k] = decay * 0.5 * (buf[k] + buf[nx]);
  }
  lowpass(y, 3200);
  for (let i = 0; i < len; i++) y[i] *= amp;
  return y;
}

function kick(amp = 1) {
  const len = Math.round(SR * 0.5);
  const y = new Float32Array(len);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const s = i / SR;
    ph += (46 + 110 * Math.exp(-s * 28)) / SR;
    y[i] = (Math.sin(2 * Math.PI * ph) * Math.exp(-s * 5.5) + (s < 0.004 ? noise() * 0.3 : 0)) * amp;
  }
  return y;
}

function hat(amp, open = false) {
  const len = Math.round(SR * (open ? 0.25 : 0.06));
  const y = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const n = noise();
    lp += 0.4 * (n - lp);
    y[i] = (n - lp) * Math.exp((-i / SR) * (open ? 14 : 70)) * amp;
  }
  return y;
}

function clap(amp) {
  const len = Math.round(SR * 0.3);
  const y = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    const s = i / SR;
    const bursts = [0, 0.011, 0.022].reduce((a, o) => a + (s >= o ? Math.exp(-(s - o) * 90) : 0), 0) * 0.5 + Math.exp(-s * 16) * 0.5;
    y[i] = noise() * bursts * amp;
  }
  lowpass(y, 2600);
  return y;
}

function bass(midi, dur, amp) {
  const len = Math.round(SR * (dur + 0.05));
  const y = new Float32Array(len);
  const f = mtof(midi);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const s = i / SR;
    ph += f / SR;
    const env = Math.min(1, s / 0.006) * Math.exp(-s * 3) * (s > dur ? Math.exp(-(s - dur) * 60) : 1);
    y[i] = Math.tanh(1.6 * (Math.sin(2 * Math.PI * ph) + 0.3 * Math.sin(4 * Math.PI * ph))) * env * amp;
  }
  return y;
}

function riser(t, dur, amp) {
  const len = Math.round(SR * dur);
  const y = new Float32Array(len);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const a = 1 - Math.exp((-2 * Math.PI * (300 + 7000 * p * p)) / SR);
    lp += a * (noise() - lp);
    y[i] = lp * p * p * amp;
  }
  put(send, t, y, 0, 0.6);
  put(dry, t, y, 0, 0.5);
}

// A minor: Am, F, C, G — one chord per bar
const CHORDS = [
  { pad: [57, 60, 64, 69], root: 33 },
  { pad: [53, 57, 60, 65], root: 29 },
  { pad: [55, 60, 64, 67], root: 36 },
  { pad: [55, 59, 62, 67], root: 31 },
];
const ARP = [0, 2, 3, 1, 2, 3, 1, 2]; // indexes into the chord, one per 8th

// Intro: a held Am that swells, a deep hit under each word, a riser into the drop
for (const m of [45, 52, 57, 60]) put(send, 0, pad(m, at(DROP) - 0.2, 0.05, 700), 0, 1.2);
for (const n of [0, 2, 4]) {
  put(dry, at(n), kick(0.9));
  put(send, at(n), pluck(57 + n, 0.35), (n - 2) * 0.2);
}
riser(at(2), at(DROP) - at(2), 0.25);

// Groove
for (let n = DROP; n < STOP; n++) {
  const t = at(n);
  const bar = Math.floor((n - DROP) / 4);
  const c = CHORDS[bar % 4];
  const inBar = (n - DROP) % 4;
  const building = n >= BUILD;
  if (inBar === 0) {
    const len = Math.min(4, STOP - n) * BEAT;
    for (const m of c.pad) put(duck, t, pad(m, len - 0.05, 0.065, building ? 2400 : 1600), (m % 3) * 0.3 - 0.3);
    for (const m of c.pad) put(send, t, pad(m + 12, len - 0.05, 0.012, 2600), 0, 1);
  }
  put(dry, t, kick(building ? 0.6 : 0.72));
  if (n >= DROP + 8 && inBar % 2 === 1) put(send, t, clap(building ? 0.18 : 0.3), 0, 1);
  for (const h of [0.5]) put(dry, t + h * BEAT, hat(0.16, inBar === 3), 0.35);
  put(dry, t + 0.25 * BEAT, hat(0.05), -0.3);
  put(dry, t + 0.75 * BEAT, hat(0.06), -0.3);
  for (const e of [0, 0.5]) put(duck, t + e * BEAT, bass(c.root + (e && inBar === 3 ? 7 : 0), BEAT * 0.42, 0.3));
  if (n >= DROP + 8) {
    for (const e of [0, 0.5]) {
      const k = ((n - DROP) * 2 + e * 2) % 8;
      const m = c.pad[ARP[k]] + 12;
      put(send, t + e * BEAT, pluck(m, 0.2), ((k % 4) - 1.5) * 0.35, 1);
    }
  }
  if (building) {
    // snare roll speeding up: 8ths, then 16ths
    const steps = n >= BUILD + 2 ? 4 : 2;
    for (let s = 0; s < steps; s++) put(send, t + (s / steps) * BEAT, clap(0.1 + ((n - BUILD) / 4) * 0.2), 0, 1);
  }
}
riser(at(BUILD), at(STOP) - at(BUILD) + 0.15, 0.35);

// Finale: one big C major chord with a sub hit as the logo blooms
put(dry, HIT, kick(0.9));
for (const m of [36, 48, 55, 60, 64, 67, 74]) {
  put(duck, HIT, pad(m, 1.4, 0.07, 2600), (m % 5) * 0.2 - 0.4);
  put(send, HIT, pad(m, 1.4, 0.04, 3000), 0, 1);
}
for (const [k, m] of [72, 76, 79, 84].entries()) put(send, HIT + k * 0.09, pluck(m, 0.3, 0.998), k * 0.25 - 0.4, 1);

// Sidechain: the pad and bass dip under every kick, which gives the groove its pump
const kicks = [];
for (let n = DROP; n < STOP; n++) kicks.push(at(n));
for (let i = 0, k = 0; i < N; i++) {
  const s = i / SR;
  while (k + 1 < kicks.length && kicks[k + 1] <= s) k++;
  const g = kicks[k] <= s && s < at(STOP) ? 1 - 0.55 * Math.exp(-(s - kicks[k]) * 9) : 1;
  dry[0][i] += duck[0][i] * g;
  dry[1][i] += duck[1][i] * g;
  send[0][i] += duck[0][i] * g * 0.25;
  send[1][i] += duck[1][i] * g * 0.25;
}

// Freeverb-style reverb: parallel combs into series allpasses, slightly different per side
function reverb(x, spread) {
  const y = new Float32Array(x.length);
  for (const d of [1116, 1188, 1277, 1356, 1422, 1491]) {
    const len = d + spread;
    const buf = new Float32Array(len);
    let idx = 0;
    let lp = 0;
    for (let i = 0; i < x.length; i++) {
      const out = buf[idx];
      lp = out * 0.7 + lp * 0.3;
      buf[idx] = x[i] + lp * 0.86;
      y[i] += out / 6;
      idx = (idx + 1) % len;
    }
  }
  for (const d of [556, 441, 341]) {
    const len = d + spread;
    const buf = new Float32Array(len);
    let idx = 0;
    for (let i = 0; i < y.length; i++) {
      const b = buf[idx];
      const out = -y[i] + b;
      buf[idx] = y[i] + b * 0.5;
      y[i] = out;
      idx = (idx + 1) % len;
    }
  }
  return y;
}
const wet = [reverb(send[0], 0), reverb(send[1], 23)];

const out = [new Float32Array(N), new Float32Array(N)];
let peak = 0;
let raw = 0;
for (let c = 0; c < 2; c++) for (let i = 0; i < N; i++) raw = Math.max(raw, Math.abs(dry[c][i] + wet[c][i] * 0.9 + send[c][i] * 0.35));
const pre = 1.1 / raw; // drive the soft clip only a little, so it glues instead of squashing
for (let c = 0; c < 2; c++) {
  for (let i = 0; i < N; i++) {
    const s = i / SR;
    const fade = Math.min(1, s / 0.4) * (s > LEN - 1.2 ? Math.max(0, (LEN - s) / 1.2) : 1);
    out[c][i] = Math.tanh((dry[c][i] + wet[c][i] * 0.9 + send[c][i] * 0.35) * pre) * fade;
    peak = Math.max(peak, Math.abs(out[c][i]));
  }
}

// 16-bit stereo WAV, normalised to -1 dBFS
const norm = 0.89 / peak;
const data = Buffer.alloc(N * 4);
for (let i = 0; i < N; i++) {
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[0][i] * norm)) * 32767), i * 4);
  data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, out[1][i] * norm)) * 32767), i * 4 + 2);
}
const head = Buffer.alloc(44);
head.write("RIFF", 0);
head.writeUInt32LE(36 + data.length, 4);
head.write("WAVEfmt ", 8);
head.writeUInt32LE(16, 16);
head.writeUInt16LE(1, 20);
head.writeUInt16LE(2, 22);
head.writeUInt32LE(SR, 24);
head.writeUInt32LE(SR * 4, 28);
head.writeUInt16LE(4, 32);
head.writeUInt16LE(16, 34);
head.write("data", 36);
head.writeUInt32LE(data.length, 40);
fs.writeFileSync(process.argv[2] || "music.wav", Buffer.concat([head, data]));
console.log("wrote", process.argv[2] || "music.wav", LEN.toFixed(1) + "s, raw peak", raw.toFixed(2));
