import { z } from "zod";
import { toolBus } from "../../bridge/toolBus";

const snapshotSchema = z.object({
  options: z.object({
    includeStyles: z.boolean().optional(),
    includeComments: z.boolean().optional()
  }).optional()
});

export const snapshotTools = {
  "doc.snapshot": {
    description: "Get a Unified Document View (UDV) of the current document",
    parameters: snapshotSchema,
    handler: async ({ options }: z.infer<typeof snapshotSchema>) => {
      const callId = `doc-snapshot-${Date.now()}`;
      toolBus.emitCall({ id: callId, tool: "doc.snapshot", payload: { options } });
      const result = await toolBus.waitFor(callId);
      
      if (!result.ok) {
        throw new Error(result.error || "Failed to get document snapshot");
      }
      
      return result.data;
    }
  }
};