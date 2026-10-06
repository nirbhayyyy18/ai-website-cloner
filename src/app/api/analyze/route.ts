import { NextResponse } from "next/server";
import { analyzeWebsite } from "@/lib/analyzer/website-analyzer";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const url = body?.url;

    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        {
          error: "Website URL is required.",
        },
        {
          status: 400,
        }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          error: "Please provide a valid website URL.",
        },
        {
          status: 400,
        }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        {
          error: "Only HTTP and HTTPS URLs are supported.",
        },
        {
          status: 400,
        }
      );
    }

    const analysis = await analyzeWebsite(parsedUrl.toString());

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Website analysis failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to analyze the website.",
      },
      {
        status: 500,
      }
    );
  }
}