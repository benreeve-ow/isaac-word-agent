import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class AdjustListLevelTool implements ToolDefinition {
  name = "adjust_list_level";
  description = "Increase or decrease indentation level of list items";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "startAnchor",
      type: "string",
      description: "Text from the first list item to adjust (30-50 characters)",
      required: true
    },
    {
      name: "endAnchor",
      type: "string",
      description: "Text from the last list item to adjust, or leave empty for single item",
      required: false
    },
    {
      name: "direction",
      type: "string",
      description: "Direction to adjust: 'increase' (indent) or 'decrease' (outdent)",
      required: true,
      enum: ["increase", "decrease"]
    },
    {
      name: "levels",
      type: "number",
      description: "Number of levels to adjust (default: 1)",
      required: false
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { startAnchor, endAnchor, direction, levels = 1 } = params;
    
    if (!startAnchor || !direction) {
      return {
        success: false,
        error: "startAnchor and direction are required"
      };
    }
    
    if (!["increase", "decrease"].includes(direction)) {
      return {
        success: false,
        error: "Direction must be 'increase' or 'decrease'"
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
              endIndex = i; // Single item
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
        
        // Adjust list levels for all paragraphs in range
        let adjustedCount = 0;
        let failedCount = 0;
        
        for (let i = startIndex; i <= endIndex; i++) {
          const paragraph = allParagraphs.items[i];
          
          // Load list item properties
          const listItem = paragraph.listItem;
          if (listItem) {
            context.load(listItem, ['level']);
            await context.sync();
            
            const currentLevel = listItem.level;
            let newLevel = currentLevel;
            
            if (direction === "increase") {
              newLevel = Math.min(currentLevel + levels, 8); // Word supports up to 9 levels (0-8)
            } else {
              newLevel = Math.max(currentLevel - levels, 0);
            }
            
            if (newLevel !== currentLevel) {
              try {
                listItem.level = newLevel;
                adjustedCount++;
              } catch (e) {
                failedCount++;
              }
            }
          } else {
            // Not a list item - check if it's in a list context
            context.load(paragraph, ['listItemOrNullObject']);
            await context.sync();
            
            if (paragraph.listItemOrNullObject.isNullObject) {
              failedCount++;
            }
          }
        }
        
        await context.sync();
        
        if (adjustedCount === 0 && failedCount > 0) {
          return {
            success: false,
            error: "No list items found in the specified range"
          };
        }
        
        const directionText = direction === "increase" ? "indented" : "outdented";
        const levelText = levels === 1 ? "1 level" : `${levels} levels`;
        
        return {
          success: true,
          message: `Successfully ${directionText} ${adjustedCount} list item${adjustedCount !== 1 ? 's' : ''} by ${levelText}${failedCount > 0 ? ` (${failedCount} items could not be adjusted)` : ''}`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to adjust list level"
      };
    }
  }
}