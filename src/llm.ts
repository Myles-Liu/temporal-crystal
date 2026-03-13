/**
 * LLM integration for intelligent compression.
 *
 * Supports multiple providers via a simple adapter pattern.
 * Default: OpenAI-compatible API (works with OpenAI, Anthropic proxy, local models).
 */

export interface LLMProvider {
  complete(prompt: string, options?: LLMOptions): Promise<string>;
}

export interface LLMOptions {
  maxTokens?: number;
  temperature?: number;
  model?: string;
}

export interface LLMConfig {
  provider: "openai" | "custom";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

/**
 * OpenAI-compatible LLM provider.
 * Works with OpenAI, Azure, local proxies, etc.
 */
export class OpenAIProvider implements LLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private defaultModel: string;

  constructor(config: LLMConfig) {
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || "";
    this.baseUrl = config.baseUrl || process.env.OPENAI_BASE_URL || "https://api.openai.com/v1";
    this.defaultModel = config.model || process.env.TC_MODEL || "gpt-4o-mini";
  }

  async complete(prompt: string, options?: LLMOptions): Promise<string> {
    const url = `${this.baseUrl}/chat/completions`;
    const body = {
      model: options?.model || this.defaultModel,
      messages: [{ role: "user", content: prompt }],
      max_tokens: options?.maxTokens || 500,
      temperature: options?.temperature ?? 0.3,
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`LLM API error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as any;
    return data.choices?.[0]?.message?.content?.trim() || "";
  }
}

/**
 * Simple fallback — no LLM, just rule-based.
 */
export class NoopProvider implements LLMProvider {
  async complete(_prompt: string): Promise<string> {
    return "";
  }
}

// --- Prompt templates ---

export const PROMPTS = {
  compressWeekly: (memories: string) => `You are a memory compression engine. Summarize these daily memories into a concise weekly summary.
Preserve: key decisions, important facts, action items, lessons learned.
Drop: routine activities, redundant info, filler.

Memories:
${memories}

Write a concise weekly summary (2-4 sentences):`,

  compressMonthly: (weeklySummaries: string) => `You are a memory compression engine. Distill these weekly summaries into monthly patterns and insights.
Focus on: recurring themes, trends, key achievements, evolving priorities.

Weekly summaries:
${weeklySummaries}

Write a concise monthly abstract (2-3 sentences):`,

  crystallize: (memories: string, tag: string) => `You are a knowledge crystallization engine. Extract a permanent insight from these related memories.
The insight should be a reusable lesson, principle, or pattern — something worth remembering forever.

Tag/theme: ${tag}
Related memories:
${memories}

Write one clear, actionable insight (1-2 sentences):`,

  dream: (memories: string) => `You are a creative association engine. Given these random memories from different times, find unexpected connections, insights, or creative ideas.

Random memory sample:
${memories}

Describe 1-2 surprising connections or insights you notice:`,

  recall: (query: string, memories: string) => `Given this query, rank which memories are most relevant. Return the IDs of the top matches, most relevant first.

Query: ${query}

Memories:
${memories}

Return a JSON array of the most relevant memory IDs (max 5): ["id1", "id2", ...]`,
};

export function createProvider(config?: LLMConfig): LLMProvider {
  if (!config || !config.apiKey) {
    // Try env
    const key = process.env.OPENAI_API_KEY;
    if (key) {
      return new OpenAIProvider({ provider: "openai", apiKey: key });
    }
    return new NoopProvider();
  }
  return new OpenAIProvider(config);
}
