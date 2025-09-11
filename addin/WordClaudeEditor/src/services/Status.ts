export interface StatusData {
  turnsTaken: number;
  lastOp?: string;
  lastTokenUsage?: number;
}

export class StatusService {
  private statusElement: HTMLElement | null = null;
  private currentStatus: StatusData = { turnsTaken: 0 };

  setStatusElement(element: HTMLElement) {
    this.statusElement = element;
    this.updateDisplay();
  }

  updateStatus(status: StatusData) {
    this.currentStatus = status;
    this.updateDisplay();
  }

  private updateDisplay() {
    if (!this.statusElement) return;
    
    const html = `
      <div class="status-panel">
        <div class="status-item">
          <span class="status-label">Turns:</span>
          <span class="status-value">${this.currentStatus.turnsTaken}</span>
        </div>
        ${this.currentStatus.lastOp ? `
        <div class="status-item">
          <span class="status-label">Last Op:</span>
          <span class="status-value">${this.currentStatus.lastOp}</span>
        </div>
        ` : ''}
        ${this.currentStatus.lastTokenUsage ? `
        <div class="status-item">
          <span class="status-label">Tokens:</span>
          <span class="status-value">${this.currentStatus.lastTokenUsage}</span>
        </div>
        ` : ''}
      </div>
    `;
    
    this.statusElement.innerHTML = html;
  }

  reset() {
    this.currentStatus = { turnsTaken: 0 };
    this.updateDisplay();
  }
}

export const statusService = new StatusService();