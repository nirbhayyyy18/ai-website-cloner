import type { GeneratedFile } from "@/lib/ai/types";

export interface WebsiteModificationInput {
  projectId: string;
  prompt: string;
  files: GeneratedFile[];
}

export interface ModifiedFile {
  path: string;
  content: string;
}

export interface WebsiteModificationResult {
  files: ModifiedFile[];
  explanation: string;
}