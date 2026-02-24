"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { demoTools, executeTool } from "@/lib/tools";
import type { VoiceOrbState } from "@/components/voice-orb";

type ConnectionState = "disconnected" | "connecting" | "connected";

export interface ConnectionError {
  message: string;
  detail?: string;
}

interface UseGeminiLiveReturn {
  connectionState: ConnectionState;
  personaState: VoiceOrbState;
  error: ConnectionError | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  dismissError: () => void;
}

const GEMINI_WS_URL =
  "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent";

export const SYSTEM_INSTRUCTION =
  "You are a helpful, friendly voice assistant. Keep your responses concise and conversational since this is a voice interface. You have access to tools for getting the current time, checking weather, and rolling dice. Use them when relevant.";

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToInt16Array(base64: string): Int16Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Int16Array(bytes.buffer);
}

function parseConnectionError(err: unknown, context?: string): ConnectionError {
  if (err instanceof DOMException && err.name === "NotAllowedError") {
    return {
      message: "Microphone access denied",
      detail: "Allow microphone permission in your browser settings to use voice.",
    };
  }
  if (err instanceof DOMException && err.name === "NotFoundError") {
    return {
      message: "No microphone found",
      detail: "Connect a microphone and try again.",
    };
  }

  const msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("No API key")) {
    return {
      message: "API key not configured",
      detail: "Set GEMINI_API_KEY in your environment variables.",
    };
  }

  if (context === "token-fetch-failed") {
    return {
      message: "Could not reach the server",
      detail: "Check your connection and try again.",
    };
  }

  return {
    message: "Connection failed",
    detail: msg || "An unexpected error occurred.",
  };
}

function parseWsCloseError(code: number, reason: string): ConnectionError | null {
  if (code === 1000) return null; // normal close

  if (code === 429 || reason.toLowerCase().includes("rate") || reason.toLowerCase().includes("quota")) {
    return {
      message: "Rate limit reached",
      detail: "The API quota has been exceeded. Wait a moment and try again.",
    };
  }
  if (code === 1008 || code === 4003 || reason.toLowerCase().includes("auth") || reason.toLowerCase().includes("key")) {
    return {
      message: "Authentication failed",
      detail: "The API key may be invalid or expired.",
    };
  }
  if (code === 1006) {
    return {
      message: "Connection lost",
      detail: "The WebSocket closed unexpectedly. Check your network.",
    };
  }
  if (code >= 4000) {
    return {
      message: "Server error",
      detail: reason || `Gemini returned code ${code}.`,
    };
  }

  return {
    message: "Connection closed",
    detail: reason || `WebSocket code ${code}.`,
  };
}

export function useGeminiLive(voice: string = "Puck"): UseGeminiLiveReturn {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("disconnected");
  const [personaState, setVoiceOrbState] = useState<VoiceOrbState>("idle");
  const [error, setError] = useState<ConnectionError | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const captureCtxRef = useRef<AudioContext | null>(null);
  const playbackCtxRef = useRef<AudioContext | null>(null);
  const captureNodeRef = useRef<AudioWorkletNode | null>(null);
  const playbackNodeRef = useRef<AudioWorkletNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const setupDoneRef = useRef(false);
  const mountedRef = useRef(true);
  const connectionStateRef = useRef(connectionState);
  connectionStateRef.current = connectionState;

  const cleanup = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    captureNodeRef.current?.port.close();
    captureNodeRef.current?.disconnect();
    captureNodeRef.current = null;

    playbackNodeRef.current?.port.close();
    playbackNodeRef.current?.disconnect();
    playbackNodeRef.current = null;

    captureCtxRef.current?.close().catch(() => {});
    captureCtxRef.current = null;

    playbackCtxRef.current?.close().catch(() => {});
    playbackCtxRef.current = null;

    wsRef.current?.close();
    wsRef.current = null;

    setupDoneRef.current = false;
    if (mountedRef.current) {
      setConnectionState("disconnected");
      setVoiceOrbState("idle");
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const connect = useCallback(async () => {
    if (connectionStateRef.current !== "disconnected") return;
    setConnectionState("connecting");
    setError(null);

    try {
      const res = await fetch("/api/voice/token");
      if (!res.ok) {
        throw Object.assign(new Error("Token fetch failed"), {
          _context: "token-fetch-failed",
        });
      }
      const { apiKey } = await res.json();
      if (!apiKey) throw new Error("No API key returned");

      // Bail if unmounted during async operations
      if (!mountedRef.current) return;

      const captureCtx = new AudioContext({ sampleRate: 16000 });
      captureCtxRef.current = captureCtx;

      const playbackCtx = new AudioContext({ sampleRate: 24000 });
      playbackCtxRef.current = playbackCtx;

      // Load worklet modules + mic in parallel (async-parallel)
      const [, , stream] = await Promise.all([
        captureCtx.audioWorklet.addModule("/capture-worklet.js"),
        playbackCtx.audioWorklet.addModule("/playback-worklet.js"),
        navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        }),
      ]);

      if (!mountedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        cleanup();
        return;
      }
      streamRef.current = stream;

      const source = captureCtx.createMediaStreamSource(stream);
      const captureNode = new AudioWorkletNode(
        captureCtx,
        "capture-processor"
      );
      captureNodeRef.current = captureNode;
      source.connect(captureNode);

      const playbackNode = new AudioWorkletNode(
        playbackCtx,
        "playback-processor"
      );
      playbackNodeRef.current = playbackNode;
      playbackNode.connect(playbackCtx.destination);

      // Software echo suppression
      playbackNode.port.onmessage = (e) => {
        if (!mountedRef.current) return;
        const isStart = e.data.type === "playbackStart";
        const isStop = e.data.type === "playbackStop";
        if (!isStart && !isStop) return;

        setVoiceOrbState(isStart ? "speaking" : "listening");
        captureNodeRef.current?.port.postMessage({
          type: "mute",
          value: isStart,
        });
      };

      // Connect WebSocket to Gemini
      const ws = new WebSocket(`${GEMINI_WS_URL}?key=${apiKey}`);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            setup: {
              model: "models/gemini-2.5-flash-native-audio-preview-09-2025",
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                  },
                },
              },
              systemInstruction: {
                parts: [{ text: SYSTEM_INSTRUCTION }],
              },
              tools: [{ functionDeclarations: demoTools }],
            },
          })
        );
      };

      ws.onmessage = async (event) => {
        // Gemini sends Blob frames over WebSocket — read as text first
        const raw =
          event.data instanceof Blob
            ? await event.data.text()
            : event.data;

        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(raw);
        } catch {
          return;
        }
        if (msg.setupComplete) {
          setupDoneRef.current = true;
          if (mountedRef.current) {
            setConnectionState("connected");
            setVoiceOrbState("listening");
          }
          return;
        }

        const serverContent = msg.serverContent as
          | Record<string, unknown>
          | undefined;

        if (serverContent?.modelTurn) {
          const modelTurn = serverContent.modelTurn as {
            parts?: Array<{
              inlineData?: { mimeType?: string; data: string };
            }>;
          };
          if (modelTurn.parts) {
            for (const part of modelTurn.parts) {
              if (part.inlineData?.mimeType?.startsWith("audio/pcm")) {
                const pcm16 = base64ToInt16Array(part.inlineData.data);
                const buffer = pcm16.buffer.slice(0);
                playbackNode.port.postMessage(
                  { type: "audio", pcm: buffer },
                  [buffer]
                );
              }
            }
          }
        }

        if (serverContent?.interrupted) {
          playbackNode.port.postMessage({ type: "clear" });
          if (mountedRef.current) setVoiceOrbState("listening");
        }

        const toolCall = msg.toolCall as
          | {
              functionCalls: Array<{
                id: string;
                name: string;
                args: Record<string, unknown>;
              }>;
            }
          | undefined;

        if (toolCall) {
          if (mountedRef.current) setVoiceOrbState("thinking");
          const responses = toolCall.functionCalls.map((call) => ({
            id: call.id,
            name: call.name,
            response: executeTool(call.name, call.args || {}),
          }));
          ws.send(
            JSON.stringify({
              toolResponse: { functionResponses: responses },
            })
          );
        }
      };

      // Capture → WebSocket pipe
      captureNode.port.onmessage = (event) => {
        if (
          event.data.type === "audio" &&
          ws.readyState === WebSocket.OPEN &&
          setupDoneRef.current
        ) {
          const base64 = arrayBufferToBase64(event.data.pcm);
          ws.send(
            JSON.stringify({
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64,
                  },
                ],
              },
            })
          );
        }
      };

      ws.onerror = () => {
        if (mountedRef.current) {
          setError({
            message: "Connection error",
            detail: "WebSocket encountered an error.",
          });
        }
        cleanup();
      };
      ws.onclose = (e) => {
        const wsError = parseWsCloseError(e.code, e.reason);
        if (wsError && mountedRef.current) {
          setError(wsError);
        }
        cleanup();
      };
    } catch (err) {
      console.error("Connection failed:", err);
      if (mountedRef.current) {
        const context = (err as { _context?: string })?._context;
        setError(parseConnectionError(err, context));
      }
      cleanup();
    }
  }, [cleanup, voice]);

  const dismissError = useCallback(() => setError(null), []);

  return { connectionState, personaState, error, connect, disconnect: cleanup, dismissError };
}
