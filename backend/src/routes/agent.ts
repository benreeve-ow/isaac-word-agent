import { Router, Request, Response } from "express";
import { wordAgent } from "../mastra/agent.word";
import { toolBus } from "../bridge/toolBus";
import { countTokens } from "../services/tokenCount";
import { z } from "zod";

const router = Router();

// Middleware to check auth
const checkAuth = (req: Request, res: Response, next: any) => {
  const secret = process.env.TOOL_BRIDGE_SECRET;
  if (secret) {
    const auth = req.headers.authorization;
    if (!auth || auth !== `Bearer ${secret}`) {
      return res.status(401).json({ error: "Unauthorized" });
    }
  }
  next();
};

// Single-shot agent call
router.post("/run", checkAuth, async (req: Request, res: Response) => {
  try {
    const { messages, documentContext } = req.body;
    
    // Preflight token check
    const tokenCount = await countTokens({ messages });
    const budget = Number(process.env.CONTEXT_INPUT_BUDGET_TOKENS ?? 160000);
    
    if (tokenCount > budget) {
      return res.status(400).json({ 
        error: "Context too large", 
        tokens: tokenCount, 
        budget 
      });
    }
    
    // Run agent - Mastra expects messages as first parameter
    const result = await wordAgent.generate(messages, {
      context: documentContext
    });
    
    res.json(result);
  } catch (error: any) {
    console.error("Agent run error:", error);
    res.status(500).json({ error: error.message });
  }
});

// SSE streaming endpoint
router.get("/stream", checkAuth, async (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  
  // Parse query params for initial message
  const userMessage = req.query.message as string;
  
  if (!userMessage) {
    res.write(`event: error\ndata: ${JSON.stringify({ error: "No message provided" })}\n\n`);
    res.end();
    return;
  }
  
  try {
    // Listen for tool calls
    const toolCallHandler = (call: any) => {
      res.write(`event: toolCall\ndata: ${JSON.stringify(call)}\n\n`);
    };
    
    toolBus.on("call", toolCallHandler);
    
    // Stream agent response - Mastra expects messages as first parameter
    const stream = await wordAgent.stream(
      [{ role: "user", content: userMessage }]
    );
    
    // Access the text stream from the result
    const textStream = stream.textStream;
    for await (const chunk of textStream) {
      // Send the raw text chunk
      res.write(`event: text\ndata: ${JSON.stringify({ text: chunk })}\n\n`);
    }
    
    // Clean up
    toolBus.off("call", toolCallHandler);
    
    res.write(`event: done\ndata: {}\n\n`);
    res.end();
    
  } catch (error: any) {
    console.error("Stream error:", error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

export default router;