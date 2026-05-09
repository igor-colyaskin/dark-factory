/**
 * VerifierB — vision LLM check
 *
 * Contract: verifyVisual(url, spec) → VisionReport
 *
 * Takes a screenshot via puppeteer-core, sends it to a vision LLM with the spec,
 * asks for structured assessment of feature visibility.
 */

import 'dotenv/config';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const API_URL = process.env.LLM_BASE_URL || 'http://localhost:6655/litellm/v1/chat/completions';
const API_KEY = process.env.LLM_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
const VISION_MODEL = 'gemini-2.5-flash';

async function takeScreenshot(url) {
  const { default: puppeteer } = await import('puppeteer-core');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 15000 });
    const screenshot = await page.screenshot({ encoding: 'base64' });
    return screenshot;
  } finally {
    await browser.close();
  }
}

function buildPrompt(spec) {
  const featureList = (spec.features || []).map((f, i) => `${i + 1}. ${f}`).join('\n');
  return `You are verifying a web application screenshot against its specification.

Application summary: ${spec.summary}

Expected features:
${featureList}

Look at the screenshot and assess what is visible in the UI.
Respond with a JSON object (no markdown, no code block) in this exact format:
{
  "overallAssessment": "GOOD" | "ACCEPTABLE" | "NEEDS_WORK" | "FAIL",
  "featuresVisible": [
    { "feature": "<exact feature text>", "visible": true|false, "notes": "<brief observation>" }
  ],
  "uiIssues": ["<issue if any>"],
  "summary": "<2-3 sentence overall assessment>"
}

Rules:
- overallAssessment: GOOD if most features visible and UI is clean; ACCEPTABLE if basics work;
  NEEDS_WORK if key features missing or UI broken; FAIL if app did not load or is completely broken
- For each feature, set visible:true only if you can see UI elements that implement it
- uiIssues: list obvious problems (broken layout, missing elements, errors); empty array if none
- Be concise and factual — no praise, no speculation`;
}

/**
 * @param {string} url - Base URL of the running app
 * @param {object} spec - Architect spec
 * @returns {Promise<object>} VisionReport
 */
async function verifyVisual(url, spec) {
  const report = {
    screenshotTaken: false,
    model: VISION_MODEL,
    analysis: null,
    error: null,
  };

  // 1. Screenshot
  let screenshotBase64;
  try {
    screenshotBase64 = await takeScreenshot(url);
    report.screenshotTaken = true;
  } catch (e) {
    report.error = `Screenshot failed: ${e.message}`;
    return report;
  }

  // 2. Vision LLM call
  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: buildPrompt(spec) },
              { type: 'image_url', image_url: { url: `data:image/png;base64,${screenshotBase64}` } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      const text = await resp.text();
      report.error = `LLM error HTTP ${resp.status}: ${text.slice(0, 200)}`;
      return report;
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content || '';

    // Parse JSON — model should return raw JSON per prompt instructions
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      report.error = `Could not parse JSON from LLM response: ${raw.slice(0, 200)}`;
      return report;
    }

    report.analysis = JSON.parse(jsonMatch[0]);
  } catch (e) {
    report.error = `LLM call failed: ${e.message}`;
  }

  return report;
}

export default { verifyVisual };
