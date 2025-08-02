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
  MessageBar,
  MessageBarBody,
  MessageBarTitle,
} from "@fluentui/react-components";
import { SaveRegular, SettingsRegular } from "@fluentui/react-icons";

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
    justifyContent: "flex-start",
    marginTop: "12px",
  },
  formField: {
    marginBottom: "16px",
  },
});

interface Config {
  systemPrompt: string;
  enableStyleMatching: boolean;
  backendUrl: string;
}

const defaultConfig: Config = {
  systemPrompt: "You are a professional writing assistant helping to improve text in Microsoft Word documents. Focus on clarity, conciseness, and maintaining the author's voice.",
  enableStyleMatching: true,
  backendUrl: "http://localhost:3000",
};

const ConfigTab: React.FC = () => {
  const styles = useStyles();
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Check if Office context is available
      if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        // Load configuration from Office settings
        const settings = Office.context.document.settings;
        
        setConfig({
          systemPrompt: settings.get("claudeSystemPrompt") || defaultConfig.systemPrompt,
          enableStyleMatching: settings.get("claudeEnableStyleMatching") === "true" || defaultConfig.enableStyleMatching,
          backendUrl: settings.get("claudeBackendUrl") || defaultConfig.backendUrl,
        });
      } else {
        // Use default config if Office context not available
        console.log("Office context not available, using default configuration");
        setConfig(defaultConfig);
      }
    } catch (error) {
      // Use default config if loading fails
      console.log("Using default configuration due to error:", error);
      setConfig(defaultConfig);
    }
  };

  const saveConfig = async () => {
    try {
      setIsSaving(true);
      setSaveMessage(null);

      // Check if Office context is available
      if (typeof Office !== 'undefined' && Office.context && Office.context.document) {
        // Save configuration to Office settings
        const settings = Office.context.document.settings;
        
        settings.set("claudeSystemPrompt", config.systemPrompt);
        settings.set("claudeEnableStyleMatching", config.enableStyleMatching.toString());
        settings.set("claudeBackendUrl", config.backendUrl);
        
        await settings.saveAsync();
        
        setSaveMessage("Configuration saved successfully!");
      } else {
        // Can't save without Office context
        setSaveMessage("Configuration saved locally (Office context not available)");
      }
    } catch (error) {
      setSaveMessage("Failed to save configuration. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setConfig(defaultConfig);
    setSaveMessage(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.section}>
        <Text size={500} weight="semibold">
          AI Configuration
        </Text>
        
        <Field label="System Prompt" className={styles.formField}>
          <Textarea
            placeholder="Enter custom instructions for Claude..."
            value={config.systemPrompt}
            onChange={(_, data) => setConfig({ ...config, systemPrompt: data.value })}
            rows={4}
            resize="vertical"
          />
        </Field>

        <Field label="Style Matching" className={styles.formField}>
          <Switch
            checked={config.enableStyleMatching}
            onChange={(_, data) => setConfig({ ...config, enableStyleMatching: data.checked })}
            label={config.enableStyleMatching ? "Enabled" : "Disabled"}
          />
          <Text size={200} block style={{ marginTop: "4px", color: tokens.colorNeutralForeground2 }}>
            Automatically analyze and match your document's writing style
          </Text>
        </Field>

        <div className={styles.buttonContainer}>
          <Button
            appearance="primary"
            icon={<SaveRegular />}
            onClick={saveConfig}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save Configuration"}
          </Button>
          
          <Button
            appearance="secondary"
            onClick={resetToDefaults}
            disabled={isSaving}
          >
            Reset to Defaults
          </Button>
        </div>

        {saveMessage && (
          <MessageBar intent={saveMessage.includes("Failed") ? "error" : "success"}>
            <MessageBarBody>
              <MessageBarTitle>
                {saveMessage.includes("Failed") ? "Error" : "Success"}
              </MessageBarTitle>
              {saveMessage}
            </MessageBarBody>
          </MessageBar>
        )}
      </div>

      <div className={styles.section}>
        <Text size={500} weight="semibold">
          Backend Configuration
        </Text>
        
        <Field label="Backend Server URL" className={styles.formField}>
          <Textarea
            placeholder="http://localhost:3000"
            value={config.backendUrl}
            onChange={(_, data) => setConfig({ ...config, backendUrl: data.value })}
            rows={1}
          />
          <Text size={200} block style={{ marginTop: "4px", color: tokens.colorNeutralForeground2 }}>
            URL of the Claude backend server
          </Text>
        </Field>
      </div>

      <div className={styles.section}>
        <Text size={400} weight="semibold">
          About this Add-in
        </Text>
        <Text size={300}>
          Word Claude Editor integrates Claude AI to help improve your writing with intelligent suggestions, 
          style matching, and automated comment implementation.
        </Text>
        <Text size={300} style={{ marginTop: "8px" }}>
          Configuration is saved per document and will persist when you reopen the file.
        </Text>
      </div>
    </div>
  );
};

export default ConfigTab;