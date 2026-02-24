"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

export type VoiceOrbState = "idle" | "listening" | "speaking" | "thinking";

interface VoiceOrbProps {
  state: VoiceOrbState;
  className?: string;
}

export const VoiceOrb = memo(function VoiceOrb({
  state,
  className,
}: VoiceOrbProps) {
  return (
    <div className={cn("orb", className)} data-state={state}>
      {/* Dashed ring — geometric frame */}
      <div className="orb-ring" />

      {/* Atmospheric glow — large, diffuse, colored */}
      <div className="orb-glow" />

      {/* Main body — clips inner color layers to organic shape */}
      <div className="orb-body">
        {/* Deep color layer — dark neutral, slow drift */}
        <div className="orb-color orb-color-1" />
        {/* Mid color layer — neutral gray, counter-drift */}
        <div className="orb-color orb-color-2" />
        {/* Bright color layer — light neutral, centered */}
        <div className="orb-color orb-color-3" />
        {/* Luminous core */}
        <div className="orb-core" />
        {/* Specular highlight — top-left 3D lighting */}
        <div className="orb-highlight" />
      </div>

      {/* Speaking: expanding pulse rings */}
      <div className="orb-pulse" />
      <div className="orb-pulse orb-pulse-delayed" />

      {/* Thinking: rotating conic shimmer */}
      <div className="orb-shimmer" />
    </div>
  );
});
