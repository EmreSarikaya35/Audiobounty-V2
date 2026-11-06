import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Kinetic } from "../lib/Kinetic";
import { EASE_IN, pop, track, tw } from "../lib/motion";
import { Backdrop, C, Meter } from "../lib/theme";
import { Cam, Obj, World } from "../lib/World";

export const HOOK_FRAMES = 260;
const BEATS = [36, 104, 172]; // each word lands on a pulse of the wave

const cam = (f: number): Cam => ({
  x: 0,
  y: track(f, [[0, 40], [210, 0]]),
  // a slow dolly that accelerates through the meter at the end
  dolly: track(f, [[0, -200], [210, 120], [260, 1500]], EASE_IN),
  rx: track(f, [[0, 8], [260, -2]]),
  ry: track(f, [[0, -10], [260, 8]]),
});

/** The audio line: flat, then spiking on every beat. */
const Wave: React.FC<{ f: number }> = ({ f }) => {
  const W = 2200;
  const draw = tw(f, 0, 45, 0, 1);
  const flatten = tw(f, 195, 225, 1, 0);
  let kick = 0.12;
  for (const b of BEATS) kick += Math.max(0, 1 - Math.abs(f - b) / 26) ** 2;
  const amp = 150 * kick * flatten;
  const pts: string[] = [];
  for (let i = 0; i <= 220; i++) {
    const t = i / 220;
    const env = Math.sin(Math.PI * t) ** 2; // quiet at the ends
    const y = env * amp * (Math.sin(t * 38 + f / 5) * 0.6 + Math.sin(t * 91 - f / 3) * 0.4);
    pts.push(`${(t * W).toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg width={W} height={500} viewBox={`0 -250 ${W} 500`} style={{ overflow: "visible", filter: `drop-shadow(0 0 18px ${C.accent}aa)` }}>
      <polyline points={pts.join(" ")} fill="none" stroke={C.accent} strokeWidth={5} strokeLinejoin="round" strokeDasharray={W * 1.6} strokeDashoffset={W * 1.6 * (1 - draw)} />
    </svg>
  );
};

export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const meter = pop(f, fps, 200, 12, 110);
  return (
    <Backdrop glow={tw(f, 0, 120, 0.2, 1)}>
      <World cam={cam}>
        <Obj y={170} z={-500} o={tw(f, 212, 232, 1, 0)}>
          <Wave f={f} />
        </Obj>
        <Obj z={60} s={0.4 + meter * 0.6} o={Math.min(1, meter * 2)}>
          <Meter size={300} live={f > 218} glow grow={meter} />
        </Obj>
      </World>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Kinetic text="Channel points." start={BEATS[0] - 8} out={BEATS[1] - 32} size={150} by="char" stagger={1.5} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Kinetic text="Real sounds." start={BEATS[1] - 6} out={BEATS[2] - 32} size={150} by="char" stagger={1.5} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Kinetic text="Live on stream." start={BEATS[2] - 6} out={194} size={150} by="char" stagger={1.5} accent={[]} />
      </AbsoluteFill>
    </Backdrop>
  );
};
