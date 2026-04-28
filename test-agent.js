import 'dotenv/config';

const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'anthropic/claude-sonnet-4',
    max_tokens: 1000,
    messages: [{
      role: 'user',
      content: 'Respond with valid JSON only: {"status":"ok","count":3,"items":["a","b","c"]}'
    }]
  })
});

console.log('HTTP Status:', response.status);

const raw = await response.text();
console.log('Raw response length:', raw.length);
console.log('Raw response:', raw);

try {
  const data = JSON.parse(raw);
  console.log('Content:', data.choices?.[0]?.message?.content);
} catch (e) {
  console.log('Parse error:', e.message);
}