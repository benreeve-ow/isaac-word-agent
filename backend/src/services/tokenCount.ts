import Anthropic from "@anthropic-ai/sdk";

export async function countTokens(payload: { 
  messages: {role:"user"|"assistant"|"system"; content:any}[] 
}) {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const r = await client.messages.countTokens({ 
    model: process.env.MODEL ?? "claude-sonnet-4-20250514", 
    ...payload 
  } as any);
  return r.input_tokens;
}