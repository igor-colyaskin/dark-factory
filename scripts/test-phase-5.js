import { readFile } from 'fs/promises';

const checks = [];

function check(name, passed) {
  checks.push({ name, passed });
  console.log(passed ? `  ✓ ${name}` : `  ✗ FAIL: ${name}`);
}

async function run() {
  console.log('\n=== Phase 5: Products List — Verification ===\n');
  
  const appJs = await readFile('client/app.js', 'utf-8');
  const css = await readFile('client/styles.css', 'utf-8');
  
  // JS checks
  check('JS: loadProducts fetches /api/my-apps', appJs.includes("fetch('/api/my-apps')"));
  check('JS: renderAppCard function', appJs.includes('function renderAppCard('));
  check('JS: formatDate function', appJs.includes('function formatDate('));
  check('JS: escapeHtml function', appJs.includes('function escapeHtml('));
  check('JS: handleDetails placeholder', appJs.includes('function handleDetails('));
  check('JS: handleDeleteClick placeholder', appJs.includes('function handleDeleteClick('));
  check('JS: loadProducts called on DONE', appJs.includes('loadProducts()'));
  check('JS: productsEmpty toggle', appJs.includes("productsEmpty.style.display"));
  
  // CSS checks
  check('CSS: .app-card', css.includes('.app-card'));
  check('CSS: .app-card-header', css.includes('.app-card-header'));
  check('CSS: .app-card-number', css.includes('.app-card-number'));
  check('CSS: .app-card-actions', css.includes('.app-card-actions'));
  check('CSS: .btn-sm', css.includes('.btn-sm'));
  check('CSS: .btn-danger-outline', css.includes('.btn-danger-outline'));
  
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
