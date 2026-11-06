import { Easing, interpolate, spring } from "remotion";

export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1); // expo out: fast arrival, long settle
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1); // camera moves between holds
export const EASE_IN = Easing.bezier(0.55, 0, 1, 0.45); // exits that accelerate away
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** One tween between two frames. */
export const tw = (f: number, a: number, b: number, from: number, to: number, easing = EASE_OUT) =>
  interpolate(f, [a, b], [from, to], { ...clamp, easing });

/** A keyframed track; the easing applies to each segment. */
export const track = (f: number, keys: [number, number][], easing = EASE_IN_OUT) =>
  interpolate(
    f,
    keys.map((k) => k[0]),
    keys.map((k) => k[1]),
    { ...clamp, easing },
  );

/** Physical pop-in: 0 → 1 with a little overshoot. */
export const pop = (f: number, fps: number, delay = 0, damping = 14, stiffness = 120) =>
  spring({ frame: f - delay, fps, config: { damping, stiffness, mass: 0.9 } });

/** Critically damped settle: 0 → 1, no overshoot. */
export const settle = (f: number, fps: number, delay = 0, stiffness = 90) =>
  spring({ frame: f - delay, fps, config: { damping: 200, stiffness } });

/** Deterministic noise so every render of a frame is identical. */
export const rnd = (i: number) => {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
