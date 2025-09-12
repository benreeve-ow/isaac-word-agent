import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// Plan tools are handled on the backend only - they manage memory state
// They don't need the tool bridge since they don't interact with Word

const planAddTool = createTool({
  id: "plan.add",
  description: "Add a new task to the plan",
  inputSchema: z.object({
    title: z.string().describe("Task title")
  }),
  outputSchema: z.object({
    success: z.boolean(),
    id: z.string()
  }),
  execute: async ({ context }) => {
    const { title } = context;
    // Store in memory - this would be managed by Mastra's memory system
    const newItem = {
      id: `task-${Date.now()}`,
      title,
      status: "todo",
      createdAt: new Date().toISOString()
    };
    
    return { success: true, id: newItem.id };
  }
});

const planListTool = createTool({
  id: "plan.list",
  description: "List all tasks in the plan",
  inputSchema: z.object({}),
  outputSchema: z.array(z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(["todo", "done"]),
    createdAt: z.string()
  })),
  execute: async () => {
    // Return empty array for now - would be managed by Mastra's memory
    return [];
  }
});

const planCompleteTool = createTool({
  id: "plan.complete",
  description: "Mark a task as completed",
  inputSchema: z.object({
    id: z.string().describe("Task ID to complete")
  }),
  outputSchema: z.object({
    success: z.boolean()
  }),
  execute: async ({ context }) => {
    const { id } = context;
    // Update in memory - would be managed by Mastra's memory
    return { success: true };
  }
});

const planDeleteTool = createTool({
  id: "plan.delete",
  description: "Delete a task from the plan",
  inputSchema: z.object({
    id: z.string().describe("Task ID to delete")
  }),
  outputSchema: z.object({
    success: z.boolean()
  }),
  execute: async ({ context }) => {
    const { id } = context;
    // Delete from memory - would be managed by Mastra's memory
    return { success: true };
  }
});

export const planTools = {
  "plan.add": planAddTool,
  "plan.list": planListTool,
  "plan.complete": planCompleteTool,
  "plan.delete": planDeleteTool
};