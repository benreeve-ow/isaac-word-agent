import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class InsertTextTool implements ToolDefinition {
  name = "insert_text";
  description = "Insert text at the start, end, or relative to an anchor text in the document";
  category: ToolDefinition["category"] = "editing";
  
  parameters: ToolParameter[] = [
    {
      name: "position",
      type: "string",
      description: "Where to insert the text",
      required: true,
      enum: ["start", "end", "after", "before"]
    },
    {
      name: "anchor",
      type: "string",
      description: "Text fragment to search for (required for 'after' and 'before' positions). Use 30-50 chars",
      required: false
    },
    {
      name: "content",
      type: "string",
      description: "The text content to insert",
      required: true
    }
  ];
  
  inputSchema = {
    type: "object",
    properties: {
      position: {
        type: "string",
        enum: ["start", "end", "after", "before"],
        description: "Where to insert the text"
      },
      anchor: {
        type: "string",
        description: "Text fragment to search for (required for 'after' and 'before' positions). Use 30-50 chars"
      },
      content: {
        type: "string",
        description: "The text content to insert"
      }
    },
    required: ["position", "content"]
  };
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { position, anchor, content } = params;
    
    // Validate params
    if ((position === "after" || position === "before") && !anchor) {
      return {
        success: false,
        error: "Anchor text is required for 'after' and 'before' positions"
      };
    }
    
    try {
      return await Word.run(async (context) => {
        const body = context.document.body;
        let insertionPoint: Word.Range | null = null;
        
        if (position === "start") {
          // Insert at the beginning of the document
          insertionPoint = body.getRange("Start");
        } else if (position === "end") {
          // Insert at the end of the document
          insertionPoint = body.getRange("End");
        } else if (anchor) {
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
          
          if (position === "after") {
            // Find the paragraph containing the anchor and insert after it
            const paragraph = firstMatch.paragraphs.getFirst();
            context.load(paragraph);
            await context.sync();
            
            // Insert after the paragraph
            insertionPoint = paragraph.getRange("After");
          } else if (position === "before") {
            // Find the paragraph containing the anchor and insert before it
            const paragraph = firstMatch.paragraphs.getFirst();
            context.load(paragraph);
            await context.sync();
            
            // Insert before the paragraph  
            // Use Start and then move backward
            const paragraphStart = paragraph.getRange("Start");
            insertionPoint = paragraphStart;
            insertionPoint.insertParagraph("", "Before");
            insertionPoint = paragraph.getRange("Start").paragraphs.getFirst().getRange("Start");
          }
        }
        
        if (!insertionPoint) {
          return {
            success: false,
            error: "Could not determine insertion point"
          };
        }
        
        // Insert the content
        insertionPoint.insertText(content, "Replace");
        
        // Sync to apply changes
        await context.sync();
        
        return {
          success: true,
          message: `Text inserted ${position}${anchor ? ` the text containing "${anchor.substring(0, 30)}..."` : " of document"}`
        };
      });
    } catch (error: any) {
      console.error("[InsertTextTool] Error:", error);
      return {
        success: false,
        error: error.message || "Failed to insert text"
      };
    }
  }
}