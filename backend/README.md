# Isaac Backend Server

Express.js backend that provides Claude AI integration for the Isaac Word add-in.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file with your Anthropic API key:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-api-your-key-here" > .env
```

Optional environment variables:
```env
PORT=3000               # Server port (default: 3000)
NODE_ENV=development    # Environment mode
```

### 3. Start the Server

```bash
# Production mode (HTTPS)
npm start

# Development mode (with auto-reload)
npm run dev

# HTTP mode (if HTTPS certificate issues)
npm run start:http
```

The server runs on `https://localhost:3000` by default with Office add-in certificates.

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

Returns server status and version info.

### Text Improvement

```bash
POST /api/claude/improve
```

Improves text using Claude with custom instructions.

**Request Body:**
```json
{
  "text": "Text to improve",
  "contextBefore": "Previous paragraph",
  "contextAfter": "Following paragraph",
  "userPrompt": "Make it more concise",
  "systemPrompt": "You are a helpful editor"
}
```

### Implement Comment

```bash
POST /api/claude/implement-comment
```

Applies reviewer comments to text.

**Request Body:**
```json
{
  "text": "Original text",
  "comment": "Reviewer's comment",
  "context": "Document context",
  "systemPrompt": "System instructions"
}
```

### Style Analysis

```bash
POST /api/claude/analyze-style
```

Analyzes writing style from a document sample.

**Request Body:**
```json
{
  "sampleText": "Sample text for analysis",
  "sampleSize": 1000
}
```

### Agent Streaming

```bash
POST /api/agent/stream
```

Streams agent responses with tool usage via Server-Sent Events (SSE).

**Request Body:**
```json
{
  "messages": [{"role": "user", "content": "Task description"}],
  "documentContext": "Current document content",
  "tools": [/* Tool definitions from frontend */]
}
```

**Response:** Server-Sent Events stream with:
- `tool_use` - Tool execution requests
- `content` - Text responses
- `error` - Error messages
- `done` - Completion signal

## 🏗️ Architecture

### Directory Structure

```
backend/
├── server-https.js      # HTTPS server (default)
├── server-http.js       # HTTP server (fallback)
├── routes/
│   ├── claude.js        # Text improvement endpoints
│   └── agent.js         # Agent streaming endpoint
├── services/
│   ├── anthropic.js     # Claude API client
│   └── agent-service.js # Agent orchestration
├── utils/
│   └── tokenCounter.js  # Token estimation
└── certificates/        # HTTPS certificates
```

### Key Features

- **HTTPS by Default**: Uses Office add-in certificates
- **Streaming Support**: Real-time agent responses via SSE
- **Token Management**: Automatic token counting and limits
- **Error Handling**: Comprehensive error responses
- **CORS Configuration**: Proper headers for Word add-in

## 🔧 Configuration

### Token Limits

- Maximum context: 150,000 tokens
- Model: Claude 3.5 Sonnet
- Token estimation: ~4 characters per token

### CORS Settings

Configured to accept requests from:
- `https://localhost:3001` (development)
- `https://localhost:3000` (self-requests)

### SSL Certificates

The server uses Office add-in development certificates located in:
```
~/.office-addin-dev-certs/
```

If certificates are missing, they'll be generated automatically.

## 🐛 Troubleshooting

### Certificate Issues

If you see certificate warnings:
1. Visit `https://localhost:3000/health` in your browser
2. Accept the security warning
3. Restart the server

### Port Already in Use

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>
```

### API Key Issues

- Ensure the key starts with `sk-ant-api`
- Check key validity in Anthropic Console
- Verify `.env` file is in the backend directory

### CORS Errors

If the add-in can't connect:
1. Check the origin header matches `https://localhost:3001`
2. Ensure credentials are included in requests
3. Verify HTTPS is running (not HTTP)

## 📊 Monitoring

### Request Logging

All requests are logged with:
- Timestamp
- Method and path
- Response time
- Status code

### Error Tracking

Errors include:
- Error message
- Stack trace (development mode)
- Token usage (if applicable)

## 🚀 Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use proper SSL certificates
3. Configure firewall rules
4. Set up monitoring
5. Implement rate limiting
6. Add request validation

## 📝 Development

### Running Tests

```bash
# No tests configured yet
npm test
```

### Adding New Endpoints

1. Create route file in `routes/`
2. Add service logic in `services/`
3. Register route in `server-https.js`
4. Update this README

### Debugging

Enable debug logging:
```bash
DEBUG=* npm run dev
```

---

Built with Express.js and Claude AI SDK