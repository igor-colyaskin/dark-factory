// scripts/test-architect-prompt.js
// Smoke test: verify generateUserPrompt output for reference mode.
// Run: node scripts/test-architect-prompt.js

import { generateUserPrompt } from '../server/prompts/architect.js';

const MOCK_SPEC = `# Specification — Todo App

## Summary
Simple TODO application with in-memory storage

## Features
- Add new tasks
- Mark tasks as completed
- Delete tasks

## Constraints
- Node.js + Express backend
- Vanilla HTML/CSS/JS frontend`;

console.log('=== Architect Prompt Test ===\n');
let passed = 0;
let failed = 0;

// 1. Normal order (no reference) — unchanged behaviour
{
  const prompt = generateUserPrompt('Сделай TODO-приложение');
  if (prompt.includes('## Order') && prompt.includes('Сделай TODO-приложение') && !prompt.includes('Reference')) {
    console.log('✓ Normal order — no reference section');
    passed++;
  } else {
    console.error('✗ FAIL: Normal order prompt looks wrong');
    console.error(prompt);
    failed++;
  }
}

// 2. Reference order — prefix stripped, spec included
{
  const prompt = generateUserPrompt('На основе #19: добавь фильтр по статусу', [], 0, 3, MOCK_SPEC);
  const prefixStripped = !prompt.includes('На основе #19:');
  const modificationShown = prompt.includes('добавь фильтр по статусу');
  const specIncluded = prompt.includes('Simple TODO application');
  const baselineSection = prompt.includes('## Reference Spec (baseline)');

  if (prefixStripped && modificationShown && specIncluded && baselineSection) {
    console.log('✓ Reference order — prefix stripped, spec and baseline section present');
    passed++;
  } else {
    console.error('✗ FAIL: Reference order prompt looks wrong');
    if (!prefixStripped)    console.error('  - prefix NOT stripped');
    if (!modificationShown) console.error('  - modification text missing');
    if (!specIncluded)      console.error('  - spec content missing');
    if (!baselineSection)   console.error('  - ## Reference Spec section missing');
    failed++;
  }
}

// 3. Empty modification after stripping prefix — falls back to original
{
  const prompt = generateUserPrompt('На основе #19:', [], 0, 3, MOCK_SPEC);
  // Should not crash, order section should be non-empty
  if (prompt.includes('## Order') && prompt.includes('## Reference Spec')) {
    console.log('✓ Empty modification after prefix strip — no crash');
    passed++;
  } else {
    console.error('✗ FAIL: Empty modification case broken');
    failed++;
  }
}

// 4. Reference with clarify history
{
  const history = [{ questions: [{ id: 'q1', text: 'Add filters?', answer: 'Yes' }] }];
  const prompt = generateUserPrompt('На основе #19: добавь фильтр', history, 1, 3, MOCK_SPEC);
  if (prompt.includes('## Clarifications So Far') && prompt.includes('## Reference Spec')) {
    console.log('✓ Reference with clarify history — both sections present');
    passed++;
  } else {
    console.error('✗ FAIL: Reference + history prompt broken');
    failed++;
  }
}

console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : `${failed} of ${passed + failed} FAILED`}`);
if (failed > 0) process.exit(1);
