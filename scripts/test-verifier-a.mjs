/**
 * Test VerifierA against a running local app
 *
 * Usage: start the app first (or use /api/my-apps/:id/open),
 * then run: node scripts/test-verifier-a.mjs
 */

import verifierA from '../server/verifier-a.js';

const URL = 'http://localhost:3100';

// Realistic spec matching a TODO app
const SPEC = {
  summary: 'Simple TODO application',
  features: [
    'Add new tasks with text input',
    'Mark tasks as completed',
    'Delete tasks',
    'Show task count',
  ],
  screens: ['Single page: task list with input form at top, task items below'],
  constraints: ['Node.js + Express backend', 'Vanilla HTML/CSS/JS frontend'],
  warnings: ['Data will be lost when server restarts'],
};

console.log('VerifierA test\n');
console.log(`URL: ${URL}`);
console.log(`Features: ${SPEC.features.length}\n`);

const report = await verifierA.verifyStructural(URL, SPEC);

// Print results
if (report.liveness.ok) {
  console.log(`✓ GET / → ${report.liveness.status} (${report.liveness.latency}ms) HTML:${report.isHtml}`);
} else {
  console.log(`✗ GET / FAIL — status:${report.liveness.status} error:${report.liveness.error}`);
}

console.log('\nFeature checks:');
let featPassed = 0;
for (const f of report.features) {
  const mark = f.found ? '✓' : '✗';
  console.log(`  ${mark} ${f.feature}`);
  console.log(`      ${f.detail}`);
  if (f.found) featPassed++;
}

const structural = report.liveness.ok && report.isHtml;
const total = report.features.length;

console.log('\n---');
if (structural && featPassed === total) {
  console.log(`ALL CHECKS PASSED — liveness ✓, features ${featPassed}/${total}`);
} else {
  const issues = [];
  if (!structural) issues.push('liveness FAIL');
  if (featPassed < total) issues.push(`features ${featPassed}/${total}`);
  console.log(`PARTIAL: ${issues.join(', ')}`);
}
