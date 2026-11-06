import { Audio } from "@remotion/media";
import { uiSwitch, whoosh } from "@remotion/sfx";
import { Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Kinetic } from "../lib/Kinetic";
import { pop, rnd, settle, track, tw } from "../lib/motion";
import { Backdrop, C, FONT, glass, Icon, Meter, MONO, OverlayCard } from "../lib/theme";
import { Cam, Obj, World } from "../lib/World";

export const FEATURES_FRAMES = 600;
const GAP = 1500;
const FOCUS = [20, 170, 320, 470]; // when each panel is centred

const camX = (f: number) =>
  track(f, [[0, -1000], [45, 0], [130, 60], [165, GAP], [280, GAP + 60], [315, GAP * 2], [430, GAP * 2 + 60], [465, GAP * 3], [600, GAP * 3 + 90]]);

const cam = (f: number): Cam => {
  const v = (camX(f + 1) - camX(f - 1)) / 2;
  return {
    x: camX(f),
    y: track(f, [[0, 40], [45, 0], [600, -10]]),
    // pull back while travelling, push in on arrival
    dolly: track(f, [[0, -700], [45, 0], [130, 40], [147, -320], [165, 0], [280, 40], [297, -320], [315, 0], [430, 40], [447, -320], [465, 0], [600, 160]]),
    rx: track(f, [[0, 10], [45, 2], [600, 0]]),
    ry: Math.max(-20, Math.min(20, -v * 0.16)) + track(f, [[0, 16], [45, 0]]),
  };
};

const Panel: React.FC<{ i: number; title: string; sub: string; icon: "trim" | "shuffle" | "image" | "chart"; children: React.ReactNode }> = ({ i, title, sub, icon, children }) => {
  const f = useCurrentFrame();
  const d = Math.abs(camX(f) - i * GAP);
  return (
    <Obj x={i * GAP} z={i % 2 ? -160 : 0} ry={i % 2 ? -4 : 4} o={Math.max(0.25, 1 - d / 2200)}>
      <div style={{ ...glass(36), width: 1180, height: 680, padding: "54px 64px", display: "flex", flexDirection: "column", gap: 34 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <div style={{ width: 64, height: 64, borderRadius: 18, display: "grid", placeItems: "center", background: "rgba(83,252,24,.12)", color: C.accent }}>
            <Icon name={icon} size={34} width={1.8} />
          </div>
          <div>
            <Kinetic text={title} start={FOCUS[i] - 6} size={52} align="left" stagger={3} />
            <div style={{ fontSize: 24, color: C.muted, marginTop: 6, opacity: tw(f, FOCUS[i] + 10, FOCUS[i] + 30, 0, 1) }}>{sub}</div>
          </div>
        </div>
        {children}
      </div>
    </Obj>
  );
};

const Trim: React.FC = () => {
  const lf = useCurrentFrame() - FOCUS[0];
  const L = tw(lf, 20, 60, 0, 0.16);
  const R = tw(lf, 30, 72, 1, 0.72);
  const head = tw(lf, 78, 140, L, R);
  const N = 96;
  const W = 1040;
  return (
    <div style={{ position: "relative", height: 380, marginTop: 10 }}>
      <div style={{ position: "absolute", inset: "20px 0 80px", display: "flex", alignItems: "center", gap: 4 }}>
        {Array.from({ length: N }, (_, k) => {
          const t = k / N;
          const inside = t >= L && t <= R;
          const h = 20 + 230 * (0.25 + 0.75 * rnd(k)) * Math.sin(Math.PI * t) ** 0.6;
          const grow = tw(lf, k * 0.5, k * 0.5 + 24, 0, 1);
          return <div key={k} style={{ flex: 1, height: h * grow, borderRadius: 3, background: inside ? (t <= head && lf > 78 ? C.accent : "rgba(83,252,24,.55)") : "rgba(235,235,245,.16)" }} />;
        })}
      </div>
      {[L, R].map((p, k) => (
        <div key={k} style={{ position: "absolute", top: 0, bottom: 60, left: p * W - 4, width: 8, borderRadius: 4, background: "#fff", boxShadow: "0 0 20px rgba(255,255,255,.5)" }} />
      ))}
      <div style={{ position: "absolute", top: 10, bottom: 70, left: head * W - 1, width: 2, background: C.accent, opacity: lf > 78 && lf < 142 ? 1 : 0, boxShadow: `0 0 16px ${C.accent}` }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, display: "flex", alignItems: "center", gap: 28, fontSize: 24, color: C.muted, fontFamily: MONO }}>
        <span>Start {(L * 5).toFixed(1)}s</span>
        <span>End {(R * 5).toFixed(1)}s</span>
        <span style={{ marginLeft: "auto", fontFamily: FONT, color: C.text, display: "flex", alignItems: "center", gap: 10, padding: "12px 24px", borderRadius: 999, background: "rgba(70,70,70,.62)" }}>
          <Icon name="play" size={22} /> Play selection
        </span>
      </div>
    </div>
  );
};

const POOL = ["Bruh", "Vine boom", "Oof"];
const Pool: React.FC = () => {
  const lf = useCurrentFrame() - FOCUS[1];
  const { fps } = useVideoConfig();
  const slot = track(lf, [[28, 0], [40, 1], [50, 2], [58, 0], [66, 1], [76, 2], [92, 1]]);
  const done = lf >= 96;
  const land = pop(lf, fps, 92, 9, 160);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 50, marginTop: 30 }}>
      <div style={{ color: C.accent, transform: `rotate(${tw(lf, 20, 96, 0, 720)}deg)`, filter: `drop-shadow(0 0 20px ${C.accent}88)` }}>
        <Icon name="shuffle" size={110} width={1.6} />
      </div>
      <div style={{ position: "relative", display: "flex", gap: 36 }}>
        <div
          style={{
            position: "absolute",
            top: -8,
            left: -8 + slot * 336,
            width: 316,
            height: 186,
            borderRadius: 30,
            boxShadow: `0 0 0 3px ${C.accent}, 0 0 50px ${C.accent}55`,
            opacity: tw(lf, 24, 32, 0, 1),
            transform: `scale(${done ? 1 + (1 - land) * 0.08 : 1})`,
          }}
        />
        {POOL.map((n, k) => (
          <div key={n} style={{ ...glass(24), background: "rgba(44,44,46,.9)", width: 300, height: 170, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14, fontSize: 32, fontWeight: 500 }}>
            {n}
            <span style={{ height: 30, display: "flex", alignItems: "center", color: C.muted, fontSize: 22 }}>
              {done && k === 1 ? <Meter size={30} live /> : <Icon name="sound" size={28} />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

const SWATCHES = [C.accent, C.pink, C.blue, "#ffd60a"];
const Seg: React.FC<{ items: string[]; at: number }> = ({ items, at }) => (
  <div style={{ position: "relative", display: "flex", padding: 5, borderRadius: 999, background: "rgba(118,118,128,.24)" }}>
    <div style={{ position: "absolute", top: 5, bottom: 5, left: 5 + at * 130, width: 130, borderRadius: 999, background: "rgba(235,235,245,.3)", boxShadow: `inset 0 1px 0 ${C.rim}` }} />
    {items.map((t) => (
      <div key={t} style={{ position: "relative", width: 130, textAlign: "center", padding: "10px 0", fontSize: 22, fontWeight: 500 }}>
        {t}
      </div>
    ))}
  </div>
);
const CardStyle: React.FC = () => {
  const lf = useCurrentFrame() - FOCUS[2];
  const { fps } = useVideoConfig();
  const colorIx = lf < 36 ? 0 : lf < 62 ? 1 : lf < 88 ? 2 : 0;
  const accent = SWATCHES[colorIx];
  const changed = [36, 62, 88].filter((c) => lf >= c).pop() ?? -100;
  const bump = 1 + (1 - Math.min(1, pop(lf, fps, changed, 10, 200))) * 0.08;
  const toCenter = settle(lf, fps, 50, 140);
  const bigger = pop(lf, fps, 100, 12, 140);
  return (
    <div style={{ display: "flex", gap: 54, alignItems: "center" }}>
      <div style={{ position: "relative", width: 620, height: 349, borderRadius: 22, overflow: "hidden", background: "linear-gradient(160deg, #2b3440, #151a20 55%, #1f2a24)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)" }}>
        <div style={{ position: "absolute", left: "50%", top: 30 + toCenter * 115, transform: `translate(-50%, 0) scale(${bump * (1 + bigger * 0.22)})`, transformOrigin: "50% 0" }}>
          <OverlayCard scale={1.05} accent={accent} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 30, fontSize: 24, color: C.muted }}>
        Accent
        <div style={{ display: "flex", gap: 18, marginTop: -16 }}>
          {SWATCHES.map((s, k) => (
            <div key={s} style={{ width: 52, height: 52, borderRadius: 26, background: s, boxShadow: k === colorIx ? `0 0 0 4px #1c1c1e, 0 0 0 7px ${s}, 0 0 30px ${s}88` : undefined }} />
          ))}
        </div>
        Position
        <div style={{ marginTop: -16 }}>
          <Seg items={["Top", "Center", "Bottom"]} at={toCenter} />
        </div>
        Size
        <div style={{ marginTop: -16 }}>
          <Seg items={["S", "M", "L"]} at={1 + Math.min(1, bigger)} />
        </div>
      </div>
    </div>
  );
};

const DAYS = Array.from({ length: 30 }, (_, k) => 0.2 + 0.7 * rnd(k + 9) * (0.5 + k / 60));
const TOP = [
  ["Air horn", 182],
  ["Bruh", 121],
  ["Drum roll", 74],
] as const;
const Stats: React.FC = () => {
  const lf = useCurrentFrame() - FOCUS[3];
  const n = tw(lf, 10, 80, 0, 1);
  return (
    <div style={{ display: "flex", gap: 54 }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 28 }}>
        <div style={{ display: "flex", gap: 60 }}>
          {[
            ["Redemptions", Math.round(477 * n).toLocaleString("en-US")],
            ["Points spent", Math.round(85860 * n).toLocaleString("en-US")],
          ].map(([l, v]) => (
            <div key={l}>
              <div style={{ fontSize: 22, color: C.muted }}>{l}</div>
              <div style={{ fontSize: 64, fontWeight: 600, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>{v}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 260, display: "flex", alignItems: "flex-end", gap: 7, borderBottom: "1px solid rgba(235,235,245,.12)" }}>
          {DAYS.map((h, k) => {
            const today = k === DAYS.length - 1;
            return (
              <div
                key={k}
                style={{
                  flex: 1,
                  height: `${(today ? 1 : h) * 100 * tw(lf, 14 + k * 1.6, 44 + k * 1.6, 0, 1)}%`,
                  borderRadius: 5,
                  background: today ? C.accent : "rgba(235,235,245,.24)",
                  boxShadow: today ? `0 0 30px ${C.accent}88` : undefined,
                }}
              />
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: C.faint, fontFamily: MONO, marginTop: -14 }}>
          <span>30 days ago</span>
          <span style={{ color: C.accent }}>Today</span>
        </div>
      </div>
      <div style={{ width: 330, display: "flex", flexDirection: "column", gap: 18, paddingTop: 8 }}>
        <div style={{ fontSize: 22, color: C.muted }}>Top rewards</div>
        {TOP.map(([t, v], k) => (
          <div key={t} style={{ position: "relative", height: 64, borderRadius: 12, overflow: "hidden", background: "rgba(118,118,128,.12)", display: "flex", alignItems: "center", padding: "0 18px", fontSize: 24 }}>
            <div style={{ position: "absolute", inset: 0, width: `${(v / 182) * 100 * tw(lf, 40 + k * 8, 80 + k * 8, 0, 1)}%`, background: k === 0 ? "rgba(83,252,24,.2)" : "rgba(118,118,128,.22)" }} />
            <span style={{ position: "relative", marginRight: "auto" }}>{t}</span>
            <b style={{ position: "relative", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{Math.round(v * n)}</b>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Features: React.FC = () => (
  <Backdrop>
    <World cam={cam}>
      <Panel i={0} title="Trim any sound" sub="Drag the handles, keep only the best part" icon="trim">
        <Trim />
      </Panel>
      <Panel i={1} title="Random sound pools" sub="One reward, a different sound every time" icon="shuffle">
        <Pool />
      </Panel>
      <Panel i={2} title="Make the card yours" sub="Color, position, size, even a GIF by link" icon="image">
        <CardStyle />
      </Panel>
      <Panel i={3} title="See what your viewers love" sub="Thirty days of redemptions at a glance" icon="chart">
        <Stats />
      </Panel>
    </World>
    {[0, 140, 290, 440].map((s) => (
      <Sequence key={s} from={s} durationInFrames={60} layout="none">
        <Audio src={whoosh} volume={0.35} />
      </Sequence>
    ))}
    {[FOCUS[2] + 36, FOCUS[2] + 62, FOCUS[2] + 88].map((s) => (
      <Sequence key={s} from={s} durationInFrames={30} layout="none">
        <Audio src={uiSwitch} volume={0.3} />
      </Sequence>
    ))}
  </Backdrop>
);
