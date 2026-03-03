/**
 * Model Pricing Database
 *
 * Up-to-date pricing for 20+ LLM models.
 * Prices in USD per 1M tokens.
 *
 * Last updated: 2025-03-03
 */

export interface ModelPricing {
  model: string;
  provider: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  cacheCostPer1M?: number; // For models with prompt caching
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  // Anthropic Claude Models
  'claude-3-5-sonnet-20241022': {
    model: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
    cacheCostPer1M: 0.30,
  },
  'claude-3-5-haiku-20241022': {
    model: 'claude-3-5-haiku-20241022',
    provider: 'anthropic',
    inputCostPer1M: 1.00,
    outputCostPer1M: 5.00,
    cacheCostPer1M: 0.10,
  },
  'claude-3-opus-20240229': {
    model: 'claude-3-opus-20240229',
    provider: 'anthropic',
    inputCostPer1M: 15.00,
    outputCostPer1M: 75.00,
    cacheCostPer1M: 1.50,
  },

  // OpenAI GPT Models
  'gpt-4o': {
    model: 'gpt-4o',
    provider: 'openai',
    inputCostPer1M: 5.00,
    outputCostPer1M: 15.00,
  },
  'gpt-4o-mini': {
    model: 'gpt-4o-mini',
    provider: 'openai',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
  },
  'gpt-4-turbo': {
    model: 'gpt-4-turbo',
    provider: 'openai',
    inputCostPer1M: 10.00,
    outputCostPer1M: 30.00,
  },
  'gpt-4': {
    model: 'gpt-4',
    provider: 'openai',
    inputCostPer1M: 30.00,
    outputCostPer1M: 60.00,
  },
  'gpt-3.5-turbo': {
    model: 'gpt-3.5-turbo',
    provider: 'openai',
    inputCostPer1M: 0.50,
    outputCostPer1M: 1.50,
  },

  // Google Gemini Models
  'gemini-2.0-flash-exp': {
    model: 'gemini-2.0-flash-exp',
    provider: 'google',
    inputCostPer1M: 0.00, // Free during preview
    outputCostPer1M: 0.00,
  },
  'gemini-1.5-pro': {
    model: 'gemini-1.5-pro',
    provider: 'google',
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
  },
  'gemini-1.5-flash': {
    model: 'gemini-1.5-flash',
    provider: 'google',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
  },

  // Mistral AI Models
  'mistral-large-latest': {
    model: 'mistral-large-latest',
    provider: 'mistral',
    inputCostPer1M: 3.00,
    outputCostPer1M: 9.00,
  },
  'mistral-small-latest': {
    model: 'mistral-small-latest',
    provider: 'mistral',
    inputCostPer1M: 1.00,
    outputCostPer1M: 3.00,
  },

  // Cohere Models
  'command-r-plus': {
    model: 'command-r-plus',
    provider: 'cohere',
    inputCostPer1M: 3.00,
    outputCostPer1M: 15.00,
  },
  'command-r': {
    model: 'command-r',
    provider: 'cohere',
    inputCostPer1M: 0.50,
    outputCostPer1M: 1.50,
  },

  // Meta Llama Models (via various providers)
  'llama-3.1-405b': {
    model: 'llama-3.1-405b',
    provider: 'meta',
    inputCostPer1M: 3.00,
    outputCostPer1M: 3.00,
  },
  'llama-3.1-70b': {
    model: 'llama-3.1-70b',
    provider: 'meta',
    inputCostPer1M: 0.88,
    outputCostPer1M: 0.88,
  },
  'llama-3.1-8b': {
    model: 'llama-3.1-8b',
    provider: 'meta',
    inputCostPer1M: 0.20,
    outputCostPer1M: 0.20,
  },

  // Groq (fast inference)
  'llama-3.1-70b-versatile': {
    model: 'llama-3.1-70b-versatile',
    provider: 'groq',
    inputCostPer1M: 0.59,
    outputCostPer1M: 0.79,
  },
  'mixtral-8x7b': {
    model: 'mixtral-8x7b',
    provider: 'groq',
    inputCostPer1M: 0.27,
    outputCostPer1M: 0.27,
  },
};

/**
 * Get pricing for a model (with fuzzy matching)
 */
export function getModelPricing(model: string): ModelPricing | null {
  // Exact match
  if (MODEL_PRICING[model]) {
    return MODEL_PRICING[model];
  }

  // Fuzzy match (e.g., "gpt-4o-2024-05-13" matches "gpt-4o")
  const modelLower = model.toLowerCase();

  for (const [key, pricing] of Object.entries(MODEL_PRICING)) {
    if (modelLower.includes(key.toLowerCase()) || key.toLowerCase().includes(modelLower)) {
      return pricing;
    }
  }

  return null;
}
