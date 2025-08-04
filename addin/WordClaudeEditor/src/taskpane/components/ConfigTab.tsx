import * as React from "react";
import { useState, useEffect } from "react";
import {
  makeStyles,
  tokens,
  Button,
  Text,
  Textarea,
  Field,
  Switch,
  Divider,
} from "@fluentui/react-components";
import {
  SaveRegular,
  ArrowResetRegular,
} from "@fluentui/react-icons";
import { promptManager, PROMPT_IDS } from "../../prompts";

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
  sectionTitle: {
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "8px",
    color: tokens.colorNeutralForeground1,
  },
  promptTextarea: {
    "& textarea": {
      fontSize: "12px",
      fontFamily: tokens.fontFamilyMonospace,
      lineHeight: "1.4",
    },
  },
  buttonContainer: {
    display: "flex",
    gap: "8px",
    marginTop: "12px",
  },
  button: {
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
  toolsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "8px",
    marginTop: "8px",
  },
  toolRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px",
    backgroundColor: "#fafafa",
    borderRadius: "4px",
    border: `1px solid ${tokens.colorNeutralStroke1}`,
  },
  toolInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  toolName: {
    fontSize: "12px",
    fontWeight: "500",
    color: tokens.colorNeutralForeground1,
  },
  toolDescription: {
    fontSize: "11px",
    color: tokens.colorNeutralForeground3,
  },
  statusText: {
    fontSize: "11px",
    padding: "8px 12px",
    backgroundColor: "#f0f9ff",
    color: "#0969da",
    borderRadius: "4px",
    marginTop: "8px",
  },
  errorText: {
    fontSize: "11px",
    padding: "8px 12px",
    backgroundColor: "#fff5f5",
    color: "#d73a49",
    borderRadius: "4px",
    marginTop: "8px",
  },
});

const ConfigTab: React.FC = () => {
  const styles = useStyles();
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const defaultPrompt = promptManager.getPrompt(PROMPT_IDS.IMPROVE_DEFAULT);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        const settings = Office.context.document.settings;
        const prompt = settings.get("claudeSystemPrompt");
        if (prompt) {
          setSystemPrompt(prompt);
        } else {
          setSystemPrompt(defaultPrompt);
        }
      } else {
        setSystemPrompt(defaultPrompt);
      }
    } catch (err) {
      console.error("Error loading settings:", err);
      setSystemPrompt(defaultPrompt);
    }
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    setSaveStatus(null);
    setError(null);

    try {
      if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        const settings = Office.context.document.settings;
        settings.set("claudeSystemPrompt", systemPrompt);
        
        await new Promise<void>((resolve, reject) => {
          settings.saveAsync((result) => {
            if (result.status === Office.AsyncResultStatus.Succeeded) {
              resolve();
            } else {
              reject(new Error("Failed to save settings"));
            }
          });
        });
        
        setSaveStatus("Configuration saved successfully");
      } else {
        // Fallback to localStorage for testing
        localStorage.setItem("claudeSystemPrompt", systemPrompt);
        setSaveStatus("Configuration saved (test mode)");
      }
    } catch (err) {
      console.error("Error saving configuration:", err);
      setError("Failed to save configuration");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetToDefault = () => {
    setSystemPrompt(defaultPrompt);
    setSaveStatus("Reset to default prompt");
  };

  const tools = [
    {
      name: "Web Search",
      description: "Search the web for information",
      enabled: false,
      comingSoon: true,
    },
    {
      name: "File Search",
      description: "Search and read local files",
      enabled: false,
      comingSoon: true,
    },
    {
      name: "MCP Connectors",
      description: "Connect to external data sources",
      enabled: false,
      comingSoon: true,
    },
    {
      name: "Research Agent",
      description: "Deep research with multiple sources",
      enabled: false,
      comingSoon: true,
    },
  ];

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <Text className={styles.sectionTitle}>System Prompt</Text>
        <Field size="small">
          <Textarea
            className={styles.promptTextarea}
            value={systemPrompt}
            onChange={(_, data) => setSystemPrompt(data.value)}
            placeholder="Enter system prompt..."
            rows={6}
            disabled={isSaving}
          />
        </Field>
        
        <div className={styles.buttonContainer}>
          <Button
            className={`${styles.button} ${styles.primaryButton}`}
            icon={<SaveRegular />}
            onClick={handleSaveConfiguration}
            disabled={isSaving}
            appearance="primary"
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
          
          <Button
            className={styles.button}
            icon={<ArrowResetRegular />}
            onClick={handleResetToDefault}
            appearance="secondary"
            disabled={isSaving}
          >
            Reset to Default
          </Button>
        </div>

        {saveStatus && (
          <div className={styles.statusText}>
            {saveStatus}
          </div>
        )}
        
        {error && (
          <div className={styles.errorText}>
            {error}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <Text className={styles.sectionTitle}>Available Tools</Text>
        <div className={styles.toolsGrid}>
          {tools.map((tool) => (
            <div key={tool.name} className={styles.toolRow}>
              <div className={styles.toolInfo}>
                <Text className={styles.toolName}>
                  {tool.name}
                  {tool.comingSoon && (
                    <span style={{ 
                      marginLeft: "6px", 
                      fontSize: "10px", 
                      color: tokens.colorNeutralForeground3,
                      fontWeight: "normal"
                    }}>
                      (coming soon)
                    </span>
                  )}
                </Text>
                <Text className={styles.toolDescription}>
                  {tool.description}
                </Text>
              </div>
              <Switch
                checked={tool.enabled}
                disabled={tool.comingSoon}
                onChange={() => {}}
                style={{ opacity: tool.comingSoon ? 0.4 : 1 }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConfigTab;