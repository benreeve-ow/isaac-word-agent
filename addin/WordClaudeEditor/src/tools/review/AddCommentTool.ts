/**
 * Tool for adding comments to the document
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class AddCommentTool extends BaseTool {
  name = "add_comment";
  description = "Add a review comment to selected text or specific location";
  category = "review" as const;
  
  parameters = [
    {
      name: "comment_text",
      type: "string" as const,
      description: "The text of the comment",
      required: true
    },
    {
      name: "target_text",
      type: "string" as const,
      description: "Text to attach the comment to (if not using selection)",
      required: false
    },
    {
      name: "comment_type",
      type: "string" as const,
      description: "Type of comment",
      enum: ["suggestion", "question", "issue", "praise", "general"],
      default: "general"
    },
    {
      name: "priority",
      type: "string" as const,
      description: "Priority level of the comment",
      enum: ["high", "medium", "low"],
      default: "medium"
    }
  ];
  
  requiresApproval = false; // Comments are non-destructive
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    let targetRange: Word.Range;
    
    // Determine where to add the comment
    if (params.target_text) {
      // Handle search text length limitation (255 chars max in Word)
      let searchText = params.target_text;
      const maxSearchLength = 200; // Keep well under limit
      
      if (searchText.length > maxSearchLength) {
        // Try to use first sentence or natural break
        const sentences = searchText.match(/[^.!?\n]+[.!?\n]+/g) || [];
        if (sentences.length > 0 && sentences[0].length < maxSearchLength) {
          searchText = sentences[0].trim();
        } else {
          // Use first part with word boundary
          searchText = searchText.substring(0, maxSearchLength);
          const lastSpace = searchText.lastIndexOf(" ");
          if (lastSpace > 50) {
            searchText = searchText.substring(0, lastSpace);
          }
        }
        console.log(`[AddCommentTool] Truncated search from ${params.target_text.length} to ${searchText.length} chars`);
      }
      
      // Search for specific text
      const searchResults = context.document.body.search(searchText, {
        matchCase: false,
        matchWholeWord: false
      });
      
      context.document.context.load(searchResults, "items");
      await context.document.context.sync();
      
      if (searchResults.items.length === 0) {
        return this.createErrorResult(`Target text not found. Searched for: "${searchText.substring(0, 50)}..."`);
      }
      
      targetRange = searchResults.items[0];
    } else {
      // Use current selection
      targetRange = context.document.getSelection();
      context.document.context.load(targetRange, "text");
      await context.document.context.sync();
      
      if (!targetRange.text.trim()) {
        return this.createErrorResult("No text selected for comment");
      }
    }
    
    // Build comment text with metadata
    const metadata = {
      type: params.comment_type,
      priority: params.priority,
      timestamp: new Date().toISOString(),
      source: "AI Assistant"
    };
    
    const fullCommentText = `[${params.comment_type.toUpperCase()}] ${params.comment_text}\n\n` +
                           `Priority: ${params.priority}\n` +
                           `Added by: AI Assistant\n` +
                           `Time: ${new Date().toLocaleString()}`;
    
    // Add the comment
    targetRange.insertComment(fullCommentText);
    await context.document.context.sync();
    
    return this.createSuccessResult(
      "Comment added successfully",
      { 
        comment: params.comment_text,
        type: params.comment_type,
        priority: params.priority,
        location: targetRange.text.substring(0, 50)
      },
      [{
        type: "comment",
        description: `Added ${params.comment_type} comment`,
        location: params.target_text || "selection"
      }]
    );
  }
}