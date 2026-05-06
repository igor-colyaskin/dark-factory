// scripts/test-reference-detection.js
// Tests reference detection logic from Phase 2 (v0.5 REMEMBER).
// Run: node scripts/test-reference-detection.js

import 'dotenv/config';
import appsStore from '../server/apps-store.js';
import githubClient from '../server/github-client.js';

// Replicates orchestrator.resolveReferenceSpec() logic
async function resolveReferenceSpec(orderDescription) {
  const match = orderDescription.match(/^На основе #(\d+):/);
  if (!match) return null;

  const refNumber = parseInt(match[1], 10);

  try {
    const apps = await appsStore.getAllApps();
    const refApp = apps.find(a => a.number === refNumber);

    if (!refApp) return { error: `app #${refNumber} not found` };
    if (!refApp.sourceUrl) return { error: `app #${refNumber} has no sourceUrl` };

    const result = await githubClient.readApp(refApp.sourceUrl);
    if (!result.success) return { error: result.error };

    return { spec: result.spec };
  } catch (err) {
    return { error: err.message };
  }
}

async function run() {
  console.log('=== Reference Detection Test ===\n');
  let passed = 0;
  let failed = 0;

  // 1. No prefix → null
  {
    const result = await resolveReferenceSpec('Сделай TODO-приложение');
    if (result === null) {
      console.log('✓ No prefix → null');
      passed++;
    } else {
      console.error('✗ FAIL: No prefix should return null, got:', result);
      failed++;
    }
  }

  // 2. Non-existent app number
  {
    const result = await resolveReferenceSpec('На основе #99999: сделай то же самое');
    if (result?.error?.includes('not found')) {
      console.log('✓ Non-existent #99999 → graceful error');
      passed++;
    } else {
      console.error('✗ FAIL: expected not found error, got:', result);
      failed++;
    }
  }

  // 3. Valid reference — find last app with sourceUrl
  {
    const apps = await appsStore.getAllApps();
    const refApp = apps.find(a => a.sourceUrl);
    if (!refApp) {
      console.log('⚠ SKIP: No app with sourceUrl found in apps.json — skipping live reference test');
    } else {
      const result = await resolveReferenceSpec(`На основе #${refApp.number}: сделай то же, но кнопки синие`);
      if (result?.spec && result.spec.length > 0) {
        console.log(`✓ Valid reference #${refApp.number} → spec loaded (${result.spec.length} chars)`);
        passed++;
      } else {
        console.error(`✗ FAIL: expected spec content, got:`, result);
        failed++;
      }
    }
  }

  // 4. App without sourceUrl
  {
    const apps = await appsStore.getAllApps();
    const noUrlApp = apps.find(a => !a.sourceUrl);
    if (!noUrlApp) {
      console.log('⚠ SKIP: No app without sourceUrl — skipping null sourceUrl test');
    } else {
      const result = await resolveReferenceSpec(`На основе #${noUrlApp.number}: изменить цвет`);
      if (result?.error?.includes('no sourceUrl')) {
        console.log(`✓ App #${noUrlApp.number} (no sourceUrl) → graceful error`);
        passed++;
      } else {
        console.error('✗ FAIL: expected no sourceUrl error, got:', result);
        failed++;
      }
    }
  }

  console.log(`\n${failed === 0 ? 'ALL CHECKS PASSED' : `${failed} of ${passed + failed} FAILED`}`);
  if (failed > 0) process.exit(1);
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
