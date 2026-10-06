import { NextResponse } from "next/server";

import { getAIProvider } from "@/lib/ai/provider";

export const runtime = "nodejs";

export async function GET() {
  try {
    const provider = getAIProvider();

    const response = await provider.generate({
      messages: [
        {
          role: "system",
          content:
            "You are a connection test assistant. Follow the user's instruction exactly.",
        },
        {
          role: "user",
          content:
            "Reply with exactly: AI connection working",
        },
      ],
      temperature: 0,
      maxTokens: 20,
    });

    return NextResponse.json({
      success: true,
      provider: response.provider,
      model: response.model,
      response: response.content,
    });
  } catch (error) {
    console.error("[ai-test] AI connection failed:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "AI connection test failed.",
      },
      { status: 500 },
    );
  }
}