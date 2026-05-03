/**
 * Calibration test for Architect Prompt v2
 *
 * Runs 10 test orders against the real API and checks:
 * - Correct mode (clarify vs spec)
 * - Valid JSON structure
 *
 * Usage: node scripts/test-architect-v2.js
 * Requires: OPENROUTER_API_KEY in .env
 * Estimated cost: ~$2–5 (10 calls to Claude Opus)
 */

import 'dotenv/config';
import agentManager from '../server/agent-manager.js';
import architectPrompts from '../server/prompts/architect.js';

const TEST_CASES = [
  // --- 3× Clear orders → expect "spec" ---
  {
    name: 'Clear: TODO app',
    order: 'Simple TODO application where users can add, complete, and delete tasks',
    expectedMode: 'spec',
    history: [],
    round: 0
  },
  {
    name: 'Clear: Calculator',
    order: 'A calculator with basic arithmetic: addition, subtraction, multiplication, division. Show result on screen.',
    expectedMode: 'spec',
    history: [],
    round: 0
  },
  {
    name: 'Clear: Pomodoro timer',
    order: 'Pomodoro timer: 25 min work sessions, 5 min breaks. Start, stop, reset buttons. Show remaining time.',
    expectedMode: 'spec',
    history: [],
    round: 0
  },

  // --- 3× Ambiguous orders → expect "clarify" ---
  {
    name: 'Ambiguous: manage work',
    order: 'An application for managing work',
    expectedMode: 'clarify',
    history: [],
    round: 0
  },
  {
    name: 'Ambiguous: something useful',
    order: 'Make me something simple and useful',
    expectedMode: 'clarify',
    history: [],
    round: 0
  },
  {
    name: 'Ambiguous: tracker',
    order: 'I need a tracker app',
    expectedMode: 'clarify',
    history: [],
    round: 0
  },

  // --- 2× External dependency → expect "clarify" ---
  {
    name: 'External: weather',
    order: 'Show me the current weather forecast for any city I type in',
    expectedMode: 'clarify',
    history: [],
    round: 0
  },
  {
    name: 'External: news',
    order: 'App that shows latest news headlines from around the world',
    expectedMode: 'clarify',
    history: [],
    round: 0
  },

  // --- 2× Repeat call with history → expect "spec" ---
  {
    name: 'Repeat: work mgmt answered',
    order: 'An application for managing work',
    expectedMode: 'spec',
    history: [
      {
        questions: [
          { id: 'q1', text: 'What kind of work items do you want to manage?', answer: 'Daily tasks and to-do items' },
          { id: 'q2', text: 'Do you need user authentication?', answer: 'No, single user, no login' }
        ]
      }
    ],
    round: 1
  },
  {
    name: 'Repeat: tracker answered',
    order: 'I need a tracker app',
    expectedMode: 'spec',
    history: [
      {
        questions: [
          { id: 'q1', text: 'What do you want to track?', answer: 'Daily habits like exercise, reading, and meditation' },
          { id: 'q2', text: 'How should data be stored?', answer: 'In server memory, OK if lost on restart' }
        ]
      }
    ],
    round: 1
  }
];

// --- Validators ---

function validateClarify(content) {
  if (!Array.isArray(content.questions) || content.questions.length === 0) {
    return 'missing or empty questions[]';
  }
  for (const q of content.questions) {
    if (!q.id || !q.text) return `question missing id or text: ${JSON.stringify(q)}`;
    if (!Array.isArray(q.options) || q.options.length < 2) {
      return `question "${q.id}" needs ≥2 options, got ${q.options?.length || 0}`;
    }
  }
  return null; // OK
}

function validateSpec(content) {
  if (!content.appSlug) return 'missing appSlug';
  if (!content.spec) return 'missing spec object';
  const s = content.spec;
  if (!s.summary) return 'missing spec.summary';
  if (!Array.isArray(s.features) || s.features.length === 0) return 'missing or empty spec.features';
  if (!Array.isArray(s.screens) || s.screens.length === 0) return 'missing or empty spec.screens';
  if (!Array.isArray(s.constraints)) return 'missing spec.constraints';
  return null; // OK
}

// --- Main ---

async function runCalibration() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   Architect v2 — Calibration Test        ║');
  console.log('╚══════════════════════════════════════════╝\n');
  console.log(`Test cases: ${TEST_CASES.length}`);
  console.log(`Model: anthropic/claude-opus-4`);
  console.log(`Exit criterion: ≥ 9 passed\n`);

  let passed = 0;
  let failed = 0;
  const results = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    const tag = `[${i + 1}/${TEST_CASES.length}]`;

    console.log(`--- ${tag} ${tc.name} ---`);
    console.log(`  Order: "${tc.order.substring(0, 70)}${tc.order.length > 70 ? '…' : ''}"`);
    console.log(`  Expected mode: ${tc.expectedMode}`);

    try {
      const userPrompt = architectPrompts.generateUserPrompt(
        tc.order, tc.history, tc.round, 3
      );

      const result = await agentManager.callAgent(
        'architect',
        architectPrompts.systemPrompt,
        userPrompt,
        { max_tokens: 4000 }
      );

      if (!result.success) {
        console.log(`  ❌ FAIL — API error: ${result.error}\n`);
        failed++;
        results.push({ name: tc.name, status: 'FAIL', reason: `API: ${result.error}` });
        continue;
      }

      const content = result.content;
      const actualMode = content.mode;

      // Validate mode
      const modeOk = actualMode === tc.expectedMode;

      // Validate structure
      let structError = null;
      if (actualMode === 'clarify') {
        structError = validateClarify(content);
      } else if (actualMode === 'spec') {
        structError = validateSpec(content);
      } else {
        structError = `unknown mode: ${actualMode}`;
      }

      const structOk = !structError;
      const ok = modeOk && structOk;

      if (ok) {
        console.log(`  ✅ PASS — mode=${actualMode}`);
        passed++;
      } else {
        const reasons = [];
        if (!modeOk) reasons.push(`mode=${actualMode} (expected ${tc.expectedMode})`);
        if (!structOk) reasons.push(`struct: ${structError}`);
        console.log(`  ❌ FAIL — ${reasons.join('; ')}`);
        failed++;
      }

      // Details
      if (actualMode === 'clarify' && content.questions) {
        content.questions.forEach(q =>
          console.log(`     Q: ${q.text}  [${q.options?.length || 0} opts]`)
        );
        if (content.progress) console.log(`     Progress: "${content.progress}"`);
      }
      if (actualMode === 'spec' && content.spec) {
        console.log(`     Slug: ${content.appSlug}`);
        console.log(`     Summary: ${content.spec.summary?.substring(0, 80)}…`);
        console.log(`     Features: ${content.spec.features?.length}, Screens: ${content.spec.screens?.length}`);
        if (content.spec.warnings?.length) {
          content.spec.warnings.forEach(w => console.log(`     ⚠ ${w}`));
        }
      }

      console.log(`     Cost: $${(result.cost || 0).toFixed(4)}, Time: ${result.time}s`);
      results.push({
        name: tc.name,
        status: ok ? 'PASS' : 'FAIL',
        reason: ok ? '' : ((!modeOk ? `mode=${actualMode}` : '') + (!structOk ? ` struct:${structError}` : '')),
        cost: result.cost,
        time: result.time
      });

    } catch (err) {
      console.log(`  ❌ FAIL — Exception: ${err.message}`);
      failed++;
      results.push({ name: tc.name, status: 'FAIL', reason: `Exception: ${err.message}` });
    }

    console.log('');

    // Pause between calls
    if (i < TEST_CASES.length - 1) {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // --- Summary ---
  console.log('═══════════════════════════════════════');
  console.log('SUMMARY\n');

  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : '❌';
    console.log(`  ${icon} ${r.name}${r.reason ? ' — ' + r.reason : ''}`);
  });

  const totalCost = results.reduce((s, r) => s + (r.cost || 0), 0);
  const totalTime = results.reduce((s, r) => s + (r.time || 0), 0);

  console.log(`\n  Passed: ${passed} / ${TEST_CASES.length}`);
  console.log(`  Cost:   $${totalCost.toFixed(4)}`);
  console.log(`  Time:   ${totalTime}s`);

  const met = passed >= 9;
  console.log(`\n  Exit criterion (≥9): ${met ? '✅ MET' : '❌ NOT MET'}`);

  if (!met) {
    console.log('\n  → Review failed cases, adjust system prompt, re-run.');
  }

  console.log('');
}

runCalibration().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});