const Anthropic = require("@anthropic-ai/sdk");

class AgentService {
  constructor(apiKey) {
    this.anthropic = new Anthropic({ apiKey });
  }

  // Tool definitions for document editing
  getTools() {
    return [
      {
        name: "search_document",
        description: "Search for text in the document with context. Use this to locate content before editing.",
        input_schema: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "Text or regex pattern to search for"
            },
            scope: {
              type: "string",
              enum: ["entire_document", "current_section", "selected_range"],
              description: "Scope of the search"
            },
            context_lines: {
              type: "number",
              description: "Number of paragraphs to include for context",
              default: 2
            }
          },
          required: ["pattern"]
        }
      },
      {
        name: "edit_content",
        description: "Edit specific content in the document with track changes enabled",
        input_schema: {
          type: "object",
          properties: {
            search_text: {
              type: "string",
              description: "The exact text to find and replace (must match exactly)"
            },
            replacement_text: {
              type: "string",
              description: "The new text to replace with"
            },
            location_hint: {
              type: "string",
              description: "Optional hint about where this text appears (e.g., 'in the introduction', 'after the heading X')"
            }
          },
          required: ["search_text", "replacement_text"]
        }
      },
      {
        name: "insert_content",
        description: "Insert new content at a specific location with proper formatting",
        input_schema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "The content to insert"
            },
            position: {
              type: "string",
              enum: ["beginning", "end", "after_text", "before_text"],
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

1. **Always Search Before Editing**: Before making any edit, use search_document to locate the exact text and understand its context.

2. **Make Small, Precise Edits**: Break large changes into smaller, focused edits. Each edit should change one specific thing.

3. **Preserve Document Structure**: Maintain the document's formatting, style, and structure unless explicitly asked to change it.

4. **Be Transparent**: Explain what you're doing and why. Each tool use should have a clear purpose.

5. **Know When to Stop**: Use complete_editing when you've finished all requested changes.

## Edit Strategy:

When asked to edit or improve text:
1. First, use analyze_structure to understand the document layout
2. Use search_document to find relevant sections
3. Plan your edits (break complex changes into steps)
4. Execute edits one at a time using edit_content
5. Validate changes make sense in context
6. Call complete_editing with a summary

## CRITICAL: How to use edit_content:
- **MAXIMUM search_text length: 150 characters** (Word will reject longer searches)
- Search for UNIQUE SHORT PHRASES (1-2 sentences max)
- NEVER search for entire paragraphs
- Break large edits into multiple smaller operations
- For expanding text, prefer insert_content over replacing entire sections
- Example: To expand a paragraph:
  1. Search for a short unique phrase (like "cognitive load reduction.")
  2. Use insert_content with position: "after_text" to add new content
  3. This avoids the search length limit entirely

## CRITICAL: Formatting Guidelines:
- **Mimic existing document formatting**: 
  - First examine the surrounding text to understand the document's formatting style
  - If the document uses single line breaks between paragraphs, use single \n
  - If the document uses double line breaks (blank lines), use \n\n
  - Match the document's use of bold, italics, and other formatting
- **Preserve consistency**: Your inserted content should be indistinguishable from the existing text in terms of formatting
- **For academic/professional documents**: Usually single \n between paragraphs (no blank lines)
- **For casual/blog-style documents**: May use \n\n for visual separation
- **Lists**: Match the document's list style (bullets, numbers, indentation)
- IMPORTANT: Default to single \n unless you observe the document clearly uses blank lines between paragraphs

## Important Notes:
- All edits will be tracked with Word's Track Changes feature
- The user can accept or reject individual changes
- Focus on accuracy over speed - it's better to make correct edits than many edits
- If a search fails, try a shorter unique phrase from the same section
- Some search failures are normal - continue with alternative approaches
- Always format inserted content with proper paragraph structure`;
  }

  async streamAgentResponse({ 
    messages, 
    documentContext,
    onToolUse,
    onContent,
    onError,
    onComplete
  }) {
    try {
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
          tools: this.getTools(),
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
                  conversationMessages.push({
                    role: "user",
                    content: [{
                      type: "tool_result",
                      tool_use_id: currentToolUse.id,
                      content: "Tool executed successfully. Continue with the next step."
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