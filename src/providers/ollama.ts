/**
 * Ollama Provider Implementation
 * Supports local LLMs running via Ollama
 */

import {
  AIProvider,
  AIMessage,
  AIGenerationOptions,
  AIGenerationResult,
  AIProviderConfig,
} from './base.js';

interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OllamaRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    num_predict?: number;
    stop?: string[];
  };
}

interface OllamaResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

export class OllamaProvider extends AIProvider {
  private baseURL: string;

  constructor(config: AIProviderConfig) {
    super(
      {
        ...config,
        apiKey: config.apiKey || 'not-required', // Ollama doesn't require API key
        model: config.model || 'llama2',
        baseURL: config.baseURL || 'http://localhost:11434',
        timeout: config.timeout || 120000, // Local models may be slower
        maxRetries: config.maxRetries || 3,
      },
      'Ollama'
    );
    this.baseURL = this.config.baseURL!;
  }

  protected validateConfig(): void {
    // Ollama doesn't require API key, so we skip that validation
    if (!this.config.model) {
      throw new Error(`${this.providerName}: Model name is required`);
    }
  }

  async generate(
    messages: AIMessage[],
    options?: AIGenerationOptions
  ): Promise<AIGenerationResult> {
    const ollamaMessages: OllamaMessage[] = messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    const requestBody: OllamaRequest = {
      model: this.config.model!,
      messages: ollamaMessages,
      stream: false,
      options: {
        temperature: options?.temperature ?? 0.7,
        top_p: options?.topP ?? 1,
        num_predict: options?.maxTokens ?? 2000,
        stop: options?.stopSequences,
      },
    };

    try {
      const response = await this.makeRequest(requestBody);
      return this.parseResponse(response);
    } catch (error) {
      throw new Error(
        `Ollama API error: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async makeRequest(body: OllamaRequest): Promise<OllamaResponse> {
    const url = `${this.baseURL}/api/chat`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Ollama API request failed: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    return await response.json() as OllamaResponse;
  }

  private parseResponse(response: OllamaResponse): AIGenerationResult {
    if (!response.message) {
      throw new Error('No message returned from Ollama');
    }

    return {
      content: response.message.content,
      tokensUsed: response.prompt_eval_count && response.eval_count
        ? {
            prompt: response.prompt_eval_count,
            completion: response.eval_count,
            total: response.prompt_eval_count + response.eval_count,
          }
        : undefined,
      finishReason: response.done ? 'stop' : 'length',
      model: response.model,
    };
  }

  /**
   * List models available in the Ollama instance
   */
  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`);

      if (!response.ok) {
        throw new Error(`Failed to list models: ${response.statusText}`);
      }

      const data: any = await response.json();
      return data.models?.map((m: any) => m.name) || [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  }

  /**
   * Pull a model from Ollama registry
   */
  async pullModel(modelName: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/pull`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: modelName }),
      });

      return response.ok;
    } catch (error) {
      console.error(`Failed to pull model ${modelName}:`, error);
      return false;
    }
  }

  /**
   * Common Ollama models
   */
  static getCommonModels(): string[] {
    return [
      'llama2',
      'llama2:13b',
      'llama2:70b',
      'codellama',
      'codellama:13b',
      'codellama:34b',
      'mistral',
      'mixtral',
      'neural-chat',
      'starling-lm',
      'phi',
      'orca-mini',
      'vicuna',
    ];
  }

  /**
   * Check if Ollama is running
   */
  async isRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
