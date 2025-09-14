import { Memory } from "@mastra/memory";
import { LibSQLStore } from "@mastra/libsql";
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
  // Set compression threshold at 120k tokens (75% of budget)
  const targetTokens = 120000;
  
  return new Memory({
    storage: new LibSQLStore({ url: process.env.MEMORY_URL ?? "file:./memory.db" }),
    // Enable compression at 120k tokens
    // Note: SummarizeTail needs to match Mastra's MemoryProcessor interface
    // For now, keeping disabled until we can properly implement the interface
    processors: [],
    options: {
      workingMemory: {
        schema: WM_SCHEMA,
        enabled: true
      }
    }
  });
};