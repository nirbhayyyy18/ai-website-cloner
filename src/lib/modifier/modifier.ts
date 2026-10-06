import type {
  AIProvider,
  GeneratedFile,
} from "@/lib/ai/types";

import type {
  WebsiteModificationInput,
  WebsiteModificationResult,
} from "./types";

const ALLOWED_FILE_PREFIXES = [
  "src/app/",
  "src/components/",
  "public/",
];

const ALLOWED_ROOT_FILES = [
  "src/app/page.tsx",
  "src/app/globals.css",
];

function isAllowedPath(
  filePath: string,
): boolean {
  if (
    filePath.includes("..") ||
    filePath.includes("\\") ||
    filePath.startsWith("/")
  ) {
    return false;
  }

  return (
    ALLOWED_ROOT_FILES.includes(filePath) ||
    ALLOWED_FILE_PREFIXES.some(
      (prefix) =>
        filePath.startsWith(prefix),
    )
  );
}

function validateModifiedFiles(
  files: unknown,
): GeneratedFile[] {
  if (!Array.isArray(files)) {
    throw new Error(
      "AI modification response must contain a files array.",
    );
  }

  const validated: GeneratedFile[] = [];

  for (const file of files) {
    if (
      typeof file !== "object" ||
      file === null ||
      typeof (file as { path?: unknown })
        .path !== "string" ||
      typeof (file as { content?: unknown })
        .content !== "string"
    ) {
      throw new Error(
        "AI returned an invalid modified file.",
      );
    }

    const filePath =
      (file as { path: string }).path;

    const content =
      (file as { content: string }).content;

    if (!isAllowedPath(filePath)) {
      throw new Error(
        `AI returned a disallowed file path: ${filePath}`,
      );
    }

    validated.push({
      path: filePath,
      content,
    });
  }

  if (validated.length === 0) {
    throw new Error(
      "AI did not return any modified files.",
    );
  }

  return validated;
}

function parseModificationResponse(
  content: string,
): WebsiteModificationResult {
  let cleaned = content.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(
        /^```(?:json)?\s*/i,
        "",
      )
      .replace(
        /\s*```$/i,
        "",
      )
      .trim();
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch {
    const firstBrace =
      cleaned.indexOf("{");

    const lastBrace =
      cleaned.lastIndexOf("}");

    if (
      firstBrace === -1 ||
      lastBrace === -1
    ) {
      throw new Error(
        "AI returned invalid JSON for the modification.",
      );
    }

    const jsonCandidate =
      cleaned.slice(
        firstBrace,
        lastBrace + 1,
      );

    try {
      parsed = JSON.parse(
        jsonCandidate,
      );
    } catch {
      throw new Error(
        "AI returned invalid JSON for the modification.",
      );
    }
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("files" in parsed)
  ) {
    throw new Error(
      "AI modification response is missing the files array.",
    );
  }

  const response =
    parsed as {
      files: unknown;
      explanation?: unknown;
    };

  const files =
    validateModifiedFiles(
      response.files,
    );

  const explanation =
    typeof response.explanation ===
    "string"
      ? response.explanation
      : "The generated website was modified according to the requested prompt.";

  return {
    files,
    explanation,
  };
}

function buildModificationRequest(
  input: WebsiteModificationInput,
): {
  system: string;
  user: string;
} {
  const fileContents =
    input.files
      .map(
        (file) =>
          `===== ${file.path} =====\n${file.content}\n===== END ${file.path} =====`,
      )
      .join("\n\n");

  return {
    system: `
You are an expert React and Next.js frontend modification agent.

Your job is to make a SMALL, TARGETED modification to an
ALREADY WORKING generated website.

The existing website has already been generated and validated.
Your most important responsibility is to PRESERVE the existing
design, layout, styling, content, components, responsiveness,
imports, and functionality.

The user wants a specific change.

==================================================
CORE MODIFICATION RULE
==================================================

Modify ONLY what is necessary to satisfy the user's request.

Do NOT redesign the website.

Do NOT rebuild the website.

Do NOT simplify the website.

Do NOT replace existing components with basic HTML.

Do NOT rewrite working components unnecessarily.

The existing implementation is the source of truth.

==================================================
PRESERVE EXISTING DESIGN
==================================================

You MUST preserve:

- Existing layout
- Existing spacing
- Existing typography
- Existing colors unless explicitly requested to change them
- Existing responsive behavior
- Existing navigation structure
- Existing sections
- Existing content
- Existing images and assets
- Existing buttons
- Existing links
- Existing component structure
- Existing Tailwind classes
- Existing CSS classes
- Existing animations
- Existing hover states
- Existing accessibility behavior
- Existing imports
- Existing functionality

If the user asks for a color change, change the relevant
existing color values/classes instead of redesigning the
component.

If the user asks for a sticky navbar, make the EXISTING navbar
sticky. Do not rebuild the navbar.

If the user asks for a new section, add the section while
preserving the existing sections.

==================================================
VERY IMPORTANT — STYLING
==================================================

The generated project may use Tailwind CSS and/or regular CSS.

Detect the styling approach from the existing files.

If the existing implementation uses Tailwind:

- Preserve existing Tailwind classes.
- Do NOT replace styled elements with unstyled HTML.
- Do NOT remove className attributes.
- Do NOT replace Tailwind layouts with default browser layouts.
- Continue using the existing Tailwind version and syntax.
- Do NOT introduce Tailwind v4 syntax.
- Do NOT remove existing responsive classes.

If the existing implementation uses CSS:

- Preserve the existing CSS architecture.
- Modify only the required selectors/rules.
- Do not replace the stylesheet with a minimal stylesheet.
- Do not remove unrelated styles.

NEVER intentionally turn a styled component into:

<div>
<button>
<a>
<h1>
<p>

without preserving its existing styling.

==================================================
GLOBALS.CSS
==================================================

If src/app/globals.css already contains styling:

PRESERVE IT.

Do NOT replace the entire stylesheet with a new stylesheet.

Only change the specific rules required by the user's request.

If the user's request does not require changes to globals.css,
do not modify globals.css.

==================================================
COMPONENTS
==================================================

Only modify a component when the user's request actually
requires that component to change.

For example:

User:
"Make the navbar sticky."

Prefer modifying:

src/components/Navbar.tsx

Do NOT unnecessarily modify:

- Footer.tsx
- CookieConsent.tsx
- LanguageSelector.tsx
- unrelated components
- page.tsx

User:
"Change the primary accent color to purple."

Modify the existing location where the accent color is defined
or used.

Do NOT rewrite the entire website.

==================================================
IMPORTS
==================================================

Preserve all existing imports unless a requested change
actually requires an import to change.

Never remove:

- CSS imports
- component imports
- asset imports
- utility imports

Do not create empty imports.

Never generate:

import Something from "";

Never remove:

import "./globals.css";

if it already exists.

==================================================
NEXT.JS RULES
==================================================

Use Next.js App Router correctly.

Do not introduce:

- next/document
- Pages Router APIs
- iframe
- embedded original website
- original website HTML
- external website embedding

If a component uses React hooks such as:

useState
useEffect
useRef

preserve or add the correct:

"use client";

directive.

==================================================
MODIFICATION SCOPE
==================================================

Return ONLY files that actually need modification.

For a small request, normally modify 1–3 files.

Do not modify five or more files unless the requested change
genuinely requires it.

If a file does not need to change, DO NOT return it.

==================================================
IMPORTANT EXAMPLES
==================================================

Request:

"Make the navbar sticky."

GOOD:
- Modify existing Navbar component.
- Preserve all existing classes.
- Add the minimum required sticky positioning.
- Preserve responsive behavior.

BAD:
- Rebuild Navbar.
- Replace navigation with plain links.
- Rewrite page.tsx.
- Remove existing styling.

Request:

"Change the primary accent color to purple."

GOOD:
- Find existing accent color usage.
- Replace only relevant accent values/classes.
- Preserve all other styling.

BAD:
- Rewrite components.
- Replace Tailwind classes with plain HTML.
- Remove existing CSS.

Request:

"Add a testimonials section."

GOOD:
- Keep the existing page.
- Add a reusable Testimonials component.
- Preserve all existing sections and styles.

BAD:
- Rewrite the entire page.

==================================================
FILE RULES
==================================================

Only modify files inside:

- src/app/
- src/components/
- public/

Return COMPLETE contents for every modified file.

Do not return unchanged files.

Never return files outside the allowed paths.

==================================================
JSON OUTPUT
==================================================

Return ONLY valid JSON.

Do not use Markdown code fences.

Required format:

{
  "files": [
    {
      "path": "src/components/Navbar.tsx",
      "content": "complete file contents"
    }
  ],
  "explanation": "Short explanation of the exact changes made."
}

Before returning your answer, verify:

1. The existing design is preserved.
2. The existing styling is preserved.
3. The requested change is implemented.
4. Unrelated files were not modified.
5. Existing className values were not unnecessarily removed.
6. Existing imports were preserved.
7. The result remains responsive.
8. The result remains valid React/Next.js.
9. The response is valid JSON.
`.trim(),

    user: `
Project ID:
${input.projectId}

USER REQUEST:
${input.prompt}

CURRENT GENERATED PROJECT:

${fileContents}

==================================================
TASK
==================================================

Make ONLY the requested modification.

Preserve the existing website as much as possible.

Do not rebuild or redesign it.

Return only the files that genuinely need to change.

Return complete file contents for those files.

Return ONLY valid JSON.
`.trim(),
  };
}

export async function modifyWebsite(
  provider: AIProvider,
  input: WebsiteModificationInput,
): Promise<
  WebsiteModificationResult & {
    provider: string;
    model: string;
  }
> {
  if (!input.prompt.trim()) {
    throw new Error(
      "Modification prompt cannot be empty.",
    );
  }

  if (input.files.length === 0) {
    throw new Error(
      "No generated project files were provided.",
    );
  }

  const request =
    buildModificationRequest(input);

  const response =
    await provider.generate({
      messages: [
        {
          role: "system",
          content: request.system,
        },
        {
          role: "user",
          content: request.user,
        },
      ],
      temperature: 0.1,
      maxTokens: 12000,
    });

  const result =
    parseModificationResponse(
      response.content,
    );

  return {
    ...result,
    provider: response.provider,
    model: response.model,
  };
}