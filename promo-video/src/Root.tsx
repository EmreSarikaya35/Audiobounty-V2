import { Composition, Folder } from "remotion";
import { Promo, PROMO_FRAMES } from "./Promo";
import { Dashboard, DASHBOARD_FRAMES } from "./scenes/Dashboard";
import { Features, FEATURES_FRAMES } from "./scenes/Features";
import { Finale, FINALE_FRAMES } from "./scenes/Finale";
import { Hook, HOOK_FRAMES } from "./scenes/Hook";
import { Setup, SETUP_FRAMES } from "./scenes/Setup";
import { StreamMoment, STREAM_FRAMES } from "./scenes/StreamMoment";

const base = { width: 1920, height: 1080, fps: 60 };

export const RemotionRoot: React.FC = () => (
  <>
    <Folder name="Scenes">
      <Composition id="Hook" component={Hook} durationInFrames={HOOK_FRAMES} {...base} />
      <Composition id="StreamMoment" component={StreamMoment} durationInFrames={STREAM_FRAMES} {...base} />
      <Composition id="Dashboard" component={Dashboard} durationInFrames={DASHBOARD_FRAMES} {...base} />
      <Composition id="Features" component={Features} durationInFrames={FEATURES_FRAMES} {...base} />
      <Composition id="Setup" component={Setup} durationInFrames={SETUP_FRAMES} {...base} />
      <Composition id="Finale" component={Finale} durationInFrames={FINALE_FRAMES} {...base} />
    </Folder>
    <Composition id="Promo" component={Promo} durationInFrames={PROMO_FRAMES} {...base} />
  </>
);
