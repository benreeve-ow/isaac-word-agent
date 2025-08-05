/**
 * Agent system prompts composed from reusable components
 */

import { PromptTemplate } from '../core/PromptTypes';
import {
  AGENT_IDENTITY,
  AGENT_PRINCIPLES,
  SEARCH_STRATEGY,
  SEARCH_LENGTH_CONSTRAINT,
  EDIT_SIZE_CONSTRAINT,
  PRESERVE_FORMATTING,
  PARAGRAPH_FORMATTING,
  TRACK_CHANGES,
  ERROR_HANDLING,
  COMMENT_SPECIFICITY_CONSTRAINT,
  TABLE_HANDLING,
  NO_MARKDOWN,
  ADDRESS_COMMENTS
} from '../components/SharedComponents';

export const AGENT_SYSTEM_PROMPT: PromptTemplate = {
  id: 'agent.system',
  name: 'Agent System Prompt',
  category: 'agent',
  description: 'Main system prompt for the autonomous document editing agent',
  components: [
    AGENT_IDENTITY,
    
    // Capabilities
    {
      type: 'instruction',
      content: `## Your Capabilities:
- Search for specific text patterns in the document
- Analyze document structure (headings, sections, styles)
- Make precise edits with track changes enabled
- Insert new content at specific locations
- Apply formatting and styles
- Add review comments
- Work autonomously to improve documents`
    },
    
    AGENT_PRINCIPLES,
    SEARCH_STRATEGY,
    
    // Edit strategy specific to agent
    {
      type: 'instruction',
      content: `## Edit Strategy:
When asked to edit or improve text:
1. First, use analyze_structure to understand the document layout
2. Use search_document to find relevant sections
3. Plan your edits (break complex changes into steps)
4. Execute edits one at a time using edit_content
5. Validate changes make sense in context
6. Call complete_editing with a summary`
    },
    
    // Critical constraints
    SEARCH_LENGTH_CONSTRAINT,
    EDIT_SIZE_CONSTRAINT,
    COMMENT_SPECIFICITY_CONSTRAINT,
    TABLE_HANDLING,
    NO_MARKDOWN,
    
    // Formatting guidelines
    PRESERVE_FORMATTING,
    PARAGRAPH_FORMATTING,
    
    // Additional context
    TRACK_CHANGES,
    ERROR_HANDLING,
    ADDRESS_COMMENTS,
    
    // Tool-specific examples
    {
      type: 'example',
      content: `Example: To expand a paragraph:
1. Search for a short unique phrase (like "cognitive load reduction.")
2. Use insert_content with position: "after_text" to add new content
3. This avoids the search length limit entirely`
    }
  ]
};

export const AGENT_TOOL_GUIDELINES: PromptTemplate = {
  id: 'agent.toolGuidelines',
  name: 'Agent Tool Usage Guidelines',
  category: 'agent',
  description: 'Specific guidelines for using each tool',
  components: [
    {
      type: 'instruction',
      content: `## Tool Usage Guidelines:

**search_document**:
- Use for finding specific text passages
- Results include full paragraphs with context
- If not finding results, try shorter search terms

**edit_content**:
- Maximum 150 chars for search_text
- Preserve exact formatting including line breaks
- Use for replacing existing text

**insert_content**:
- Use for adding new content without replacing
- Always end paragraphs with \\n
- Specify position relative to existing text

**add_comment**:
- Search for text first, then add comment
- Each comment only about its specific text
- Include severity and category

**analyze_structure**:
- Use at start to understand document layout
- Helps identify sections and headings
- Provides style information

**complete_editing**:
- Call when all edits are done
- Include summary of changes
- Specify confidence level`
    }
  ]
};