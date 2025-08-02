# Word Claude Editor

A Microsoft Word add-in that integrates Claude AI to help users improve their writing with custom instructions, track changes integration, and style matching.

## Features

- ✏️ **Custom AI Instructions** - Enter specific instructions for how Claude should improve your text
- 📝 **Track Changes Integration** - Apply AI suggestions with Word's native track changes
- 🎨 **Style Matching** - Analyze and match your document's writing style
- 📊 **Context Management** - Smart context window handling (up to 140k tokens)
- 🔍 **Real-time Debug Console** - Built-in debugging for troubleshooting

## Quick Start

### Prerequisites

- Node.js 16+ and npm
- Microsoft Word (Desktop or Office 365)
- Anthropic API key

### 1. Set up the Backend

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Create .env file with your Anthropic API key
echo "ANTHROPIC_API_KEY=your-api-key-here" > .env

# Start the HTTPS server
npm start
```

The backend will run on `https://localhost:3000` using the Office add-in certificates.

### 2. Set up the Add-in

```bash
# Navigate to add-in directory
cd addin/WordClaudeEditor

# Install dependencies
npm install

# Start the development server
npm run dev-server
```

The add-in dev server will run on `https://localhost:3001`.

### 3. Load the Add-in in Word

```bash
# In the add-in directory, run:
npm start
```

This will:
1. Start the dev server
2. Open Word
3. Automatically sideload the add-in

## Usage

1. **Select Text** - Highlight text in your Word document
2. **Enter Instructions** - Type your improvement instructions or click an example
3. **Apply Instructions** - Click to send to Claude API
4. **Review Changes** - Preview the improved text with explanations
5. **Apply to Document** - Insert with track changes enabled

### Example Instructions

- "Make this more concise"
- "Expand with more detail"
- "Fix grammar and improve clarity"
- "Make the tone more formal"
- "Turn into bullet points"

## Project Structure

```
word-claude-editor/
├── backend/               # Express.js backend server
│   ├── server-https.js    # HTTPS server (default)
│   ├── server.js          # HTTP server (legacy)
│   ├── routes/            # API routes
│   ├── services/          # Claude API integration
│   └── utils/             # Token counting utilities
└── addin/                 # Word add-in (React/TypeScript)
    └── WordClaudeEditor/
        ├── manifest.xml   # Office add-in manifest
        ├── src/
        │   ├── services/  # WordService & ClaudeService
        │   └── taskpane/  # React components
        └── dist/          # Built files
```

## Debugging

### Built-in Debug Console

The add-in includes a debug console that appears automatically when you use it:

- **Green** - Successful operations
- **Red** - Errors and failures  
- **Blue** - Function boundaries
- **Yellow** - API calls and responses

### Common Issues & Solutions

#### "Load failed" Error

**Cause:** Mixed content blocking (HTTPS add-in calling HTTP backend)

**Solution:** Ensure backend is running with HTTPS:
```bash
cd backend
npm start  # Uses HTTPS by default
```

#### Certificate Warnings

**Solution:** Accept the certificate in your browser:
```bash
open https://localhost:3000/health
```

#### No Text Selected

**Solution:** Select text in Word before clicking "Apply Instructions"

### Testing in Browser

To test the UI without Word:
```bash
open addin/WordClaudeEditor/test-browser.html
```

### VS Code Debugging

1. Open VS Code in `addin/WordClaudeEditor`
2. Press F5 → "Debug in Browser (Chrome)"
3. Set breakpoints in TypeScript files

## API Endpoints

### Backend API

- `GET /health` - Health check
- `POST /api/claude/improve` - Improve text with Claude
  ```json
  {
    "text": "Text to improve",
    "contextBefore": "Previous context",
    "contextAfter": "Following context",
    "userPrompt": "Make it better"
  }
  ```

- `POST /api/claude/implement-comment` - Implement reviewer comments
- `POST /api/claude/analyze-style` - Analyze writing style

## Configuration

### Change System Prompt

1. Click the **Config** tab in the add-in
2. Edit the system prompt to customize Claude's behavior
3. Click **Save Configuration**

### Environment Variables

Create a `.env` file in the backend directory:

```env
ANTHROPIC_API_KEY=sk-ant-api...
PORT=3000  # Optional, defaults to 3000
```

## Development Scripts

### Backend

```bash
npm start        # Start HTTPS server (production)
npm run dev      # Start with nodemon (auto-reload)
npm run start:http  # Start HTTP server (legacy)
```

### Add-in

```bash
npm start        # Load in Word
npm run dev-server  # Start dev server only
npm run build    # Build for production
npm run validate # Validate manifest
```

## Security Notes

- Never commit your `.env` file
- The backend handles the API key, not the frontend
- HTTPS is required for Word add-ins in production
- Certificates are auto-generated for localhost development

## Troubleshooting

### Clear Office Cache (if add-in won't update)

**Mac:**
```bash
rm -rf ~/Library/Containers/com.microsoft.Word/Data/Documents/wef
```

**Windows:**
```bash
rm -rf %LOCALAPPDATA%\Microsoft\Office\16.0\Wef\
```

### Check Backend Health

```bash
curl -k https://localhost:3000/health
```

## Tech Stack

- **Frontend:** React, TypeScript, Fluent UI, Office.js
- **Backend:** Express.js, Anthropic SDK
- **Build:** Webpack, Babel
- **Development:** Office Add-in Dev Tools

## License

MIT