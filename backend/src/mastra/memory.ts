import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
import { ToolCallFilter, TokenLimiter } from "@mastra/memory/processors";
import { z } from "zod";
import { SummarizeTail } from "./compressors/summarizeTail";

const WM_SCHEMA = z.object({
  plan: z.object({
    items: z.array(z.object({
      id: z.string(),
      title: z.string(),
      status: z.enum(["todo","doing","done"]),
      evidenceRefs: z.array(z.string()).optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })),
    cursor: z.string().optional()
  }),
  status: z.object({
    turnsTaken: z.number().default(0),
    lastOp: z.string().optional(),
    lastTokenUsage: z.number().optional()
  })
});

export const getMemory = () => {
  const target = Number(process.env.CONTEXT_INPUT_BUDGET_TOKENS ?? 160000) -
                 Number(process.env.CONTEXT_SAFETY_MARGIN ?? 5000);

  return new Memory({
    storage: new LibSQLStore({ url: process.env.MEMORY_URL ?? "file:./memory.db" }),
    processors: [
      new ToolCallFilter(),
      new SummarizeTail({ targetTokens: target }),
      new TokenLimiter(Number(process.env.CONTEXT_INPUT_BUDGET_TOKENS ?? 160000)),
    ],
    options: {
      workingMemory: {
        schema: WM_SCHEMA,
        enabled: true
      }
    }
  });
};