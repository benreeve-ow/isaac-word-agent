import { Router, Request, Response } from "express";
import { wordAgent } from "../mastra/agent.word";
import type { CoreMessage } from "ai";

const router = Router();

// Improve text endpoint - uses Mastra agent for text improvement
router.post("/improve", async (req: Request, res: Response) => {
  try {
    const { text, contextBefore, contextAfter, userPrompt, systemPrompt } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }
    
    // Build the prompt for the agent
    const fullContext = [
      contextBefore ? `[Context before: ${contextBefore}]` : "",
      `[Selected text to improve: ${text}]`,
      contextAfter ? `[Context after: ${contextAfter}]` : ""
    ].filter(Boolean).join("\n");
    
    const prompt = userPrompt || "Improve the selected text. Make it clearer, more concise, and better written.";
    
    const messages: CoreMessage[] = [
      {
        role: "system",
        content: systemPrompt || "You are a helpful writing assistant. Improve the text provided by the user. Return ONLY the improved text without any explanation or commentary."
      },
      {
        role: "user",
        content: `${fullContext}\n\n${prompt}\n\nReturn ONLY the improved version of the selected text, nothing else.`
      }
    ];
    
    // Use the agent to generate improved text
    const result = await wordAgent.generateVNext(messages);
    
    // Extract the improved text from the result
    let improvedText = "";
    if (result && typeof result === 'object' && 'text' in result) {
      improvedText = result.text;
    } else if (result && typeof result === 'object' && 'content' in result) {
      improvedText = (result as any).content;
    } else if (typeof result === 'string') {
      improvedText = result;
    }
    
    // Clean up the response - remove any markdown or explanations
    improvedText = improvedText.trim();
    
    // If the agent added quotes around the text, remove them
    if (improvedText.startsWith('"') && improvedText.endsWith('"')) {
      improvedText = improvedText.slice(1, -1);
    }
    
    res.json({
      improvedText,
      explanation: "Text improved using AI assistant"
    });
    
  } catch (error: any) {
    console.error("Improve text error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to improve text"
    });
  }
});

// Implement comment endpoint - uses Mastra agent
router.post("/implement-comment", async (req: Request, res: Response) => {
  try {
    const { text, comment, context, systemPrompt } = req.body;
    
    if (!text || !comment) {
      return res.status(400).json({ error: "Text and comment are required" });
    }
    
    const messages: CoreMessage[] = [
      {
        role: "system",
        content: systemPrompt || "You are a helpful writing assistant. Apply the reviewer's comment to improve the text. Return ONLY the revised text without any explanation."
      },
      {
        role: "user",
        content: `Original text: ${text}\n\nReviewer's comment: ${comment}\n\n${context ? `Context: ${context}\n\n` : ''}Apply the comment and return ONLY the revised text.`
      }
    ];
    
    const result = await wordAgent.generateVNext(messages);
    
    // Extract the revised text
    let revisedText = "";
    if (result && typeof result === 'object' && 'text' in result) {
      revisedText = result.text;
    } else if (result && typeof result === 'object' && 'content' in result) {
      revisedText = (result as any).content;
    } else if (typeof result === 'string') {
      revisedText = result;
    }
    
    revisedText = revisedText.trim();
    if (revisedText.startsWith('"') && revisedText.endsWith('"')) {
      revisedText = revisedText.slice(1, -1);
    }
    
    res.json({
      revisedText,
      explanation: "Comment implemented using AI assistant"
    });
    
  } catch (error: any) {
    console.error("Implement comment error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to implement comment"
    });
  }
});

// Analyze style endpoint
router.post("/analyze-style", async (req: Request, res: Response) => {
  try {
    const { sampleText, sampleSize } = req.body;
    
    if (!sampleText) {
      return res.status(400).json({ error: "Sample text is required" });
    }
    
    const messages: CoreMessage[] = [
      {
        role: "system",
        content: "You are a writing style analyst. Analyze the provided text and describe its writing style, tone, and characteristics."
      },
      {
        role: "user",
        content: `Analyze this writing sample (${sampleSize || 'unknown'} words) and provide a brief style guide:\n\n${sampleText}`
      }
    ];
    
    const result = await wordAgent.generateVNext(messages);
    
    let analysis = "";
    if (result && typeof result === 'object' && 'text' in result) {
      analysis = result.text;
    } else if (result && typeof result === 'object' && 'content' in result) {
      analysis = (result as any).content;
    } else if (typeof result === 'string') {
      analysis = result;
    }
    
    res.json({
      styleAnalysis: analysis,
      sampleSize: sampleSize || sampleText.split(/\s+/).length
    });
    
  } catch (error: any) {
    console.error("Analyze style error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to analyze style"
    });
  }
});

export default router;