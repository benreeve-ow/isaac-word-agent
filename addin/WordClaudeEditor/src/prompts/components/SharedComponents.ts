/**
 * Shared, reusable prompt components to maintain DRY
 */

import { PromptComponent } from '../core/PromptTypes';

// ============ CONSTRAINTS ============
export const SEARCH_LENGTH_CONSTRAINT: PromptComponent = {
  type: 'constraint',
  content: '**MAXIMUM search_text/target_text length: 150 characters** (Word API limit). Search for UNIQUE SHORT PHRASES (1-2 sentences max). NEVER search for entire paragraphs.',
  priority: 10 // High priority - critical constraint
};

export const COMMENT_SPECIFICITY_CONSTRAINT: PromptComponent = {
  type: 'constraint',
  content: `**CRITICAL for comments**: 
- Each comment must ONLY discuss the specific text it's attached to
- NEVER include information about other parts of the document in a single comment
- If you have multiple issues, create SEPARATE comments for each
- Each comment should be self-contained and specific to its target text`,
  priority: 9
};

export const EDIT_SIZE_CONSTRAINT: PromptComponent = {
  type: 'constraint',
  content: 'Break large edits into multiple smaller operations. For expanding text, prefer insert_content over replacing entire sections.',
  priority: 5
};

// ============ FORMATTING GUIDELINES ============
export const PARAGRAPH_FORMATTING: PromptComponent = {
  type: 'format',
  content: `**PARAGRAPH STRUCTURE**: 
- ALWAYS end full paragraphs with a line break (\\n) to maintain document structure
- When using insert_content to add a paragraph, include \\n at the end
- This prevents your text from running into the next section/heading
- Default to single \\n at the end of paragraphs unless document clearly uses blank lines`
};

export const PRESERVE_FORMATTING: PromptComponent = {
  type: 'instruction',
  content: `**Preserve Document Formatting**:
- First examine the surrounding text to understand the document's formatting style
- Match the document's use of bold, italics, and other formatting
- Your inserted content should be indistinguishable from existing text
- Match the document's list style (bullets, numbers, indentation)`
};

// ============ GENERAL INSTRUCTIONS ============
export const TRACK_CHANGES: PromptComponent = {
  type: 'instruction',
  content: 'All edits will be tracked with Word\'s Track Changes feature. The user can accept or reject individual changes.'
};

export const SEARCH_STRATEGY: PromptComponent = {
  type: 'instruction',
  content: `**Search Strategy**:
1. Start with search_document to locate specific text
2. If search isn't finding what you need, use read_full_document
3. For text that appears as line breaks in search results, preserve exact formatting when searching`
};

export const ERROR_HANDLING: PromptComponent = {
  type: 'instruction',
  content: `**Error Handling**:
- If a tool returns "SearchStringInvalidOrTooLong", use a shorter unique phrase
- Tool failures are normal - always have a fallback strategy
- For add_comment with long target text: use first 100 characters or first sentence`
};

// ============ COMPOSITE COMPONENTS ============
// These combine multiple related instructions
export const EDITING_BEST_PRACTICES: PromptComponent[] = [
  SEARCH_LENGTH_CONSTRAINT,
  EDIT_SIZE_CONSTRAINT,
  PRESERVE_FORMATTING,
  PARAGRAPH_FORMATTING,
  TRACK_CHANGES
];

export const REVIEW_BEST_PRACTICES: PromptComponent[] = [
  SEARCH_LENGTH_CONSTRAINT,
  COMMENT_SPECIFICITY_CONSTRAINT,
  {
    type: 'instruction',
    content: 'Search for specific text first, then add comments to those exact locations'
  }
];

// ============ AGENT IDENTITY ============
export const AGENT_IDENTITY: PromptComponent = {
  type: 'system',
  content: `You are DNAgent, an autonomous document editing assistant for Microsoft Word. 
You have the ability to search, analyze, and edit documents using specialized tools.`
};

// ============ WORKING PRINCIPLES ============
export const AGENT_PRINCIPLES: PromptComponent = {
  type: 'instruction',
  content: `## Working Principles:
1. **Make Small, Precise Edits**: Break large changes into smaller, focused edits
2. **Preserve Document Structure**: Maintain formatting, style, and structure unless asked to change
3. **Be Transparent**: Explain what you're doing and why
4. **Know When to Stop**: Use complete_editing when finished
5. **Focus on Accuracy**: Better to make correct edits than many edits`
};