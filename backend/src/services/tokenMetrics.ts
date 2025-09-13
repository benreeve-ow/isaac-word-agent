/**
 * Token Metrics Service
 * Tracks and analyzes token usage patterns for optimization
 */

import { countStringTokens, formatTokenCount } from "./tokenCount";

interface OperationMetrics {
  operationType: string;
  toolName?: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: number;
  duration?: number;
  success: boolean;
}

interface SessionMetrics {
  sessionId: string;
  startTime: number;
  operations: OperationMetrics[];
  totalInputTokens: number;
  totalOutputTokens: number;
  peakTokenUsage: number;
  contextResets: number;
}

class TokenMetricsService {
  private sessions: Map<string, SessionMetrics> = new Map();
  private operationHistory: OperationMetrics[] = [];
  private readonly maxHistorySize = 1000;

  /**
   * Start tracking a new session
   */
  startSession(sessionId: string): void {
    this.sessions.set(sessionId, {
      sessionId,
      startTime: Date.now(),
      operations: [],
      totalInputTokens: 0,
      totalOutputTokens: 0,
      peakTokenUsage: 0,
      contextResets: 0
    });
  }

  /**
   * Record an operation's token usage
   */
  recordOperation(
    sessionId: string,
    operation: Omit<OperationMetrics, 'timestamp'>
  ): void {
    const metrics: OperationMetrics = {
      ...operation,
      timestamp: Date.now()
    };

    // Add to global history
    this.operationHistory.push(metrics);
    if (this.operationHistory.length > this.maxHistorySize) {
      this.operationHistory.shift();
    }

    // Add to session if exists
    const session = this.sessions.get(sessionId);
    if (session) {
      session.operations.push(metrics);
      session.totalInputTokens += metrics.inputTokens;
      session.totalOutputTokens += metrics.outputTokens;
      
      const currentTotal = session.totalInputTokens + session.totalOutputTokens;
      if (currentTotal > session.peakTokenUsage) {
        session.peakTokenUsage = currentTotal;
      }
    }

    // Log if in debug mode
    if (process.env.DEBUG) {
      this.logOperation(metrics);
    }
  }

  /**
   * Record a context reset event
   */
  recordContextReset(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.contextResets++;
      console.log(`[Token Metrics] Context reset #${session.contextResets} for session ${sessionId}`);
    }
  }

  /**
   * Get metrics for a specific session
   */
  getSessionMetrics(sessionId: string): SessionMetrics | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get aggregated metrics by operation type
   */
  getOperationTypeMetrics(): Map<string, {
    count: number;
    avgInput: number;
    avgOutput: number;
    totalTokens: number;
  }> {
    const metrics = new Map();

    for (const op of this.operationHistory) {
      const key = op.operationType + (op.toolName ? `:${op.toolName}` : '');
      
      if (!metrics.has(key)) {
        metrics.set(key, {
          count: 0,
          totalInput: 0,
          totalOutput: 0,
          totalTokens: 0
        });
      }

      const stat = metrics.get(key);
      stat.count++;
      stat.totalInput += op.inputTokens;
      stat.totalOutput += op.outputTokens;
      stat.totalTokens += op.inputTokens + op.outputTokens;
    }

    // Calculate averages
    for (const [key, stat] of metrics.entries()) {
      metrics.set(key, {
        count: stat.count,
        avgInput: Math.round(stat.totalInput / stat.count),
        avgOutput: Math.round(stat.totalOutput / stat.count),
        totalTokens: stat.totalTokens
      });
    }

    return metrics;
  }

  /**
   * Get top token-consuming operations
   */
  getTopConsumers(limit: number = 10): OperationMetrics[] {
    return [...this.operationHistory]
      .sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens))
      .slice(0, limit);
  }

  /**
   * Generate a usage report
   */
  generateReport(): string {
    const typeMetrics = this.getOperationTypeMetrics();
    const topConsumers = this.getTopConsumers(5);
    
    let report = '\n========== Token Usage Report ==========\n\n';
    
    // Summary
    const totalOps = this.operationHistory.length;
    const totalTokens = this.operationHistory.reduce(
      (sum, op) => sum + op.inputTokens + op.outputTokens, 0
    );
    
    report += `Total Operations: ${totalOps}\n`;
    report += `Total Tokens Used: ${formatTokenCount(totalTokens)}\n`;
    report += `Average per Operation: ${formatTokenCount(Math.round(totalTokens / totalOps))}\n\n`;
    
    // By operation type
    report += '--- Usage by Operation Type ---\n';
    const sortedTypes = [...typeMetrics.entries()]
      .sort((a, b) => b[1].totalTokens - a[1].totalTokens);
    
    for (const [type, stats] of sortedTypes) {
      report += `${type}:\n`;
      report += `  Count: ${stats.count}\n`;
      report += `  Avg Input: ${formatTokenCount(stats.avgInput)}\n`;
      report += `  Avg Output: ${formatTokenCount(stats.avgOutput)}\n`;
      report += `  Total: ${formatTokenCount(stats.totalTokens)}\n`;
    }
    
    // Top consumers
    report += '\n--- Top Token Consumers ---\n';
    for (const op of topConsumers) {
      const total = op.inputTokens + op.outputTokens;
      report += `${op.operationType}${op.toolName ? ':' + op.toolName : ''}: ${formatTokenCount(total)}\n`;
    }
    
    // Active sessions
    report += '\n--- Active Sessions ---\n';
    for (const session of this.sessions.values()) {
      const duration = (Date.now() - session.startTime) / 1000 / 60; // minutes
      report += `Session ${session.sessionId}:\n`;
      report += `  Duration: ${duration.toFixed(1)} min\n`;
      report += `  Operations: ${session.operations.length}\n`;
      report += `  Total Tokens: ${formatTokenCount(session.totalInputTokens + session.totalOutputTokens)}\n`;
      report += `  Context Resets: ${session.contextResets}\n`;
    }
    
    report += '\n========================================\n';
    
    return report;
  }

  /**
   * Log a single operation
   */
  private logOperation(metrics: OperationMetrics): void {
    const total = metrics.inputTokens + metrics.outputTokens;
    console.log(
      `[Token Op] ${metrics.operationType}${metrics.toolName ? ':' + metrics.toolName : ''} - ` +
      `In: ${formatTokenCount(metrics.inputTokens)}, ` +
      `Out: ${formatTokenCount(metrics.outputTokens)}, ` +
      `Total: ${formatTokenCount(total)}`
    );
  }

  /**
   * Clean up old sessions
   */
  cleanupOldSessions(maxAgeMs: number = 3600000): void { // 1 hour default
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.startTime > maxAgeMs) {
        this.sessions.delete(id);
      }
    }
  }
}

// Export singleton instance
export const tokenMetrics = new TokenMetricsService();

// Clean up old sessions periodically
setInterval(() => {
  tokenMetrics.cleanupOldSessions();
}, 600000); // Every 10 minutes