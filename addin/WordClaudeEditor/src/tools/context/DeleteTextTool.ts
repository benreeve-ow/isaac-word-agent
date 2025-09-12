import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class DeleteTextTool implements ToolDefinition {
  name = "delete_text";
  description = "Delete a paragraph or text section from the document";
  category: ToolDefinition["category"] = "editing";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text fragment to find (first 30-50 chars of the paragraph to delete)",
      required: true
    },
    {
      name: "scope",
      type: "string",
      description: "What to delete - the whole paragraph or just the exact match",
      required: false,
      enum: ["paragraph", "exact"],
      default: "paragraph"
    }
  ];
  
  inputSchema = {
    type: "object",
    properties: {
      anchor: {
        type: "string",
        description: "Text fragment to find (first 30-50 chars of the paragraph to delete)"
      },
      scope: {
        type: "string",
        enum: ["paragraph", "exact"],
        default: "paragraph",
        description: "What to delete - the whole paragraph or just the exact match"
      }
    },
    required: ["anchor"]
  };
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { anchor, scope = "paragraph" } = params;
    
    try {
      return await Word.run(async (context) => {
        const body = context.document.body;
        
        // Normalize anchor text: remove line breaks and extra spaces
        const normalizedAnchor = anchor
          .replace(/[\r\n]+/g, ' ')  // Replace line breaks with spaces
          .replace(/\s+/g, ' ')      // Replace multiple spaces with single space
          .trim();
        
        // Search for anchor text
        const searchResults = body.search(normalizedAnchor, { matchCase: false, matchWholeWord: false });
        context.load(searchResults);
        await context.sync();
        
        if (searchResults.items.length === 0) {
          return {
            success: false,
            error: `Anchor text not found: "${anchor}"`
          };
        }
        
        // Use the first occurrence
        const firstMatch = searchResults.items[0];
        
        if (scope === "paragraph") {
          // Delete the entire paragraph containing the anchor
          const paragraph = firstMatch.paragraphs.getFirst();
          context.load(paragraph);
          await context.sync();
          
          // Delete the paragraph
          paragraph.delete();
        } else {
          // Delete just the exact match
          firstMatch.delete();
        }
        
        // Sync to apply changes
        await context.sync();
        
        return {
          success: true,
          message: `Deleted ${scope === "paragraph" ? "paragraph containing" : "text"} "${anchor.substring(0, 30)}..."`
        };
      });
    } catch (error: any) {
      console.error("[DeleteTextTool] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to delete text"
      };
    }
  }
}