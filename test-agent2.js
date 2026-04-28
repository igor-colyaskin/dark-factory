import 'dotenv/config';

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: 'Respond with valid JSON: {"thinking":"2-3 sentences about TODO app architecture","files":[{"path":"file1.js","description":"..."},{"path":"file2.js","description":"..."}],"summary":"brief summary"}. Make descriptions detailed, at least 3-4 sentences each. Include at least 5 files.'
    }]
  })
});

const raw = await response.text();
const data = JSON.parse(raw);

console.log('HTTP Status:', response.status);
console.log('Finish reason:', data.choices?.[0]?.finish_reason);
console.log('Content length:', data.choices?.[0]?.message?.content?.length);
console.log('Tokens:', data.usage?.completion_tokens);
console.log('Content:', data.choices?.[0]?.message?.content);