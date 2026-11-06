import { useId } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

export type Cam = { x: number; y: number; dolly: number; rx: number; ry: number; rz?: number };

/**
 * A 3D world seen through a camera. `cam(frame)` gives the camera for any frame, so the
 * world can compare it with the previous frame and add directional motion blur on fast moves.
 */
export const World: React.FC<{
  cam: (f: number) => Cam;
  children: React.ReactNode;
  perspective?: number;
  blur?: number;
}> = ({ cam, children, perspective = 1800, blur = 0.22 }) => {
  const frame = useCurrentFrame();
  const id = useId().replace(/:/g, "");
  const c = cam(frame);
  const p = cam(frame - 1);
  const bx = Math.min(28, Math.abs(c.x - p.x) * blur + Math.abs(c.ry - p.ry) * 5);
  const by = Math.min(28, Math.abs(c.y - p.y) * blur + Math.abs(c.rx - p.rx) * 5 + Math.abs(c.dolly - p.dolly) * blur * 0.35);
  const moving = bx > 0.4 || by > 0.4;
  return (
    <AbsoluteFill>
      {moving && (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <AbsoluteFill style={{ perspective, filter: moving ? `url(#${id})` : undefined }}>
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: 0,
            height: 0,
            transformStyle: "preserve-3d",
            transform: `translateZ(${c.dolly}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz ?? 0}deg) translate3d(${-c.x}px, ${-c.y}px, 0)`,
          }}
        >
          {children}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Something placed in the world, centred on (x, y, z). */
export const Obj: React.FC<{
  x?: number;
  y?: number;
  z?: number;
  rx?: number;
  ry?: number;
  rz?: number;
  s?: number;
  o?: number;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s = 1, o = 1, style, children }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: 0,
      transformOrigin: "0 0",
      transformStyle: "preserve-3d",
      transform: `translate3d(${x}px, ${y}px, ${z}px) rotateX(${rx}deg) rotateY(${ry}deg) rotateZ(${rz}deg) scale(${s}) translate(-50%, -50%)`,
      opacity: o,
      ...style,
    }}
  >
    {children}
  </div>
);
