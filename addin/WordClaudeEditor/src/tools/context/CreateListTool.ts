import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class CreateListTool implements ToolDefinition {
  name = "create_list";
  description = "Convert text to a bulleted or numbered list";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text to find and convert to list (30-50 characters)",
      required: true
    },
    {
      name: "listType",
      type: "string",
      description: "Type of list: 'bullet' or 'numbered'",
      required: true,
      enum: ["bullet", "numbered"]
    },
    {
      name: "style",
      type: "string",
      description: "Bullet style (•, ◦, ▪, -, >) or numbering (1., a., i., A., I.)",
      required: false
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { anchor, listType, style } = params;
    
    if (!anchor || !listType) {
      return {
        success: false,
        error: "Both anchor and listType are required"
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
        const list = paragraph.startNewList();
        context.load(list);
        await context.sync();
        
        // Set list type and style
        if (listType === "bullet") {
          // Bullet styles mapping
          switch (style) {
            case "•":
            case "disc":
              list.levelTypes = [Word.ListLevelType.bullet];
              list.levelBullets = ["•"];
              break;
            case "◦":
            case "circle":
              list.levelTypes = [Word.ListLevelType.bullet];
              list.levelBullets = ["◦"];
              break;
            case "▪":
            case "square":
              list.levelTypes = [Word.ListLevelType.bullet];
              list.levelBullets = ["▪"];
              break;
            case "-":
            case "dash":
              list.levelTypes = [Word.ListLevelType.bullet];
              list.levelBullets = ["-"];
              break;
            case ">":
            case "arrow":
              list.levelTypes = [Word.ListLevelType.bullet];
              list.levelBullets = [">"];
              break;
            default:
              // Use default bullet
              list.levelTypes = [Word.ListLevelType.bullet];
              break;
          }
        } else {
          // Numbered styles mapping
          switch (style) {
            case "1.":
            case "decimal":
              list.levelTypes = [Word.ListLevelType.number];
              list.levelNumberings = ["decimal"];
              break;
            case "a.":
            case "lowerLetter":
              list.levelTypes = [Word.ListLevelType.number];
              list.levelNumberings = ["lowerLetter"];
              break;
            case "i.":
            case "lowerRoman":
              list.levelTypes = [Word.ListLevelType.number];
              list.levelNumberings = ["lowerRoman"];
              break;
            case "A.":
            case "upperLetter":
              list.levelTypes = [Word.ListLevelType.number];
              list.levelNumberings = ["upperLetter"];
              break;
            case "I.":
            case "upperRoman":
              list.levelTypes = [Word.ListLevelType.number];
              list.levelNumberings = ["upperRoman"];
              break;
            default:
              // Use default numbering
              list.levelTypes = [Word.ListLevelType.number];
              break;
          }
        }
        
        await context.sync();
        
        return {
          success: true,
          message: `Converted to ${listType} list${style ? ` with style ${style}` : ""}`
        };
      });
    } catch (error: any) {
      console.error("[CreateListTool] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to create list"
      };
    }
  }
}