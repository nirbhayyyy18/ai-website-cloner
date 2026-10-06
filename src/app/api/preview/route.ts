import { NextRequest, NextResponse } from "next/server";
import path from "node:path";

import { startPreviewServer } from "@/lib/preview/preview-server";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      projectId?: string;
    };

    const projectId = body.projectId?.trim();

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "projectId is required.",
        },
        { status: 400 },
      );
    }

    // Keep preview projects restricted to generated-sites.
    const safeProjectId = projectId
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    if (!safeProjectId) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid projectId.",
        },
        { status: 400 },
      );
    }

    const projectDirectory = path.join(
      process.cwd(),
      "generated-sites",
      safeProjectId,
    );

    const server = await startPreviewServer(projectDirectory);

    return NextResponse.json({
      success: true,
      preview: {
        projectId: safeProjectId,
        url: server.url,
        port: server.port,
      },
    });
  } catch (error) {
    console.error("Preview server error:", error);

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to start preview server.",
      },
      { status: 500 },
    );
  }
}