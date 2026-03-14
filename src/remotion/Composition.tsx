import { Lottie, LottieAnimationData } from "@remotion/lottie";
import { AbsoluteFill } from "remotion";

export const LottieComposition: React.FC<{ 
  lottieJson: LottieAnimationData;
  width: number;
  height: number;
}> = ({ lottieJson, width, height }) => {
  return (
    <AbsoluteFill style={{ 
      backgroundColor: "transparent", 
      justifyContent: "center", 
      alignItems: "center" 
    }}>
      <div style={{ width, height }}>
        <Lottie 
          animationData={lottieJson} 
          style={{ width: '100%', height: '100%' }}
        />
      </div>
    </AbsoluteFill>
  );
};
