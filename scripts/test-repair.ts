import fs from "node:fs/promises";
import path from "node:path";

import { getAIProvider } from "../src/lib/ai/provider";
import { repairGeneratedProject } from "../src/lib/validator/repair";
import type { GeneratedFile } from "../src/lib/ai/types";
import type { BuildValidationResult } from "../src/lib/validator/build-validator";

async function main() {
  const projectDirectory = path.join(
    process.cwd(),
    "generated-sites",
    "example-domain"
  );

  console.log("=================================");
  console.log("AI BUILD REPAIR TEST");
  console.log("=================================");
  console.log("");

  console.log("1. Loading generated project...");

  const filePaths = [
    "src/app/page.tsx",
    "src/app/globals.css",
    "src/components/DocumentationNoticeCard.tsx",
    "src/components/MultilingualParagraphList.tsx",
  ];

  const files: GeneratedFile[] = [];

  for (const filePath of filePaths) {
    const absolutePath = path.join(projectDirectory, filePath);
    const content = await fs.readFile(absolutePath, "utf8");

    files.push({
      path: filePath,
      content,
    });
  }

  console.log(`Loaded ${files.length} generated files.`);
  console.log("");

  console.log("2. Creating build validation result...");

  const validation: BuildValidationResult = {
    success: false,
    stdout: "",
    stderr: `
./src/app/page.tsx:36:9
Type error: Type '{ text: string; dir: string; }[]' is not assignable to type 'ParagraphItem[]'.
  Type '{ text: string; dir: string; }' is not assignable to type 'ParagraphItem'.
    Types of property 'dir' are incompatible.
      Type 'string' is not assignable to type '"ltr" | "rtl" | undefined'.

  34 |       <DocumentationNoticeCard
  35 |         title={title}
  36 |         paragraphs={paragraphs}
  37 |         linkText="More information..."
  38 |         linkHref="https://www.iana.org/domains/example"
    `,
  };

  console.log("Build error loaded.");
  console.log("");

  console.log("3. Connecting to AI provider...");

  const provider = getAIProvider();

  console.log(`Provider: ${provider.name}`);
  console.log(`Model: ${provider.model}`);
  console.log("");

  console.log("4. Asking AI to repair the build...");

  const repair = await repairGeneratedProject(provider, {
    files,
    validation,
    attempt: 1,
  });

  console.log("");
  console.log("=================================");
  console.log("REPAIR RESULT");
  console.log("=================================");
  console.log("");

  console.log("Explanation:");
  console.log(repair.explanation);
  console.log("");

  console.log("Files changed:");

  for (const file of repair.files) {
    console.log(`- ${file.path}`);
  }

  console.log("");

  for (const file of repair.files) {
    console.log("---------------------------------");
    console.log(`REPAIRED FILE: ${file.path}`);
    console.log("---------------------------------");
    console.log(file.content);
    console.log("");
  }

  console.log("=================================");
  console.log("AI REPAIR TEST SUCCESS");
  console.log("=================================");
}

main().catch((error) => {
  console.error("");
  console.error("=================================");
  console.error("AI REPAIR TEST FAILED");
  console.error("=================================");
  console.error("");

  console.error(
    error instanceof Error ? error.message : error
  );

  process.exit(1);
});