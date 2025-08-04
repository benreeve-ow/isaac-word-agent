/**
 * Core types for the prompt management system
 */

export interface PromptComponent {
  type: 'system' | 'instruction' | 'constraint' | 'example' | 'format';
  content: string;
  priority?: number;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'agent' | 'editor' | 'review' | 'improve' | 'shared';
  components: PromptComponent[];
}

export interface PromptParams {
  [key: string]: any;
}

// Type-safe prompt IDs
export const PROMPT_IDS = {
  // Agent prompts
  AGENT_SYSTEM: 'agent.system',
  AGENT_EDIT_STRATEGY: 'agent.editStrategy',
  
  // Review prompts  
  REVIEW_GENERAL: 'review.general',
  REVIEW_TECHNICAL: 'review.technical',
  REVIEW_GRAMMAR: 'review.grammar',
  REVIEW_STYLE: 'review.style',
  REVIEW_CUSTOM: 'review.custom',
  
  // Improve prompts
  IMPROVE_DEFAULT: 'improve.default',
  IMPROVE_POLISH: 'improve.polish',
  IMPROVE_REWRITE: 'improve.rewrite',
  IMPROVE_ACADEMIC: 'improve.academic',
  IMPROVE_BUSINESS: 'improve.business',
  IMPROVE_STYLE_MATCH: 'improve.style_match',
  
  // Editor prompts
  EDITOR_IMPROVE: 'editor.improve',
  EDITOR_STYLE: 'editor.style',
  
  // Shared components
  SHARED_CONSTRAINTS: 'shared.constraints',
  SHARED_FORMATTING: 'shared.formatting'
} as const;

export type PromptId = typeof PROMPT_IDS[keyof typeof PROMPT_IDS];