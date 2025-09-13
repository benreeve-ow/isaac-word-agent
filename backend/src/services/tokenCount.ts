import { encoding_for_model, TiktokenModel } from "tiktoken";

// Cache the encoder to avoid re-initialization
let encoder: ReturnType<typeof encoding_for_model> | null = null;

/**
 * Get the tiktoken encoder for Claude models
 * Claude uses a similar tokenization to GPT models
 * We'll use cl100k_base which is close to Claude's tokenization
 */
function getEncoder() {
  if (!encoder) {
    // Use GPT-4's tokenizer as it's closest to Claude's
    // This gives us accurate estimates for Claude models
    encoder = encoding_for_model("gpt-4" as TiktokenModel);
  }
  return encoder;
}

/**
 * Count tokens in a message array
 * Provides accurate token counting for context management
 */
export async function countTokens(payload: { 
  messages: {role:"user"|"assistant"|"system"; content:any}[] 
}): Promise<number> {
  const enc = getEncoder();
  let totalTokens = 0;
  
  // Count tokens for each message
  for (const message of payload.messages) {
    // Convert content to string if needed
    const content = typeof message.content === "string" 
      ? message.content 
      : JSON.stringify(message.content);
    
    // Add tokens for the message content
    const contentTokens = enc.encode(content).length;
    
    // Add overhead for message structure (role, etc.)
    // Typically 3-4 tokens per message for formatting
    const messageOverhead = 4;
    
    totalTokens += contentTokens + messageOverhead;
  }
  
  return totalTokens;
}

/**
 * Count tokens in a single string
 * Useful for measuring individual tool responses
 */
export function countStringTokens(text: string): number {
  const enc = getEncoder();
  return enc.encode(text).length;
}

/**
 * Estimate remaining tokens in context
 * Returns percentage and absolute count
 */
export function estimateRemainingTokens(usedTokens: number): {
  remaining: number;
  percentage: number;
  nearLimit: boolean;
} {
  const limit = parseInt(process.env.CONTEXT_INPUT_BUDGET_TOKENS || "160000");
  const safetyMargin = parseInt(process.env.CONTEXT_SAFETY_MARGIN || "5000");
  
  const remaining = limit - usedTokens;
  const percentage = (remaining / limit) * 100;
  const nearLimit = remaining < safetyMargin;
  
  return {
    remaining,
    percentage,
    nearLimit
  };
}

/**
 * Token usage statistics for logging
 */
export interface TokenStats {
  messageCount: number;
  totalTokens: number;
  averagePerMessage: number;
  remainingTokens: number;
  percentageUsed: number;
  nearLimit: boolean;
}

/**
 * Calculate comprehensive token statistics
 */
export async function calculateTokenStats(messages: any[]): Promise<TokenStats> {
  const totalTokens = await countTokens({ messages });
  const stats = estimateRemainingTokens(totalTokens);
  
  return {
    messageCount: messages.length,
    totalTokens,
    averagePerMessage: messages.length > 0 ? Math.round(totalTokens / messages.length) : 0,
    remainingTokens: stats.remaining,
    percentageUsed: 100 - stats.percentage,
    nearLimit: stats.nearLimit
  };
}

/**
 * Format token count for logging
 */
export function formatTokenCount(tokens: number): string {
  if (tokens < 1000) return `${tokens} tokens`;
  if (tokens < 10000) return `${(tokens / 1000).toFixed(1)}k tokens`;
  return `${Math.round(tokens / 1000)}k tokens`;
}

// Clean up encoder on process exit
process.on('exit', () => {
  if (encoder) {
    encoder.free();
  }
});