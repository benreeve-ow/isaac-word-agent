import * as React from "react";
import { useState, useEffect } from "react";
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Spinner,
  Textarea,
  Field,
  Tag,
  Input,
} from "@fluentui/react-components";
import { 
  SendRegular,
  AddRegular,
  DismissRegular,
  ChevronDownRegular,
  ChevronRightRegular,
  CheckmarkRegular,
  ErrorCircleRegular,
} from "@fluentui/react-icons";
import { wordService } from "../../services/WordService";
import { claudeService } from "../../services/ClaudeService";
import { promptService, CustomPrompt } from "../../services/PromptService";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100%",
    backgroundColor: "#ffffff",
  },
  section: {
    padding: "12px",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  promptInput: {
    "& textarea": {
      fontSize: "12px",
      fontFamily: tokens.fontFamilyBase,
    },
  },
  tagContainer: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    marginTop: "8px",
  },
  promptTag: {
    fontSize: "11px",
    height: "22px",
    cursor: "pointer",
    borderRadius: "3px",
    backgroundColor: "#f5f5f5",
    border: "1px solid #e0e0e0",
    "&:hover": {
      backgroundColor: "#ebebeb",
      border: "1px solid #d0d0d0",
    },
  },
  promptTagEditing: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
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
  statusBar: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "8px 12px",
    backgroundColor: "#fafafa",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
  },
  resultSection: {
    flex: 1,
    padding: "12px",
    overflowY: "auto",
  },
  resultText: {
    fontSize: "12px",
    lineHeight: "1.5",
    fontFamily: tokens.fontFamilyMonospace,
    whiteSpace: "pre-wrap",
    backgroundColor: "#fafafa",
    padding: "8px",
    borderRadius: "3px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  debugSection: {
    borderTop: `1px solid ${tokens.colorNeutralStroke1}`,
    backgroundColor: "#fafafa",
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
  addPromptInput: {
    fontSize: "11px",
    height: "24px",
    marginRight: "4px",
  },
});

const EditorTab: React.FC = () => {
  const styles = useStyles();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [improvedText, setImprovedText] = useState<string>("");
  const [customPrompts, setCustomPrompts] = useState<CustomPrompt[]>([]);
  const [isAddingPrompt, setIsAddingPrompt] = useState(false);
  const [newPromptText, setNewPromptText] = useState("");
  const [debugExpanded, setDebugExpanded] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    try {
      const prompts = await promptService.getPrompts();
      setCustomPrompts(prompts);
    } catch (err) {
      console.error("Error loading prompts:", err);
    }
  };

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString("en-US", { 
      hour12: false, 
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit" 
    });
    setDebugLog(prev => [...prev.slice(-100), `[${timestamp}] ${message}`]);
  };

  const handleAddPrompt = async () => {
    if (!newPromptText.trim()) return;
    
    try {
      const updated = await promptService.addPrompt(newPromptText.trim());
      setCustomPrompts(updated);
      setNewPromptText("");
      setIsAddingPrompt(false);
    } catch (err) {
      console.error("Error adding prompt:", err);
    }
  };

  const handleDeletePrompt = async (id: string) => {
    try {
      const updated = await promptService.deletePrompt(id);
      setCustomPrompts(updated);
    } catch (err) {
      console.error("Error deleting prompt:", err);
    }
  };

  const handleImproveText = async () => {
    addDebugLog("Starting text improvement...");
    
    if (!userPrompt.trim()) {
      setError("Please enter instructions");
      addDebugLog("ERROR: No instructions provided");
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);
    setImprovedText("");

    try {
      addDebugLog("Getting selected text from Word...");
      const selectionContext = await wordService.getSelectedTextWithContext();
      
      if (!selectionContext.hasSelection) {
        throw new Error("Please select text to edit");
      }

      addDebugLog(`Selected text: ${selectionContext.selectedText.length} chars`);
      addDebugLog(`Context: ${selectionContext.contextBefore.length} chars before, ${selectionContext.contextAfter.length} chars after`);

      // Set context to 2000 chars on each side
      const contextBefore = selectionContext.contextBefore.slice(-2000);
      const contextAfter = selectionContext.contextAfter.slice(0, 2000);

      addDebugLog("Calling Claude API...");
      const response = await claudeService.improveText({
        text: selectionContext.selectedText,
        contextBefore: contextBefore,
        contextAfter: contextAfter,
        userPrompt: userPrompt,
      });

      addDebugLog("API response received successfully");
      setImprovedText(response.improvedText);
      setSuccess("Text improved successfully");
      addDebugLog("Text improvement complete");
      
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      setError(errorMsg);
      addDebugLog(`ERROR: ${errorMsg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyChanges = async () => {
    addDebugLog("Applying changes to document...");
    
    try {
      const result = await wordService.applyEditWithTracking(improvedText);
      
      if (result.success) {
        setSuccess("Changes applied successfully");
        setImprovedText("");
        setUserPrompt("");
        addDebugLog("Changes applied successfully");
      } else {
        throw new Error(result.error || "Failed to apply changes");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to apply changes";
      setError(errorMsg);
      addDebugLog(`ERROR: ${errorMsg}`);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <Field size="small">
          <Textarea
            className={styles.promptInput}
            value={userPrompt}
            onChange={(_, data) => setUserPrompt(data.value)}
            placeholder="Describe how you want to edit the selected text..."
            rows={3}
            disabled={isLoading}
          />
        </Field>

        <div className={styles.tagContainer}>
          {customPrompts.map((prompt) => (
            <div key={prompt.id} className={styles.promptTagEditing}>
              <Tag
                className={styles.promptTag}
                onClick={() => setUserPrompt(prompt.text)}
                size="small"
                appearance="outline"
              >
                {prompt.text}
              </Tag>
              <Button
                icon={<DismissRegular />}
                appearance="subtle"
                size="small"
                onClick={() => handleDeletePrompt(prompt.id)}
                style={{ minWidth: "20px", height: "20px", padding: "0" }}
              />
            </div>
          ))}
          
          {isAddingPrompt ? (
            <div style={{ display: "flex", alignItems: "center" }}>
              <Input
                className={styles.addPromptInput}
                value={newPromptText}
                onChange={(_, data) => setNewPromptText(data.value)}
                placeholder="New prompt..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddPrompt();
                  if (e.key === "Escape") {
                    setIsAddingPrompt(false);
                    setNewPromptText("");
                  }
                }}
              />
              <Button
                icon={<CheckmarkRegular />}
                appearance="subtle"
                size="small"
                onClick={handleAddPrompt}
                style={{ minWidth: "20px", height: "20px", padding: "0" }}
              />
            </div>
          ) : (
            <Button
              icon={<AddRegular />}
              appearance="subtle"
              size="small"
              onClick={() => setIsAddingPrompt(true)}
              style={{ fontSize: "11px", height: "22px" }}
            >
              Add
            </Button>
          )}
        </div>

        <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
          <Button
            className={`${styles.actionButton} ${styles.primaryButton}`}
            icon={<SendRegular />}
            onClick={handleImproveText}
            disabled={isLoading || !userPrompt.trim()}
            appearance="primary"
          >
            {isLoading ? "Processing..." : "Edit Text"}
          </Button>
          
          {improvedText && (
            <Button
              className={styles.actionButton}
              icon={<CheckmarkRegular />}
              onClick={handleApplyChanges}
              appearance="secondary"
            >
              Apply Changes
            </Button>
          )}
        </div>
      </div>

      {(error || success) && (
        <div className={styles.statusBar}>
          {error && (
            <>
              <ErrorCircleRegular fontSize={14} color="#d73a49" />
              <Text>{error}</Text>
            </>
          )}
          {success && (
            <>
              <CheckmarkRegular fontSize={14} color="#28a745" />
              <Text>{success}</Text>
            </>
          )}
        </div>
      )}

      {improvedText && (
        <div className={styles.resultSection}>
          <Text size={200} weight="semibold" style={{ marginBottom: "8px" }}>
            Result:
          </Text>
          <div className={styles.resultText}>
            {improvedText}
          </div>
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
          <div className={styles.debugContent}>
            {debugLog.length === 0 ? (
              <div style={{ opacity: 0.5 }}>No logs yet...</div>
            ) : (
              debugLog.map((log, index) => (
                <div 
                  key={index} 
                  className={styles.debugLog}
                  style={{
                    color: log.includes("ERROR") ? "#ff6b6b" : 
                           log.includes("SUCCESS") ? "#51cf66" : "#00ff00"
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

export default EditorTab;