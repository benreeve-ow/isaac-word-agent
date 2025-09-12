import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class ReadDocumentTool implements ToolDefinition {
  name = "read_document";
  description = "Read the complete document content to understand what's currently in it";
  category: ToolDefinition["category"] = "analysis";
  
  parameters: ToolParameter[] = [
    {
      name: "includeFormatting",
      type: "boolean",
      description: "Include formatting information",
      required: false,
      default: false
    },
    {
      name: "includeComments",
      type: "boolean",
      description: "Include review comments",
      required: false,
      default: false
    }
  ];
  
  inputSchema = {
    type: "object",
    properties: {
      includeFormatting: {
        type: "boolean",
        default: false,
        description: "Include formatting information"
      },
      includeComments: {
        type: "boolean",
        default: false,
        description: "Include review comments"
      }
    },
    required: []
  };
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { includeFormatting = false, includeComments = false } = params;
    
    try {
      return await Word.run(async (context) => {
        const body = context.document.body;
        const paragraphs = body.paragraphs;
        const tables = body.tables;
        
        // Load basic content
        context.load(body, "text");
        context.load(paragraphs, "items");
        context.load(tables, "items");
        
        await context.sync();
        
        // Get word count
        const fullText = body.text;
        const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
        const paragraphCount = paragraphs.items.length;
        const tableCount = tables.items.length;
        
        let content = fullText;
        let hasComments = false;
        
        // Include formatting if requested
        if (includeFormatting) {
          const formattedContent: string[] = [];
          
          for (const paragraph of paragraphs.items) {
            context.load(paragraph, ["text", "style", "isListItem", "listLevel"]);
          }
          await context.sync();
          
          for (const paragraph of paragraphs.items) {
            let prefix = "";
            if (paragraph.isListItem) {
              // Note: listLevel might not be available in all Word versions
              const level = (paragraph as any).listLevel || 0;
              prefix = "  ".repeat(level) + "• ";
            }
            if (paragraph.style) {
              formattedContent.push(`[${paragraph.style}] ${prefix}${paragraph.text}`);
            } else {
              formattedContent.push(`${prefix}${paragraph.text}`);
            }
          }
          
          content = formattedContent.join("\n");
        }
        
        // Include comments if requested
        let commentsData: any[] = [];
        if (includeComments) {
          try {
            // Note: Comments API might not be available in all Word versions
            const comments = context.document.body.getComments();
            context.load(comments);
            await context.sync();
            
            if (comments.items && comments.items.length > 0) {
              hasComments = true;
              
              // Load details for each comment
              for (const comment of comments.items) {
                context.load(comment, ["content", "resolved"]);
                // Try to get the range the comment is attached to
                try {
                  const commentRange = comment.getRange();
                  context.load(commentRange, ["text"]);
                } catch (e) {
                  // Range might not be available
                }
              }
              await context.sync();
              
              // Build detailed comment information
              const commentTexts = comments.items.map((comment: any, index: number) => {
                let rangeText = "[unknown location]";
                try {
                  const commentRange = comment.getRange();
                  if (commentRange && commentRange.text) {
                    rangeText = commentRange.text.substring(0, 50);
                    if (commentRange.text.length > 50) rangeText += "...";
                  }
                } catch (e) {
                  // Range not available
                }
                
                const resolved = comment.resolved ? " [RESOLVED]" : "";
                commentsData.push({
                  index,
                  content: comment.content,
                  attachedTo: rangeText,
                  resolved: comment.resolved || false
                });
                
                return `[Comment ${index}]${resolved} on "${rangeText}": ${comment.content}`;
              });
              
              content += "\n\n--- Comments ---\n" + commentTexts.join("\n");
            }
          } catch (error) {
            console.warn("[ReadDocumentTool] Comments API not available:", error);
          }
        }
        
        return {
          success: true,
          data: {
            content,
            paragraphCount,
            wordCount,
            tableCount,
            hasComments,
            comments: commentsData
          },
          message: `Document read successfully (${wordCount} words, ${paragraphCount} paragraphs)`
        };
      });
    } catch (error: any) {
      console.error("[ReadDocumentTool] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to read document"
      };
    }
  }
}