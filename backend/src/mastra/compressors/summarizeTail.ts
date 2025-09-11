// Define types locally since they're not exported from @mastra/memory
interface Message {
  id?: string;
  role: string;
  content: any;
}

interface MemoryProcessor {
  process(messages: Message[]): Promise<Message[]>;
}
import { countTokens } from "../../services/tokenCount";
import Anthropic from "@anthropic-ai/sdk";

export class SummarizeTail implements MemoryProcessor {
  constructor(private cfg: { targetTokens: number }) {}
  
  async process(messages: Message[]): Promise<Message[]> {
    // quick short-circuit
    if (messages.length < 6) return messages;

    // naive split: keep most recent N, summarize the rest
    const head = messages.slice(0, Math.floor(messages.length * 0.6));
    const tail = messages.slice(Math.floor(messages.length * 0.6));

    const total = await countTokens({ 
      messages: [...head, ...tail].map(m => ({
        role: m.role as any, 
        content: m.content
      })) 
    });
    
    if (total <= this.cfg.targetTokens) return messages;

    // Summarize tail with Anthropic
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const prompt = `Summarize the following conversation/tool events into <= 1800 tokens.
Preserve anchors (IDs, table/paragraph paths), decisions, and unresolved TODOs.
===
${tail.map(m => `[${m.role}] ${typeof m.content === "string" ? m.content : JSON.stringify(m.content)}`).join("\n")}
===
Return a concise narrative with bullet anchors and decisions.`;

    const resp = await client.messages.create({
      model: process.env.MODEL ?? "claude-3-5-sonnet-20241022",
      max_tokens: 1800,
      messages: [{ role: "user", content: prompt }]
    });

    const summaryText = (resp.content[0] as any).text ?? JSON.stringify(resp.content);

    const summarized: Message = {
      id: `summary-${Date.now()}`,
      role: "assistant",
      content: `Summary of earlier context:\n${summaryText}`
    };

    const compacted = [...head, summarized];

    // final guard
    const after = await countTokens({ 
      messages: compacted.map(m => ({
        role: m.role as any, 
        content: m.content
      })) 
    });
    
    return after > this.cfg.targetTokens ? compacted.slice(-10) : compacted;
  }
}