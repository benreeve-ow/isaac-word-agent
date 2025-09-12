/**
 * Frontend passthrough tools for Mastra
 * These tools don't execute on the backend - they just pass through to the frontend
 * and wait for results via the stream handler
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { streamHandlers } from "../streamHandler";

// Helper to wait for frontend tool result
async function waitForFrontendResult(toolCallId: string, timeout = 30000): Promise<any> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const checkInterval = setInterval(() => {
      // Check all stream handlers for a result
      for (const [sessionId, handler] of streamHandlers) {
        // We need to access the handler's pending results
        // For now, we'll just wait and let the stream handler handle it
      }
      
      if (Date.now() - startTime > timeout) {
        clearInterval(checkInterval);
        reject(new Error(`Frontend tool timeout after ${timeout}ms`));
      }
    }, 100);
    
    // Store the promise handlers so the stream handler can resolve them
    // This is handled in the streamHandler's handleToolResult method
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve({ 
        message: "Tool executed on frontend",
        data: {} 
      });
    }, 500); // Short timeout for now - the stream handler will handle the real result
  });
}

export const frontendPassthroughTools = {
  "doc.snapshot": createTool({
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
    }),
    execute: async (input, toolCallId) => {
      console.log(`[Frontend Passthrough] doc.snapshot called with toolCallId: ${toolCallId}`);
      // The stream handler will intercept this and send it to frontend
      // For now, return a placeholder that tells the model the tool is being executed
      return {
        version: "1.0",
        blocks: [],
        meta: {
          documentTitle: "Processing...",
          createdAt: new Date().toISOString(),
          blockCount: 0
        }
      };
    }
  }),
  
  "doc.search": createTool({
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
    }),
    execute: async (input, toolCallId) => {
      console.log(`[Frontend Passthrough] doc.search called with toolCallId: ${toolCallId}`, input);
      // Return placeholder while frontend executes
      return {
        totalHits: 0,
        hits: [],
        summary: "Processing search..."
      };
    }
  }),
  
  "insert_table": createTool({
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
    }),
    execute: async (input, toolCallId) => {
      console.log(`[Frontend Passthrough] insert_table called with toolCallId: ${toolCallId}`, input);
      return {
        success: true,
        message: "Processing table insertion..."
      };
    }
  }),
  
  "doc.edit": createTool({
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
    }),
    execute: async (input, toolCallId) => {
      console.log(`[Frontend Passthrough] doc.edit called with toolCallId: ${toolCallId}`, input);
      // Return placeholder while frontend executes
      return {
        success: true,
        operation: (input as any).operation?.type || "unknown",
        message: "Processing edit..."
      };
    }
  })
};