/**
 * Google Gemini Provider Implementation
 * Supports Gemini Pro and other Google AI models
 */

import {
  AIProvider,
  AIMessage,
  AIGenerationOptions,
  AIGenerationResult,
  AIProviderConfig,
} from './base.js';

interface GeminiContent {
  role: string;
  parts: Array<{ text: string }>;
}

interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
    index: number;
    safetyRatings: any[];
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GeminiProvider extends AIProvider {
  private baseURL: string;

  constructor(config: AIProviderConfig) {
    super(
      {
        ...config,
        model: config.model || 'gemini-2.5-flash',
        baseURL: config.baseURL || 'https://generativelanguage.googleapis.com/v1beta',
        timeout: config.timeout || 60000,
        maxRetries: config.maxRetries || 3,
      },
      'Gemini'
    );
    this.baseURL = this.config.baseURL!;
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    // Gemini combines system and user messages
    const contents = this.convertMessages(messages);

    const requestBody: GeminiRequest = {
      contents,
      generationConfig: {
        temperature: options?.temperature ?? 0.7,
        topP: options?.topP ?? 1,
        maxOutputTokens: options?.maxTokens ?? 2000,
        stopSequences: options?.stopSequences,
      },
      safetySettings: [
        {
          category: 'HARM_CATEGORY_HARASSMENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_HATE_SPEECH',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
        {
          category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
          threshold: 'BLOCK_MEDIUM_AND_ABOVE',
        },
      ],
    };

    try {
      const response = await this.makeRequest(requestBody);
      return this.parseResponse(response);
    } catch (error) {
      throw new Error(
        `Gemini API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private convertMessages(messages: AIMessage[]): GeminiContent[] {
    const contents: GeminiContent[] = [];

    // Merge system message into first user message if present
    const systemMessage = messages.find((m) => m.role === 'system');
    const otherMessages = messages.filter((m) => m.role !== 'system');

    if (systemMessage && otherMessages.length > 0 && otherMessages[0] && otherMessages[0].role === 'user') {
      // Prepend system message to first user message
      contents.push({
        role: 'user',
        parts: [{ text: `${systemMessage.content}\n\n${otherMessages[0].content}` }],
      });

      // Add remaining messages
      for (let i = 1; i < otherMessages.length; i++) {
        const msg = otherMessages[i];
        if (msg) {
          contents.push(this.convertMessage(msg));
        }
      }
    } else {
      // No system message or different structure
      for (const msg of otherMessages) {
        contents.push(this.convertMessage(msg));
      }
    }

    return contents;
  }

  private convertMessage(message: AIMessage): GeminiContent {
    return {
      role: message.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: message.content }],
    };
  }

  private async makeRequest(body: GeminiRequest): Promise<GeminiResponse> {
    const url = `${this.baseURL}/models/${this.config.model}:generateContent?key=${this.config.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Gemini API request failed: ${response.status} ${response.statusText} - ${JSON.stringify(errorData)}`
      );
    }

    return await response.json() as GeminiResponse;
  }

  private parseResponse(response: GeminiResponse): AIGenerationResult {
    const candidate = response.candidates?.[0];

    if (!candidate) {
      throw new Error('No candidates returned from Gemini');
    }

    const text = candidate.content.parts.map((p) => p.text).join('');

    return {
      content: text,
      tokensUsed: response.usageMetadata
        ? {
            prompt: response.usageMetadata.promptTokenCount,
            completion: response.usageMetadata.candidatesTokenCount,
            total: response.usageMetadata.totalTokenCount,
          }
        : undefined,
      finishReason: candidate.finishReason,
      model: this.config.model,
    };
  }

  /**
   * List available Gemini models
   */
  static getAvailableModels(): string[] {
    return [
      // Gemini 3 (Latest - Most Intelligent)
      'gemini-3-pro',
      'gemini-3-deep-think',
      // Gemini 2.5 Series (Stable)
      'gemini-2.5-pro',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      // Gemini 2.0 Series
      'gemini-2.0-flash',
      // Legacy Gemini 1.5
      'gemini-1.5-pro',
      'gemini-1.5-flash',
    ];
  }
}
