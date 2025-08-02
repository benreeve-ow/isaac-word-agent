function estimateTokens(text) {
  if (!text) return 0;
  
  const textLength = text.length;
  const estimatedTokens = Math.ceil(textLength / 4);
  
  return estimatedTokens;
}

function estimateTokensForMessages(messages) {
  if (!messages || !Array.isArray(messages)) return 0;
  
  let totalTokens = 0;
  
  for (const message of messages) {
    if (message.content) {
      totalTokens += estimateTokens(message.content);
    }
    totalTokens += 4;
  }
  
  return totalTokens;
}

function checkTokenLimit(text, maxTokens = 150000) {
  const tokens = estimateTokens(text);
  return {
    tokens,
    withinLimit: tokens <= maxTokens,
    percentUsed: (tokens / maxTokens) * 100
  };
}

module.exports = {
  estimateTokens,
  estimateTokensForMessages,
  checkTokenLimit
};