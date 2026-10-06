import fs from "node:fs/promises";
import path from "node:path";

import { getAIProvider } from "../src/lib/ai/provider";
import { repairGeneratedProject } from "../src/lib/validator/repair";
import {
  validateGeneratedBuild,
  type BuildValidationResult,
} from "../src/lib/validator/build-validator";
import { writeGeneratedProject } from "../src/lib/generator/project-writer";
import type { GeneratedFile } from "../src/lib/ai/types";

const SOURCE_PROJECT_ID = "example-domain";
const REPAIR_PROJECT_ID = "example-domain-repair-test";

const GENERATED_FILE_PATHS = [
  "src/app/page.tsx",
  "src/app/globals.css",
  "src/components/DocumentationNoticeCard.tsx",
  "src/components/MultilingualParagraphList.tsx",
];

async function loadGeneratedFiles(
  projectDirectory: string,
): Promise<GeneratedFile[]> {
  const files: GeneratedFile[] = [];

  for (const filePath of GENERATED_FILE_PATHS) {
    const absolutePath = path.join(projectDirectory, filePath);

    try {
      const content = await fs.readFile(absolutePath, "utf8");

      files.push({
        path: filePath,
        content,
      });
    } catch {
      // Ignore missing files.
    }
  }

  return files;
}

function mergeRepairedFiles(
  files: GeneratedFile[],
  repairedFiles: GeneratedFile[],
): GeneratedFile[] {
  const repairedByPath = new Map(
    repairedFiles.map((file) => [file.path, file]),
  );

  const mergedFiles = files.map(
    (file) => repairedByPath.get(file.path) ?? file,
  );

  const existingPaths = new Set(
    mergedFiles.map((file) => file.path),
  );

  for (const file of repairedFiles) {
    if (!existingPaths.has(file.path)) {
      mergedFiles.push(file);
    }
  }

  return mergedFiles;
}

async function main() {
  console.log("=================================");
  console.log("AI AUTOMATIC REPAIR LOOP TEST");
  console.log("=================================");
  console.log();

  const sourceProjectDirectory = path.join(
    process.cwd(),
    "generated-sites",
    SOURCE_PROJECT_ID,
  );

  const repairProjectDirectory = path.join(
    process.cwd(),
    "generated-sites",
    REPAIR_PROJECT_ID,
  );

  console.log("1. Loading existing generated project...");

  const originalFiles = await loadGeneratedFiles(
    sourceProjectDirectory,
  );

  if (originalFiles.length === 0) {
    throw new Error(
      `No generated files found in ${sourceProjectDirectory}`,
    );
  }

  console.log(`Loaded ${originalFiles.length} generated files.`);
  console.log();

  /*
   * IMPORTANT:
   *
   * We create the repair-test project first.
   * From this point onward, every build validation happens
   * against this SAME project.
   */
  console.log("2. Preparing repair-test project...");

  await writeGeneratedProject(
    {
      files: originalFiles,
      entryFile: "src/app/page.tsx",
    },
    REPAIR_PROJECT_ID,
  );

  let files = originalFiles;

  console.log(
    `Repair project ready: generated-sites/${REPAIR_PROJECT_ID}`,
  );
  console.log();

  const provider = getAIProvider();

  console.log("3. AI provider:");
  console.log(`Provider: ${provider.name}`);
  console.log(`Model: ${provider.model}`);
  console.log();

  const maxRepairAttempts = 3;

  for (
    let attempt = 0;
    attempt <= maxRepairAttempts;
    attempt += 1
  ) {
    console.log(
      `4.${attempt + 1} Build validation attempt ${attempt + 1}`,
    );

    /*
     * IMPORTANT:
     * Validate the REPAIRED project, not the original project.
     */
    const validation: BuildValidationResult =
      await validateGeneratedBuild(repairProjectDirectory);

    console.log(`Build success: ${validation.success}`);
    console.log(`Exit code: ${validation.exitCode}`);
    console.log(`Duration: ${validation.durationMs}ms`);
    console.log();

    if (validation.success) {
      console.log("=================================");
      console.log("BUILD SUCCESSFUL");
      console.log("=================================");
      console.log();
      console.log(
        `Validated project: generated-sites/${REPAIR_PROJECT_ID}`,
      );

      return;
    }

    console.log("Build failed.");

    if (attempt === maxRepairAttempts) {
      console.log();
      console.log("=================================");
      console.log("AUTOMATIC REPAIR LOOP FAILED");
      console.log("=================================");
      console.log();
      console.log(
        `Build still failed after ${maxRepairAttempts} repair attempts.`,
      );

      console.log();
      console.log("Final build error:");
      console.log(validation.stderr || validation.stdout);

      throw new Error(
        `Build still failed after ${maxRepairAttempts} repair attempts.`,
      );
    }

    console.log();
    console.log("5. Asking Gemini to repair the build...");

    const repair = await repairGeneratedProject(provider, {
      files,
      validation,
      attempt: attempt + 1,
    });

    console.log();
    console.log("Repair explanation:");
    console.log(repair.explanation);

    console.log();
    console.log("Files changed:");

    for (const file of repair.files) {
      console.log(`- ${file.path}`);
    }

    files = mergeRepairedFiles(files, repair.files);

    console.log();
    console.log("Writing repaired project...");

    await writeGeneratedProject(
      {
        files,
        entryFile: "src/app/page.tsx",
      },
      REPAIR_PROJECT_ID,
    );

    console.log(
      `Repaired project written to generated-sites/${REPAIR_PROJECT_ID}`,
    );

    console.log();
  }
}

main().catch((error) => {
  console.error();
  console.error("Test failed.");
  console.error(
    error instanceof Error ? error.message : error,
  );

  process.exit(1);
});