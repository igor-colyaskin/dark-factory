// scripts/test-read-app.js
// Tests readApp() — reads SPEC.md from a past app's GitHub repo.
// Usage:
//   node scripts/test-read-app.js <sourceUrl>
//   node scripts/test-read-app.js          (picks first app with sourceUrl from apps.json)

import 'dotenv/config';
import { readFile } from 'fs/promises';
import githubClient from '../server/github-client.js';

async function resolveSourceUrl() {
  const arg = process.argv[2];
  if (arg) return arg;

  // Auto-pick from apps.json
  try {
    const raw = await readFile('state/apps.json', 'utf-8');
    const store = JSON.parse(raw);
    const app = store.apps?.filter(a => a.sourceUrl).at(-1);
    if (app) {
      console.log(`Using app #${app.number} (${app.id}): ${app.sourceUrl}\n`);
      return app.sourceUrl;
    }
  } catch {
    // file may not exist
  }

  return null;
}

async function run() {
  console.log('=== readApp() Test ===\n');

  const sourceUrl = await resolveSourceUrl();

  if (!sourceUrl) {
    console.error('✗ FAIL: No sourceUrl found. Pass URL as argument or create an app with GitHub push first.');
    process.exit(1);
  }

  console.log(`sourceUrl: ${sourceUrl}`);

  const result = await githubClient.readApp(sourceUrl);

  if (!result.success) {
    console.error(`✗ FAIL: readApp failed: ${result.error}`);
    process.exit(1);
  }

  console.log('\n✓ SPEC.md read successfully');
  console.log(`  Length: ${result.spec.length} chars`);
  console.log('\n--- SPEC.md content ---');
  console.log(result.spec);
  console.log('--- end ---');

  // Graceful fallback test
  console.log('\n--- Fallback test (null sourceUrl) ---');
  const nullResult = await githubClient.readApp(null);
  if (!nullResult.success && nullResult.error === 'No sourceUrl provided') {
    console.log('✓ null sourceUrl → graceful failure');
  } else {
    console.error('✗ FAIL: unexpected result for null sourceUrl');
    process.exit(1);
  }

  // Invalid URL test
  const badResult = await githubClient.readApp('https://not-github.com/foo/bar');
  if (!badResult.success && badResult.error === 'Invalid GitHub URL format') {
    console.log('✓ invalid URL → graceful failure');
  } else {
    console.error('✗ FAIL: unexpected result for invalid URL');
    process.exit(1);
  }

  console.log('\nALL CHECKS PASSED');
}

run().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
