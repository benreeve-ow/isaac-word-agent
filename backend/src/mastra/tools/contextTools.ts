/**
 * Context-based document editing tools
 * These tools use surrounding text as anchors, similar to how coding agents work
 */

import { createFrontendTool } from "./toolBridge";
import { z } from "zod";

export const contextTools = {
  // Simple text insertion tool
  "insert_text": createFrontendTool({
    id: "insert_text",
    description: "Insert text at the start, end, or relative to an anchor text in the document",
    inputSchema: z.object({
      position: z.enum(["start", "end", "after", "before"]).describe("Where to insert the text"),
      anchor: z.string().optional().describe("Text fragment to search for (required for 'after' and 'before' positions). Use 30-50 chars from the end of a paragraph for 'after', or from the start for 'before'"),
      content: z.string().describe("The text content to insert")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // Replace text tool
  "replace_text": createFrontendTool({
    id: "replace_text",
    description: "Replace a paragraph or text section in the document",
    inputSchema: z.object({
      anchor: z.string().describe("Text fragment to find (first 30-50 chars of the paragraph to replace)"),
      content: z.string().describe("The new text to replace with"),
      scope: z.enum(["paragraph", "exact"]).default("paragraph").describe("What to replace - the whole paragraph or just the exact match")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // Delete text tool
  "delete_text": createFrontendTool({
    id: "delete_text",
    description: "Delete a paragraph or text section from the document",
    inputSchema: z.object({
      anchor: z.string().describe("Text fragment to find (first 30-50 chars of the paragraph to delete)"),
      scope: z.enum(["paragraph", "exact"]).default("paragraph").describe("What to delete - the whole paragraph or just the exact match")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // Simple table insertion with context positioning
  "insert_table": createFrontendTool({
    id: "insert_table",
    description: "Insert a table at the start, end, or relative to an anchor text in the document",
    inputSchema: z.object({
      position: z.enum(["start", "end", "after", "before"]).describe("Where to insert the table"),
      anchor: z.string().optional().describe("Text fragment to search for (required for 'after' and 'before' positions)"),
      rows: z.number().min(1).describe("Number of rows"),
      columns: z.number().min(1).describe("Number of columns"),
      data: z.array(z.array(z.string())).optional().describe("2D array of table data"),
      headerRow: z.boolean().default(true).describe("Whether first row should be header"),
      style: z.enum(["grid", "simple", "none"]).default("grid").describe("Table style")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // Read the document (keep the existing one but rename for consistency)
  "read_document": createFrontendTool({
    id: "read_document",
    description: "Read the complete document content to understand what's currently in it",
    inputSchema: z.object({
      includeFormatting: z.boolean().default(false).describe("Include formatting information"),
      includeComments: z.boolean().default(false).describe("Include review comments")
    }),
    outputSchema: z.object({
      content: z.string(),
      paragraphCount: z.number(),
      wordCount: z.number(),
      tableCount: z.number().optional(),
      hasComments: z.boolean().optional()
    })
  }),

  // Unified document reader - shows tables, comments, and text in proper positions
  "read_unified_document": createFrontendTool({
    id: "read_unified_document",
    description: "Read document with proper structure - paragraphs, tables, and comments in their actual positions",
    inputSchema: z.object({
      includeComments: z.boolean().default(true).describe("Include review comments inline where they appear"),
      formatTables: z.boolean().default(true).describe("Format tables as readable ASCII tables")
    }),
    outputSchema: z.object({
      content: z.string(),
      wordCount: z.number(),
      paragraphCount: z.number(),
      tableCount: z.number(),
      hasComments: z.boolean(),
      structure: z.object({
        tables: z.number(),
        headings: z.number(),
        lists: z.number(),
        comments: z.number()
      }).optional()
    })
  }),

  // Add comment (simplified)
  "add_comment": createFrontendTool({
    id: "add_comment",
    description: "Add a review comment to text in the document",
    inputSchema: z.object({
      anchor: z.string().describe("Text to attach the comment to (30-50 chars)"),
      comment: z.string().describe("The comment text"),
      type: z.enum(["suggestion", "question", "issue", "praise", "general"]).default("general")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // Resolve comment (accept/reject)
  "resolve_comment": createFrontendTool({
    id: "resolve_comment",
    description: "Accept or reject a review comment by applying or dismissing the suggested change",
    inputSchema: z.object({
      commentIndex: z.number().describe("The index of the comment to resolve (starting from 0)"),
      action: z.enum(["accept", "reject", "implement"]).describe("How to resolve the comment"),
      replacementText: z.string().optional().describe("The text to use when accepting or implementing the comment")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // Edit table cells by index
  "edit_table": createFrontendTool({
    id: "edit_table",
    description: "Edit a table cell's content by specifying table index, row, and column",
    inputSchema: z.object({
      tableIndex: z.number().describe("Index of the table in the document (0-based)"),
      row: z.number().describe("Row index (0-based)"),
      column: z.number().describe("Column index (0-based)"),
      newValue: z.string().describe("New value for the cell")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  })
};