require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const fs = require('fs');
const path = require('path');
const claudeRoutes = require('./routes/claude');
const agentRoutes = require('./routes/agent');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from localhost (any port), Office Add-ins, and null origin
    const allowedPatterns = [
      /^https?:\/\/localhost(:\d+)?$/,
      /^https:\/\/localhost(:\d+)?$/,
      /^file:\/\//,
      /^ms-word:/,
      /^https:\/\/.*\.officeapps\.live\.com$/
    ];
    
    // Allow requests with no origin (like from Word desktop app)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedPatterns.some(pattern => pattern.test(origin));
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.log(`CORS request from origin: ${origin}`);
      callback(null, true); // For development, allow all origins
    }
  },
  optionsSuccessStatus: 200,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

// Log all incoming requests for debugging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} from ${req.get('origin') || 'no-origin'}`);
  next();
});

app.use('/api/claude', claudeRoutes);
app.use('/api', agentRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Try to use the same certificates as the add-in dev server
const certPath = path.join(require('os').homedir(), '.office-addin-dev-certs');
let httpsOptions = null;

try {
  httpsOptions = {
    key: fs.readFileSync(path.join(certPath, 'localhost.key')),
    cert: fs.readFileSync(path.join(certPath, 'localhost.crt'))
  };
  console.log('✅ Using Office Add-in dev certificates for HTTPS');
} catch (err) {
  console.error('❌ Could not load Office Add-in certificates from:', certPath);
  console.error('   Error:', err.message);
  console.error('\n📝 To fix this, run the following commands:');
  console.error('   cd /Users/reeve/Documents/Dev/word-claude-editor/addin/WordClaudeEditor');
  console.error('   npx office-addin-dev-certs install');
  console.error('\nThen restart the backend server.\n');
  process.exit(1);
}

// Create HTTPS server
https.createServer(httpsOptions, app).listen(PORT, () => {
  console.log(`🔐 HTTPS Server running on https://localhost:${PORT}`);
  console.log(`📋 CORS enabled for: all localhost ports and Office Add-ins`);
  console.log(`❤️  Health check: https://localhost:${PORT}/health`);
  console.log(`🚀 API endpoint: https://localhost:${PORT}/api/claude/improve`);
  console.log('\n⚠️  Note: If you see certificate warnings, accept the certificate in your browser');
  console.log(`   Visit https://localhost:${PORT}/health and accept the certificate\n`);
});