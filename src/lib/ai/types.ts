import type { WebsiteAnalysis } from "@/lib/analyzer/types";

export type AIProviderName =
  | "openai"
  | "gemini"
  | "openrouter";

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIRequest {
  messages: AIMessage[];

  temperature?: number;

  maxTokens?: number;
}

export interface AIResponse {
  content: string;

  provider: AIProviderName;

  model: string;
}

export interface AIProvider {
  name: AIProviderName;

  model: string;

  generate(request: AIRequest): Promise<AIResponse>;
}

/**
 * Input provided to the AI planning stage.
 *
 * The planner receives the structured website analysis
 * produced by Playwright and converts it into a frontend plan.
 */
export interface WebsitePlanningInput {
  analysis: WebsiteAnalysis;
}

/**
 * A single component that the AI decides should exist
 * in the generated frontend.
 */
export interface ComponentPlan {
  name: string;

  description: string;

  responsibilities: string[];

  props?: string[];

  responsiveBehavior?: string;
}

/**
 * A file that the AI decides should be generated.
 */
export interface FilePlan {
  path: string;

  purpose: string;

  component?: string;
}

/**
 * Complete plan produced before code generation.
 */
export interface WebsiteGenerationPlan {
  pageStructure: string[];

  components: ComponentPlan[];

  files: FilePlan[];

  stylingStrategy: string;

  responsiveStrategy: string;

  assetStrategy: string;
}

/**
 * Input for the code-generation stage.
 */
export interface CodeGenerationInput {
  analysis: WebsiteAnalysis;

  plan: WebsiteGenerationPlan;
}

/**
 * AI-generated source file.
 */
export interface GeneratedFile {
  path: string;

  content: string;
}

/**
 * Complete generated frontend.
 */
export interface GeneratedProject {
  files: GeneratedFile[];

  entryFile: string;
}