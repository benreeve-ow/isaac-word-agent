/**
 * Frontend passthrough tools for Mastra
 * These tools execute on the frontend (Word add-in) and wait for results
 * using the tool bridge pattern for proper async handling
 */

import { createFrontendTool } from "./toolBridge";
import { z } from "zod";

export const frontendPassthroughTools = {
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
  
  "insert_table": createFrontendTool({
    id: "insert_table",
    description: "Insert a properly formatted table at specified location in the document",
    inputSchema: z.object({
      rows: z.number().min(1).describe("Number of rows"),
      columns: z.number().min(2).describe("Number of columns"), 
      data: z.array(z.array(z.string())).optional().describe("2D array of table data"),
      position: z.enum(["cursor", "end", "after_paragraph", "before_paragraph", "replace_selection"]).default("end"),
      search_text: z.string().optional().describe("Text to search for when using after/before_paragraph position"),
      header_row: z.boolean().default(true).describe("Whether first row should be header"),
      border_style: z.enum(["none", "minimal", "horizontal_only", "all", "grid"]).default("horizontal_only")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional()
    })
  }),
  
  "read_full_document": createFrontendTool({
    id: "read_full_document",
    description: "Read the complete document content including all text, tables, and formatting",
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
  
  "add_comment": createFrontendTool({
    id: "add_comment",
    description: "Add a review comment to selected text or specific location in the document",
    inputSchema: z.object({
      comment_text: z.string().describe("The text of the comment"),
      target_text: z.string().optional().describe("Text to attach the comment to (if not using selection)"),
      comment_type: z.enum(["suggestion", "question", "issue", "praise", "general"]).default("general").describe("Type of comment"),
      priority: z.enum(["high", "medium", "low"]).default("medium").describe("Priority level of the comment")
    }),
    outputSchema: z.object({
      success: z.boolean(),
      message: z.string().optional(),
      location: z.string().optional()
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