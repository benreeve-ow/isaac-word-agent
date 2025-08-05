/**
 * Tool for deleting tables from the document
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class DeleteTableTool extends BaseTool {
  name = "delete_table";
  description = "Delete a table from the document";
  category = "structure" as const;
  
  parameters = [
    {
      name: "table_index",
      type: "number" as const,
      description: "Index of the table to delete (0-based, use find_tables to get indices)",
      required: false,
      default: 0
    },
    {
      name: "confirm",
      type: "boolean" as const,
      description: "Confirmation flag to prevent accidental deletion",
      required: false,
      default: true
    }
  ];
  
  async execute(params: any, context: ToolContext): Promise<ToolResult> {
    if (!context.document) {
      return this.createErrorResult("Document context not available");
    }
    
    // Check confirmation
    if (!params.confirm) {
      return this.createErrorResult("Deletion not confirmed. Set confirm=true to delete the table.");
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
      if (tableIndex >= tables.items.length || tableIndex < 0) {
        return this.createErrorResult(
          `Table index ${tableIndex} out of range. Document has ${tables.items.length} table(s) (indices 0-${tables.items.length - 1}).`
        );
      }
      
      const table = tables.items[tableIndex];
      
      // Get some info about the table before deleting
      context.document.context.load(table, ["rowCount"]);
      await context.document.context.sync();
      const rowCount = table.rowCount;
      
      // Get the table's range to select it first (optional, for visual feedback)
      const tableRange = table.getRange();
      
      // Delete the table
      table.delete();
      await context.document.context.sync();
      
      return this.createSuccessResult(
        `Deleted table ${tableIndex + 1} (had ${rowCount} rows)`,
        {
          table_index: tableIndex,
          deleted_rows: rowCount,
          remaining_tables: tables.items.length - 1
        },
        [{
          type: "delete",
          description: `Deleted table ${tableIndex + 1}`,
          location: `Former table position ${tableIndex + 1}`
        }]
      );
      
    } catch (error) {
      return this.createErrorResult(`Failed to delete table: ${error.message}`);
    }
  }
}