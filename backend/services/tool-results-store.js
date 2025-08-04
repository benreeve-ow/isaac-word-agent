/**
 * Simple in-memory store for tool execution results
 * This allows the frontend to send tool results back to the backend
 * during an active agent session
 */
class ToolResultsStore {
  constructor() {
    this.results = new Map();
    
    // Clean up old results every 5 minutes
    setInterval(() => {
      const now = Date.now();
      for (const [id, data] of this.results.entries()) {
        if (now - data.timestamp > 5 * 60 * 1000) {
          this.results.delete(id);
        }
      }
    }, 5 * 60 * 1000);
  }
  
  store(toolUseId, result) {
    this.results.set(toolUseId, {
      result,
      timestamp: Date.now()
    });
  }
  
  retrieve(toolUseId) {
    const data = this.results.get(toolUseId);
    if (data) {
      this.results.delete(toolUseId); // Remove after retrieval
      return data.result;
    }
    return null;
  }
  
  has(toolUseId) {
    return this.results.has(toolUseId);
  }
}

module.exports = new ToolResultsStore();