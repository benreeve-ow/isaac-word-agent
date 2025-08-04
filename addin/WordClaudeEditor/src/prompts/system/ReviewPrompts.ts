/**
 * Review mode prompts with different review types
 */

import { PromptTemplate, PromptComponent } from '../core/PromptTypes';
import {
  SEARCH_LENGTH_CONSTRAINT,
  COMMENT_SPECIFICITY_CONSTRAINT,
  REVIEW_BEST_PRACTICES
} from '../components/SharedComponents';

// Base review instruction shared across all review types
const BASE_REVIEW: PromptComponent = {
  type: 'system',
  content: 'You are an expert document reviewer. Analyze the provided text and provide specific, actionable feedback.'
};

const REVIEW_PROCESS: PromptComponent = {
  type: 'instruction',
  content: `## Review Process:
1. Use search_document to find specific text passages that need review
2. For each issue or feedback item, use add_comment at the exact location
3. Make comments specific to the text they're attached to
4. When complete, use complete_review to finish`
};

const REVIEW_OUTPUT_FORMAT: PromptComponent = {
  type: 'format',
  content: `## Comment Format:
Each comment should include:
- Clear description of the issue or feedback
- Severity level (high/medium/low)
- Specific suggestion for improvement (if applicable)
- Category (e.g., "Grammar", "Technical", "Style")`
};

// General Review
export const REVIEW_GENERAL: PromptTemplate = {
  id: 'review.general',
  name: 'General Document Review',
  category: 'review',
  components: [
    BASE_REVIEW,
    {
      type: 'instruction',
      content: 'Review for clarity, coherence, accuracy, and overall quality. Look for issues with structure, logic, evidence, and argumentation.'
    },
    REVIEW_PROCESS,
    ...REVIEW_BEST_PRACTICES,
    REVIEW_OUTPUT_FORMAT
  ]
};

// Technical Review
export const REVIEW_TECHNICAL: PromptTemplate = {
  id: 'review.technical',
  name: 'Technical Document Review',
  category: 'review',
  components: [
    BASE_REVIEW,
    {
      type: 'instruction',
      content: 'Focus on technical accuracy, proper terminology, methodological soundness, and adherence to domain best practices.'
    },
    REVIEW_PROCESS,
    ...REVIEW_BEST_PRACTICES,
    REVIEW_OUTPUT_FORMAT
  ]
};

// Grammar Review
export const REVIEW_GRAMMAR: PromptTemplate = {
  id: 'review.grammar',
  name: 'Grammar and Spelling Review',
  category: 'review',
  components: [
    BASE_REVIEW,
    {
      type: 'instruction',
      content: 'Focus on grammar, spelling, punctuation, and language mechanics. Identify grammatical errors and suggest corrections.'
    },
    REVIEW_PROCESS,
    ...REVIEW_BEST_PRACTICES,
    REVIEW_OUTPUT_FORMAT
  ]
};

// Style Review
export const REVIEW_STYLE: PromptTemplate = {
  id: 'review.style',
  name: 'Style and Clarity Review',
  category: 'review',
  components: [
    BASE_REVIEW,
    {
      type: 'instruction',
      content: 'Focus on writing style, tone, consistency, and readability. Look for wordiness, passive voice, unclear expressions, and style improvements.'
    },
    REVIEW_PROCESS,
    ...REVIEW_BEST_PRACTICES,
    REVIEW_OUTPUT_FORMAT
  ]
};

// Builder function for custom reviews
export function buildCustomReviewPrompt(
  customInstructions: string,
  includePositive: boolean = false
): PromptTemplate {
  const components: PromptComponent[] = [
    BASE_REVIEW,
    {
      type: 'instruction',
      content: customInstructions
    },
    REVIEW_PROCESS
  ];

  // Add positive feedback instruction if requested
  if (includePositive) {
    components.push({
      type: 'instruction',
      content: 'Include BOTH positive feedback AND areas for improvement.',
      priority: 8
    });
  } else {
    components.push({
      type: 'instruction',
      content: 'Focus ONLY on issues and areas that need improvement. Do NOT include positive feedback or praise.',
      priority: 8
    });
  }

  // Add best practices and format
  components.push(...REVIEW_BEST_PRACTICES);
  components.push(REVIEW_OUTPUT_FORMAT);

  return {
    id: 'review.custom',
    name: 'Custom Review',
    category: 'review',
    components
  };
}