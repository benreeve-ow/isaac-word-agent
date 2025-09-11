export async function countTokens(payload: { 
  messages: {role:"user"|"assistant"|"system"; content:any}[] 
}) {
  // Simple token estimation: ~4 characters per token
  // This is a rough approximation since the actual API isn't available
  let totalChars = 0;
  
  for (const message of payload.messages) {
    const content = typeof message.content === "string" 
      ? message.content 
      : JSON.stringify(message.content);
    totalChars += content.length;
  }
  
  return Math.ceil(totalChars / 4);
}