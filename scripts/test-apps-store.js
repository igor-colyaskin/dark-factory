import appsStore from '../server/apps-store.js';

/**
 * Test script for apps-store module
 * Run with: node scripts/test-apps-store.js
 */

async function runTests() {
  console.log('=== Testing apps-store module ===\n');

  try {
    // Step 1: Initialize
    console.log('1. Initializing apps-store...');
    await appsStore.init();
    console.log('   ✓ Initialized\n');

    // Step 2: Add 3 test apps
    console.log('2. Adding 3 test apps...');
    
    const app1 = await appsStore.addApp({
      id: 'df-test-1',
      flyAppName: 'df-test-1',
      order: 'Create a simple todo app',
      architectOutput: 'Mock architect output for app 1',
      url: 'https://df-test-1.fly.dev',
      metrics: {
        totalCost: 0.15,
        totalTime: 45,
        agents: {
          architect: { cost: 0.05, time: 15 },
          developer: { cost: 0.07, time: 20 },
          tester: { cost: 0.03, time: 10 }
        }
      }
    });
    console.log(`   ✓ Added app 1: ${app1.id} (number: ${app1.number})`);

    const app2 = await appsStore.addApp({
      id: 'df-test-2',
      flyAppName: 'df-test-2',
      order: 'Create a weather dashboard',
      architectOutput: 'Mock architect output for app 2',
      url: 'https://df-test-2.fly.dev',
      metrics: {
        totalCost: 0.22,
        totalTime: 60,
        agents: {
          architect: { cost: 0.08, time: 20 },
          developer: { cost: 0.10, time: 30 },
          tester: { cost: 0.04, time: 10 }
        }
      }
    });
    console.log(`   ✓ Added app 2: ${app2.id} (number: ${app2.number})`);

    const app3 = await appsStore.addApp({
      id: 'df-test-3',
      flyAppName: 'df-test-3',
      order: 'Create a calculator app',
      architectOutput: 'Mock architect output for app 3',
      url: 'https://df-test-3.fly.dev',
      metrics: {
        totalCost: 0.18,
        totalTime: 50,
        agents: {
          architect: { cost: 0.06, time: 15 },
          developer: { cost: 0.08, time: 25 },
          tester: { cost: 0.04, time: 10 }
        }
      }
    });
    console.log(`   ✓ Added app 3: ${app3.id} (number: ${app3.number})\n`);

    // Step 3: Get all apps
    console.log('3. Getting all apps...');
    const allApps = await appsStore.getAllApps();
    console.log(`   ✓ Found ${allApps.length} apps (sorted by createdAt DESC):`);
    allApps.forEach(app => {
      console.log(`     - ${app.id} (number: ${app.number}, created: ${app.createdAt})`);
    });
    console.log();

    // Step 4: Get specific app
    console.log('4. Getting app "df-test-2"...');
    const specificApp = await appsStore.getApp('df-test-2');
    if (specificApp) {
      console.log(`   ✓ Found app:`);
      console.log(`     - ID: ${specificApp.id}`);
      console.log(`     - Number: ${specificApp.number}`);
      console.log(`     - Order: ${specificApp.order}`);
      console.log(`     - URL: ${specificApp.url}`);
      console.log(`     - Total Cost: $${specificApp.metrics.totalCost}`);
    } else {
      console.log('   ✗ App not found');
    }
    console.log();

    // Step 5: Delete app
    console.log('5. Deleting app "df-test-2"...');
    const deleted = await appsStore.deleteApp('df-test-2');
    if (deleted) {
      console.log('   ✓ App deleted successfully\n');
    } else {
      console.log('   ✗ App not found\n');
    }

    // Step 6: Get all apps again
    console.log('6. Getting all apps again (should be 2 now)...');
    const remainingApps = await appsStore.getAllApps();
    console.log(`   ✓ Found ${remainingApps.length} apps:`);
    remainingApps.forEach(app => {
      console.log(`     - ${app.id} (number: ${app.number})`);
    });
    console.log();

    // Step 7: Test duplicate prevention
    console.log('7. Testing duplicate prevention (trying to add df-test-1 again)...');
    try {
      await appsStore.addApp({
        id: 'df-test-1',
        flyAppName: 'df-test-1',
        order: 'Duplicate test',
        architectOutput: 'Should fail',
        url: 'https://df-test-1-duplicate.fly.dev',
        metrics: {}
      });
      console.log('   ✗ ERROR: Duplicate was allowed!\n');
    } catch (error) {
      console.log(`   ✓ Duplicate prevented: ${error.message}\n`);
    }

    console.log('=== All tests completed successfully! ===');

  } catch (error) {
    console.error('\n✗ Test failed with error:', error);
    process.exit(1);
  }
}

runTests();
