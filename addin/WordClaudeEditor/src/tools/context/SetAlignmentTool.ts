import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class SetAlignmentTool implements ToolDefinition {
  name = "set_alignment";
  description = "Set text alignment (left, center, right, justify) for a paragraph";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text to find and align (30-50 characters from the paragraph)",
      required: true
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
    const { anchor, alignment } = params;
    
    if (!anchor || !alignment) {
      return {
        success: false,
        error: "Both anchor and alignment are required"
      };
    }
    
    try {
      return await Word.run(async (context) => {
        // Search for the anchor text
        const searchResults = context.document.body.search(anchor, { matchCase: false });
        context.load(searchResults);
        await context.sync();
        
        if (searchResults.items.length === 0) {
          return {
            success: false,
            error: `Text not found: "${anchor}"`
          };
        }
        
        const firstMatch = searchResults.items[0];
        const paragraph = firstMatch.paragraphs.getFirst();
        context.load(paragraph);
        await context.sync();
        
        // Set alignment
        switch (alignment.toLowerCase()) {
          case "left":
            paragraph.alignment = Word.Alignment.left;
            break;
          case "center":
          case "centre":
            paragraph.alignment = Word.Alignment.centered;
            break;
          case "right":
            paragraph.alignment = Word.Alignment.right;
            break;
          case "justify":
          case "justified":
            paragraph.alignment = Word.Alignment.justified;
            break;
          default:
            return {
              success: false,
              error: `Invalid alignment: ${alignment}`
            };
        }
        
        await context.sync();
        
        return {
          success: true,
          message: `Set paragraph alignment to ${alignment}`
        };
      });
    } catch (error: any) {
      console.error("[SetAlignmentTool] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to set alignment"
      };
    }
  }
}