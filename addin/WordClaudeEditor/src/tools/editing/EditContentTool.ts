/**
 * Tool for editing/replacing content in the document
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class EditContentTool extends BaseTool {
  name = "edit_content";
  description = "Replace specific text in the document with new content";
  category = "editing" as const;
  
  parameters = [
    {
      name: "search_text",
      type: "string" as const,
      description: "The text to search for and replace",
      required: true
    },
    {
      name: "replacement_text",
      type: "string" as const,
      description: "The new text to replace with",
      required: true
    },
    {
      name: "match_case",
      type: "boolean" as const,
      description: "Whether to match case exactly",
      default: false
    },
    {
      name: "replace_all",
      type: "boolean" as const,
      description: "Whether to replace all occurrences or just the first",
      default: false
    }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    const body = context.document.body;
    
    // Enable track changes
    context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
    
    // Handle search text length limitation (255 chars max)
    let searchText = params.search_text || "";
    const maxSearchLength = 200; // Keep well under limit
    
    if (searchText.length > maxSearchLength) {
      // Try to use first sentence or natural break
      const sentences = searchText.match(/[^.!?\n]+[.!?\n]+/g) || [];
      if (sentences.length > 0 && sentences[0].length < maxSearchLength) {
        searchText = sentences[0].trim();
      } else {
        // Truncate at word boundary
        searchText = searchText.substring(0, maxSearchLength);
        const lastSpace = searchText.lastIndexOf(" ");
        if (lastSpace > 50) {
          searchText = searchText.substring(0, lastSpace);
        }
      }
    }
    
    console.log(`[EditContentTool] Searching for text (${searchText.length} chars):`, searchText);
    console.log(`[EditContentTool] Has line breaks:`, searchText.includes('\n'));
    
    // Search for the text
    let searchResults = body.search(searchText, {
      matchCase: params.match_case || false,
      matchWholeWord: false
    });
    
    context.document.context.load(searchResults, "items");
    await context.document.context.sync();
    
    if (searchResults.items.length === 0) {
      // Try searching without line breaks as a fallback
      const searchTextNoBreaks = searchText.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
      
      if (searchTextNoBreaks !== searchText) {
        console.log(`[EditContentTool] No matches with line breaks, trying without:`, searchTextNoBreaks);
        
        searchResults = body.search(searchTextNoBreaks, {
          matchCase: params.match_case || false,
          matchWholeWord: false
        });
        
        context.document.context.load(searchResults, "items");
        await context.document.context.sync();
        
        if (searchResults.items.length > 0) {
          console.log(`[EditContentTool] Found matches without line breaks`);
        }
      }
    }
    
    if (searchResults.items.length === 0) {
      // Try searching for just a portion of the text
      const portion = searchText.split('\n')[0].substring(0, 100);
      if (portion.length > 20) {
        console.log(`[EditContentTool] Trying with first line only:`, portion);
        
        searchResults = body.search(portion, {
          matchCase: params.match_case || false,
          matchWholeWord: false
        });
        
        context.document.context.load(searchResults, "items");
        await context.document.context.sync();
        
        if (searchResults.items.length > 0) {
          console.log(`[EditContentTool] Found matches with partial text`);
        }
      }
    }
    
    if (searchResults.items.length === 0) {
      return this.createErrorResult(`Text not found. Searched for: "${searchText.substring(0, 50)}..." (${searchText.length} chars, has line breaks: ${searchText.includes('\n')})`);
    }
    
    // Replace occurrences
    const replaceCount = params.replace_all ? searchResults.items.length : 1;
    const changes: any[] = [];
    
    for (let i = 0; i < replaceCount; i++) {
      searchResults.items[i].insertText(params.replacement_text, Word.InsertLocation.replace);
      changes.push({
        type: "edit",
        description: `Replaced text at position ${i + 1}`,
        location: `Occurrence ${i + 1}`
      });
    }
    
    await context.document.context.sync();
    
    return this.createSuccessResult(
      `Replaced ${replaceCount} occurrence${replaceCount > 1 ? 's' : ''}`,
      { occurrences: replaceCount },
      changes
    );
  }
}