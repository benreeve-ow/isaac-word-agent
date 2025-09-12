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
      name: "position",
      type: "string" as const,
      description: "Where to insert the table. Use 'after_paragraph' with search_text to insert after specific text. NEVER use 'cursor' as it inserts at random location.",
      enum: ["cursor", "end", "after_paragraph", "before_paragraph", "replace_selection"],
      required: true
    },
    {
      name: "search_text",
      type: "string" as const,
      description: "Optional: Search for text and insert table near it (use with position)",
      required: false
    },
    {
      name: "border_style",
      type: "string" as const,
      description: "Border style for the table",
      enum: ["none", "minimal", "horizontal_only", "all", "grid"],
      default: "horizontal_only"
    },
    {
      name: "border_color",
      type: "string" as const,
      description: "Border color (hex color)",
      default: "#E0E0E0"
    },
    {
      name: "border_width",
      type: "number" as const,
      description: "Border width in points",
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
    
    // Set defaults to ensure proper formatting
    params.style = params.style || "NoStyle";
    params.border_style = params.border_style || "horizontal_only";
    params.border_color = params.border_color || "#E0E0E0";
    params.border_width = params.border_width || 0.5;
    params.background_color = params.background_color || "transparent";
    
    // Validate parameters
    if (params.rows < 1 || params.columns < 1) {
      return this.createErrorResult("Table must have at least 1 row and 1 column");
    }
    
    if (params.rows > 100 || params.columns > 20) {
      return this.createErrorResult("Table size exceeds limits (max 100 rows, 20 columns)");
    }
    
    // Determine insertion point
    let insertLocation: Word.Range;
    let insertionMethod = Word.InsertLocation.after;
    
    // If search_text is provided, find it first
    if (params.search_text) {
      const searchResults = context.document.body.search(params.search_text, { matchCase: false, matchWholeWord: false });
      context.document.context.load(searchResults, 'items');
      await context.document.context.sync();
      
      if (searchResults.items.length === 0) {
        return this.createErrorResult(`Could not find text: "${params.search_text}"`);
      }
      
      // Use the first search result
      insertLocation = searchResults.items[0];
    } else {
      // Use current selection
      insertLocation = context.document.getSelection();
    }
    
    // Adjust based on position parameter
    switch (params.position) {
      case "end":
        insertLocation = context.document.body.getRange(Word.RangeLocation.end);
        // Use 'before' for end position since we want to insert before the end marker
        insertionMethod = Word.InsertLocation.before;
        break;
      case "after_paragraph":
        const paragraphAfter = insertLocation.paragraphs.getFirst();
        insertLocation = paragraphAfter.getRange(Word.RangeLocation.after);
        insertionMethod = Word.InsertLocation.after;
        break;
      case "before_paragraph":
        const paragraphBefore = insertLocation.paragraphs.getFirst();
        // Use 'start' instead of 'before' for RangeLocation
        insertLocation = paragraphBefore.getRange(Word.RangeLocation.start);
        insertionMethod = Word.InsertLocation.before;
        break;
      case "replace_selection":
        // For replace, we'll use 'after' and then delete the selection
        insertionMethod = Word.InsertLocation.after;
        break;
      case "cursor":
      default:
        // Insert after the current location
        insertionMethod = Word.InsertLocation.after;
        break;
    }
    
    // Insert the table with the appropriate method
    let finalInsertMethod: Word.InsertLocation.before | Word.InsertLocation.after;
    if (insertionMethod === Word.InsertLocation.before) {
      finalInsertMethod = Word.InsertLocation.before;
    } else {
      finalInsertMethod = Word.InsertLocation.after;
    }
    
    // Handle replace_selection by clearing the selection first
    if (params.position === "replace_selection") {
      insertLocation.clear();
      await context.document.context.sync();
    }
    
    const table = insertLocation.insertTable(
      params.rows,
      params.columns,
      finalInsertMethod
    );
    
    // Now add spacing AROUND the table after it's created
    // Add paragraph BEFORE the table
    const beforePara = table.insertParagraph("", Word.InsertLocation.before);
    
    // Add paragraph AFTER the table  
    const afterPara = table.insertParagraph("", Word.InsertLocation.after);
    
    await context.document.context.sync();
    
    // Load the table first
    context.document.context.load(table);
    await context.document.context.sync();
    
    // Apply table style - but be very careful to avoid errors
    // DO NOT apply any style to avoid InvalidArgument errors that happen after table creation
    // The default Word table style will be used instead
    console.log(`[InsertTableTool] Skipping style application to avoid errors. Requested style was: ${params.style}`);
    
    // Disable all table style options
    table.styleFirstColumn = false;
    table.styleLastColumn = false;
    table.styleTotalRow = false;
    table.styleBandedRows = false;
    table.styleBandedColumns = false;
    
    // Sync to apply the style clearing
    await context.document.context.sync();
    
    // Apply custom border and background settings
    await this.applyTableStyling(table, params, context);
    
    // Populate with data if provided BEFORE formatting header
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
            // Clear cell first then insert text
            cell.body.clear();
            cell.body.insertText(String(rowData[j]), Word.InsertLocation.start);
          }
        }
      }
      // Sync after populating data
      await context.document.context.sync();
    }
    
    // Format header row AFTER data has been inserted
    if (params.header_row) {
      table.headerRowCount = 1;
      const headerRow = table.rows.getFirst();
      
      // Make header text bold - this is sufficient for headers
      const headerCells = headerRow.cells;
      context.document.context.load(headerCells, "items");
      await context.document.context.sync();
      
      for (const cell of headerCells.items) {
        const cellRange = cell.body.getRange();
        cellRange.font.bold = true;
        // Ensure non-header cells are not bold
        if (params.data && Array.isArray(params.data) && params.data.length > 1) {
          // This cell was just formatted as bold for header
        }
      }
      
      // Ensure non-header rows are not bold
      if (params.data && Array.isArray(params.data) && params.data.length > 1) {
        context.document.context.load(table.rows, "items");
        await context.document.context.sync();
        
        // Start from row 1 (skip header row at index 0)
        for (let i = 1; i < table.rows.items.length; i++) {
          const row = table.rows.items[i];
          context.document.context.load(row.cells, "items");
          await context.document.context.sync();
          
          for (const cell of row.cells.items) {
            const cellRange = cell.body.getRange();
            cellRange.font.bold = false;
          }
        }
      }
    }
    
    await context.document.context.sync();
    
    
    // Create a very clear success message
    const positionDescription = params.position === "end" ? "at the end of the document" : 
                                params.position === "cursor" ? "at the cursor position" :
                                params.position === "after_paragraph" ? "after the current paragraph" :
                                params.position === "before_paragraph" ? "before the current paragraph" :
                                params.position === "replace_selection" ? "replacing the selection" : 
                                "in the document";
    
    const successMessage = `SUCCESS: The table has been created successfully. A ${params.rows}x${params.columns} table is now ${positionDescription}. ` +
                          `${params.data ? 'The table contains your data.' : 'The table is empty.'} ` +
                          `NEXT STEP: Use find_tables to verify the table exists. DO NOT create another table - this one was created successfully.`;
    
    return this.createSuccessResult(
      successMessage,
      {
        success: true,
        table_created: true,
        rows: params.rows,
        columns: params.columns,
        position: params.position,
        location_description: positionDescription,
        has_data: !!params.data,
        next_step: "Use find_tables to verify the table was created"
      },
      [{
        type: "insert",
        description: `✅ Successfully created ${params.rows}x${params.columns} table ${positionDescription}`,
        location: positionDescription
      }]
    );
  }
  
  private async applyTableStyling(table: Word.Table, params: any, context: ToolContext): Promise<void> {
    try {
      // Load table rows and cells
      context.document.context.load(table.rows, "items");
      await context.document.context.sync();
      
      for (const row of table.rows.items) {
        context.document.context.load(row.cells, "items");
      }
      await context.document.context.sync();
      
      // Apply border styling based on border_style parameter
      const borderColor = params.border_color || "#E0E0E0";
      const borderWidth = params.border_width || 0.5;
      const borderStyle = params.border_style || "horizontal_only";
      
      // Load all rows first
      for (const row of table.rows.items) {
        context.document.context.load(row.cells, "items");
      }
      await context.document.context.sync();
      
      // First load all cell properties
      for (const row of table.rows.items) {
        for (const cell of row.cells.items) {
          context.document.context.load(cell, ['shadingColor']);
        }
      }
      await context.document.context.sync();
      
      // Set cell backgrounds
      for (const row of table.rows.items) {
        for (const cell of row.cells.items) {
          // Set white background by default
          cell.shadingColor = "#FFFFFF";
          
          // Then set the desired background color only if specified
          if (params.background_color && params.background_color !== "transparent" && params.background_color !== "" && params.background_color !== "#FFFFFF") {
            cell.shadingColor = params.background_color;
          }
          
          // Apply border styling
          const borderTop = cell.getBorder(Word.BorderLocation.top);
          const borderBottom = cell.getBorder(Word.BorderLocation.bottom);
          const borderLeft = cell.getBorder(Word.BorderLocation.left);
          const borderRight = cell.getBorder(Word.BorderLocation.right);
          
          switch (borderStyle) {
            case "none":
              // Remove all borders - use dashDotStroked as "none" might not be valid
              borderTop.type = Word.BorderType.dashDotStroked;
              borderTop.width = 0;
              borderBottom.type = Word.BorderType.dashDotStroked;
              borderBottom.width = 0;
              borderLeft.type = Word.BorderType.dashDotStroked;
              borderLeft.width = 0;
              borderRight.type = Word.BorderType.dashDotStroked;
              borderRight.width = 0;
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
          }
        }
      }
      
      await context.document.context.sync();
    } catch (error) {
      console.error("Error applying table styling:", error);
      // Continue even if styling fails
    }
  }
}