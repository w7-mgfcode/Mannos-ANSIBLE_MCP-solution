/**
 * Anthropic Provider Implementation
 * Supports Claude 3 family models (Opus, Sonnet, Haiku)
 */

import {
  AIProvider,
  AIMessage,
  AIGenerationOptions,
  AIGenerationResult,
  AIProviderConfig,
} from './base.js';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: Array<{
    type: string;
    text: string;
  }>;
  model: string;
  stop_reason: string;
  stop_sequence: string | null;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider extends AIProvider {
  private baseURL: string;
  private apiVersion: string;

  constructor(config: AIProviderConfig) {
    super(
      {
        ...config,
        model: config.model || 'claude-sonnet-4-5-20250929',
        baseURL: config.baseURL || 'https://api.anthropic.com/v1',
        timeout: config.timeout || 60000,
        maxRetries: config.maxRetries || 3,
      },
      'Anthropic'
    );
    this.baseURL = this.config.baseURL!;
    this.apiVersion = '2023-06-01';
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    // Anthropic requires system message to be separate
    const systemMessage = messages.find((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const anthropicMessages: AnthropicMessage[] = conversationMessages.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const requestBody: any = {
      model: this.config.model,
      messages: anthropicMessages,
      max_tokens: options?.maxTokens ?? 2000,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP ?? 1,
    };

    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    if (options?.stopSequences && options.stopSequences.length > 0) {
      requestBody.stop_sequences = options.stopSequences;
    }

    try {
      const response = await this.makeRequest(requestBody);
      return this.parseResponse(response);
    } catch (error) {
      throw new Error(
        `Anthropic API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async makeRequest(body: any): Promise<AnthropicResponse> {
    const url = `${this.baseURL}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.apiKey,
        'anthropic-version': this.apiVersion,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Anthropic API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    return await response.json() as AnthropicResponse;
  }

  private parseResponse(response: AnthropicResponse): AIGenerationResult {
    const textContent = response.content.find((c) => c.type === 'text');

    if (!textContent) {
      throw new Error('No text content returned from Anthropic');
    }

    return {
      content: textContent.text,
      tokensUsed: {
        prompt: response.usage.input_tokens,
        completion: response.usage.output_tokens,
        total: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: response.stop_reason,
      model: response.model,
    };
  }

  /**
   * List available Anthropic models
   */
  static getAvailableModels(): string[] {
    return [
      // Claude 4.5 Series (Latest)
      'claude-sonnet-4-5-20250929',
      'claude-haiku-4-5-20251015',
      // Claude 4 Series
      'claude-opus-4-1-20250805',
      'claude-sonnet-4-20250522',
      'claude-opus-4-20250522',
      // Claude 3.5 Series (Legacy but available)
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      // Note: Claude 3 Opus deprecated June 2025, retiring Jan 2026
      // Note: Claude 3 Sonnet and Claude 2.1 retired July 2025
    ];
  }
}
