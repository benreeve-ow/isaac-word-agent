import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class AddCommentTool implements ToolDefinition {
  name = "add_comment";
  description = "Add a review comment to text in the document";
  category: ToolDefinition["category"] = "review";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text to attach the comment to (30-50 chars)",
      required: true
    },
    {
      name: "comment",
      type: "string",
      description: "The comment text",
      required: true
    },
    {
      name: "type",
      type: "string",
      description: "Type of comment",
      required: false,
      enum: ["suggestion", "question", "issue", "praise", "general"],
      default: "general"
    }
  ];
  
  inputSchema = {
    type: "object",
    properties: {
      anchor: {
        type: "string",
        description: "Text to attach the comment to (30-50 chars)"
      },
      comment: {
        type: "string",
        description: "The comment text"
      },
      type: {
        type: "string",
        enum: ["suggestion", "question", "issue", "praise", "general"],
        default: "general",
        description: "Type of comment"
      }
    },
    required: ["anchor", "comment"]
  };
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { anchor, comment, type = "general" } = params;
    
    try {
      return await Word.run(async (context) => {
        const body = context.document.body;
        
        // Normalize anchor text: remove line breaks and extra spaces
        const normalizedAnchor = anchor
          .replace(/[\r\n]+/g, ' ')  // Replace line breaks with spaces
          .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
          .trim();
        
        // Try searching with normalized anchor first
        let searchResults = body.search(normalizedAnchor, { matchCase: false, matchWholeWord: false });
        context.load(searchResults);
        await context.sync();
        
        
        // If no results, try with just the first few words
        if (searchResults.items.length === 0) {
          // Try with just first 20 characters
          const shortAnchor = normalizedAnchor.substring(0, 20).trim();
          
          searchResults = body.search(shortAnchor, { matchCase: false, matchWholeWord: false });
          context.load(searchResults);
          await context.sync();
          
        }
        
        // If still no results, try getting all text to debug
        if (searchResults.items.length === 0) {
          context.load(body, 'text');
          await context.sync();
          const bodyText = body.text.substring(0, 500);
          
          return {
            success: false,
            error: `Anchor text not found: "${anchor}" (normalized: "${normalizedAnchor}")`
          };
        }
        
        // Use the first occurrence
        const firstMatch = searchResults.items[0];
        context.load(firstMatch);
        
        // Create comment with type prefix
        const typePrefix = type !== "general" ? `[${type.toUpperCase()}] ` : "";
        const fullComment = typePrefix + comment;
        
        // Add the comment
        const noteItem = firstMatch.insertComment(fullComment);
        
        // Sync to ensure comment is added
        await context.sync();
        
        return {
          success: true,
          message: `Comment added to "${anchor.substring(0, 30)}..."`
        };
      });
    } catch (error: any) {
      // Handle common error when comments API is not available
      if (error.message && error.message.includes("insertComment")) {
        return {
          success: false,
          error: "Comments are not supported in this version of Word or the document is in read-only mode"
        };
      }
      
      return {
        success: false,
        error: error.message || "Failed to add comment"
      };
    }
  }
}