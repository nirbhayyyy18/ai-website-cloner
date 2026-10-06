import type {
  AIProvider,
  AIRequest,
  AIResponse,
} from "./types";

interface OpenAICompatibleConfig {
  name: "openai" | "openrouter";
  apiKey: string;
  model: string;
  baseUrl: string;
}

interface OpenAICompatibleResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

export class OpenAICompatibleProvider implements AIProvider {
  name: "openai" | "openrouter";
  model: string;

  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: OpenAICompatibleConfig) {
    this.name = config.name;
    this.model = config.model;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },

      body: JSON.stringify({
        model: this.model,
        messages: request.messages,
        temperature: request.temperature ?? 0.2,
        max_tokens: request.maxTokens ?? 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `${this.name} API request failed (${response.status}): ${errorText}`
      );
    }

    const data =
      (await response.json()) as OpenAICompatibleResponse;

    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error(
        `${this.name} API returned an empty response.`
      );
    }

    return {
      content,
      provider: this.name,
      model: this.model,
    };
  }
}