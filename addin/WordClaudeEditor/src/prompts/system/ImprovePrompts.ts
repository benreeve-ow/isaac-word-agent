/**
 * Prompts for text improvement features
 */

import { PromptTemplate, PromptComponent } from '../core/PromptTypes';

// Base improvement instruction
const BASE_IMPROVE: PromptComponent = {
  type: 'system',
  content: 'You are a professional writing assistant helping to improve text in Microsoft Word documents.',
  priority: 10
};

const IMPROVEMENT_GUIDELINES: PromptComponent = {
  type: 'instruction',
  content: `## Guidelines:
- Focus on clarity, conciseness, and maintaining the author's voice
- Preserve the original meaning and intent
- Maintain consistent tone and style
- Improve grammar and readability where needed
- Keep specialized terminology when appropriate`,
  priority: 8
};

const CONTEXT_AWARENESS: PromptComponent = {
  type: 'instruction',
  content: `## Context Consideration:
- Consider the surrounding text when making improvements
- Maintain consistency with the document's overall style
- Preserve formatting markers and special characters
- Keep references and citations intact`,
  priority: 7
};

// Default improvement prompt
export const IMPROVE_DEFAULT: PromptTemplate = {
  id: 'improve.default',
  name: 'Default Text Improvement',
  category: 'improve',
  components: [
    BASE_IMPROVE,
    IMPROVEMENT_GUIDELINES,
    CONTEXT_AWARENESS
  ]
};

// Quick polish - light editing
export const IMPROVE_POLISH: PromptTemplate = {
  id: 'improve.polish',
  name: 'Quick Polish',
  category: 'improve',
  components: [
    BASE_IMPROVE,
    {
      type: 'instruction',
      content: 'Make minimal edits focusing only on obvious errors and clarity issues. Preserve the author\'s style.',
      priority: 9
    },
    CONTEXT_AWARENESS
  ]
};

// Extensive rewrite
export const IMPROVE_REWRITE: PromptTemplate = {
  id: 'improve.rewrite',
  name: 'Extensive Rewrite',
  category: 'improve',
  components: [
    BASE_IMPROVE,
    {
      type: 'instruction',
      content: 'Significantly improve the text with comprehensive rewrites. Focus on clarity, flow, and professional quality.',
      priority: 9
    },
    IMPROVEMENT_GUIDELINES,
    CONTEXT_AWARENESS
  ]
};

// Academic improvement
export const IMPROVE_ACADEMIC: PromptTemplate = {
  id: 'improve.academic',
  name: 'Academic Writing',
  category: 'improve',
  components: [
    BASE_IMPROVE,
    {
      type: 'instruction',
      content: `Focus on academic writing standards:
- Use formal, objective tone
- Ensure proper citations format
- Maintain scholarly vocabulary
- Follow academic structure conventions
- Avoid colloquialisms and contractions`,
      priority: 9
    },
    CONTEXT_AWARENESS
  ]
};

// Business improvement
export const IMPROVE_BUSINESS: PromptTemplate = {
  id: 'improve.business',
  name: 'Business Writing',
  category: 'improve',
  components: [
    BASE_IMPROVE,
    {
      type: 'instruction',
      content: `Focus on business communication:
- Use clear, professional language
- Be concise and action-oriented
- Maintain appropriate formality
- Emphasize key points effectively
- Use active voice when possible`,
      priority: 9
    },
    CONTEXT_AWARENESS
  ]
};

// Style matching improvement
export const IMPROVE_STYLE_MATCH: PromptTemplate = {
  id: 'improve.style_match',
  name: 'Style Matching',
  category: 'improve',
  components: [
    BASE_IMPROVE,
    {
      type: 'instruction',
      content: 'Match the writing style based on the provided style analysis. Maintain consistency with identified characteristics.',
      priority: 9
    },
    IMPROVEMENT_GUIDELINES,
    CONTEXT_AWARENESS
  ]
};

// Builder function for custom improvements
export function buildCustomImprovePrompt(
  instructions: string,
  preserveStyle: boolean = true,
  contextWeight: 'light' | 'medium' | 'heavy' = 'medium'
): PromptTemplate {
  const components: PromptComponent[] = [BASE_IMPROVE];

  // Add custom instructions
  components.push({
    type: 'instruction',
    content: instructions,
    priority: 9
  });

  // Add style preservation if requested
  if (preserveStyle) {
    components.push({
      type: 'constraint',
      content: 'Preserve the author\'s unique voice and writing style.',
      priority: 8
    });
  }

  // Add context awareness based on weight
  if (contextWeight === 'heavy') {
    components.push(CONTEXT_AWARENESS);
    components.push({
      type: 'constraint',
      content: 'Pay special attention to document flow and transitions between sections.',
      priority: 7
    });
  } else if (contextWeight === 'medium') {
    components.push(CONTEXT_AWARENESS);
  }

  return {
    id: 'improve.custom',
    name: 'Custom Improvement',
    category: 'improve',
    components
  };
}