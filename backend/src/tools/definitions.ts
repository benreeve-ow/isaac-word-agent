/**
 * Unified tool definitions for document editing
 * Single source of truth for all frontend-executed tools
 */

import { createFrontendTool } from "../mastra/tools/toolBridge";
import { z } from "zod";

export const tools = {
  // ==========================================
  // DOCUMENT READING TOOLS
  // ==========================================
  
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

  // ==========================================
  // TEXT EDITING TOOLS
  // ==========================================
  
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

  // ==========================================
  // TABLE TOOLS
  // ==========================================
  
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
  }),

  // ==========================================
  // COMMENT TOOLS
  // ==========================================
  
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

  "resolve_comment": createFrontendTool({
    id: "resolve_comment",
    description: "Reply to, accept, or reject a review comment. Use 'reply' to add a response without changing text.",
    inputSchema: z.object({
      commentIndex: z.number().describe("The index of the comment to resolve (starting from 0)"),
      action: z.enum(["accept", "reject", "implement", "reply"]).describe("How to handle the comment - 'reply' adds a response, 'accept/implement' changes text, 'reject' dismisses"),
      replacementText: z.string().optional().describe("The text to replace in document (for 'accept' and 'implement' actions)"),
      replyText: z.string().optional().describe("Text to add as a reply to the comment thread (for any action, required for 'reply')")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),

  // ==========================================
  // SEARCH TOOLS
  // ==========================================
  
  "doc.search": createFrontendTool({
    id: "doc.search",
    description: "Search the document for text using literal or regex patterns",
    inputSchema: z.object({
      query: z.string().describe("Search query"),
      mode: z.enum(["literal", "regex"]).default("literal").describe("Search mode"),
      maxHits: z.number().default(40).describe("Maximum number of hits to return")
    }),
    outputSchema: z.object({
      hits: z.array(z.object({
        hitId: z.string(),
        path: z.array(z.number()),
        context: z.string(),
        offStart: z.number(),
        offEnd: z.number()
      })).optional(),
      totalHits: z.number(),
      summary: z.string().optional(),
      topK: z.array(z.any()).optional(),
      omitted: z.number().optional()
    })
  }),

  // ==========================================
  // ADVANCED DOCUMENT TOOLS
  // ==========================================
  
  "doc.snapshot": createFrontendTool({
    id: "doc.snapshot",
    description: "Get a Unified Document View (UDV) of the current document for analysis and editing",
    inputSchema: z.object({
      dummy: z.string().optional().default("").describe("Not used - this tool requires no parameters")
    }),
    outputSchema: z.object({
      version: z.string(),
      blocks: z.array(z.any()),
      meta: z.object({
        documentTitle: z.string().optional(),
        createdAt: z.string(),
        blockCount: z.number()
      })
    })
  }),

  "doc.edit": createFrontendTool({
    id: "doc.edit",
    description: "Edit the document by replacing, inserting, or commenting on text found via search",
    inputSchema: z.object({
      operation: z.discriminatedUnion("type", [
        z.object({
          type: z.literal("replaceByHitId"),
          hitId: z.string().describe("Hit ID from search results"),
          newText: z.string().describe("New text to replace with"),
          comment: z.string().optional().describe("Optional comment to add")
        }),
        z.object({
          type: z.literal("insertAfterHitId"),
          hitId: z.string().describe("Hit ID from search results"),
          newText: z.string().describe("Text to insert")
        }),
        z.object({
          type: z.literal("insertBeforeHitId"),
          hitId: z.string().describe("Hit ID from search results"),
          newText: z.string().describe("Text to insert")
        }),
        z.object({
          type: z.literal("commentByHitId"),
          hitId: z.string().describe("Hit ID from search results"),
          comment: z.string().describe("Comment to add")
        })
      ]).describe("Edit operation to perform")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      operation: z.string().optional(),
      message: z.string().optional()
    })
  })
};