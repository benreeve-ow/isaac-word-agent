/**
 * Public API for the prompt management system
 */

export { promptManager, PromptManager } from './core/PromptManager';
export { PromptBuilder } from './core/PromptBuilder';
export { PROMPT_IDS } from './core/PromptTypes';
export type { PromptTemplate, PromptComponent, PromptId } from './core/PromptTypes';

// Export commonly used components for custom prompts
export {
  SEARCH_LENGTH_CONSTRAINT,
  COMMENT_SPECIFICITY_CONSTRAINT,
  EDIT_SIZE_CONSTRAINT,
  PARAGRAPH_FORMATTING,
  PRESERVE_FORMATTING,
  TRACK_CHANGES,
  SEARCH_STRATEGY,
  ERROR_HANDLING,
  EDITING_BEST_PRACTICES,
  REVIEW_BEST_PRACTICES
} from './components/SharedComponents';