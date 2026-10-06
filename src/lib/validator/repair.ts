import type {
  AIProvider,
  GeneratedFile,
} from "@/lib/ai/types";

import type {
  BuildValidationResult,
} from "./build-validator";

export interface RepairInput {
  files: GeneratedFile[];
  validation: BuildValidationResult;
  attempt: number;
}

export interface RepairResult {
  files: GeneratedFile[];
  explanation: string;
}

const MAX_REPAIR_ATTEMPTS = 3;

const ALLOWED_FILE_PREFIXES = [
  "src/app/",
  "src/components/",
  "public/",
];

const ALLOWED_ROOT_FILES = new Set([
  "src/app/page.tsx",
  "src/app/globals.css",
]);

function isAllowedFilePath(filePath: string): boolean {
  if (ALLOWED_ROOT_FILES.has(filePath)) {
    return true;
  }

  return ALLOWED_FILE_PREFIXES.some((prefix) =>
    filePath.startsWith(prefix)
  );
}

function validateRepairFiles(
  files: unknown
): asserts files is GeneratedFile[] {
  if (!Array.isArray(files)) {
    throw new Error(
      'AI repair response must contain a "files" array.'
    );
  }

  for (const file of files) {
    if (!file || typeof file !== "object") {
      throw new Error("Invalid repaired file.");
    }

    const item = file as Record<string, unknown>;

    if (
      typeof item.path !== "string" ||
      !item.path.trim()
    ) {
      throw new Error(
        'Repaired file "path" must be a non-empty string.'
      );
    }

    if (typeof item.content !== "string") {
      throw new Error(
        'Repaired file "content" must be a string.'
      );
    }

    if (
      item.path.includes("..") ||
      item.path.includes("\\") ||
      item.path.startsWith("/") ||
      !isAllowedFilePath(item.path)
    ) {
      throw new Error(
        `Unsafe repaired file path: ${item.path}`
      );
    }

    // Prevent the repair agent from introducing
    // Next.js Pages Router / document-level APIs.
    const content = item.content;

    if (
      content.includes('from "next/document"') ||
      content.includes("from 'next/document'") ||
      content.includes("<NextScript") ||
      content.includes("<Main") ||
      content.includes("<Html")
    ) {
      throw new Error(
        `Repaired file "${item.path}" contains forbidden Next.js document APIs.`
      );
    }

    // The generated application must be a real frontend,
    // not an iframe/embed of the source website.
    if (
      /<iframe[\s>]/i.test(content) ||
      /<embed[\s>]/i.test(content)
    ) {
      throw new Error(
        `Repaired file "${item.path}" contains iframe/embed code.`
      );
    }
  }
}

/**
 * AI models sometimes return:
 *
 * ```json
 * {...}
 * ```
 *
 * instead of pure JSON.
 *
 * This helper removes markdown fences and attempts
 * to isolate the JSON object.
 */
function cleanAIJsonResponse(content: string): string {
  let cleaned = content.trim();

  // Remove markdown code fences.
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // If the model added explanatory text before/after
  // the JSON, isolate the outer JSON object.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    cleaned = cleaned.slice(
      firstBrace,
      lastBrace + 1
    );
  }

  return cleaned.trim();
}

function buildRepairPrompt(
  input: RepairInput
): string {
  return `
You are a senior React and Next.js debugging engineer.

A generated website frontend failed its production build.

Your job is to make the SMALLEST possible code change that fixes the actual build error.

IMPORTANT:

1. Inspect the BUILD STDERR and BUILD STDOUT carefully.
2. Fix the actual error reported by the compiler.
3. Preserve the existing visual design.
4. Preserve the existing layout and functionality.
5. Do not rewrite files that do not need changes.
6. Return ONLY the files that actually need modification.
7. Return the COMPLETE CONTENT of every modified file.
8. Return ONLY valid JSON.
9. Do NOT use markdown code fences.
10. Do NOT add explanations before or after the JSON.
11. Do NOT return partial file contents.
12. Do NOT return unchanged files.
13. Do NOT create unnecessary new files.
14. Do NOT use iframe or embed.
15. Do NOT use next/document.
16. Do NOT use Pages Router APIs.
17. Keep the project compatible with Next.js 14 App Router.
18. Keep TypeScript valid.

NEXT.JS RULES:

- Use the App Router.
- layout.tsx must use normal JSX.
- Metadata must come from "next":
  import type { Metadata } from "next";
- Never import Metadata from React.
- Never use next/document.
- Do not use <Html>, <Main>, or <NextScript>.

TAILWIND RULES:

- The generated project uses Tailwind CSS 3.4.17.
- Do NOT use Tailwind CSS v4 syntax.
- Do NOT use:
  @import "tailwindcss";
- If Tailwind directives are needed, use:
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
- Do not mix Tailwind v3 and v4 syntax.
- Plain CSS is also allowed.

BUILD ATTEMPT:

${input.attempt}

BUILD STDOUT:

${input.validation.stdout}

BUILD STDERR:

${input.validation.stderr}

CURRENT GENERATED FILES:

${JSON.stringify(input.files, null, 2)}

VERY IMPORTANT:

Only return files that must be changed to fix the build.

Return exactly this JSON structure:

{
  "files": [
    {
      "path": "src/app/layout.tsx",
      "content": "complete file content"
    }
  ],
  "explanation": "short explanation"
}

If the build error is caused by one file, return only that file.

Do not return unchanged files.
`.trim();
}

export async function repairGeneratedProject(
  provider: AIProvider,
  input: RepairInput
): Promise<RepairResult> {
  if (input.attempt > MAX_REPAIR_ATTEMPTS) {
    throw new Error(
      `Maximum repair attempts (${MAX_REPAIR_ATTEMPTS}) exceeded.`
    );
  }

  const response = await provider.generate({
    temperature: 0.1,

    // Keep the response large enough for a complete
    // repaired file, while keeping the repair task focused.
    maxTokens: 12000,

    messages: [
      {
        role: "system",
        content: `
You are a senior frontend debugging agent.

Your response MUST be a single valid JSON object.

Never use markdown.
Never use code fences.
Never add commentary outside JSON.

Repair only the files required to fix the build.
Return complete file contents.
        `.trim(),
      },
      {
        role: "user",
        content: buildRepairPrompt(input),
      },
    ],
  });

  const rawResponse = response.content?.trim();

  if (!rawResponse) {
    throw new Error(
      "AI returned an empty response during build repair."
    );
  }

  console.log(
    "[repair] AI response length:",
    rawResponse.length
  );

  const cleanedResponse =
    cleanAIJsonResponse(rawResponse);

  if (!cleanedResponse) {
    throw new Error(
      "AI returned an empty repair response."
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleanedResponse);
  } catch {
    console.error(
      "[repair] Invalid JSON returned by AI."
    );

    console.error(
      "[repair] Response start:",
      rawResponse.slice(0, 1000)
    );

    console.error(
      "[repair] Response end:",
      rawResponse.slice(-1000)
    );

    throw new Error(
      "AI returned invalid JSON during build repair."
    );
  }

  if (
    !parsed ||
    typeof parsed !== "object" ||
    Array.isArray(parsed)
  ) {
    throw new Error(
      "AI repair response must be a JSON object."
    );
  }

  const value = parsed as Record<string, unknown>;

  validateRepairFiles(value.files);

  if (value.files.length === 0) {
    throw new Error(
      "AI repair returned no files to modify."
    );
  }

  const explanation =
    typeof value.explanation === "string" &&
    value.explanation.trim()
      ? value.explanation.trim()
      : "AI repaired the generated frontend.";

  return {
    files: value.files,
    explanation,
  };
}

export function getMaxRepairAttempts(): number {
  return MAX_REPAIR_ATTEMPTS;
}