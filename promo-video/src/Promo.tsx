import { linearTiming, TransitionSeries } from "@remotion/transitions";
import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { cine } from "./lib/transitions";
import { EASE_IN_OUT, tw } from "./lib/motion";
import { Vignette } from "./lib/theme";
import { Dashboard, DASHBOARD_FRAMES } from "./scenes/Dashboard";
import { Features, FEATURES_FRAMES } from "./scenes/Features";
import { Finale, FINALE_FRAMES } from "./scenes/Finale";
import { Hook, HOOK_FRAMES } from "./scenes/Hook";
import { Setup, SETUP_FRAMES } from "./scenes/Setup";
import { StreamMoment, STREAM_FRAMES } from "./scenes/StreamMoment";

const T = 36; // every transition, in frames
const timing = linearTiming({ durationInFrames: T, easing: EASE_IN_OUT });
export const PROMO_FRAMES = HOOK_FRAMES + STREAM_FRAMES + DASHBOARD_FRAMES + FEATURES_FRAMES + SETUP_FRAMES + FINALE_FRAMES - 5 * T;

export const Promo: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence name="Hook" durationInFrames={HOOK_FRAMES}>
          <Hook />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={cine("zoom")} timing={timing} />
        <TransitionSeries.Sequence name="Stream moment" durationInFrames={STREAM_FRAMES}>
          <StreamMoment />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={cine("whip")} timing={timing} />
        <TransitionSeries.Sequence name="Dashboard" durationInFrames={DASHBOARD_FRAMES}>
          <Dashboard />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={cine("door")} timing={timing} />
        <TransitionSeries.Sequence name="Features" durationInFrames={FEATURES_FRAMES}>
          <Features />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={cine("whip")} timing={timing} />
        <TransitionSeries.Sequence name="Setup" durationInFrames={SETUP_FRAMES}>
          <Setup />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={cine("zoom")} timing={timing} />
        <TransitionSeries.Sequence name="Finale" durationInFrames={FINALE_FRAMES}>
          <Finale />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {/* soundtrack from scripts/music.mjs, laid out on this timeline at 106 BPM */}
      <Audio src={staticFile("music.m4a")} volume={0.7} />
      <Vignette />
      {/* fade up from black and back down at the very end */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: Math.max(tw(f, 0, 20, 1, 0), tw(f, PROMO_FRAMES - 30, PROMO_FRAMES - 1, 0, 1)) }} />
    </AbsoluteFill>
  );
};
