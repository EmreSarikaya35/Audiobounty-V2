import { useCurrentFrame, useVideoConfig } from "remotion";
import { FONT } from "./theme";
import { EASE_IN, pop, tw } from "./motion";

/**
 * Kinetic type: each word (or letter) flips up out of the baseline with a spring and
 * sharpens from blur. With `out`, it leaves upward into blur from that frame.
 */
export const Kinetic: React.FC<{
  text: string;
  start: number;
  out?: number;
  size: number;
  weight?: number;
  color?: string;
  by?: "word" | "char";
  stagger?: number;
  align?: "left" | "center";
  accent?: string[]; // words drawn in the accent color
  style?: React.CSSProperties;
}> = ({ text, start, out, size, weight = 600, color = "#fff", by = "word", stagger = 4, align = "center", accent = [], style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const units = by === "word" ? text.split(" ") : [...text];
  return (
    <div
      style={{
        fontFamily: FONT,
        fontSize: size,
        fontWeight: weight,
        letterSpacing: "-0.04em",
        lineHeight: 1.05,
        color,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: align === "center" ? "center" : "flex-start",
        columnGap: by === "word" ? size * 0.26 : 0,
        perspective: 900,
        ...style,
      }}
    >
      {units.map((u, i) => {
        const p = pop(frame, fps, start + i * stagger, 16, 140);
        const leave = out === undefined ? 0 : tw(frame, out + i * (stagger / 2), out + i * (stagger / 2) + 18, 0, 1, EASE_IN);
        const shown = Math.min(1, p) * (1 - leave);
        const isAccent = accent.includes(u.replace(/[.,]/g, ""));
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              color: isAccent ? "#53fc18" : undefined,
              textShadow: isAccent ? "0 0 40px rgba(83,252,24,.45)" : undefined,
              opacity: Math.min(1, p * 1.6) * (1 - leave),
              transform: `translateY(${(1 - p) * 0.55 - leave * 0.4}em) rotateX(${(1 - p) * -85 + leave * 40}deg)`,
              transformOrigin: "50% 100%",
              filter: shown < 0.98 ? `blur(${(1 - shown) * 10}px)` : undefined,
            }}
          >
            {u}
          </span>
        );
      })}
    </div>
  );
};
