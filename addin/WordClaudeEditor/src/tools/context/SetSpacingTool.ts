import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class SetSpacingTool implements ToolDefinition {
  name = "set_spacing";
  description = "Set line spacing and paragraph spacing for one or more paragraphs";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "startAnchor",
      type: "string",
      description: "Text from the first paragraph to format (30-50 characters)",
      required: true
    },
    {
      name: "endAnchor",
      type: "string",
      description: "Text from the last paragraph to format, or leave empty for single paragraph",
      required: false
    },
    {
      name: "lineSpacing",
      type: "string",
      description: "Line spacing: 'single', '1.5', 'double', or a number (e.g., 2.5)",
      required: false
    },
    {
      name: "spaceBefore",
      type: "number",
      description: "Points of space before paragraphs",
      required: false
    },
    {
      name: "spaceAfter",
      type: "number",
      description: "Points of space after paragraphs",
      required: false
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { startAnchor, endAnchor, lineSpacing, spaceBefore, spaceAfter } = params;
    
    if (!startAnchor) {
      return {
        success: false,
        error: "startAnchor is required"
      };
    }
    
    if (!lineSpacing && spaceBefore === undefined && spaceAfter === undefined) {
      return {
        success: false,
        error: "At least one spacing parameter must be specified"
      };
    }
    
    try {
      return await Word.run(async (context) => {
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
        
        // Determine line spacing value if specified
        let spacingValue: number | undefined;
        if (lineSpacing) {
          switch (lineSpacing.toLowerCase()) {
            case "single":
            case "1":
              spacingValue = 1;
              break;
            case "1.5":
            case "one and a half":
              spacingValue = 1.5;
              break;
            case "double":
            case "2":
              spacingValue = 2;
              break;
            default:
              // Try to parse as number
              spacingValue = parseFloat(lineSpacing);
              if (isNaN(spacingValue)) {
                return {
                  success: false,
                  error: `Invalid line spacing: ${lineSpacing}`
                };
              }
          }
        }
        
        // Apply spacing to all paragraphs in range
        let paragraphCount = 0;
        const changes: string[] = [];
        
        for (let i = startIndex; i <= endIndex; i++) {
          const paragraph = allParagraphs.items[i];
          
          // Set line spacing
          if (spacingValue !== undefined) {
            paragraph.lineSpacing = spacingValue * 12; // Convert to points (12pt = 1 line)
            if (paragraphCount === 0) changes.push(`line spacing: ${lineSpacing}`);
          }
          
          // Set space before paragraph
          if (spaceBefore !== undefined) {
            paragraph.spaceBefore = spaceBefore;
            if (paragraphCount === 0) changes.push(`space before: ${spaceBefore}pt`);
          }
          
          // Set space after paragraph
          if (spaceAfter !== undefined) {
            paragraph.spaceAfter = spaceAfter;
            if (paragraphCount === 0) changes.push(`space after: ${spaceAfter}pt`);
          }
          
          paragraphCount++;
        }
        
        await context.sync();
        
        return {
          success: true,
          message: `Applied spacing to ${paragraphCount} paragraph${paragraphCount > 1 ? 's' : ''}: ${changes.join(", ")}`
        };
      });
    } catch (error: any) {
      console.error("[SetSpacingTool] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to set spacing"
      };
    }
  }
}