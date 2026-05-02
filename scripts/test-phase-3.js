import fetch from 'node-fetch';
import appsStore from '../server/apps-store.js';

/**
 * Test script for Phase 3 API endpoints
 * Tests GET /api/my-apps, GET /api/my-apps/:id, DELETE /api/my-apps/:id
 * 
 * Prerequisites: Server must be running on http://localhost:3000
 * Run with: node scripts/test-phase-3.js
 */

const BASE_URL = 'http://localhost:3000';
let passedChecks = 0;
let totalChecks = 0;

function check(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`[test]   ✓ ${message}`);
    return true;
  } else {
    console.log(`[test]   ✗ FAIL: ${message}`);
    return false;
  }
}

async function runTests() {
  console.log('[test] === Phase 3 API Endpoints Test ===\n');

  try {
    // Step 1: Test GET /api/my-apps
    console.log('[test] 1. Testing GET /api/my-apps...');
    
    const listResponse = await fetch(`${BASE_URL}/api/my-apps`);
    check(listResponse.status === 200, `GET /api/my-apps returns 200 (got ${listResponse.status})`);
    
    const listData = await listResponse.json();
    check(listData.success === true, 'Response has success: true');
    check(Array.isArray(listData.apps), 'Response has apps array');
    
    console.log(`[test]   Found ${listData.apps.length} apps in archive`);
    console.log();

    // Step 2: Test GET /api/my-apps/:id with nonexistent ID
    console.log('[test] 2. Testing GET /api/my-apps/:id with nonexistent ID...');
    
    const notFoundResponse = await fetch(`${BASE_URL}/api/my-apps/nonexistent-app-12345`);
    check(notFoundResponse.status === 404, `GET nonexistent app returns 404 (got ${notFoundResponse.status})`);
    
    const notFoundData = await notFoundResponse.json();
    check(notFoundData.success === false, 'Response has success: false');
    check(notFoundData.message === 'App not found', 'Response has correct error message');
    console.log();

    // Step 3: Test GET /api/my-apps/:id with existing ID (if any)
    if (listData.apps.length > 0) {
      console.log('[test] 3. Testing GET /api/my-apps/:id with existing ID...');
      
      const testApp = listData.apps[0];
      console.log(`[test]   Using app ID: ${testApp.id}`);
      
      const getResponse = await fetch(`${BASE_URL}/api/my-apps/${testApp.id}`);
      check(getResponse.status === 200, `GET existing app returns 200 (got ${getResponse.status})`);
      
      const getData = await getResponse.json();
      check(getData.success === true, 'Response has success: true');
      check(getData.app !== null && getData.app !== undefined, 'Response has app object');
      check(getData.app.id === testApp.id, `App ID matches (${getData.app.id})`);
      console.log();
    } else {
      console.log('[test] 3. Skipping GET existing app test (no apps in archive)\n');
    }

    // Step 4: Test DELETE /api/my-apps/:id with nonexistent ID
    console.log('[test] 4. Testing DELETE /api/my-apps/:id with nonexistent ID...');
    
    const deleteNotFoundResponse = await fetch(`${BASE_URL}/api/my-apps/nonexistent-app-12345`, {
      method: 'DELETE'
    });
    check(deleteNotFoundResponse.status === 404, `DELETE nonexistent app returns 404 (got ${deleteNotFoundResponse.status})`);
    
    const deleteNotFoundData = await deleteNotFoundResponse.json();
    check(deleteNotFoundData.success === false, 'Response has success: false');
    console.log();

    // Step 5: Create a test app and delete it
    console.log('[test] 5. Testing DELETE /api/my-apps/:id with mock app...');
    
    // Create a test mock app directly in the store
    const testMockApp = await appsStore.addApp({
      id: 'df-mock-test-delete',
      flyAppName: 'df-mock-test-delete',
      createdAt: new Date().toISOString(),
      order: 'Test app for deletion',
      architectOutput: 'Mock architecture',
      url: 'https://df-mock-test-delete.fly.dev',
      metrics: {
        totalCost: 0.10,
        totalTime: 1000,
        agents: {
          arc: { cost: 0.05, time: 500 },
          dev: { cost: 0.05, time: 500 }
        }
      }
    });
    
    console.log(`[test]   Created test app: ${testMockApp.id}`);
    
    // Delete it via API
    const deleteResponse = await fetch(`${BASE_URL}/api/my-apps/${testMockApp.id}`, {
      method: 'DELETE'
    });
    check(deleteResponse.status === 200, `DELETE mock app returns 200 (got ${deleteResponse.status})`);
    
    const deleteData = await deleteResponse.json();
    check(deleteData.success === true, 'Response has success: true');
    check(deleteData.message === 'App deleted', 'Response has correct message');
    
    // Verify it's gone from archive
    const verifyDeleted = await appsStore.getApp(testMockApp.id);
    check(verifyDeleted === null, 'App is removed from archive');
    console.log();

    // Step 6: Show manual testing info
    if (listData.apps.length > 0) {
      console.log('[test] 6. Manual testing information:');
      console.log(`[test]   Available apps for manual DELETE testing:`);
      listData.apps.slice(0, 3).forEach(app => {
        console.log(`[test]     - ${app.id} (${app.url})`);
      });
      console.log(`[test]   To delete: curl -X DELETE ${BASE_URL}/api/my-apps/<id>`);
      console.log();
    }

    // Final summary
    if (passedChecks === totalChecks) {
      console.log(`[test] === ALL CHECKS PASSED (${passedChecks} of ${totalChecks}) ===`);
      process.exit(0);
    } else {
      console.log(`[test] === SOME CHECKS FAILED (${passedChecks} of ${totalChecks}) ===`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n[test] ✗ Test failed with error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/info`);
    if (response.ok) {
      return true;
    }
  } catch (error) {
    return false;
  }
  return false;
}

// Main
(async () => {
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.error('[test] ✗ Server is not running on http://localhost:3000');
    console.error('[test]   Please start the server first: npm start');
    process.exit(1);
  }
  
  await runTests();
})();
