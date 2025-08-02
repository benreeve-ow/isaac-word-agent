require('dotenv').config();
const express = require('express');
const cors = require('cors');
const claudeRoutes = require('./routes/claude');

const app = express();
const PORT = process.env.PORT || 3000;

const corsOptions = {
  origin: 'https://localhost:3001',
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
  console.log(`CORS enabled for: https://localhost:3001`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});