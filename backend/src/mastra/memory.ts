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
  // Get target tokens from env or use default
  const targetTokens = parseInt(process.env.CONTEXT_INPUT_BUDGET_TOKENS || "160000") - 
                      parseInt(process.env.CONTEXT_SAFETY_MARGIN || "5000");
  
  return new Memory({
    storage: new LibSQLStore({ url: process.env.MEMORY_URL ?? "file:./memory.db" }),
    // TODO: Re-enable compression once we fix the processor interface
    // processors: [
    //   new SummarizeTail({ targetTokens })
    // ],
    processors: [],
    options: {
      workingMemory: {
        schema: WM_SCHEMA,
        enabled: true
      }
    }
  });
};