import { z } from "zod";
import { toolBus } from "../../bridge/toolBus";

const replaceByHitIdSchema = z.object({
  hitId: z.string(),
  newText: z.string(),
  comment: z.string().optional()
});

const insertByHitIdSchema = z.object({
  hitId: z.string(),
  newText: z.string(),
  position: z.enum(["before", "after"])
});

const commentByHitIdSchema = z.object({
  hitId: z.string(),
  comment: z.string()
});

const editSchema = z.object({
  operation: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("replaceByHitId"),
      ...replaceByHitIdSchema.shape
    }),
    z.object({
      type: z.literal("insertAfterHitId"),
      hitId: z.string(),
      newText: z.string()
    }),
    z.object({
      type: z.literal("insertBeforeHitId"),
      hitId: z.string(),
      newText: z.string()
    }),
    z.object({
      type: z.literal("commentByHitId"),
      ...commentByHitIdSchema.shape
    })
  ])
});

export const editTools = {
  "doc.edit": {
    description: "Edit the document using hit IDs from search results",
    parameters: editSchema,
    handler: async ({ operation }: z.infer<typeof editSchema>) => {
      const callId = `doc-edit-${Date.now()}`;
      toolBus.emitCall({ 
        id: callId, 
        tool: "doc.edit", 
        payload: { operation } 
      });
      
      const result = await toolBus.waitFor(callId);
      
      if (!result.ok) {
        throw new Error(result.error || "Edit operation failed");
      }
      
      return result.data || { success: true };
    }
  }
};