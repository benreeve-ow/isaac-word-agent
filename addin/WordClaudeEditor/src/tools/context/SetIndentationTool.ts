import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class SetIndentationTool implements ToolDefinition {
  name = "set_indentation";
  description = "Set paragraph indentation (first line, hanging, left/right margins)";
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
      description: "Text from the last paragraph to format (30-50 characters), or leave empty for single paragraph",
      required: false
    },
    {
      name: "firstLine",
      type: "number",
      description: "ABSOLUTE first line indent in points from left margin (not relative change)",
      required: false
    },
    {
      name: "leftIndent",
      type: "number",
      description: "ABSOLUTE left margin position in points (e.g., 72 = 1 inch from edge)",
      required: false
    },
    {
      name: "rightIndent",
      type: "number",
      description: "ABSOLUTE right margin position in points from right edge",
      required: false
    },
    {
      name: "hanging",
      type: "number",
      description: "Create hanging indent (first line at margin, rest indented by this amount)",
      required: false
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { startAnchor, endAnchor, firstLine, leftIndent, rightIndent, hanging } = params;
    
    if (!startAnchor) {
      return {
        success: false,
        error: "startAnchor is required"
      };
    }
    
    if (firstLine === undefined && leftIndent === undefined && 
        rightIndent === undefined && hanging === undefined) {
      return {
        success: false,
        error: "At least one indentation parameter must be specified"
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
        
        // Apply indentation to all paragraphs in range
        let paragraphCount = 0;
        const changes: string[] = [];
        
        for (let i = startIndex; i <= endIndex; i++) {
          const paragraph = allParagraphs.items[i];
          
          // Set left indent
          if (leftIndent !== undefined) {
            paragraph.leftIndent = leftIndent;
            if (paragraphCount === 0) changes.push(`left indent: ${leftIndent}pt`);
          }
          
          // Set right indent
          if (rightIndent !== undefined) {
            paragraph.rightIndent = rightIndent;
            if (paragraphCount === 0) changes.push(`right indent: ${rightIndent}pt`);
          }
          
          // Set first line indent or hanging indent
          if (hanging !== undefined) {
            // Hanging indent: first line is at left margin, rest indented
            paragraph.firstLineIndent = -Math.abs(hanging);
            paragraph.leftIndent = Math.abs(hanging);
            if (paragraphCount === 0) changes.push(`hanging indent: ${hanging}pt`);
          } else if (firstLine !== undefined) {
            paragraph.firstLineIndent = firstLine;
            if (paragraphCount === 0) {
              if (firstLine < 0) {
                changes.push(`hanging indent: ${Math.abs(firstLine)}pt`);
              } else {
                changes.push(`first line indent: ${firstLine}pt`);
              }
            }
          }
          
          paragraphCount++;
        }
        
        await context.sync();
        
        return {
          success: true,
          message: `Applied indentation to ${paragraphCount} paragraph${paragraphCount > 1 ? 's' : ''}: ${changes.join(", ")}`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to set indentation"
      };
    }
  }
}