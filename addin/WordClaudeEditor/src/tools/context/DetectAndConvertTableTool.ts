import { ToolDefinition, ToolParameter, ToolContext, ToolResult } from "../core/ToolDefinition";
import { ParamValidator } from "../core/types";
import { enableTrackChanges } from "./trackChangesHelper";

/**
 * Tool for detecting and converting text-based tables to Word tables.
 * Supports markdown tables, pipe-separated tables, and simple ASCII tables.
 */
export class DetectAndConvertTableTool implements ToolDefinition {
  name = "detect_and_convert_table";
  description = "Detect text-based tables (markdown, ASCII) and convert them to proper Word tables";
  category: ToolDefinition["category"] = "formatting";
  
  parameters: ToolParameter[] = [
    {
      name: "anchor",
      type: "string",
      description: "Text near or within the table to identify its location",
      required: true
    }
  ];
  
  inputSchema = {
    type: "object",
    properties: {
      anchor: {
        type: "string",
        description: "Text near or within the table to identify its location"
      }
    },
    required: ["anchor"]
  };
  
  /**
   * Detect if text looks like a table
   */
  private detectTablePattern(text: string): { isTable: boolean; data?: string[][] } {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Check for markdown table (has | separators)
    if (lines.some(line => line.includes('|'))) {
      return this.parseMarkdownTable(lines);
    }
    
    // Check for tab-separated values
    if (lines.some(line => line.includes('\t'))) {
      return this.parseTabSeparatedTable(lines);
    }
    
    // Check for consistent spacing that might indicate columns
    if (this.hasConsistentSpacing(lines)) {
      return this.parseSpacedTable(lines);
    }
    
    return { isTable: false };
  }
  
  /**
   * Parse markdown-style table
   */
  private parseMarkdownTable(lines: string[]): { isTable: boolean; data?: string[][] } {
    const tableLines = lines.filter(line => line.includes('|'));
    
    if (tableLines.length < 2) {
      return { isTable: false };
    }
    
    const data: string[][] = [];
    
    for (const line of tableLines) {
      // Skip separator lines (contain only -, |, :)
      if (/^[\s\-|:]+$/.test(line)) {
        continue;
      }
      
      // Split by | and trim each cell
      const cells = line.split('|')
        .map(cell => cell.trim())
        .filter(cell => cell); // Remove empty cells from start/end
      
      if (cells.length > 0) {
        data.push(cells);
      }
    }
    
    return data.length > 0 ? { isTable: true, data } : { isTable: false };
  }
  
  /**
   * Parse tab-separated table
   */
  private parseTabSeparatedTable(lines: string[]): { isTable: boolean; data?: string[][] } {
    const data: string[][] = [];
    
    for (const line of lines) {
      if (line.includes('\t')) {
        const cells = line.split('\t').map(cell => cell.trim());
        data.push(cells);
      }
    }
    
    return data.length > 0 ? { isTable: true, data } : { isTable: false };
  }
  
  /**
   * Parse space-aligned table
   */
  private parseSpacedTable(_lines: string[]): { isTable: boolean; data?: string[][] } {
    // This is more complex - would need to detect column boundaries
    // For now, return false
    return { isTable: false };
  }
  
  /**
   * Check if lines have consistent spacing patterns
   */
  private hasConsistentSpacing(lines: string[]): boolean {
    if (lines.length < 2) return false;
    
    // Check if multiple lines have 2+ spaces in similar positions
    // Simplified for now - would need more complex logic to detect column boundaries
    // const spacePatterns = lines.map(line => {
    //   const regex = /\s{2,}/g;
    //   const indices: number[] = [];
    //   let match;
    //   while ((match = regex.exec(line)) !== null) {
    //     indices.push(match.index);
    //   }
    //   return indices;
    // });
    
    // If most lines have spaces in similar positions, might be a table
    // This is a simple heuristic
    return false; // Simplified for now
  }
  
  /**
   * Execute table detection and conversion
   */
  async execute(params: unknown, _context?: ToolContext): Promise<ToolResult> {
    const typedParams = ParamValidator.validate<{ anchor: string }>(
      params,
      ['anchor'],
      'DetectAndConvertTableTool'
    );
    
    const { anchor } = typedParams;
    
    try {
      return await Word.run(async (context) => {
        await enableTrackChanges(context);
        
        const body = context.document.body;
        
        // Search for the anchor text
        const searchResults = body.search(anchor, { matchCase: false });
        context.load(searchResults);
        await context.sync();
        
        if (searchResults.items.length === 0) {
          return {
            success: false,
            error: `Anchor text not found: "${anchor}"`
          };
        }
        
        // Get the paragraph containing the anchor
        const firstMatch = searchResults.items[0];
        const paragraph = firstMatch.paragraphs.getFirst();
        context.load(paragraph);
        await context.sync();
        
        // Get surrounding paragraphs to check for table
        const paragraphs = body.paragraphs;
        context.load(paragraphs);
        await context.sync();
        
        // Find the paragraph index
        let paraIndex = -1;
        for (let i = 0; i < paragraphs.items.length; i++) {
          context.load(paragraphs.items[i]);
        }
        await context.sync();
        
        for (let i = 0; i < paragraphs.items.length; i++) {
          if (paragraphs.items[i].text === paragraph.text) {
            paraIndex = i;
            break;
          }
        }
        
        if (paraIndex === -1) {
          return {
            success: false,
            error: "Could not locate paragraph in document"
          };
        }
        
        // Collect text from this and nearby paragraphs
        const startIdx = Math.max(0, paraIndex - 2);
        const endIdx = Math.min(paragraphs.items.length - 1, paraIndex + 10);
        
        let tableText = "";
        for (let i = startIdx; i <= endIdx; i++) {
          tableText += paragraphs.items[i].text + "\n";
        }
        
        // Detect if this is a table
        const detection = this.detectTablePattern(tableText);
        
        if (!detection.isTable || !detection.data) {
          return {
            success: false,
            error: "No table pattern detected near the anchor text"
          };
        }
        
        // Determine table dimensions
        const rows = detection.data.length;
        const cols = Math.max(...detection.data.map(row => row.length));
        
        // Insert table after the detected table text
        const range = paragraphs.items[endIdx].getRange("After");
        const table = range.insertTable(rows, cols, "After", detection.data);
        
        // Apply basic formatting
        table.headerRowCount = 1;
        // Table will use default Word table styling
        
        await context.sync();
        
        // Delete the original text-based table
        for (let i = startIdx; i <= endIdx; i++) {
          const para = paragraphs.items[i];
          if (para.text.includes('|') || para.text.includes('\t')) {
            para.delete();
          }
        }
        
        await context.sync();
        
        return {
          success: true,
          message: `Converted text table to Word table with ${rows} rows and ${cols} columns`
        };
      });
    } catch (error: any) {
      return {
        success: false,
        error: error.message || "Failed to convert table"
      };
    }
  }
}