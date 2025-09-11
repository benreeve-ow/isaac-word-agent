import { EventEmitter } from "node:events";
import { ToolCallT, ToolResultT } from "./schema";

class Bus extends EventEmitter {
  private waiters = new Map<string, (res: ToolResultT) => void>();
  
  emitCall(call: ToolCallT) { 
    this.emit("call", call); 
  }
  
  onResult(res: ToolResultT) {
    const w = this.waiters.get(res.id);
    if (w) { 
      w(res); 
      this.waiters.delete(res.id); 
    }
  }
  
  waitFor(id: string, timeoutMs = 60000) {
    return new Promise<ToolResultT>((resolve, reject) => {
      const to = setTimeout(() => { 
        this.waiters.delete(id); 
        reject(new Error("tool timeout")); 
      }, timeoutMs);
      
      this.waiters.set(id, (r) => { 
        clearTimeout(to); 
        resolve(r); 
      });
    });
  }
}

export const toolBus = new Bus();