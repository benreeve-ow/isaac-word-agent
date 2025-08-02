import * as React from "react";
import { useState, useEffect } from "react";
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Spinner,
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
  Textarea,
  Field,
  Tag,
  Switch,
  Divider,
} from "@fluentui/react-components";
import { 
  ArrowUploadRegular, 
  LightbulbRegular,
  CheckmarkCircleRegular,
  DismissCircleRegular,
  DocumentTextRegular,
} from "@fluentui/react-icons";
import { wordService } from "../../services/WordService";
import { claudeService } from "../../services/ClaudeService";

const useStyles = makeStyles({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    backgroundColor: tokens.colorNeutralBackground2,
    borderRadius: tokens.borderRadiusMedium,
  },
  buttonContainer: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
  },
  statusSection: {
    marginTop: "8px",
  },
  selectionInfo: {
    padding: "12px",
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusMedium,
    marginTop: "8px",
  },
  promptField: {
    marginTop: "8px",
  },
  exampleTags: {
    display: "flex",
    gap: "8px",
    flexWrap: "wrap",
    marginTop: "4px",
  },
  resultSection: {
    marginTop: "16px",
    padding: "16px",
    backgroundColor: tokens.colorNeutralBackground1,
    borderRadius: tokens.borderRadiusMedium,
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  contextSettings: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginTop: "8px",
  },
  tokenInfo: {
    fontSize: tokens.fontSizeBase200,
    color: tokens.colorNeutralForeground3,
  },
});

const EditorTab: React.FC = () => {
  const styles = useStyles();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [improvedText, setImprovedText] = useState<string>("");
  const [explanation, setExplanation] = useState<string>("");
  const [tokenCount, setTokenCount] = useState<number>(0);
  const [useFullDocument, setUseFullDocument] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addDebugLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    setDebugLog(prev => [...prev.slice(-50), logEntry]); // Keep last 50 logs
    console.log(`[DEBUG] ${logEntry}`);
  };

  const examplePrompts = [
    "Turn into bullet points",
    "Make more concise",
    "Expand with more detail",
    "Fix grammar and spelling",
    "Make more formal",
    "Simplify language",
    "Add transitions",
    "Make more persuasive",
  ];

  useEffect(() => {
    // Update WordService context settings when toggle changes
    wordService.updateContextSettings({
      useFullDocument: useFullDocument,
    });
  }, [useFullDocument]);

  const handleExampleClick = (example: string) => {
    setUserPrompt(example);
  };

  const handleImproveText = async () => {
    addDebugLog("=== handleImproveText started ===");
    addDebugLog(`Office available: ${typeof Office !== 'undefined'}`);
    addDebugLog(`User prompt: "${userPrompt.substring(0, 50)}..."`);
    
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      setShowResult(false);

      if (!userPrompt.trim()) {
        addDebugLog("ERROR: No user prompt provided");
        throw new Error("Please enter instructions for how to improve the text");
      }

      addDebugLog("Calling WordService.getSelectedTextWithContext()...");
      // Get selected text with context using WordService
      const selectionContext = await wordService.getSelectedTextWithContext();
      addDebugLog(`Selection context received: hasSelection=${selectionContext.hasSelection}, text length=${selectionContext.selectedText?.length || 0}`);
      
      if (!selectionContext.hasSelection) {
        addDebugLog("ERROR: No text selected");
        throw new Error("Please select some text to improve");
      }

      setSelectedText(selectionContext.selectedText);
      setTokenCount(selectionContext.estimatedTokens);
      addDebugLog(`Estimated tokens: ${selectionContext.estimatedTokens}`);

      addDebugLog("Calling Claude API...");
      addDebugLog(`API endpoint: https://localhost:3000/api/claude/improve`);
      
      // Call Claude API
      const response = await claudeService.improveText({
        text: selectionContext.selectedText,
        contextBefore: selectionContext.contextBefore,
        contextAfter: selectionContext.contextAfter,
        userPrompt: userPrompt,
      });

      addDebugLog(`API response received: improvedText length=${response.improvedText?.length || 0}`);
      
      setImprovedText(response.improvedText);
      setExplanation(response.explanation);
      setShowResult(true);
      setSuccess("Text improved successfully! Review the changes below.");
      addDebugLog("SUCCESS: Text improvement complete");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "An error occurred";
      const errorDetails = err instanceof Error ? err.stack : JSON.stringify(err);
      addDebugLog(`ERROR: ${errorMsg}`);
      addDebugLog(`Error stack: ${errorDetails}`);
      setError(errorMsg);
      setShowResult(false);
    } finally {
      setIsLoading(false);
      addDebugLog("=== handleImproveText completed ===");
    }
  };

  const handleApplyChanges = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Apply the improved text with track changes
      const result = await wordService.applyEditWithTracking(improvedText);
      
      if (result.success) {
        setSuccess("Changes applied with track changes enabled!");
        setShowResult(false);
        setImprovedText("");
        setExplanation("");
        setUserPrompt("");
      } else {
        throw new Error(result.error || "Failed to apply changes");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply changes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGetSelection = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const selectionContext = await wordService.getSelectedTextWithContext();
      
      if (selectionContext.hasSelection) {
        setSelectedText(selectionContext.selectedText);
        setTokenCount(selectionContext.estimatedTokens);
        setSuccess(`Selected ${selectionContext.wordCount} words (~${selectionContext.estimatedTokens} tokens)`);
      } else {
        setError("No text selected");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get selection");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckComments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const comments = await wordService.getCommentsOnSelection();
      
      if (comments.length > 0) {
        const commentText = comments.map(c => `${c.author}: ${c.text}`).join("\n");
        setSuccess(`Found ${comments.length} comment(s):\n${commentText}`);
      } else {
        setSuccess("No comments found on the selected text");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get comments");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <Text size={500} weight="semibold">
          Text Improvement
        </Text>
        <Text size={300}>
          Select text in your document, enter your instructions, and let AI improve it.
        </Text>
        
        <Field 
          label="What would you like to do with the selected text?"
          className={styles.promptField}
          hint="Be specific about how you want the text improved"
        >
          <Textarea
            placeholder="E.g., 'Turn this into bullet points', 'Make it more formal', 'Expand on this idea'..."
            value={userPrompt}
            onChange={(_, data) => setUserPrompt(data.value)}
            rows={3}
            resize="vertical"
          />
        </Field>

        <div>
          <Text size={200} weight="semibold">Quick examples:</Text>
          <div className={styles.exampleTags}>
            {examplePrompts.map((prompt) => (
              <Tag
                key={prompt}
                size="small"
                appearance="brand"
                onClick={() => handleExampleClick(prompt)}
                style={{ cursor: "pointer" }}
                icon={<LightbulbRegular />}
              >
                {prompt}
              </Tag>
            ))}
          </div>
        </div>

        <div className={styles.contextSettings}>
          <Switch
            checked={useFullDocument}
            onChange={(_, data) => setUseFullDocument(data.checked)}
            label={useFullDocument ? "Using full document context" : "Using limited context"}
          />
          <Text size={200} className={styles.tokenInfo}>
            {useFullDocument 
              ? "(Up to 140k tokens of context)" 
              : "(~2000 chars before/after selection)"}
          </Text>
        </div>
        
        <div className={styles.buttonContainer}>
          <Button
            appearance="primary"
            icon={<ArrowUploadRegular />}
            onClick={handleImproveText}
            disabled={isLoading || !userPrompt.trim()}
            size="large"
          >
            {isLoading ? "Processing..." : "Apply Instructions"}
          </Button>
          
          <Button
            appearance="secondary"
            onClick={handleGetSelection}
            disabled={isLoading}
          >
            Check Selection
          </Button>

          <Button
            appearance="secondary"
            onClick={handleCheckComments}
            disabled={isLoading}
            icon={<DocumentTextRegular />}
          >
            Check Comments
          </Button>
        </div>

        {isLoading && (
          <div className={styles.statusSection}>
            <Spinner size="small" label="Processing your request..." />
          </div>
        )}

        {error && (
          <MessageBar intent="error" className={styles.statusSection}>
            <MessageBarBody>
              <MessageBarTitle>Error</MessageBarTitle>
              {error}
            </MessageBarBody>
          </MessageBar>
        )}

        {success && !showResult && (
          <MessageBar intent="success" className={styles.statusSection}>
            <MessageBarBody>
              <MessageBarTitle>Success</MessageBarTitle>
              {success}
            </MessageBarBody>
          </MessageBar>
        )}

        {showResult && improvedText && (
          <div className={styles.resultSection}>
            <Text size={400} weight="semibold">Improved Text:</Text>
            <Divider style={{ margin: "12px 0" }} />
            <Text block style={{ whiteSpace: "pre-wrap", marginBottom: "12px" }}>
              {improvedText}
            </Text>
            <Divider style={{ margin: "12px 0" }} />
            <Text size={300} weight="semibold">Explanation:</Text>
            <Text size={300} block style={{ marginTop: "8px", marginBottom: "16px" }}>
              {explanation}
            </Text>
            <div className={styles.buttonContainer}>
              <Button
                appearance="primary"
                icon={<CheckmarkCircleRegular />}
                onClick={handleApplyChanges}
                disabled={isLoading}
              >
                Apply Changes (with Track Changes)
              </Button>
              <Button
                appearance="secondary"
                icon={<DismissCircleRegular />}
                onClick={() => {
                  setShowResult(false);
                  setImprovedText("");
                  setExplanation("");
                }}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {selectedText && !showResult && (
          <div className={styles.selectionInfo}>
            <Text size={300} weight="semibold">Current Selection:</Text>
            {tokenCount > 0 && (
              <Text size={200} block style={{ marginTop: "4px", color: tokens.colorNeutralForeground3 }}>
                Estimated tokens: {tokenCount}
              </Text>
            )}
            <Text size={200} block style={{ marginTop: "8px" }}>
              {selectedText.substring(0, 200)}
              {selectedText.length > 200 && "..."}
            </Text>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <Text size={400} weight="semibold">
          How it works
        </Text>
        <Text size={300}>
          1. Select text in your Word document
        </Text>
        <Text size={300}>
          2. Enter your instructions (or click an example)
        </Text>
        <Text size={300}>
          3. Click "Apply Instructions" to process
        </Text>
        <Text size={300}>
          4. Review and accept the AI-generated changes
        </Text>
      </div>
      {/* Debug Console */}
      {debugLog.length > 0 && (
        <div className={styles.section} style={{ backgroundColor: '#f5f5f5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <Text size={400} weight="semibold">🐛 Debug Console</Text>
            <Button 
              appearance="subtle" 
              size="small"
              onClick={() => setDebugLog([])}
            >
              Clear
            </Button>
          </div>
          <div style={{ 
            backgroundColor: '#1e1e1e', 
            color: '#00ff00', 
            padding: '12px', 
            borderRadius: '4px', 
            fontFamily: 'Consolas, Monaco, monospace', 
            fontSize: '11px',
            maxHeight: '300px',
            overflowY: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            border: '1px solid #333'
          }}>
            {debugLog.length === 0 ? (
              <div style={{ color: '#666' }}>No debug logs yet...</div>
            ) : (
              debugLog.map((log, index) => (
                <div key={index} style={{ 
                  marginBottom: '2px',
                  color: log.includes('ERROR') ? '#ff6b6b' : 
                         log.includes('SUCCESS') ? '#51cf66' :
                         log.includes('===') ? '#74c0fc' : '#00ff00'
                }}>
                  {log}
                </div>
              ))
            )}
          </div>
          <Text size={200} style={{ marginTop: '4px', color: tokens.colorNeutralForeground3 }}>
            Debug logs help identify issues. Check here if "Apply Instructions" fails.
          </Text>
        </div>
      )}
    </div>
  );
};

export default EditorTab;