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
  RadioGroup,
  Radio,
  Divider,
} from "@fluentui/react-components";
import {
  PlayRegular,
  StopRegular,
  CheckmarkCircleRegular,
  ErrorCircleRegular,
  SearchRegular,
  EditRegular,
  DocumentRegular,
  CommentRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  CopyRegular,
  DismissRegular,
  ArrowResetRegular,
  BugRegular,
} from "@fluentui/react-icons";
import { DocumentProcessorMode } from "../../modes/types";
import { documentProcessor } from "../../services/DocumentProcessorService";
import { agentService, ToolUse } from "../../services/AgentService";
import { wordService } from "../../services/WordService";
import { DebugPanel } from "./DebugPanel";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#ffffff",
  },
  modeHeader: {
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  modeTitle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "4px",
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
  outputFormatSection: {
    marginTop: "12px",
    padding: "8px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: "4px",
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
  },
  toolName: {
    fontWeight: 600,
    fontSize: "12px",
  },
  toolInput: {
    fontSize: "11px",
    fontFamily: "Consolas, monospace",
    backgroundColor: "#f5f5f5",
    padding: "4px",
    borderRadius: "2px",
    marginTop: "4px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  toolResult: {
    fontSize: "11px",
    marginTop: "4px",
    padding: "4px",
    borderRadius: "2px",
  },
  contentSection: {
    marginBottom: "12px",
    padding: "8px",
    backgroundColor: "#ffffff",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
    borderRadius: "4px",
  },
  contentText: {
    fontSize: "12px",
    lineHeight: "1.8",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    "& p": {
      marginBottom: "12px",
    },
  },
  statusBar: {
    padding: "8px 12px",
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: tokens.colorNeutralBackground2,
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
  },
  errorMessage: {
    color: tokens.colorPaletteRedForeground1,
    fontSize: "12px",
    padding: "8px",
    backgroundColor: tokens.colorPaletteRedBackground1,
    borderRadius: "4px",
    marginTop: "8px",
  },
});

interface DocumentProcessorProps {
  mode: DocumentProcessorMode;
  onModeChange?: (mode: DocumentProcessorMode) => void;
}

export const DocumentProcessor: React.FC<DocumentProcessorProps> = ({ mode }) => {
  const styles = useStyles();
  const [input, setInput] = useState("");
  const [outputFormat, setOutputFormat] = useState<"ui" | "document" | "both">(
    mode.outputConfig.format as "ui" | "document" | "both"
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [toolUses, setToolUses] = useState<ToolUse[]>([]);
  const [streamContent, setStreamContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());
  const [iterationCount, setIterationCount] = useState(0);
  const [showDebug, setShowDebug] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset state when mode changes
  useEffect(() => {
    handleReset();
    setOutputFormat(mode.outputConfig.format as "ui" | "document" | "both");
  }, [mode]);

  const handleProcess = async () => {
    try {
      setError(null);
      setIsProcessing(true);
      setToolUses([]);
      setStreamContent("");
      setIterationCount(0);

      // Validate requirements
      if (mode.requiresSelection) {
        const selection = await wordService.getSelectedText();
        if (!selection || selection.trim().length === 0) {
          setError("Please select text in the document before proceeding.");
          setIsProcessing(false);
          return;
        }
      }

      // Get document context
      const documentContext = await wordService.getDocumentContext();

      // Build messages
      const messages = [
        {
          role: "user",
          content: input,
        },
      ];

      // Process with the document processor service
      await documentProcessor.process({
        mode: mode.id,
        messages,
        documentContext,
        outputFormat,
        onToolUse: (tool) => {
          setToolUses((prev) => [...prev, tool]);
          setIterationCount((prev) => prev + 1);
        },
        onContent: (content) => {
          setStreamContent((prev) => prev + content);
        },
        onComplete: () => {
          setIsProcessing(false);
        },
        onError: (error) => {
          setError(error.message);
          setIsProcessing(false);
        },
      });
    } catch (error) {
      console.error("[DocumentProcessor] Error:", error);
      setError(error.message || "An unexpected error occurred");
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    documentProcessor.cancel();
    setIsProcessing(false);
  };

  const handleReset = () => {
    setInput("");
    setToolUses([]);
    setStreamContent("");
    setError(null);
    setIterationCount(0);
    setExpandedTools(new Set());
  };

  const toggleToolExpansion = (toolId: string) => {
    setExpandedTools((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(toolId)) {
        newSet.delete(toolId);
      } else {
        newSet.add(toolId);
      }
      return newSet;
    });
  };

  const getToolIcon = (toolName: string) => {
    if (toolName.includes("search") || toolName.includes("analyze")) {
      return <SearchRegular />;
    }
    if (toolName.includes("edit") || toolName.includes("insert")) {
      return <EditRegular />;
    }
    if (toolName.includes("comment")) {
      return <CommentRegular />;
    }
    return <DocumentRegular />;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Silently fail if clipboard is not available
    }
  };

  return (
    <div className={styles.container}>
      {/* Mode Header */}
      <div className={styles.modeHeader}>
        <div className={styles.modeTitle}>
          <Text size={300} weight="semibold">
            {mode.icon} {mode.name}
          </Text>
        </div>
        <Text size={200}>{mode.description}</Text>
      </div>

      {/* Input Section */}
      <div className={styles.inputSection}>
        <Field label={mode.userPromptConfig.label}>
          <Textarea
            className={styles.promptInput}
            placeholder={mode.userPromptConfig.placeholder}
            value={input}
            onChange={(_, data) => setInput(data.value)}
            rows={mode.userPromptConfig.rows || 3}
            disabled={isProcessing}
          />
        </Field>

        {/* Output Format Selection for Review Mode */}
        {mode.outputConfig.allowUserSelection && (
          <div className={styles.outputFormatSection}>
            <Text size={200} weight="semibold" block style={{ marginBottom: "8px" }}>
              Output Format
            </Text>
            <RadioGroup value={outputFormat} onChange={(_, data) => setOutputFormat(data.value as any)}>
              <Radio value="ui" label="Show in panel" />
              <Radio value="document" label="Add to document" />
              <Radio value="both" label="Both" />
            </RadioGroup>
          </div>
        )}

        {/* Action Buttons */}
        <div className={styles.actionBar}>
          {!isProcessing ? (
            <>
              <Button
                className={`${styles.actionButton} ${styles.primaryButton}`}
                icon={<PlayRegular />}
                onClick={handleProcess}
                disabled={!input.trim()}
              >
                {mode.id === "review" ? "Start Review" : mode.id === "edit" ? "Apply Edit" : "Run Agent"}
              </Button>
              {(toolUses.length > 0 || streamContent) && (
                <Button className={styles.actionButton} icon={<ArrowResetRegular />} onClick={handleReset}>
                  Reset
                </Button>
              )}
              <Button 
                className={styles.actionButton} 
                icon={<BugRegular />} 
                onClick={() => setShowDebug(!showDebug)}
                appearance="subtle"
              >
                Debug
              </Button>
            </>
          ) : (
            <>
              <Button
                className={styles.actionButton}
                icon={<StopRegular />}
                onClick={handleCancel}
                appearance="secondary"
              >
                Cancel
              </Button>
              <Button 
                className={styles.actionButton} 
                icon={<BugRegular />} 
                onClick={() => setShowDebug(!showDebug)}
                appearance="subtle"
              >
                Debug
              </Button>
            </>
          )}
        </div>

        {/* Error Display */}
        {error && <div className={styles.errorMessage}>{error}</div>}
      </div>

      {/* Output Section */}
      <div className={styles.outputSection}>
        {/* Stream Content Display */}
        {streamContent && outputFormat !== "document" && (
          <div className={styles.contentSection}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <Text size={200} weight="semibold">
                {mode.id === "review" ? "Review Results" : "Output"}
              </Text>
              <Button
                size="small"
                icon={<CopyRegular />}
                appearance="subtle"
                onClick={() => copyToClipboard(streamContent)}
              >
                Copy
              </Button>
            </div>
            <div className={styles.contentText}>
              {streamContent.split('\n').map((paragraph, index) => {
                // Handle empty lines as spacing
                if (!paragraph.trim()) {
                  return <div key={index} style={{ height: "8px" }} />;
                }
                // Render non-empty paragraphs
                return (
                  <p key={index} style={{ marginBottom: "12px", lineHeight: "1.6" }}>
                    {paragraph}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Tool Uses Display */}
        {toolUses.length > 0 && (
          <div>
            <Text size={200} weight="semibold" block style={{ marginBottom: "8px" }}>
              Tool Activity ({toolUses.length} {toolUses.length === 1 ? "use" : "uses"})
            </Text>
            {toolUses.map((tool) => {
              const isExpanded = expandedTools.has(tool.id);
              return (
                <Card key={tool.id} className={styles.toolCard}>
                  <div className={styles.toolHeader} onClick={() => toggleToolExpansion(tool.id)}>
                    {isExpanded ? <ChevronDownRegular /> : <ChevronRightRegular />}
                    {getToolIcon(tool.name)}
                    <span className={styles.toolName}>{tool.name}</span>
                    {tool.result && (
                      <Badge
                        appearance="filled"
                        color={tool.result.success ? "success" : "important"}
                        size="small"
                      >
                        {tool.result.success ? <CheckmarkCircleRegular /> : <ErrorCircleRegular />}
                      </Badge>
                    )}
                  </div>

                  {isExpanded && (
                    <>
                      <div className={styles.toolInput}>{JSON.stringify(tool.input, null, 2)}</div>
                      {tool.result && (
                        <div
                          className={styles.toolResult}
                          style={{
                            backgroundColor: tool.result.success ? "#e6f6e6" : "#ffe6e6",
                            color: tool.result.success ? "#0e700e" : "#a80000",
                          }}
                        >
                          {tool.result.message}
                          {tool.result.data && (
                            <div style={{ marginTop: "4px", fontSize: "10px" }}>
                              {JSON.stringify(tool.result.data, null, 2)}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "12px" }}>
            <Spinner size="tiny" />
            <Text size={200}>Processing...</Text>
            {iterationCount > 0 && (
              <Text size={100} style={{ color: tokens.colorNeutralForeground3 }}>
                Iteration {Math.min(iterationCount, mode.maxIterations || 10)}/{mode.maxIterations || 10}
                {iterationCount > (mode.maxIterations || 10) && " (extended)"}
              </Text>
            )}
          </div>
        )}
      </div>

      {/* Status Bar */}
      {(toolUses.length > 0 || streamContent) && !isProcessing && (
        <div className={styles.statusBar}>
          <Text>
            Completed: {toolUses.length} tool {toolUses.length === 1 ? "use" : "uses"}
            {streamContent && `, ${streamContent.split(" ").length} words`}
          </Text>
        </div>
      )}

      {/* Debug Panel */}
      {showDebug && <DebugPanel onClose={() => setShowDebug(false)} />}
    </div>
  );
};

export default DocumentProcessor;