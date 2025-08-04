import * as React from "react";
import { useEffect, useState } from "react";
import { ModeRegistry } from "../../modes/ModeRegistry";
import { DocumentProcessor } from "./DocumentProcessor";

const ReviewTab: React.FC = () => {
  const [reviewMode, setReviewMode] = useState(() => {
    const registry = ModeRegistry.getInstance();
    return registry.getMode("review");
  });

  useEffect(() => {
    if (!reviewMode) {
      console.error("[ReviewTab] Review mode not found in registry");
    }
  }, [reviewMode]);

  if (!reviewMode) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <p>Review mode is not available. Please check the configuration.</p>
      </div>
    );
  }

  return <DocumentProcessor mode={reviewMode} />;
};

export default ReviewTab;