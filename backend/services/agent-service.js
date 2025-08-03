const Anthropic = require("@anthropic-ai/sdk");

class AgentService {
  constructor(apiKey) {
    this.anthropic = new Anthropic({ apiKey });
  }

  // Tool definitions for document editing
  // Can be overridden by frontend-provided tools
  getTools(customTools = null) {
    if (customTools && Array.isArray(customTools)) {
      return customTools;
    }
    
    // Default tools matching the frontend tool system
    return [
      // === SEARCH & NAVIGATION ===
      {
        name: "search_document",
        description: "Search for text in the document and return matches with context",
        input_schema: {
          type: "object",
          properties: {
            pattern: { type: "string", description: "The text pattern to search for" },
            context_lines: { type: "number", description: "Number of context lines around matches", default: 2 },
            match_case: { type: "boolean", description: "Whether to match case exactly", default: false },
            whole_word: { type: "boolean", description: "Whether to match whole words only", default: false }
          },
          required: ["pattern"]
        }
      },
      
      // === EDITING TOOLS ===
      {
        name: "edit_content",
        description: "Replace specific text in the document with new content",
        input_schema: {
          type: "object",
          properties: {
            search_text: { type: "string", description: "The text to search for and replace" },
            replacement_text: { type: "string", description: "The new text to replace with" },
            match_case: { type: "boolean", description: "Whether to match case exactly", default: false },
            replace_all: { type: "boolean", description: "Whether to replace all occurrences", default: false }
          },
          required: ["search_text", "replacement_text"]
        }
      },
      {
        name: "insert_content",
        description: "Insert new content at a specific position in the document. IMPORTANT: End paragraphs with \\n to maintain proper document structure.",
        input_schema: {
          type: "object",
          properties: {
            content: { 
              type: "string", 
              description: "The content to insert. For full paragraphs, end with \\n to prevent running into next section." 
            },
            position: {
              type: "string",
              enum: ["beginning", "end", "after_text", "before_text", "after_selection", "before_selection"],
              description: "Where to insert the content"
            },
            reference_text: {
              type: "string",
              description: "Reference text for after_text or before_text position"
            }
          },
          required: ["content", "position"]
        }
      },
      
      // === FORMATTING TOOLS ===
      {
        name: "apply_formatting",
        description: "Apply text formatting like bold, italic, underline to selected text or specific content",
        input_schema: {
          type: "object",
          properties: {
            format_type: {
              type: "string",
              enum: ["bold", "italic", "underline", "strikethrough", "subscript", "superscript", "highlight"],
              description: "Type of formatting to apply"
            },
            value: { type: "boolean", description: "Whether to apply (true) or remove (false) the formatting", default: true },
            target_text: { type: "string", description: "Specific text to format (if not provided, uses selection)" },
            highlight_color: {
              type: "string",
              enum: ["yellow", "green", "blue", "red", "pink", "gray"],
              description: "Highlight color (for highlight format type)",
              default: "yellow"
            }
          },
          required: ["format_type"]
        }
      },
      {
        name: "apply_style",
        description: "Apply paragraph or character styles to text",
        input_schema: {
          type: "object",
          properties: {
            style_name: {
              type: "string",
              enum: ["Normal", "Heading 1", "Heading 2", "Heading 3", "Heading 4", "Title", "Subtitle", "Quote", "Intense Quote", "Emphasis", "Strong", "List Paragraph", "No Spacing", "Code"],
              description: "Name of the style to apply"
            },
            target: {
              type: "string",
              enum: ["selection", "paragraph", "document"],
              description: "What to apply the style to",
              default: "selection"
            }
          },
          required: ["style_name"]
        }
      },
      
      // === REVIEW TOOLS ===
      {
        name: "add_comment",
        description: "Add a review comment to selected text or specific location. IMPORTANT: Each comment must ONLY discuss the specific text it's attached to. Create multiple comments for multiple issues.",
        input_schema: {
          type: "object",
          properties: {
            comment_text: { 
              type: "string", 
              description: "The text of the comment. Must be specific to the target text only - do not reference other parts of the document." 
            },
            target_text: { 
              type: "string", 
              description: "Text to attach the comment to (max 150 chars). Use a unique phrase from the target paragraph." 
            },
            comment_type: {
              type: "string",
              enum: ["suggestion", "question", "issue", "praise", "general"],
              description: "Type of comment",
              default: "general"
            },
            priority: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Priority level of the comment",
              default: "medium"
            }
          },
          required: ["comment_text"]
        }
      },
      
      // === STRUCTURE TOOLS ===
      {
        name: "insert_table",
        description: "Insert a table at the current position or specified location",
        input_schema: {
          type: "object",
          properties: {
            rows: { type: "number", description: "Number of rows" },
            columns: { type: "number", description: "Number of columns" },
            data: { type: "array", description: "Optional 2D array of data to populate the table" },
            header_row: { type: "boolean", description: "Whether the first row should be formatted as a header", default: true },
            style: {
              type: "string",
              enum: ["Grid", "List", "PlainTable", "TableGrid", "LightShading", "MediumShading"],
              description: "Table style to apply",
              default: "Grid"
            },
            position: {
              type: "string",
              enum: ["cursor", "end", "after_paragraph"],
              description: "Where to insert the table",
              default: "cursor"
            }
          },
          required: ["rows", "columns"]
        }
      },
      {
        name: "insert_break",
        description: "Insert page breaks, section breaks, or line breaks",
        input_schema: {
          type: "object",
          properties: {
            break_type: {
              type: "string",
              enum: ["page", "section_next", "section_continuous", "line", "paragraph"],
              description: "Type of break to insert"
            },
            position: {
              type: "string",
              enum: ["cursor", "after_selection", "before_selection", "end"],
              description: "Where to insert the break",
              default: "cursor"
            }
          },
          required: ["break_type"]
        }
      },
      
      // === ANALYSIS TOOLS ===
      {
        name: "analyze_structure",
        description: "Analyze the document structure to understand headings, sections, and organization",
        input_schema: {
          type: "object",
          properties: {
            include_styles: {
              type: "boolean",
              description: "Include style information in the analysis",
              default: true
            }
          }
        }
      },
      {
        name: "complete_editing",
        description: "Signal that editing is complete and provide a summary",
        input_schema: {
          type: "object",
          properties: {
            summary: {
              type: "string",
              description: "Summary of all changes made"
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "Confidence level in the edits"
            }
          },
          required: ["summary"]
        }
      }
    ];
  }

  // System prompt for agentic behavior
  getSystemPrompt() {
    return `You are DNAgent, an autonomous document editing assistant for Microsoft Word. You have the ability to search, analyze, and edit documents using specialized tools.

## Your Capabilities:
- Search for specific text patterns in the document
- Analyze document structure (headings, sections, styles)
- Make precise edits with track changes enabled
- Insert new content at specific locations
- Work autonomously to improve documents

## Working Principles:

1. **Search Strategy**:
   - Start with search_document to locate specific text
   - Search results now include FULL paragraphs and extensive context
   - If search isn't finding what you need (e.g., section numbers, dispersed content), use read_full_document
   - Use read_full_document when you need to understand overall structure or find content that's hard to search for

2. **When to Read Full Document**:
   - Document is small (< 25k tokens estimated)
   - Need to find section numbers or hierarchical structure
   - Search is returning no results but you know content exists
   - Need to understand document flow and organization
   - Working with numbered lists or outline structures

3. **Make Small, Precise Edits**: Break large changes into smaller, focused edits. Each edit should change one specific thing.

4. **Preserve Document Structure**: Maintain the document's formatting, style, and structure unless explicitly asked to change it.

5. **Be Transparent**: Explain what you're doing and why. Each tool use should have a clear purpose.

6. **Know When to Stop**: Use complete_editing when you've finished all requested changes.

7. **Comment Specificity Rule**: 
   - ONE comment per issue, attached to the specific text it discusses
   - Example: If you find three instances of missing citations:
     * BAD: One comment on first instance saying "This and two other places need citations"
     * GOOD: Three separate comments, each attached to its specific paragraph needing a citation
   - Each comment is independent and self-contained

## Edit Strategy:

When asked to edit or improve text:
1. First, use analyze_structure to understand the document layout
2. Use search_document to find relevant sections
3. Plan your edits (break complex changes into steps)
4. Execute edits one at a time using edit_content
5. Validate changes make sense in context
6. Call complete_editing with a summary

## CRITICAL: How to use edit_content and add_comment:
- **MAXIMUM search_text/target_text length: 150 characters** (Word will reject longer searches)
- Search for UNIQUE SHORT PHRASES (1-2 sentences max)
- NEVER search for entire paragraphs
- **IMPORTANT: When copying text from search results, preserve the exact formatting including line breaks**
- Line breaks appear as actual newlines in the document, not as \n characters
- When searching for multi-line text, include the line breaks exactly as they appear
- Break large edits into multiple smaller operations
- For expanding text, prefer insert_content over replacing entire sections
- For add_comment: If target_text is too long, use a unique phrase from the beginning of the target paragraph
- **CRITICAL for add_comment**: 
  - Each comment must ONLY discuss the specific text it's attached to
  - NEVER include information about other parts of the document in a single comment
  - If you have multiple issues to flag (e.g., three examples of poor formatting), create THREE separate comments, one for each example
  - Each comment should be self-contained and specific to its target text
  - Bad: "This is the first of three issues with formatting in the document..."
  - Good: "This paragraph lacks proper citation format."
- Example: To expand a paragraph:
  1. Search for a short unique phrase (like "cognitive load reduction.")
  2. Use insert_content with position: "after_text" to add new content
  3. This avoids the search length limit entirely

## CRITICAL: Formatting Guidelines:
- **PARAGRAPH STRUCTURE**: 
  - ALWAYS end full paragraphs with a line break (\n) to maintain document structure
  - When using insert_content to add a paragraph, include \n at the end
  - This prevents your text from running into the next section/heading
- **Mimic existing document formatting**: 
  - First examine the surrounding text to understand the document's formatting style
  - If the document uses single line breaks between paragraphs, use single \n
  - If the document uses double line breaks (blank lines), use \n\n
  - Match the document's use of bold, italics, and other formatting
- **Preserve consistency**: Your inserted content should be indistinguishable from the existing text in terms of formatting
- **For academic/professional documents**: Usually single \n between paragraphs (no blank lines)
- **For casual/blog-style documents**: May use \n\n for visual separation
- **Lists**: Match the document's list style (bullets, numbers, indentation)
- **Examples of proper formatting**:
  - Adding a paragraph: "This is my new paragraph content.\n"
  - Adding multiple paragraphs: "First paragraph.\n\nSecond paragraph.\n"
  - Inline text (not a paragraph): "this additional text" (no line break)
- IMPORTANT: Default to single \n at the end of paragraphs unless you observe the document clearly uses blank lines

## Important Notes:
- All edits will be tracked with Word's Track Changes feature
- The user can accept or reject individual changes
- Focus on accuracy over speed - it's better to make correct edits than many edits
- If a search fails, try a shorter unique phrase from the same section
- Some search failures are normal - continue with alternative approaches
- Always format inserted content with proper paragraph structure

## Error Handling:
- If a tool returns "SearchStringInvalidOrTooLong", the search text was too long (>150 chars)
- When this happens, use a shorter, unique phrase from the beginning of the text
- For add_comment with long target text: use the first 100 characters or first sentence
- Tool failures are normal - always have a fallback strategy
- Never assume a tool succeeded if you see an error - try an alternative approach`;
  }

  async streamAgentResponse({ 
    messages, 
    documentContext,
    tools,  // Accept custom tools
    onToolUse,
    onContent,
    onError,
    onComplete
  }) {
    try {
      // Use custom tools if provided, otherwise use defaults
      const availableTools = this.getTools(tools);
      
      // Build conversation with proper tool use handling
      const conversationMessages = [
        {
          role: "user",
          content: `Document Context:\n${documentContext}\n\n${messages[0].content}`
        }
      ];

      let continueProcessing = true;
      let iterationCount = 0;
      const maxIterations = 100; // Prevent infinite loops
      let allToolUses = [];

      while (continueProcessing && iterationCount < maxIterations) {
        iterationCount++;
        console.log(`[AgentService] Iteration ${iterationCount}`);

        const stream = await this.anthropic.messages.create({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          temperature: 0.3,
          system: this.getSystemPrompt(),
          messages: conversationMessages,
          tools: availableTools,
          tool_choice: { type: "auto" },
          stream: true
        });

        let currentContent = "";
        let currentToolUse = null;
        let hasToolUse = false;

        for await (const event of stream) {
          if (event.type === "content_block_start") {
            if (event.content_block.type === "text") {
              currentContent = "";
            } else if (event.content_block.type === "tool_use") {
              hasToolUse = true;
              currentToolUse = {
                id: event.content_block.id,
                name: event.content_block.name,
                input: ""
              };
            }
          }

          if (event.type === "content_block_delta") {
            if (event.delta.type === "text_delta") {
              currentContent += event.delta.text;
              onContent?.(event.delta.text);
            } else if (event.delta.type === "input_json_delta") {
              if (currentToolUse) {
                currentToolUse.input += event.delta.partial_json;
              }
            }
          }

          if (event.type === "content_block_stop") {
            if (currentToolUse) {
              try {
                currentToolUse.input = JSON.parse(currentToolUse.input);
                allToolUses.push(currentToolUse);
                
                // Send tool use to client
                await onToolUse?.(currentToolUse);
                
                // Check if editing is complete
                if (currentToolUse.name === "complete_editing") {
                  onComplete?.({
                    summary: currentToolUse.input.summary,
                    toolUses: allToolUses
                  });
                  continueProcessing = false;
                  break;
                }

                // Add assistant message with tool use to conversation
                if (currentContent || hasToolUse) {
                  // Build the assistant message content
                  const assistantContent = [];
                  
                  if (currentContent) {
                    assistantContent.push({
                      type: "text",
                      text: currentContent
                    });
                  }
                  
                  assistantContent.push({
                    type: "tool_use",
                    id: currentToolUse.id,
                    name: currentToolUse.name,
                    input: currentToolUse.input
                  });
                  
                  conversationMessages.push({
                    role: "assistant",
                    content: assistantContent
                  });

                  // Add tool result to continue conversation
                  // Note: Since tools execute on the frontend, we need to wait for the result
                  // For now, we'll assume success but should be enhanced to get actual results
                  conversationMessages.push({
                    role: "user",
                    content: [{
                      type: "tool_result",
                      tool_use_id: currentToolUse.id,
                      content: "Tool execution requested. Continue with the next step.",
                      // TODO: Get actual tool result from frontend
                      is_error: false
                    }]
                  });
                }
              } catch (err) {
                console.error("Error parsing tool input:", err);
              }
              currentToolUse = null;
            }
          }
        }

        // If no tool was used in this iteration, we're done
        if (!hasToolUse) {
          if (currentContent) {
            conversationMessages.push({
              role: "assistant",
              content: currentContent
            });
          }
          onComplete?.({
            message: currentContent,
            toolUses: allToolUses
          });
          continueProcessing = false;
        }
      }

      if (iterationCount >= maxIterations) {
        onError?.(new Error("Maximum iterations reached"));
      }
    } catch (error) {
      console.error("Agent service error:", error);
      onError?.(error);
      throw error;
    }
  }
}

module.exports = AgentService;