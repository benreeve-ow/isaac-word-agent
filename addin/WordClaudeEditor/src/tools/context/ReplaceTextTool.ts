import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class ReplaceTextTool implements ToolDefinition {
  name = "replace_text";
  description = "Replace a paragraph or text section in the document";
  category: ToolDefinition["category"] = "editing";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text fragment to find (first 30-50 chars of the paragraph to replace)",
      required: true
    },
    {
      name: "content",
      type: "string",
      description: "The new text to replace with",
      required: true
    },
    {
      name: "scope",
      type: "string",
      description: "What to replace - the whole paragraph or just the exact match",
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
        description: "Text fragment to find (first 30-50 chars of the paragraph to replace)"
      },
      content: {
        type: "string",
        description: "The new text to replace with"
      },
      scope: {
        type: "string",
        enum: ["paragraph", "exact"],
        default: "paragraph",
        description: "What to replace - the whole paragraph or just the exact match"
      }
    },
    required: ["anchor", "content"]
  };
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { anchor, content, scope = "paragraph" } = params;
    
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
          // Replace the entire paragraph containing the anchor
          const paragraph = firstMatch.paragraphs.getFirst();
          context.load(paragraph);
          await context.sync();
          
          // Replace the paragraph text
          paragraph.clear();
          paragraph.insertText(content, "Replace");
        } else {
          // Replace just the exact match
          firstMatch.insertText(content, "Replace");
        }
        
        // Sync to apply changes
        await context.sync();
        
        return {
          success: true,
          message: `Replaced ${scope === "paragraph" ? "paragraph containing" : "text"} "${anchor.substring(0, 30)}..."`
        };
      });
    } catch (error: any) {
      console.error("[ReplaceTextTool] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to replace text"
      };
    }
  }
}