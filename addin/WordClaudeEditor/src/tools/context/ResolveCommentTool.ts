import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";
import { enableTrackChanges } from "./trackChangesHelper";

export class ResolveCommentTool implements ToolDefinition {
  name = "resolve_comment";
  description = "Mark a review comment as resolved/completed, optionally with a reply";
  category: ToolDefinition["category"] = "review";
  
  parameters: ToolParameter[] = [
    {
      name: "commentIndex",
      type: "number",
      description: "The index of the comment to resolve (starting from 0)",
      required: true
    },
    {
      name: "replyText",
      type: "string",
      description: "Optional text to add as a reply before resolving",
      required: false
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { commentIndex, replyText } = params;
    
    try {
      return await Word.run(async (context) => {
        await enableTrackChanges(context);
        // Get all comments
        const comments = context.document.body.getComments();
        context.load(comments);
        await context.sync();
        
        if (!comments.items || comments.items.length === 0) {
          return {
            success: false,
            error: "No comments found in the document"
          };
        }
        
        if (commentIndex < 0 || commentIndex >= comments.items.length) {
          return {
            success: false,
            error: `Invalid comment index ${commentIndex}. Document has ${comments.items.length} comments (0-${comments.items.length - 1})`
          };
        }
        
        const comment = comments.items[commentIndex];
        context.load(comment, ["content", "replied", "resolved"]);
        await context.sync();
        
        // Add a reply if provided
        if (replyText) {
          comment.reply(replyText);
          await context.sync();
        }
        
        // Mark the comment as resolved
        comment.resolved = true;
        await context.sync();
        
        return {
          success: true,
          message: `Comment ${commentIndex + 1} marked as resolved${replyText ? ` with reply: "${replyText.substring(0, 50)}${replyText.length > 50 ? '...' : ''}"` : ''}`
        };
      });
    } catch (error: any) {
      // Handle common error when comments API is not available
      if (error.message && error.message.includes("getComments")) {
        return {
          success: false,
          error: "Comments API is not available. Ensure you're using a version of Word that supports comments."
        };
      }
      
      return {
        success: false,
        error: error.message || "Failed to resolve comment"
      };
    }
  }
}