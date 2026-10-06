import type {
  AIProvider,
  AIRequest,
  WebsiteGenerationPlan,
  WebsitePlanningInput,
} from "./types";

export function buildPlanningRequest({
  analysis,
}: WebsitePlanningInput): AIRequest {
  return {
    temperature: 0.2,
    maxTokens: 4000,

    messages: [
      {
        role: "system",
        content: `
You are a senior frontend architect.

Your task is to analyze structured website information and create a
frontend implementation plan for a React/Next.js application.

Important rules:

1. The generated website must be a NEW frontend implementation.
2. Do NOT use iframe, embed, or simply copy the original HTML.
3. The plan must work for arbitrary websites.
4. Use reusable React components.
5. Preserve the visual structure, hierarchy, spacing, typography,
   colors, navigation and responsive behavior found in the analysis.
6. The implementation must support desktop, tablet and mobile layouts.
7. Prefer clean TypeScript and Next.js App Router conventions.
8. Use the analyzed assets where appropriate.
9. Do not invent major sections that are not supported by the analysis.
10. Return ONLY valid JSON.
11. Do not wrap the JSON in markdown code fences.
12. Every file must have a non-empty "path" and "purpose".
13. The "component" field in a file is OPTIONAL.
14. Only include "component" when the file belongs to a specific
    React component.
15. For files such as globals.css, layout.tsx, configuration files,
    or other non-component files, OMIT the "component" field entirely.
16. NEVER return "component": "".
17. Do not return empty strings for optional fields.

Return JSON using exactly this structure:

{
  "pageStructure": [
    "string"
  ],
  "components": [
    {
      "name": "string",
      "description": "string",
      "responsibilities": [
        "string"
      ],
      "props": [
        "string"
      ],
      "responsiveBehavior": "string"
    }
  ],
  "files": [
    {
      "path": "string",
      "purpose": "string",
      "component": "string"
    }
  ],
  "stylingStrategy": "string",
  "responsiveStrategy": "string",
  "assetStrategy": "string"
}

For files that are NOT React components, use this form:

{
  "path": "src/app/globals.css",
  "purpose": "Global styles"
}

For React component files, use this form:

{
  "path": "src/components/Hero.tsx",
  "purpose": "Hero section component",
  "component": "Hero"
}

Allowed generated frontend paths should normally be limited to:

- src/app/page.tsx
- src/app/globals.css
- src/components/*
- public/*

The plan should be implementation-oriented and specific enough for
another AI agent to generate the actual frontend code.
        `.trim(),
      },

      {
        role: "user",
        content: `
Create a frontend generation plan from the following website analysis.

WEBSITE ANALYSIS:

${JSON.stringify(analysis, null, 2)}
        `.trim(),
      },
    ],
  };
}

function assertString(
  value: unknown,
  field: string,
): asserts value is string {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(
      `Invalid AI plan: "${field}" must be a non-empty string.`,
    );
  }
}

function assertStringArray(
  value: unknown,
  field: string,
): asserts value is string[] {
  if (
    !Array.isArray(value) ||
    value.some((item) => typeof item !== "string")
  ) {
    throw new Error(
      `Invalid AI plan: "${field}" must be an array of strings.`,
    );
  }
}

function validateGenerationPlan(
  value: unknown,
): asserts value is WebsiteGenerationPlan {
  if (!value || typeof value !== "object") {
    throw new Error("Invalid AI plan: expected a JSON object.");
  }

  const plan = value as Record<string, unknown>;

  assertStringArray(plan.pageStructure, "pageStructure");

  if (!Array.isArray(plan.components)) {
    throw new Error(
      'Invalid AI plan: "components" must be an array.',
    );
  }

  for (const component of plan.components) {
    if (!component || typeof component !== "object") {
      throw new Error(
        "Invalid AI plan: component must be an object.",
      );
    }

    const item = component as Record<string, unknown>;

    assertString(item.name, "components[].name");
    assertString(item.description, "components[].description");

    assertStringArray(
      item.responsibilities,
      "components[].responsibilities",
    );

    if (item.props !== undefined) {
      assertStringArray(item.props, "components[].props");
    }

    if (item.responsiveBehavior !== undefined) {
      assertString(
        item.responsiveBehavior,
        "components[].responsiveBehavior",
      );
    }
  }

  if (!Array.isArray(plan.files)) {
    throw new Error(
      'Invalid AI plan: "files" must be an array.',
    );
  }

  for (const file of plan.files) {
    if (!file || typeof file !== "object") {
      throw new Error(
        "Invalid AI plan: file must be an object.",
      );
    }

    const item = file as Record<string, unknown>;

    assertString(item.path, "files[].path");
    assertString(item.purpose, "files[].purpose");

    /*
     * component is optional.
     *
     * Gemini may occasionally return:
     *
     * "component": ""
     *
     * Instead of failing the entire plan, treat an empty optional
     * component value as if the field was omitted.
     */
    if (typeof item.component === "string") {
      if (!item.component.trim()) {
        delete item.component;
      }
    } else if (item.component !== undefined) {
      throw new Error(
        'Invalid AI plan: "files[].component" must be a string when provided.',
      );
    }
  }

  assertString(plan.stylingStrategy, "stylingStrategy");
  assertString(
    plan.responsiveStrategy,
    "responsiveStrategy",
  );
  assertString(plan.assetStrategy, "assetStrategy");
}

export function parseGenerationPlan(
  content: string,
): WebsiteGenerationPlan {
  let parsed: unknown;

  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error(
      "AI returned invalid JSON while creating the generation plan.",
    );
  }

  validateGenerationPlan(parsed);

  return parsed;
}

export async function planWebsite(
  provider: AIProvider,
  input: WebsitePlanningInput,
): Promise<WebsiteGenerationPlan> {
  const request = buildPlanningRequest(input);

  const response = await provider.generate(request);

  return parseGenerationPlan(response.content);
}