import flyManager from '../server/fly-manager.js';

/**
 * Cleanup script to delete all test apps from Fly.io
 * Run with: node scripts/cleanup-fly-apps.js
 */

const TEST_APPS = [
  'df-8aca3bc1',
  'df-91d37178',
  'df-6827a98b',
  'df-891d7d6d',
  'df-5fc1b690',
  'df-357e2df3',
  'df-f0d428fe',
  'df-e87a5eaa',
  'df-a0b61277',
  'df-1d2e5908',
  'df-0d554cc7',
  'df-5f1232b9',
  'df-aa7910a9',
  'df-d1d02552',
  'df-d00ddb16'
];

async function cleanup() {
  console.log(`\n=== Cleaning up ${TEST_APPS.length} test apps from Fly.io ===\n`);
  
  let successCount = 0;
  let failCount = 0;
  let notFoundCount = 0;
  
  for (const appName of TEST_APPS) {
    try {
      console.log(`Deleting ${appName}...`);
      const result = await flyManager.destroyApp(appName);
      
      if (result.success) {
        console.log(`  ✓ ${appName} deleted`);
        successCount++;
      } else {
        const isNotFound = result.error && 
          result.error.toLowerCase().includes('could not find app');
        
        if (isNotFound) {
          console.log(`  ⊘ ${appName} not found (already deleted)`);
          notFoundCount++;
        } else {
          console.log(`  ✗ ${appName} failed: ${result.error}`);
          failCount++;
        }
      }
    } catch (error) {
      console.log(`  ✗ ${appName} error: ${error.message}`);
      failCount++;
    }
    
    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n=== Cleanup Summary ===`);
  console.log(`✓ Deleted: ${successCount}`);
  console.log(`⊘ Not found: ${notFoundCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`Total: ${TEST_APPS.length}\n`);
  
  if (failCount > 0) {
    console.log('⚠ Some apps failed to delete. Check errors above.');
    process.exit(1);
  } else {
    console.log('✅ All apps cleaned up successfully!');
    process.exit(0);
  }
}

cleanup();
