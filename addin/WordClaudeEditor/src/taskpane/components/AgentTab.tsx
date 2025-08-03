import * as React from "react";
import { useState, useEffect, useRef } from "react";
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Textarea,
  Field,
  Spinner,
  Badge,
  Card,
} from "@fluentui/react-components";
import {
  PlayRegular,
  StopRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  SearchRegular,
  EditRegular,
  DocumentRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  CopyRegular,
} from "@fluentui/react-icons";
import { agentService, ToolUse } from "../../services/AgentService";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#ffffff",
  },
  inputSection: {
    padding: "12px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  promptInput: {
    "& textarea": {
      fontSize: "12px",
      fontFamily: tokens.fontFamilyBase,
    },
  },
  actionBar: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  actionButton: {
    fontSize: "12px",
    height: "32px",
    paddingLeft: "12px",
    paddingRight: "12px",
  },
  primaryButton: {
    backgroundColor: "#1a1a1a",
    color: "#ffffff",
    "&:hover": {
      backgroundColor: "#2d2d2d",
    },
  },
  outputSection: {
    flex: 1,
    overflowY: "auto",
    padding: "12px",
  },
  toolCard: {
    marginBottom: "8px",
    padding: "8px",
    backgroundColor: "#fafafa",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  toolHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
    cursor: "pointer",
    userSelect: "none",
  },
  toolName: {
    fontSize: "11px",
    fontWeight: "600",
    color: tokens.colorNeutralForeground1,
  },
  toolInput: {
    fontSize: "10px",
    fontFamily: tokens.fontFamilyMonospace,
    backgroundColor: "#ffffff",
    padding: "4px",
    borderRadius: "2px",
    whiteSpace: "pre-wrap",
    maxHeight: "100px",
    overflowY: "auto",
  },
  toolResult: {
    fontSize: "10px",
    marginTop: "4px",
    padding: "4px",
    borderRadius: "2px",
  },
  successResult: {
    backgroundColor: "#f0f9ff",
    color: "#0969da",
  },
  errorResult: {
    backgroundColor: "#fff5f5",
    color: "#d73a49",
  },
  messageText: {
    fontSize: "12px",
    lineHeight: "1.5",
    marginBottom: "8px",
  },
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "#fafafa",
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    fontSize: "11px",
  },
  summaryCard: {
    padding: "12px",
    backgroundColor: "#f0f9ff",
    border: `1px solid #0969da`,
    marginTop: "12px",
  },
  summaryTitle: {
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "8px",
    color: "#0969da",
  },
  summaryText: {
    fontSize: "12px",
    lineHeight: "1.5",
  },
  debugSection: {
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: "#fafafa",
    marginTop: "auto",
  },
  debugHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    cursor: "pointer",
    userSelect: "none",
    "&:hover": {
      backgroundColor: "#f0f0f0",
    },
  },
  debugContent: {
    maxHeight: "200px",
    overflowY: "auto",
    padding: "8px 12px",
    backgroundColor: "#1a1a1a",
    color: "#00ff00",
    fontSize: "10px",
    fontFamily: tokens.fontFamilyMonospace,
  },
  debugLog: {
    marginBottom: "2px",
    opacity: 0.9,
  },
  copyButton: {
    position: "absolute" as const,
    top: "8px",
    right: "8px",
    padding: "4px 8px",
    fontSize: "11px",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: "4px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    transition: "all 0.2s ease",
    zIndex: 10,
    "&:hover": {
      backgroundColor: "#ffffff",
      boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    },
  },
  sectionWithCopy: {
    position: "relative" as const,
  },
});

const AgentTab: React.FC = () => {
  const styles = useStyles();
  const [userPrompt, setUserPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<any[]>([]);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [showOutputCopy, setShowOutputCopy] = useState(false);
  const [showDebugCopy, setShowDebugCopy] = useState(false);
  const [copiedOutput, setCopiedOutput] = useState(false);
  const [copiedDebug, setCopiedDebug] = useState(false);
  const [expandedTools, setExpandedTools] = useState<Set<number>>(new Set());
  const outputEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    outputEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    });
    setDebugLog(prev => [...prev.slice(-100), `[${timestamp}] ${message}`]);
  };

  const copyOutputToClipboard = () => {
    // Collect all output text
    let outputText = "";
    
    output.forEach((item) => {
      if (item.type === "content") {
        outputText += item.text + "\n\n";
      } else if (item.type === "tool") {
        outputText += `Tool: ${item.name}\n`;
        outputText += `Input: ${JSON.stringify(item.input, null, 2)}\n`;
        if (item.result) {
          outputText += `Result: ${item.result.message || item.result.error || JSON.stringify(item.result)}\n`;
        }
        outputText += "\n";
      } else if (item.type === "summary") {
        outputText += "=== Editing Complete ===\n";
        outputText += item.text + "\n";
        if (item.confidence) {
          outputText += `Confidence: ${item.confidence}\n`;
        }
      }
    });
    
    navigator.clipboard.writeText(outputText.trim());
    setCopiedOutput(true);
    setTimeout(() => setCopiedOutput(false), 2000);
  };

  const copyDebugToClipboard = () => {
    const debugText = debugLog.join("\n");
    navigator.clipboard.writeText(debugText);
    setCopiedDebug(true);
    setTimeout(() => setCopiedDebug(false), 2000);
  };

  const toggleToolExpanded = (index: number) => {
    setExpandedTools(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Helper function to format markdown-like text to JSX
  const formatSummaryText = (text: string): React.ReactNode => {
    if (!text) return null;
    
    // Split by double newlines to get paragraphs
    const paragraphs = text.split(/\n\n+/);
    
    return paragraphs.map((paragraph, pIndex) => {
      // Check if it's a numbered list item
      const listMatch = paragraph.match(/^(\d+\.)\s+(.*)/);
      if (listMatch) {
        // Process list items
        const listItems = paragraph.split(/\n(?=\d+\.)/);
        return (
          <ul key={pIndex} style={{ marginBottom: "8px", paddingLeft: "20px", listStyle: "decimal" }}>
            {listItems.map((item, iIndex) => {
              const itemMatch = item.match(/^\d+\.\s+(.*)/);
              if (itemMatch) {
                // Process markdown formatting within the list item
                let formattedText = itemMatch[1];
                // Bold text
                formattedText = formattedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
                // Remove single asterisks (italics) for now, or convert them
                formattedText = formattedText.replace(/\*([^*]+)\*/g, '<em>$1</em>');
                
                return (
                  <li 
                    key={iIndex} 
                    style={{ marginBottom: "4px", fontSize: "12px" }}
                    dangerouslySetInnerHTML={{ __html: formattedText }}
                  />
                );
              }
              return null;
            })}
          </ul>
        );
      }
      
      // Process regular paragraph
      let formattedParagraph = paragraph;
      // Bold text
      formattedParagraph = formattedParagraph.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Italic text  
      formattedParagraph = formattedParagraph.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      // Handle line breaks within paragraphs
      formattedParagraph = formattedParagraph.replace(/\n/g, '<br />');
      
      return (
        <p 
          key={pIndex} 
          style={{ marginBottom: "8px", fontSize: "12px", lineHeight: "1.5" }}
          dangerouslySetInnerHTML={{ __html: formattedParagraph }}
        />
      );
    });
  };

  const getToolIcon = (toolName: string) => {
    switch (toolName) {
      case "search_document":
        return <SearchRegular fontSize={14} />;
      case "edit_content":
      case "insert_content":
        return <EditRegular fontSize={14} />;
      case "analyze_structure":
        return <DocumentRegular fontSize={14} />;
      default:
        return <CheckmarkCircleRegular fontSize={14} />;
    }
  };

  const handleRunAgent = async () => {
    addDebugLog("Starting agent execution...");
    
    if (!userPrompt.trim()) {
      setError("Please enter instructions for the agent");
      addDebugLog("ERROR: No instructions provided");
      return;
    }

    setIsRunning(true);
    setError(null);
    setOutput([]);
    setStatus("Getting document context...");
    addDebugLog(`User prompt: ${userPrompt}`);

    try {
      // First check backend health
      addDebugLog("Checking backend server health...");
      const healthCheck = await agentService.checkBackendHealth();
      if (!healthCheck.healthy) {
        const errorMsg = healthCheck.error || "Backend server is not responding";
        addDebugLog(`ERROR: Backend health check failed - ${errorMsg}`);
        setError(`Backend Connection Failed:\n${errorMsg}\n\nPlease ensure:\n1. Run 'npm start' in the backend folder\n2. Accept the HTTPS certificate warning\n3. Check that port 3000 is not in use`);
        setStatus("Backend offline");
        return;
      }
      addDebugLog("Backend server is healthy");
      
      // Get document context
      addDebugLog("Getting document context from Word...");
      let documentContext: string;
      try {
        documentContext = await agentService.getDocumentContext();
        addDebugLog(`Document context retrieved: ${documentContext.length} characters`);
      } catch (docError) {
        const errorMsg = docError instanceof Error ? docError.message : "Failed to get document context";
        addDebugLog(`ERROR getting document: ${errorMsg}`);
        setError(errorMsg);
        setStatus("Failed");
        return;
      }
      
      setStatus("Connecting to Claude API...");
      addDebugLog("Starting to stream agent response...");
      
      let stream;
      try {
        stream = agentService.streamAgentResponse(userPrompt, documentContext);
      } catch (streamError) {
        const errorMsg = streamError instanceof Error ? streamError.message : "Failed to connect to backend";
        addDebugLog(`ERROR creating stream: ${errorMsg}`);
        setError(errorMsg);
        setStatus("Connection failed");
        return;
      }
      
      setStatus("Agent is working...");
      
      let currentMessage = "";
      
      for await (const message of stream) {
        addDebugLog(`Received message type: ${message.type}`);
        
        switch (message.type) {
          case "content":
            currentMessage += message.data.content;
            addDebugLog(`Content chunk received: ${message.data.content.length} chars`);
            // Update or add content message
            setOutput(prev => {
              const lastItem = prev[prev.length - 1];
              if (lastItem?.type === "content") {
                return [...prev.slice(0, -1), { type: "content", text: currentMessage }];
              } else {
                return [...prev, { type: "content", text: currentMessage }];
              }
            });
            break;

          case "tool_use":
            addDebugLog(`Tool use: ${message.data.name}`);
            addDebugLog(`Tool input: ${JSON.stringify(message.data.input)}`);
            setStatus(`Executing: ${message.data.name}`);
            
            if (message.data.result) {
              addDebugLog(`Tool result: ${JSON.stringify(message.data.result)}`);
            }
            
            setOutput(prev => [...prev, {
              type: "tool",
              name: message.data.name,
              input: message.data.input,
              result: message.data.result,
            }]);
            currentMessage = ""; // Reset content accumulator
            break;

          case "complete":
            addDebugLog("Agent execution complete");
            setStatus("Agent finished");
            if (message.data.summary) {
              addDebugLog(`Summary: ${message.data.summary}`);
              setOutput(prev => [...prev, {
                type: "summary",
                text: message.data.summary,
                confidence: message.data.confidence,
              }]);
            }
            break;

          case "error":
            addDebugLog(`ERROR: ${message.data.error}`);
            setError(message.data.error);
            setStatus("Error occurred");
            break;
            
          default:
            addDebugLog(`Unknown message type: ${message.type}`);
        }
      }
      
      addDebugLog("Stream ended");
    } catch (err) {
      console.error("Agent error:", err);
      let errorMsg = "Agent execution failed";
      
      if (err instanceof Error) {
        errorMsg = err.message;
        
        // Provide more user-friendly error messages
        if (err.message.includes('Failed to fetch') || err.message.includes('Cannot connect')) {
          errorMsg = "Cannot connect to backend server. Please ensure:\n• Backend is running (npm start in backend folder)\n• You've accepted the HTTPS certificate\n• The server is on port 3000";
        } else if (err.message.includes('Load failed')) {
          errorMsg = "Failed to load response from server. Please check:\n• Your internet connection\n• Backend server logs for errors\n• Anthropic API key is set correctly";
        }
      }
      
      addDebugLog(`ERROR: ${errorMsg}`);
      setError(errorMsg);
      setStatus("Failed");
    } finally {
      setIsRunning(false);
      if (!error && status !== "Failed") {
        setStatus("Ready");
        addDebugLog("Agent ready for next task");
      }
    }
  };

  const handleStop = () => {
    // In a real implementation, this would cancel the stream
    setIsRunning(false);
    setStatus("Stopped by user");
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputSection}>
        <Field size="small">
          <Textarea
            className={styles.promptInput}
            value={userPrompt}
            onChange={(_, data) => setUserPrompt(data.value)}
            placeholder="Tell the agent what you want to do (e.g., 'Fix all grammar errors', 'Make the introduction more engaging', 'Add a conclusion paragraph')"
            rows={3}
            disabled={isRunning}
          />
        </Field>

        <div className={styles.actionBar}>
          {!isRunning ? (
            <Button
              className={`${styles.actionButton} ${styles.primaryButton}`}
              icon={<PlayRegular />}
              onClick={handleRunAgent}
              appearance="primary"
            >
              Run Agent
            </Button>
          ) : (
            <Button
              className={styles.actionButton}
              icon={<StopRegular />}
              onClick={handleStop}
              appearance="secondary"
            >
              Stop
            </Button>
          )}
          
          {isRunning && <Spinner size="tiny" label={status} />}
        </div>

        {error && (
          <div style={{ 
            marginTop: "8px", 
            padding: "12px", 
            backgroundColor: "#fff5f5", 
            borderRadius: "4px",
            border: "1px solid #ffdddd"
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
              <ErrorCircleRegular fontSize={16} style={{ color: "#d73a49", marginTop: "2px" }} />
              <div style={{ flex: 1 }}>
                <Text size={200} style={{ 
                  color: "#d73a49", 
                  fontWeight: "600",
                  display: "block",
                  marginBottom: "4px"
                }}>
                  Error
                </Text>
                <Text size={100} style={{ 
                  color: "#666",
                  whiteSpace: "pre-wrap",
                  lineHeight: "1.4"
                }}>
                  {error}
                </Text>
              </div>
            </div>
          </div>
        )}
      </div>

      <div 
        className={`${styles.outputSection} ${styles.sectionWithCopy}`}
        onMouseEnter={() => setShowOutputCopy(true)}
        onMouseLeave={() => setShowOutputCopy(false)}
      >
        {showOutputCopy && output.length > 0 && (
          <button
            className={styles.copyButton}
            onClick={copyOutputToClipboard}
            title="Copy agent output"
          >
            <CopyRegular fontSize={12} />
            <span>{copiedOutput ? "Copied!" : "Copy"}</span>
          </button>
        )}
        {output.map((item, index) => {
          if (item.type === "content") {
            return (
              <div key={index} className={styles.messageText}>
                {formatSummaryText(item.text)}
              </div>
            );
          }

          if (item.type === "tool") {
            const isExpanded = expandedTools.has(index);
            return (
              <div key={index} className={styles.toolCard}>
                <div className={styles.toolHeader} onClick={() => toggleToolExpanded(index)}>
                  {isExpanded ? <ChevronDownRegular fontSize={12} /> : <ChevronRightRegular fontSize={12} />}
                  {getToolIcon(item.name)}
                  <Text className={styles.toolName}>{item.name}</Text>
                  {item.name === "search_document" ? (
                    item.result?.data && Array.isArray(item.result.data) && item.result.data.length > 0 ? (
                      <Badge size="small" appearance="tint" color="success">
                        {item.result.data.length} match{item.result.data.length > 1 ? "es" : ""}
                      </Badge>
                    ) : (
                      <Badge size="small" appearance="tint" color="warning">
                        No matches
                      </Badge>
                    )
                  ) : item.name === "read_full_document" && item.result?.success ? (
                    <Badge size="small" appearance="tint" color="informative">
                      {item.result.data?.metadata?.wordCount || 0} words
                    </Badge>
                  ) : item.result?.success ? (
                    <Badge size="small" appearance="tint" color="success">
                      Success
                    </Badge>
                  ) : (
                    <Badge size="small" appearance="tint" color="danger">
                      Failed
                    </Badge>
                  )}
                </div>
                
                {isExpanded && (
                  <>
                    <div className={styles.toolInput}>
                      {JSON.stringify(item.input, null, 2)}
                    </div>
                    
                    {item.result && (
                      <div className={`${styles.toolResult} ${
                        item.name === "search_document" && Array.isArray(item.result) ? 
                          (item.result.length > 0 ? styles.successResult : styles.errorResult) :
                          (item.result.success ? styles.successResult : styles.errorResult)
                      }`}>
                        {item.name === "search_document" && Array.isArray(item.result) ?
                          (item.result.length > 0 ? 
                            JSON.stringify(item.result, null, 2) : 
                            "No matches found") :
                          (item.result.message || item.result.error || JSON.stringify(item.result))
                        }
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          }

          if (item.type === "summary") {
            return (
              <div key={index} className={styles.summaryCard}>
                <Text className={styles.summaryTitle}>
                  <CheckmarkCircleRegular /> Editing Complete
                </Text>
                <div className={styles.summaryText}>
                  {formatSummaryText(item.text)}
                </div>
                {item.confidence && (
                  <Badge 
                    size="small" 
                    appearance="filled" 
                    color={item.confidence === "high" ? "success" : "warning"}
                    style={{ marginTop: "8px" }}
                  >
                    Confidence: {item.confidence}
                  </Badge>
                )}
              </div>
            );
          }

          return null;
        })}
        <div ref={outputEndRef} />
      </div>

      {!isRunning && status && status !== "Ready" && (
        <div className={styles.statusBar}>
          <Text>{status}</Text>
        </div>
      )}

      <div className={styles.debugSection}>
        <div 
          className={styles.debugHeader}
          onClick={() => setDebugExpanded(!debugExpanded)}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            {debugExpanded ? <ChevronDownRegular fontSize={12} /> : <ChevronRightRegular fontSize={12} />}
            <Text size={100}>Debug Console</Text>
          </div>
          <Text size={100} style={{ color: tokens.colorNeutralForeground4 }}>
            {debugLog.length} logs
          </Text>
        </div>
        
        {debugExpanded && (
          <div 
            className={`${styles.debugContent} ${styles.sectionWithCopy}`}
            onMouseEnter={() => setShowDebugCopy(true)}
            onMouseLeave={() => setShowDebugCopy(false)}
          >
            {showDebugCopy && debugLog.length > 0 && (
              <button
                className={styles.copyButton}
                onClick={copyDebugToClipboard}
                title="Copy debug log"
                style={{ backgroundColor: "rgba(26, 26, 26, 0.9)", color: "#00ff00", border: "1px solid #00ff00" }}
              >
                <CopyRegular fontSize={12} />
                <span>{copiedDebug ? "Copied!" : "Copy"}</span>
              </button>
            )}
            {debugLog.length === 0 ? (
              <div style={{ opacity: 0.5 }}>No logs yet...</div>
            ) : (
              debugLog.map((log, index) => (
                <div 
                  key={index} 
                  className={styles.debugLog}
                  style={{
                    color: log.includes("ERROR") ? "#ff6b6b" : 
                           log.includes("SUCCESS") ? "#51cf66" : 
                           log.includes("Tool") ? "#ffd93d" : "#00ff00"
                  }}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AgentTab;