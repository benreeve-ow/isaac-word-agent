import { z } from "zod";
import { toolBus } from "../../bridge/toolBus";

const addSchema = z.object({
  title: z.string().describe("Task title")
});

const completeSchema = z.object({
  id: z.string().describe("Task ID to complete")
});

const deleteSchema = z.object({
  id: z.string().describe("Task ID to delete")
});

export const planTools = {
  "plan.add": {
    description: "Add a new task to the plan",
    parameters: addSchema,
    handler: async ({ title }: z.infer<typeof addSchema>, context: any) => {
      const callId = `plan-add-${Date.now()}`;
      toolBus.emitCall({ id: callId, tool: "plan.add", payload: { title } });
      const result = await toolBus.waitFor(callId);
      
      if (result.ok && context?.workingMemory) {
        const wm = context.workingMemory;
        const newItem = {
          id: `task-${Date.now()}`,
          title,
          status: "todo" as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        if (!wm.plan) wm.plan = { items: [] };
        wm.plan.items.push(newItem);
        
        return { success: true, id: newItem.id };
      }
      
      return result.data || { error: result.error };
    }
  },
  
  "plan.list": {
    description: "List all tasks in the plan",
    parameters: z.object({}),
    handler: async (_: any, context: any) => {
      const callId = `plan-list-${Date.now()}`;
      toolBus.emitCall({ id: callId, tool: "plan.list", payload: {} });
      const result = await toolBus.waitFor(callId);
      
      if (context?.workingMemory?.plan) {
        return context.workingMemory.plan.items;
      }
      
      return result.data || [];
    }
  },
  
  "plan.complete": {
    description: "Mark a task as completed",
    parameters: completeSchema,
    handler: async ({ id }: z.infer<typeof completeSchema>, context: any) => {
      const callId = `plan-complete-${Date.now()}`;
      toolBus.emitCall({ id: callId, tool: "plan.complete", payload: { id } });
      const result = await toolBus.waitFor(callId);
      
      if (result.ok && context?.workingMemory?.plan) {
        const item = context.workingMemory.plan.items.find((i: any) => i.id === id);
        if (item) {
          item.status = "done";
          item.updatedAt = new Date().toISOString();
        }
      }
      
      return result.data || { success: result.ok };
    }
  },
  
  "plan.delete": {
    description: "Delete a task from the plan",
    parameters: deleteSchema,
    handler: async ({ id }: z.infer<typeof deleteSchema>, context: any) => {
      const callId = `plan-delete-${Date.now()}`;
      toolBus.emitCall({ id: callId, tool: "plan.delete", payload: { id } });
      const result = await toolBus.waitFor(callId);
      
      if (result.ok && context?.workingMemory?.plan) {
        context.workingMemory.plan.items = context.workingMemory.plan.items.filter(
          (i: any) => i.id !== id
        );
      }
      
      return result.data || { success: result.ok };
    }
  }
};