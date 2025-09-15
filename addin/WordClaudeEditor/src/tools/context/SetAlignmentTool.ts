import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";
import { enableTrackChanges } from "./trackChangesHelper";

export class SetAlignmentTool implements ToolDefinition {
  name = "set_alignment";
  description = "Set text alignment for one or more paragraphs";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "startAnchor",
      type: "string",
      description: "Text from the first paragraph to align (30-50 characters)",
      required: true
    },
    {
      name: "endAnchor",
      type: "string",
      description: "Text from the last paragraph to align, or leave empty for single paragraph",
      required: false
    },
    {
      name: "alignment",
      type: "string",
      description: "Alignment type: left, center, right, or justify",
      required: true,
      enum: ["left", "center", "right", "justify"]
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { startAnchor, endAnchor, alignment } = params;
    
    if (!startAnchor || !alignment) {
      return {
        success: false,
        error: "startAnchor and alignment are required"
      };
    }
    
    try {
      return await Word.run(async (context) => {
        await enableTrackChanges(context);
        // Get all paragraphs
        const allParagraphs = context.document.body.paragraphs;
        context.load(allParagraphs);
        await context.sync();
        
        // Find start paragraph
        let startIndex = -1;
        let endIndex = -1;
        
        for (let i = 0; i < allParagraphs.items.length; i++) {
          const para = allParagraphs.items[i];
          context.load(para);
          await context.sync();
          
          if (para.text.includes(startAnchor)) {
            startIndex = i;
            if (!endAnchor) {
              endIndex = i; // Single paragraph
            }
            break;
          }
        }
        
        if (startIndex === -1) {
          return {
            success: false,
            error: `Start text not found: "${startAnchor}"`
          };
        }
        
        // Find end paragraph if specified
        if (endAnchor) {
          for (let i = startIndex; i < allParagraphs.items.length; i++) {
            const para = allParagraphs.items[i];
            context.load(para);
            await context.sync();
            
            if (para.text.includes(endAnchor)) {
              endIndex = i;
              break;
            }
          }
          
          if (endIndex === -1) {
            return {
              success: false,
              error: `End text not found: "${endAnchor}"`
            };
          }
        }
        
        // Apply alignment to all paragraphs in range
        let paragraphCount = 0;
        let alignmentValue: Word.Alignment;
        
        switch (alignment.toLowerCase()) {
          case "left":
            alignmentValue = Word.Alignment.left;
            break;
          case "center":
          case "centre":
            alignmentValue = Word.Alignment.centered;
            break;
          case "right":
            alignmentValue = Word.Alignment.right;
            break;
          case "justify":
          case "justified":
            alignmentValue = Word.Alignment.justified;
            break;
          default:
            return {
              success: false,
              error: `Invalid alignment: ${alignment}`
            };
        }
        
        for (let i = startIndex; i <= endIndex; i++) {
          const paragraph = allParagraphs.items[i];
          paragraph.alignment = alignmentValue;
          paragraphCount++;
        }
        
        await context.sync();
        
        return {
          success: true,
          message: `Set ${alignment} alignment for ${paragraphCount} paragraph${paragraphCount > 1 ? 's' : ''}`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to set alignment"
      };
    }
  }
}