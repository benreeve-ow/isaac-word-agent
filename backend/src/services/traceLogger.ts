import fs from 'fs';
import path from 'path';

class TraceLogger {
  private traceDir: string;
  private currentTraceFile: string | null = null;
  private stream: fs.WriteStream | null = null;

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
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `trace-${sessionId || timestamp}.json`;
    this.currentTraceFile = path.join(this.traceDir, filename);
    
    // Start with an array
    fs.writeFileSync(this.currentTraceFile, '[\n');
    
    console.log(`📝 Trace logging to: ${this.currentTraceFile}`);
    return this.currentTraceFile;
  }

  log(entry: {
    timestamp: string;
    type: 'request' | 'response' | 'tool_call' | 'tool_result' | 'stream_chunk' | 'error';
    data: any;
  }) {
    if (!this.currentTraceFile) {
      this.startSession();
    }

    // Read current content
    const content = fs.readFileSync(this.currentTraceFile!, 'utf8');
    
    // Remove the closing bracket and any trailing whitespace
    const trimmed = content.replace(/\]\s*$/, '').replace(/\[\s*$/, '[');
    
    // Add comma if there's existing content
    const needsComma = trimmed !== '[';
    
    // Write back with new entry
    fs.writeFileSync(
      this.currentTraceFile!, 
      trimmed + (needsComma ? ',\n' : '') + JSON.stringify(entry, null, 2) + '\n]'
    );
  }

  logRequest(messages: any[], context?: any) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'request',
      data: {
        messages,
        context,
        messageCount: messages.length
      }
    });
  }

  logResponse(response: any) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'response',
      data: response
    });
  }

  logToolCall(toolName: string, args: any, toolCallId?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'tool_call',
      data: {
        toolName,
        args,
        toolCallId
      }
    });
  }

  logToolResult(toolName: string, result: any, toolCallId?: string) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'tool_result',
      data: {
        toolName,
        result,
        toolCallId
      }
    });
  }

  logStreamChunk(chunk: any) {
    this.log({
      timestamp: new Date().toISOString(),
      type: 'stream_chunk',
      data: chunk
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

  getTraceFile() {
    return this.currentTraceFile;
  }
}

export const traceLogger = new TraceLogger();