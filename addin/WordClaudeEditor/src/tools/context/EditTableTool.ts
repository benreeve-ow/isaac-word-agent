import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

export class EditTableTool implements ToolDefinition {
  name = "edit_table";
  description = "Edit a table cell's content by specifying table index, row, and column";
  category: ToolDefinition["category"] = "structure";
  
  parameters: ToolParameter[] = [
    {
      name: "tableIndex",
      type: "number",
      description: "Index of the table in the document (0-based)",
      required: true
    },
    {
      name: "row",
      type: "number",
      description: "Row index (0-based)",
      required: true
    },
    {
      name: "column",
      type: "number",
      description: "Column index (0-based)",
      required: true
    },
    {
      name: "newValue",
      type: "string",
      description: "New value for the cell",
      required: true
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { tableIndex, row, column, newValue } = params;
    
    try {
      return await Word.run(async (context) => {
        const tables = context.document.body.tables;
        context.load(tables);
        await context.sync();
        
        if (tableIndex < 0 || tableIndex >= tables.items.length) {
          return {
            success: false,
            error: `Invalid table index: ${tableIndex}. Document has ${tables.items.length} tables.`
          };
        }
        
        const table = tables.items[tableIndex];
        context.load(table, ['rowCount', 'values']);
        await context.sync();
        
        if (row < 0 || row >= table.rowCount) {
          return {
            success: false,
            error: `Invalid row index: ${row}. Table has ${table.rowCount} rows.`
          };
        }
        
        // Get the specific cell
        const cell = table.getCell(row, column);
        cell.value = newValue;
        
        await context.sync();
        
        return {
          success: true,
          message: `Updated table ${tableIndex}, cell [${row},${column}] to "${newValue}"`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to edit table"
      };
    }
  }
}