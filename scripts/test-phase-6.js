import { readFile } from 'fs/promises';

const checks = [];

function check(name, passed) {
  checks.push({ name, passed });
  console.log(passed ? `  ✓ ${name}` : `  ✗ FAIL: ${name}`);
}

async function run() {
  console.log('\n=== Phase 6: Details Expand — Verification ===\n');
  
  const appJs = await readFile('client/app.js', 'utf-8');
  const css = await readFile('client/styles.css', 'utf-8');
  
  // JS checks
  check('JS: productsCache variable declared', appJs.includes('let productsCache'));
  check('JS: productsCache populated in loadProducts', appJs.includes('productsCache = data.apps'));
  check('JS: handleDetails toggles display', appJs.includes("detailsDiv.style.display"));
  check('JS: handleDetails changes button text to Скрыть', appJs.includes("btn.textContent = 'Скрыть'"));
  check('JS: handleDetails changes button text to Детали', appJs.includes("btn.textContent = 'Детали'"));
  check('JS: handleDetails finds app in productsCache', appJs.includes('productsCache.find'));
  check('JS: handleDetails uses escapeHtml', appJs.includes('escapeHtml(content)'));
  
  // CSS checks
  check('CSS: .app-card-details-content', css.includes('.app-card-details-content'));
  check('CSS: max-height for scroll', css.includes('max-height') && css.includes('overflow-y: auto'));
  check('CSS: monospace font', css.includes("monospace"));
  
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
