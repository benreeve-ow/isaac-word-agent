/**
 * Tool for applying text formatting (bold, italic, underline, etc.)
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class ApplyFormattingTool extends BaseTool {
  name = "apply_formatting";
  description = "Apply text formatting like bold, italic, underline to selected text or specific content";
  category = "formatting" as const;
  
  parameters = [
    {
      name: "format_type",
      type: "string" as const,
      description: "Type of formatting to apply",
      enum: ["bold", "italic", "underline", "strikethrough", "subscript", "superscript", "highlight"],
      required: true
    },
    {
      name: "value",
      type: "boolean" as const,
      description: "Whether to apply (true) or remove (false) the formatting",
      default: true
    },
    {
      name: "target_text",
      type: "string" as const,
      description: "Specific text to format (if not provided, uses selection)",
      required: false
    },
    {
      name: "highlight_color",
      type: "string" as const,
      description: "Highlight color (for highlight format type)",
      enum: ["yellow", "green", "blue", "red", "pink", "gray"],
      default: "yellow"
    }
  ];
  
  requiresSelection = false; // Can work with target_text
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    let targetRange: Word.Range;
    
    // Determine what to format
    if (params.target_text) {
      // Search for specific text
      const searchResults = context.document.body.search(params.target_text, {
        matchCase: false,
        matchWholeWord: false
      });
      
      context.document.context.load(searchResults, "items");
      await context.document.context.sync();
      
      if (searchResults.items.length === 0) {
        return this.createErrorResult("Target text not found");
      }
      
      targetRange = searchResults.items[0];
    } else {
      // Use current selection
      targetRange = context.document.getSelection();
      context.document.context.load(targetRange, "text");
      await context.document.context.sync();
      
      if (!targetRange.text.trim()) {
        return this.createErrorResult("No text selected to format");
      }
    }
    
    // Apply formatting based on type
    const font = targetRange.font;
    const value = params.value !== false;
    
    switch (params.format_type) {
      case "bold":
        font.bold = value;
        break;
      case "italic":
        font.italic = value;
        break;
      case "underline":
        font.underline = value ? Word.UnderlineType.single : Word.UnderlineType.none;
        break;
      case "strikethrough":
        font.strikeThrough = value;
        break;
      case "subscript":
        font.subscript = value;
        break;
      case "superscript":
        font.superscript = value;
        break;
      case "highlight":
        if (value) {
          const colorMap: { [key: string]: string } = {
            "yellow": "#FFFF00",
            "green": "#00FF00",
            "blue": "#00FFFF",
            "red": "#FF0000",
            "pink": "#FF00FF",
            "gray": "#808080"
          };
          font.highlightColor = colorMap[params.highlight_color || "yellow"];
        } else {
          font.highlightColor = null;
        }
        break;
      default:
        return this.createErrorResult(`Unknown format type: ${params.format_type}`);
    }
    
    await context.document.context.sync();
    
    return this.createSuccessResult(
      `${value ? 'Applied' : 'Removed'} ${params.format_type} formatting`,
      { 
        format: params.format_type,
        applied: value,
        text: targetRange.text.substring(0, 50)
      },
      [{
        type: "format",
        description: `${value ? 'Applied' : 'Removed'} ${params.format_type}`,
        location: params.target_text || "selection"
      }]
    );
  }
}