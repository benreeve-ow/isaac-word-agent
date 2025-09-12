import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class ResolveCommentTool implements ToolDefinition {
  name = "resolve_comment";
  description = "Accept or reject a review comment by applying or dismissing the suggested change";
  category: ToolDefinition["category"] = "review";
  
  parameters: ToolParameter[] = [
    {
      name: "commentIndex",
      type: "number",
      description: "The index of the comment to resolve (starting from 0)",
      required: true
    },
    {
      name: "action",
      type: "string",
      description: "How to resolve the comment",
      required: true,
      enum: ["accept", "reject", "implement"]
    },
    {
      name: "replacementText",
      type: "string",
      description: "The text to use when accepting or implementing the comment (required for 'accept' and 'implement')",
      required: false
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { commentIndex, action, replacementText } = params;
    
    try {
      return await Word.run(async (context) => {
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
            error: `Invalid comment index: ${commentIndex}. Document has ${comments.items.length} comments.`
          };
        }
        
        const comment = comments.items[commentIndex];
        context.load(comment, ["content", "replied", "resolved"]);
        
        // Load the range the comment is attached to
        const commentRange = comment.getRange();
        context.load(commentRange, ["text"]);
        await context.sync();
        
        const originalText = commentRange.text;
        const commentText = comment.content;
        
        if (action === "accept" || action === "implement") {
          if (!replacementText && action === "accept") {
            return {
              success: false,
              error: "replacementText is required when accepting a comment"
            };
          }
          
          // Apply the suggested change
          if (replacementText) {
            commentRange.insertText(replacementText, "Replace");
          } else if (commentText.toLowerCase().includes("delete")) {
            // If comment suggests deletion and no replacement provided, delete the text
            commentRange.delete();
          }
          
          // Mark comment as resolved
          comment.resolved = true;
          
          await context.sync();
          
          return {
            success: true,
            message: `Comment ${commentIndex + 1} accepted: replaced "${originalText.substring(0, 30)}..." with "${replacementText?.substring(0, 30) || "[deleted]"}"`
          };
          
        } else if (action === "reject") {
          // Just mark the comment as resolved without making changes
          comment.resolved = true;
          
          await context.sync();
          
          return {
            success: true,
            message: `Comment ${commentIndex + 1} rejected (no changes made)`
          };
        } else {
          return {
            success: false,
            error: `Invalid action: ${action}. Use 'accept', 'reject', or 'implement'`
          };
        }
      });
    } catch (error: any) {
      console.error("[ResolveCommentTool] Error:", error);
      
      // Handle common error when comments API is not available
      if (error.message && error.message.includes("getComments")) {
        return {
          success: false,
          error: "Comments API is not supported in this version of Word"
        };
      }
      
      return {
        success: false,
        error: error.message || "Failed to resolve comment"
      };
    }
  }
}