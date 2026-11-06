import { Audio } from "@remotion/media";
import { whoosh } from "@remotion/sfx";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Kinetic } from "../lib/Kinetic";
import { EASE_IN, mix, pop, track, tw } from "../lib/motion";
import { Backdrop, C, glass, Meter, OverlayCard, RewardCard, StatusChip } from "../lib/theme";
import { Cam, Obj, World } from "../lib/World";

export const FINALE_FRAMES = 300;
const GATHER = [130, 185]; // everything collapses into the logo
const LOGO = 176;

const cam = (f: number): Cam => ({
  x: 0,
  y: track(f, [[0, 60], [GATHER[1], 0]]),
  dolly: track(f, [[0, -700], [GATHER[0], -150], [GATHER[1], 80], [300, 160]]),
  rx: track(f, [[0, 10], [GATHER[1], 0]]),
  ry: track(f, [[0, 22], [GATHER[0], -6], [GATHER[1], 0]]),
});

const Bars: React.FC = () => (
  <div style={{ ...glass(24), padding: 26, display: "flex", alignItems: "flex-end", gap: 8, height: 220, width: 420 }}>
    {Array.from({ length: 14 }, (_, k) => (
      <div key={k} style={{ flex: 1, height: `${25 + ((k * 37) % 70)}%`, borderRadius: 4, background: k === 13 ? C.accent : "rgba(235,235,245,.24)" }} />
    ))}
  </div>
);

const PIECES: { x: number; y: number; z: number; r: number; el: React.ReactNode }[] = [
  { x: -760, y: -290, z: -150, r: -8, el: <RewardCard title="Air horn" cost="100 points" dot="#30d158" playing /> },
  { x: 680, y: -330, z: 120, r: 6, el: <OverlayCard scale={1.6} /> },
  { x: -740, y: 330, z: 40, r: 5, el: <Bars /> },
  { x: 760, y: 300, z: -120, r: -5, el: <StatusChip on size={34} /> },
  { x: 1100, y: -20, z: -800, r: 8, el: <RewardCard title="Bruh" cost="150 points" dot={C.pink} tag="3 sounds" /> },
  { x: -1150, y: 20, z: -900, r: -6, el: <RewardCard title="Drum roll" cost="250 points" dot={C.orange} /> },
  { x: 120, y: -560, z: -700, r: 4, el: <RewardCard title="Read my message" cost="500 points" dot={C.blue} /> },
];

export const Finale: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const g = tw(f, GATHER[0], GATHER[1], 0, 1, EASE_IN);
  const logo = pop(f, fps, LOGO, 11, 120);
  const flash = tw(f, LOGO, LOGO + 50, 0, 1);
  const push = tw(f, LOGO, 300, 1, 1.05, (t) => t);
  return (
    <Backdrop glow={1 + flash * 0.6}>
      <World cam={cam}>
        {PIECES.map((p, i) => {
          const inn = pop(f, fps, 4 + i * 6, 15, 70);
          const bob = Math.sin(f / 30 + i) * 14;
          return (
            <Obj
              key={i}
              x={mix(p.x, 0, g)}
              y={mix(p.y + bob, 0, g)}
              z={mix(mix(-2600, p.z, inn), -200, g)}
              rz={p.r * (1 - g)}
              ry={(1 - inn) * 40}
              s={1 - g * 0.85}
              o={Math.min(1, inn * 1.4) * (1 - g)}
            >
              {p.el}
            </Obj>
          );
        })}
      </World>
      {/* light bloom behind the logo */}
      <AbsoluteFill style={{ background: `radial-gradient(40% 45% at 50% 46%, rgba(83,252,24,${0.22 * Math.min(1, logo)}), transparent 70%)` }} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", gap: 40, scale: String(push) }}>
        <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", border: `3px solid ${C.accent}`, transform: `scale(${flash * 6})`, opacity: flash > 0 && flash < 1 ? (1 - flash) * 0.6 : 0 }} />
        <div style={{ display: "flex", alignItems: "center", gap: 44 }}>
          <div style={{ transform: `scale(${logo})`, opacity: Math.min(1, logo * 2) }}>
            <Meter size={150} live={f > LOGO + 30} glow grow={Math.min(1, logo)} />
          </div>
          <Kinetic text="AudioBounty" start={LOGO + 14} size={170} by="char" stagger={2} />
        </div>
        <Kinetic text="Kick sound alerts. Self-hosted and open source." start={LOGO + 50} size={46} weight={400} color={C.muted} stagger={2} />
        <div
          style={{
            marginTop: 20,
            fontSize: 38,
            fontWeight: 600,
            padding: "20px 44px",
            borderRadius: 999,
            background: C.accent,
            color: C.accentInk,
            boxShadow: `0 0 60px ${C.accent}66`,
            opacity: tw(f, LOGO + 70, LOGO + 90, 0, 1),
            transform: `translateY(${tw(f, LOGO + 70, LOGO + 100, 30, 0)}px)`,
          }}
        >
          github.com/EmreSarikaya35/Audiobounty
        </div>
      </AbsoluteFill>
      <Sequence from={GATHER[0]} durationInFrames={70} layout="none">
        <Audio src={whoosh} volume={0.6} />
      </Sequence>
    </Backdrop>
  );
};
