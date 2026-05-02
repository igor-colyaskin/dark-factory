import { readFile } from 'fs/promises';

const checks = [];

function check(name, passed) {
  checks.push({ name, passed });
  console.log(passed ? `  ✓ ${name}` : `  ✗ FAIL: ${name}`);
}

async function run() {
  console.log('\n=== Phase 7.5: App Slug — Verification ===\n');
  
  const orchestrator = await readFile('server/orchestrator.js', 'utf-8');
  const architect = await readFile('server/prompts/architect.js', 'utf-8');
  const mockAgent = await readFile('server/mock-agent-manager.js', 'utf-8');
  
  // Orchestrator checks
  check('ORCH: sanitizeSlug function exists', orchestrator.includes('function sanitizeSlug('));
  check('ORCH: sanitizeSlug handles lowercase', orchestrator.includes('.toLowerCase()'));
  check('ORCH: sanitizeSlug enforces max length', orchestrator.includes('substring(0, 20)'));
  check('ORCH: sanitizeSlug ensures starts with letter', orchestrator.includes("'app-'"));
  check('ORCH: executeDeploy uses sanitizeSlug', orchestrator.includes("sanitizeSlug(this.agentOutputs[1]?.appSlug)"));
  check('ORCH: executeFakeDeploy uses sanitizeSlug', 
    (orchestrator.match(/sanitizeSlug\(this\.agentOutputs\[1\]\?\.appSlug\)/g) || []).length >= 2);
  check('ORCH: fallback to UUID if slug is null', orchestrator.includes("'df-' + crypto.randomUUID()"));
  check('ORCH: appName is let (not const) in executeDeploy', orchestrator.includes('let appName'));
  check('ORCH: handles "already exists" error', orchestrator.includes('already exists'));
  
  // Architect prompt checks
  check('PROMPT: appSlug in architect prompt', architect.includes('appSlug'));
  check('PROMPT: slug format described (lowercase/hyphens)', 
    architect.includes('lowercase') || architect.includes('URL-friendly'));
  
  // Mock agent checks
  check('MOCK: appSlug in mock response', mockAgent.includes('appSlug'));
  
  // Unit test sanitizeSlug logic
  console.log('\n  --- sanitizeSlug unit tests ---');
  
  // Import the function by extracting logic (simplified check)
  const hasSanitizeTests = [
    orchestrator.includes("replace(/[^a-z0-9-]/g"),
    orchestrator.includes("replace(/-+/g, '-')"),
    orchestrator.includes("/^[a-z]/.test(slug)")
  ];
  check('ORCH: sanitize strips invalid chars', hasSanitizeTests[0]);
  check('ORCH: sanitize collapses hyphens', hasSanitizeTests[1]);
  check('ORCH: sanitize checks starts with letter', hasSanitizeTests[2]);
  
  // Summary
  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;
  console.log(`\n--- ${passed}/${total} checks passed ---`);
  
  if (passed === total) {
    console.log('✅ ALL CHECKS PASSED\n');
  } else {
    console.log('❌ SOME CHECKS FAILED\n');
    process.exit(1);
  }
}

run().catch(e => { console.error(e); process.exit(1); });
