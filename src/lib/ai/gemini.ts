import type {
  AIProvider,
  AIRequest,
  AIResponse,
} from "./types";

interface GeminiConfig {
  apiKey: string;
  model: string;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
  }>;
  error?: {
    message?: string;
  };
}

export class GeminiProvider implements AIProvider {
  name = "gemini" as const;
  model: string;

  private readonly apiKey: string;

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model;
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const contents = request.messages
      .filter((message) => message.role !== "assistant")
      .map((message) => ({
        role: message.role === "system" ? "user" : "user",
        parts: [
          {
            text: message.content,
          },
        ],
      }));

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: request.temperature ?? 0.2,
            maxOutputTokens: request.maxTokens ?? 4000,
          },
        }),
      },
    );

    const data =
      (await response.json()) as GeminiResponse;

    if (!response.ok) {
      throw new Error(
        `Gemini API request failed (${response.status}): ${
          data.error?.message ?? "Unknown Gemini API error."
        }`,
      );
    }

    const content = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("")
      .trim();

    if (!content) {
      throw new Error(
        "Gemini API returned an empty response.",
      );
    }

    return {
      content,
      provider: this.name,
      model: this.model,
    };
  }
}