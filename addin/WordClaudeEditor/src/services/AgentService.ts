/**
 * Service for handling agent operations with the new modular tool system
 */

import { 
  ToolRegistry, 
  ToolExecutor, 
  initializeTools, 
  getToolDefinitionsForAgent 
} from "../tools";
import { toolHost } from "./ToolHost";

export interface AgentMessage {
  type: "content" | "tool_use" | "complete" | "error";
  data: any;
}

export interface ToolUse {
  id: string;
  name: string;
  tool?: string;
  input: any;
  result?: any;
}

class AgentServiceClass {
  private backendUrl: string = "";
  private toolExecutor: ToolExecutor;
  private toolRegistry: ToolRegistry;
  private currentAbortController: AbortController | null = null;
  private toolBridgeSecret: string = "79e7fbce-0788-4308-9638-d49c2f860cdc"; // Same as backend TOOL_BRIDGE_SECRET
  private currentSessionId: string | null = null;
  
  constructor() {
    // Initialize the tool system
    initializeTools();
    
    this.toolExecutor = new ToolExecutor();
    this.toolRegistry = ToolRegistry.getInstance();
    
    // Load backend URL from settings
    this.loadBackendUrl();
    
    // Clear memory on initialization
    this.clearMemory().catch(error => {
      console.error("[AgentService] Failed to clear memory on init:", error);
    });
  }
  
  /**
   * Clear the agent's memory (called on add-in startup)
   */
  async clearMemory(): Promise<void> {
    try {
      console.log("[AgentService] Clearing memory for new session");
      const response = await fetch(`${this.backendUrl}/api/agent/clear-memory`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.toolBridgeSecret}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to clear memory: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("[AgentService] Memory cleared:", result.message);
    } catch (error) {
      console.error("[AgentService] Error clearing memory:", error);
      // Don't throw - let the add-in continue even if memory clearing fails
    }
  }
  
  private loadBackendUrl(): void {
    try {
      if (typeof Office !== "undefined" && Office.context && Office.context.document) {
        const settings = Office.context.document.settings;
        this.backendUrl = settings.get("backendUrl") || "https://localhost:3000";
      } else {
        this.backendUrl = localStorage.getItem("backendUrl") || "https://localhost:3000";
      }
    } catch (error) {
      console.error("Failed to load backend URL:", error);
      this.backendUrl = "https://localhost:3000";
    }
  }
  
  /**
   * Get the current document context for the agent
   */
  async getDocumentContext(): Promise<string> {
    return Word.run(async (context) => {
      const body = context.document.body;
      context.load(body, "text");
      await context.sync();
      
      const fullText = body.text;
      const wordCount = fullText.split(/\s+/).filter(w => w.length > 0).length;
      const estimatedTokens = Math.ceil(fullText.length / 4);
      
      // Include document stats in context
      let contextHeader = `[Document Info: ${wordCount} words, ~${estimatedTokens} tokens, ${fullText.length} characters]\n\n`;
      
      // If document is small enough, provide full context
      if (estimatedTokens < 25000) {
        return contextHeader + fullText;
      }
      
      // Otherwise provide truncated context
      const maxLength = 5000;
      const start = fullText.substring(0, maxLength / 2);
      const end = fullText.substring(fullText.length - maxLength / 2);
      return contextHeader + `${start}\n\n[... content truncated - use read_full_document tool to see full text ...]\n\n${end}`;
    });
  }
  
  /**
   * Check if the backend server is healthy
   */
  async checkBackendHealth(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/health`, {
        method: "GET",
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${this.toolBridgeSecret}`
        }
      });
      
      if (response.ok) {
        return { healthy: true };
      } else {
        return { 
          healthy: false, 
          error: `Server returned ${response.status}: ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : "Connection failed" 
      };
    }
  }
  
  /**
   * Cancel any ongoing agent execution
   */
  cancelAgent(): void {
    if (this.currentAbortController) {
      console.log("[AgentService] Cancelling agent execution");
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
  }
  
  /**
   * Stream agent responses with tool execution
   */
  async *streamAgentResponse(
    userPrompt: string, 
    documentContext: string
  ): AsyncGenerator<AgentMessage> {
    // Cancel any existing execution
    this.cancelAgent();
    
    // Create new abort controller for this execution
    this.currentAbortController = new AbortController();
    const signal = this.currentAbortController.signal;
    
    try {
      const response = await fetch(`${this.backendUrl}/api/agent/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "Authorization": `Bearer ${this.toolBridgeSecret}`
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userPrompt }],
          documentContext,
          tools: getToolDefinitionsForAgent() // Send tool definitions to backend
        }),
        signal // Pass abort signal to fetch
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }
      
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        // Check if cancelled
        if (signal.aborted) {
          console.log("[AgentService] Stream cancelled by user");
          yield { type: "error", data: { error: "Cancelled by user" } };
          break;
        }
        
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          // Check cancellation before processing each line
          if (signal.aborted) {
            console.log("[AgentService] Stream cancelled during processing");
            yield { type: "error", data: { error: "Cancelled by user" } };
            return;
          }
          
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            
            if (data === "[DONE]") {
              yield { type: "complete", data: {} };
              this.currentAbortController = null; // Clear on completion
              return;
            }
            
            try {
              const message = JSON.parse(data);
              
              // Handle session message
              if (message.type === "session") {
                this.currentSessionId = message.data.sessionId;
                console.log(`[AgentService] Session ID: ${this.currentSessionId}`);
              }
              // Handle tool use messages
              else if (message.type === "tool_use") {
                // Check cancellation before tool execution
                if (signal.aborted) {
                  console.log("[AgentService] Cancelled before tool execution");
                  yield { type: "error", data: { error: "Cancelled by user" } };
                  return;
                }
                
                console.log(`[AgentService] Executing tool: ${message.data.name}`);
                console.log(`[AgentService] Tool input:`, message.data.input);
                
                try {
                  // Execute the tool using the new system
                  const result = await this.toolExecutor.execute(
                    message.data.name,
                    message.data.input,
                    { trackChanges: true }
                  );
                  
                  // Add result to message
                  message.data.result = result;
                  
                  // Log result for debugging
                  if (!result.success) {
                    console.error(`[AgentService] Tool ${message.data.name} failed:`, result.error);
                  } else {
                    console.log(`[AgentService] Tool ${message.data.name} succeeded`);
                    if (result.data) {
                      console.log(`[AgentService] Tool returned data:`, result.data);
                    }
                  }
                  
                  // Send the tool result back to the backend
                  if (message.data.id) {
                    try {
                      const response = await fetch(`${this.backendUrl}/api/agent/tool-result`, {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          "Authorization": `Bearer ${this.toolBridgeSecret}`
                        },
                        body: JSON.stringify({
                          toolUseId: message.data.id,
                          result: result,
                          sessionId: this.currentSessionId
                        })
                      });
                      
                      if (!response.ok) {
                        console.error(`[AgentService] Failed to send tool result: ${response.status}`);
                      } else {
                        console.log(`[AgentService] Tool result sent to backend for ${message.data.name}`);
                      }
                    } catch (error) {
                      console.error(`[AgentService] Error sending tool result:`, error);
                    }
                  }
                } catch (error) {
                  console.error(`[AgentService] Tool execution error:`, error);
                  message.data.result = {
                    success: false,
                    error: error instanceof Error ? error.message : "Tool execution failed"
                  };
                }
                
                yield message;
              } 
              // Handle content messages (text from the agent)
              else if (message.type === "content") {
                yield message;
              } 
              else {
                yield message;
              }
            } catch (e) {
              console.error("Failed to parse SSE message:", e);
            }
          }
        }
      }
    } catch (error: any) {
      // Handle abort specifically
      if (error.name === 'AbortError') {
        console.log("[AgentService] Request aborted");
        yield { type: "error", data: { error: "Cancelled by user" } };
      } else {
        console.error("Agent stream error:", error);
        yield {
          type: "error",
          data: { error: error instanceof Error ? error.message : "Unknown error" }
        };
      }
    } finally {
      // Clean up abort controller
      if (this.currentAbortController?.signal === signal) {
        this.currentAbortController = null;
      }
    }
  }
  
  /**
   * Get available tools for display in UI
   */
  getAvailableTools(): Array<{ name: string; description: string; category: string }> {
    return this.toolRegistry.getAllTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      category: tool.category
    }));
  }
  
  /**
   * Get tools grouped by category
   */
  getToolsByCategory(): Map<string, Array<{ name: string; description: string }>> {
    const categorized = new Map<string, Array<{ name: string; description: string }>>();
    
    for (const category of this.toolRegistry.getCategories()) {
      const tools = this.toolRegistry.getToolsByCategory(category).map(tool => ({
        name: tool.name,
        description: tool.description
      }));
      categorized.set(category, tools);
    }
    
    return categorized;
  }
  
  /**
   * Execute a specific tool directly (for testing or manual execution)
   */
  async executeTool(toolName: string, params: any): Promise<any> {
    return await this.toolExecutor.execute(toolName, params, {
      trackChanges: true,
      requireApproval: false
    });
  }

  /**
   * New unified streaming method for all document processor modes
   */
  async streamAgent(
    messages: any[],
    documentContext: any,
    customTools?: any[],
    onToolUse?: (tool: any) => void,
    onContent?: (content: string) => void,
    onComplete?: () => void,
    onError?: (error: Error) => void,
    signal?: AbortSignal,
    maxIterations?: number,
    mode?: any
  ): Promise<void> {
    // Cancel any existing execution
    this.cancelAgent();
    
    // Create new abort controller for this execution
    this.currentAbortController = new AbortController();
    const localSignal = this.currentAbortController.signal;
    
    try {
      const response = await fetch(`${this.backendUrl}/api/agent/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
          "Authorization": `Bearer ${this.toolBridgeSecret}`
        },
        body: JSON.stringify({
          messages,
          documentContext,
          tools: customTools || getToolDefinitionsForAgent(),
          mode, // Pass mode configuration to backend
          maxIterations
        }),
        signal: signal || localSignal
      });
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Response body is not readable");
      }
      
      const decoder = new TextDecoder();
      let buffer = "";
      
      while (true) {
        // Check if cancelled
        if ((signal && signal.aborted) || localSignal.aborted) {
          console.log("[AgentService] Stream cancelled");
          if (onError) onError(new Error("Cancelled by user"));
          break;
        }
        
        const { done, value } = await reader.read();
        
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            
            if (data === "[DONE]") {
              if (onComplete) onComplete();
              this.currentAbortController = null;
              return;
            }
            
            try {
              const message = JSON.parse(data);
              
              // Handle session message
              if (message.type === "session") {
                this.currentSessionId = message.data.sessionId;
                console.log(`[AgentService] Session ID: ${this.currentSessionId}`);
              }
              // Also handle "done" type message from backend
              else if (message.type === "done") {
                if (onComplete) onComplete();
                this.currentAbortController = null;
                return;
              }
              
              // Handle different message types
              if (message.type === "tool_use") {
                console.log(`[AgentService] Received tool call: ${message.data.name}`);
                console.log(`[AgentService] Full message data:`, JSON.stringify(message.data, null, 2));
                
                // Use ToolExecutor for dynamic tool execution
                let toolResult;
                try {
                  toolResult = await this.toolExecutor.execute(
                    message.data.name,
                    message.data.args || message.data.input || {},
                    { trackChanges: true }
                  );
                } catch (toolError) {
                  console.error(`[AgentService] Tool execution error:`, toolError);
                  toolResult = {
                    success: false,
                    error: toolError instanceof Error ? toolError.message : 'Tool execution failed'
                  };
                }
                
                console.log(`[AgentService] Tool ${message.data.name} result:`, {
                  success: toolResult?.success,
                  hasData: !!toolResult?.data,
                  error: toolResult?.error
                });
                
                // Send result back to backend
                await this.sendToolResult(message.data.id, toolResult);
                
                // Notify UI
                if (onToolUse) {
                  onToolUse({
                    id: message.data.id,
                    name: message.data.name,
                    input: message.data.args || message.data.input,
                    result: toolResult
                  });
                }
              } else if (message.type === "content") {
                // Backend sends 'text' field, not 'content'
                if (onContent) onContent(message.data.text || message.data.content);
              } else if (message.type === "error") {
                if (onError) onError(new Error(message.data.error));
              } else if (message.type === "complete") {
                if (onComplete) onComplete();
              }
            } catch (e) {
              console.error("Failed to parse SSE message:", e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log("[AgentService] Request aborted");
        if (onError) onError(new Error("Cancelled by user"));
      } else {
        console.error("Agent stream error:", error);
        if (onError) onError(error);
      }
    } finally {
      // Clean up abort controller
      if (this.currentAbortController?.signal === localSignal) {
        this.currentAbortController = null;
      }
    }
  }

  /**
   * Send tool result back to backend
   */
  private async sendToolResult(toolUseId: string, result: any): Promise<void> {
    try {
      console.log(`[AgentService] Sending tool result for ${toolUseId}:`, {
        success: result?.success,
        hasMessage: !!result?.message,
        messageLength: result?.message?.length,
        messageSample: result?.message?.substring(0, 100),
        hasData: !!result?.data,
        dataKeys: result?.data ? Object.keys(result.data) : null
      });
      
      const response = await fetch(`${this.backendUrl}/api/agent/tool-result`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.toolBridgeSecret}`
        },
        body: JSON.stringify({
          toolUseId,
          result,
          sessionId: this.currentSessionId
        })
      });
      
      if (!response.ok) {
        console.error(`[AgentService] Failed to send tool result: ${response.status}`);
      } else {
        console.log(`[AgentService] Tool result sent successfully for ${toolUseId}`);
      }
    } catch (error) {
      console.error(`[AgentService] Error sending tool result:`, error);
    }
  }

  /**
   * Process with tools (batch mode for Edit mode)
   */
  async processWithTools(
    messages: any[],
    _systemPrompt: string,
    tools: any[],
    documentContext: any,
    maxIterations?: number
  ): Promise<{ content?: string; toolUses?: any[] }> {
    // Note: _systemPrompt will be used when we integrate with the backend
    // For batch processing, collect all tool uses and content
    const toolUses: any[] = [];
    let content = "";
    
    await this.streamAgent(
      messages,
      documentContext,
      tools,
      (tool) => toolUses.push(tool),
      (text) => content += text,
      undefined,
      undefined,
      undefined,
      maxIterations
    );
    
    return { content, toolUses };
  }
}

// Export singleton instance
export const agentService = new AgentServiceClass();