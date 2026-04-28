import 'dotenv/config';
import agentManager from '../server/agent-manager.js';
import architectPrompts from '../server/prompts/architect.js';
import developerPrompts from '../server/prompts/developer.js';
import testerPrompts from '../server/prompts/tester.js';

/**
 * Manual test for all three agents
 * Tests that each agent returns valid JSON response
 */

const TEST_ORDER = 'Create a simple TODO application where users can add, complete, and delete tasks.';

function log(message, data = null) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`[TEST] ${message}`);
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
  console.log('='.repeat(70));
}

function validateResponse(agentName, response) {
  const errors = [];

  if (!response.success) {
    errors.push(`Agent call failed: ${response.error}`);
    return errors;
  }

  const content = response.content;

  // Validate required fields
  if (!content.thinking) {
    errors.push('Missing "thinking" field');
  }

  if (!Array.isArray(content.files)) {
    errors.push('Missing or invalid "files" field (must be array)');
  }

  if (!content.summary) {
    errors.push('Missing "summary" field');
  }

  // Agent-specific validations
  if (agentName === 'architect') {
    const archFile = content.files?.find(f => f.path === 'ARCHITECTURE.md');
    if (!archFile) {
      errors.push('Architect must include ARCHITECTURE.md in files list');
    }
    // Architect no longer includes content, only path and description
    if (content.files?.some(f => f.content)) {
      errors.push('Architect should not include "content" field in files (only path and description)');
    }
  }

  if (agentName === 'developer') {
    if (!content.files || content.files.length === 0) {
      errors.push('Developer must create at least one file');
    }

    // Check for main server file
    const hasServerFile = content.files?.some(f => 
      f.path === 'app.js' || f.path === 'index.js' || f.path === 'server.js'
    );
    if (!hasServerFile) {
      errors.push('Developer must create main server file (app.js, index.js, or server.js)');
    }
  }

  if (agentName === 'tester') {
    if (content.files && content.files.length > 0) {
      errors.push('Tester should not create files (files array should be empty)');
    }
  }

  return errors;
}

async function testArchitect() {
  log('Testing ARCHITECT agent');

  const systemPrompt = architectPrompts.systemPrompt;
  const userPrompt = architectPrompts.generateUserPrompt(TEST_ORDER);

  console.log('\n📤 Calling Architect agent...');
  console.log(`Model: anthropic/claude-opus-4`);
  console.log(`Order: ${TEST_ORDER}`);

  const response = await agentManager.callAgentWithRetry(
    'architect',
    systemPrompt,
    userPrompt,
    { temperature: 0.7, max_tokens: 8000 }
  );

  console.log(`\n✓ Response received`);
  console.log(`Cost: $${response.cost.toFixed(4)}`);
  console.log(`Time: ${response.time}s`);
  console.log(`Tokens: ${response.usage.prompt_tokens || 0} in, ${response.usage.completion_tokens || 0} out`);

  // Validate response
  const errors = validateResponse('architect', response);

  if (errors.length > 0) {
    console.error('\n❌ VALIDATION ERRORS:');
    errors.forEach(err => console.error(`  - ${err}`));
    return false;
  }

  console.log('\n✓ Response is valid');
  console.log(`\nThinking: ${response.content.thinking.substring(0, 200)}...`);
  console.log(`\nSummary: ${response.content.summary}`);
  console.log(`\nFiles created: ${response.content.files.length}`);
  response.content.files.forEach(f => {
    if (f.content) {
      console.log(`  - ${f.path} (${f.content.length} chars)`);
    } else {
      console.log(`  - ${f.path}: ${f.description || 'no description'}`);
    }
  });

  if (response.content.questions && response.content.questions.length > 0) {
    console.log(`\nQuestions: ${response.content.questions.length}`);
    response.content.questions.forEach((q, i) => {
      console.log(`  ${i + 1}. ${q}`);
    });
  }

  return response;
}

async function testDeveloper(architectOutput) {
  log('Testing DEVELOPER agent');

  const systemPrompt = developerPrompts.systemPrompt;
  const userPrompt = developerPrompts.generateUserPrompt(TEST_ORDER, architectOutput.content);

  console.log('\n📤 Calling Developer agent...');
  console.log(`Model: anthropic/claude-sonnet-4`);

  const response = await agentManager.callAgentWithRetry(
    'developer',
    systemPrompt,
    userPrompt,
    { temperature: 0.7, max_tokens: 16000 }
  );

  console.log(`\n✓ Response received`);
  console.log(`Cost: $${response.cost.toFixed(4)}`);
  console.log(`Time: ${response.time}s`);
  console.log(`Tokens: ${response.usage.prompt_tokens || 0} in, ${response.usage.completion_tokens || 0} out`);

  // Validate response
  const errors = validateResponse('developer', response);

  if (errors.length > 0) {
    console.error('\n❌ VALIDATION ERRORS:');
    errors.forEach(err => console.error(`  - ${err}`));
    return false;
  }

  console.log('\n✓ Response is valid');
  console.log(`\nThinking: ${response.content.thinking.substring(0, 200)}...`);
  console.log(`\nSummary: ${response.content.summary}`);
  console.log(`\nFiles created: ${response.content.files.length}`);
  response.content.files.forEach(f => {
    console.log(`  - ${f.path} (${f.content.length} chars)`);
  });

  return response;
}

async function testTester(architectOutput, developerOutput) {
  log('Testing TESTER agent');

  const systemPrompt = testerPrompts.systemPrompt;
  const userPrompt = testerPrompts.generateUserPrompt(
    TEST_ORDER,
    architectOutput.content,
    developerOutput.content
  );

  console.log('\n📤 Calling Tester agent...');
  console.log(`Model: google/gemini-2.0-flash-exp:free`);

  const response = await agentManager.callAgentWithRetry(
    'tester',
    systemPrompt,
    userPrompt,
    { temperature: 0.7, max_tokens: 8000 }
  );

  console.log(`\n✓ Response received`);
  console.log(`Cost: $${response.cost.toFixed(4)}`);
  console.log(`Time: ${response.time}s`);
  console.log(`Tokens: ${response.usage.prompt_tokens || 0} in, ${response.usage.completion_tokens || 0} out`);

  // Validate response
  const errors = validateResponse('tester', response);

  if (errors.length > 0) {
    console.error('\n❌ VALIDATION ERRORS:');
    errors.forEach(err => console.error(`  - ${err}`));
    return false;
  }

  console.log('\n✓ Response is valid');
  console.log(`\nThinking: ${response.content.thinking.substring(0, 200)}...`);
  console.log(`\nSummary: ${response.content.summary}`);
  console.log(`\nNext steps: ${response.content.next_steps.length}`);
  response.content.next_steps.forEach((step, i) => {
    console.log(`  ${i + 1}. ${step}`);
  });

  return response;
}

async function runTests() {
  console.log('\n' + '='.repeat(70));
  console.log('AGENT INTEGRATION TESTS');
  console.log('Testing all three agents with real OpenRouter API calls');
  console.log('='.repeat(70));

  try {
    // Test Architect
    const architectResult = await testArchitect();
    if (!architectResult) {
      throw new Error('Architect test failed');
    }

    await sleep(2000); // Pause between API calls

    // Test Developer
    const developerResult = await testDeveloper(architectResult);
    if (!developerResult) {
      throw new Error('Developer test failed');
    }

    await sleep(2000); // Pause between API calls

    // Test Tester
    const testerResult = await testTester(architectResult, developerResult);
    if (!testerResult) {
      throw new Error('Tester test failed');
    }

    // Summary
    log('TEST SUMMARY');
    const totalCost = architectResult.cost + developerResult.cost + testerResult.cost;
    const totalTime = architectResult.time + developerResult.time + testerResult.time;

    console.log(`\n✓ All agents returned valid JSON responses`);
    console.log(`\nTotal Cost: $${totalCost.toFixed(4)}`);
    console.log(`Total Time: ${totalTime}s`);
    console.log(`\nArchitect: $${architectResult.cost.toFixed(4)} (${architectResult.time}s)`);
    console.log(`Developer: $${developerResult.cost.toFixed(4)} (${developerResult.time}s)`);
    console.log(`Tester: $${testerResult.cost.toFixed(4)} (${testerResult.time}s)`);

    console.log('\n' + '='.repeat(70));
    console.log('✓ ALL TESTS PASSED');
    console.log('='.repeat(70) + '\n');

    process.exit(0);
  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('✗ TEST FAILED');
    console.error('='.repeat(70));
    console.error(error);
    console.error('='.repeat(70) + '\n');

    process.exit(1);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Run tests
runTests();
