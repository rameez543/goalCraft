import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// LLM Providers
let openaiClient: OpenAI | null = null;
let anthropicClient: Anthropic | null = null;

// Initialize OpenAI client if API key is available
if (process.env.OPENAI_API_KEY) {
  openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Initialize Anthropic client if API key is available
if (process.env.ANTHROPIC_API_KEY) {
  anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

// The provider to use (default to OpenAI)
export const LLM_PROVIDER = process.env.LLM_PROVIDER || 'openai';

// Get the appropriate model for the selected provider
export function getModel(defaultModel = 'gpt-4o-mini'): string {
  if (LLM_PROVIDER === 'anthropic') {
    // the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
    return process.env.ANTHROPIC_MODEL || 'claude-3-7-sonnet-20250219';
  } else if (LLM_PROVIDER === 'deepseek') {
    return process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  } else if (LLM_PROVIDER === 'grok') {
    return process.env.GROK_MODEL || 'grok-2-1212';
  } else {
    // Default to OpenAI
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024
    return process.env.OPENAI_MODEL || defaultModel;
  }
}

/**
 * Make a completion request to the selected LLM provider
 */
export async function generateCompletion(params: {
  systemPrompt?: string;
  userPrompt: string;
  model?: string;
  responseFormat?: 'json_object' | 'text';
}): Promise<string> {
  const { systemPrompt, userPrompt, model, responseFormat } = params;
  
  try {
    if (LLM_PROVIDER === 'anthropic' && anthropicClient) {
      const messages = [];
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }
      messages.push({
        role: 'user',
        content: userPrompt,
      });

      const response = await anthropicClient.messages.create({
        model: model || getModel(),
        max_tokens: 4000,
        messages,
        system: systemPrompt,
      });

      return response.content[0].text;
    } else if (openaiClient) {
      // Default to OpenAI
      const messages = [];
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }
      messages.push({
        role: 'user',
        content: userPrompt,
      });

      const response = await openaiClient.chat.completions.create({
        model: model || getModel(),
        messages,
        response_format: responseFormat === 'json_object' ? { type: 'json_object' } : undefined,
      });

      return response.choices[0].message.content || '';
    } else {
      console.warn('No LLM provider available, returning fallback response');
      return 'No LLM provider available. Please check your API keys.';
    }
  } catch (error) {
    console.error('Error generating completion:', error);
    throw error;
  }
}

/**
 * Check if the selected LLM provider is available
 */
export function isLLMAvailable(): boolean {
  if (LLM_PROVIDER === 'anthropic') {
    return !!anthropicClient;
  } else {
    // Default to OpenAI
    return !!openaiClient;
  }
}