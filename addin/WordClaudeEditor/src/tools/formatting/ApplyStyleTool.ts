/**
 * Tool for applying paragraph and character styles
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class ApplyStyleTool extends BaseTool {
  name = "apply_style";
  description = "Apply paragraph or character styles to text";
  category = "formatting" as const;
  
  parameters = [
    {
      name: "style_name",
      type: "string" as const,
      description: "Name of the style to apply",
      enum: [
        "Normal", "Heading 1", "Heading 2", "Heading 3", "Heading 4",
        "Title", "Subtitle", "Quote", "Intense Quote", "Emphasis",
        "Strong", "List Paragraph", "No Spacing", "Code"
      ],
      required: true
    },
    {
      name: "target",
      type: "string" as const,
      description: "What to apply the style to",
      enum: ["selection", "paragraph", "document"],
      default: "selection"
    }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    let targetRange: Word.Range | Word.ParagraphCollection;
    
    switch (params.target) {
      case "document":
        targetRange = context.document.body.paragraphs;
        break;
      
      case "paragraph":
        const selection = context.document.getSelection();
        targetRange = selection.paragraphs;
        break;
      
      case "selection":
      default:
        targetRange = context.document.getSelection();
        context.document.context.load(targetRange, "text");
        await context.document.context.sync();
        
        if ((targetRange as Word.Range).text && !(targetRange as Word.Range).text.trim()) {
          return this.createErrorResult("No text selected");
        }
        break;
    }
    
    // Apply the style
    if (targetRange instanceof Word.ParagraphCollection) {
      context.document.context.load(targetRange, "items");
      await context.document.context.sync();
      
      for (const paragraph of targetRange.items) {
        paragraph.style = params.style_name;
      }
    } else {
      targetRange.style = params.style_name;
    }
    
    await context.document.context.sync();
    
    return this.createSuccessResult(
      `Applied "${params.style_name}" style to ${params.target}`,
      { 
        style: params.style_name,
        target: params.target
      },
      [{
        type: "style",
        description: `Applied ${params.style_name} style`,
        location: params.target
      }]
    );
  }
}