import { GeminiProvider } from "./gemini";
import { OpenAICompatibleProvider } from "./openai-compatible";

import type {
  AIProvider,
  AIProviderName,
  AIRequest,
  AIResponse,
} from "./types";

class MissingAIProvider implements AIProvider {
  name: AIProviderName = "openai";
  model = "not-configured";

  async generate(request: AIRequest): Promise<AIResponse> {
    void request;

    throw new Error(
      "AI provider is not configured. Set AI_PROVIDER and the corresponding API key before generating frontend code.",
    );
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();

  switch (provider) {
    case "openai":
      return createOpenAIProvider();

    case "gemini":
      return createGeminiProvider();

    case "openrouter":
      return createOpenRouterProvider();

    default:
      return new MissingAIProvider();
  }
}

function createOpenAIProvider(): AIProvider {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL;

  if (!apiKey) {
    return new MissingAIProvider();
  }

  return new OpenAICompatibleProvider({
    name: "openai",
    apiKey,
    model: model || "gpt-4o-mini",
    baseUrl: "https://api.openai.com/v1",
  });
}

function createGeminiProvider(): AIProvider {
  const apiKey = process.env.GEMINI_API_KEY;
  const model =
    process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";

  if (!apiKey) {
    return {
      name: "gemini",
      model: "not-configured",

      async generate(request: AIRequest): Promise<AIResponse> {
        void request;

        throw new Error(
          "Gemini provider is selected but GEMINI_API_KEY is not configured.",
        );
      },
    };
  }

  return new GeminiProvider({
    apiKey,
    model,
  });
}

function createOpenRouterProvider(): AIProvider {
  const apiKey = process.env.OPENROUTER_API_KEY;
  const model = process.env.OPENROUTER_MODEL;

  if (!apiKey) {
    return new MissingAIProvider();
  }

  return new OpenAICompatibleProvider({
    name: "openrouter",
    apiKey,
    model: model || "openai/gpt-4o-mini",
    baseUrl: "https://openrouter.ai/api/v1",
  });
}