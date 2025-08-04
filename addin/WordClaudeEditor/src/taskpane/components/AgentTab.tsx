import * as React from "react";
import { useEffect, useState } from "react";
import { ModeRegistry } from "../../modes/ModeRegistry";
import { DocumentProcessor } from "./DocumentProcessor";

const AgentTab: React.FC = () => {
  const [agentMode] = useState(() => {
    const registry = ModeRegistry.getInstance();
    return registry.getMode("agent");
  });

  useEffect(() => {
    if (!agentMode) {
      console.error("[AgentTab] Agent mode not found in registry");
    }
  }, [agentMode]);

  if (!agentMode) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Agent mode is not available. Please check the configuration.</p>
      </div>
    );
  }

  return <DocumentProcessor mode={agentMode} />;
};

export default AgentTab;