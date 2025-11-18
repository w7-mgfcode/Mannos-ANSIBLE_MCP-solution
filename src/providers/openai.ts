/**
 * OpenAI Provider Implementation
 * Supports GPT-4, GPT-3.5-turbo, and other OpenAI models
 */

import {
  AIProvider,
  AIMessage,
  AIGenerationOptions,
  AIGenerationResult,
  AIProviderConfig,
} from './base.js';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider extends AIProvider {
  private baseURL: string;

  constructor(config: AIProviderConfig) {
    super(
      {
        ...config,
        model: config.model || 'gpt-4',
        baseURL: config.baseURL || 'https://api.openai.com/v1',
        timeout: config.timeout || 60000,
        maxRetries: config.maxRetries || 3,
      },
      'OpenAI'
    );
    this.baseURL = this.config.baseURL!;
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    const openAIMessages: OpenAIMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const requestBody = {
      model: this.config.model,
      messages: openAIMessages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 2000,
      top_p: options?.topP ?? 1,
      stop: options?.stopSequences,
      stream: false,
    };

    try {
      const response = await this.makeRequest(requestBody);
      return this.parseResponse(response);
    } catch (error) {
      throw new Error(`OpenAI API error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async makeRequest(body: any): Promise<OpenAIResponse> {
    const url = `${this.baseURL}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    return await response.json() as OpenAIResponse;
  }

  private parseResponse(response: OpenAIResponse): AIGenerationResult {
    const choice = response.choices[0];

    if (!choice) {
      throw new Error('No completion choices returned from OpenAI');
    }

    return {
      content: choice.message.content,
      tokensUsed: {
        prompt: response.usage.prompt_tokens,
        completion: response.usage.completion_tokens,
        total: response.usage.total_tokens,
      },
      finishReason: choice.finish_reason,
      model: response.model,
    };
  }

  /**
   * List available OpenAI models
   */
  static getAvailableModels(): string[] {
    return [
      'gpt-4',
      'gpt-4-turbo-preview',
      'gpt-4-0125-preview',
      'gpt-4-1106-preview',
      'gpt-3.5-turbo',
      'gpt-3.5-turbo-16k',
      'gpt-3.5-turbo-0125',
    ];
  }
}
