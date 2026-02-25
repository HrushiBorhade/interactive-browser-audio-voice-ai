# Deep Dive: Browser Audio for Voice AI

A complete walkthrough of every design decision, code pattern, and architectural choice in this codebase.

---

## Table of Contents

1. [The Three-Thread Architecture](#1-the-three-thread-architecture)
2. [Connection Lifecycle & State Machine](#2-connection-lifecycle--state-machine)
3. [Mic Capture Pipeline](#3-mic-capture-pipeline)
4. [Playback Ring Buffer](#4-playback-ring-buffer)
5. [WebSocket Protocol with Gemini](#5-websocket-protocol-with-gemini)
6. [Echo Cancellation & Barge-in](#6-echo-cancellation--barge-in)
7. [Tool Calls End-to-End](#7-tool-calls-end-to-end)
8. [Audio Format Conversions](#8-audio-format-conversions)
9. [React Patterns & Ref Guards](#9-react-patterns--ref-guards)
10. [UI State & Animation Architecture](#10-ui-state--animation-architecture)
11. [End-to-End Data Flow Trace](#11-end-to-end-data-flow-trace)
12. [File Map](#12-file-map)

---

## 1. The Three-Thread Architecture

This is the most important design decision in the entire codebase. Everything else follows from it.

```
┌─────────────────────────────────────────────────────────┐
│                    MAIN THREAD                          │
│                                                         │
│  React state, DOM, WebSocket, fetch, base64 encode/     │
│  decode, tool execution, UI rendering                   │
│                                                         │
│  Can be blocked by: GC, DOM layout, React re-renders,   │
│  network, heavy JS — but that only causes UI jank,      │
│  NOT audio glitches                                     │
└──────────┬──────────────────────────────┬───────────────┘
           │ port.postMessage()           │ port.postMessage()
           │ (transferable ArrayBuffer)   │ (transferable ArrayBuffer)
           ▼                              ▼
┌─────────────────────┐    ┌──────────────────────────────┐
│  CAPTURE THREAD     │    │  PLAYBACK THREAD             │
│  (AudioWorklet)     │    │  (AudioWorklet)              │
│                     │    │                              │
│  16 kHz sample rate │    │  24 kHz sample rate          │
│  128 samples/quantum│    │  128 samples/quantum         │
│  ~8ms per callback  │    │  ~5.3ms per callback         │
│                     │    │                              │
│  OS real-time       │    │  OS real-time                │
│  scheduling priority│    │  scheduling priority         │
│                     │    │                              │
│  CANNOT be blocked  │    │  CANNOT be blocked           │
│  by main thread     │    │  by main thread              │
└─────────────────────┘    └──────────────────────────────┘
```

**Why two separate AudioContexts?**

One AudioContext can have only one sample rate. Gemini expects **16 kHz** input (speech-optimized, lower bandwidth) and produces **24 kHz** output (higher fidelity for playback). Two different rates = two contexts, mandatory.

```typescript
// use-gemini-live.ts:188-192
const captureCtx = new AudioContext({ sampleRate: 16000 });   // mic
const playbackCtx = new AudioContext({ sampleRate: 24000 });  // speakers
```

The 16 kHz capture context also causes the browser to **automatically resample** the mic's native hardware rate (typically 48 kHz) down to 16 kHz. This implicit resampling is why the `sampleRate: 16000` getUserMedia constraint is just a "hint" — the AudioContext constructor is the reliable control.

**Why AudioWorklet instead of ScriptProcessorNode?**

ScriptProcessorNode (deprecated) runs on the main thread. If React re-renders or GC kicks in during an audio callback, you get audible glitches. AudioWorklet runs on a dedicated OS-level real-time thread — immune to main thread jank.

---

## 2. Connection Lifecycle & State Machine

Two state machines run in parallel — one for the connection, one for what the AI is doing:

```
CONNECTION STATE                    PERSONA STATE (within "connected")
═══════════════                    ═══════════════════════════════════

  disconnected                          idle
      │                                  │
      │ connect()                        │ setupComplete received
      ▼                                  ▼
  connecting                         listening
      │                                  │
      │ setupComplete                    │ AI starts responding
      ▼                                  ▼
  connected ─────────────────────►   speaking
      │                                  │
      │ cleanup()                        │ AI calls a tool
      ▼                                  ▼
  disconnected                       thinking
                                         │
                                         │ tool response sent, AI continues
                                         ▼
                                      speaking
                                         │
                                         │ ring buffer drains
                                         ▼
                                      listening  (cycle repeats)
```

These two are merged into a single `Phase` type for downstream consumption:

```typescript
// page.tsx:74-78
const phase: Phase = isConnecting
  ? "connecting"
  : isConnected
    ? personaState        // listening | speaking | thinking
    : "idle";             // disconnected = idle

// types.ts
type Phase = "idle" | "connecting" | "listening" | "speaking" | "thinking";
```

`Phase` is what `VoiceOrb` and `ArchitectureFlow` both receive. One value drives all visualizations.

---

## 3. Mic Capture Pipeline

```
Hardware Mic (48 kHz native)
      │
      │  browser resamples to match AudioContext
      ▼
AudioContext (16 kHz)
      │
      │  createMediaStreamSource(stream)
      ▼
MediaStreamSourceNode
      │
      │  .connect(captureNode)
      ▼
┌─────────────────────────────────────────────────┐
│  CaptureProcessor (AudioWorklet, real-time)     │
│                                                 │
│  process() called every 128 samples (~8ms)      │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  Accumulation Buffer (Float32Array)       │  │
│  │  Initial size: 8192 samples               │  │
│  │  Doubles if needed (never in practice)    │  │
│  │                                           │  │
│  │  ┌───┬───┬───┬───┬───┬───┬───┬───┐       │  │
│  │  │128│128│128│128│128│128│...│   │       │  │
│  │  └───┴───┴───┴───┴───┴───┴───┴───┘       │  │
│  │       writeIndex ──────────►              │  │
│  │                                           │  │
│  │  When writeIndex >= 2048 (FRAME_SIZE):    │  │
│  │  1. Extract 2048 samples                  │  │
│  │  2. Float32 → Int16 conversion            │  │
│  │  3. postMessage (transferable)            │  │
│  │  4. Shift remaining to front (copyWithin) │  │
│  └───────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────┘
                       │
                       │  port.postMessage({ type: "audio", pcm: Int16Buffer })
                       │  (zero-copy transferable)
                       ▼
                  MAIN THREAD
                       │
                       │  base64 encode → JSON → ws.send()
                       ▼
                  Gemini WebSocket
```

**Why accumulate 2048 samples before sending?**

If every 128-sample quantum fired a `postMessage`, that's **125 messages/second** — each waking the main thread. By accumulating to 2048 samples (128ms of audio), we send only **~8 messages/second**. 16x fewer cross-thread wakeups.

**The drain loop uses `while`, not `if`:**

```javascript
// capture-worklet.js:29
while (this.writeIndex >= this.FRAME_SIZE) {
```

If somehow multiple frames accumulate (shouldn't happen in practice), the `while` drains all of them in one `process()` call.

**copyWithin for zero-allocation shift:**

```javascript
// capture-worklet.js:36-37
this.buffer.copyWithin(0, this.FRAME_SIZE, this.writeIndex);
this.writeIndex = remaining;
```

After extracting a frame, the unconsumed tail is shifted to the front using `copyWithin` — an in-place operation on the existing typed array. No new allocation on the audio thread.

---

## 4. Playback Ring Buffer

The ring buffer is the most elegant piece of code in the project.

```
Ring Buffer (Float32Array, 240,000 samples = 10s at 24 kHz)

 Physical layout:
 ┌────────────────────────────────────────────────────┐
 │  slot 0  │  slot 1  │  slot 2  │ ... │ slot 239999│
 └────────────────────────────────────────────────────┘

 Logical view (monotonic indices):
                readIndex              writeIndex
                   │                      │
                   ▼                      ▼
 ─ ─ ─ ─ ─ ─ ─[===AUDIO DATA====]─ ─ ─ ─ ─ ─ ─
               ◄─── available ────►

 Physical position = index % ringBuffer.length

 Fullness:   writeIndex - readIndex
 Free space: ringBuffer.length - (writeIndex - readIndex)
```

**Why monotonic indices instead of wrapping?**

The indices **never wrap to zero** (except on clear/interrupt). The physical buffer slot is always `index % ringBuffer.length`. This eliminates all wrap-around edge cases:

```javascript
// playback-worklet.js:13-15
const used = this.writeIndex - this.readIndex;     // always correct
const free = this.ringBuffer.length - used;         // always correct
```

With wrapping indices, you'd need special cases for when `writeIndex < readIndex` (meaning the write pointer has wrapped around). Monotonic indices make the math trivial.

**How long until indices overflow?** At 24 kHz, `Number.MAX_SAFE_INTEGER` (2^53) gives **~11,900 years** of continuous playback. Not a concern.

**Interrupt is two integer assignments:**

```javascript
// playback-worklet.js:26-29
} else if (e.data.type === "clear") {
  this.writeIndex = 0;
  this.readIndex = 0;
  this.isPlaying = false;
  this.port.postMessage({ type: "playbackStop" });
}
```

The buffer memory is **not zeroed**. Old audio data sits there but is never read because `available = 0 - 0 = 0`. Next `process()` call outputs silence. This is the key advantage over AudioBufferSourceNode queues — instant interruption with zero cleanup.

**Backpressure via clamping:**

```javascript
// playback-worklet.js:15
const toWrite = Math.min(pcm16.length, free);
```

If the network bursts faster than 24 kHz playback, excess audio is silently dropped. For a 10-second buffer, this only happens on pathologically long responses (>10s of unplayed audio).

**Playback state signaling:**

```javascript
// playback-worklet.js:21-23 (on write)
if (!this.isPlaying && toWrite > 0) {
  this.isPlaying = true;
  this.port.postMessage({ type: "playbackStart" });  // → personaState = "speaking"
}

// playback-worklet.js:46-48 (on empty read)
} else if (this.isPlaying) {
  this.isPlaying = false;
  this.port.postMessage({ type: "playbackStop" });   // → personaState = "listening"
}
```

State transitions are driven by **buffer reality** — is there audio to play? — not by timing estimates or heuristics.

---

## 5. WebSocket Protocol with Gemini

The WebSocket connection follows Gemini's `BidiGenerateContent` protocol.

### Setup Message (client → server, sent once on open)

```json
{
  "setup": {
    "model": "models/gemini-2.5-flash-native-audio-preview-09-2025",
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": { "voiceName": "Puck" }
        }
      }
    },
    "systemInstruction": {
      "parts": [{ "text": "You are a helpful..." }]
    },
    "tools": [{ "functionDeclarations": [...] }]
  }
}
```

### Setup Complete (server → client)

```json
{ "setupComplete": {} }
```

Only after this can audio be sent. The `setupDoneRef` gate enforces this.

### Audio Input (client → server, continuous)

```json
{
  "realtimeInput": {
    "mediaChunks": [{
      "mimeType": "audio/pcm;rate=16000",
      "data": "<base64 encoded Int16 PCM>"
    }]
  }
}
```

### Audio Output (server → client, streaming)

```json
{
  "serverContent": {
    "modelTurn": {
      "parts": [{
        "inlineData": {
          "mimeType": "audio/pcm;rate=24000",
          "data": "<base64 encoded Int16 PCM>"
        }
      }]
    }
  }
}
```

### Interruption Signal (server → client)

```json
{ "serverContent": { "interrupted": true } }
```

Sent when Gemini's server-side VAD detects the user speaking during AI playback.

### Tool Call (server → client)

```json
{
  "toolCall": {
    "functionCalls": [{
      "id": "call_abc123",
      "name": "get_current_time",
      "args": { "timezone": "UTC" }
    }]
  }
}
```

### Tool Response (client → server)

```json
{
  "toolResponse": {
    "functionResponses": [{
      "id": "call_abc123",
      "name": "get_current_time",
      "response": { "time": "14:32:05", "timezone": "UTC" }
    }]
  }
}
```

### The Blob Gotcha

```typescript
// use-gemini-live.ts:271-276
ws.onmessage = async (event) => {
  const raw = event.data instanceof Blob
    ? await event.data.text()
    : event.data;
```

Gemini sends all server-to-client messages as **Blob objects**, not strings. Without the `instanceof Blob` check, `JSON.parse` receives a Blob and throws. This makes the entire `onmessage` handler `async` (because `Blob.text()` returns a Promise).

---

## 6. Echo Cancellation & Barge-in

```
WITHOUT AEC (broken):                 WITH AEC (correct):

  AI speaks                             AI speaks
     │                                     │
     ▼                                     ▼
  Speakers                              Speakers
     │                                     │
     │  sound waves                        │  sound waves
     ▼                                     ▼
  Microphone picks up                   Microphone picks up
  AI's voice                            AI's voice
     │                                     │
     ▼                                     ▼
  Sent to Gemini                        Browser AEC subtracts
     │                                  speaker reference signal
     ▼                                     │
  Gemini hears itself                      ▼
     │                                  Only YOUR voice passes
     ▼                                     │
  Responds to own voice                    ▼
     │                                  Sent to Gemini
     ▼                                     │
  FEEDBACK LOOP                            ▼
                                        Gemini hears YOU
                                           │
                                           ▼
                                        Sends interrupted signal
                                           │
                                           ▼
                                        Client clears ring buffer
                                           │
                                           ▼
                                        BARGE-IN WORKS
```

**The critical getUserMedia constraints:**

```typescript
// use-gemini-live.ts:199-205
audio: {
  channelCount: 1,        // mono — speech is mono, stereo doubles bandwidth for nothing
  sampleRate: 16000,       // hint to browser (AudioContext handles real resampling)
  echoCancellation: true,  // AEC — subtracts speaker output from mic input (LOAD BEARING)
  noiseSuppression: true,  // filters keyboard, HVAC, etc. (improves VAD accuracy)
  autoGainControl: true,   // normalizes volume (whispers and shouts treated equally)
}
```

**Why not mute the mic during playback?**

A naive approach sends `mute: true` to the capture worklet when AI speaks. This prevents echo but **completely kills barge-in** — the user can't interrupt because Gemini never hears them. The mic must stay open.

**The barge-in flow in code:**

```typescript
// use-gemini-live.ts:314-318 — handle interruption
if (serverContent?.interrupted) {
  playbackNode.port.postMessage({ type: "clear" });    // two integer resets
  if (mountedRef.current) setVoiceOrbState("listening");
}
```

---

## 7. Tool Calls End-to-End

```
User says: "What time is it?"
          │
          ▼
Gemini recognizes tool intent
          │
          ▼
Server sends: { toolCall: { functionCalls: [{ name: "get_current_time", ... }] } }
          │
          ▼
Client: personaState → "thinking"
          │
          ▼
executeTool("get_current_time", { timezone: "UTC" })
          │
          │  tools.ts — synchronous execution
          │  Returns: { time: "14:32:05", timezone: "UTC", formatted: "2:32:05 PM" }
          │
          ▼
Client sends: { toolResponse: { functionResponses: [{ id, name, response }] } }
          │
          ▼
Gemini generates audio response: "It's 2:32 PM UTC"
          │
          ▼
Audio chunks arrive → ring buffer → speakers
          │
          ▼
personaState → "speaking"
```

**Tool declarations use Gemini's format (not OpenAI's):**

```typescript
// tools.ts — note uppercase types
parameters: {
  type: "OBJECT",      // Gemini: "OBJECT", OpenAI: "object"
  properties: {
    timezone: {
      type: "STRING",  // Gemini: "STRING", OpenAI: "string"
      description: "...",
    },
  },
}
```

**Defensive clamping on LLM-generated args:**

```typescript
// tools.ts — roll_dice
const sides = Math.max(1, Math.floor((args.sides as number) || 6));   // no 0-sided die
const count = Math.max(1, Math.min(100, Math.floor((args.count as number) || 1))); // cap at 100
```

---

## 8. Audio Format Conversions

### Float32 → Int16 (Capture, encoding)

```
Browser mic output: Float32 in range [-1.0, +1.0]
Gemini expects:     Int16  in range [-32768, +32767]

Note: Int16 range is ASYMMETRIC — negative side has one more value
```

```javascript
// capture-worklet.js:30-33
const s = Math.max(-1, Math.min(1, this.buffer[i]));  // clamp first
pcm16[i] = s < 0
  ? s * 0x8000    // -1.0 → -32768 (0x8000 = 32768)
  : s * 0x7FFF;   // +1.0 → +32767 (0x7FFF = 32767)
```

The clamp prevents overflow from hardware pre-amp values slightly outside [-1, 1]. The asymmetric multiply preserves full precision on both sides.

### Int16 → Float32 (Playback, decoding)

```javascript
// playback-worklet.js:17
this.ringBuffer[...] = pcm16[i] / 32768;
```

Symmetric division by 32768 for decode. Maps -32768 → -1.0, +32767 → ~0.99997. This is the standard decode convention.

### Base64 encoding/decoding

```
Int16 PCM (binary) ──base64 encode──► ASCII string ──JSON──► WebSocket

Overhead: base64 adds ~33% to payload size
Why: Gemini's API mandates JSON. Binary WebSocket frames cannot be used.
```

```typescript
// use-gemini-live.ts:29-36
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
```

The `Uint8Array` view treats the Int16 ArrayBuffer as raw bytes (two bytes per sample). `String.fromCharCode` + `btoa` is the classic browser base64 encode path.

---

## 9. React Patterns & Ref Guards

### mountedRef — preventing setState on unmounted component

```typescript
// use-gemini-live.ts:130, 156-159
const mountedRef = useRef(true);

// Cleanup on unmount:
useEffect(() => {
  return () => { mountedRef.current = false; cleanup(); };
}, [cleanup]);

// Every async callback guards:
if (!mountedRef.current) return;
```

`connect()` has multiple `await` points. The component could unmount between any two. Without `mountedRef`, every state setter would fire on a dead component.

### connectionStateRef — preventing double-connect

```typescript
// use-gemini-live.ts:131-132, 171
const connectionStateRef = useRef(connectionState);
connectionStateRef.current = connectionState;

// In connect():
if (connectionStateRef.current !== "disconnected") return;
```

React state is subject to stale closures. If the user double-taps the connect button, both clicks would see `connectionState === "disconnected"` due to the closure capturing the old value. The ref is always current.

### setupDoneRef — gating audio until handshake completes

```typescript
// use-gemini-live.ts:129, 284-289, 349-352
const setupDoneRef = useRef(false);

// Set when Gemini confirms:
if (msg.setupComplete) { setupDoneRef.current = true; }

// Checked on every audio frame:
if (event.data.type === "audio" && ws.readyState === WebSocket.OPEN && setupDoneRef.current) {
  // send audio
}
```

Audio capture starts the instant mic permission is granted, but Gemini rejects audio before `setupComplete`. The ref gates the send path.

### useMounted — hydration-safe mount detection

```typescript
// use-mounted.ts
const emptySubscribe = () => () => {};
export function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
```

`useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot)`:
- Server: returns `false`
- Client: returns `true`

Used to gate the theme toggle icon (sun/moon). During SSR, `theme` is unknown. Rendering a specific icon would cause hydration mismatch. With `useMounted`, SSR outputs an empty button, and the correct icon appears after hydration.

---

## 10. UI State & Animation Architecture

### Voice Orb — CSS state machine

The orb doesn't conditionally render different elements. All layers are always in the DOM. CSS attribute selectors toggle their appearance:

```
HTML: <div class="orb" data-state="speaking">

CSS:
  [data-state="idle"]     .orb-glow    { opacity: 0.4 }
  [data-state="listening"] .orb-glow    { opacity: 0.6 }
  [data-state="speaking"]  .orb-glow    { opacity: 0.9; scale: 1.1 }
  [data-state="speaking"]  .orb-pulse   { opacity: 1 }     ← pulse rings appear
  [data-state="thinking"]  .orb-shimmer { opacity: 1 }     ← shimmer appears
```

**Layer stack (bottom to top):**

```
orb-ring       dashed circle, 40s rotation (ambient)
orb-glow       large blur, scales with state
orb-body       clips children, morphing box-shadow
  orb-color-1  gradient blob, drift-1 anim, 12s
  orb-color-2  gradient blob, drift-2 anim, 16s
  orb-color-3  gradient blob, drift-3 anim, 10s
  orb-core     luminous center point
  orb-highlight specular top-left (3D effect)
orb-pulse      expanding rings (speaking only)
orb-shimmer    rotating conic gradient (thinking only)
```

### Architecture Flow — data-driven visualization

Pipeline steps are defined as data, not JSX:

```typescript
const pipeline: Step[] = [
  { type: "node",      label: "Microphone",        activeIn: ["listening"] },
  { type: "connector", label: "MediaStream",        activeIn: ["listening"] },
  { type: "node",      label: "Capture Worklet",    activeIn: ["listening"] },
  { type: "bridge",    label: "WebSocket",           activeIn: ["listening", "speaking", "thinking"] },
  { type: "node",      label: "Gemini 2.5 Flash",   activeIn: ["listening", "speaking", "thinking"] },
  { type: "tools",                                   activeIn: ["thinking"] },
  { type: "node",      label: "Playback Worklet",   activeIn: ["speaking"] },
  { type: "node",      label: "Speakers",            activeIn: ["speaking"] },
  { type: "echo",                                    activeIn: ["listening", "speaking"] },
];
```

Each step renders with `const active = step.activeIn.includes(phase)` — a boolean that drives opacity, border color, and the animated data packet dots on connector lines.

### Shared animation constants

```typescript
// motion.ts
export const iosEase = [0.32, 0.72, 0, 1] as const;
```

A cubic Bezier that matches iOS's spring animation feel. Used consistently across all transitions (fade-in, orb scale, voice selector). One curve = unified motion language.

---

## 11. End-to-End Data Flow Trace

### Startup

```
User clicks mic button
       │
       ▼
connect() called
       │
       ├──► fetch("/api/voice/token") → server reads GEMINI_API_KEY → returns { apiKey }
       │
       ├──► new AudioContext(16000)    ──┐
       ├──► new AudioContext(24000)      │
       │                                │
       ▼                                │  Promise.all (parallel)
  ┌────────────────────────────┐        │
  │  addModule(capture.js)     │ ◄──────┤
  │  addModule(playback.js)    │ ◄──────┤
  │  getUserMedia(constraints) │ ◄──────┘
  └────────────────────────────┘
       │
       ▼
  Wire up audio graph:
    source → captureNode (16 kHz thread)
    playbackNode → destination (24 kHz thread)
       │
       ▼
  Open WebSocket → send setup message → wait for setupComplete
       │
       ▼
  connectionState = "connected", personaState = "listening"
```

### Speaking to the AI

```
Mic hardware (48 kHz)
   │ browser resamples
   ▼
Capture AudioContext (16 kHz)
   │ 128 samples per quantum (~8ms)
   ▼
CaptureProcessor.process()
   │ accumulates into buffer
   │ when buffer >= 2048 samples (128ms):
   │   Float32 → Int16 conversion
   │   postMessage (transferable, zero-copy)
   ▼
Main Thread: captureNode.port.onmessage
   │ check: setupDone && ws.readyState === OPEN
   │ arrayBufferToBase64(pcm)
   │ ws.send(JSON.stringify({ realtimeInput: { mediaChunks: [...] } }))
   ▼
Gemini WebSocket (server)
   │ VAD detects end of speech
   │ generates audio response
   │ streams audio chunks back
   ▼
Main Thread: ws.onmessage
   │ Blob → await .text() → JSON.parse
   │ find serverContent.modelTurn.parts[].inlineData
   │ base64ToInt16Array(data) → Int16Array
   │ playbackNode.port.postMessage({ type: "audio", pcm }, [pcm])
   ▼
PlaybackProcessor.port.onmessage
   │ Int16 → Float32 (/32768) → write to ring buffer
   │ if !isPlaying: postMessage("playbackStart") → personaState = "speaking"
   ▼
PlaybackProcessor.process() (every 5.3ms)
   │ read from ring buffer → output array → speakers
   │ when buffer empty: postMessage("playbackStop") → personaState = "listening"
   ▼
Speakers (24 kHz)
```

### Barge-in (interrupting the AI)

```
AI is speaking (personaState = "speaking")
Mic is OPEN (never muted)
       │
User speaks
       │
       ▼
Browser AEC strips AI speaker audio from mic signal
       │
       ▼
Only user's voice reaches capture worklet
       │
       ▼
Audio sent to Gemini via realtimeInput (continuous)
       │
       ▼
Gemini server-side VAD detects human voice
       │
       ▼
Server sends: { serverContent: { interrupted: true } }
       │
       ▼
Client: playbackNode.port.postMessage({ type: "clear" })
       │
       ▼
Playback worklet: writeIndex = 0, readIndex = 0
Next process() call: available = 0, output silence
       │
       ▼
personaState → "listening"
User now has the floor
```

---

## 12. File Map

```
src/
  app/
    layout.tsx              Root layout. Fonts, metadata, ThemeProvider, AnalyticsProvider.
                            suppressHydrationWarning on <html> for next-themes.

    page.tsx                Main page. Wires useGeminiLive to UI. Computes Phase from
                            connectionState + personaState. Dynamic imports for heavy
                            components. Voice selector, error toast, theme toggle.

    globals.css             Orb CSS state machine ([data-state="..."]), flow packet
                            animations, light/dark mode variables.

    api/voice/token/
      route.ts              GET endpoint. Reads GEMINI_API_KEY from env, returns to client.
                            Keeps key out of client bundle. Production should use
                            Gemini's AuthTokenService for ephemeral tokens.

  hooks/
    use-gemini-live.ts      THE CORE. Owns WebSocket, both AudioContexts, both worklet
                            nodes, MediaStream. Handles Gemini protocol (setup, audio I/O,
                            tool calls, interrupts). All ref guards live here.

    use-mounted.ts          useSyncExternalStore pattern for hydration-safe mount detection.

  components/
    voice-orb.tsx           Pure CSS visualization. data-state attribute drives all
                            visual states. memo'd — only re-renders when state changes.

    architecture-flow.tsx   Data-driven pipeline diagram. Each step declares activeIn
                            phases. Synchronized with live demo state.

    article-content.tsx     Educational article. fadeIn scroll animations. ComparisonTable
                            and StatCard components for repeated patterns. memo'd (static).

    analytics.tsx           Client component wrapper for Vercel Analytics + Speed Insights.
                            Dynamic imports with ssr: false (deferred loading).

    theme-provider.tsx      Thin wrapper around next-themes. attribute="class",
                            defaultTheme="dark", enableSystem=false.

  lib/
    tools.ts                Gemini function declarations + executeTool(). Schema uses
                            Gemini's uppercase types ("OBJECT", "STRING").

    motion.ts               Shared iosEase curve + fadeIn animation preset.

    types.ts                Phase type = "idle" | "connecting" | "listening" | "speaking" | "thinking"

public/
  capture-worklet.js        Runs on 16 kHz audio thread. Accumulates 128-sample quanta
                            into 2048-sample frames. Float32 → Int16. Transferable post.

  playback-worklet.js       Runs on 24 kHz audio thread. Ring buffer (monotonic indices).
                            Int16 → Float32. Signals playbackStart/Stop. Clear = 2 resets.

next.config.ts              optimizePackageImports for motion + @radix-ui/react-select.
```

---

## Key Takeaways

1. **Separate audio from UI** — AudioWorklets run on real-time OS threads immune to React/GC jank
2. **Two AudioContexts for two sample rates** — capture at 16 kHz, playback at 24 kHz
3. **Ring buffer with monotonic indices** — eliminates wrap-around edge cases, interrupt is two integer resets
4. **Transferable ArrayBuffers** — zero-copy binary data between threads
5. **Browser AEC over mic muting** — keeps the mic open for barge-in while suppressing echo
6. **setupDoneRef gate** — no audio sent before Gemini's handshake completes
7. **Blob-first WebSocket** — Gemini sends Blobs, must `await .text()` before JSON.parse
8. **Accumulate before sending** — 2048-sample frames = 16x fewer cross-thread messages
9. **CSS state machine for orb** — all layers always in DOM, CSS attribute selectors toggle them
10. **Data-driven pipeline viz** — `activeIn: Phase[]` per step, not conditional JSX
