/**
 * Tool for inserting various types of breaks in the document
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class InsertBreakTool extends BaseTool {
  name = "insert_break";
  description = "Insert page breaks, section breaks, or line breaks";
  category = "structure" as const;
  
  parameters = [
    {
      name: "break_type",
      type: "string" as const,
      description: "Type of break to insert",
      enum: ["page", "section_next", "section_continuous", "line", "paragraph"],
      required: true
    },
    {
      name: "position",
      type: "string" as const,
      description: "Where to insert the break",
      enum: ["cursor", "after_selection", "before_selection", "end"],
      default: "cursor"
    }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    // Determine insertion point
    let insertLocation: Word.Range;
    
    switch (params.position) {
      case "end":
        insertLocation = context.document.body.getRange(Word.RangeLocation.end);
        break;
      case "after_selection":
        insertLocation = context.document.getSelection();
        insertLocation = insertLocation.getRange(Word.RangeLocation.after);
        break;
      case "before_selection":
        insertLocation = context.document.getSelection();
        // Use the selection itself for before position
        break;
      case "cursor":
      default:
        insertLocation = context.document.getSelection();
        break;
    }
    
    // Insert the appropriate break
    switch (params.break_type) {
      case "page":
        insertLocation.insertBreak(Word.BreakType.page, Word.InsertLocation.after);
        break;
      case "section_next":
        insertLocation.insertBreak(Word.BreakType.sectionNext, Word.InsertLocation.after);
        break;
      case "section_continuous":
        insertLocation.insertBreak(Word.BreakType.sectionContinuous, Word.InsertLocation.after);
        break;
      case "line":
        insertLocation.insertBreak(Word.BreakType.line, Word.InsertLocation.after);
        break;
      case "paragraph":
        insertLocation.insertParagraph("", Word.InsertLocation.after);
        break;
      default:
        return this.createErrorResult(`Unknown break type: ${params.break_type}`);
    }
    
    await context.document.context.sync();
    
    return this.createSuccessResult(
      `Inserted ${params.break_type} break`,
      {
        type: params.break_type,
        position: params.position
      },
      [{
        type: "structure",
        description: `Inserted ${params.break_type} break`,
        location: params.position
      }]
    );
  }
}