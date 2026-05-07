/**
 * Test VerifierB against a running local app
 *
 * Usage: start the app first, then run: node scripts/test-verifier-b.mjs
 */

import verifierB from '../server/verifier-b.js';

const URL = 'http://localhost:3100';

const SPEC = {
  summary: 'Simple TODO application',
  features: [
    'Add new tasks with text input',
    'Mark tasks as completed',
    'Delete tasks',
    'Show task count',
  ],
};

console.log('VerifierB test\n');
console.log(`URL: ${URL}\n`);

const t0 = Date.now();
const report = await verifierB.verifyVisual(URL, SPEC);
const elapsed = Date.now() - t0;

if (report.error) {
  console.log(`✗ FAIL: ${report.error}`);
  process.exit(1);
}

console.log(`✓ Screenshot taken: ${report.screenshotTaken}`);
console.log(`✓ Model: ${report.model} (${elapsed}ms)\n`);

const a = report.analysis;
console.log(`Overall: ${a.overallAssessment}`);
console.log(`Summary: ${a.summary}\n`);

console.log('Features:');
let visible = 0;
for (const f of a.featuresVisible) {
  const mark = f.visible ? '✓' : '✗';
  console.log(`  ${mark} ${f.feature}`);
  if (f.notes) console.log(`      ${f.notes}`);
  if (f.visible) visible++;
}

if (a.uiIssues?.length) {
  console.log('\nUI Issues:');
  for (const issue of a.uiIssues) console.log(`  ! ${issue}`);
}

console.log('\n---');
const passed = report.screenshotTaken && a.overallAssessment !== 'FAIL';
console.log(passed
  ? `ALL CHECKS PASSED — ${a.overallAssessment}, features visible ${visible}/${a.featuresVisible.length}`
  : `FAIL — ${report.error || a.overallAssessment}`
);
