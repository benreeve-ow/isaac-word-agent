import * as React from "react";
import { useState, useEffect, useRef } from "react";
import { makeStyles, tokens, Button, Text } from "@fluentui/react-components";
import { DismissRegular, CopyRegular } from "@fluentui/react-icons";

const useStyles = makeStyles({
  container: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    height: "200px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderTop: `2px solid ${tokens.colorNeutralStroke1}`,
    display: "flex",
    flexDirection: "column",
    zIndex: 1000,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  logContainer: {
    flex: 1,
    overflowY: "auto",
    padding: "8px",
    fontFamily: "Consolas, monospace",
    fontSize: "11px",
  },
  logEntry: {
    marginBottom: "4px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
  errorLog: {
    color: tokens.colorPaletteRedForeground1,
  },
  successLog: {
    color: tokens.colorPaletteGreenForeground1,
  },
  infoLog: {
    color: tokens.colorNeutralForeground1,
  },
});

interface LogEntry {
  timestamp: string;
  message: string;
  type: "info" | "error" | "success";
}

export const DebugPanel: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const styles = useStyles();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Intercept console methods
    const originalLog = console.log;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Skip mergeClasses warnings
      if (message.includes('mergeClasses()')) {
        return;
      }
      
      if (message.includes('SUCCESS') || message.includes('Tool.*completed')) {
        addLog(message, 'success');
      } else {
        addLog(message, 'info');
      }
    };

    console.error = (...args) => {
      originalError(...args);
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      // Skip mergeClasses warnings and React warnings
      if (message.includes('mergeClasses()') || message.includes('Cannot update a component')) {
        return;
      }
      
      addLog(message, 'error');
    };

    // Restore on unmount
    return () => {
      console.log = originalLog;
      console.error = originalError;
    };
  }, []);

  const addLog = (message: string, type: LogEntry['type']) => {
    const timestamp = new Date().toISOString().substr(11, 8);
    setLogs(prev => [...prev, { timestamp, message, type }]);
    
    // Auto-scroll to bottom
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
      }
    }, 10);
  };

  const clearLogs = () => setLogs([]);

  const copyLogs = async () => {
    const text = logs.map(log => `${log.timestamp} [${log.type}] ${log.message}`).join('\n');
    await navigator.clipboard.writeText(text);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <Text weight="semibold">Debug Console</Text>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button size="small" icon={<CopyRegular />} onClick={copyLogs}>
            Copy
          </Button>
          <Button size="small" onClick={clearLogs}>
            Clear
          </Button>
          <Button size="small" icon={<DismissRegular />} onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
      <div className={styles.logContainer} ref={logContainerRef}>
        {logs.map((log, index) => (
          <div
            key={index}
            className={`${styles.logEntry} ${
              log.type === 'error' ? styles.errorLog :
              log.type === 'success' ? styles.successLog :
              styles.infoLog
            }`}
          >
            {log.timestamp} - {log.message}
          </div>
        ))}
        {logs.length === 0 && (
          <Text size={200} style={{ color: tokens.colorNeutralForeground3 }}>
            Console output will appear here...
          </Text>
        )}
      </div>
    </div>
  );
};