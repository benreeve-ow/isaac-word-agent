import fs from 'fs';
import path from 'path';
import { wordAgent } from '../mastra/agent.word';

interface TraceEntry {
  timestamp: string;
  type: 'session_start' | 'context_window' | 'request' | 'response' | 'tool_call' | 'tool_result' | 
        'stream_chunk' | 'text_delta' | 'error' | 'memory_state';
  data: any;
  metadata?: {
    tokenCount?: number;
    sequenceNumber?: number;
    parentId?: string;
  };
}

class ImprovedTraceLogger {
  private traceDir: string;
  private currentTraceFile: string | null = null;
  private sequenceNumber: number = 0;
  private sessionData: {
    sessionId: string;
    startTime: string;
    tools: string[];
    memoryState?: any;
  } | null = null;

  constructor() {
    this.traceDir = path.join(process.cwd(), 'traces');
    this.ensureTraceDir();
  }

  private ensureTraceDir() {
    if (!fs.existsSync(this.traceDir)) {
      fs.mkdirSync(this.traceDir, { recursive: true });
    }
  }

  startSession(sessionId?: string) {
    const timestamp = new Date().toISOString();
    const filename = `trace-${sessionId || timestamp.replace(/[:.]/g, '-')}.json`;
    this.currentTraceFile = path.join(this.traceDir, filename);
    this.sequenceNumber = 0;
    
    this.sessionData = {
      sessionId: sessionId || timestamp,
      startTime: timestamp,
      tools: []
    };

    // Create structured trace file
    const initialStructure = {
      session: this.sessionData,
      entries: []
    };
    
    fs.writeFileSync(this.currentTraceFile, JSON.stringify(initialStructure, null, 2));
    
    // Log session start
    this.log({
      timestamp,
      type: 'session_start',
      data: {
        sessionId: this.sessionData.sessionId,
        agent: 'WordAgent',
        model: process.env.MODEL || 'claude-sonnet-4-20250514'
      }
    });
    
    console.log(`📝 Trace logging to: ${this.currentTraceFile}`);
    return this.currentTraceFile;
  }

  log(entry: TraceEntry) {
    if (!this.currentTraceFile) {
      this.startSession();
    }

    // Add sequence number
    entry.metadata = {
      ...entry.metadata,
      sequenceNumber: this.sequenceNumber++
    };

    // Read current content
    const content = JSON.parse(fs.readFileSync(this.currentTraceFile!, 'utf8'));
    
    // Add entry
    content.entries.push(entry);
    
    // Update session tools if this is a tool call
    if (entry.type === 'tool_call' && entry.data.toolName) {
      if (!content.session.tools.includes(entry.data.toolName)) {
        content.session.tools.push(entry.data.toolName);
      }
    }
    
    // Write back
    fs.writeFileSync(this.currentTraceFile!, JSON.stringify(content, null, 2));
  }

  /**
   * Log the exact context window that will be sent to the model
   */
  logContextWindow(messages: any[], tools: any[], systemPrompt?: string) {
    const contextWindow = {
      systemPrompt: systemPrompt || '[Using default from file]',
      messages: messages.map((msg, idx) => ({
        index: idx,
        role: msg.role,
        content: typeof msg.content === 'string' 
          ? msg.content.substring(0, 500) + (msg.content.length > 500 ? '...' : '')
          : msg.content,
        fullLength: typeof msg.content === 'string' ? msg.content.length : 0
      })),
      tools: tools.map(t => ({
        name: t.name || t.id,
        description: t.description?.substring(0, 100) + '...'
      })),
      totalMessages: messages.length,
      totalTools: tools.length
    };

    this.log({
      timestamp: new Date().toISOString(),
      type: 'context_window',
      data: contextWindow,
      metadata: {
        tokenCount: this.estimateTokens(messages)
      }
    });
  }

  logRequest(messages: any[], context?: any) {
    // Log available tools
    const tools = wordAgent.tools ? Object.keys(wordAgent.tools) : [];
    
    this.log({
      timestamp: new Date().toISOString(),
      type: 'request',
      data: {
        messages: messages.map(m => ({
          role: m.role,
          contentPreview: typeof m.content === 'string' 
            ? m.content.substring(0, 200) + (m.content.length > 200 ? '...' : '')
            : '[Complex content]',
          contentLength: typeof m.content === 'string' ? m.content.length : 0
        })),
        context: context ? {
          hasDocumentContext: !!context.documentContext,
          mode: context.mode,
          toolsProvided: context.tools?.length || 0
        } : null,
        availableTools: tools
      }
    });

    // Log the actual context window
    if (context?.tools) {
      this.logContextWindow(messages, context.tools);
    }
  }

  logMemoryState() {
    try {
      // Get memory state if available
      const memory = wordAgent.memory;
      if (memory) {
        this.log({
          timestamp: new Date().toISOString(),
          type: 'memory_state',
          data: {
            hasMemory: true,
            // Add any accessible memory state here
          }
        });
      }
    } catch (error) {
      // Ignore errors accessing memory
    }
  }

  logTextDelta(text: string) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'text_delta',
      data: {
        text: text.substring(0, 100),
        length: text.length,
        preview: text.length > 100 ? text.substring(0, 100) + '...' : text
      }
    });
  }

  logStreamChunk(chunk: any) {
    // Only log non-text chunks (text deltas are logged separately)
    if (chunk.type !== 'text-delta') {
      this.log({
        timestamp: new Date().toISOString(),
        type: 'stream_chunk',
        data: {
          chunkType: chunk.type,
          payload: chunk.payload ? {
            ...chunk.payload,
            // Truncate large payloads
            textDelta: chunk.payload.textDelta?.substring(0, 100)
          } : null
        }
      });
    }
  }

  logToolCall(toolName: string, args: any, toolCallId?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'tool_call',
      data: {
        toolName,
        args,
        toolCallId
      },
      metadata: {
        parentId: toolCallId
      }
    });
  }

  logToolResult(toolName: string, result: any, toolCallId?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'tool_result',
      data: {
        toolName,
        success: result?.success || false,
        resultPreview: result ? {
          success: result.success,
          message: result.message?.substring(0, 200),
          hasData: !!result.data,
          error: result.error
        } : null,
        toolCallId
      },
      metadata: {
        parentId: toolCallId
      }
    });
  }

  logResponse(response: any) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'response',
      data: {
        type: response.type || 'complete',
        hasContent: !!response.content,
        contentLength: response.content?.length || 0,
        toolCalls: response.toolCalls?.length || 0
      }
    });
  }

  logError(error: any, context?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'error',
      data: {
        error: error.message || error,
        stack: error.stack,
        context
      }
    });
  }

  private estimateTokens(messages: any[]): number {
    // Rough estimate: 1 token ≈ 4 characters
    let charCount = 0;
    for (const msg of messages) {
      if (typeof msg.content === 'string') {
        charCount += msg.content.length;
      }
    }
    return Math.ceil(charCount / 4);
  }

  getTraceFile() {
    return this.currentTraceFile;
  }

  /**
   * Create a summary of the trace for easier reading
   */
  createSummary(): string {
    if (!this.currentTraceFile) return 'No active trace session';
    
    const content = JSON.parse(fs.readFileSync(this.currentTraceFile!, 'utf8'));
    const summary = {
      sessionId: content.session.sessionId,
      duration: new Date().getTime() - new Date(content.session.startTime).getTime(),
      totalEntries: content.entries.length,
      toolsUsed: content.session.tools,
      toolCalls: content.entries.filter((e: any) => e.type === 'tool_call').length,
      errors: content.entries.filter((e: any) => e.type === 'error').length,
      textDeltas: content.entries.filter((e: any) => e.type === 'text_delta').length
    };
    
    const summaryFile = this.currentTraceFile.replace('.json', '-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
    
    return summaryFile;
  }
}

export const improvedTraceLogger = new ImprovedTraceLogger();