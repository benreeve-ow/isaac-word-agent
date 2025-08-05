/**
 * Tool for editing existing tables in the document
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class EditTableTool extends BaseTool {
  name = "edit_table";
  description = "Edit an existing table (add/remove rows/columns, modify cell content, change properties)";
  category = "structure" as const;
  
  parameters = [
    {
      name: "table_index",
      type: "number" as const,
      description: "Index of the table to edit (0-based, use find_tables to get indices)",
      required: false,
      default: 0
    },
    {
      name: "action",
      type: "string" as const,
      description: "The action to perform on the table",
      enum: [
        "add_row", "remove_row", "add_column", "remove_column",
        "update_cell", "update_row", "update_column",
        "merge_cells", "split_cell",
        "set_header_rows", "apply_style", "apply_borders",
        "resize_column", "auto_fit"
      ],
      required: true
    },
    {
      name: "position",
      type: "string" as const,
      description: "Position for add operations",
      enum: ["before", "after", "start", "end"],
      default: "end"
    },
    {
      name: "row_index",
      type: "number" as const,
      description: "Row index for row/cell operations (0-based)",
      required: false
    },
    {
      name: "column_index",
      type: "number" as const,
      description: "Column index for column/cell operations (0-based)",
      required: false
    },
    {
      name: "content",
      type: "string" as const,
      description: "Content for update operations",
      required: false
    },
    {
      name: "data",
      type: "array" as const,
      description: "Array of data for bulk updates (row or column)",
      required: false
    },
    {
      name: "count",
      type: "number" as const,
      description: "Number of rows/columns to add or remove",
      default: 1
    },
    {
      name: "header_rows",
      type: "number" as const,
      description: "Number of header rows to set",
      default: 1
    },
    {
      name: "style",
      type: "string" as const,
      description: "Table style to apply",
      enum: ["NoStyle", "PlainTable", "TableGrid", "GridTable1Light", "ListTable1Light"],
      default: "NoStyle"
    },
    {
      name: "width",
      type: "number" as const,
      description: "Width in points for resize_column action",
      required: false
    },
    {
      name: "preserve_formatting",
      type: "boolean" as const,
      description: "Preserve existing cell formatting when updating content",
      default: true
    },
    {
      name: "border_style",
      type: "string" as const,
      description: "Border style for apply_borders action",
      enum: ["none", "minimal", "horizontal_only", "all", "grid"],
      default: "horizontal_only"
    },
    {
      name: "border_color",
      type: "string" as const,
      description: "Border color for apply_borders action (hex color)",
      default: "#E0E0E0"
    },
    {
      name: "border_width",
      type: "number" as const,
      description: "Border width in points for apply_borders action",
      default: 0.5
    },
    {
      name: "background_color",
      type: "string" as const,
      description: "Background color for cells (use 'transparent' for no background)",
      default: "transparent"
    }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    try {
      // Get all tables in the document
      const tables = context.document.body.tables;
      context.document.context.load(tables, "items");
      await context.document.context.sync();
      
      if (tables.items.length === 0) {
        return this.createErrorResult("No tables found in the document");
      }
      
      const tableIndex = params.table_index || 0;
      if (tableIndex >= tables.items.length) {
        return this.createErrorResult(`Table index ${tableIndex} out of range. Document has ${tables.items.length} tables.`);
      }
      
      const table = tables.items[tableIndex];
      
      // Load table properties we might need
      context.document.context.load(table, ["rowCount", "values", "headerRowCount"]);
      context.document.context.load(table.rows, "items");
      await context.document.context.sync();
      
      let result: string;
      let changeDetails: any = {};
      
      switch (params.action) {
        case "add_row":
          result = await this.addRow(table, params, context);
          changeDetails = { action: "add_row", count: params.count, position: params.position };
          break;
          
        case "remove_row":
          result = await this.removeRow(table, params, context);
          changeDetails = { action: "remove_row", row_index: params.row_index };
          break;
          
        case "add_column":
          result = await this.addColumn(table, params, context);
          changeDetails = { action: "add_column", count: params.count, position: params.position };
          break;
          
        case "remove_column":
          result = await this.removeColumn(table, params, context);
          changeDetails = { action: "remove_column", column_index: params.column_index };
          break;
          
        case "update_cell":
          result = await this.updateCell(table, params, context);
          changeDetails = { action: "update_cell", row: params.row_index, column: params.column_index };
          break;
          
        case "update_row":
          result = await this.updateRow(table, params, context);
          changeDetails = { action: "update_row", row: params.row_index };
          break;
          
        case "update_column":
          result = await this.updateColumn(table, params, context);
          changeDetails = { action: "update_column", column: params.column_index };
          break;
          
        case "set_header_rows":
          table.headerRowCount = params.header_rows || 1;
          await context.document.context.sync();
          result = `Set header rows to ${params.header_rows || 1}`;
          changeDetails = { action: "set_header_rows", count: params.header_rows || 1 };
          break;
          
        case "apply_style":
          // Apply minimal, clean style
          if (params.style === "NoStyle") {
            table.style = "";
            table.styleFirstColumn = false;
            table.styleLastColumn = false;
            table.styleTotalRow = false;
          } else {
            table.style = params.style || "PlainTable";
          }
          await context.document.context.sync();
          result = `Applied style: ${params.style || "PlainTable"}`;
          changeDetails = { action: "apply_style", style: params.style };
          break;
          
        case "apply_borders":
          result = await this.applyBorders(table, params, context);
          changeDetails = { 
            action: "apply_borders", 
            border_style: params.border_style,
            border_color: params.border_color,
            background_color: params.background_color
          };
          break;
          
        case "auto_fit":
          // Set all columns to auto width
          context.document.context.load(table, "columnCount");
          await context.document.context.sync();
          
          // Word JS API doesn't have direct autofit, but we can set column widths
          result = "Auto-fit not directly supported in Word JS API";
          changeDetails = { action: "auto_fit", note: "Manual width adjustment needed" };
          break;
          
        default:
          return this.createErrorResult(`Unknown action: ${params.action}`);
      }
      
      return this.createSuccessResult(
        result,
        {
          table_index: tableIndex,
          ...changeDetails
        },
        [{
          type: "edit",
          description: result,
          location: `Table ${tableIndex + 1}`
        }]
      );
      
    } catch (error) {
      return this.createErrorResult(`Failed to edit table: ${error.message}`);
    }
  }
  
  private async addRow(table: Word.Table, params: any, context: ToolContext): Promise<string> {
    const count = params.count || 1;
    const position = params.position || "end";
    const rowIndex = params.row_index;
    
    for (let i = 0; i < count; i++) {
      let row: Word.TableRow;
      
      if (position === "start") {
        row = table.addRows(Word.InsertLocation.start, 1).getFirst();
      } else if (position === "end") {
        row = table.addRows(Word.InsertLocation.end, 1).getFirst();
      } else if (rowIndex !== undefined) {
        const targetRow = table.rows.items[rowIndex];
        if (position === "before") {
          row = targetRow.insertRows(Word.InsertLocation.before, 1, []).getFirst();
        } else {
          row = targetRow.insertRows(Word.InsertLocation.after, 1, []).getFirst();
        }
      } else {
        row = table.addRows(Word.InsertLocation.end, 1).getFirst();
      }
    }
    
    await context.document.context.sync();
    return `Added ${count} row(s) at ${position}`;
  }
  
  private async removeRow(table: Word.Table, params: any, context: ToolContext): Promise<string> {
    if (params.row_index === undefined) {
      return "Row index required for remove_row action";
    }
    
    const row = table.rows.items[params.row_index];
    row.delete();
    await context.document.context.sync();
    
    return `Removed row ${params.row_index}`;
  }
  
  private async addColumn(table: Word.Table, params: any, context: ToolContext): Promise<string> {
    const count = params.count || 1;
    const position = params.position || "end";
    const columnIndex = params.column_index;
    
    for (let i = 0; i < count; i++) {
      if (position === "start") {
        table.addColumns(Word.InsertLocation.start, 1);
      } else if (position === "end") {
        table.addColumns(Word.InsertLocation.end, 1);
      } else if (columnIndex !== undefined) {
        // Word API doesn't have direct column insertion at index
        // We'll add at start or end based on position
        if (position === "before" && columnIndex === 0) {
          table.addColumns(Word.InsertLocation.start, 1);
        } else {
          table.addColumns(Word.InsertLocation.end, 1);
        }
      } else {
        table.addColumns(Word.InsertLocation.end, 1);
      }
    }
    
    await context.document.context.sync();
    return `Added ${count} column(s) at ${position}`;
  }
  
  private async removeColumn(_table: Word.Table, params: any, _context: ToolContext): Promise<string> {
    if (params.column_index === undefined) {
      return "Column index required for remove_column action";
    }
    
    // Word JS API doesn't support direct column deletion
    // This is a limitation of the current API
    return "Column deletion is not supported in Word JS API. Consider creating a new table without the column.";
  }
  
  private async updateCell(table: Word.Table, params: any, context: ToolContext): Promise<string> {
    if (params.row_index === undefined || params.column_index === undefined) {
      return "Row and column indices required for update_cell action";
    }
    
    if (!params.content) {
      return "Content required for update_cell action";
    }
    
    const row = table.rows.items[params.row_index];
    context.document.context.load(row.cells, "items");
    await context.document.context.sync();
    
    const cell = row.cells.items[params.column_index];
    
    if (params.preserve_formatting) {
      // Preserve formatting by only replacing text content
      const range = cell.body.getRange();
      range.insertText(params.content, Word.InsertLocation.replace);
    } else {
      cell.body.clear();
      cell.body.insertText(params.content, Word.InsertLocation.start);
    }
    
    await context.document.context.sync();
    return `Updated cell [${params.row_index}, ${params.column_index}]`;
  }
  
  private async updateRow(table: Word.Table, params: any, context: ToolContext): Promise<string> {
    if (params.row_index === undefined) {
      return "Row index required for update_row action";
    }
    
    if (!params.data || !Array.isArray(params.data)) {
      return "Data array required for update_row action";
    }
    
    const row = table.rows.items[params.row_index];
    context.document.context.load(row.cells, "items");
    await context.document.context.sync();
    
    for (let i = 0; i < Math.min(params.data.length, row.cells.items.length); i++) {
      const cell = row.cells.items[i];
      if (params.preserve_formatting) {
        const range = cell.body.getRange();
        range.insertText(String(params.data[i]), Word.InsertLocation.replace);
      } else {
        cell.body.clear();
        cell.body.insertText(String(params.data[i]), Word.InsertLocation.start);
      }
    }
    
    await context.document.context.sync();
    return `Updated row ${params.row_index}`;
  }
  
  private async updateColumn(table: Word.Table, params: any, context: ToolContext): Promise<string> {
    if (params.column_index === undefined) {
      return "Column index required for update_column action";
    }
    
    if (!params.data || !Array.isArray(params.data)) {
      return "Data array required for update_column action";
    }
    
    context.document.context.load(table.rows, "items");
    await context.document.context.sync();
    
    for (let i = 0; i < Math.min(params.data.length, table.rows.items.length); i++) {
      const row = table.rows.items[i];
      context.document.context.load(row.cells, "items");
      await context.document.context.sync();
      
      if (row.cells.items[params.column_index]) {
        const cell = row.cells.items[params.column_index];
        if (params.preserve_formatting) {
          const range = cell.body.getRange();
          range.insertText(String(params.data[i]), Word.InsertLocation.replace);
        } else {
          cell.body.clear();
          cell.body.insertText(String(params.data[i]), Word.InsertLocation.start);
        }
      }
    }
    
    await context.document.context.sync();
    return `Updated column ${params.column_index}`;
  }
  
  private async applyBorders(table: Word.Table, params: any, context: ToolContext): Promise<string> {
    try {
      // Load table rows and cells
      context.document.context.load(table.rows, "items");
      await context.document.context.sync();
      
      for (const row of table.rows.items) {
        context.document.context.load(row.cells, "items");
      }
      await context.document.context.sync();
      
      // Apply border styling based on parameters
      const borderColor = params.border_color || "#E0E0E0";
      const borderWidth = params.border_width || 0.5;
      const borderStyle = params.border_style || "horizontal_only";
      const backgroundColor = params.background_color || "transparent";
      
      for (const row of table.rows.items) {
        for (const cell of row.cells.items) {
          // Load cell properties including shadingColor
          context.document.context.load(cell, ['shadingColor']);
        }
      }
      await context.document.context.sync();
      
      for (const row of table.rows.items) {
        for (const cell of row.cells.items) {
          // Set background color
          if (backgroundColor && backgroundColor !== "transparent") {
            cell.shadingColor = backgroundColor;
          } else {
            // Set to null for transparent (no background)
            cell.shadingColor = null;
          }
          
          // Apply border styling
          const borderTop = cell.getBorder(Word.BorderLocation.top);
          const borderBottom = cell.getBorder(Word.BorderLocation.bottom);
          const borderLeft = cell.getBorder(Word.BorderLocation.left);
          const borderRight = cell.getBorder(Word.BorderLocation.right);
          
          switch (borderStyle) {
            case "none":
              // Remove all borders
              borderTop.type = Word.BorderType.none;
              borderBottom.type = Word.BorderType.none;
              borderLeft.type = Word.BorderType.none;
              borderRight.type = Word.BorderType.none;
              break;
              
            case "horizontal_only":
              // Only horizontal lines (minimal look)
              borderTop.type = Word.BorderType.single;
              borderTop.color = borderColor;
              borderTop.width = borderWidth;
              
              borderBottom.type = Word.BorderType.single;
              borderBottom.color = borderColor;
              borderBottom.width = borderWidth;
              
              // Remove vertical borders
              borderLeft.type = Word.BorderType.none;
              borderRight.type = Word.BorderType.none;
              break;
              
            case "minimal":
              // Very light borders all around
              borderTop.type = Word.BorderType.single;
              borderTop.color = borderColor;
              borderTop.width = borderWidth;
              
              borderBottom.type = Word.BorderType.single;
              borderBottom.color = borderColor;
              borderBottom.width = borderWidth;
              
              borderLeft.type = Word.BorderType.single;
              borderLeft.color = borderColor;
              borderLeft.width = borderWidth;
              
              borderRight.type = Word.BorderType.single;
              borderRight.color = borderColor;
              borderRight.width = borderWidth;
              break;
              
            case "all":
            case "grid":
              // Full borders (grid style)
              borderTop.type = Word.BorderType.single;
              borderTop.color = borderColor;
              borderTop.width = borderWidth * 2; // Slightly thicker for grid
              
              borderBottom.type = Word.BorderType.single;
              borderBottom.color = borderColor;
              borderBottom.width = borderWidth * 2;
              
              borderLeft.type = Word.BorderType.single;
              borderLeft.color = borderColor;
              borderLeft.width = borderWidth * 2;
              
              borderRight.type = Word.BorderType.single;
              borderRight.color = borderColor;
              borderRight.width = borderWidth * 2;
              break;
              
            default:
              // Default to horizontal_only
              borderTop.type = Word.BorderType.single;
              borderTop.color = borderColor;
              borderTop.width = borderWidth;
              
              borderBottom.type = Word.BorderType.single;
              borderBottom.color = borderColor;
              borderBottom.width = borderWidth;
              
              borderLeft.type = Word.BorderType.none;
              borderRight.type = Word.BorderType.none;
              break;
          }
        }
      }
      
      await context.document.context.sync();
      return `Applied ${borderStyle} borders with color ${borderColor}`;
      
    } catch (error) {
      console.error("Error applying borders:", error);
      return `Failed to apply borders: ${error.message}`;
    }
  }
}