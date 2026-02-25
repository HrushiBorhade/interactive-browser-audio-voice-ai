"use client";

import { memo } from "react";
import { motion } from "motion/react";
import { iosEase } from "@/lib/motion";
import type { Phase } from "@/lib/types";

interface Props {
  phase: Phase;
}

const container = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.1 } },
};

const item = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: iosEase },
  },
};

/* ─── Pipeline data ─── */

type Step =
  | { type: "section"; text: string }
  | { type: "node"; label: string; detail: string; activeIn: Phase[] }
  | { type: "bridge"; label: string; detail: string; activeIn: Phase[] }
  | { type: "connector"; label: string; activeIn: Phase[] }
  | { type: "tools"; activeIn: Phase[] }
  | { type: "echo"; activeIn: Phase[] };

const pipeline: Step[] = [
  { type: "section", text: "You → AI" },
  { type: "node", label: "Microphone", detail: "getUserMedia · 16 kHz · mono · echo cancellation", activeIn: ["listening"] },
  { type: "connector", label: "MediaStream", activeIn: ["listening"] },
  { type: "node", label: "Capture Worklet", detail: "AudioWorkletProcessor · Float32 → Int16", activeIn: ["listening"] },
  { type: "connector", label: "Int16 ArrayBuffer → base64 encode", activeIn: ["listening"] },

  { type: "bridge", label: "WebSocket", detail: "BidiGenerateContent · Blob frames", activeIn: ["listening", "speaking", "thinking"] },
  { type: "connector", label: "realtimeInput ↑ · serverContent ↓", activeIn: ["listening", "speaking", "thinking"] },
  { type: "node", label: "Gemini 2.5 Flash", detail: "Native Audio · setup → setupComplete", activeIn: ["listening", "speaking", "thinking"] },

  { type: "tools", activeIn: ["thinking"] },

  { type: "section", text: "AI → You" },
  { type: "connector", label: "base64 → Int16 · transferable", activeIn: ["speaking"] },
  { type: "node", label: "Playback Worklet", detail: "Int16 → Float32 · ring buffer · 24 kHz", activeIn: ["speaking"] },
  { type: "connector", label: "Float32 → AudioContext.destination", activeIn: ["speaking"] },
  { type: "node", label: "Speaker", detail: "AudioContext · 24 kHz output", activeIn: ["speaking"] },

  { type: "echo", activeIn: ["speaking"] },
];

/* ─── Sub-components ─── */

function FlowNode({ label, detail, active, bridge }: {
  label: string;
  detail: string;
  active: boolean;
  bridge?: boolean;
}) {
  return (
    <div
      data-active={active}
      className={`flow-node ${bridge ? "flow-bridge" : ""}`}
    >
      <span className={`text-[11px] font-medium transition-colors duration-300 ${active ? "text-foreground/90" : "text-foreground/60"}`}>
        {label}
      </span>
      <span className={`text-[8.5px] font-mono leading-tight transition-colors duration-300 ${active ? "text-foreground/50" : "text-foreground/30"}`}>
        {detail}
      </span>
    </div>
  );
}

function FlowConnector({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center gap-3 w-full max-w-[260px]">
      <div className="flex flex-col items-center w-4 shrink-0">
        <div className="flow-line h-5" data-active={active} />
      </div>
      <span className={`text-[8px] font-mono leading-tight transition-colors duration-300 ${active ? "text-foreground/45" : "text-foreground/25"}`}>
        {label}
      </span>
    </div>
  );
}

function ToolsBranch({ active }: { active: boolean }) {
  return (
    <div className="flex items-center gap-2 my-1">
      <div className="flow-line-h w-6 h-px" data-active={active} />
      <div data-active={active} className="flow-node flow-node-sm">
        <span className={`text-[9px] font-medium ${active ? "text-foreground/70" : "text-foreground/45"}`}>Tools</span>
        <span className={`text-[7.5px] font-mono ${active ? "text-foreground/45" : "text-foreground/25"}`}>
          functionDeclarations → toolCall → execute → toolResponse
        </span>
      </div>
    </div>
  );
}

function EchoBadge({ active }: { active: boolean }) {
  return (
    <div
      data-active={active}
      className={`mt-3 text-[7.5px] font-mono border border-dashed rounded-full px-3 py-1.5 transition-all duration-300 ${active ? "text-foreground/40 border-foreground/[0.18]" : "text-foreground/22 border-foreground/[0.10]"}`}
    >
      Echo cancellation · browser AEC + Gemini VAD barge-in
    </div>
  );
}

/* ─── Main component ─── */

export const ArchitectureFlow = memo(function ArchitectureFlow({ phase }: Props) {
  return (
    <div className="flex flex-col items-center px-6 py-10 lg:py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease: iosEase }}
        className="text-center mb-6"
      >
        <h2 className="font-heading text-lg text-foreground/70 tracking-tight">
          How it works
        </h2>
        <p className="text-[9px] font-mono text-foreground/25 mt-1 tracking-wider uppercase">
          Real-time voice pipeline
        </p>
      </motion.div>

      {/* Pipeline */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center"
      >
        {pipeline.map((step, i) => {
          if (step.type === "section") {
            return (
              <motion.div
                key={i}
                variants={item}
                className="text-[8px] font-mono uppercase tracking-[0.2em] text-foreground/30 mt-5 mb-2 first:mt-0"
              >
                {step.text}
              </motion.div>
            );
          }

          if (step.type === "node" || step.type === "bridge") {
            const active = step.activeIn.includes(phase);
            return (
              <motion.div key={i} variants={item}>
                <FlowNode
                  label={step.label}
                  detail={step.detail}
                  active={active}
                  bridge={step.type === "bridge"}
                />
              </motion.div>
            );
          }

          if (step.type === "connector") {
            const active = step.activeIn.includes(phase);
            return (
              <motion.div key={i} variants={item}>
                <FlowConnector label={step.label} active={active} />
              </motion.div>
            );
          }

          if (step.type === "tools") {
            const active = step.activeIn.includes(phase);
            return (
              <motion.div key={i} variants={item}>
                <ToolsBranch active={active} />
              </motion.div>
            );
          }

          if (step.type === "echo") {
            const active = step.activeIn.includes(phase);
            return (
              <motion.div key={i} variants={item}>
                <EchoBadge active={active} />
              </motion.div>
            );
          }

          return null;
        })}
      </motion.div>
    </div>
  );
});
