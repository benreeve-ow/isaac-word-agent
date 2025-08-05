/**
 * Tool for inserting new content at specific positions
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class InsertContentTool extends BaseTool {
  name = "insert_content";
  description = "Insert new content at a specific position in the document";
  category = "editing" as const;
  
  parameters = [
    {
      name: "content",
      type: "string" as const,
      description: "The content to insert",
      required: true
    },
    {
      name: "position",
      type: "string" as const,
      description: "Where to insert the content. 'after_text' inserts after the paragraph containing the reference. 'next_paragraph' finds the next paragraph after reference.",
      enum: ["beginning", "end", "after_text", "before_text", "after_selection", "before_selection", "next_paragraph"],
      required: true
    },
    {
      name: "reference_text",
      type: "string" as const,
      description: "Reference text for before_text/after_text positions",
      required: false
    }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    const body = context.document.body;
    
    // Enable track changes
    context.document.changeTrackingMode = Word.ChangeTrackingMode.trackAll;
    
    let insertLocation: Word.Range | undefined;
    let contentToInsert = params.content;
    
    switch (params.position) {
      case "beginning":
        insertLocation = body.getRange(Word.RangeLocation.start);
        break;
      
      case "end":
        insertLocation = body.getRange(Word.RangeLocation.end);
        break;
      
      case "after_selection":
      case "before_selection":
        if (!context.selection) {
          const selection = context.document.getSelection();
          context.document.context.load(selection, "text");
          await context.document.context.sync();
          context.selection = selection;
        }
        
        if (!context.selection.text) {
          return this.createErrorResult("No text selected");
        }
        
        if (params.position === "after_selection") {
          insertLocation = context.selection.getRange(Word.RangeLocation.after);
        } else {
          // For before_selection, we need to use the selection itself
          insertLocation = context.selection;
        }
        break;
      
      case "after_text":
      case "before_text":
        if (!params.reference_text) {
          return this.createErrorResult("Reference text required for this position");
        }
        
        const searchResults = body.search(params.reference_text, {
          matchCase: false,
          matchWholeWord: false
        });
        
        context.document.context.load(searchResults, "items");
        await context.document.context.sync();
        
        if (searchResults.items.length === 0) {
          return this.createErrorResult("Reference text not found");
        }
        
        const referenceRange = searchResults.items[0];
        
        if (params.position === "after_text") {
          const paragraph = referenceRange.paragraphs.getFirst();
          paragraph.load("text");
          await context.document.context.sync();
          
          insertLocation = paragraph.getRange(Word.RangeLocation.after);
          // Ensure proper paragraph spacing
          // Add a line break at the start if content doesn't have one
          if (!contentToInsert.startsWith('\n')) {
            contentToInsert = '\n' + contentToInsert;
          }
          // Add a line break at the end if inserting a full paragraph
          if (contentToInsert.length > 50 && !contentToInsert.endsWith('\n')) {
            contentToInsert = contentToInsert + '\n';
          }
        } else {
          // For before_text, insert at the start of the reference
          insertLocation = referenceRange.getRange(Word.RangeLocation.start);
        }
        break;
        
      case "next_paragraph":
        if (!params.reference_text) {
          return this.createErrorResult("Reference text required for next_paragraph position");
        }
        
        const nextSearchResults = body.search(params.reference_text, {
          matchCase: false,
          matchWholeWord: false
        });
        
        context.document.context.load(nextSearchResults, "items");
        await context.document.context.sync();
        
        if (nextSearchResults.items.length === 0) {
          return this.createErrorResult("Reference text not found");
        }
        
        const nextReferenceRange = nextSearchResults.items[0];
        const containingParagraph = nextReferenceRange.paragraphs.getFirst();
        
        // Get the next paragraph after this one
        const nextParagraph = containingParagraph.getNext();
        
        if (nextParagraph.isNullObject) {
          // No next paragraph, insert at end of document
          insertLocation = body.getRange(Word.RangeLocation.end);
        } else {
          // Insert at the start of the next paragraph
          insertLocation = nextParagraph.getRange(Word.RangeLocation.start);
        }
        
        // Add line breaks to create buffer
        if (!contentToInsert.startsWith('\n')) {
          contentToInsert = '\n\n' + contentToInsert;
        }
        break;
    }
    
    if (!insertLocation) {
      return this.createErrorResult("Could not determine insert location");
    }
    
    // Insert the content (Word handles paragraph spacing automatically)
    const insertedRange = insertLocation.insertText(contentToInsert, Word.InsertLocation.replace);
    
    // Apply normal formatting (not bold)
    insertedRange.font.bold = false;
    insertedRange.style = "Normal";
    
    await context.document.context.sync();
    
    return this.createSuccessResult(
      `Inserted content at ${params.position}`,
      { position: params.position },
      [{
        type: "insert",
        description: `Inserted ${contentToInsert.length} characters`,
        location: params.position
      }]
    );
  }
}