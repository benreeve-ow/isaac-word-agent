import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class InsertFootnoteTool implements ToolDefinition {
  name = "insert_footnote";
  description = "Insert a footnote or endnote at a specific location";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text where the footnote reference should be inserted (30-50 characters)",
      required: true
    },
    {
      name: "text",
      type: "string",
      description: "The footnote/endnote text content",
      required: true
    },
    {
      name: "type",
      type: "string",
      description: "Type of note: 'footnote' or 'endnote'",
      required: false,
      enum: ["footnote", "endnote"]
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { anchor, text, type = "footnote" } = params;
    
    if (!anchor || !text) {
      return {
        success: false,
        error: "Both anchor and text are required"
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
        // Get the end of the matched text to insert footnote
        const insertRange = firstMatch.getRange(Word.RangeLocation.end);
        
        // Insert footnote or endnote
        if (type === "endnote") {
          // Insert endnote
          const endnote = insertRange.insertEndnote(text);
          context.load(endnote);
        } else {
          // Insert footnote (default)
          const footnote = insertRange.insertFootnote(text);
          context.load(footnote);
        }
        
        await context.sync();
        
        return {
          success: true,
          message: `Inserted ${type} after "${anchor.substring(0, 30)}..."`
        };
      });
    } catch (error: any) {
      console.error("[InsertFootnoteTool] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to insert footnote"
      };
    }
  }
}