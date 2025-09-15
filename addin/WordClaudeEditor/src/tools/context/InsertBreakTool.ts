import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";
import { enableTrackChanges } from "./trackChangesHelper";

export class InsertBreakTool implements ToolDefinition {
  name = "insert_break";
  description = "Insert a page break, section break, or column break in the document";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "position",
      type: "string",
      description: "Where to insert: 'start', 'end', 'after', or 'before' an anchor",
      required: true,
      enum: ["start", "end", "after", "before"]
    },
    {
      name: "anchor",
      type: "string",
      description: "Text fragment to search for (required for 'after' and 'before' positions, 30-50 chars)",
      required: false
    },
    {
      name: "breakType",
      type: "string",
      description: "Type of break: 'page', 'sectionNext', 'sectionContinuous', 'sectionEven', 'sectionOdd', 'column'",
      required: true,
      enum: ["page", "sectionNext", "sectionContinuous", "sectionEven", "sectionOdd", "column"]
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { position, anchor, breakType } = params;
    
    if (!position || !breakType) {
      return {
        success: false,
        error: "Position and breakType are required"
      };
    }
    
    if ((position === "after" || position === "before") && !anchor) {
      return {
        success: false,
        error: "Anchor text is required for 'after' and 'before' positions"
      };
    }
    
    try {
      return await Word.run(async (context) => {
        await enableTrackChanges(context);
        let targetRange: Word.Range;
        
        if (position === "start") {
          targetRange = context.document.body.getRange(Word.RangeLocation.start);
        } else if (position === "end") {
          targetRange = context.document.body.getRange(Word.RangeLocation.end);
        } else {
          // Search for anchor text
          const searchResults = context.document.body.search(anchor, { matchCase: false });
          context.load(searchResults);
          await context.sync();
          
          if (searchResults.items.length === 0) {
            return {
              success: false,
              error: `Anchor text not found: "${anchor}"`
            };
          }
          
          const firstMatch = searchResults.items[0];
          if (position === "after") {
            targetRange = firstMatch.getRange(Word.RangeLocation.after);
          } else {
            // For "before", we need to use the paragraph's start
            const paragraph = firstMatch.paragraphs.getFirst();
            context.load(paragraph);
            await context.sync();
            targetRange = paragraph.getRange(Word.RangeLocation.start);
          }
        }
        
        context.load(targetRange);
        await context.sync();
        
        // Insert the break
        let breakTypeEnum: Word.BreakType;
        switch (breakType) {
          case "page":
            breakTypeEnum = Word.BreakType.page;
            break;
          case "sectionNext":
            breakTypeEnum = Word.BreakType.sectionNext;
            break;
          case "sectionContinuous":
            breakTypeEnum = Word.BreakType.sectionContinuous;
            break;
          case "sectionEven":
            breakTypeEnum = Word.BreakType.sectionEven;
            break;
          case "sectionOdd":
            breakTypeEnum = Word.BreakType.sectionOdd;
            break;
          case "column":
            // Use line break for column (Word.js doesn't have column break)
            breakTypeEnum = Word.BreakType.line;
            break;
          default:
            return {
              success: false,
              error: `Invalid break type: ${breakType}`
            };
        }
        
        targetRange.insertBreak(breakTypeEnum, Word.InsertLocation.after);
        await context.sync();
        
        return {
          success: true,
          message: `Inserted ${breakType} break ${position}${anchor ? ` "${anchor.substring(0, 30)}..."` : ""}`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to insert break"
      };
    }
  }
}