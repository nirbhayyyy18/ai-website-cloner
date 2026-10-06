import { NextResponse } from "next/server";

import { analyzeWebsite } from "@/lib/analyzer/website-analyzer";
import { getAIProvider } from "@/lib/ai/provider";
import { planWebsite } from "@/lib/ai/planner";

import { generateFrontend } from "@/lib/generator/code-generator";
import { writeGeneratedProject } from "@/lib/generator/project-writer";

import { startPreviewServer } from "@/lib/preview/preview-server";

import {
  validateGeneratedBuild,
  type BuildValidationResult,
} from "@/lib/validator";

import {
  getMaxRepairAttempts,
  repairGeneratedProject,
} from "@/lib/validator/repair";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const url = body?.url;

    // --------------------------------------------------
    // STEP 0 — VALIDATE URL
    // --------------------------------------------------

    if (typeof url !== "string" || !url.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: "Website URL is required.",
        },
        { status: 400 }
      );
    }

    let parsedUrl: URL;

    try {
      parsedUrl = new URL(url);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: "Please provide a valid website URL.",
        },
        { status: 400 }
      );
    }

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return NextResponse.json(
        {
          success: false,
          error: "Only HTTP and HTTPS URLs are supported.",
        },
        { status: 400 }
      );
    }

    console.log(
      `[generate] Starting generation for ${parsedUrl.toString()}`
    );

    // --------------------------------------------------
    // STEP 1 — ANALYZE WEBSITE
    // --------------------------------------------------

    console.log("[generate] Analyzing website...");

    const analysis = await analyzeWebsite(parsedUrl.toString());

    // --------------------------------------------------
    // STEP 2 — RESOLVE AI PROVIDER
    // --------------------------------------------------

    console.log("[generate] Resolving AI provider...");

    const provider = getAIProvider();

    // --------------------------------------------------
    // STEP 3 — CREATE GENERATION PLAN
    // --------------------------------------------------

    console.log("[generate] Creating generation plan...");

    const plan = await planWebsite(provider, {
      analysis,
    });

    // --------------------------------------------------
    // STEP 4 — GENERATE FRONTEND
    // --------------------------------------------------

    console.log("[generate] Generating frontend code...");

    let project = await generateFrontend(provider, {
      analysis,
      plan,
    });

    console.log(
      `[generate] Generated ${project.files.length} files.`
    );

    // --------------------------------------------------
    // STEP 5 — CREATE PROJECT DIRECTORY
    // --------------------------------------------------

    const projectId = new URL(analysis.url).hostname
      .replace(/^www\./, "")
      .replace(/\./g, "-");

    console.log(
      `[generate] Writing generated project: ${projectId}`
    );

    let projectDirectory = await writeGeneratedProject(
      project,
      projectId
    );

    // --------------------------------------------------
    // STEP 6 — BUILD + REPAIR LOOP
    // --------------------------------------------------

    let validation: BuildValidationResult | null = null;

    const repairAttempts = [];

    const maxRepairAttempts = getMaxRepairAttempts();

    for (
      let attempt = 0;
      attempt <= maxRepairAttempts;
      attempt += 1
    ) {
      console.log(
        `[generate] Build validation attempt ${attempt + 1}`
      );

      validation = await validateGeneratedBuild(
        projectDirectory
      );

      if (validation.success) {
        console.log(
          "[generate] Build validation succeeded."
        );

        break;
      }

      // If this was the final allowed attempt,
      // do not ask the AI to repair again.
      if (attempt === maxRepairAttempts) {
        console.error(
          "[generate] Maximum repair attempts reached."
        );

        break;
      }

      console.log(
        `[generate] Build failed. Starting AI repair attempt ${
          attempt + 1
        }`
      );

      const repair = await repairGeneratedProject(
        provider,
        {
          files: project.files,
          validation,
          attempt: attempt + 1,
        }
      );

      repairAttempts.push({
        attempt: attempt + 1,
        explanation: repair.explanation,
        filesChanged: repair.files.map(
          (file) => file.path
        ),
      });

      // --------------------------------------------------
      // MERGE REPAIRED FILES
      // --------------------------------------------------

      const repairedFilesByPath = new Map(
        repair.files.map((file) => [
          file.path,
          file,
        ])
      );

      project = {
        ...project,

        files: project.files.map(
          (file) =>
            repairedFilesByPath.get(file.path) ?? file
        ),
      };

      // Add any newly returned files.
      const existingPaths = new Set(
        project.files.map((file) => file.path)
      );

      for (const repairedFile of repair.files) {
        if (!existingPaths.has(repairedFile.path)) {
          project.files.push(repairedFile);
        }
      }

      // --------------------------------------------------
      // WRITE REPAIRED PROJECT
      // --------------------------------------------------

      projectDirectory = await writeGeneratedProject(
        project,
        projectId
      );
    }

    // --------------------------------------------------
    // STEP 6.5 — START LOCAL PREVIEW
    // --------------------------------------------------

    let preview: {
      url: string;
      port: number;
      projectId: string;
    } | null = null;

    if (validation?.success) {
      console.log(
        "[generate] Starting local preview..."
      );

      const previewServer = await startPreviewServer(
        projectId,
        projectDirectory,
        );

      preview = {
        url: previewServer.url,
        port: previewServer.port,
        projectId,
      };

      console.log(
        `[generate] Preview available at ${previewServer.url}`
      );
    }

    // --------------------------------------------------
    // STEP 7 — RETURN RESULT
    // --------------------------------------------------

    return NextResponse.json({
      success: true,

      source: {
        url: analysis.url,
      },

      preview,

      analysis,

      plan,

      project,

      projectDirectory,

      validation,

      repair: {
        maxAttempts: maxRepairAttempts,
        attemptsUsed: repairAttempts.length,
        attempts: repairAttempts,
      },

      provider: {
        name: provider.name,
        model: provider.model,
      },
    });
  } catch (error) {
    console.error(
      "[generate] Generation failed:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to generate the frontend.";

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}