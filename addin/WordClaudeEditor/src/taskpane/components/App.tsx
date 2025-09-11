import * as React from "react";
import { useState, useEffect } from "react";
import {
  makeStyles,
  tokens,
  Text,
  Button,
  Tooltip,
} from "@fluentui/react-components";
import { 
  DocumentSearchRegular,
  EditRegular,
  SparkleRegular,
  SettingsRegular
} from "@fluentui/react-icons";
import Header from "./Header";
import EditorTab from "./EditorTab";
import ConfigTab from "./ConfigTab";
import AgentTab from "./AgentTab";
import ReviewTab from "./ReviewTab";
import { toolHost } from "../../services/ToolHost";

interface AppProps {
  title: string;
}

const useStyles = makeStyles({
  root: {
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#ffffff",
  },
  navigation: {
    display: "flex",
    alignItems: "center",
    borderBottom: `1px solid ${tokens.colorNeutralStroke1}`,
    padding: "0 12px",
    height: "40px",
    backgroundColor: "#fafafa",
  },
  navButton: {
    minWidth: "36px",
    height: "32px",
    padding: "0 8px",
    marginRight: "4px",
    border: "none",
    backgroundColor: "transparent",
    color: tokens.colorNeutralForeground3,
    fontSize: "20px",
    cursor: "pointer",
    borderRadius: tokens.borderRadiusSmall,
    "&:hover": {
      backgroundColor: tokens.colorNeutralBackground3,
      color: tokens.colorNeutralForeground1,
    },
  },
  navButtonActive: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    boxShadow: "0 0 0 1px " + tokens.colorNeutralStroke2,
  },
  navDivider: {
    width: "1px",
    height: "20px",
    backgroundColor: tokens.colorNeutralStroke1,
    margin: "0 8px",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    backgroundColor: "#ffffff",
  },
});

const App: React.FC<AppProps> = () => {
  const styles = useStyles();
  const [selectedMode, setSelectedMode] = useState<string>("edit");

  // Initialize ToolHost for Mastra integration
  useEffect(() => {
    // Connect to the backend SSE stream
    toolHost.connect().catch(error => {
      console.error("Failed to connect ToolHost:", error);
    });

    // Cleanup on unmount
    return () => {
      toolHost.disconnect();
    };
  }, []);

  const modes = [
    { id: "review", icon: <DocumentSearchRegular />, label: "Review", disabled: false },
    { id: "edit", icon: <EditRegular />, label: "Edit Selection", disabled: false },
    { id: "agent", icon: <SparkleRegular />, label: "Agent", disabled: false },
  ];

  return (
    <div className={styles.root}>
      <Header />
      
      <div className={styles.navigation}>
        {modes.map((mode) => (
          <Tooltip 
            key={mode.id} 
            content={mode.disabled ? `${mode.label} (Coming soon)` : mode.label} 
            relationship="description"
          >
            <button
              className={`${styles.navButton} ${selectedMode === mode.id ? styles.navButtonActive : ""}`}
              onClick={() => !mode.disabled && setSelectedMode(mode.id)}
              disabled={mode.disabled}
              style={{ 
                opacity: mode.disabled ? 0.4 : 1,
                cursor: mode.disabled ? "not-allowed" : "pointer"
              }}
            >
              {mode.icon}
            </button>
          </Tooltip>
        ))}
        
        <div className={styles.navDivider} />
        
        <Tooltip content="Settings" relationship="description">
          <button
            className={`${styles.navButton} ${selectedMode === "config" ? styles.navButtonActive : ""}`}
            onClick={() => setSelectedMode("config")}
          >
            <SettingsRegular />
          </button>
        </Tooltip>
      </div>

      <div className={styles.content}>
        {selectedMode === "review" && <ReviewTab />}
        {selectedMode === "edit" && <EditorTab />}
        {selectedMode === "agent" && <AgentTab />}
        {selectedMode === "config" && <ConfigTab />}
      </div>
    </div>
  );
};

export default App;