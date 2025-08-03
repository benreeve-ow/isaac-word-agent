/**
 * Tool for inserting tables into the document
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class InsertTableTool extends BaseTool {
  name = "insert_table";
  description = "Insert a table at the current position or specified location";
  category = "structure" as const;
  
  parameters = [
    {
      name: "rows",
      type: "number" as const,
      description: "Number of rows",
      required: true
    },
    {
      name: "columns",
      type: "number" as const,
      description: "Number of columns",
      required: true
    },
    {
      name: "data",
      type: "array" as const,
      description: "Optional 2D array of data to populate the table",
      required: false
    },
    {
      name: "header_row",
      type: "boolean" as const,
      description: "Whether the first row should be formatted as a header",
      default: true
    },
    {
      name: "style",
      type: "string" as const,
      description: "Table style to apply",
      enum: ["Grid", "List", "PlainTable", "TableGrid", "LightShading", "MediumShading"],
      default: "Grid"
    },
    {
      name: "position",
      type: "string" as const,
      description: "Where to insert the table",
      enum: ["cursor", "end", "after_paragraph"],
      default: "cursor"
    }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    // Validate parameters
    if (params.rows < 1 || params.columns < 1) {
      return this.createErrorResult("Table must have at least 1 row and 1 column");
    }
    
    if (params.rows > 100 || params.columns > 20) {
      return this.createErrorResult("Table size exceeds limits (max 100 rows, 20 columns)");
    }
    
    // Determine insertion point
    let insertLocation: Word.Range;
    
    switch (params.position) {
      case "end":
        insertLocation = context.document.body.getRange(Word.RangeLocation.end);
        break;
      case "after_paragraph":
        const selection = context.document.getSelection();
        const paragraph = selection.paragraphs.getFirst();
        insertLocation = paragraph.getRange(Word.RangeLocation.after);
        break;
      case "cursor":
      default:
        insertLocation = context.document.getSelection();
        break;
    }
    
    // Insert the table
    const table = insertLocation.insertTable(
      params.rows,
      params.columns,
      Word.InsertLocation.after
    );
    
    // Apply style
    if (params.style) {
      table.style = params.style;
    }
    
    // Format header row
    if (params.header_row) {
      table.headerRowCount = 1;
      const headerRow = table.rows.getFirst();
      headerRow.shadingColor = "#E7E7E7";
      
      // Make header text bold
      const headerCells = headerRow.cells;
      context.document.context.load(headerCells, "items");
      await context.document.context.sync();
      
      for (const cell of headerCells.items) {
        const cellRange = cell.body.getRange();
        cellRange.font.bold = true;
      }
    }
    
    // Populate with data if provided
    if (params.data && Array.isArray(params.data)) {
      context.document.context.load(table.rows, "items");
      await context.document.context.sync();
      
      for (let i = 0; i < Math.min(params.data.length, params.rows); i++) {
        const rowData = params.data[i];
        if (Array.isArray(rowData)) {
          const row = table.rows.items[i];
          context.document.context.load(row.cells, "items");
          await context.document.context.sync();
          
          for (let j = 0; j < Math.min(rowData.length, params.columns); j++) {
            const cell = row.cells.items[j];
            cell.body.insertText(String(rowData[j]), Word.InsertLocation.replace);
          }
        }
      }
    }
    
    await context.document.context.sync();
    
    return this.createSuccessResult(
      `Inserted ${params.rows}x${params.columns} table`,
      {
        rows: params.rows,
        columns: params.columns,
        style: params.style,
        position: params.position
      },
      [{
        type: "insert",
        description: `Inserted ${params.rows}x${params.columns} table`,
        location: params.position
      }]
    );
  }
}