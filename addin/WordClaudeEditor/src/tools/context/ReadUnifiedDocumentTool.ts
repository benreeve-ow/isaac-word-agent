import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";

interface DocumentElement {
  type: 'paragraph' | 'table' | 'heading' | 'list-item';
  content: string;
  index: number;
  comments?: Array<{
    id: string;
    text: string;
    resolved: boolean;
    author?: string;
  }>;
  style?: string;
  level?: number; // For headings and list items
}

export class ReadUnifiedDocumentTool implements ToolDefinition {
  name = "read_unified_document";
  description = "Read document with proper structure - paragraphs, tables, and comments in their actual positions";
  category: ToolDefinition["category"] = "analysis";
  
  parameters: ToolParameter[] = [
    {
      name: "includeComments",
      type: "boolean",
      description: "Include review comments inline where they appear",
      required: false,
      default: true
    },
    {
      name: "formatTables",
      type: "boolean", 
      description: "Format tables as readable ASCII tables",
      required: false,
      default: true
    }
  ];
  
  async execute(params: any, _context?: ToolContext): Promise<ToolResult> {
    const { includeComments = true, formatTables = true } = params;
    
    try {
      return await Word.run(async (context) => {
        const body = context.document.body;
        const paragraphs = body.paragraphs;
        const tables = body.tables;
        
        // Load all content
        context.load(body);
        context.load(paragraphs, ['text', 'style', 'isListItem', 'tableNestingLevel']);
        context.load(tables);
        
        await context.sync();
        
        // Build a map of all document elements with their positions
        const elements: DocumentElement[] = [];
        let elementIndex = 0;
        
        // Process paragraphs and identify their positions
        for (let i = 0; i < paragraphs.items.length; i++) {
          const para = paragraphs.items[i];
          context.load(para, ['text', 'style', 'isListItem', 'tableNestingLevel']);
        }
        
        // Load table details
        for (let i = 0; i < tables.items.length; i++) {
          const table = tables.items[i];
          context.load(table, ['rowCount', 'values', 'headerRowCount']);
        }
        
        await context.sync();
        
        // Get all comments if requested
        let commentsMap = new Map<string, any[]>();
        if (includeComments) {
          try {
            const comments = body.getComments();
            context.load(comments);
            await context.sync();
            
            for (const comment of comments.items) {
              context.load(comment, ['content', 'resolved', 'authorName']);
              try {
                const range = comment.getRange();
                context.load(range, ['text']);
              } catch (e) {
                // Range might not be available
              }
            }
            await context.sync();
            
            // Map comments to their text
            for (const comment of comments.items) {
              try {
                const range = comment.getRange();
                const key = range.text || '';
                if (!commentsMap.has(key)) {
                  commentsMap.set(key, []);
                }
                commentsMap.get(key)!.push({
                  text: comment.content,
                  resolved: comment.resolved || false,
                  author: comment.authorName || 'Unknown'
                });
              } catch (e) {
                // Comment range not available
              }
            }
          } catch (error) {
            // Comments not available
          }
        }
        
        // Now build the unified view
        let currentTableIndex = 0;
        let unifiedContent = "";
        let inTable = false;
        const tableMetadata: any[] = [];
        
        for (let i = 0; i < paragraphs.items.length; i++) {
          const para = paragraphs.items[i];
          
          // Check if this paragraph is inside a table
          if (para.tableNestingLevel > 0) {
            if (!inTable && currentTableIndex < tables.items.length) {
              // Start of a new table
              inTable = true;
              const table = tables.items[currentTableIndex];
              
              // Add table marker for editing reference
              unifiedContent += `\n[TABLE ${currentTableIndex}]\n`;
              
              if (formatTables && table.values) {
                unifiedContent += this.formatTableAsASCII(table.values, table.headerRowCount);
              } else {
                // Fallback: show table data in a structured way
                for (let row of table.values) {
                  unifiedContent += "| " + row.join(" | ") + " |\n";
                }
              }
              
              // Store table metadata for editing
              tableMetadata.push({
                index: currentTableIndex,
                rows: table.rowCount,
                columns: table.values[0]?.length || 0,
                headerRows: table.headerRowCount || 0,
                values: table.values
              });
              
              currentTableIndex++;
            }
            // Skip paragraphs that are inside tables (already processed)
            continue;
          } else {
            inTable = false;
          }
          
          // Regular paragraph
          let paraText = para.text;
          
          // Add style/heading indicators
          if (para.style) {
            if (para.style.toLowerCase().includes('heading')) {
              const level = para.style.match(/\d+/)?.[0] || '1';
              paraText = `${'#'.repeat(parseInt(level))} ${paraText}`;
            } else if (para.style !== 'Normal') {
              paraText = `[${para.style}] ${paraText}`;
            }
          }
          
          // Add list formatting
          if (para.isListItem) {
            paraText = `• ${paraText}`;
          }
          
          // Add inline comments if they exist
          if (includeComments && commentsMap.has(para.text)) {
            const comments = commentsMap.get(para.text)!;
            for (const comment of comments) {
              const status = comment.resolved ? '[RESOLVED]' : '[OPEN]';
              paraText += ` {{COMMENT ${status}: ${comment.text}}}`;
            }
          }
          
          unifiedContent += paraText + "\n";
        }
        
        // Calculate statistics
        const wordCount = body.text.split(/\s+/).filter(w => w.length > 0).length;
        const tableCount = tables.items.length;
        const paragraphCount = paragraphs.items.filter(p => p.tableNestingLevel === 0).length;
        
        return {
          success: true,
          data: {
            content: unifiedContent.trim(),
            wordCount,
            paragraphCount,
            tableCount,
            hasComments: commentsMap.size > 0,
            tables: tableMetadata,
            structure: {
              tables: tableCount,
              headings: paragraphs.items.filter(p => p.style?.includes('Heading')).length,
              lists: paragraphs.items.filter(p => p.isListItem).length,
              comments: Array.from(commentsMap.values()).flat().length
            }
          },
          message: `Document read with unified structure (${wordCount} words, ${paragraphCount} paragraphs, ${tableCount} tables)`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to read document"
      };
    }
  }
  
  private formatTableAsASCII(values: string[][], headerRows: number = 0): string {
    if (!values || values.length === 0) return "[Empty Table]\n";
    
    // Calculate column widths
    const colWidths: number[] = [];
    for (let col = 0; col < values[0].length; col++) {
      let maxWidth = 0;
      for (let row = 0; row < values.length; row++) {
        const cellLength = (values[row][col] || '').length;
        maxWidth = Math.max(maxWidth, cellLength);
      }
      colWidths.push(Math.max(maxWidth, 3)); // Minimum width of 3
    }
    
    // Build the table
    let result = "\n";
    const separator = "+" + colWidths.map(w => "-".repeat(w + 2)).join("+") + "+\n";
    
    result += separator;
    
    for (let row = 0; row < values.length; row++) {
      result += "|";
      for (let col = 0; col < values[row].length; col++) {
        const cell = values[row][col] || '';
        const padding = colWidths[col] - cell.length;
        result += ` ${cell}${" ".repeat(padding)} |`;
      }
      result += "\n";
      
      // Add separator after header rows
      if (row === headerRows - 1) {
        result += separator.replace(/-/g, '=');
      }
    }
    
    result += separator;
    return result;
  }
}