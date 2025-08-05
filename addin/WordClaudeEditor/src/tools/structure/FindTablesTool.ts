/**
 * Tool for finding and analyzing tables in the document
 */

import { BaseTool, ToolContext, ToolResult } from "../core/ToolDefinition";

export class FindTablesTool extends BaseTool {
  name = "find_tables";
  description = "Find all tables in the document and get information about them";
  category = "structure" as const;
  
  parameters = [
    {
      name: "include_content",
      type: "boolean" as const,
      description: "Include table content preview in results",
      required: false,
      default: false
    },
    {
      name: "max_preview_rows",
      type: "number" as const,
      description: "Maximum rows to include in content preview",
      required: false,
      default: 3
    },
    {
      name: "search_text",
      type: "string" as const,
      description: "Optional text to search for within tables",
      required: false
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
        return this.createSuccessResult(
          "No tables found in the document",
          { table_count: 0, tables: [] }
        );
      }
      
      const tableInfo = [];
      const searchText = params.search_text?.toLowerCase();
      
      for (let i = 0; i < tables.items.length; i++) {
        const table = tables.items[i];
        
        // Load table properties
        context.document.context.load(table, ["rowCount", "headerRowCount", "style", "values"]);
        await context.document.context.sync();
        
        const info: any = {
          index: i,
          position: i + 1, // Human-readable position
          rows: table.rowCount,
          columns: table.values[0]?.length || 0,
          header_rows: table.headerRowCount,
          style: table.style || "No style",
          cells_total: table.rowCount * (table.values[0]?.length || 0)
        };
        
        // Get table dimensions
        if (table.values && table.values.length > 0) {
          info.dimensions = `${table.rowCount}×${table.values[0].length}`;
        }
        
        // Include content preview if requested
        if (params.include_content) {
          const maxRows = Math.min(params.max_preview_rows || 3, table.rowCount);
          info.preview = [];
          
          for (let row = 0; row < maxRows; row++) {
            const rowData = [];
            for (let col = 0; col < table.values[row].length; col++) {
              const cellValue = table.values[row][col];
              // Truncate long cell values
              const truncated = cellValue && cellValue.length > 50 
                ? cellValue.substring(0, 47) + "..." 
                : cellValue;
              rowData.push(truncated || "");
            }
            info.preview.push(rowData);
          }
          
          if (table.rowCount > maxRows) {
            info.preview_truncated = true;
            info.rows_not_shown = table.rowCount - maxRows;
          }
        }
        
        // Search within table if search text provided
        if (searchText) {
          let found = false;
          const matches = [];
          
          for (let row = 0; row < table.rowCount; row++) {
            for (let col = 0; col < table.values[row].length; col++) {
              const cellValue = table.values[row][col];
              if (cellValue && cellValue.toLowerCase().includes(searchText)) {
                found = true;
                matches.push({
                  row: row,
                  column: col,
                  text: cellValue.substring(0, 100) // Limit match text length
                });
                
                // Limit number of matches reported
                if (matches.length >= 5) break;
              }
            }
            if (matches.length >= 5) break;
          }
          
          if (found) {
            info.search_matches = matches;
            info.has_match = true;
          } else {
            info.has_match = false;
          }
          
          // Only include tables with matches if searching
          if (!found) continue;
        }
        
        // Get location context (text before table)
        try {
          const tableRange = table.getRange();
          // Use 'start' to get beginning of range, then expand backward
          const beforeRange = tableRange.getRange(Word.RangeLocation.start);
          beforeRange.load("text");
          await context.document.context.sync();
          
          // Get last 100 characters before table as context
          const contextText = beforeRange.text || "";
          const contextPreview = contextText.length > 100 
            ? "..." + contextText.substring(contextText.length - 97)
            : contextText;
          
          if (contextPreview.trim()) {
            info.context_before = contextPreview.trim();
          }
        } catch (e) {
          // Context extraction failed, continue without it
        }
        
        tableInfo.push(info);
      }
      
      // Build result message
      let message = "";
      if (tables.items.length === 0) {
        message = "No tables found in the document.";
      } else if (tables.items.length === 1) {
        message = `SUCCESS: Found 1 table in the document. Table details: ${tableInfo[0].rows} rows × ${tableInfo[0].columns} columns`;
        if (tableInfo[0].has_content) {
          message += ` (contains data)`;
        } else {
          message += ` (empty)`;
        }
      } else {
        message = `SUCCESS: Found ${tables.items.length} tables in the document.`;
        if (searchText) {
          const matchCount = tableInfo.filter(t => t.has_match).length;
          message = `SUCCESS: Found ${matchCount} table(s) containing "${params.search_text}"`;
        }
      }
      
      // Add location info for single table
      if (tables.items.length === 1 && tableInfo[0].context_before) {
        message += `. Location: After "${tableInfo[0].context_before.substring(0, 50)}..."`;
      }
      
      return this.createSuccessResult(
        message,
        {
          success: true,
          table_count: tableInfo.length,
          tables: tableInfo,
          search_text: params.search_text || null,
          has_tables: tables.items.length > 0
        },
        [{
          type: "analysis",
          description: message,
          location: "Document"
        }]
      );
      
    } catch (error) {
      return this.createErrorResult(`Failed to find tables: ${error.message}`);
    }
  }
}