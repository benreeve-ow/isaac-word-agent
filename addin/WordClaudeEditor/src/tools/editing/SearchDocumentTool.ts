/**
 * Tool for searching text within the document
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class SearchDocumentTool extends BaseTool {
  name = "search_document";
  description = "Search for text in the document and return matches with context";
  category = "search" as const;
  
  parameters = [
    {
      name: "pattern",
      type: "string" as const,
      description: "The text pattern to search for",
      required: true
    },
    {
      name: "context_lines",
      type: "number" as const,
      description: "Number of context lines to include around matches",
      default: 2
    },
    {
      name: "match_case",
      type: "boolean" as const,
      description: "Whether to match case exactly",
      default: false
    },
    {
      name: "whole_word",
      type: "boolean" as const,
      description: "Whether to match whole words only",
      default: false
    }
  ];
  
  requiresApproval = false; // Read-only operation
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    const body = context.document.body;
    
    // Clean search pattern for Word API limitations
    let searchPattern = params.pattern || "";
    // Remove regex syntax that Word can't handle
    searchPattern = searchPattern.replace(/\.\*\?/g, "");
    searchPattern = searchPattern.replace(/\.\*/g, "");
    searchPattern = searchPattern.replace(/[\[\]\(\)\{\}\^\$\+\?\\]/g, "");
    
    if (!searchPattern.trim()) {
      return this.createErrorResult("Search pattern is empty after cleaning");
    }
    
    // Word has a 255 character limit for search
    if (searchPattern.length > 255) {
      searchPattern = searchPattern.substring(0, 255);
    }
    
    const searchResults = body.search(searchPattern, {
      matchCase: params.match_case || false,
      matchWholeWord: params.whole_word || false,
      matchWildcards: false
    });
    
    context.document.context.load(searchResults, "items");
    await context.document.context.sync();
    
    const results: any[] = [];
    
    for (const result of searchResults.items) {
      // Get the paragraph containing this result
      const paragraph = result.paragraphs.getFirst();
      paragraph.load("text");
      
      // Get surrounding context
      const prevParagraph = paragraph.getPrevious();
      const nextParagraph = paragraph.getNext();
      
      prevParagraph.load("text");
      nextParagraph.load("text");
      
      await context.document.context.sync();
      
      let contextText = "";
      try {
        contextText = prevParagraph.text + "\n";
      } catch {} // Previous might not exist
      
      contextText += paragraph.text;
      
      try {
        contextText += "\n" + nextParagraph.text;
      } catch {} // Next might not exist
      
      // Get full text of the result, not just 50 chars
      const fullText = result.text;
      
      results.push({
        text: fullText,
        location: `Paragraph containing: "${fullText.substring(0, 100)}${fullText.length > 100 ? '...' : ''}"`,
        context: contextText,
        fullMatch: fullText,
        paragraphText: paragraph.text,
        // Include a note about line breaks for Claude
        note: fullText.includes('\n') ? 
          `This text contains ${fullText.split('\n').length - 1} line break(s). When using edit_content, preserve these line breaks exactly.` : 
          undefined
      });
      
      // Limit results for performance
      if (results.length >= 10) break;
    }
    
    return this.createSuccessResult(
      `Found ${results.length} matches`,
      results
    );
  }
}