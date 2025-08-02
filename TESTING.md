# Testing Guide for Word Claude Editor

## Prerequisites
- Ensure you have your Anthropic API key in `backend/.env`
- Microsoft Word installed (desktop or web version)
- Node.js 16+ installed

## Step 1: Start the Backend Server

```bash
cd backend
npm install  # If not already done
npm start
```

The backend should start on http://localhost:3000

### Test the Backend API

1. **Health Check**:
```bash
curl http://localhost:3000/health
```
Expected: `{"status":"healthy","timestamp":"..."}`

2. **Test Text Improvement**:
```bash
curl -X POST http://localhost:3000/api/claude/improve \
  -H "Content-Type: application/json" \
  -d '{
    "text": "This is bad text that need improvement.",
    "systemPrompt": "Fix grammar and improve clarity"
  }'
```

Expected: JSON with `improvedText` and `explanation`

## Step 2: Start the Word Add-in

In a new terminal:

```bash
cd addin/WordClaudeEditor
npm install  # If not already done
npm run dev-server
```

The add-in dev server should start on https://localhost:3001

### Test the Add-in in Browser

1. Open https://localhost:3001/taskpane.html in your browser
2. Accept any certificate warnings
3. You should see the Word Claude Editor interface with two tabs

## Step 3: Load Add-in in Word (Desktop)

### Option A: Auto-sideload (Recommended)
```bash
cd addin/WordClaudeEditor
npm start
```
This will:
- Start the dev server
- Automatically open Word
- Sideload the add-in

### Option B: Manual Sideload
1. Open Word
2. Go to Insert → Add-ins → My Add-ins
3. Click "Shared Folder" tab
4. Select "Word Claude Editor"
5. Click "Add"

## Step 4: Test the Complete Integration

### In Word with the Add-in:

1. **Test Selection Detection**:
   - Type some text in Word: "This is bad text that need improvement."
   - Select the text
   - In the add-in panel, click "Check Selection"
   - Should show: "Selected X characters"

2. **Test Text Improvement**:
   - Select text in Word
   - Click "Improve Selected Text"
   - Should show loading state
   - Should receive improved text from Claude API

3. **Test Configuration**:
   - Switch to Config tab
   - Modify system prompt
   - Click "Save Configuration"
   - Settings should persist

## Step 5: Test Error Scenarios

1. **No Text Selected**:
   - Click "Improve Selected Text" without selecting text
   - Should show error: "Please select some text to improve"

2. **Backend Not Running**:
   - Stop the backend server
   - Try to improve text
   - Should show network error

3. **Invalid API Key**:
   - Temporarily change API key in backend/.env
   - Restart backend
   - Try to improve text
   - Should show API error

## Troubleshooting

### Common Issues and Solutions:

1. **Certificate Errors**:
   - Browser: Click "Advanced" → "Proceed to localhost"
   - Word: Trust the certificate in system keychain

2. **Port Already in Use**:
   ```bash
   # Find process using port 3000
   lsof -i :3000
   # Kill the process
   kill -9 <PID>
   ```

3. **Add-in Not Loading in Word**:
   - Clear Office cache: `rm -rf ~/Library/Containers/com.microsoft.Word/Data/Documents/wef`
   - Restart Word
   - Try sideloading again

4. **CORS Errors**:
   - Verify backend CORS allows `https://localhost:3001`
   - Check backend/server.js CORS configuration

5. **API Connection Failed**:
   - Verify backend is running on port 3000
   - Check if API key is valid in backend/.env
   - Check browser console for detailed errors

## Quick Test Commands

Run all these in sequence for a complete test:

```bash
# Terminal 1: Start backend
cd backend
npm start

# Terminal 2: Test backend API
curl http://localhost:3000/health
curl -X POST http://localhost:3000/api/claude/improve \
  -H "Content-Type: application/json" \
  -d '{"text": "Test text here"}'

# Terminal 3: Start add-in
cd addin/WordClaudeEditor
npm start

# This opens Word with the add-in loaded
```

## Expected Results

✅ Backend server runs on port 3000
✅ Health endpoint returns JSON status
✅ Improve API returns improved text with explanation
✅ Add-in dev server runs on port 3001
✅ Add-in loads in Word
✅ Can select text and get improvements
✅ Configuration saves and persists
✅ Error messages display appropriately

## Development Tips

- Keep browser DevTools open to see console logs
- Use Word's Developer tab for add-in debugging
- Monitor backend logs for API requests
- Test with various text lengths and styles