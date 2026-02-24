import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY not configured" },
      { status: 500 }
    );
  }

  // In production, use AuthTokenService.CreateToken for ephemeral tokens
  // so the real API key never reaches the client.
  // For this demo, we pass the key directly.
  return NextResponse.json({ apiKey });
}
