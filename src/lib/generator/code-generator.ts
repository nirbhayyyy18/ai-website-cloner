import type {
  AIProvider,
  GeneratedProject,
  WebsiteGenerationPlan,
} from "@/lib/ai/types";

import type { WebsiteAnalysis } from "@/lib/analyzer/types";

import type {
  CodeGenerationInput,
} from "./types";

const ALLOWED_PATH_PREFIXES = [
  "src/app/",
  "src/components/",
  "public/",
];

const ALLOWED_ROOT_FILES = [
  "src/app/page.tsx",
  "src/app/globals.css",
];

function isAllowedFilePath(filePath: string): boolean {
  if (ALLOWED_ROOT_FILES.includes(filePath)) {
    return true;
  }

  return ALLOWED_PATH_PREFIXES.some((prefix) =>
    filePath.startsWith(prefix)
  );
}

function validateNextJsAppRouterCode(
  filePath: string,
  content: string
): void {
  const forbiddenPatterns = [
    {
      pattern: /from\s+["']next\/document["']/,
      message: 'Do not import anything from "next/document".',
    },
    {
      pattern: /require\(\s*["']next\/document["']\s*\)/,
      message: 'Do not require "next/document".',
    },
    {
      pattern: /<Html[\s>]/,
      message: "Do not use <Html> in generated App Router code.",
    },
    {
      pattern: /<Main[\s>]/,
      message: "Do not use <Main> in generated App Router code.",
    },
    {
      pattern: /<NextScript[\s>]/,
      message: "Do not use <NextScript> in generated App Router code.",
    },
  ];

  for (const rule of forbiddenPatterns) {
    if (rule.pattern.test(content)) {
      throw new Error(
        `Invalid Next.js App Router code in ${filePath}: ${rule.message}`
      );
    }
  }

  if (
    filePath.startsWith("pages/") ||
    filePath.startsWith("src/pages/")
  ) {
    throw new Error(
      `Pages Router file is not allowed: ${filePath}`
    );
  }

  // Detect common React hooks/browser APIs in Server Components.
  const usesClientFeatures =
    /\b(useState|useEffect|useRef|useMemo|useCallback|useReducer|useLayoutEffect)\b/.test(
      content
    ) ||
    /\b(window|document|localStorage|sessionStorage)\b/.test(
      content
    ) ||
    /\bon[A-Z][A-Za-z]+\s*=/.test(content);

  const hasUseClientDirective =
    /^\s*["']use client["'];?/m.test(content);

  if (
    filePath.startsWith("src/components/") &&
    usesClientFeatures &&
    !hasUseClientDirective
  ) {
    throw new Error(
      `Client component "${filePath}" uses React hooks, browser APIs, or event handlers but is missing the exact "use client"; directive.`
    );
  }

  // Reject common malformed client directives.
  if (
    /^\s*["'](?:client|use-client)["'];?/m.test(content) ||
    /["']import client["'];?/.test(content)
  ) {
    throw new Error(
      `Invalid client directive in ${filePath}. Use exactly "use client";`
    );
  }
}

function validateGeneratedProject(
  project: unknown
): asserts project is GeneratedProject {
  if (!project || typeof project !== "object") {
    throw new Error(
      "AI returned an invalid generated project."
    );
  }

  const value = project as Record<string, unknown>;

  if (!Array.isArray(value.files)) {
    throw new Error(
      'Invalid generated project: "files" must be an array.'
    );
  }

  if (
    typeof value.entryFile !== "string" ||
    !value.entryFile.trim()
  ) {
    throw new Error(
      'Invalid generated project: "entryFile" must be a non-empty string.'
    );
  }

  for (const file of value.files) {
    if (!file || typeof file !== "object") {
      throw new Error("Invalid generated file.");
    }

    const item = file as Record<string, unknown>;

    if (
      typeof item.path !== "string" ||
      !item.path.trim()
    ) {
      throw new Error(
        'Invalid generated file: "path" must be a non-empty string.'
      );
    }

    if (typeof item.content !== "string") {
      throw new Error(
        'Invalid generated file: "content" must be a string.'
      );
    }

    if (!isAllowedFilePath(item.path)) {
      throw new Error(
        `Generated file path is not allowed: ${item.path}`
      );
    }

    validateNextJsAppRouterCode(
      item.path,
      item.content
    );

    if (
      item.path.includes("..") ||
      item.path.startsWith("/") ||
      item.path.includes("\\")
    ) {
      throw new Error(
        `Unsafe generated file path: ${item.path}`
      );
    }
  }

  if (!isAllowedFilePath(value.entryFile)) {
    throw new Error(
      `Generated entry file is not allowed: ${value.entryFile}`
    );
  }
}

function buildCodeGenerationPrompt(
  analysis: WebsiteAnalysis,
  plan: WebsiteGenerationPlan
): string {
  return `
You are an expert React and Next.js frontend engineer.

Your task is to generate a NEW frontend implementation based on
the supplied website analysis and frontend architecture plan.

IMPORTANT RULES:

1. Generate a real React/Next.js implementation.
2. Do NOT use iframe.
3. Do NOT embed the original website.
4. Do NOT simply copy the original HTML.
5. Recreate the visual structure using React components.
6. Use reusable components where appropriate.
7. Match the analyzed layout, typography, colors, spacing,
   navigation and content hierarchy as closely as possible.
8. Make the implementation responsive for desktop, tablet and mobile.
9. Use TypeScript.
10. Use clean and maintainable code.
11. Prefer CSS/Tailwind styling over inline styles when practical.
12. Use the analyzed image assets when they are publicly accessible.
13. Do not invent unrelated sections.
14. Do not add authentication, database or backend functionality.
15. The generated result must work as a standalone frontend.
16. Return ONLY valid JSON.
17. Do not wrap the JSON in markdown code fences.

IMAGE HANDLING RULES:

- Prefer standard HTML <img> for externally hosted image URLs.
- Do NOT use next/image for external image URLs unless the external
  hostname is explicitly configured in next.config.mjs.
- Never assume that an external hostname is configured for next/image.
- For URLs such as https://www.apple.com/..., https://www.mozilla.org/...,
  or other third-party domains, use <img> instead of next/image.
- If using <img>, include a useful alt attribute.
- Do not download or copy external website assets into the generated
  project unless they are already available as local assets.
- External images must not cause the application to fail at runtime.

NEXT.JS APP ROUTER RULES:

- This project uses the Next.js App Router with src/app.
- Never import anything from "next/document".
- Never use Html, Head, Main, or NextScript from "next/document".
- Do not create pages/_document.tsx.
- Use src/app/layout.tsx for html/body structure and metadata.
- Generated page/components must be compatible with the App Router.
- Import Metadata from "next", never from "react".
- If defining page metadata, use:
  import type { Metadata } from "next";
- Do not import Metadata from React.

CLIENT COMPONENT RULES:

This is VERY IMPORTANT.

Next.js App Router components are Server Components by default.

If a component uses ANY of the following:

- useState
- useEffect
- useRef
- useMemo
- useCallback
- useReducer
- useLayoutEffect
- window
- document
- localStorage
- sessionStorage
- browser APIs
- interactive event handlers such as onClick, onChange, onSubmit,
  onMouseEnter, onMouseLeave, etc.

then that component MUST start with this exact directive:

"use client";

The directive must be the FIRST statement in the file.

Correct:

"use client";

import React, { useState } from "react";

Incorrect:

"client";

import React, { useState } from "react";

Incorrect:

"import client";

import React, { useState } from "react";

Incorrect:

import React, { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);
}

Never generate malformed client directives.

Do not add "use client" to files that do not need client-side
features unless necessary.

Keep Server Components as Server Components whenever possible.

TAILWIND CSS RULES:

- This generated project uses Tailwind CSS 3.4.17.
- Do NOT use Tailwind CSS v4 syntax.
- Do NOT use '@import "tailwindcss";'.
- If using Tailwind directives, use:
  @tailwind base;
  @tailwind components;
  @tailwind utilities;
- If using '@layer base', '@tailwind base' must be declared before it.
- Plain CSS is also allowed and may be used instead of Tailwind.
- Do not mix Tailwind v3 and v4 syntax.

Generate the following JSON structure:

{
  "files": [
    {
      "path": "src/app/page.tsx",
      "content": "complete file content"
    },
    {
      "path": "src/app/globals.css",
      "content": "complete file content"
    }
  ],
  "entryFile": "src/app/page.tsx"
}

Every file must contain its COMPLETE content.

Allowed file locations:

- src/app/page.tsx
- src/app/globals.css
- src/components/*
- public/*

Do not return files outside these locations.

========================
WEBSITE ANALYSIS
========================

${JSON.stringify(analysis, null, 2)}

========================
GENERATION PLAN
========================

${JSON.stringify(plan, null, 2)}

========================
OUTPUT REQUIREMENT
========================

Return ONLY the JSON object.
`.trim();
}

export function buildCodeGenerationRequest({
  analysis,
  plan,
}: CodeGenerationInput) {
  return {
    temperature: 0.2,
    maxTokens: 12000,

    messages: [
      {
        role: "system" as const,
        content:
          "You are a senior React/Next.js engineer who generates production-quality frontend code from structured website analysis. Always follow Next.js App Router client/server component rules.",
      },
      {
        role: "user" as const,
        content: buildCodeGenerationPrompt(
          analysis,
          plan
        ),
      },
    ],
  };
}

export function parseGeneratedProject(
  content: string
): GeneratedProject {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    console.error(
      "[generator] AI response is not valid JSON."
    );

    console.error(
      "[generator] Response start:",
      content.slice(0, 1000)
    );

    console.error(
      "[generator] Response end:",
      content.slice(-1000)
    );

    throw new Error(
      "AI returned invalid JSON while generating the frontend."
    );
  }

  validateGeneratedProject(parsed);

  return parsed;
}

export async function generateFrontend(
  provider: AIProvider,
  input: CodeGenerationInput
): Promise<GeneratedProject> {
  const request = buildCodeGenerationRequest(input);

  const response = await provider.generate(request);

  return parseGeneratedProject(response.content);
}