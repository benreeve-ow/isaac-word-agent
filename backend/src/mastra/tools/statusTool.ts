import { z } from "zod";
import { toolBus } from "../../bridge/toolBus";

const tickSchema = z.object({
  op: z.string().describe("Operation performed"),
  tokens: z.number().optional().describe("Tokens used (optional)")
});

export const statusTools = {
  "status.get": {
    description: "Get current status metrics",
    parameters: z.object({}),
    handler: async (_: any, context: any) => {
      const callId = `status-get-${Date.now()}`;
      toolBus.emitCall({ id: callId, tool: "status.get", payload: {} });
      const result = await toolBus.waitFor(callId);
      
      if (context?.workingMemory?.status) {
        return context.workingMemory.status;
      }
      
      return result.data || { turnsTaken: 0 };
    }
  },
  
  "status.tick": {
    description: "Increment turn counter and update status",
    parameters: tickSchema,
    handler: async ({ op, tokens }: z.infer<typeof tickSchema>, context: any) => {
      const callId = `status-tick-${Date.now()}`;
      toolBus.emitCall({ id: callId, tool: "status.tick", payload: { op, tokens } });
      const result = await toolBus.waitFor(callId);
      
      if (context?.workingMemory) {
        if (!context.workingMemory.status) {
          context.workingMemory.status = { turnsTaken: 0 };
        }
        
        context.workingMemory.status.turnsTaken++;
        context.workingMemory.status.lastOp = op;
        if (tokens !== undefined) {
          context.workingMemory.status.lastTokenUsage = tokens;
        }
      }
      
      return result.data || { success: true };
    }
  }
};