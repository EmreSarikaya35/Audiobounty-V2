import { Audio } from "@remotion/media";
import { mouseClick } from "@remotion/sfx";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Kinetic } from "../lib/Kinetic";
import { EASE_IN_OUT, pop, track, tw } from "../lib/motion";
import { Backdrop, C, glass, Icon, RewardCard, StatusChip } from "../lib/theme";
import { Cam, Obj, World } from "../lib/World";

export const DASHBOARD_FRAMES = 360;
const CLICK = 290;

const REWARDS = [
  { title: "Air horn", cost: "100 points", dot: "#30d158" },
  { title: "Bruh", cost: "150 points", dot: C.pink, tag: "3 sounds" },
  { title: "Read my message", cost: "500 points", dot: C.blue },
  { title: "Drum roll", cost: "250 points", dot: C.orange },
  { title: "Sad trombone", cost: "200 points", dot: C.purple },
  { title: "Applause", cost: "300 points", dot: "#64d2ff", tag: "2 sounds" },
];

// The Test button of the first card, in world coordinates
const TEST = { x: -640, y: 112 };

const cam = (f: number): Cam => ({
  x: track(f, [[0, -560], [150, 380], [240, 0], [300, -540], [360, -560]]),
  y: track(f, [[0, 260], [150, 160], [240, 0], [300, 70], [360, 70]]),
  dolly: track(f, [[0, 380], [150, 260], [240, -200], [300, 360], [360, 420]]),
  rx: track(f, [[0, 62], [150, 46], [240, 0], [360, 0]]),
  ry: track(f, [[0, -20], [150, -6], [240, 0], [300, 5], [360, 3]]),
});

export const Dashboard: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const playing = f >= CLICK;
  const press = tw(f, CLICK - 4, CLICK, 1, 0.94) * tw(f, CLICK, CLICK + 14, 1, 1 / 0.94);
  const ripple = tw(f, CLICK, CLICK + 40, 0, 1);
  const cx = track(f, [[220, 420], [CLICK - 6, TEST.x + 14]], EASE_IN_OUT);
  const cy = track(f, [[220, 420], [CLICK - 6, TEST.y + 18]], EASE_IN_OUT);
  return (
    <Backdrop>
      <World cam={cam}>
        <Obj style={{ width: 1440 }}>
          <div style={{ width: 1440, display: "flex", flexDirection: "column", gap: 24, transformStyle: "preserve-3d" }}>
            <div style={{ ...glass(999), height: 80, display: "flex", alignItems: "center", gap: 18, padding: "0 16px", opacity: tw(f, 0, 20, 0, 1) }}>
              <div style={{ width: 52, height: 52, borderRadius: 26, background: "linear-gradient(135deg, #53fc18, #1b7d00)" }} />
              <span style={{ fontSize: 28, fontWeight: 500, marginRight: "auto" }}>mrkaffin</span>
              <span style={{ color: C.muted, display: "flex", gap: 34, alignItems: "center", fontSize: 24, paddingRight: 20 }}>
                <Icon name="settings" size={28} /> Türkçe <span>Log out</span>
              </span>
            </div>
            <div style={{ ...glass(26), height: 120, display: "flex", alignItems: "center", gap: 16, padding: "0 28px", opacity: tw(f, 6, 26, 0, 1) }}>
              <StatusChip on size={24} />
              <div style={{ marginLeft: "auto", fontSize: 22, fontWeight: 600, padding: "12px 26px", borderRadius: 999, background: "rgba(70,70,70,.62)" }}>Copy OBS link</div>
              <div style={{ fontSize: 22, fontWeight: 500, padding: "12px 26px", borderRadius: 999, background: "rgba(70,70,70,.62)" }}>Mute</div>
            </div>
            <div style={{ height: 70, display: "flex", alignItems: "center", marginTop: 16, padding: "0 8px" }}>
              <span style={{ fontSize: 40, fontWeight: 600, letterSpacing: "-0.03em", marginRight: "auto" }}>Sound rewards</span>
              <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 24, fontWeight: 600, padding: "14px 28px", borderRadius: 999, background: C.accent, color: C.accentInk, boxShadow: `0 0 40px ${C.accent}44` }}>
                <Icon name="plus" size={24} width={2.4} /> New reward
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 460px)", gap: 30, transformStyle: "preserve-3d" }}>
              {REWARDS.map((r, i) => {
                const p = pop(f, fps, 10 + i * 7, 13, 110);
                const isFirst = i === 0;
                return (
                  <div
                    key={r.title}
                    style={{
                      transformStyle: "preserve-3d",
                      transform: `translateZ(${(1 - p) * -420 + (isFirst && playing ? 40 : 0)}px) rotateX(${(1 - p) * 40}deg) scale(${isFirst ? press : 1})`,
                      opacity: Math.min(1, p * 1.5),
                    }}
                  >
                    <RewardCard {...r} w={460} playing={isFirst && playing} />
                  </div>
                );
              })}
            </div>
          </div>
        </Obj>
        {/* click ripple and cursor live just above the plane */}
        <Obj x={TEST.x} y={TEST.y} z={50} s={1 + ripple * 3} o={ripple > 0 && ripple < 1 ? 1 - ripple : 0}>
          <div style={{ width: 60, height: 60, borderRadius: 30, border: `3px solid ${C.accent}` }} />
        </Obj>
        <Obj x={cx} y={cy} z={60} o={tw(f, 220, 236, 0, 1)} s={1 - (1 - press) * 2}>
          <svg width={54} height={54} viewBox="0 0 24 24" style={{ transform: "translate(40%, 40%)", filter: "drop-shadow(0 6px 10px rgba(0,0,0,.5))" }}>
            <path d="M5 3l14 8-6 1.5L10 19z" fill="#fff" stroke="#000" strokeWidth={1.1} strokeLinejoin="round" />
          </svg>
        </Obj>
      </World>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 110px 130px" }}>
        <Kinetic text="Every sound is a reward." start={30} out={175} size={64} align="left" />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 110px 130px" }}>
        <Kinetic text="Test it in one click." start={205} out={340} size={64} align="left" accent={["one", "click."]} />
      </AbsoluteFill>
      <Sequence from={CLICK - 2} layout="none">
        <Audio src={mouseClick} />
      </Sequence>
    </Backdrop>
  );
};
