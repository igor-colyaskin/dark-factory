import { readFile } from 'fs/promises';

const checks = [];

function check(name, passed) {
  checks.push({ name, passed });
  console.log(passed ? `  ✓ ${name}` : `  ✗ FAIL: ${name}`);
}

async function run() {
  console.log('\n=== Phase 4: Tabs UI — Verification ===\n');
  
  const html = await readFile('client/index.html', 'utf-8');
  const appJs = await readFile('client/app.js', 'utf-8');
  const css = await readFile('client/styles.css', 'utf-8');
  
  // HTML checks
  check('HTML: tabs-nav exists', html.includes('class="tabs-nav"'));
  check('HTML: tab-btn order', html.includes('data-tab="order"'));
  check('HTML: tab-btn products', html.includes('data-tab="products"'));
  check('HTML: page-order wrapper', html.includes('id="page-order"'));
  check('HTML: page-products wrapper', html.includes('id="page-products"'));
  check('HTML: products-list container', html.includes('id="products-list"'));
  check('HTML: products-empty state', html.includes('id="products-empty"'));
  check('HTML: go-to-order-link', html.includes('id="go-to-order-link"'));
  check('HTML: page-products hidden by default', html.includes('id="page-products" class="page" style="display: none;"'));
  
  // JS checks
  check('JS: setupTabs function', appJs.includes('function setupTabs()'));
  check('JS: switchTab function', appJs.includes('function switchTab('));
  check('JS: loadProducts function', appJs.includes('async function loadProducts()'));
  check('JS: setupTabs() called in init', appJs.includes('setupTabs()'));
  
  // CSS checks
  check('CSS: .tabs-nav', css.includes('.tabs-nav'));
  check('CSS: .tab-btn', css.includes('.tab-btn'));
  check('CSS: .tab-btn.active', css.includes('.tab-btn.active'));
  check('CSS: .products-empty', css.includes('.products-empty'));
  check('CSS: .products-block', css.includes('.products-block'));
  
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
