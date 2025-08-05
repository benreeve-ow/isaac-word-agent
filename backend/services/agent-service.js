const Anthropic = require("@anthropic-ai/sdk");

class AgentService {
  constructor(apiKey) {
    this.anthropic = new Anthropic({ apiKey });
  }

  // Tool definitions for document editing
  // Can be overridden by frontend-provided tools or filtered by mode
  getTools(customTools = null, mode = null) {
    let tools = customTools;
    
    if (!tools || !Array.isArray(tools)) {
      tools = this.getDefaultTools();
    }
    
    // Filter tools based on mode if provided
    if (mode && mode.allowedTools && mode.allowedTools !== "*") {
      tools = tools.filter(tool => mode.allowedTools.includes(tool.name));
      console.log(`[AgentService] Filtered tools for mode ${mode.id}: ${tools.map(t => t.name).join(", ")}`);
    }
    
    return tools;
  }
  
  // Get default tool definitions
  getDefaultTools() {
    
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
        name: "get_comments",
        description: "Get all comments in the document with their associated text and metadata",
        input_schema: {
          type: "object",
          properties: {
            filter_type: {
              type: "string",
              enum: ["all", "suggestion", "question", "issue", "praise", "general"],
              description: "Filter comments by type",
              default: "all"
            },
            include_replies: {
              type: "boolean",
              description: "Include comment replies/threads",
              default: true
            },
            include_resolved: {
              type: "boolean",
              description: "Include resolved comments",
              default: false
            }
          }
        }
      },
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
    // Use abstracted prompt from prompts module
    const { buildAgentSystemPrompt } = require('../prompts/agentSystemPrompt');
    return buildAgentSystemPrompt();
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

                  // Execute the tool and get the result (only call once)
                  const toolResult = await onToolUse?.(currentToolUse);
                  
                  // Format the tool result for Claude
                  let toolResultContent = "";
                  let isError = false;
                  
                  if (toolResult) {
                    if (toolResult.success === false) {
                      isError = true;
                      toolResultContent = toolResult.error || "Tool execution failed";
                    } else {
                      // Log for debugging
                      console.log(`[AgentService] Tool result for ${currentToolUse.name}:`, {
                        message: toolResult.message?.substring(0, 100) + (toolResult.message?.length > 100 ? '...' : ''),
                        dataKeys: toolResult.data ? Object.keys(toolResult.data) : null,
                        success: toolResult.success
                      });
                      
                      // Always include the message if present
                      if (toolResult.message) {
                        toolResultContent = toolResult.message;
                      }
                      
                      // For table creation, emphasize the success
                      if (currentToolUse.name === "insert_table" && toolResult.success) {
                        // Make sure the success message is prominent
                        if (!toolResultContent.includes("SUCCESS")) {
                          toolResultContent = "✅ SUCCESS: " + toolResultContent;
                        }
                      }
                      
                      if (toolResult.data) {
                        // Append the actual data as JSON
                        if (toolResultContent) {
                          toolResultContent += "\n\nAdditional details:\n";
                        }
                        toolResultContent += JSON.stringify(toolResult.data, null, 2);
                      }
                      
                      if (!toolResultContent) {
                        toolResultContent = "Tool executed successfully";
                      }
                    }
                  } else {
                    toolResultContent = "Tool executed";
                  }
                  
                  // Log what we're sending to Claude
                  console.log(`[AgentService] Sending to Claude for ${currentToolUse.name}:`, {
                    content: toolResultContent.substring(0, 200) + (toolResultContent.length > 200 ? '...' : ''),
                    is_error: isError
                  });
                  
                  // Add tool result to continue conversation
                  conversationMessages.push({
                    role: "user",
                    content: [{
                      type: "tool_result",
                      tool_use_id: currentToolUse.id,
                      content: toolResultContent,
                      is_error: isError
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