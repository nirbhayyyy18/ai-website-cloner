import { NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";

import { getAIProvider } from "@/lib/ai/provider";
import type { GeneratedFile } from "@/lib/ai/types";
import { modifyWebsite } from "@/lib/modifier/modifier";
import {
  getMaxRepairAttempts,
  repairGeneratedProject,
} from "@/lib/validator/repair";
import { validateGeneratedBuild } from "@/lib/validator";
import {
  startPreviewServer,
  stopPreviewServer,
} from "@/lib/preview/preview-server";

export const runtime = "nodejs";

const ALLOWED_DIRECTORIES = [
  "src/app",
  "src/components",
  "public",
];

const ALLOWED_FILES = [
  "src/app/page.tsx",
  "src/app/globals.css",
];

function isSafeProjectId(projectId: string): boolean {
  return /^[a-z0-9-]+$/.test(projectId);
}

function isAllowedFile(relativePath: string): boolean {
  if (
    relativePath.includes("..") ||
    relativePath.includes("\\") ||
    relativePath.startsWith("/")
  ) {
    return false;
  }

  if (ALLOWED_FILES.includes(relativePath)) {
    return true;
  }

  return ALLOWED_DIRECTORIES.some(
    (directory) =>
      relativePath.startsWith(`${directory}/`) &&
      !relativePath.includes(".."),
  );
}

async function collectProjectFiles(
  projectDirectory: string,
  currentDirectory = projectDirectory,
): Promise<GeneratedFile[]> {
  const entries = await fs.readdir(currentDirectory, {
    withFileTypes: true,
  });

  const files: GeneratedFile[] = [];

  for (const entry of entries) {
    const fullPath = path.join(
      currentDirectory,
      entry.name,
    );

    if (entry.isDirectory()) {
      const nestedFiles = await collectProjectFiles(
        projectDirectory,
        fullPath,
      );

      files.push(...nestedFiles);
      continue;
    }

    const relativePath = path
      .relative(projectDirectory, fullPath)
      .replaceAll(path.sep, "/");

    if (!isAllowedFile(relativePath)) {
      continue;
    }

    const content = await fs.readFile(
      fullPath,
      "utf8",
    );

    files.push({
      path: relativePath,
      content,
    });
  }

  return files;
}

async function writeFiles(
  projectDirectory: string,
  files: GeneratedFile[],
): Promise<void> {
  for (const file of files) {
    if (!isAllowedFile(file.path)) {
      throw new Error(
        `Disallowed file path: ${file.path}`,
      );
    }

    const targetPath = path.resolve(
      projectDirectory,
      file.path,
    );

    const relativeTarget = path.relative(
      projectDirectory,
      targetPath,
    );

    if (
      relativeTarget.startsWith("..") ||
      path.isAbsolute(relativeTarget)
    ) {
      throw new Error(
        `Unsafe file path: ${file.path}`,
      );
    }

    await fs.mkdir(
      path.dirname(targetPath),
      {
        recursive: true,
      },
    );

    await fs.writeFile(
      targetPath,
      file.content,
      "utf8",
    );
  }
}

function mergeFiles(
  originalFiles: GeneratedFile[],
  modifiedFiles: GeneratedFile[],
): GeneratedFile[] {
  const modifiedMap = new Map(
    modifiedFiles.map((file) => [
      file.path,
      file,
    ]),
  );

  const mergedFiles = originalFiles.map(
    (file) =>
      modifiedMap.get(file.path) ?? file,
  );

  /*
   * Also include newly created files returned by
   * the AI repair/modification agent.
   */
  const existingPaths = new Set(
    mergedFiles.map((file) => file.path),
  );

  for (const file of modifiedFiles) {
    if (!existingPaths.has(file.path)) {
      mergedFiles.push(file);
    }
  }

  return mergedFiles;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      projectId?: unknown;
      prompt?: unknown;
    };

    const projectId =
      typeof body.projectId === "string"
        ? body.projectId.trim()
        : "";

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt.trim()
        : "";

    if (!projectId) {
      return NextResponse.json(
        {
          success: false,
          error: "projectId is required.",
        },
        { status: 400 },
      );
    }

    if (!isSafeProjectId(projectId)) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid projectId.",
        },
        { status: 400 },
      );
    }

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Modification prompt is required.",
        },
        { status: 400 },
      );
    }

    const projectDirectory = path.join(
      process.cwd(),
      "generated-sites",
      projectId,
    );

    try {
      await fs.access(projectDirectory);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            `Generated project "${projectId}" was not found.`,
        },
        { status: 404 },
      );
    }

    console.log(
      `[modify] Starting modification for ${projectId}`,
    );

    console.log(
      "[modify] Reading generated project files...",
    );

    const originalFiles =
      await collectProjectFiles(
        projectDirectory,
      );

    if (originalFiles.length === 0) {
      throw new Error(
        "No editable generated project files were found.",
      );
    }

    console.log(
      `[modify] Loaded ${originalFiles.length} files.`,
    );

    const provider = getAIProvider();

    console.log(
      `[modify] Using ${provider.name} / ${provider.model}`,
    );

    /*
     * Stop the existing preview BEFORE modifying or
     * rebuilding the project.
     *
     * This prevents the running Next.js dev server from
     * using .next while the build validator is replacing it.
     */
    console.log(
      "[modify] Stopping existing preview before modification...",
    );

    await stopPreviewServer(projectId);

    console.log(
      "[modify] Existing preview stopped.",
    );

    console.log(
      "[modify] Asking AI to modify the project...",
    );

    const modification =
      await modifyWebsite(provider, {
        projectId,
        prompt,
        files: originalFiles,
      });

    console.log(
      `[modify] AI returned ${modification.files.length} modified files.`,
    );

    let currentFiles = mergeFiles(
      originalFiles,
      modification.files,
    );

    await writeFiles(
      projectDirectory,
      modification.files,
    );

    console.log(
      "[modify] Build validation started...",
    );

    let validation =
      await validateGeneratedBuild(
        projectDirectory,
      );

    let repairAttempts = 0;

    while (
      !validation.success &&
      repairAttempts <
        getMaxRepairAttempts()
    ) {
      repairAttempts += 1;

      console.log(
        `[modify] Build failed. Starting repair attempt ${repairAttempts}`,
      );

      const repairResult =
        await repairGeneratedProject(
          provider,
          {
            files: currentFiles,
            validation,
            attempt: repairAttempts,
          },
        );

      currentFiles = mergeFiles(
        currentFiles,
        repairResult.files,
      );

      await writeFiles(
        projectDirectory,
        repairResult.files,
      );

      validation =
        await validateGeneratedBuild(
          projectDirectory,
        );
    }

    /*
     * If the modified project still cannot build,
     * do not start a broken preview.
     */
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Modification was generated, but the modified project failed build validation.",
          projectId,
          explanation:
            modification.explanation,
          validation,
          repairAttempts,
          provider:
            modification.provider,
          model:
            modification.model,
        },
        { status: 422 },
      );
    }

    console.log(
      "[modify] Modification build validation succeeded.",
    );

    /*
     * Start a completely fresh preview AFTER
     * the final build has succeeded.
     *
     * The preview server automatically selects a
     * genuinely available port.
     */
    console.log(
      "[modify] Starting fresh preview...",
    );

    const preview =
      await startPreviewServer(
        projectId,
        projectDirectory,
      );

    console.log(
      `[modify] Preview available at ${preview.url}`,
    );

    return NextResponse.json({
      success: true,

      projectId,

      explanation:
        modification.explanation,

      modifiedFiles:
        modification.files.map(
          (file) => file.path,
        ),

      validation,

      repairAttempts,

      provider:
        modification.provider,

      model:
        modification.model,

      preview: {
        url: preview.url,
        port: preview.port,
        projectId: preview.projectId,
      },

      previewUrl: preview.url,
    });
  } catch (error) {
    console.error(
      "[modify] Modification failed:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown modification error.",
      },
      { status: 500 },
    );
  }
}
