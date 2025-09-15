import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class InsertTableTool implements ToolDefinition {
  name = "insert_table";
  description = "Insert a table at the start, end, or relative to an anchor text in the document";
  category: ToolDefinition["category"] = "structure";
  
  parameters: ToolParameter[] = [
    {
      name: "position",
      type: "string",
      description: "Where to insert the table",
      required: true,
      enum: ["start", "end", "after", "before"]
    },
    {
      name: "anchor",
      type: "string",
      description: "Text fragment to search for (required for 'after' and 'before' positions)",
      required: false
    },
    {
      name: "rows",
      type: "number",
      description: "Number of rows",
      required: true
    },
    {
      name: "columns",
      type: "number",
      description: "Number of columns",
      required: true
    },
    {
      name: "data",
      type: "array",
      description: "2D array of table data",
      required: false
    },
    {
      name: "headerRow",
      type: "boolean",
      description: "Whether first row should be header",
      required: false,
      default: true
    },
    {
      name: "style",
      type: "string",
      description: "Table style",
      required: false,
      enum: ["grid", "simple", "none"],
      default: "grid"
    }
  ];
  
  inputSchema = {
    type: "object",
    properties: {
      position: {
        type: "string",
        enum: ["start", "end", "after", "before"],
        description: "Where to insert the table"
      },
      anchor: {
        type: "string",
        description: "Text fragment to search for (required for 'after' and 'before' positions)"
      },
      rows: {
        type: "number",
        minimum: 1,
        description: "Number of rows"
      },
      columns: {
        type: "number",
        minimum: 1,
        description: "Number of columns"
      },
      data: {
        type: "array",
        items: {
          type: "array",
          items: {
            type: "string"
          }
        },
        description: "2D array of table data"
      },
      headerRow: {
        type: "boolean",
        default: true,
        description: "Whether first row should be header"
      },
      style: {
        type: "string",
        enum: ["grid", "simple", "none"],
        default: "grid",
        description: "Table style"
      }
    },
    required: ["position", "rows", "columns"]
  };
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { position, anchor, rows, columns, data, headerRow = true, style = "grid" } = params;
    
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
        
        // Insert a paragraph break before the table for spacing
        insertionPoint.insertParagraph("", "After");
        
        // Insert the table
        const table = insertionPoint.insertTable(rows, columns, "After");
        
        // Apply style
        if (style === "grid") {
          table.styleBuiltIn = Word.BuiltInStyleName.gridTable1Light;
        } else if (style === "simple") {
          // Use a different style for simple tables
          table.styleBuiltIn = Word.BuiltInStyleName.listTable4_Accent1;
        }
        
        // Set header row
        if (headerRow) {
          table.headerRowCount = 1;
        }
        
        // Fill table with data if provided
        if (data && data.length > 0) {
          const maxRows = Math.min(data.length, rows);
          for (let i = 0; i < maxRows; i++) {
            const rowData = data[i];
            if (rowData && Array.isArray(rowData)) {
              const maxCols = Math.min(rowData.length, columns);
              for (let j = 0; j < maxCols; j++) {
                const cell = table.getCell(i, j);
                cell.value = rowData[j] || "";
              }
            }
          }
        }
        
        // Add a paragraph after the table for continued editing
        table.insertParagraph("", "After");
        
        await context.sync();
        
        return {
          success: true,
          message: `Table (${rows}x${columns}) inserted ${position}${anchor ? ` the text containing "${anchor.substring(0, 30)}..."` : " of document"}`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to insert table"
      };
    }
  }
}