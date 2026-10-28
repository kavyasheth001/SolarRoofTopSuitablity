import React from "react";
import { registerRoot, Composition } from "remotion";
import SolarSightVideo from "./SolarSightVideo";

const COMPOSITION_FPS = 30;
const COMPOSITION_DURATION_IN_SECONDS = 150; // 2:30 minutes

// Root component: declares the composition the CLI renders by id.
const RemotionRoot = () => {
  return (
    <Composition
      id="SolarSightComposition"
      component={SolarSightVideo}
      durationInFrames={COMPOSITION_FPS * COMPOSITION_DURATION_IN_SECONDS}
      fps={COMPOSITION_FPS}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
