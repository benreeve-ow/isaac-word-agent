/**
 * Context Management Service
 * Handles document deduplication and context optimization
 */

import { countStringTokens } from "./tokenCount";

interface Message {
  role: string;
  content: any;
}

interface DocumentRead {
  messageIndex: number;
  timestamp: number;
  tokenCount: number;
  toolName: string;
}

export class ContextManager {
  private static instance: ContextManager;
  
  private constructor() {}
  
  static getInstance(): ContextManager {
    if (!this.instance) {
      this.instance = new ContextManager();
    }
    return this.instance;
  }
  
  /**
   * Process messages to remove redundant document reads
   * Keeps only the most recent document read and marks others as superseded
   */
  deduplicateDocumentReads(messages: Message[]): Message[] {
    const documentReads: DocumentRead[] = [];
    const processedMessages = [...messages];
    
    // First pass: identify all document read operations
    messages.forEach((msg, index) => {
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        msg.content.forEach((block: any) => {
          if (block.type === 'tool_use' && this.isDocumentReadTool(block.name)) {
            documentReads.push({
              messageIndex: index,
              timestamp: Date.now() - (messages.length - index) * 1000, // Estimate based on position
              tokenCount: 0, // Will calculate from response
              toolName: block.name
            });
          }
        });
      } else if (msg.role === 'user' && Array.isArray(msg.content)) {
        // Check for tool results from document reads
        msg.content.forEach((block: any) => {
          if (block.type === 'tool_result' && documentReads.length > 0) {
            // Find the corresponding read operation
            const lastRead = documentReads[documentReads.length - 1];
            if (lastRead.messageIndex === index - 1) {
              lastRead.tokenCount = countStringTokens(JSON.stringify(block.content));
            }
          }
        });
      }
    });
    
    // If we have multiple document reads, keep only the latest
    if (documentReads.length > 1) {
      console.log(`[ContextManager] Found ${documentReads.length} document reads, deduplicating...`);
      
      // Sort by timestamp (latest first)
      documentReads.sort((a, b) => b.timestamp - a.timestamp);
      
      // Keep the latest read, mark others for compression
      const latestRead = documentReads[0];
      const supersededReads = documentReads.slice(1);
      
      // Process messages to compress superseded reads
      supersededReads.forEach(read => {
        // Find the tool result message (usually the next message)
        const resultMsgIndex = read.messageIndex + 1;
        if (resultMsgIndex < processedMessages.length) {
          const resultMsg = processedMessages[resultMsgIndex];
          if (resultMsg.role === 'user' && Array.isArray(resultMsg.content)) {
            resultMsg.content = resultMsg.content.map((block: any) => {
              if (block.type === 'tool_result') {
                // Replace large document content with a summary
                return {
                  ...block,
                  content: `[Document read superseded by more recent read at message ${latestRead.messageIndex}]`,
                  is_superseded: true
                };
              }
              return block;
            });
          }
        }
      });
      
      const tokensRemoved = supersededReads.reduce((sum, read) => sum + read.tokenCount, 0);
      console.log(`[ContextManager] Deduplicated ${supersededReads.length} document reads, saved ~${tokensRemoved} tokens`);
    }
    
    return processedMessages;
  }
  
  /**
   * Check if a tool name is a document read operation
   */
  private isDocumentReadTool(toolName: string): boolean {
    const readTools = [
      'read_document',
      'read_unified_document',
      'doc.snapshot',
      'get_document_content',
      'read_selection'
    ];
    return readTools.includes(toolName);
  }
  
  /**
   * Analyze context usage and provide recommendations
   */
  analyzeContext(messages: Message[]): {
    totalTokens: number;
    documentReads: number;
    redundantReads: number;
    potentialSavings: number;
  } {
    let totalTokens = 0;
    let documentReads = 0;
    const readPositions: number[] = [];
    
    messages.forEach((msg, index) => {
      const content = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
      totalTokens += countStringTokens(content);
      
      if (msg.role === 'assistant' && Array.isArray(msg.content)) {
        msg.content.forEach((block: any) => {
          if (block.type === 'tool_use' && this.isDocumentReadTool(block.name)) {
            documentReads++;
            readPositions.push(index);
          }
        });
      }
    });
    
    // Calculate redundant reads (all but the latest)
    const redundantReads = Math.max(0, documentReads - 1);
    
    // Estimate savings (assume average document is 1500 tokens)
    const avgDocumentTokens = 1500;
    const potentialSavings = redundantReads * avgDocumentTokens;
    
    return {
      totalTokens,
      documentReads,
      redundantReads,
      potentialSavings
    };
  }
  
  /**
   * Create a document state summary for context preservation
   */
  createDocumentSummary(documentContent: string): string {
    // For now, return a simple truncated version
    // In the future, this could use AI to create a smart summary
    const maxLength = 500;
    if (documentContent.length <= maxLength) {
      return documentContent;
    }
    
    return `${documentContent.substring(0, maxLength)}...\n[Document truncated - ${documentContent.length} total characters]`;
  }
  
  /**
   * Optimize messages for Anthropic's prompt caching
   * Structures messages with stable prefix and variable suffix
   */
  optimizeForCaching(messages: Message[]): Message[] {
    // Sort messages to put stable content first
    // System messages and initial context should come first
    // Recent conversation and tool calls should come last
    
    const systemMessages = messages.filter(m => m.role === 'system');
    const otherMessages = messages.filter(m => m.role !== 'system');
    
    // Find the latest document read to put in stable section
    let latestDocumentRead: Message | null = null;
    let latestDocumentIndex = -1;
    
    otherMessages.forEach((msg, index) => {
      if (msg.role === 'user' && Array.isArray(msg.content)) {
        msg.content.forEach((block: any) => {
          if (block.type === 'tool_result' && block.content?.includes('paragraphCount')) {
            latestDocumentRead = msg;
            latestDocumentIndex = index;
          }
        });
      }
    });
    
    // Structure for optimal caching:
    // 1. System messages (stable)
    // 2. Latest document read (stable)
    // 3. Other messages (variable)
    const optimized: Message[] = [...systemMessages];
    
    if (latestDocumentRead) {
      optimized.push(latestDocumentRead);
      otherMessages.splice(latestDocumentIndex, 1);
    }
    
    optimized.push(...otherMessages);
    
    return optimized;
  }
}

export const contextManager = ContextManager.getInstance();