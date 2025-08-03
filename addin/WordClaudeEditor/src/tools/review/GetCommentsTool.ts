/**
 * Tool for reading all comments in the document
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class GetCommentsTool extends BaseTool {
  name = "get_comments";
  description = "Get all comments in the document with their associated text";
  category = "review" as const;
  
  parameters = [
    {
      name: "filter_type",
      type: "string" as const,
      description: "Filter comments by type",
      enum: ["all", "suggestion", "question", "issue", "praise", "general"],
      default: "all"
    },
    {
      name: "include_resolved",
      type: "boolean" as const,
      description: "Include resolved comments",
      default: false
    }
  ];
  
  requiresApproval = false; // Read-only operation
  
  async execute(_params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    // Note: Word.js API has limited comment support
    // This is a simplified implementation that searches for comment markers
    // In a real implementation, you might need to use Office.context.document.customXmlParts
    // or maintain a separate comment tracking system
    
    try {
      // Get all content ranges that have comments
      const body = context.document.body;
      const paragraphs = body.paragraphs;
      
      context.document.context.load(paragraphs, "items");
      await context.document.context.sync();
      
      const comments: any[] = [];
      
      // This is a placeholder - Word.js doesn't directly expose comments
      // In production, you'd need to:
      // 1. Track comments separately in document properties
      // 2. Use Office Open XML to access comments
      // 3. Or use a custom XML part to store comment metadata
      
      // For now, return a message indicating the limitation
      return this.createSuccessResult(
        "Comment reading requires advanced Word API features",
        {
          message: "Direct comment access is limited in Word.js API. Consider using track changes for review workflow.",
          alternative: "Use 'add_comment' to add comments that will appear in Word's comment pane."
        }
      );
    } catch (error) {
      return this.createErrorResult(`Failed to read comments: ${error}`);
    }
  }
}