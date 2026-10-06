import fs from "node:fs/promises";
import path from "node:path";

import type { GeneratedProject } from "@/lib/ai/types";

import {
  createProjectTemplate,
} from "./project-template";

const GENERATED_SITES_DIR = path.join(
  process.cwd(),
  "generated-sites"
);

const ALLOWED_ROOT_FILES = new Set([
  "package.json",
  "tsconfig.json",
  "next.config.mjs",
  "next-env.d.ts",

  // Styling configuration
  "postcss.config.mjs",
  "tailwind.config.ts",
]);

const ALLOWED_DIRECTORY_PREFIXES = [
  "src/",
  "public/",
];

function isAllowedRelativePath(filePath: string): boolean {
  if (ALLOWED_ROOT_FILES.has(filePath)) {
    return true;
  }

  return ALLOWED_DIRECTORY_PREFIXES.some((prefix) =>
    filePath.startsWith(prefix)
  );
}

function validateRelativePath(filePath: string): void {
  if (!filePath || path.isAbsolute(filePath)) {
    throw new Error(
      `Invalid generated file path: ${filePath}`
    );
  }

  if (
    filePath.includes("..") ||
    filePath.includes("\\") ||
    filePath.startsWith("/")
  ) {
    throw new Error(
      `Unsafe generated file path: ${filePath}`
    );
  }

  if (!isAllowedRelativePath(filePath)) {
    throw new Error(
      `Generated file path is outside the allowed project structure: ${filePath}`
    );
  }
}

function sanitizeProjectId(value: string): string {
  const sanitized = value
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return sanitized || "generated-site";
}

export async function writeGeneratedProject(
  project: GeneratedProject,
  projectId: string
): Promise<string> {
  const safeProjectId = sanitizeProjectId(projectId);

  const projectDirectory = path.join(
    GENERATED_SITES_DIR,
    safeProjectId
  );

  await fs.rm(projectDirectory, {
    recursive: true,
    force: true,
  });

  await fs.mkdir(projectDirectory, {
    recursive: true,
  });

  // --------------------------------------------------
  // 1. Write the base Next.js project template
  // --------------------------------------------------

  const template = createProjectTemplate();

  for (const file of template.files) {
    validateRelativePath(file.path);

    const targetPath = path.resolve(
      projectDirectory,
      file.path
    );

    const resolvedProjectDirectory =
      path.resolve(projectDirectory);

    if (
      targetPath !== resolvedProjectDirectory &&
      !targetPath.startsWith(
        `${resolvedProjectDirectory}${path.sep}`
      )
    ) {
      throw new Error(
        `Template file escaped project directory: ${file.path}`
      );
    }

    await fs.mkdir(path.dirname(targetPath), {
      recursive: true,
    });

    await fs.writeFile(
      targetPath,
      file.content,
      "utf8"
    );
  }

  // --------------------------------------------------
  // 2. Write AI-generated files
  // --------------------------------------------------

  for (const file of project.files) {
    validateRelativePath(file.path);

    const targetPath = path.resolve(
      projectDirectory,
      file.path
    );

    const resolvedProjectDirectory =
      path.resolve(projectDirectory);

    if (
      targetPath !== resolvedProjectDirectory &&
      !targetPath.startsWith(
        `${resolvedProjectDirectory}${path.sep}`
      )
    ) {
      throw new Error(
        `Generated file escaped project directory: ${file.path}`
      );
    }

    await fs.mkdir(path.dirname(targetPath), {
      recursive: true,
    });

    await fs.writeFile(
      targetPath,
      file.content,
      "utf8"
    );
  }

  // --------------------------------------------------
  // 3. Validate entry file
  // --------------------------------------------------

  validateRelativePath(project.entryFile);

  return projectDirectory;
}