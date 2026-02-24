"use client";

import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "motion/react";
import { VoiceOrb } from "@/components/voice-orb";
import { useGeminiLive, SYSTEM_INSTRUCTION } from "@/hooks/use-gemini-live";
import { useMounted } from "@/hooks/use-mounted";
import { iosEase } from "@/lib/motion";
import { demoTools } from "@/lib/tools";
import type { Phase } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ArchitectureFlow = dynamic(
  () => import("@/components/architecture-flow").then((m) => ({ default: m.ArchitectureFlow })),
  { ssr: false }
);

const ArticleContent = dynamic(
  () => import("@/components/article-content").then((m) => ({ default: m.ArticleContent })),
  { ssr: false }
);

const VOICES = [
  "Puck",
  "Charon",
  "Kore",
  "Fenrir",
  "Aoede",
  "Leda",
  "Orus",
  "Zephyr",
] as const;

const TOOL_NAMES = demoTools.map((t) => t.name);

const STATUS_TEXT: Record<Phase, string> = {
  idle: "Tap to start",
  connecting: "Connecting",
  listening: "Listening",
  speaking: "Speaking",
  thinking: "Thinking",
};

const CONTROL_BASE =
  "h-9 rounded-full border border-foreground/[0.08] bg-foreground/[0.04] backdrop-blur-md text-foreground/40 transition-colors duration-200 hover:bg-foreground/[0.08] hover:border-foreground/[0.14] hover:text-foreground/70";

export default function Home() {
  const [voice, setVoice] = useState<string>("Puck");
  const mounted = useMounted();
  const { theme, setTheme } = useTheme();
  const { connectionState, personaState, error, connect, disconnect, dismissError } =
    useGeminiLive(voice);

  // Auto-dismiss error after 6 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(dismissError, 6000);
    return () => clearTimeout(timer);
  }, [error, dismissError]);

  const isConnected = connectionState === "connected";
  const isConnecting = connectionState === "connecting";
  const isDisconnected = connectionState === "disconnected";

  const phase: Phase = isConnecting
    ? "connecting"
    : isConnected
      ? personaState
      : "idle";

  const orbAnimate = useMemo(
    () => ({
      opacity: 1,
      scale: isConnected
        ? personaState === "speaking"
          ? 1.04
          : personaState === "thinking"
            ? 0.97
            : 1
        : isConnecting
          ? 0.96
          : 1,
      filter: isConnecting ? "blur(2px)" : "blur(0px)",
    }),
    [isConnected, isConnecting, personaState]
  );

  return (
    <main className="relative bg-background">
      {/* Theme toggle */}
      <button
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className={`${CONTROL_BASE} fixed top-4 right-4 z-50 size-8 flex items-center justify-center cursor-pointer`}
        aria-label="Toggle theme"
      >
        {mounted && (
          <>
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32l1.41 1.41M2 12h2m16 0h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            )}
          </>
        )}
      </button>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.3, ease: iosEase }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-full px-4"
          >
            <div className="rounded-xl border border-foreground/[0.08] bg-background/95 backdrop-blur-xl shadow-lg px-4 py-3 flex items-start gap-3">
              <div className="shrink-0 mt-0.5 size-5 rounded-full border border-foreground/[0.08] bg-foreground/[0.04] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground/40">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-foreground/70">{error.message}</p>
                {error.detail && (
                  <p className="text-[11px] text-foreground/35 mt-0.5 leading-relaxed">{error.detail}</p>
                )}
              </div>
              <button
                onClick={dismissError}
                className="shrink-0 mt-0.5 size-5 rounded-full flex items-center justify-center text-foreground/25 hover:text-foreground/50 transition-colors cursor-pointer"
                aria-label="Dismiss"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Article title ── */}
      <header className="max-w-4xl mx-auto px-6 pt-16 md:pt-24 pb-10 md:pb-14 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: iosEase }}
          className="text-[9px] font-mono text-foreground/25 tracking-[0.25em] uppercase mb-4"
        >
          Interactive Deep Dive
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: iosEase, delay: 0.05 }}
          className="font-heading text-3xl md:text-4xl lg:text-5xl text-foreground/80 tracking-tight leading-tight"
        >
          Browser Audio for Voice AI
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: iosEase, delay: 0.12 }}
          className="text-[14px] md:text-[15px] text-foreground/35 mt-4 max-w-lg mx-auto leading-relaxed"
        >
          From the physics of digital audio to a live voice agent.
          Raw WebSockets, AudioWorklet processors on real-time threads,
          ring buffers, and cross-thread echo suppression. Built from
          first principles, not abstractions.
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: iosEase, delay: 0.2 }}
          className="text-[11px] font-mono text-foreground/20 mt-5 tracking-wider"
        >
          built by{" "}
          <a
            href="https://github.com/HrushiBorhade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/35 hover:text-foreground/60 transition-colors duration-200 underline underline-offset-2 decoration-foreground/10 hover:decoration-foreground/30"
          >
            Hrushi Borhade
          </a>
        </motion.p>
      </header>

      {/* ── Interactive demo ── */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: iosEase, delay: 0.2 }}
        className="max-w-6xl mx-auto px-4 md:px-6 pb-6"
      >
        <div className="rounded-2xl border border-foreground/[0.06] bg-foreground/[0.02] overflow-hidden">
          <div className="grid lg:grid-cols-2 min-h-[520px] max-h-[680px]">
            {/* Left: Voice UI */}
            <div className="flex flex-col items-center justify-center gap-8 py-12">
              {/* Orb */}
              <motion.div
                initial={{ opacity: 0, scale: 0.92 }}
                animate={orbAnimate}
                transition={{ duration: 0.6, ease: iosEase }}
              >
                <VoiceOrb
                  state={isConnected ? personaState : "idle"}
                  className="size-36 md:size-44"
                />
              </motion.div>

              {/* Control bar */}
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: iosEase, delay: 0.3 }}
                className="flex items-center gap-2"
              >
                <motion.button
                  onClick={isConnected ? disconnect : connect}
                  disabled={isConnecting}
                  className={`${CONTROL_BASE} w-9 flex items-center justify-center cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed`}
                  aria-label={isConnected ? "Stop" : "Start"}
                  whileTap={{ scale: 0.92 }}
                  transition={{ duration: 0.15, ease: iosEase }}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    {isConnected ? (
                      <motion.svg
                        key="stop"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.12, ease: iosEase }}
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                      >
                        <rect x="6" y="6" width="12" height="12" rx="2" />
                      </motion.svg>
                    ) : (
                      <motion.svg
                        key="mic"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.12, ease: iosEase }}
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 10a7 7 0 0 0 14 0" />
                        <line x1="12" y1="22" x2="12" y2="17" />
                      </motion.svg>
                    )}
                  </AnimatePresence>
                </motion.button>

                <AnimatePresence initial={false}>
                  {isDisconnected && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, ease: iosEase }}
                    >
                      <Select value={voice} onValueChange={setVoice}>
                        <SelectTrigger
                          className={`${CONTROL_BASE} min-w-[100px] px-4 gap-1.5 font-mono text-[10px] tracking-wider uppercase`}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent position="popper" sideOffset={6}>
                          {VOICES.map((v) => (
                            <SelectItem key={v} value={v}>
                              {v}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Status text */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={phase}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: iosEase }}
                  className="text-[11px] tracking-[0.1em] uppercase text-muted-foreground/40 font-mono h-4"
                >
                  {STATUS_TEXT[phase]}
                </motion.p>
              </AnimatePresence>

              {/* Tools & system prompt */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, ease: iosEase, delay: 0.45 }}
                className="w-full max-w-[280px] space-y-2.5"
              >
                <div className="space-y-1.5">
                  <p className="text-[8px] font-mono text-foreground/20 tracking-[0.2em] uppercase text-center">
                    Tools
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {TOOL_NAMES.map((tool) => (
                      <span
                        key={tool}
                        className="text-[9px] font-mono text-foreground/25 bg-foreground/[0.03] border border-foreground/[0.05] rounded-full px-2.5 py-1 tracking-wider"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] font-mono text-foreground/20 tracking-[0.2em] uppercase text-center">
                    System Prompt
                  </p>
                  <p className="text-[10px] text-foreground/20 text-center leading-relaxed px-2 line-clamp-2">
                    {SYSTEM_INSTRUCTION}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Right: Architecture visualization */}
            <div className="hidden lg:flex items-center justify-center border-l border-foreground/[0.04] overflow-y-auto">
              <ArchitectureFlow phase={phase} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* ── Article content ── */}
      <ArticleContent />
    </main>
  );
}
