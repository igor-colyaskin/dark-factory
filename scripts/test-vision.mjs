/**
 * Phase 0: Test Hyperspace image/vision support
 * Tests both gemini-2.5-flash and claude-sonnet with a base64 screenshot
 */

import puppeteer from 'puppeteer-core';
import { readFileSync } from 'fs';
import 'dotenv/config';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_URL = process.env.LLM_BASE_URL || 'http://localhost:6655/litellm/v1/chat/completions';
const API_KEY = process.env.LLM_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || 'test';

const MODELS = [
  'gemini-2.5-flash',
  'anthropic--claude-4.6-sonnet',
];

async function takeScreenshot() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 800, height: 600 });
  // Simple test page — no network needed
  await page.setContent(`
    <html><body style="font-family:sans-serif;padding:40px;background:#f0f0f0">
      <h1 style="color:#333">Dark Factory Test Page</h1>
      <p>This is a <strong>vision test</strong> screenshot.</p>
      <ul>
        <li>Item one</li>
        <li>Item two</li>
        <li>Item three</li>
      </ul>
      <button style="padding:10px 20px;background:blue;color:white;border:none;border-radius:4px">Test Button</button>
    </body></html>
  `);
  const screenshot = await page.screenshot({ encoding: 'base64' });
  await browser.close();
  return screenshot;
}

async function testVision(model, screenshotBase64) {
  const payload = {
    model,
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: 'What do you see in this screenshot? Name 3 elements briefly.',
          },
          {
            type: 'image_url',
            image_url: { url: `data:image/png;base64,${screenshotBase64}` },
          },
        ],
      },
    ],
  };

  const start = Date.now();
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const elapsed = Date.now() - start;

  if (!resp.ok) {
    const text = await resp.text();
    return { ok: false, error: `HTTP ${resp.status}: ${text.slice(0, 200)}`, elapsed };
  }

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '(empty)';
  return { ok: true, content, elapsed };
}

// --- main ---
console.log('Phase 0: Hyperspace vision support test\n');
console.log(`API: ${API_URL}`);
console.log(`Key: ${API_KEY ? API_KEY.slice(0, 8) + '...' : '(not set)'}\n`);

let screenshotBase64;
try {
  process.stdout.write('Taking screenshot... ');
  screenshotBase64 = await takeScreenshot();
  console.log(`✓ (${Math.round(screenshotBase64.length * 0.75 / 1024)} KB)\n`);
} catch (e) {
  console.log(`✗ FAIL: ${e.message}`);
  process.exit(1);
}

let passed = 0;
for (const model of MODELS) {
  process.stdout.write(`Testing ${model}... `);
  const result = await testVision(model, screenshotBase64);
  if (result.ok) {
    console.log(`✓ (${result.elapsed}ms)`);
    console.log(`  Response: ${result.content.slice(0, 150)}\n`);
    passed++;
  } else {
    console.log(`✗ FAIL`);
    console.log(`  Error: ${result.error}\n`);
  }
}

console.log('---');
if (passed === MODELS.length) {
  console.log(`ALL CHECKS PASSED (${passed}/${MODELS.length} models support vision)`);
} else if (passed > 0) {
  console.log(`PARTIAL: ${passed}/${MODELS.length} models support vision`);
} else {
  console.log(`FAIL: 0/${MODELS.length} models support vision — VerifierB blocked`);
}
