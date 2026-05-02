import { readFile } from 'fs/promises';

const checks = [];

function check(name, passed) {
  checks.push({ name, passed });
  console.log(passed ? `  ✓ ${name}` : `  ✗ FAIL: ${name}`);
}

async function run() {
  console.log('\n=== Phase 7: Delete with Confirmation — Verification ===\n');
  
  const html = await readFile('client/index.html', 'utf-8');
  const appJs = await readFile('client/app.js', 'utf-8');
  const css = await readFile('client/styles.css', 'utf-8');
  
  // HTML checks
  check('HTML: delete-modal exists', html.includes('id="delete-modal"'));
  check('HTML: modal-overlay class', html.includes('class="modal-overlay"'));
  check('HTML: delete-modal-info', html.includes('id="delete-modal-info"'));
  check('HTML: delete-modal-error', html.includes('id="delete-modal-error"'));
  check('HTML: delete-confirm-btn', html.includes('id="delete-confirm-btn"'));
  check('HTML: delete-cancel-btn', html.includes('id="delete-cancel-btn"'));
  check('HTML: confirmDelete onclick', html.includes('onclick="confirmDelete()"'));
  check('HTML: closeDeleteModal onclick', html.includes('onclick="closeDeleteModal()"'));
  
  // JS checks
  check('JS: deleteTargetId variable', appJs.includes('let deleteTargetId'));
  check('JS: handleDeleteClick sets deleteTargetId', appJs.includes('deleteTargetId = appId'));
  check('JS: closeDeleteModal resets deleteTargetId', appJs.includes('deleteTargetId = null'));
  check('JS: confirmDelete calls DELETE endpoint', appJs.includes("method: 'DELETE'"));
  check('JS: confirmDelete removes card from DOM', appJs.includes('card.remove()'));
  check('JS: confirmDelete updates productsCache', appJs.includes('productsCache = productsCache.filter'));
  check('JS: confirmDelete shows empty state', appJs.includes("products-empty"));
  check('JS: error handling shows modal-error', appJs.includes("errorDiv.style.display = 'block'"));
  check('JS: outside click closes modal', appJs.includes("e.target.id === 'delete-modal'"));
  check('JS: loading state — Удаление...', appJs.includes("'Удаление...'"));
  
  // CSS checks
  check('CSS: .modal-overlay', css.includes('.modal-overlay'));
  check('CSS: .modal-content', css.includes('.modal-content'));
  check('CSS: .modal-error', css.includes('.modal-error'));
  check('CSS: .btn-danger', css.includes('.btn-danger'));
  check('CSS: modalIn animation', css.includes('@keyframes modalIn'));
  
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
