require('dotenv').config();
const express = require('express');
const cors = require('cors');
const claudeRoutes = require('./routes/claude');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests from localhost (any port), Office Add-ins, and null origin (file://)
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
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, true); // For development, allow all origins but log them
    }
  },
  optionsSuccessStatus: 200,
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));

app.use('/api/claude', claudeRoutes);

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`CORS enabled for: localhost (all ports), Office Add-ins, and file:// origins`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
  console.log(`API endpoint: http://localhost:${PORT}/api/claude/improve`);
});