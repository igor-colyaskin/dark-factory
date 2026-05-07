/**
 * Test Verifier (compositor) against a running local app
 *
 * Usage: node scripts/test-verifier.mjs
 */

import verifier from '../server/verifier.js';

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

console.log('Verifier (compositor) test\n');
console.log(`URL: ${URL}\n`);

const t0 = Date.now();
const report = await verifier.run(URL, SPEC);
const elapsed = Date.now() - t0;

// Structural
const s = report.structural;
const sIcon = s.ok ? '✓' : '✗';
console.log(`${sIcon} Structural: HTTP ${s.status} ${s.latency}ms HTML:${s.isHtml}${s.error ? ' error:' + s.error : ''}`);

// Features (VerifierA)
console.log('\nFeatures (VerifierA):');
for (const f of report.features) {
  console.log(`  ${f.found ? '✓' : '✗'} ${f.feature}`);
  console.log(`      ${f.detail}`);
}

// Vision (VerifierB)
if (report.vision) {
  const v = report.vision;
  console.log(`\nVision (${v.model}): ${v.overallAssessment}`);
  console.log(`Summary: ${v.summary}`);
  console.log('Features visible:');
  for (const f of v.featuresVisible) {
    console.log(`  ${f.visible ? '✓' : '✗'} ${f.feature}`);
    if (f.notes) console.log(`      ${f.notes}`);
  }
  if (v.uiIssues?.length) {
    console.log('UI Issues:');
    for (const i of v.uiIssues) console.log(`  ! ${i}`);
  }
} else {
  console.log(`\nVision: skipped${report.visionError ? ' — ' + report.visionError : ''}`);
}

console.log(`\n--- Verdict: ${report.verdict} (${elapsed}ms) ---`);
