"use client";

import { memo } from "react";
import { motion } from "motion/react";
import { fadeIn } from "@/lib/motion";

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[12px] font-mono bg-foreground/[0.06] border border-foreground/[0.06] rounded px-1.5 py-0.5">
      {children}
    </code>
  );
}

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] overflow-hidden">
      {title && (
        <div className="px-4 py-2 border-b border-foreground/[0.06] text-[10px] font-mono text-foreground/30 tracking-wider uppercase">
          {title}
        </div>
      )}
      <pre className="px-4 py-3 overflow-x-auto text-[12px] leading-relaxed font-mono text-foreground/70">
        {children}
      </pre>
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-heading text-xl md:text-2xl text-foreground/80 tracking-tight">
      {children}
    </h3>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[9px] font-mono text-foreground/25 tracking-[0.2em] uppercase">
      {children}
    </p>
  );
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[14px] md:text-[15px] leading-relaxed text-foreground/55">
      {children}
    </p>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-foreground/10 pl-4 py-1">
      <p className="text-[13px] leading-relaxed text-foreground/40 italic">
        {children}
      </p>
    </div>
  );
}

function ComparisonTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto pt-2">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="border-b border-foreground/[0.06]">
            {headers.map((h) => (
              <th key={h} className="text-left font-mono text-foreground/30 pb-2 pr-4 last:pr-0">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-foreground/45">
          {rows.map((row) => (
            <tr key={row[0]} className="border-b border-foreground/[0.03]">
              {row.map((cell, j) => (
                <td
                  key={j}
                  className={`py-2 ${j === 0 ? "pr-4 font-mono text-foreground/50" : j < row.length - 1 ? "pr-4" : ""} ${j === row.length - 1 ? "text-foreground/55" : j > 0 ? "text-foreground/35" : ""}`}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatCard({ label, value, description }: { label: string; value: string; description: string }) {
  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-4 space-y-1">
      <p className="text-[10px] font-mono text-foreground/30 uppercase tracking-wider">
        {label}
      </p>
      <p className="text-[20px] font-heading text-foreground/60">{value}</p>
      <p className="text-[11px] text-foreground/30">{description}</p>
    </div>
  );
}

export const ArticleContent = memo(function ArticleContent() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-16 md:py-24 space-y-20">
      {/* ═══════════════════════════════════════════
          PART 1: DIGITAL AUDIO FUNDAMENTALS
          ═══════════════════════════════════════════ */}

      {/* ── What is digital audio? ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>First Principles</SectionLabel>
        <SectionHeading>What is digital audio?</SectionHeading>
        <Paragraph>
          Sound is a continuous pressure wave. To process it digitally, we{" "}
          <strong className="text-foreground/70">sample</strong> the wave at
          regular intervals and{" "}
          <strong className="text-foreground/70">quantize</strong> each sample
          to a number. The result is PCM (Pulse Code Modulation), a flat array
          of numbers representing amplitude over time.
        </Paragraph>
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-mono text-foreground/40">
              Analog wave{" "}
              <span className="text-foreground/20 mx-1.5">&rarr;</span>
              <span className="text-foreground/60">
                Sample at fixed intervals
              </span>{" "}
              <span className="text-foreground/20 mx-1.5">&rarr;</span>
              Quantize to bit depth{" "}
              <span className="text-foreground/20 mx-1.5">&rarr;</span>
              <span className="text-foreground/60">PCM data</span>
            </span>
          </div>
        </div>
        <Paragraph>
          Three parameters define a PCM stream:{" "}
          <strong className="text-foreground/70">sample rate</strong> (how many
          measurements per second),{" "}
          <strong className="text-foreground/70">bit depth</strong> (precision
          of each measurement), and{" "}
          <strong className="text-foreground/70">channel count</strong> (mono
          or stereo). Voice AI is always mono, single-channel. Human speech is a
          mono source and stereo adds no value for recognition or synthesis.
        </Paragraph>
      </motion.section>

      {/* ── Sample Rate ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Sample Rate</SectionLabel>
        <SectionHeading>How many times per second</SectionHeading>
        <Paragraph>
          The Nyquist-Shannon sampling theorem says you can faithfully represent
          any frequency up to half the sample rate. The essential frequencies for
          speech intelligibility sit below 4 kHz (though sibilants and fricatives
          extend to ~8 kHz). Higher sample rates capture more of this detail.
        </Paragraph>
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-foreground/[0.06]">
                <th className="text-left font-mono text-foreground/30 pb-2 pr-4">
                  Rate
                </th>
                <th className="text-left font-mono text-foreground/30 pb-2 pr-4">
                  Use Case
                </th>
                <th className="text-left font-mono text-foreground/30 pb-2">
                  We Use
                </th>
              </tr>
            </thead>
            <tbody className="text-foreground/45">
              <tr className="border-b border-foreground/[0.03]">
                <td className="py-2 pr-4 font-mono text-foreground/50">
                  8 kHz
                </td>
                <td className="py-2 pr-4">Telephony (G.711), Twilio</td>
                <td className="py-2" />
              </tr>
              <tr className="border-b border-foreground/[0.03]">
                <td className="py-2 pr-4 font-mono text-foreground/50">
                  16 kHz
                </td>
                <td className="py-2 pr-4">
                  Speech recognition (Whisper, Deepgram)
                </td>
                <td className="py-2 font-mono text-foreground/50">
                  Capture
                </td>
              </tr>
              <tr className="border-b border-foreground/[0.03]">
                <td className="py-2 pr-4 font-mono text-foreground/50">
                  24 kHz
                </td>
                <td className="py-2 pr-4">
                  TTS output (Cartesia, ElevenLabs, Gemini)
                </td>
                <td className="py-2 font-mono text-foreground/50">
                  Playback
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-foreground/50">
                  48 kHz
                </td>
                <td className="py-2 pr-4">
                  Browser default, WebRTC, professional audio
                </td>
                <td className="py-2" />
              </tr>
            </tbody>
          </table>
        </div>
        <Callout>
          We use two different sample rates because Gemini expects 16 kHz input
          but produces 24 kHz output. The mic hardware typically runs at 48 kHz.
          Resampling happens automatically when you set the AudioContext sample
          rate.
        </Callout>
      </motion.section>

      {/* ── Bit Depth & PCM ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Bit Depth</SectionLabel>
        <SectionHeading>Float32 inside, Int16 on the wire</SectionHeading>
        <Paragraph>
          The Web Audio API processes everything internally as{" "}
          <Code>Float32Array</Code> with samples in the range -1.0 to 1.0. But
          voice AI APIs expect <Code>Int16</Code> PCM (signed 16-bit integers,
          -32768 to 32767). The conversion happens in the AudioWorklet before
          sending over the wire.
        </Paragraph>
        <div className="grid grid-cols-3 gap-3 pt-2">
          <StatCard label="8-bit" value="256" description="levels. Telephony only" />
          <StatCard label="16-bit" value="65,536" description="levels. Voice AI standard" />
          <StatCard label="32-bit float" value="24-bit" description="effective precision. Web Audio" />
        </div>
        <Paragraph>
          Bandwidth math: 16 kHz &times; 16-bit &times; 1 channel = 256 kbps =
          32 KB/sec. A 10-second utterance is ~320 KB of raw PCM. Gemini&apos;s
          protocol wraps audio in JSON, so we base64-encode each chunk (adding
          ~33% overhead). Binary WebSocket frames would be more efficient, but
          the API requires JSON.
        </Paragraph>
      </motion.section>

      {/* ═══════════════════════════════════════════
          PART 2: BROWSER AUDIO ARCHITECTURE
          ═══════════════════════════════════════════ */}

      {/* ── Thread Model ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Browser Internals</SectionLabel>
        <SectionHeading>The thread model</SectionHeading>
        <Paragraph>
          The browser runs audio processing on a{" "}
          <strong className="text-foreground/70">
            dedicated rendering thread
          </strong>{" "}
          with real-time priority, completely separate from the main thread where
          React renders and WebSocket messages arrive. This is the most important
          architectural fact for voice AI in the browser.
        </Paragraph>
        <div className="space-y-3 pt-2">
          <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-4 space-y-2">
            <p className="text-[10px] font-mono text-foreground/30 uppercase tracking-wider">
              Main Thread
            </p>
            <div className="flex flex-wrap gap-2">
              {["DOM", "React", "Events", "WebSocket", "App logic"].map(
                (item) => (
                  <span
                    key={item}
                    className="text-[11px] font-mono text-foreground/40 bg-foreground/[0.04] border border-foreground/[0.06] rounded px-2 py-0.5"
                  >
                    {item}
                  </span>
                )
              )}
            </div>
            <p className="text-[11px] text-foreground/25">
              Can be blocked by computation &rarr; audio glitches
            </p>
          </div>
          <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-4 space-y-2">
            <p className="text-[10px] font-mono text-foreground/30 uppercase tracking-wider">
              Audio Rendering Thread (Real-time priority)
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                "AudioWorkletProcessor.process()",
                "128-sample render quantum",
                "~8ms budget at 16 kHz",
              ].map((item) => (
                <span
                  key={item}
                  className="text-[11px] font-mono text-foreground/40 bg-foreground/[0.04] border border-foreground/[0.06] rounded px-2 py-0.5"
                >
                  {item}
                </span>
              ))}
            </div>
            <p className="text-[11px] text-foreground/25">
              No DOM, no fetch, no async. Minimize allocations to avoid GC
              pauses.
            </p>
          </div>
        </div>
        <Paragraph>
          Communication between threads happens via{" "}
          <Code>port.postMessage()</Code> on the AudioWorkletNode. For
          high-performance scenarios you can use <Code>SharedArrayBuffer</Code>{" "}
          + <Code>Atomics</Code> for zero-copy shared memory. We use{" "}
          <Code>postMessage</Code> with transferable <Code>ArrayBuffer</Code>s
          where ownership transfers to the receiver, so no data is copied.
        </Paragraph>
      </motion.section>

      {/* ── Why AudioWorklet ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Why AudioWorklet</SectionLabel>
        <SectionHeading>
          The ScriptProcessorNode is dead
        </SectionHeading>
        <Paragraph>
          Before AudioWorklet existed, the Web Audio API used{" "}
          <Code>ScriptProcessorNode</Code> for JavaScript-based audio
          processing. It ran on the main thread, so every audio callback blocked
          React rendering, fetch completions, and event handlers. It&apos;s
          deprecated for good reason.
        </Paragraph>
        <ComparisonTable
          headers={["", "ScriptProcessorNode", "AudioWorklet"]}
          rows={[
            ["Thread", "Main thread", "Dedicated audio thread"],
            ["Latency", "High (blocked by JS)", "Low (real-time priority)"],
            ["Buffer size", "Fixed (256-16384)", "128 samples (render quantum)"],
            ["Status", "Deprecated", "Current standard"],
            ["GC", "Shares heap with main thread", "Separate heap (still minimize allocs)"],
          ]}
        />
      </motion.section>

      {/* ── The Render Quantum ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Audio Processing</SectionLabel>
        <SectionHeading>The 128-sample render quantum</SectionHeading>
        <Paragraph>
          AudioWorklet processes audio in fixed-size chunks called render quanta
          of 128 samples. Your <Code>process()</Code> method receives exactly
          128 samples each invocation, regardless of sample rate. The time
          between calls depends on the rate.
        </Paragraph>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <StatCard label="16 kHz context" value="8 ms" description="per process() call. 128 / 16,000" />
          <StatCard label="48 kHz context" value="2.67 ms" description="per process() call. 128 / 48,000" />
        </div>
        <Paragraph>
          Anything that introduces non-deterministic latency inside{" "}
          <Code>process()</Code> will cause audible glitches: object allocation
          (triggers GC), promises (non-deterministic scheduling), fetch (blocking
          I/O), DOM access (cross-thread violation), even{" "}
          <Code>console.log</Code> in hot paths (allocates strings).
        </Paragraph>
      </motion.section>

      {/* ── AudioContext as a graph ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>The Processing Graph</SectionLabel>
        <SectionHeading>AudioContext is a directed graph</SectionHeading>
        <Paragraph>
          An <Code>AudioContext</Code> is not just a config object. It
          represents a directed graph of <Code>AudioNode</Code>s. You create
          source nodes (mic input, oscillators), processing nodes (gain,
          analyser, worklet), and connect them to a destination (speakers). Audio
          flows through the graph on the rendering thread automatically.
        </Paragraph>
        <CodeBlock title="Node graph for this demo">
          {`// Capture graph (16 kHz context)
micSource.connect(captureWorkletNode);
// captureWorkletNode → postMessage → main thread → WebSocket

// Playback graph (24 kHz context)
playbackWorkletNode.connect(playbackCtx.destination);
// WebSocket → main thread → postMessage → playbackWorkletNode → speakers`}
        </CodeBlock>
        <Paragraph>
          Each <Code>AudioContext</Code> has exactly one sample rate, set at
          construction time. Since Gemini expects 16 kHz input and produces
          24 kHz output, we need two separate contexts. One context cannot
          resample between its nodes.
        </Paragraph>
      </motion.section>

      {/* ═══════════════════════════════════════════
          PART 3: MIC CAPTURE
          ═══════════════════════════════════════════ */}

      {/* ── getUserMedia ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Mic Capture</SectionLabel>
        <SectionHeading>getUserMedia to AudioWorklet</SectionHeading>
        <Paragraph>
          The capture pipeline starts with <Code>getUserMedia()</Code>, the
          browser API that requests microphone access. It returns a{" "}
          <Code>MediaStream</Code>, which we feed into our 16 kHz{" "}
          <Code>AudioContext</Code> as a source node.
        </Paragraph>
        <CodeBlock title="Mic capture setup">
          {`// 1. Request mic (constraints are hints, not guarantees)
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    channelCount: 1,        // Mono
    sampleRate: 16000,      // Hint, browser may ignore
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
});

// 2. AudioContext sample rate is the reliable control
const ctx = new AudioContext({ sampleRate: 16000 });

// 3. Route mic through the graph
const source = ctx.createMediaStreamSource(stream);
source.connect(captureWorkletNode);`}
        </CodeBlock>
        <Paragraph>
          The <Code>sampleRate</Code> in getUserMedia constraints is a hint.
          Most browsers capture at the hardware rate (usually 48 kHz) regardless.
          The reliable way to control sample rate is through the{" "}
          <Code>AudioContext</Code> constructor. When you route the mic stream
          through a 16 kHz context, the browser resamples internally from the
          device&apos;s native rate.
        </Paragraph>
      </motion.section>

      {/* ═══════════════════════════════════════════
          PART 4: OUR IMPLEMENTATION
          ═══════════════════════════════════════════ */}

      {/* ── Three Threads ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>This Demo</SectionLabel>
        <SectionHeading>Three threads, two sample rates</SectionHeading>
        <Paragraph>
          With the fundamentals in place, here&apos;s how this demo is wired.
          Two separate <Code>AudioContext</Code>s: one at 16 kHz for capture and
          one at 24 kHz for playback, each with its own AudioWorklet processor
          on its own rendering thread. The main thread orchestrates WebSocket
          messages and React state.
        </Paragraph>
        <div className="grid grid-cols-2 gap-3 pt-2">
          <StatCard label="Capture" value="16 kHz" description="Mic → Float32 → Int16 → base64 → Gemini" />
          <StatCard label="Playback" value="24 kHz" description="Gemini → base64 → Int16 → Float32 → Speaker" />
        </div>
      </motion.section>

      {/* ── Capture Pipeline ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>You &rarr; AI</SectionLabel>
        <SectionHeading>Capture pipeline</SectionHeading>
        <Paragraph>
          The capture worklet accumulates 128-sample render quanta into
          2048-sample frames (~128ms of audio). Each frame is converted from
          Float32 to Int16 PCM on the audio thread, then transferred to the main
          thread via <Code>postMessage</Code> with a transferable ArrayBuffer
          (zero-copy).
        </Paragraph>
        <Paragraph>
          On the main thread, the Int16 buffer is base64-encoded and wrapped in
          JSON for Gemini&apos;s <Code>realtimeInput.mediaChunks</Code>{" "}
          protocol. The asymmetric Int16 scaling ({"-1 → -32768, +1 → +32767"})
          is correct because the Int16 range is [-32768, 32767].
        </Paragraph>
        <CodeBlock title="Float32 → Int16 conversion">
          {`const s = Math.max(-1, Math.min(1, sample));
pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;`}
        </CodeBlock>
      </motion.section>

      {/* ── Playback + Ring Buffer ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>AI &rarr; You</SectionLabel>
        <SectionHeading>Ring buffer playback</SectionHeading>
        <Paragraph>
          Instead of creating AudioBufferSource nodes per chunk (which requires
          main thread allocation and makes interruption expensive), the playback
          worklet uses a pre-allocated ring buffer: 240,000 Float32 slots = 10
          seconds of audio at 24 kHz.
        </Paragraph>
        <Paragraph>
          Write and read indices are monotonically increasing. They never wrap
          to zero. Physical position is <Code>index % length</Code>. This
          eliminates wrap-around edge cases. Interrupt is just resetting two
          integers.
        </Paragraph>
        <CodeBlock title="Ring buffer, monotonic indices">
          {`// Write: Gemini audio → buffer
ringBuffer[writeIndex % length] = pcm16[i] / 32768;
writeIndex++;

// Read: buffer → speaker (every ~5.3ms)
output[i] = ringBuffer[readIndex % length];
readIndex++;

// Interrupt: instant silence
writeIndex = 0;
readIndex = 0;`}
        </CodeBlock>
        <Callout>
          At 24 kHz, the indices would take ~11,900 years of continuous playback
          to reach Number.MAX_SAFE_INTEGER. Not a concern.
        </Callout>
      </motion.section>

      {/* ── Echo Suppression ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Audio Safety</SectionLabel>
        <SectionHeading>Software echo suppression</SectionHeading>
        <Paragraph>
          Without echo suppression, the microphone picks up the AI&apos;s voice
          from the speakers. Gemini hears itself, responds to its own output,
          and enters a feedback loop. Browser AEC{" "}
          (<Code>echoCancellation: true</Code>) helps but fails with external
          speakers, Bluetooth devices, or high-latency audio paths.
        </Paragraph>
        <Paragraph>
          The fix crosses all three threads: the playback worklet detects audio
          output (playbackStart) &rarr; signals the main thread &rarr; main
          thread sends a mute command to the capture worklet. When the ring
          buffer drains (playbackStop), the process reverses and the mic
          reopens.
        </Paragraph>
        <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-foreground/20" />
            <span className="text-[12px] font-mono text-foreground/40">
              Playback worklet &rarr;{" "}
              <span className="text-foreground/60">playbackStart</span> &rarr;
              Main thread
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-foreground/20" />
            <span className="text-[12px] font-mono text-foreground/40">
              Main thread &rarr;{" "}
              <span className="text-foreground/60">mute: true</span> &rarr;
              Capture worklet
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="size-2 rounded-full bg-foreground/10" />
            <span className="text-[12px] font-mono text-foreground/30">
              capture process() &rarr; returns immediately, no audio sent
            </span>
          </div>
        </div>
      </motion.section>

      {/* ═══════════════════════════════════════════
          PART 5: TRANSPORT & PROTOCOL
          ═══════════════════════════════════════════ */}

      {/* ── WebSocket vs WebRTC ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Transport</SectionLabel>
        <SectionHeading>WebSocket vs WebRTC for voice AI</SectionHeading>
        <Paragraph>
          Two transport options exist for browser-to-AI audio. WebSocket runs
          over TCP (reliable, ordered, simple). WebRTC runs over UDP
          (lower-latency, built-in codecs, but complex setup with ICE/SDP
          negotiation). We use WebSocket because Gemini Live&apos;s
          BidiGenerateContent API requires it.
        </Paragraph>
        <ComparisonTable
          headers={["Aspect", "WebSocket", "WebRTC"]}
          rows={[
            ["Protocol", "TCP (reliable, ordered)", "UDP (lower latency)"],
            ["NAT traversal", "Easy (HTTP upgrade)", "Needs STUN/TURN"],
            ["Audio codec", "You choose (raw PCM, Opus)", "Built-in Opus"],
            ["Echo cancel", "Application-level", "Built-in via browser"],
            ["Jitter buffer", "You implement", "Built-in"],
            ["Best for", "Server-side agents, Gemini", "Client-side, OpenAI Realtime"],
          ]}
        />
      </motion.section>

      {/* ── Blob Frames ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Protocol Detail</SectionLabel>
        <SectionHeading>The Blob frame gotcha</SectionHeading>
        <Paragraph>
          Gemini&apos;s BidiGenerateContent WebSocket sends all server messages
          as Blob objects, not text strings. Most WebSocket tutorials assume{" "}
          <Code>event.data</Code> is a string. With Gemini, it&apos;s a Blob
          even though the payload is JSON text.
        </Paragraph>
        <Paragraph>
          Without the <Code>instanceof Blob</Code> check, JSON.parse receives a
          Blob object and throws. The handler must be async because{" "}
          <Code>Blob.text()</Code> returns a Promise.
        </Paragraph>
        <CodeBlock title="Blob → text → JSON">
          {`ws.onmessage = async (event) => {
  const raw = event.data instanceof Blob
    ? await event.data.text()
    : event.data;

  const msg = JSON.parse(raw);
};`}
        </CodeBlock>
      </motion.section>

      {/* ═══════════════════════════════════════════
          PART 6: PERFORMANCE & ARCHITECTURE
          ═══════════════════════════════════════════ */}

      {/* ── S2S vs Chained ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Production</SectionLabel>
        <SectionHeading>Two architectures for voice AI</SectionHeading>
        <Paragraph>
          Every production voice agent uses one of two patterns:{" "}
          <strong className="text-foreground/70">
            Speech-to-Speech (S2S)
          </strong>{" "}
          where one multimodal model handles audio in/out directly, or{" "}
          <strong className="text-foreground/70">Chained Pipeline</strong> where
          separate STT, LLM, and TTS services are wired together. This demo
          uses S2S via Gemini Live.
        </Paragraph>
        <ComparisonTable
          headers={["", "S2S", "Chained"]}
          rows={[
            ["Latency", "Lower (one model)", "Higher (3+ hops)"],
            ["Naturalness", "Hears tone & pacing", "Text-only between stages"],
            ["Control", "Opaque", "Swap any component"],
            ["Debugging", "Hard (audio in/out)", "Easy (text at each stage)"],
            ["Cost", "Single API call", "STT + LLM + TTS"],
          ]}
        />
      </motion.section>

      {/* ── Latency Budget ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Performance</SectionLabel>
        <SectionHeading>The latency budget</SectionHeading>
        <Paragraph>
          Natural human turn-taking gaps average ~200ms. Voice AI systems
          targeting under 800ms total response time feel conversational.
          Anything beyond that feels laggy. Here&apos;s where the milliseconds
          go in a chained pipeline:
        </Paragraph>
        <div className="space-y-2 pt-2">
          {[
            { stage: "VAD detects end-of-speech", range: "200-400ms", note: "Silence threshold" },
            { stage: "Audio reaches server", range: "20-50ms", note: "Network RTT" },
            { stage: "Model processes + first audio", range: "100-500ms", note: "Model TTFT" },
            { stage: "Audio reaches browser", range: "20-50ms", note: "Network RTT" },
            { stage: "Buffer fill + playback start", range: "10-20ms", note: "Minimal buffer" },
          ].map((item) => (
            <div
              key={item.stage}
              className="flex items-center gap-3 rounded-lg border border-foreground/[0.04] bg-foreground/[0.02] px-4 py-2.5"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[12px] text-foreground/50 truncate">
                  {item.stage}
                </p>
              </div>
              <p className="text-[12px] font-mono text-foreground/60 shrink-0">
                {item.range}
              </p>
              <p className="text-[10px] text-foreground/25 shrink-0 hidden sm:block">
                {item.note}
              </p>
            </div>
          ))}
          <div className="flex items-center gap-3 rounded-lg border border-foreground/[0.08] bg-foreground/[0.04] px-4 py-2.5">
            <p className="flex-1 text-[12px] font-medium text-foreground/60">
              Total
            </p>
            <p className="text-[12px] font-mono text-foreground/70">
              350-1,020ms
            </p>
          </div>
        </div>
        <Paragraph>
          With Gemini Live&apos;s speech-to-speech model, the middle three
          stages collapse into one. The model thinks in audio and responds in
          audio with no STT/LLM/TTS serialization. This is why S2S
          architectures consistently beat chained pipelines on latency.
        </Paragraph>
        <Callout>
          VAD (Voice Activity Detection) is how the system knows you stopped
          speaking. It monitors audio energy or uses a neural model like Silero
          VAD. The silence threshold is the biggest single contributor to
          perceived latency.
        </Callout>
      </motion.section>

      {/* ═══════════════════════════════════════════
          PART 7: ENGINEERING DECISIONS
          ═══════════════════════════════════════════ */}

      {/* ── Key Decisions ── */}
      <motion.section className="space-y-4" {...fadeIn}>
        <SectionLabel>Engineering</SectionLabel>
        <SectionHeading>Key decisions</SectionHeading>
        <div className="space-y-4 pt-2">
          {[
            {
              decision: "Transferable ArrayBuffers",
              why: "Zero-copy between audio thread and main thread. Original buffer becomes detached after transfer.",
            },
            {
              decision: "Two AudioContexts, not one",
              why: "Capture needs 16 kHz (what Gemini expects) and playback needs 24 kHz (what Gemini produces). One context can only have one sample rate.",
            },
            {
              decision: "Ring buffer over AudioBufferSource queue",
              why: "Pre-allocated memory avoids GC on the audio thread. Instant interrupt by resetting two indices instead of disconnecting nodes.",
            },
            {
              decision: "No reconnection logic",
              why: "Keeps code simple for learning. Production would add exponential backoff and session recovery.",
            },
            {
              decision: "API key via server endpoint",
              why: "Key stays server-side. Production should use Gemini's AuthTokenService for ephemeral tokens.",
            },
            {
              decision: "Pre-allocated worklet buffers",
              why: "Avoids garbage collection on the real-time audio thread. Buffers grow by doubling when needed.",
            },
          ].map((item) => (
            <div
              key={item.decision}
              className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] p-4 space-y-1"
            >
              <p className="text-[13px] font-medium text-foreground/60">
                {item.decision}
              </p>
              <p className="text-[12px] text-foreground/30 leading-relaxed">
                {item.why}
              </p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <motion.div
        className="pt-8 border-t border-foreground/[0.04]"
        {...fadeIn}
      >
        <a
          href="https://github.com/HrushiBorhade/interactive-browser-audio-voice-ai"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 text-[11px] font-mono text-foreground/20 hover:text-foreground/40 transition-colors duration-200"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          View source on GitHub
        </a>
      </motion.div>
    </div>
  );
});
