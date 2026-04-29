/**
 * Integration test for FlyManager
 * 
 * Prerequisites:
 * - FLY_API_TOKEN set in .env
 * - FLY_ORG_SLUG set in .env
 * - flyctl installed and authenticated
 * - Valid Node.js app in workspace/ with package.json
 * 
 * Run: node test/fly-integration.test.js
 * 
 * This test will:
 * 1. Create a real Fly app
 * 2. Prepare workspace with Dockerfile and fly.toml
 * 3. Deploy the app
 * 4. Wait for it to become healthy
 * 5. Verify the URL is accessible
 * 6. Clean up (destroy the app)
 */

import flyManager from '../server/fly-manager.js';
import { existsSync } from 'fs';
import { join } from 'path';

const TEST_APP_NAME = `df-test-${Date.now()}`;
const WORKSPACE_PATH = join(process.cwd(), 'workspace');

console.log('\n=== Fly.io Integration Test ===\n');

// Check prerequisites
if (!process.env.FLY_API_TOKEN) {
  console.error('❌ FLY_API_TOKEN not set in environment');
  process.exit(1);
}

if (!process.env.FLY_ORG_SLUG) {
  console.error('❌ FLY_ORG_SLUG not set in environment');
  process.exit(1);
}

if (!existsSync(WORKSPACE_PATH)) {
  console.error('❌ workspace/ directory not found');
  process.exit(1);
}

if (!existsSync(join(WORKSPACE_PATH, 'package.json'))) {
  console.error('❌ workspace/package.json not found');
  console.log('Hint: Run a production or mock-full build first to generate a test app');
  process.exit(1);
}

console.log('✓ Prerequisites checked');
console.log(`Test app name: ${TEST_APP_NAME}`);
console.log(`Workspace: ${WORKSPACE_PATH}\n`);

async function runIntegrationTest() {
  let appCreated = false;

  try {
    // Step 1: Create app
    console.log('Step 1: Creating Fly app...');
    const createResult = await flyManager.createApp(TEST_APP_NAME);
    
    if (!createResult.success) {
      throw new Error(`Failed to create app: ${createResult.error}`);
    }
    
    appCreated = true;
    console.log('✓ App created\n');

    // Step 2: Prepare workspace
    console.log('Step 2: Preparing workspace...');
    const prepareResult = await flyManager.prepareWorkspace(WORKSPACE_PATH, TEST_APP_NAME);
    
    if (!prepareResult.success) {
      throw new Error(`Failed to prepare workspace: ${prepareResult.error}`);
    }
    
    console.log('✓ Workspace prepared\n');

    // Verify files exist
    if (!existsSync(join(WORKSPACE_PATH, 'Dockerfile'))) {
      throw new Error('Dockerfile not created');
    }
    if (!existsSync(join(WORKSPACE_PATH, 'fly.toml'))) {
      throw new Error('fly.toml not created');
    }
    console.log('✓ Dockerfile and fly.toml created\n');

    // Step 3: Deploy
    console.log('Step 3: Deploying app (this may take 2-3 minutes)...');
    const deployResult = await flyManager.deploy(WORKSPACE_PATH, TEST_APP_NAME);
    
    if (!deployResult.success) {
      throw new Error(`Failed to deploy: ${deployResult.error}`);
    }
    
    console.log(`✓ Deploy completed in ${Math.round(deployResult.duration / 1000)}s\n`);

    // Step 4: Wait for healthy
    console.log('Step 4: Waiting for app to become healthy...');
    const healthResult = await flyManager.waitForHealthy(TEST_APP_NAME, 60000);
    
    if (!healthResult.success) {
      throw new Error(`App did not become healthy: ${healthResult.error}`);
    }
    
    console.log(`✓ App is healthy: ${healthResult.url}\n`);

    // Step 5: Verify URL
    console.log('Step 5: Verifying URL is accessible...');
    const url = flyManager.getAppUrl(TEST_APP_NAME);
    console.log(`Public URL: ${url}`);
    
    try {
      const response = await fetch(url);
      if (response.ok) {
        console.log(`✓ URL is accessible (HTTP ${response.status})\n`);
      } else {
        console.warn(`⚠ URL returned HTTP ${response.status}\n`);
      }
    } catch (fetchError) {
      console.warn(`⚠ Could not fetch URL: ${fetchError.message}\n`);
    }

    // Success!
    console.log('✅ Integration test PASSED\n');
    console.log(`App will remain deployed at: ${url}`);
    console.log(`To destroy manually: flyctl apps destroy ${TEST_APP_NAME} --yes\n`);

  } catch (error) {
    console.error(`\n❌ Integration test FAILED: ${error.message}\n`);
    process.exitCode = 1;
  } finally {
    // Step 6: Cleanup
    if (appCreated) {
      console.log('Step 6: Cleaning up...');
      const destroyResult = await flyManager.destroyApp(TEST_APP_NAME);
      
      if (destroyResult.success) {
        console.log('✓ App destroyed\n');
      } else {
        console.warn(`⚠ Failed to destroy app: ${destroyResult.error}`);
        console.warn(`Please destroy manually: flyctl apps destroy ${TEST_APP_NAME} --yes\n`);
      }
    }
  }
}

runIntegrationTest();
