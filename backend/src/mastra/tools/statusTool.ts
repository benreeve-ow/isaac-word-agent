import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Status tools are handled on the backend only - they track agent progress
// They don't need the tool bridge since they don't interact with Word

const statusGetTool = createTool({
  id: "status.get",
  description: "Get current status metrics",
  inputSchema: z.object({}),
  outputSchema: z.object({
    turnsTaken: z.number(),
    lastOp: z.string().optional(),
    lastTokenUsage: z.number().optional()
  }),
  execute: async () => {
    // Return current status - would be managed by Mastra's memory
    return {
      turnsTaken: 0,
      lastOp: "init",
      lastTokenUsage: 0
    };
  }
});

const statusTickTool = createTool({
  id: "status.tick",
  description: "Increment turn counter and update status",
  inputSchema: z.object({
    op: z.string().describe("Operation performed"),
    tokens: z.number().optional().describe("Tokens used (optional)")
  }),
  outputSchema: z.object({
    success: z.boolean()
  }),
  execute: async ({ context }) => {
    // Update status - would be managed by Mastra's memory
    return { success: true };
  }
});

export const statusTools = {
  "status.get": statusGetTool,
  "status.tick": statusTickTool
};