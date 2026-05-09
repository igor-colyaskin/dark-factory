/**
 * Dark Factory v0.1 - Client Application
 * Handles UI interactions and SSE communication with backend
 */
// State
let eventSource = null;
let currentState = null;
let sessionId = null;
let editingSlug = null;
let editingName = null;

// DOM Elements
const orderBlock = document.getElementById('order-block');
const manufacturingBlock = document.getElementById('manufacturing-block');
const pickupBlock = document.getElementById('pickup-block');
const orderForm = document.getElementById('order-form');
const orderInput = document.getElementById('order-input');
const submitOrderBtn = document.getElementById('submit-order-btn');
const usTableBody = document.getElementById('us-table-body');
const totalCost = document.getElementById('total-cost');
const totalTime = document.getElementById('total-time');
const clarifySection = document.getElementById('clarify-section');
const clarifyProgress = document.getElementById('clarify-progress');
const clarifyQuestions = document.getElementById('clarify-questions');
const submitAnswersBtn = document.getElementById('submit-answers-btn');
const specReviewSection = document.getElementById('spec-review-section');
const specContent = document.getElementById('spec-content');
const cancelOrderBtn = document.getElementById('cancel-order-btn');
const refineBtn = document.getElementById('refine-btn');
const submitRefineBtn = document.getElementById('submit-refine-btn');
const refineArea = document.getElementById('refine-area');
const refineInput = document.getElementById('refine-input');
const startDevBtn = document.getElementById('start-dev-btn');
const statusMessage = document.getElementById('status-message');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');

let pendingOrderPrefill = null;
const newOrderBtn = document.getElementById('new-order-btn');
const finalCost = document.getElementById('final-cost');
const finalTime = document.getElementById('final-time');
const finalFiles = document.getElementById('final-files');
const publicUrlSection = document.getElementById('public-url-section');
const publicUrlLink = document.getElementById('public-url-link');
const openPublicBtn = document.getElementById('open-public-btn');
const copyUrlBtn = document.getElementById('copy-url-btn');
const deployErrorSection = document.getElementById('deploy-error-section');
const deployInfo = document.getElementById('deploy-info');
const deployStatusText = document.getElementById('deploy-status-text');

// Routing
const TAB_ROUTES = { order: '/', products: '/my-apps' };

function getTabFromPath(pathname) {
  if (pathname === '/my-apps') return 'products';
  return 'order';
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initSessionId();
  setupEventListeners();
  setupTabs();
  connectSSE();
  initFromUrl();
});

// Route: show correct page on initial load
function initFromUrl() {
  const tab = getTabFromPath(window.location.pathname);
  switchTab(tab, { updateUrl: false });
}

// Route: handle browser back/forward
window.addEventListener('popstate', (e) => {
  const tab = e.state?.page || getTabFromPath(window.location.pathname);
  switchTab(tab, { updateUrl: false });
});

// Initialize or retrieve session ID
function initSessionId() {
  sessionId = localStorage.getItem('df-session-id');

  if (!sessionId) {
    sessionId = crypto.randomUUID();
    localStorage.setItem('df-session-id', sessionId);
    console.log('Generated new session ID:', sessionId);
  } else {
    console.log('Using existing session ID:', sessionId);
  }
}


// Setup Event Listeners
function setupEventListeners() {
  orderForm.addEventListener('submit', handleOrderSubmit);
  submitAnswersBtn.addEventListener('click', handleSubmitAnswers);
  cancelOrderBtn.addEventListener('click', handleCancelOrder);
  refineBtn.addEventListener('click', handleRefineToggle);
  submitRefineBtn.addEventListener('click', handleSubmitRefine);
  startDevBtn.addEventListener('click', handleStartDev);
  newOrderBtn.addEventListener('click', handleNewOrder);
  openPublicBtn.addEventListener('click', handleOpenPublic);
  copyUrlBtn.addEventListener('click', handleCopyUrl);
}

// Setup Tabs
function setupTabs() {
  const tabButtons = document.querySelectorAll('.sidebar-btn');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      switchTab(targetTab);
    });
  });

  // "Go to Order" link inside products empty state
  const goToOrderLink = document.getElementById('go-to-order-link');
  if (goToOrderLink) {
    goToOrderLink.addEventListener('click', (e) => {
      e.preventDefault();
      switchTab('order');
    });
  }
}

// Switch Tab
function switchTab(tabName, { updateUrl = true } = {}) {
  // Update sidebar buttons
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update pages
  document.getElementById('page-order').style.display = tabName === 'order' ? 'block' : 'none';
  document.getElementById('page-products').style.display = tabName === 'products' ? 'block' : 'none';

  // Update URL (only on user-initiated navigation)
  if (updateUrl) {
    history.pushState({ page: tabName }, '', TAB_ROUTES[tabName]);
  }

  // Load cards when switching to that tab
  if (tabName === 'products') {
    loadCards();
  }
}

// ── IC Cards (My Apps) ────────────────────────────────────────────────────────

let cardsCache = [];

async function loadCards() {
  const list = document.getElementById('products-list');
  const empty = document.getElementById('products-empty');
  try {
    const data = await fetch('/api/cards').then(r => r.json());
    if (!Array.isArray(data) || data.length === 0) {
      cardsCache = [];
      list.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    cardsCache = data;
    empty.style.display = 'none';
    list.innerHTML = data.map(renderCardItem).join('');
  } catch (e) {
    console.error('Error loading cards:', e);
    list.innerHTML = '<p class="products-error">Failed to load cards.</p>';
    empty.style.display = 'none';
  }
}

function renderCardItem(card) {
  const created = formatDate(card.createdAt);
  const modified = formatDate(card.lastModified);
  const slug = escapeHtml(card.slug);
  const name = escapeHtml(card.name);
  return `
    <div class="app-card" data-card-slug="${slug}">
      <div class="app-card-header">
        <span class="app-card-id">${name}</span>
        <span class="app-card-date">${created}</span>
      </div>
      <div class="app-card-order" style="font-size:0.85em;color:var(--text-muted)">
        ${slug} &bull; изменено ${modified}
      </div>
      <div class="app-card-actions">
        <button class="btn btn-sm btn-secondary" onclick="handleEditCard('${slug}')">Редактировать</button>
        <button class="btn btn-sm btn-primary" onclick="handlePreviewCard('${slug}')">Preview</button>
        <button class="btn btn-sm btn-danger-outline" onclick="handleDeleteCard('${slug}', '${name}')">Стереть</button>
      </div>
    </div>
  `;
}

function openPreviewWindow() {
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0a0a1a;display:flex;height:100vh;align-items:center;justify-content:center;color:#fff}
    .card{text-align:center;padding:48px 64px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;max-width:420px}
    .logo{font-size:2rem;margin-bottom:8px}
    .title{font-size:1.25rem;font-weight:600;letter-spacing:.02em;margin-bottom:6px}
    .sub{font-size:.85rem;color:rgba(255,255,255,.45);margin-bottom:36px}
    .spinner{width:36px;height:36px;border:3px solid rgba(255,255,255,.12);border-top-color:#4f8ef7;border-radius:50%;animation:sp .8s linear infinite;margin:0 auto 24px}
    @keyframes sp{to{transform:rotate(360deg)}}
    .hint{font-size:.8rem;color:rgba(255,255,255,.3)}
  </style></head><body>
  <div class="card">
    <div class="logo">🏭</div>
    <div class="title">Dark Factory IC</div>
    <div class="sub">Integration Card Preview</div>
    <div class="spinner"></div>
    <div class="hint">Запускаем sandbox, загружаем карточку…</div>
  </div>
  </body></html>`);
  win.document.close();
  return win;
}

async function handlePreviewCard(slug) {
  const btn = document.querySelector(`.app-card[data-card-slug="${slug}"] .btn-primary`);
  if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
  const win = openPreviewWindow();
  try {
    const res = await fetch(`/api/cards/${encodeURIComponent(slug)}/preview`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      win.location.href = data.url;
    } else {
      win.close();
      alert(`Ошибка preview: ${data.message}`);
    }
  } catch (e) {
    win.close();
    alert(`Ошибка: ${e.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Preview'; }
  }
}

async function handleDeleteCard(slug, name) {
  if (!confirm(`Удалить карточку "${name}" (${slug})?\n\nФайлы в cards/${slug}/ будут удалены. Отменить нельзя.`)) return;
  try {
    const res = await fetch(`/api/cards/${encodeURIComponent(slug)}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      const card = document.querySelector(`.app-card[data-card-slug="${slug}"]`);
      if (card) card.remove();
      cardsCache = cardsCache.filter(c => c.slug !== slug);
      if (cardsCache.length === 0) {
        document.getElementById('products-list').innerHTML = '';
        document.getElementById('products-empty').style.display = 'block';
      }
    } else {
      alert(`Не удалось удалить: ${data.message}`);
    }
  } catch (e) {
    alert(`Ошибка: ${e.message}`);
  }
}

// Implemented in Commit 7
function handleEditCard(slug) {
  const card = cardsCache.find(c => c.slug === slug);
  editingSlug = slug;
  editingName = card?.name || slug;

  switchTab('order');

  // Reset order page to clean input state (previous order may have left it in display mode)
  orderForm.style.display = 'flex';
  const orderDisplay = document.getElementById('order-display');
  if (orderDisplay) orderDisplay.style.display = 'none';
  manufacturingBlock.style.display = 'none';
  pickupBlock.style.display = 'none';
  clarifySection.style.display = 'none';
  specReviewSection.style.display = 'none';

  const title = document.getElementById('order-title');
  if (title) title.textContent = `✏️ Редактирование`;

  const banner = document.getElementById('edit-mode-banner');
  if (banner) {
    document.getElementById('edit-mode-card-name').textContent = editingName;
    banner.style.display = 'flex';
  }

  const input = document.getElementById('order-input');
  if (input) {
    input.placeholder = 'Опишите что нужно изменить (например: добавить поле Department, изменить заголовок карточки)…';
    input.value = '';
    input.focus();
  }

  const btn = document.getElementById('submit-order-btn');
  if (btn) btn.textContent = 'Применить изменение';
}

function cancelEditMode() {
  editingSlug = null;
  editingName = null;

  const title = document.getElementById('order-title');
  if (title) title.textContent = '📝 Order';

  const banner = document.getElementById('edit-mode-banner');
  if (banner) banner.style.display = 'none';

  const input = document.getElementById('order-input');
  if (input) {
    input.placeholder = 'Example: Create a simple TODO application where users can add, complete, and delete tasks.';
  }

  const btn = document.getElementById('submit-order-btn');
  if (btn) btn.textContent = 'Submit Order';
}

function handleImportCard() {
  document.getElementById('import-modal').style.display = 'flex';
}

function closeImportModal() {
  document.getElementById('import-modal').style.display = 'none';
  document.getElementById('import-file-input').value = '';
  const err = document.getElementById('import-modal-error');
  err.style.display = 'none';
  err.textContent = '';
}

async function submitImport() {
  const fileInput = document.getElementById('import-file-input');
  const file = fileInput.files[0];
  if (!file) { showImportError('Выберите zip-файл'); return; }

  const btn = document.getElementById('import-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Импорт...';
  document.getElementById('import-modal-error').style.display = 'none';

  const formData = new FormData();
  formData.append('file', file);
  try {
    const res = await fetch('/api/cards/import', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.success) {
      closeImportModal();
      loadCards();
    } else {
      showImportError(data.message || 'Ошибка импорта');
    }
  } catch (e) {
    showImportError(`Ошибка: ${e.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Импортировать';
  }
}

function showImportError(msg) {
  const el = document.getElementById('import-modal-error');
  el.textContent = msg;
  el.style.display = 'block';
}

// ─────────────────────────────────────────────────────────────────────────────

// Connect to SSE
function connectSSE() {
  console.log('Connecting to SSE...');

  eventSource = new EventSource('/events');

  eventSource.onopen = () => {
    console.log('SSE connection established');
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleSSEMessage(data);
    } catch (error) {
      console.error('Error parsing SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    showStatus('Connection error. Retrying...', 'error');

    // Reconnect after 5 seconds
    setTimeout(() => {
      if (eventSource.readyState === EventSource.CLOSED) {
        connectSSE();
      }
    }, 5000);
  };
}

// Handle SSE Messages
function handleSSEMessage(data) {
  console.log('SSE message:', data);

  switch (data.type) {
    case 'connected':
      console.log('Connected to server');
      break;

    case 'heartbeat':
      // Keep-alive, no action needed
      break;

    case 'state_update':
      currentState = data.state;
      updateUI(data.state);
      break;

    case 'deploy_progress':
      handleDeployProgress(data);
      break;

    case 'error':
      showStatus(data.message, 'error');
      hideLoading();
      break;

    default:
      console.log('Unknown message type:', data.type);
  }
}

// Handle deployment progress updates
function handleDeployProgress(data) {
  console.log('Deploy progress:', data.step, data.message);

  // Update active deploy block (no full-screen overlay)
  if (deployStatusText && data.message) {
    deployStatusText.textContent = data.message;
  }
}

// Handle Order Submit
async function handleOrderSubmit(e) {
  e.preventDefault();

  const orderDescription = orderInput.value.trim();

  if (!orderDescription) {
    showStatus('Please describe your application', 'error');
    return;
  }

  showLoading('Submitting your order...');

  try {
    let response;
    if (editingSlug) {
      // Edit mode: call /api/edit/:slug
      response = await fetch(`/api/edit/${encodeURIComponent(editingSlug)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Session-Id': sessionId },
        body: JSON.stringify({ changeRequest: orderDescription })
      });
    } else {
      response = await fetch('/api/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Session-Id': sessionId
        },
        body: JSON.stringify({ description: orderDescription })
      });
    }

    const result = await response.json();

    if (result.success) {
      cancelEditMode();
      showStatus('Order submitted successfully!', 'success');

      // Update order block
      updateOrderBlockAfterSubmit(orderDescription);

      // Show manufacturing block
      manufacturingBlock.style.display = 'block';
      manufacturingBlock.scrollIntoView({ behavior: 'smooth' });
    } else {
      showStatus(result.message || 'Failed to submit order', 'error');
      hideLoading();
    }
  } catch (error) {
    console.error('Error submitting order:', error);
    showStatus('Failed to submit order. Please try again.', 'error');
    hideLoading();
  }
}

// Update Order Block After Submit
function updateOrderBlockAfterSubmit(orderText) {
  // Change title
  const orderTitle = document.getElementById('order-title');
  if (orderTitle) {
    orderTitle.textContent = '📝 Your Order';
  }

  // Hide form
  const orderForm = document.getElementById('order-form');
  if (orderForm) {
    orderForm.style.display = 'none';
  }

  // Show order display
  const orderDisplay = document.getElementById('order-display');
  const orderTextEl = document.getElementById('order-text');
  if (orderDisplay && orderTextEl) {
    orderTextEl.textContent = orderText;

    // Check if text is longer than 2 lines (approximate)
    // If longer, add tooltip with full text
    const lineHeight = 1.5; // from CSS
    const fontSize = 13; // from CSS
    const approxCharsPerLine = 80; // approximate

    if (orderText.length > approxCharsPerLine * 2) {
      orderTextEl.setAttribute('data-full-text', orderText);
      orderTextEl.title = orderText; // Fallback for browsers
    }

    orderDisplay.style.display = 'block';
  }
}


// Handle Open Public URL
function handleOpenPublic() {
  const url = publicUrlLink.href;
  if (url && url !== '#') {
    window.open(url, '_blank');
  }
}

// Handle Copy URL
async function handleCopyUrl() {
  const url = publicUrlLink.href;

  if (!url || url === '#') {
    showStatus('No URL to copy', 'error');
    return;
  }

  try {
    await navigator.clipboard.writeText(url);

    // Change button text temporarily
    const originalText = copyUrlBtn.textContent;
    copyUrlBtn.textContent = '✓ Скопировано';
    copyUrlBtn.disabled = true;

    // Restore after 2 seconds
    setTimeout(() => {
      copyUrlBtn.textContent = originalText;
      copyUrlBtn.disabled = false;
    }, 2000);

    showStatus('URL copied to clipboard', 'success');
  } catch (error) {
    console.error('Error copying URL:', error);
    showStatus('Failed to copy URL', 'error');
  }
}

// Handle New Order
function handleNewOrder() {
  location.reload();
}

// Update UI based on state
function updateUI(state) {
  console.log('Updating UI with state:', state);

  // Update User Stories table
  updateUserStoriesTable(state.userStories);

  // Update totals
  updateTotals(state.totalCost, state.totalTime);

  // Hide all dynamic sections first
  clarifySection.style.display = 'none';
  specReviewSection.style.display = 'none';
  deployInfo.style.display = 'none';

  switch (state.state) {
    case 'IDLE':
      hideLoading();
      // Reset UI to initial state (handles cancel and fresh load)
      manufacturingBlock.style.display = 'none';
      pickupBlock.style.display = 'none';
      // Restore order form
      orderForm.style.display = 'flex';
      var orderDisplay = document.getElementById('order-display');
      if (orderDisplay) orderDisplay.style.display = 'none';
      // Apply prefill from "Повторить с изменениями"
      if (pendingOrderPrefill) {
        orderInput.value = pendingOrderPrefill;
        pendingOrderPrefill = null;
        orderInput.focus();
        orderInput.setSelectionRange(orderInput.value.length, orderInput.value.length);
      }
      break;

    case 'ORDERING':
      showLoading('Processing your order...');
      break;

    case 'ARCH_WORKING':
      showLoading('Architect is analyzing your order...');
      break;

    case 'CLARIFYING':
      hideLoading();
      renderClarifySection(state);
      clarifySection.style.display = 'block';
      break;

    case 'SPEC_REVIEW':
      hideLoading();
      renderSpecReview(state);
      refineArea.style.display = 'none';
      submitRefineBtn.style.display = 'none';
      startDevBtn.style.display = '';
      refineInput.value = '';
      refineBtn.disabled = (state.refineRound >= state.maxRefineRounds);
      specReviewSection.style.display = 'block';
      showStatus('Spec is ready for review', 'info');
      // Update spec-review title for edit mode
      const srTitle = document.getElementById('spec-review-title');
      if (srTitle) srTitle.textContent = state.editMode ? `Редактирование: ${state.editSlug}` : 'Spec Review';
      break;

    case 'DEV_WORKING':
      showLoading('Developer is writing code...');
      break;

    case 'DEV_CHECK':
      showLoading('Checking code quality...');
      break;

    case 'TEST_RUNNING':
      showLoading('Tester is reviewing code...');
      break;

    case 'DELIVERING':
      showLoading('Preparing your application...');
      break;

    case 'DEPLOYING':
      hideLoading();
      deployInfo.style.display = 'block';
      if (deployStatusText) {
        deployStatusText.textContent = 'Starting deployment...';
      }
      break;

    case 'VERIFYING':
      hideLoading();
      deployInfo.style.display = 'block';
      if (deployStatusText) deployStatusText.textContent = 'Верификатор проверяет приложение...';
      document.getElementById('deploy-info-message').innerHTML =
        '🔍 Верификатор открывает приложение, делает скриншот и анализирует соответствие spec.';
      break;

    case 'GITHUB_PUSH':
      hideLoading();
      deployInfo.style.display = 'block';
      if (deployStatusText) deployStatusText.textContent = 'Сохраняю исходный код...';
      break;

    case 'DONE':
      hideLoading();
      showPickupBlock(state);
      loadCards();
      break;

    case 'ERROR':
      hideLoading();
      showStatus('An error occurred. Please try again.', 'error');
      break;
  }
}

// Render clarifying questions with radio buttons
function renderClarifySection(state) {
  // Progress text from architect
  const progress = state.agentOutputs && state.agentOutputs[1]
    ? state.agentOutputs[1].progress || ''
    : '';

  if (progress) {
    clarifyProgress.textContent = progress;
    clarifyProgress.style.display = 'block';
  } else {
    clarifyProgress.style.display = 'none';
  }

  // Render questions
  const questions = state.questions || [];
  clarifyQuestions.innerHTML = '';

  questions.forEach(function (q) {
    const qDiv = document.createElement('div');
    qDiv.className = 'clarify-question';
    qDiv.dataset.questionId = q.id;

    // Question text
    const qText = document.createElement('div');
    qText.className = 'clarify-question-text';
    qText.textContent = q.text;
    qDiv.appendChild(qText);

    // Options as radio buttons
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'clarify-options';

    q.options.forEach(function (opt, idx) {
      const label = document.createElement('label');
      label.className = 'clarify-option';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'question-' + q.id;
      radio.value = opt;

      const span = document.createElement('span');
      span.textContent = opt;

      label.appendChild(radio);
      label.appendChild(span);
      optionsDiv.appendChild(label);
    });

    // "Other" option if allowed
    if (q.allowOther) {
      const label = document.createElement('label');
      label.className = 'clarify-option clarify-option-other';

      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'question-' + q.id;
      radio.value = '__other__';

      const span = document.createElement('span');
      span.textContent = 'Другое:';

      const textarea = document.createElement('textarea');
      textarea.className = 'clarify-other-input';
      textarea.rows = 2;
      textarea.placeholder = 'Ваш вариант...';
      textarea.disabled = true;

      // Enable textarea when "other" is selected
      radio.addEventListener('change', function () {
        textarea.disabled = false;
        textarea.focus();
      });

      // Disable textarea when another option is selected
      optionsDiv.addEventListener('change', function (e) {
        if (e.target.value !== '__other__') {
          textarea.disabled = true;
          textarea.value = '';
        }
      });

      label.appendChild(radio);
      label.appendChild(span);
      label.appendChild(textarea);
      optionsDiv.appendChild(label);
    }

    qDiv.appendChild(optionsDiv);
    clarifyQuestions.appendChild(qDiv);
  });
}

// Render spec review (summary) section
function renderSpecReview(state) {
  const spec = state.currentSpec;
  if (!spec) {
    specContent.innerHTML = '<p>No spec available.</p>';
    return;
  }

  const parts = [];

  // ── Patch-spec (edit mode) ─────────────────────────────────────────────────
  if (spec.mode === 'patch') {
    parts.push('<div class="spec-section">');
    parts.push('<h4>Что изменится</h4>');
    parts.push('<p>' + escapeHtml(spec.changeSummary || 'Нет описания') + '</p>');
    parts.push('</div>');

    if (spec.fieldsAdded?.length > 0) {
      parts.push('<div class="spec-section"><h4>Добавить поля</h4><ul>');
      spec.fieldsAdded.forEach(f => {
        parts.push(`<li><strong>${escapeHtml(f.label)}</strong> — ${escapeHtml(f.beField)} (${escapeHtml(f.control || 'Text')})</li>`);
      });
      parts.push('</ul></div>');
    }

    if (spec.fieldsRemoved?.length > 0) {
      parts.push('<div class="spec-section"><h4>Удалить поля</h4><ul>');
      spec.fieldsRemoved.forEach(f => parts.push(`<li>${escapeHtml(f)}</li>`));
      parts.push('</ul></div>');
    }

    if (spec.fieldsModified?.length > 0) {
      parts.push('<div class="spec-section"><h4>Изменить поля</h4><ul>');
      spec.fieldsModified.forEach(f => {
        parts.push(`<li><strong>${escapeHtml(f.beField)}</strong>: ${escapeHtml(JSON.stringify(f))}</li>`);
      });
      parts.push('</ul></div>');
    }

    if (spec.specChanges && Object.keys(spec.specChanges).length > 0) {
      parts.push('<div class="spec-section"><h4>Изменить свойства карточки</h4><ul>');
      Object.entries(spec.specChanges).forEach(([k, v]) => {
        parts.push(`<li><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</li>`);
      });
      parts.push('</ul></div>');
    }

    if (spec.filesToModify?.length > 0) {
      parts.push('<div class="spec-section"><h4>Файлы для изменения</h4><ul>');
      spec.filesToModify.forEach(f => parts.push(`<li><code>${escapeHtml(f)}</code></li>`));
      parts.push('</ul></div>');
    }

    specContent.innerHTML = parts.join('\n');
    return;
  }

  // ── Regular spec ──────────────────────────────────────────────────────────
  parts.push('<div class="spec-section">');
  parts.push('<h4>Summary</h4>');
  parts.push('<p>' + escapeHtml(spec.summary) + '</p>');
  parts.push('</div>');

  // IC profile: show card-specific fields
  if (spec.cardSlug) {
    parts.push('<div class="spec-section">');
    parts.push('<h4>Integration Card</h4>');
    parts.push('<ul>');
    parts.push('<li><strong>Card:</strong> ' + escapeHtml(spec.cardTitle || spec.cardSlug) + '</li>');
    parts.push('<li><strong>Destination:</strong> ' + escapeHtml(spec.destinationName || '—') + '</li>');
    parts.push('<li><strong>Protocol:</strong> ' + escapeHtml(spec.protocol || '—') + '</li>');
    parts.push('<li><strong>Layout:</strong> ' + escapeHtml(spec.layout || '—') + '</li>');
    parts.push('<li><strong>Fields:</strong> ' + (spec.fields ? spec.fields.length : 0) + '</li>');
    parts.push('<li><strong>Tests:</strong> ' + (spec.generateTests ? 'Yes' : 'No') + '</li>');
    parts.push('<li><strong>Docs:</strong> ' + (spec.generateDocs ? 'Yes' : 'No') + '</li>');
    parts.push('</ul>');
    parts.push('</div>');
  }

  // Clarifications (Q&A history)
  if (state.clarifyHistory && state.clarifyHistory.length > 0) {
    parts.push('<div class="spec-section">');
    parts.push('<h4>Уточнения</h4>');
    parts.push('<ul class="spec-qa-list">');
    state.clarifyHistory.forEach(function (round) {
      if (round.refine) {
        parts.push('<li><em>Уточнение:</em> ' + escapeHtml(round.message) + '</li>');
        return;
      }
      round.questions.forEach(function (q) {
        parts.push('<li><strong>' + escapeHtml(q.text) + '</strong> → ' + escapeHtml(q.answer) + '</li>');
      });
    });
    parts.push('</ul>');
    parts.push('</div>');
  }

  // Features
  if (spec.features && spec.features.length > 0) {
    parts.push('<div class="spec-section">');
    parts.push('<h4>Что будет сделано</h4>');
    parts.push('<ul class="spec-features-list">');
    spec.features.forEach(function (f) {
      parts.push('<li>✓ ' + escapeHtml(f) + '</li>');
    });
    parts.push('</ul>');
    parts.push('</div>');
  }

  // Screens
  if (spec.screens && spec.screens.length > 0) {
    parts.push('<div class="spec-section">');
    parts.push('<h4>Экраны</h4>');
    parts.push('<ul>');
    spec.screens.forEach(function (s) {
      parts.push('<li>' + escapeHtml(s) + '</li>');
    });
    parts.push('</ul>');
    parts.push('</div>');
  }

  // Constraints
  if (spec.constraints && spec.constraints.length > 0) {
    parts.push('<div class="spec-section">');
    parts.push('<h4>Ограничения</h4>');
    parts.push('<ul>');
    spec.constraints.forEach(function (c) {
      parts.push('<li>' + escapeHtml(c) + '</li>');
    });
    parts.push('</ul>');
    parts.push('</div>');
  }

  // Warnings
  if (spec.warnings && spec.warnings.length > 0) {
    parts.push('<div class="spec-section spec-warnings">');
    parts.push('<h4>Предупреждения</h4>');
    spec.warnings.forEach(function (w) {
      parts.push('<div class="spec-warning-item">⚠ ' + escapeHtml(w) + '</div>');
    });
    parts.push('</div>');
  }

  // Estimate
  if (spec.estimatedCost || spec.estimatedTime) {
    parts.push('<div class="spec-section spec-estimate">');
    if (spec.estimatedCost) parts.push('<span class="spec-est-item">💰 ' + escapeHtml(spec.estimatedCost) + '</span>');
    if (spec.estimatedTime) parts.push('<span class="spec-est-item">⏱ ' + escapeHtml(spec.estimatedTime) + '</span>');
    parts.push('</div>');
  }

  specContent.innerHTML = parts.join('\n');
}

// Collect answers from radio buttons and submit
async function handleSubmitAnswers() {
  const questionDivs = clarifyQuestions.querySelectorAll('.clarify-question');
  const answers = [];
  let allAnswered = true;

  questionDivs.forEach(function (qDiv) {
    const qId = qDiv.dataset.questionId;
    const qText = qDiv.querySelector('.clarify-question-text').textContent;
    const selected = qDiv.querySelector('input[type="radio"]:checked');

    if (!selected) {
      allAnswered = false;
      return;
    }

    let answerValue = selected.value;

    // If "other" is selected, get textarea value
    if (answerValue === '__other__') {
      const textarea = qDiv.querySelector('.clarify-other-input');
      answerValue = textarea ? textarea.value.trim() : '';
      if (!answerValue) {
        allAnswered = false;
        return;
      }
    }

    answers.push({ id: qId, text: qText, answer: answerValue });
  });

  if (!allAnswered) {
    showStatus('Please answer all questions', 'error');
    return;
  }

  showLoading('Submitting answers...');

  try {
    const response = await fetch('/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: answers })
    });

    const result = await response.json();

    if (result.success) {
      showStatus('Answers submitted!', 'success');
    } else {
      showStatus(result.message || 'Failed to submit answers', 'error');
      hideLoading();
    }
  } catch (error) {
    console.error('Error submitting answers:', error);
    showStatus('Failed to submit answers', 'error');
    hideLoading();
  }
}

// Start development (approve spec)
async function handleStartDev() {
  showLoading('Starting development...');

  try {
    const response = await fetch('/api/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();

    if (result.success) {
      showStatus('Development started!', 'success');
    } else {
      showStatus(result.message || 'Failed to start', 'error');
      hideLoading();
    }
  } catch (error) {
    console.error('Error starting dev:', error);
    showStatus('Failed to start development', 'error');
    hideLoading();
  }
}

// Toggle refine textarea visibility
function handleRefineToggle() {
  const isOpen = refineArea.style.display !== 'none';
  if (isOpen) {
    refineArea.style.display = 'none';
    submitRefineBtn.style.display = 'none';
    startDevBtn.style.display = '';
    refineInput.value = '';
  } else {
    refineArea.style.display = 'block';
    submitRefineBtn.style.display = '';
    startDevBtn.style.display = 'none';
    refineInput.focus();
  }
}

// Submit refinement request
async function handleSubmitRefine() {
  const message = refineInput.value.trim();
  if (!message) {
    showStatus('Введите текст уточнения', 'error');
    return;
  }

  try {
    const response = await fetch('/api/refine', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });

    const result = await response.json();

    if (!result.success) {
      showStatus(result.message || 'Ошибка при отправке уточнения', 'error');
    }
    // UI reset happens via SSE state update (ARCH_WORKING)
  } catch (error) {
    console.error('Error submitting refine:', error);
    showStatus('Ошибка при отправке уточнения', 'error');
  }
}

// Cancel order
async function handleCancelOrder() {
  try {
    const response = await fetch('/api/cancel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    const result = await response.json();

    if (result.success) {
      showStatus('Order cancelled', 'info');
      // UI will reset via SSE state update (IDLE)
    } else {
      showStatus(result.message || 'Failed to cancel', 'error');
    }
  } catch (error) {
    console.error('Error cancelling:', error);
    showStatus('Failed to cancel order', 'error');
  }
}

// Update User Stories Table
function updateUserStoriesTable(userStories) {
  usTableBody.innerHTML = '';

  if (!userStories || !Array.isArray(userStories)) {
    console.warn('userStories is undefined or not an array');
    return;
  }

  userStories.forEach(us => {
    const row = document.createElement('tr');

    const statusClass = `status-${us.status.toLowerCase()}`;
    const costDisplay = typeof us.cost === 'number' ? `$${us.cost.toFixed(4)}` : '--';
    const timeDisplay = us.time > 0 ? formatTime(us.time) : '--';

    row.innerHTML = `
      <td>${us.id}</td>
      <td>${us.name}</td>
      <td>${us.agent}</td>
      <td><span class="status-badge ${statusClass}">${us.status}</span></td>
      <td>${costDisplay}</td>
      <td>${timeDisplay}</td>
    `;

    usTableBody.appendChild(row);
  });
}

// Update Totals
function updateTotals(cost, time) {
  if (typeof cost === 'number') {
    totalCost.textContent = `$${cost.toFixed(2)}`;
  } else {
    totalCost.textContent = '$0.00';
  }

  if (typeof time === 'number') {
    totalTime.textContent = formatTime(time);
  } else {
    totalTime.textContent = '0s';
  }
}

// Show Pickup Block
function showPickupBlock(state) {
  pickupBlock.style.display = 'block';
  pickupBlock.scrollIntoView({ behavior: 'smooth' });

  finalCost.textContent = `$${state.totalCost.toFixed(2)}`;
  finalTime.textContent = formatTime(state.totalTime);

  // Count files from agent outputs
  let fileCount = 0;
  if (state.agentOutputs) {
    // Developer creates the files
    const developerOutput = state.agentOutputs[2];
    if (developerOutput && developerOutput.files) {
      fileCount = developerOutput.files.length;
    }
  }
  finalFiles.textContent = fileCount;

  // Verification report
  renderVerificationReport(state);

  // Show public URL section if available (v0.2)
  if (state.publicUrl) {
    publicUrlSection.style.display = 'block';
    publicUrlLink.href = state.publicUrl;
    publicUrlLink.textContent = state.publicUrl;
    deployErrorSection.style.display = 'none';


    // Generate QR code — skip for localhost (only useful on the same machine)
    const qrCanvas = document.getElementById('qr-canvas');
    const qrContainer = document.getElementById('qr-code');
    const isLocalhost = state.publicUrl.startsWith('http://localhost');
    if (qrContainer) qrContainer.style.display = isLocalhost ? 'none' : '';
    if (!isLocalhost && qrCanvas && typeof QRCode !== 'undefined') {
      QRCode.toCanvas(qrCanvas, state.publicUrl, {
        width: 200,
        margin: 2
      }, (error) => {
        if (error) {
          console.error('QR code generation error:', error);
        }
      });
    }
  } else {
    // No public URL - show error section
    publicUrlSection.style.display = 'none';
    deployErrorSection.style.display = 'block';
  }

  // VIZ-001: show Preview button for IC cards (identified by cardSlug in spec)
  const sandboxSection = document.getElementById('sandbox-preview');
  if (sandboxSection) {
    sandboxSection.style.display = state.currentSpec?.cardSlug ? 'block' : 'none';
    const btn = document.getElementById('sandbox-preview-btn');
    if (btn) {
      btn.disabled = false;
      btn.textContent = '▶ Preview Card';
    }
  }
}

// Render verification report in the pickup block
function renderVerificationReport(state) {
  const container = document.getElementById('verification-report');
  if (!container) return;

  const r = state.verificationReport;
  if (!r) {
    container.style.display = 'none';
    return;
  }

  if (r.verdict === 'SKIPPED') {
    container.style.display = 'none';
    return;
  }

  const verdictClass = { PASS: 'verdict-pass', PARTIAL: 'verdict-partial', FAIL: 'verdict-fail', ERROR: 'verdict-error' }[r.verdict] || '';
  const verdictLabel = { PASS: '✓ PASS', PARTIAL: '~ PARTIAL', FAIL: '✗ FAIL', ERROR: '⚠ ERROR' }[r.verdict] || r.verdict;

  let featuresHtml = '';
  if (r.features && r.features.length) {
    featuresHtml = '<ul class="vr-features">' +
      r.features.map(f => `<li class="${f.found ? 'vr-found' : 'vr-missing'}">${f.found ? '✓' : '✗'} ${f.feature}</li>`).join('') +
      '</ul>';
  }

  let visionHtml = '';
  if (r.vision && r.vision.summary) {
    visionHtml = `<div class="vr-vision-summary">${r.vision.summary}</div>`;
  }

  container.innerHTML = `
    <div class="vr-header">
      <span class="vr-title">Верификация</span>
      <span class="vr-verdict ${verdictClass}">${verdictLabel}</span>
    </div>
    ${featuresHtml}
    ${visionHtml}
  `;
  container.style.display = 'block';
}

// VIZ-001: start IC sandbox and open preview in new tab
async function handleSandboxPreview() {
  const btn = document.getElementById('sandbox-preview-btn');
  btn.disabled = true;
  btn.textContent = 'Запускаю...';
  const win = openPreviewWindow();
  try {
    const res = await fetch('/api/sandbox/start', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      win.location.href = data.url;
      btn.textContent = '▶ Preview Card';
    } else {
      win.close();
      btn.textContent = '⚠ Ошибка';
      console.error('[Preview]', data.message);
    }
  } catch (e) {
    win.close();
    btn.textContent = '⚠ Ошибка';
    console.error('[Preview]', e.message);
  } finally {
    btn.disabled = false;
  }
}

// Show Status Message
function showStatus(message, type = 'info') {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${type}`;
  statusMessage.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusMessage.style.display = 'none';
  }, 5000);
}

// Show Loading
function showLoading(message = 'Processing...') {
  loadingMessage.textContent = message;
  loadingOverlay.style.display = 'flex';
}

// Hide Loading
function hideLoading() {
  loadingOverlay.style.display = 'none';
}

// Format Time
function formatTime(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// ============================================================================
// ── Utilities ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d)) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}