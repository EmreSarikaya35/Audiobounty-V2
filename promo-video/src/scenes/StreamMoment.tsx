import { Audio } from "@remotion/media";
import { ding, whoosh } from "@remotion/sfx";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Kinetic } from "../lib/Kinetic";
import { pop, settle, track, tw } from "../lib/motion";
import { Backdrop, C, FONT, Meter, OverlayCard } from "../lib/theme";
import { Cam, Obj, World } from "../lib/World";

export const STREAM_FRAMES = 330;
const REDEEM = 80; // the chat message arrives
const DROP = 100; // the card lands on stream

// Video area 1180×664, chat 360 wide, bar 64 high
const VW = 1180;
const VH = 664;
const CARD_X = -(VW + 360) / 2 + VW / 2; // card centre in world x
const CARD_Y = -(VH + 64) / 2 + 92;

const cam = (f: number): Cam => ({
  x: track(f, [[0, 120], [90, 40], [200, CARD_X * 0.6], [290, CARD_X], [330, CARD_X + 2600]]),
  y: track(f, [[0, 60], [90, 20], [200, -60], [290, CARD_Y + 10], [330, CARD_Y]]),
  dolly: track(f, [[0, -1600], [90, -260], [200, -60], [290, 780], [330, 820]]),
  rx: track(f, [[0, 16], [90, 8], [200, 4], [290, 0]]),
  ry: track(f, [[0, 34], [90, 14], [200, -6], [290, 0], [330, -14]]),
});

const CHAT = [
  ["kaan_tv", "that clutch"],
  ["selin", "GG"],
  ["ozzy", "play the horn"],
  ["deniz77", "lmao"],
  ["vortex", "again again"],
  ["ece", "W stream"],
];

const GameScene: React.FC<{ f: number }> = ({ f }) => (
  <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "linear-gradient(180deg, #0f1726 0%, #1b2436 45%, #2a2a3a 70%, #141418 100%)" }}>
    {Array.from({ length: 40 }, (_, i) => (
      <div key={i} style={{ position: "absolute", left: `${(i * 37) % 100}%`, top: `${(i * 23) % 45}%`, width: 2, height: 2, borderRadius: 1, background: "#fff", opacity: 0.25 + ((i * 7) % 5) / 10 }} />
    ))}
    {/* two mountain layers drifting at different speeds: parallax inside the shot */}
    <div style={{ position: "absolute", left: -60 - f * 0.15, right: -60, bottom: 120, height: 300, background: "#232c3d", clipPath: "polygon(0 100%, 8% 40%, 18% 70%, 30% 20%, 42% 65%, 55% 30%, 68% 75%, 80% 35%, 92% 60%, 100% 45%, 100% 100%)" }} />
    <div style={{ position: "absolute", left: -80 - f * 0.4, right: -80, bottom: 0, height: 260, background: "#12161f", clipPath: "polygon(0 100%, 0 50%, 12% 30%, 25% 60%, 38% 25%, 52% 55%, 64% 20%, 78% 50%, 90% 30%, 100% 55%, 100% 100%)" }} />
    <div style={{ position: "absolute", left: "50%", top: "48%", width: 26, height: 26, marginLeft: -13, border: "2px solid rgba(255,255,255,.7)", borderRadius: "50%" }} />
    {/* streamer camera */}
    <div style={{ position: "absolute", left: 28, bottom: 28, width: 220, height: 140, borderRadius: 16, background: "radial-gradient(60% 70% at 50% 40%, #6b5a52, #2b2522 70%)", boxShadow: "0 0 0 2px rgba(255,255,255,.12)" }}>
      <div style={{ position: "absolute", left: "50%", top: 30, width: 56, height: 56, marginLeft: -28, borderRadius: "50%", background: "#c9a48a" }} />
      <div style={{ position: "absolute", left: "50%", bottom: 0, width: 120, height: 50, marginLeft: -60, borderRadius: "60px 60px 0 0", background: "#3b3f52" }} />
    </div>
  </div>
);

export const StreamMoment: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const drop = pop(f, fps, DROP, 11, 130);
  const msg = settle(f, fps, REDEEM, 160);
  return (
    <Backdrop>
      <World cam={cam}>
        {/* far light planes for depth */}
        <Obj z={-1400} x={-900} y={-300} o={0.5}>
          <div style={{ width: 1400, height: 900, background: "radial-gradient(closest-side, rgba(83,252,24,.18), transparent)" }} />
        </Obj>
        <Obj z={-900} x={1100} y={400} o={0.4}>
          <div style={{ width: 1000, height: 700, background: "radial-gradient(closest-side, rgba(10,132,255,.14), transparent)" }} />
        </Obj>
        <Obj>
          <div style={{ display: "flex", flexDirection: "column", borderRadius: 30, overflow: "hidden", boxShadow: "0 80px 160px rgba(0,0,0,.7), 0 0 0 1px rgba(255,255,255,.1), 0 0 120px rgba(83,252,24,.08)" }}>
            <div style={{ display: "flex" }}>
              <div style={{ position: "relative", width: VW, height: VH }}>
                <GameScene f={f} />
                <div style={{ position: "absolute", left: 24, top: 22, padding: "4px 12px", borderRadius: 6, background: "#e5322d", fontFamily: FONT, fontSize: 18, fontWeight: 700, letterSpacing: "0.04em" }}>LIVE</div>
                {/* sound rings ripple out from the card */}
                {[0, 18, 36].map((d) => {
                  const r = tw(f, DROP + 6 + d, DROP + 66 + d, 0, 1);
                  return (
                    <div
                      key={d}
                      style={{
                        position: "absolute",
                        left: VW / 2,
                        top: 92,
                        width: 330,
                        height: 110,
                        borderRadius: 30,
                        border: `2px solid ${C.accent}`,
                        transform: `translate(-50%, -50%) scale(${1 + r * 1.6})`,
                        opacity: r > 0 && r < 1 ? (1 - r) * 0.6 : 0,
                      }}
                    />
                  );
                })}
                <div
                  style={{
                    position: "absolute",
                    left: VW / 2,
                    top: 92,
                    transform: `translate(-50%, -50%) translateY(${(1 - drop) * -90}px) scale(${0.9 + drop * 0.1})`,
                    opacity: Math.min(1, drop * 2),
                  }}
                >
                  <OverlayCard scale={1.5} />
                </div>
              </div>
              {/* Kick-style chat */}
              <div style={{ width: 360, height: VH, background: "#0e0f11", fontFamily: FONT, padding: 22, display: "flex", flexDirection: "column", justifyContent: "flex-end", gap: 14, overflow: "hidden", borderLeft: "1px solid rgba(255,255,255,.06)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, transform: `translateY(${(1 - msg) * 96}px)` }}>
                  {CHAT.map(([u, t]) => (
                    <div key={u} style={{ fontSize: 21, color: "rgba(235,235,245,.85)" }}>
                      <b style={{ color: "#9aa4ff", fontWeight: 600 }}>{u}</b> {t}
                    </div>
                  ))}
                  <div
                    style={{
                      fontSize: 21,
                      padding: "12px 14px",
                      borderRadius: 12,
                      background: "rgba(83,252,24,.1)",
                      boxShadow: `inset 3px 0 0 ${C.accent}`,
                      opacity: msg,
                      transform: `scale(${0.92 + msg * 0.08})`,
                    }}
                  >
                    <b style={{ color: C.accent }}>mert_42</b> redeemed <b>Air horn</b>
                    <div style={{ color: C.muted, fontSize: 18, marginTop: 2 }}>100 points · Hello stream</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ height: 64, display: "flex", alignItems: "center", gap: 18, padding: "0 26px", background: "#16181b", fontFamily: FONT, fontSize: 21, color: C.muted }}>
              <Meter size={22} live={f > DROP} />
              <span style={{ color: "#fff", fontWeight: 500 }}>AudioBounty</span>
              <span>Browser source</span>
              <span style={{ marginLeft: "auto", color: f > DROP ? C.accent : C.muted }}>{f > DROP ? "Now playing · Air horn" : "Listening for redemptions"}</span>
            </div>
          </div>
        </Obj>
      </World>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 110px 130px" }}>
        <Kinetic text="A viewer spends points." start={30} out={150} size={64} align="left" />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 110px 130px" }}>
        <Kinetic text="Your stream plays it." start={160} out={292} size={64} align="left" accent={["plays"]} />
      </AbsoluteFill>
      <Sequence from={0} durationInFrames={70} layout="none">
        <Audio src={whoosh} volume={0.5} />
      </Sequence>
      <Sequence from={DROP} layout="none">
        <Audio src={ding} volume={0.6} />
      </Sequence>
      <Sequence from={300} layout="none">
        <Audio src={whoosh} volume={0.45} />
      </Sequence>
    </Backdrop>
  );
};
