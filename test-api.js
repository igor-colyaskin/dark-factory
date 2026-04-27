const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    max_tokens: 50,
    messages: [{ role: 'user', content: 'Say OK' }]
  })
});

const data = await response.json();
console.log('Status:', response.status);
console.log('Response:', data.choices?.[0]?.message?.content);
console.log('Cost:', data.usage);