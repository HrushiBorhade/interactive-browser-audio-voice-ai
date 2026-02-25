import type { Metadata } from "next";
import { DM_Sans, Instrument_Serif, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AnalyticsProvider } from "@/components/analytics";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
});

const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Browser Audio for Voice AI | Interactive Deep Dive",
  description:
    "From the physics of digital audio to a live voice agent. Raw WebSockets, AudioWorklet processors on real-time threads, ring buffers, and browser echo cancellation with barge-in. Built from first principles.",
  authors: [{ name: "Hrushi Borhade", url: "https://github.com/HrushiBorhade" }],
  openGraph: {
    title: "Browser Audio for Voice AI",
    description:
      "Interactive deep dive into browser audio architecture for voice AI. AudioWorklets, ring buffers, Gemini Live, and browser echo cancellation with barge-in.",
    type: "article",
    url: "https://github.com/HrushiBorhade/interactive-browser-audio-voice-ai",
  },
  twitter: {
    card: "summary_large_image",
    title: "Browser Audio for Voice AI",
    description:
      "Interactive deep dive into browser audio architecture for voice AI. Built from first principles, not abstractions.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${dmSans.variable} ${instrumentSerif.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <AnalyticsProvider />
      </body>
    </html>
  );
}
