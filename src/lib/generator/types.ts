import type {
  GeneratedFile,
  WebsiteGenerationPlan,
} from "@/lib/ai/types";

import type { WebsiteAnalysis } from "@/lib/analyzer/types";

export interface CodeGenerationInput {
  analysis: WebsiteAnalysis;
  plan: WebsiteGenerationPlan;
}

export interface CodeGenerationRequest {
  prompt: string;
  analysis: WebsiteAnalysis;
  plan: WebsiteGenerationPlan;
}

export interface GeneratedProject {
  files: GeneratedFile[];
  entryFile: string;
}

export interface GeneratedProjectResult {
  project: GeneratedProject;
  provider: string;
  model: string;
}