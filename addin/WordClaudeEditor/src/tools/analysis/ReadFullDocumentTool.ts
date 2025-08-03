/**
 * Tool for reading the full document content when search is insufficient
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class ReadFullDocumentTool extends BaseTool {
  name = "read_full_document";
  description = "Read the entire document content. Use this when you need to understand the full context or when search isn't finding what you need.";
  category = "analysis" as const;
  
  parameters = [
    {
      name: "include_metadata",
      type: "boolean" as const,
      description: "Include document metadata (word count, etc.)",
      default: true
    },
    {
      name: "max_length",
      type: "number" as const,
      description: "Maximum number of characters to return (default 100000)",
      default: 100000
    }
  ];
  
  requiresApproval = false; // Read-only operation
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    const body = context.document.body;
    const paragraphs = body.paragraphs;
    
    // Load all paragraphs with their text
    context.document.context.load(paragraphs, "items");
    context.document.context.load(body, "text");
    await context.document.context.sync();
    
    // Get full document text
    let fullText = body.text;
    const maxLength = params.max_length || 100000;
    
    // Calculate token estimate (rough: 1 token ≈ 4 characters)
    const estimatedTokens = Math.ceil(fullText.length / 4);
    
    // Truncate if necessary
    let truncated = false;
    if (fullText.length > maxLength) {
      fullText = fullText.substring(0, maxLength);
      truncated = true;
    }
    
    // Get metadata if requested
    let metadata: any = {};
    if (params.include_metadata !== false) {
      const wordCount = fullText.split(/\s+/).filter(word => word.length > 0).length;
      const paragraphCount = paragraphs.items.length;
      
      // Find section headers
      const sections: string[] = [];
      for (const paragraph of paragraphs.items) {
        paragraph.load("style");
        await context.document.context.sync();
        
        if (paragraph.style.toLowerCase().includes("heading")) {
          sections.push(paragraph.text);
        }
      }
      
      metadata = {
        characterCount: fullText.length,
        wordCount: wordCount,
        paragraphCount: paragraphCount,
        estimatedTokens: estimatedTokens,
        sections: sections,
        truncated: truncated
      };
    }
    
    return this.createSuccessResult(
      truncated ? 
        `Document content retrieved (truncated at ${maxLength} characters)` : 
        "Full document content retrieved",
      {
        content: fullText,
        metadata: metadata
      }
    );
  }
}