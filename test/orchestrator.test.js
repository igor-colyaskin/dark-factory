import orchestrator, { STATES } from '../server/orchestrator.js';

/**
 * Integration test for orchestrator state machine
 * Tests all state transitions with mock agent responses
 */

// Mock agent responses
const mockArchitectResponse = {
  thinking: 'Analyzing requirements and designing architecture...',
  files: [
    {
      path: 'ARCHITECTURE.md',
      content: '# Architecture\n\nThis is a mock architecture document for testing purposes. '.repeat(20),
      action: 'create'
    }
  ],
  questions: [],
  summary: 'Architecture design completed',
  next_steps: ['Proceed with development'],
  cost: 0.25,
  time: 45
};

const mockArchitectWithQuestions = {
  thinking: 'Need clarification on requirements...',
  files: [],
  questions: [
    'Should the application support user authentication?',
    'What database should be used?'
  ],
  summary: 'Need clarification before proceeding',
  next_steps: ['Wait for answers'],
  cost: 0.10,
  time: 20
};

const mockDeveloperResponse = {
  thinking: 'Implementing the application based on architecture...',
  files: [
    {
      path: 'app.js',
      content: `const express = require('express');
const app = express();
const PORT = 3000;

app.get('/', (req, res) => {
  res.send('Hello from mock app!');
});

app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});`,
      action: 'create'
    },
    {
      path: 'package.json',
      content: JSON.stringify({
        name: 'mock-app',
        version: '1.0.0',
        dependencies: {
          express: '^4.18.0'
        }
      }, null, 2),
      action: 'create'
    }
  ],
  questions: [],
  summary: 'Application implemented successfully',
  next_steps: ['Run tests'],
  cost: 0.35,
  time: 90
};

const mockTesterResponse = {
  thinking: 'Reviewing code and running tests...',
  files: [],
  questions: [],
  summary: 'All tests passed, code quality is good',
  next_steps: ['Deploy application'],
  cost: 0.05,
  time: 30
};

// Test utilities
function log(message, data = null) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`[TEST] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('='.repeat(60));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`✓ ${message}`);
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test scenarios
async function testBasicFlow() {
  log('TEST 1: Basic flow without questions');

  // Reset orchestrator
  await orchestrator.reset();
  assert(orchestrator.state === STATES.IDLE, 'Initial state is IDLE');

  // Start order
  const orderDesc = 'Create a simple TODO application';
  await orchestrator.startOrder(orderDesc);
  assert(orchestrator.state === STATES.ARCH_WORKING, 'State is ARCH_WORKING after startOrder');
  assert(orchestrator.orderDescription === orderDesc, 'Order description is saved');

  // Architect completes
  await orchestrator.handleAgentComplete(1, mockArchitectResponse);
  assert(orchestrator.state === STATES.ARCH_REVIEW, 'State is ARCH_REVIEW after architect completes');

  const state1 = orchestrator.getState();
  assert(state1.userStories[0].cost === mockArchitectResponse.cost, 'Architect cost is recorded');
  assert(state1.userStories[0].time === mockArchitectResponse.time, 'Architect time is recorded');

  // User approves architecture
  await orchestrator.handleApproval();
  assert(orchestrator.state === STATES.DEV_WORKING, 'State is DEV_WORKING after approval');
  assert(orchestrator.userStories[0].status === 'done', 'Architecture US is done');
  assert(orchestrator.userStories[1].status === 'running', 'Development US is running');

  // Developer completes
  await orchestrator.handleAgentComplete(2, mockDeveloperResponse);
  assert(orchestrator.state === STATES.DEV_CHECK, 'State is DEV_CHECK after developer completes');

  // AC check passes
  await orchestrator.handleACCheckResult(2, true);
  assert(orchestrator.state === STATES.TEST_RUNNING, 'State is TEST_RUNNING after AC check passes');
  assert(orchestrator.userStories[1].status === 'done', 'Development US is done');
  assert(orchestrator.userStories[2].status === 'running', 'Testing US is running');

  // Tester completes
  await orchestrator.handleAgentComplete(3, mockTesterResponse);
  assert(orchestrator.state === STATES.DELIVERING, 'State is DELIVERING after tester completes');

  // Delivery completes
  await orchestrator.handleDeliveryComplete();
  assert(orchestrator.state === STATES.DONE, 'State is DONE after delivery');

  const finalState = orchestrator.getState();
  assert(finalState.totalCost > 0, 'Total cost is calculated');
  assert(finalState.totalTime > 0, 'Total time is calculated');
  assert(finalState.userStories.every(us => us.status === 'done'), 'All user stories are done');

  log('✓ TEST 1 PASSED: Basic flow completed successfully', finalState);
}

async function testFlowWithQuestions() {
  log('TEST 2: Flow with clarifying questions');

  await orchestrator.reset();
  await orchestrator.startOrder('Create an application');

  // Architect returns questions
  await orchestrator.handleAgentComplete(1, mockArchitectWithQuestions);
  assert(orchestrator.state === STATES.CLARIFYING, 'State is CLARIFYING when agent has questions');
  
  const state = orchestrator.getState();
  assert(state.questions.length === 2, 'Questions are stored');

  // User provides answers
  const answers = [
    'Yes, use JWT authentication',
    'Use PostgreSQL database'
  ];
  await orchestrator.handleAnswers(answers);
  assert(orchestrator.state === STATES.ARCH_WORKING, 'State returns to ARCH_WORKING after answers');
  assert(orchestrator.answers.length === 2, 'Answers are stored');

  log('✓ TEST 2 PASSED: Clarifying questions flow works');
}

async function testACCheckRetry() {
  log('TEST 3: AC check retry mechanism');

  await orchestrator.reset();
  await orchestrator.startOrder('Create an application');

  // Complete architecture
  await orchestrator.handleAgentComplete(1, mockArchitectResponse);
  await orchestrator.handleApproval();

  // Complete development
  await orchestrator.handleAgentComplete(2, mockDeveloperResponse);
  assert(orchestrator.state === STATES.DEV_CHECK, 'State is DEV_CHECK');

  // First AC check fails
  await orchestrator.handleACCheckResult(2, false);
  assert(orchestrator.state === STATES.DEV_WORKING, 'State returns to DEV_WORKING on AC fail');
  assert(orchestrator.retryCount === 1, 'Retry count is 1');

  // Complete development again
  await orchestrator.handleAgentComplete(2, mockDeveloperResponse);

  // Second AC check fails
  await orchestrator.handleACCheckResult(2, false);
  assert(orchestrator.retryCount === 2, 'Retry count is 2');

  // Third AC check fails
  await orchestrator.handleAgentComplete(2, mockDeveloperResponse);
  await orchestrator.handleACCheckResult(2, false);
  assert(orchestrator.retryCount === 3, 'Retry count is 3');

  // Fourth AC check fails - should go to ERROR state
  await orchestrator.handleAgentComplete(2, mockDeveloperResponse);
  await orchestrator.handleACCheckResult(2, false);
  assert(orchestrator.state === STATES.ERROR, 'State is ERROR after max retries');

  log('✓ TEST 3 PASSED: AC check retry mechanism works');
}

async function testStateSubscription() {
  log('TEST 4: State subscription and notifications');

  await orchestrator.reset();

  let notificationCount = 0;
  let lastState = null;

  const unsubscribe = orchestrator.subscribe((state) => {
    notificationCount++;
    lastState = state;
  });

  await orchestrator.startOrder('Test order');
  assert(notificationCount > 0, 'Subscribers are notified');
  assert(lastState !== null, 'State data is provided to subscribers');
  assert(lastState.state === STATES.ARCH_WORKING, 'Correct state in notification');

  unsubscribe();
  const countBefore = notificationCount;
  
  await orchestrator.handleAgentComplete(1, mockArchitectResponse);
  assert(notificationCount === countBefore, 'Unsubscribed listener is not notified');

  log('✓ TEST 4 PASSED: State subscription works');
}

async function testStatePersistence() {
  log('TEST 5: State persistence (save/load)');

  await orchestrator.reset();
  await orchestrator.startOrder('Persistence test');
  await orchestrator.handleAgentComplete(1, mockArchitectResponse);

  const stateBefore = orchestrator.getState();
  await orchestrator.saveState();

  // Simulate restart by resetting and loading
  orchestrator.state = STATES.IDLE;
  orchestrator.orderDescription = '';
  orchestrator.userStories = [];

  await orchestrator.loadState();

  const stateAfter = orchestrator.getState();
  assert(stateAfter.state === stateBefore.state, 'State is restored');
  assert(stateAfter.orderDescription === stateBefore.orderDescription, 'Order description is restored');
  assert(stateAfter.userStories.length === stateBefore.userStories.length, 'User stories are restored');

  log('✓ TEST 5 PASSED: State persistence works');
}

// Run all tests
async function runAllTests() {
  console.log('\n' + '='.repeat(60));
  console.log('ORCHESTRATOR INTEGRATION TESTS');
  console.log('='.repeat(60));

  try {
    await testBasicFlow();
    await sleep(500);

    await testFlowWithQuestions();
    await sleep(500);

    await testACCheckRetry();
    await sleep(500);

    await testStateSubscription();
    await sleep(500);

    await testStatePersistence();
    await sleep(500);

    console.log('\n' + '='.repeat(60));
    console.log('✓ ALL TESTS PASSED');
    console.log('='.repeat(60) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('✗ TEST FAILED');
    console.error('='.repeat(60));
    console.error(error);
    console.error('='.repeat(60) + '\n');

    process.exit(1);
  }
}

// Run tests
runAllTests();
