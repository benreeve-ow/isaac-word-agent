# Word Claude Editor - Backend

Express.js backend server that provides Claude AI integration for the Word add-in.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and add your API key:

```bash
cp .env.example .env
```

Edit `.env` and add your Anthropic API key:
```env
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=3000
NODE_ENV=development
```

### 3. Start the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Documentation

### Health Check

**GET** `/health`

Returns server status.

```bash
curl http://localhost:3000/health
```

### Improve Text

**POST** `/api/claude/improve`

Improves text with AI assistance.

```bash
curl -X POST http://localhost:3000/api/claude/improve \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is text that needs improvement.",
    "contextBefore": "Previous paragraph for context.",
    "contextAfter": "Following paragraph for context.",
    "systemPrompt": "You are a helpful writing assistant.",
    "stylePrompt": "Write in a professional, concise style."
  }'
```

### Implement Comment

**POST** `/api/claude/implement-comment`

Implements reviewer comments on text.

```bash
curl -X POST http://localhost:3000/api/claude/implement-comment \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Original text here.",
    "comment": "Please make this more concise",
    "context": "This is part of a technical document",
    "systemPrompt": "You are a helpful editor."
  }'
```

### Analyze Style

**POST** `/api/claude/analyze-style`

Analyzes writing style from a sample.

```bash
curl -X POST http://localhost:3000/api/claude/analyze-style \
  -H "Content-Type: application/json" \
  -d '{
    "sampleText": "Long sample of text to analyze for style...",
    "sampleSize": 500
  }'
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad Request (missing parameters, token limit exceeded)
- `429` - Rate Limited
- `500` - Server Error

Error response format:
```json
{
  "error": "Error message",
  "details": "Additional details (dev mode only)",
  "estimatedTokens": 12345,
  "maxTokens": 150000
}
```

## Token Limits

- Maximum combined tokens: 150,000
- Token estimation: characters / 4
- Includes text, context, and prompts

## Development

### Project Structure

```
backend/
├── server.js           # Express server setup
├── routes/
│   └── claude.js      # API route handlers
├── services/
│   └── anthropic.js   # Claude API integration
├── utils/
│   └── tokenCounter.js # Token estimation
├── .env.example       # Environment template
└── package.json       # Dependencies
```

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon

### Dependencies

- `express` - Web framework
- `cors` - CORS middleware
- `dotenv` - Environment variables
- `@anthropic-ai/sdk` - Claude API client

## Testing

### Manual Testing with cURL

Test the health endpoint:
```bash
curl http://localhost:3000/health
```

Test text improvement:
```bash
curl -X POST http://localhost:3000/api/claude/improve \
  -H "Content-Type: application/json" \
  -d '{"text": "Test text"}'
```

### Testing with Postman

Import the following collection:

```json
{
  "info": {
    "name": "Word Claude Editor API"
  },
  "item": [
    {
      "name": "Health Check",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/health"
      }
    },
    {
      "name": "Improve Text",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/claude/improve",
        "body": {
          "mode": "raw",
          "raw": {
            "text": "This is some text to improve.",
            "systemPrompt": "You are a helpful assistant."
          }
        }
      }
    }
  ]
}
```

## Troubleshooting

### Server won't start
- Check if port 3000 is already in use
- Verify .env file exists and has valid API key
- Check Node.js version (16+ required)

### API key errors
- Ensure ANTHROPIC_API_KEY is set in .env
- Verify the key starts with `sk-ant-`
- Check key permissions and validity

### CORS errors
- Verify origin is `https://localhost:3001`
- Check CORS configuration in server.js
- Ensure credentials are included in requests

### Rate limiting
- Implement exponential backoff
- Monitor usage in Anthropic dashboard
- Consider caching frequent requests