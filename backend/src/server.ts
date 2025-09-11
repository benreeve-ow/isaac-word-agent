import express from "express";
import cors from "cors";
import https from "https";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import agentRoutes from "./routes/agent";
import toolRoutes from "./routes/tools";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: ["https://localhost:3001", "https://localhost:3000"],
  credentials: true
}));
app.use(express.json());

// Routes
app.use("/agent", agentRoutes);
app.use("/", toolRoutes);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// HTTPS setup using Office add-in certificates
const certPath = path.join(process.cwd(), "..", "addin", "WordClaudeEditor", "certs");
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