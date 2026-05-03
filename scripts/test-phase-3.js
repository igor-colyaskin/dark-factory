/**
 * Phase 3 test: orchestrator negotiate loop.
 * Tests state transitions for clarify → spec → approve/cancel flows.
 *
 * Usage: node scripts/test-phase-3.js
 */

import orchestrator, { STATES } from '../server/orchestrator.js';

let passed = 0;
let failed = 0;

function check(name, condition) {
  if (condition) {
    console.log('  ✅ ' + name);
    passed++;
  } else {
    console.log('  ❌ ' + name);
    failed++;
  }
}

// --- Test 1: Clear order path (spec immediately) ---
console.log('\n--- Test 1: Clear order → SPEC_REVIEW → Approve → DEV_WORKING ---');

await orchestrator.reset();
check('Initial state is IDLE', orchestrator.state === STATES.IDLE);

await orchestrator.startOrder('Simple TODO app');
check('After startOrder: ARCH_WORKING', orchestrator.state === STATES.ARCH_WORKING);

// Simulate architect returning spec
await orchestrator.handleAgentComplete(1, {
  mode: 'spec',
  appSlug: 'todo-app',
  spec: { summary: 'TODO app', features: ['Add tasks'], screens: ['Main'], constraints: [], warnings: [] },
  cost: 0.25,
  time: 10
});
check('After spec: SPEC_REVIEW', orchestrator.state === STATES.SPEC_REVIEW);
check('currentSpec is set', orchestrator.currentSpec !== null);
check('currentSpec.summary', orchestrator.currentSpec.summary === 'TODO app');

await orchestrator.handleApproval();
check('After approve: DEV_WORKING', orchestrator.state === STATES.DEV_WORKING);
check('US1 status done', orchestrator.userStories[0].status === 'done');
check('US2 status running', orchestrator.userStories[1].status === 'running');

// --- Test 2: Ambiguous order path (clarify → spec) ---
console.log('\n--- Test 2: Ambiguous → CLARIFYING → answers → ARCH_WORKING → SPEC_REVIEW ---');

await orchestrator.reset();
await orchestrator.startOrder('An app for work');

// Architect asks questions
await orchestrator.handleAgentComplete(1, {
  mode: 'clarify',
  questions: [
    { id: 'q1', text: 'What kind?', options: ['Tasks', 'Notes'], allowOther: true }
  ],
  progress: 'Just checking.',
  cost: 0.20,
  time: 8
});
check('After clarify: CLARIFYING', orchestrator.state === STATES.CLARIFYING);
check('questions stored', orchestrator.questions.length === 1);

// User answers
await orchestrator.handleAnswers([
  { id: 'q1', text: 'What kind?', answer: 'Tasks' }
]);
check('After answers: ARCH_WORKING', orchestrator.state === STATES.ARCH_WORKING);
check('clarifyHistory has 1 entry', orchestrator.clarifyHistory.length === 1);
check('clarifyRound is 1', orchestrator.clarifyRound === 1);

// Architect returns spec on second call
await orchestrator.handleAgentComplete(1, {
  mode: 'spec',
  appSlug: 'task-mgr',
  spec: { summary: 'Task manager', features: ['Add'], screens: ['Main'], constraints: [], warnings: [] },
  cost: 0.25,
  time: 10
});
check('After second spec: SPEC_REVIEW', orchestrator.state === STATES.SPEC_REVIEW);
check('US1 cost accumulated', orchestrator.userStories[0].cost > 0.40);

// --- Test 3: Cancel from SPEC_REVIEW ---
console.log('\n--- Test 3: Cancel from SPEC_REVIEW → IDLE ---');

// Already in SPEC_REVIEW from test 2
await orchestrator.handleCancel();
check('After cancel: IDLE', orchestrator.state === STATES.IDLE);
check('clarifyHistory cleared', orchestrator.clarifyHistory.length === 0);
check('currentSpec cleared', orchestrator.currentSpec === null);
check('orderDescription cleared', orchestrator.orderDescription === '');

// --- Test 4: Cancel from CLARIFYING ---
console.log('\n--- Test 4: Cancel from CLARIFYING → IDLE ---');

await orchestrator.reset();
await orchestrator.startOrder('Something');
await orchestrator.handleAgentComplete(1, {
  mode: 'clarify',
  questions: [{ id: 'q1', text: 'What?', options: ['A', 'B'], allowOther: false }],
  cost: 0.10,
  time: 5
});
check('State is CLARIFYING', orchestrator.state === STATES.CLARIFYING);

await orchestrator.handleCancel();
check('After cancel: IDLE', orchestrator.state === STATES.IDLE);

// --- Test 5: State snapshot includes v0.3 fields ---
console.log('\n--- Test 5: getState() includes v0.3 fields ---');

await orchestrator.reset();
const snapshot = orchestrator.getState();
check('has clarifyHistory', Array.isArray(snapshot.clarifyHistory));
check('has clarifyRound', typeof snapshot.clarifyRound === 'number');
check('has maxClarifyRounds', snapshot.maxClarifyRounds === 3);
check('has currentSpec (null)', snapshot.currentSpec === null);

// --- Summary ---
console.log('\n═══════════════════════════════════════');
console.log('  Passed: ' + passed + ' / ' + (passed + failed));
if (failed === 0) {
  console.log('  ALL CHECKS PASSED');
} else {
  console.log('  ' + failed + ' FAILED');
  process.exit(1);
}