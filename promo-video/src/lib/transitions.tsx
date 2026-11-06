import { useId } from "react";
import { AbsoluteFill } from "remotion";
import type { TransitionPresentation, TransitionPresentationComponentProps } from "@remotion/transitions";

type Kind = { kind: "zoom" | "whip" | "door" };

/** Directional blur via SVG, the CSS blur() filter can only blur evenly. */
const Blur: React.FC<{ x: number; y: number; children: React.ReactNode }> = ({ x, y, children }) => {
  const id = useId().replace(/:/g, "");
  const on = x > 0.3 || y > 0.3;
  return (
    <AbsoluteFill>
      {on && (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={`${x.toFixed(2)} ${y.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <AbsoluteFill style={{ filter: on ? `url(#${id})` : undefined }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
};

const Presentation: React.FC<TransitionPresentationComponentProps<Kind>> = ({ presentationProgress: p, presentationDirection: dir, passedProps, children }) => {
  const out = dir === "exiting";
  const k = passedProps.kind;
  if (k === "zoom") {
    // fly through the old shot into the new one
    const s = out ? 1 + p * p * 3 : 0.7 + 0.3 * p;
    const b = out ? p * 22 : (1 - p) * 22;
    return (
      <AbsoluteFill style={{ opacity: out ? 1 - p * p : p, scale: String(s) }}>
        <Blur x={b} y={b}>{children}</Blur>
      </AbsoluteFill>
    );
  }
  if (k === "whip") {
    // a fast pan: both shots slide and smear sideways
    const t = out ? -p : 1 - p;
    const smear = Math.sin(Math.PI * p) * 46;
    return (
      <AbsoluteFill style={{ translate: `${t * 100}% 0` }}>
        <Blur x={smear} y={0}>{children}</Blur>
      </AbsoluteFill>
    );
  }
  // door: the old shot swings away in 3D, the new one swings in
  return (
    <AbsoluteFill style={{ perspective: 1600 }}>
      <AbsoluteFill
        style={{
          transformOrigin: out ? "0% 50%" : "100% 50%",
          transform: out ? `rotateY(${p * 75}deg)` : `rotateY(${(p - 1) * 75}deg)`,
          opacity: out ? 1 - p : Math.min(1, p * 1.6),
        }}
      >
        <Blur x={(out ? p : 1 - p) * 16} y={0}>{children}</Blur>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const cine = (kind: Kind["kind"]): TransitionPresentation<Kind> => ({ component: Presentation, props: { kind } });
