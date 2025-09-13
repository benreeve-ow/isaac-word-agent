import express from "express";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables from root .env file FIRST
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Import routes AFTER env vars are loaded
import agentRoutes from "./routes/agent";
import textRoutes from "./routes/text";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ["https://localhost:3001", "https://localhost:3000"],
  credentials: true
}));
app.use(express.json());

// Routes - Organized by function
app.use("/api/agent", agentRoutes);  // Agent streaming endpoints
app.use("/api/text", textRoutes);    // Text improvement endpoints

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// HTTPS setup using Office add-in dev certificates
const certPath = path.join(process.env.HOME || "", ".office-addin-dev-certs");
const httpsOptions = {
  key: fs.readFileSync(path.join(certPath, "localhost.key")),
  cert: fs.readFileSync(path.join(certPath, "localhost.crt"))
};

// Start HTTPS server
https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`Mastra Word Agent server running on https://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

export default app;