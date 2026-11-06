import { Audio } from "@remotion/media";
import { ding, mouseClick, uiSwitch } from "@remotion/sfx";
import { AbsoluteFill, Sequence, useCurrentFrame, useVideoConfig } from "remotion";
import { Kinetic } from "../lib/Kinetic";
import { pop, settle, track, tw } from "../lib/motion";
import { Backdrop, C, FONT, glass, Icon, MONO, OverlayCard, StatusChip } from "../lib/theme";
import { Cam, Obj, World } from "../lib/World";

export const SETUP_FRAMES = 300;
const COPY = 100;
const SOURCE = 165;
const FLIP = 222;

const URL_TEXT = "https://audio.mrkaffin.com/overlay/";

const cam = (f: number): Cam => ({
  x: track(f, [[0, -520], [90, 330], [150, 0], [300, 0]]),
  y: track(f, [[0, 10], [90, 0], [150, 430], [215, 250], [300, 250]]),
  dolly: track(f, [[0, 620], [90, 460], [150, 120], [215, -260], [300, -170]]),
  rx: track(f, [[0, 4], [90, 0], [150, -16], [215, -5], [300, -3]]),
  ry: track(f, [[0, 24], [90, -10], [150, 0], [300, -3]]),
});

export const Setup: React.FC = () => {
  const f = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typed = Math.floor(tw(f, 8, 70, 0, URL_TEXT.length + 12, (t) => t));
  const copied = f >= COPY;
  const press = 1 - tw(f, COPY - 5, COPY, 0, 0.06) + tw(f, COPY, COPY + 12, 0, 0.06);
  const src = settle(f, fps, SOURCE, 140);
  const flip = tw(f, FLIP, FLIP + 22, 0, 180);
  const on = flip >= 90;
  const burst = tw(f, FLIP + 11, FLIP + 60, 0, 1);
  const chip = pop(f, fps, 120, 14, 120);
  return (
    <Backdrop>
      <World cam={cam}>
        {/* status chip: flips over when OBS connects */}
        <Obj y={-210} z={40} s={chip} o={Math.min(1, chip * 1.5)}>
          <div style={{ transform: `rotateX(${flip}deg)`, transformStyle: "preserve-3d" }}>
            <div style={{ transform: on ? "rotateX(180deg)" : undefined }}>
              <StatusChip on={on} size={40} />
            </div>
          </div>
        </Obj>
        <Obj y={-210} z={20} s={1 + burst * 3} o={burst > 0 && burst < 1 ? (1 - burst) * 0.7 : 0}>
          <div style={{ width: 460, height: 90, borderRadius: 45, border: `3px solid ${C.accent}` }} />
        </Obj>
        {/* the personal OBS link */}
        <Obj>
          <div style={{ ...glass(999), display: "flex", alignItems: "center", gap: 24, padding: "18px 18px 18px 40px", width: 1360 }}>
            <span style={{ color: C.muted }}>
              <Icon name="link" size={34} />
            </span>
            <span style={{ fontFamily: MONO, fontSize: 34, marginRight: "auto", whiteSpace: "pre" }}>
              {URL_TEXT.slice(0, typed)}
              <span style={{ color: C.muted }}>{"•".repeat(Math.max(0, typed - URL_TEXT.length))}</span>
              <span style={{ opacity: Math.floor(f / 18) % 2 && typed < URL_TEXT.length + 12 ? 1 : 0, color: C.accent }}>|</span>
            </span>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontSize: 30,
                fontWeight: 600,
                padding: "20px 38px",
                borderRadius: 999,
                transform: `scale(${press})`,
                background: copied ? C.accent : "rgba(70,70,70,.62)",
                color: copied ? C.accentInk : C.text,
                boxShadow: copied ? `0 0 50px ${C.accent}66` : `inset 0 1px 0 ${C.rim}`,
              }}
            >
              {copied ? <Icon name="check" size={30} width={2.6} /> : null}
              {copied ? "Copied" : "Copy OBS link"}
            </div>
          </div>
        </Obj>
        {/* an OBS window below */}
        <Obj y={560} z={-60} rx={4}>
          <div style={{ width: 1360, height: 470, borderRadius: 22, overflow: "hidden", background: "#1d1f24", boxShadow: "0 60px 140px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.08)", fontFamily: FONT }}>
            <div style={{ height: 50, display: "flex", alignItems: "center", gap: 10, padding: "0 20px", background: "#2a2c33", fontSize: 20, color: C.muted }}>
              {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
                <div key={c} style={{ width: 14, height: 14, borderRadius: 7, background: c }} />
              ))}
              <span style={{ marginLeft: 16 }}>OBS Studio</span>
            </div>
            <div style={{ display: "flex", gap: 20, padding: 20 }}>
              <div style={{ position: "relative", width: 700, height: 380, borderRadius: 10, background: "linear-gradient(160deg, #2b3440, #151a20 55%, #101311)", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: "50%", top: 24, transform: `translateX(-50%) scale(${0.9 + src * 0.1})`, opacity: on ? 1 : 0 }}>
                  <OverlayCard scale={0.95} />
                </div>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ fontSize: 20, color: C.muted, marginBottom: 6 }}>Sources</div>
                <div style={{ transform: `translateY(${(1 - src) * -40}px)`, opacity: src, display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, fontSize: 24, background: "rgba(83,252,24,.12)", boxShadow: `inset 0 0 0 1.5px ${C.accent}` }}>
                  <Icon name="link" size={24} color={C.accent} /> AudioBounty
                  <span style={{ marginLeft: "auto", fontSize: 18, color: C.muted }}>Browser</span>
                </div>
                {["Webcam", "Game capture", "Mic / Aux"].map((s) => (
                  <div key={s} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderRadius: 10, fontSize: 24, background: "rgba(255,255,255,.04)", color: "rgba(235,235,245,.8)", transform: `translateY(${(1 - src) * -60}px)` }}>
                    {s}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Obj>
      </World>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 110px 130px" }}>
        <Kinetic text="Paste one link into OBS." start={20} out={150} size={64} align="left" />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end", padding: "0 0 110px 130px" }}>
        <Kinetic text="That's the whole setup." start={175} out={286} size={64} align="left" accent={["whole"]} />
      </AbsoluteFill>
      <Sequence from={COPY - 3} durationInFrames={30} layout="none">
        <Audio src={mouseClick} />
      </Sequence>
      <Sequence from={COPY + 2} layout="none">
        <Audio src={ding} volume={0.4} />
      </Sequence>
      <Sequence from={FLIP + 8} durationInFrames={40} layout="none">
        <Audio src={uiSwitch} volume={0.5} />
      </Sequence>
    </Backdrop>
  );
};
