/**
 * Test mock-agent-manager v2 responses.
 * No API key needed — purely local.
 *
 * Usage: node scripts/test-mock-v2.js
 */

import 'dotenv/config';

// Force mock mode
process.env.RUN_MODE = 'mock-fast';

const { default: mockAgent } = await import('../server/mock-agent-manager.js');

const TESTS = [
  {
    name: 'Clear order (todo) → spec',
    agent: 'architect',
    prompt: '## Order\n\nSimple TODO application\n\nAnalyze this order.',
    expect: { mode: 'spec', hasSpec: true }
  },
  {
    name: 'Clear order (calculator) → spec',
    agent: 'architect',
    prompt: '## Order\n\nA calculator app\n\nAnalyze this order.',
    expect: { mode: 'spec', hasSpec: true }
  },
  {
    name: 'Ambiguous order → clarify',
    agent: 'architect',
    prompt: '## Order\n\nAn app for managing work\n\nAnalyze this order.',
    expect: { mode: 'clarify', hasQuestions: true }
  },
  {
    name: 'Repeat call with history → spec',
    agent: 'architect',
    prompt: '## Order\n\nAn app\n\n## Clarifications So Far\n\nRound 1:\n  Q: What?\n  A: Tasks\n\nProduce a spec.',
    expect: { mode: 'spec', hasSpec: true }
  },
  {
    name: 'Developer → has files',
    agent: 'developer',
    prompt: 'anything',
    expect: { hasFiles: true }
  },
  {
    name: 'Tester → has summary',
    agent: 'tester',
    prompt: 'anything',
    expect: { hasSummary: true }
  }
];

let passed = 0;
let failed = 0;

for (const t of TESTS) {
  const result = await mockAgent.callAgent(t.agent, '', t.prompt, {});

  const checks = [];

  if (!result.success) {
    checks.push('API call failed: ' + result.error);
  } else {
    const c = result.content;

    if (t.expect.mode && c.mode !== t.expect.mode) {
      checks.push('mode=' + c.mode + ' (expected ' + t.expect.mode + ')');
    }
    if (t.expect.hasSpec && (!c.spec || !c.spec.summary)) {
      checks.push('missing spec.summary');
    }
    if (t.expect.hasQuestions && (!Array.isArray(c.questions) || c.questions.length === 0)) {
      checks.push('missing questions');
    }
    if (t.expect.hasQuestions && Array.isArray(c.questions)) {
      for (const q of c.questions) {
        if (!q.id || !q.text || !Array.isArray(q.options) || q.options.length < 2) {
          checks.push('invalid question structure: ' + q.id);
        }
      }
    }
    if (t.expect.hasFiles && (!Array.isArray(c.files) || c.files.length === 0)) {
      checks.push('missing files');
    }
    if (t.expect.hasSummary && !c.summary) {
      checks.push('missing summary');
    }
  }

  if (checks.length === 0) {
    console.log('  ✅ ' + t.name);
    passed++;
  } else {
    console.log('  ❌ ' + t.name + ' — ' + checks.join('; '));
    failed++;
  }
}

console.log('\n  Passed: ' + passed + ' / ' + TESTS.length);

if (failed === 0) {
  console.log('  ALL CHECKS PASSED');
} else {
  console.log('  ' + failed + ' FAILED');
  process.exit(1);
}