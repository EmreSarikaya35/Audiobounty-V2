import { AbsoluteFill, useCurrentFrame } from "remotion";

// The site's palette (public/style.css, dark theme)
export const C = {
  bg: "#070708",
  surface: "rgba(30,30,33,.78)",
  surfaceSolid: "#1c1c1e",
  raised: "#2c2c2e",
  edge: "rgba(255,255,255,.09)",
  rim: "rgba(255,255,255,.12)",
  text: "#ffffff",
  muted: "rgba(235,235,245,.6)",
  faint: "rgba(235,235,245,.32)",
  accent: "#53fc18",
  accentInk: "#061002",
  warn: "#ffb547",
  pink: "#ff375f",
  blue: "#0a84ff",
  orange: "#ff9f0a",
  purple: "#bf5af2",
};

export const FONT = 'system-ui, -apple-system, "SF Pro Display", "Segoe UI", sans-serif';
export const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

/** A Liquid Glass pane: translucent fill, hairline edge, a light rim on top and a deep shadow. */
export const glass = (radius = 28): React.CSSProperties => ({
  background: C.surface,
  borderRadius: radius,
  boxShadow: `inset 0 0 0 1px ${C.edge}, inset 0 1.5px 0 ${C.rim}, 0 40px 100px rgba(0,0,0,.55), 0 8px 24px rgba(0,0,0,.35)`,
  fontFamily: FONT,
  color: C.text,
});

/** The dark stage with the site's soft green ambient light, drifting slowly. */
export const Backdrop: React.FC<{ children?: React.ReactNode; glow?: number }> = ({ children, glow = 1 }) => {
  const f = useCurrentFrame();
  const a = 0.32 * glow;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: C.bg,
        fontFamily: FONT,
        color: C.text,
        backgroundImage: [
          `radial-gradient(55% 60% at ${28 + Math.sin(f / 140) * 8}% ${18 + Math.cos(f / 170) * 6}%, rgba(64,150,40,${a}), transparent 70%)`,
          `radial-gradient(45% 50% at ${78 + Math.cos(f / 160) * 6}% ${92 + Math.sin(f / 120) * 4}%, rgba(40,100,30,${a * 0.8}), transparent 70%)`,
        ].join(","),
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

/** Cinematic vignette over everything. */
export const Vignette: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(120% 90% at 50% 50%, transparent 55%, rgba(0,0,0,.65) 100%)" }} />
);

/** The signature three-bar level meter. `live` makes it move like audio. */
export const Meter: React.FC<{ size: number; live?: boolean; color?: string; grow?: number; glow?: boolean }> = ({
  size,
  live = false,
  color = C.accent,
  grow = 1,
  glow = false,
}) => {
  const f = useCurrentFrame();
  const base = [0.45, 1, 0.7];
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: size * 0.14, height: size, filter: glow ? `drop-shadow(0 0 ${size * 0.25}px ${color}88)` : undefined }}>
      {base.map((h, i) => {
        const level = live ? 0.28 + 0.72 * Math.abs(Math.sin(f / 7 + i * 1.9) * Math.cos(f / 11 + i)) : h;
        return <div key={i} style={{ width: size * 0.22, height: Math.max(size * 0.08, size * level * grow), borderRadius: size * 0.07, backgroundColor: color }} />;
      })}
    </div>
  );
};

type IconName = "play" | "sound" | "shuffle" | "trim" | "check" | "link" | "plus" | "settings" | "more" | "chart" | "image";
const PATHS: Record<IconName, string[]> = {
  play: ["M7 5v14l11-7z"],
  sound: ["M11 5 6 9H2v6h4l5 4V5z", "M15.5 8.5a5 5 0 0 1 0 7", "M19 5a10 10 0 0 1 0 14"],
  shuffle: ["M16 3h5v5", "M4 20 21 3", "M21 16v5h-5", "M15 15l6 6", "M4 4l5 5"],
  trim: ["M6 3v12", "M18 9v12", "M6 15a3 3 0 1 0 0 6 3 3 0 0 0 0-6z", "M18 3a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  check: ["M5 12l5 5L20 7"],
  link: ["M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7", "M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"],
  plus: ["M12 5v14", "M5 12h14"],
  settings: ["M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"],
  more: ["M5 12h.01", "M12 12h.01", "M19 12h.01"],
  chart: ["M4 20V10", "M10 20V4", "M16 20v-7", "M22 20H2"],
  image: ["M3 5h18v14H3z", "M3 16l5-5 4 4 3-3 6 6", "M15.5 9.5h.01"],
};
export const Icon: React.FC<{ name: IconName; size: number; color?: string; width?: number }> = ({ name, size, color = "currentColor", width = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={name === "more" ? 3 : width} strokeLinecap="round" strokeLinejoin="round" style={{ flex: "none" }}>
    {PATHS[name].map((d) => (
      <path key={d} d={d} />
    ))}
  </svg>
);

/** The on-stream card, the same look as public/overlay.html. */
export const OverlayCard: React.FC<{ scale?: number; accent?: string; user?: string; reward?: string; message?: string }> = ({
  scale = 1,
  accent = C.accent,
  user = "mert_42",
  reward = "Air horn",
  message = "Hello stream",
}) => (
  <div
    style={{
      fontFamily: FONT,
      fontWeight: 600,
      fontSize: 22 * scale,
      lineHeight: 1.35,
      color: "#fff",
      textAlign: "center",
      whiteSpace: "nowrap",
      background: "rgba(14,16,18,.92)",
      border: `${2 * scale}px solid ${accent}`,
      borderRadius: 16 * scale,
      padding: `${12 * scale}px ${24 * scale}px`,
      boxShadow: `0 ${12 * scale}px ${36 * scale}px rgba(0,0,0,.45), 0 0 ${30 * scale}px ${accent}33`,
    }}
  >
    <span style={{ color: accent }}>{user}</span>{" "}
    <span style={{ display: "inline-flex", verticalAlign: "-0.12em", opacity: 0.75 }}>
      <Icon name="sound" size={20 * scale} width={2} />
    </span>{" "}
    {reward}
    {message && <div style={{ fontWeight: 500, fontSize: 20 * scale, marginTop: 6 * scale }}>{message}</div>}
  </div>
);

/** A reward card from the dashboard grid. */
export const RewardCard: React.FC<{ title: string; cost: string; dot: string; tag?: string; playing?: boolean; w?: number }> = ({ title, cost, dot, tag, playing = false, w = 440 }) => (
  <div
    style={{
      ...glass(26),
      width: w,
      height: 210,
      padding: "26px 28px",
      display: "flex",
      flexDirection: "column",
      boxShadow: `inset 0 0 0 ${playing ? 2 : 1}px ${playing ? C.accent : C.edge}, inset 0 1.5px 0 ${C.rim}, 0 30px 70px rgba(0,0,0,.45)${playing ? `, 0 0 60px ${C.accent}33` : ""}`,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 30, fontWeight: 500 }}>
      <div style={{ width: 14, height: 14, borderRadius: 7, background: dot, boxShadow: `0 0 12px ${dot}` }} />
      {title}
    </div>
    <div style={{ fontSize: 24, color: C.muted, marginTop: 6 }}>{cost}</div>
    {tag && (
      <div style={{ alignSelf: "flex-start", marginTop: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 19, color: C.muted, background: "rgba(118,118,128,.2)", padding: "4px 12px", borderRadius: 8 }}>
        <Icon name="shuffle" size={18} />
        {tag}
      </div>
    )}
    <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 22,
          fontWeight: 500,
          padding: "10px 22px",
          borderRadius: 999,
          background: playing ? C.accent : "rgba(70,70,70,.62)",
          color: playing ? C.accentInk : C.text,
          boxShadow: playing ? `0 0 30px ${C.accent}66` : `inset 0 1px 0 ${C.rim}`,
        }}
      >
        {playing ? <Meter size={20} live color={C.accentInk} /> : <Icon name="play" size={22} />}
        {playing ? "Playing" : "Test"}
      </div>
      <span style={{ color: C.muted }}>
        <Icon name="more" size={28} />
      </span>
    </div>
  </div>
);

/** "OBS connected" chip. */
export const StatusChip: React.FC<{ on: boolean; size?: number }> = ({ on, size = 24 }) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: size * 0.45,
      fontFamily: FONT,
      fontSize: size,
      fontWeight: 600,
      padding: `${size * 0.3}px ${size * 0.75}px`,
      borderRadius: 999,
      whiteSpace: "nowrap",
      color: on ? C.accent : C.warn,
      background: on ? "rgba(83,252,24,.13)" : "rgba(255,181,71,.12)",
      boxShadow: on ? `0 0 ${size * 1.5}px rgba(83,252,24,.25)` : undefined,
    }}
  >
    {on ? <Meter size={size * 0.7} live /> : <div style={{ width: size * 0.4, height: size * 0.4, borderRadius: "50%", background: C.warn }} />}
    {on ? "OBS connected" : "OBS not connected"}
  </div>
);
