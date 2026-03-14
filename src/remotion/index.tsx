import { registerRoot, Composition } from "remotion";
import { LottieComposition } from "./Composition";

// This is the entry point for the Remotion bundler
export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="LottieComposition"
        component={LottieComposition}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          lottieJson: {} as any,
          width: 1920,
          height: 1080
        }}
      />
    </>
  );
};

registerRoot(RemotionRoot);
