/**
 * Tool for reading all comments in the document using Word API
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class GetCommentsTool extends BaseTool {
  name = "get_comments";
  description = "Get all comments in the document with their associated text and metadata";
  category = "review" as const;
  
  parameters = [
    {
      name: "filter_type",
      type: "string" as const,
      description: "Filter comments by type (if type is included in comment text)",
      enum: ["all", "suggestion", "question", "issue", "praise", "general"],
      default: "all"
    },
    {
      name: "include_replies",
      type: "boolean" as const,
      description: "Include comment replies/threads",
      default: true
    },
    {
      name: "include_resolved",
      type: "boolean" as const,
      description: "Include resolved comments",
      default: false
    }
  ];
  
  requiresApproval = false; // Read-only operation
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    try {
      // Check if the Word API 1.4 is available
      const isApiAvailable = Office.context.requirements.isSetSupported("WordApi", "1.4");
      console.log("[GetCommentsTool] Word API 1.4 available:", isApiAvailable);
      
      if (!isApiAvailable) {
        return this.createErrorResult(
          "Comment reading requires Word API 1.4 or later. " +
          "Please ensure you have Office 365 or Word 2021+ with latest updates."
        );
      }
      
      // Get all comments from the document body
      const comments = context.document.body.getComments();
      
      // First load the items collection
      comments.load("items");
      await context.document.context.sync();
      
      console.log(`[GetCommentsTool] Found ${comments.items.length} comments`);
      
      // Now load properties for each comment
      for (const comment of comments.items) {
        comment.load(["content", "authorName", "authorEmail", "creationDate", "resolved", "id"]);
      }
      await context.document.context.sync();
      
      const commentData: any[] = [];
      
      for (const comment of comments.items) {
        // Skip resolved comments if not requested
        if (!params.include_resolved && comment.resolved) {
          continue;
        }
        
        // Filter by type if specified (check if type keyword is in content)
        if (params.filter_type && params.filter_type !== "all") {
          const typeKeyword = `[${params.filter_type.toUpperCase()}]`;
          if (!comment.content.includes(typeKeyword)) {
            continue;
          }
        }
        
        // Get the range where the comment is attached
        let rangeText = "";
        try {
          const commentRange = comment.getRange();
          commentRange.load("text");
          await context.document.context.sync();
          rangeText = commentRange.text;
        } catch (e) {
          // Some comments might not have an associated range
          console.log("Could not get range for comment:", e);
        }
        
        // Build comment data object with all relevant fields
        const commentInfo: any = {
          id: comment.id,
          content: comment.content,
          author: comment.authorName || "Unknown",
          authorEmail: comment.authorEmail || "",
          createdDate: comment.creationDate,
          resolved: comment.resolved || false,
          attachedTo: rangeText || "Document",
          type: this.extractCommentType(comment.content)
        };
        
        // Get replies if requested
        if (params.include_replies) {
          try {
            const replies = comment.replies;
            replies.load("items");
            await context.document.context.sync();
            
            if (replies.items && replies.items.length > 0) {
              // Load properties for each reply
              for (const reply of replies.items) {
                reply.load(["content", "authorName", "creationDate"]);
              }
              await context.document.context.sync();
              
              commentInfo.replies = replies.items.map((reply: any) => ({
                content: reply.content,
                author: reply.authorName || "Unknown",
                createdDate: reply.creationDate
              }));
            } else {
              commentInfo.replies = [];
            }
          } catch (e) {
            // Replies might not be available
            commentInfo.replies = [];
          }
        }
        
        commentData.push(commentInfo);
      }
      
      // Return the actual comment data so it can be passed to the model
      if (commentData.length === 0) {
        return this.createSuccessResult(
          "No comments found in the document",
          []
        );
      }
      
      // Return success with the actual comment data
      return this.createSuccessResult(
        `Found ${commentData.length} comment${commentData.length !== 1 ? 's' : ''}`,
        commentData
      );
      
    } catch (error: any) {
      console.error("[GetCommentsTool] Error reading comments:", error);
      console.error("[GetCommentsTool] Error details:", {
        name: error.name,
        code: error.code,
        message: error.message,
        debugInfo: error.debugInfo
      });
      
      // Provide more specific error messages
      if (error.name === "RichApi.Error") {
        if (error.code === "PropertyNotLoaded") {
          return this.createErrorResult(
            "Failed to load comment properties. Please try again."
          );
        }
        if (error.code === "InvalidBinding" || error.code === "ItemNotFound") {
          return this.createErrorResult(
            "No comments found or comments are not accessible in this context."
          );
        }
        if (error.code === "ApiNotFound" || error.message?.includes("getComments")) {
          return this.createErrorResult(
            "The comments API is not available in this version of Word. " +
            "Please ensure you have Office 365 or Word 2021+ with the latest updates."
          );
        }
      }
      
      return this.createErrorResult(`Failed to read comments: ${error.message || error}`);
    }
  }
  
  private extractCommentType(content: string): string {
    // Look for type markers in the comment content
    if (content.includes("[SUGGESTION]")) return "suggestion";
    if (content.includes("[QUESTION]")) return "question";
    if (content.includes("[ISSUE]")) return "issue";
    if (content.includes("[PRAISE]")) return "praise";
    return "general";
  }
}