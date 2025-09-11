import { z } from "zod";

export const ToolCall = z.object({
  id: z.string(),
  tool: z.string(),
  payload: z.any(),
});

export const ToolResult = z.object({
  id: z.string(),
  ok: z.boolean(),
  data: z.any().optional(),
  error: z.string().optional(),
});

export type ToolCallT = z.infer<typeof ToolCall>;
export type ToolResultT = z.infer<typeof ToolResult>;