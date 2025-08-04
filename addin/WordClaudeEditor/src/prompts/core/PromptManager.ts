/**
 * Central manager for all prompts in the system
 */

import { PromptTemplate, PromptId, PROMPT_IDS } from './PromptTypes';
import { PromptBuilder } from './PromptBuilder';
import { AGENT_SYSTEM_PROMPT, AGENT_TOOL_GUIDELINES } from '../system/AgentPrompts';
import { 
  REVIEW_GENERAL, 
  REVIEW_TECHNICAL, 
  REVIEW_GRAMMAR, 
  REVIEW_STYLE,
  buildCustomReviewPrompt 
} from '../system/ReviewPrompts';
import {
  IMPROVE_DEFAULT,
  IMPROVE_POLISH,
  IMPROVE_REWRITE,
  IMPROVE_ACADEMIC,
  IMPROVE_BUSINESS,
  IMPROVE_STYLE_MATCH,
  buildCustomImprovePrompt
} from '../system/ImprovePrompts';

export class PromptManager {
  private static instance: PromptManager;
  private prompts: Map<string, PromptTemplate>;

  private constructor() {
    this.prompts = new Map();
    this.registerPrompts();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PromptManager {
    if (!PromptManager.instance) {
      PromptManager.instance = new PromptManager();
    }
    return PromptManager.instance;
  }

  /**
   * Register all built-in prompts
   */
  private registerPrompts(): void {
    // Agent prompts
    this.prompts.set(PROMPT_IDS.AGENT_SYSTEM, AGENT_SYSTEM_PROMPT);
    
    // Review prompts
    this.prompts.set(PROMPT_IDS.REVIEW_GENERAL, REVIEW_GENERAL);
    this.prompts.set(PROMPT_IDS.REVIEW_TECHNICAL, REVIEW_TECHNICAL);
    this.prompts.set(PROMPT_IDS.REVIEW_GRAMMAR, REVIEW_GRAMMAR);
    this.prompts.set(PROMPT_IDS.REVIEW_STYLE, REVIEW_STYLE);
    
    // Improve prompts
    this.prompts.set(PROMPT_IDS.IMPROVE_DEFAULT, IMPROVE_DEFAULT);
    this.prompts.set(PROMPT_IDS.IMPROVE_POLISH, IMPROVE_POLISH);
    this.prompts.set(PROMPT_IDS.IMPROVE_REWRITE, IMPROVE_REWRITE);
    this.prompts.set(PROMPT_IDS.IMPROVE_ACADEMIC, IMPROVE_ACADEMIC);
    this.prompts.set(PROMPT_IDS.IMPROVE_BUSINESS, IMPROVE_BUSINESS);
    this.prompts.set(PROMPT_IDS.IMPROVE_STYLE_MATCH, IMPROVE_STYLE_MATCH);
  }

  /**
   * Get a prompt by ID and build it
   */
  getPrompt(id: PromptId): string {
    const template = this.prompts.get(id);
    if (!template) {
      throw new Error(`Prompt not found: ${id}`);
    }
    
    return PromptBuilder.fromTemplate(template).build();
  }

  /**
   * Get a prompt template (for customization)
   */
  getTemplate(id: PromptId): PromptTemplate | undefined {
    return this.prompts.get(id);
  }

  /**
   * Build a custom review prompt
   */
  buildCustomReview(instructions: string, includePositive: boolean = false): string {
    const template = buildCustomReviewPrompt(instructions, includePositive);
    return PromptBuilder.fromTemplate(template).build();
  }

  /**
   * Build a custom improve prompt
   */
  buildCustomImprove(
    instructions: string, 
    preserveStyle: boolean = true,
    contextWeight: 'light' | 'medium' | 'heavy' = 'medium'
  ): string {
    const template = buildCustomImprovePrompt(instructions, preserveStyle, contextWeight);
    return PromptBuilder.fromTemplate(template).build();
  }

  /**
   * Create a custom prompt from components
   */
  buildCustomPrompt(components: PromptTemplate['components']): string {
    const builder = new PromptBuilder();
    builder.addComponents(components);
    return builder.build();
  }

  /**
   * Get all prompts for a category
   */
  getByCategory(category: PromptTemplate['category']): Map<string, PromptTemplate> {
    const filtered = new Map<string, PromptTemplate>();
    
    this.prompts.forEach((template, id) => {
      if (template.category === category) {
        filtered.set(id, template);
      }
    });
    
    return filtered;
  }

  /**
   * Validate that all required prompts are registered
   * This will cause compile-time errors if prompts are missing
   */
  validatePrompts(): void {
    const requiredPrompts: PromptId[] = [
      PROMPT_IDS.AGENT_SYSTEM,
      PROMPT_IDS.REVIEW_GENERAL,
      PROMPT_IDS.REVIEW_TECHNICAL,
      PROMPT_IDS.REVIEW_GRAMMAR,
      PROMPT_IDS.REVIEW_STYLE,
      PROMPT_IDS.IMPROVE_DEFAULT,
      PROMPT_IDS.IMPROVE_POLISH,
      PROMPT_IDS.IMPROVE_REWRITE,
      PROMPT_IDS.IMPROVE_ACADEMIC,
      PROMPT_IDS.IMPROVE_BUSINESS,
      PROMPT_IDS.IMPROVE_STYLE_MATCH
    ];

    for (const id of requiredPrompts) {
      if (!this.prompts.has(id)) {
        throw new Error(`Required prompt missing: ${id}`);
      }
    }
  }
}

// Export singleton instance
export const promptManager = PromptManager.getInstance();

// Validate prompts at module load time (compile-time safety)
promptManager.validatePrompts();