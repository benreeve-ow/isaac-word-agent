import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./components/App";
import { FluentProvider } from "@fluentui/react-components";
import { minimalLightTheme } from "../theme/minimalTheme";

/* global document, Office, module, require, HTMLElement */

const title = "Isaac";

// Add error handling for debugging
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('Window error:', msg, url, lineNo, columnNo, error);
  const errorDiv = document.getElementById("error-display");
  if (errorDiv) {
    errorDiv.innerHTML = `<h3>Error:</h3><pre>${msg}\n${url}:${lineNo}:${columnNo}\n${error?.stack || ''}</pre>`;
    errorDiv.style.display = "block";
  }
  return false;
};

window.addEventListener('unhandledrejection', event => {
  console.error('Unhandled promise rejection:', event.reason);
  const errorDiv = document.getElementById("error-display");
  if (errorDiv) {
    errorDiv.innerHTML = `<h3>Promise Rejection:</h3><pre>${event.reason}</pre>`;
    errorDiv.style.display = "block";
  }
});

console.log("=== Word Claude Editor Loading ===");
console.log("Office available:", typeof Office !== 'undefined');

const rootElement: HTMLElement | null = document.getElementById("container");
console.log("Root element found:", !!rootElement);

if (!rootElement) {
  console.error("Container element not found!");
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Container element not found. Check taskpane.html</div>';
} else {
  const root = createRoot(rootElement);
  
  // Create a loading message
  root.render(
    <div style={{ padding: "20px", textAlign: "center" }}>
      <h2>Loading Word Claude Editor...</h2>
      <p>Initializing Office.js...</p>
    </div>
  );

  /* Render application after Office initializes */
  if (typeof Office !== 'undefined') {
    console.log("Calling Office.onReady...");
    
    Office.onReady((info) => {
      console.log("=== Office.onReady Success ===");
      console.log("Host:", info.host);
      console.log("Platform:", info.platform);
      
      try {
        root.render(
          <FluentProvider theme={minimalLightTheme}>
            <App title={title} />
          </FluentProvider>
        );
        console.log("App rendered successfully");
      } catch (error) {
        console.error("Error rendering app:", error);
        root.render(
          <div style={{ padding: "20px", color: "red" }}>
            <h2>Error Loading Add-in</h2>
            <pre>{error instanceof Error ? error.message + "\n" + error.stack : String(error)}</pre>
          </div>
        );
      }
    }).catch((error) => {
      console.error("Office.onReady error:", error);
      root.render(
        <div style={{ padding: "20px", color: "red" }}>
          <h2>Office.js Initialization Failed</h2>
          <pre>{error instanceof Error ? error.message : String(error)}</pre>
          <p>Please ensure you're running this add-in in Microsoft Word.</p>
        </div>
      );
    });
  } else {
    console.error("Office.js not loaded!");
    root.render(
      <div style={{ padding: "20px", color: "red" }}>
        <h2>Office.js Not Available</h2>
        <p>This add-in must be run within Microsoft Word.</p>
        <p>If you're testing, please use the "npm start" command to load in Word.</p>
      </div>
    );
  }

  if ((module as any).hot) {
    (module as any).hot.accept("./components/App", () => {
      const NextApp = require("./components/App").default;
      root.render(
        <FluentProvider theme={minimalLightTheme}>
          <NextApp title={title} />
        </FluentProvider>
      );
    });
  }
}