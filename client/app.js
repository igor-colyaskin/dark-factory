/**
 * Dark Factory v0.1 - Client Application
 * Handles UI interactions and SSE communication with backend
 */
// State
let eventSource = null;
let currentState = null;
let sessionId = null;
let productsCache = [];
let deleteTargetId = null;

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
const startDevBtn = document.getElementById('start-dev-btn');
const statusMessage = document.getElementById('status-message');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingMessage = document.getElementById('loading-message');
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

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initSessionId();
  setupEventListeners();
  setupTabs();
  setupSettings();
  connectSSE();
  loadRunMode();
  handleGitHubCallback();
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

// Load and display run mode
async function loadRunMode() {
  try {
    const response = await fetch('/api/info');
    const info = await response.json();

    const badge = document.getElementById('run-mode-badge');
    const mode = info.runMode || 'production';

    badge.textContent = mode.toUpperCase();
    badge.className = `run-mode-badge ${mode}`;

    console.log(`Running in ${mode} mode`);
  } catch (error) {
    console.error('Error loading run mode:', error);
  }
}

// Setup Event Listeners
function setupEventListeners() {
  orderForm.addEventListener('submit', handleOrderSubmit);
  submitAnswersBtn.addEventListener('click', handleSubmitAnswers);
  cancelOrderBtn.addEventListener('click', handleCancelOrder);
  startDevBtn.addEventListener('click', handleStartDev);
  newOrderBtn.addEventListener('click', handleNewOrder);
  openPublicBtn.addEventListener('click', handleOpenPublic);
  copyUrlBtn.addEventListener('click', handleCopyUrl);

  // Close delete modal on outside click
  document.getElementById('delete-modal').addEventListener('click', (e) => {
    if (e.target.id === 'delete-modal') {
      closeDeleteModal();
    }
  });
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
function switchTab(tabName) {
  // Update sidebar buttons
  document.querySelectorAll('.sidebar-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  // Update pages
  document.getElementById('page-order').style.display = tabName === 'order' ? 'block' : 'none';
  document.getElementById('page-products').style.display = tabName === 'products' ? 'block' : 'none';
  document.getElementById('page-settings').style.display = tabName === 'settings' ? 'block' : 'none';

  // Load products when switching to that tab
  if (tabName === 'products') {
    loadProducts();
  }

  // Load GitHub status when switching to Settings
  if (tabName === 'settings') {
    loadGitHubStatus();
  }
}

// Load Products
async function loadProducts() {
  const productsList = document.getElementById('products-list');
  const productsEmpty = document.getElementById('products-empty');

  try {
    const response = await fetch('/api/my-apps');
    const data = await response.json();

    if (!data.success || !data.apps || data.apps.length === 0) {
      productsCache = [];
      productsList.innerHTML = '';
      productsEmpty.style.display = 'block';
      return;
    }

    productsCache = data.apps;
    productsEmpty.style.display = 'none';
    productsList.innerHTML = data.apps.map(app => renderAppCard(app)).join('');

  } catch (error) {
    console.error('Error loading products:', error);
    productsCache = [];
    productsList.innerHTML = '<p class="products-error">Failed to load applications.</p>';
    productsEmpty.style.display = 'none';
  }
}

// Render App Card
function renderAppCard(app) {
  const orderExcerpt = app.order && app.order.length > 80
    ? app.order.substring(0, 80) + '...'
    : (app.order || '');

  const dateFormatted = formatDate(app.createdAt);
  const costFormatted = app.metrics && typeof app.metrics.totalCost === 'number'
    ? `$${app.metrics.totalCost.toFixed(2)}`
    : '--';
  const timeFormatted = app.metrics && typeof app.metrics.totalTime === 'number'
    ? formatTime(app.metrics.totalTime)
    : '--';

  return `
    <div class="app-card" data-app-id="${app.id}">
      <div class="app-card-header">
        <span class="app-card-number">#${app.number}</span>
        <span class="app-card-id">${app.id}</span>
        <span class="app-card-date">${dateFormatted}</span>
      </div>
      <div class="app-card-order">${escapeHtml(orderExcerpt)}</div>
      <div class="app-card-metrics">
        <span class="app-card-metric">💰 ${costFormatted}</span>
        <span class="app-card-metric">⏱ ${timeFormatted}</span>
      </div>
      <div class="app-card-url">
        <a href="${app.url}" target="_blank" rel="noopener noreferrer">🌐 ${app.url}</a>
      </div>
      <div class="app-card-actions">
        <button class="btn btn-sm btn-secondary" onclick="handleDetails('${app.id}')" data-action="details">Детали</button>
        <button class="btn btn-sm btn-danger-outline" onclick="handleDeleteClick('${app.id}')" data-action="delete">Стереть</button>
      </div>
      <div class="app-card-details" id="details-${app.id}" style="display: none;"></div>
    </div>
  `;
}

// Format Date
function formatDate(isoString) {
  if (!isoString) return '--';
  const d = new Date(isoString);
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
    + ' ' + d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Handle Details (Phase 6)
function handleDetails(appId) {
  const detailsDiv = document.getElementById(`details-${appId}`);
  const btn = document.querySelector(`.app-card[data-app-id="${appId}"] [data-action="details"]`);

  if (!detailsDiv || !btn) return;

  const isVisible = detailsDiv.style.display !== 'none';

  if (isVisible) {
    // Collapse
    detailsDiv.style.display = 'none';
    btn.textContent = 'Детали';
  } else {
    // Expand — populate if empty
    if (!detailsDiv.innerHTML) {
      const app = productsCache.find(a => a.id === appId);
      const content = app && app.architectOutput ? app.architectOutput : 'No details available.';
      detailsDiv.innerHTML = `<pre class="app-card-details-content">${escapeHtml(content)}</pre>`;
    }
    detailsDiv.style.display = 'block';
    btn.textContent = 'Скрыть';
  }
}

// Handle Delete Click (Phase 7)
function handleDeleteClick(appId) {
  const app = productsCache.find(a => a.id === appId);
  if (!app) return;

  deleteTargetId = appId;

  // Populate modal
  const modalInfo = document.getElementById('delete-modal-info');
  modalInfo.textContent = `#${app.number} (${app.id})`;

  // Reset state
  const errorDiv = document.getElementById('delete-modal-error');
  errorDiv.style.display = 'none';
  errorDiv.textContent = '';

  const confirmBtn = document.getElementById('delete-confirm-btn');
  confirmBtn.disabled = false;
  confirmBtn.textContent = 'Да, удалить';

  const cancelBtn = document.getElementById('delete-cancel-btn');
  cancelBtn.disabled = false;

  // Show modal
  document.getElementById('delete-modal').style.display = 'flex';
}

// Close Delete Modal
function closeDeleteModal() {
  document.getElementById('delete-modal').style.display = 'none';
  deleteTargetId = null;
}

// Confirm Delete
async function confirmDelete() {
  if (!deleteTargetId) return;

  const confirmBtn = document.getElementById('delete-confirm-btn');
  const cancelBtn = document.getElementById('delete-cancel-btn');
  const errorDiv = document.getElementById('delete-modal-error');

  // Loading state
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Удаление...';
  cancelBtn.disabled = true;
  errorDiv.style.display = 'none';

  try {
    const response = await fetch(`/api/my-apps/${deleteTargetId}`, {
      method: 'DELETE'
    });

    const result = await response.json();

    if (result.success) {
      // Success — remove card from UI first, then close modal
      // Store ID before closing modal (which resets deleteTargetId)
      const idToDelete = deleteTargetId;

      // Remove card from DOM
      const card = document.querySelector(`.app-card[data-app-id="${idToDelete}"]`);
      if (card) {
        card.remove();
      }

      // Update cache
      productsCache = productsCache.filter(a => a.id !== idToDelete);

      // Show empty state if no cards left
      if (productsCache.length === 0) {
        document.getElementById('products-list').innerHTML = '';
        document.getElementById('products-empty').style.display = 'block';
      }

      // Close modal after UI update
      closeDeleteModal();

      showStatus('Application deleted', 'success');
    } else {
      // Error from server
      errorDiv.textContent = result.message || 'Failed to delete application.';
      errorDiv.style.display = 'block';
      confirmBtn.disabled = false;
      confirmBtn.textContent = 'Да, удалить';
      cancelBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error deleting app:', error);
    errorDiv.textContent = 'Network error. Please try again.';
    errorDiv.style.display = 'block';
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Да, удалить';
    cancelBtn.disabled = false;
  }
}

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
    const response = await fetch('/api/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-Id': sessionId
      },
      body: JSON.stringify({ description: orderDescription })
    });

    const result = await response.json();

    if (result.success) {
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
      specReviewSection.style.display = 'block';
      showStatus('Spec is ready for review', 'info');
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

    case 'DONE':
      hideLoading();
      showPickupBlock(state);
      loadProducts();
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

  // Summary
  parts.push('<div class="spec-section">');
  parts.push('<h4>Summary</h4>');
  parts.push('<p>' + escapeHtml(spec.summary) + '</p>');
  parts.push('</div>');

  // Clarifications (Q&A history)
  if (state.clarifyHistory && state.clarifyHistory.length > 0) {
    parts.push('<div class="spec-section">');
    parts.push('<h4>Уточнения</h4>');
    parts.push('<ul class="spec-qa-list">');
    state.clarifyHistory.forEach(function (round) {
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

  // Show public URL section if available (v0.2)
  if (state.publicUrl) {
    publicUrlSection.style.display = 'block';
    publicUrlLink.href = state.publicUrl;
    publicUrlLink.textContent = state.publicUrl;
    deployErrorSection.style.display = 'none';

    // v0.2: mark fake URLs (mock-fast, demo) with a visible badge
    const fakeBadge = document.getElementById('fake-url-badge');
    if (state.isFakeDeploy) {
      fakeBadge.style.display = 'block';
      console.warn(`[MOCK] Fake deploy URL: ${state.publicUrl} — nothing was actually deployed`);
    } else {
      fakeBadge.style.display = 'none';
    }

    // Generate QR code
    const qrCanvas = document.getElementById('qr-canvas');
    if (qrCanvas && typeof QRCode !== 'undefined') {
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
// Settings: GitHub Integration
// ============================================================================

async function loadGitHubStatus() {
  try {
    const response = await fetch('/api/github/status');
    const data = await response.json();
    renderGitHubStatus(data);
  } catch (err) {
    console.error('Failed to load GitHub status:', err);
    renderGitHubStatus({ connected: false });
  }
}

function renderGitHubStatus(data) {
  const notConnectedBlock = document.getElementById('github-not-connected');
  const connectedBlock = document.getElementById('github-connected');
  const usernameEl = document.getElementById('github-username');
  const connectedAtEl = document.getElementById('github-connected-at');

  if (data.connected) {
    notConnectedBlock.style.display = 'none';
    connectedBlock.style.display = 'block';
    usernameEl.textContent = '@' + data.username;
    if (data.connectedAt) {
      const date = new Date(data.connectedAt);
      connectedAtEl.textContent = 'Connected on ' + date.toLocaleDateString() +
        ' at ' + date.toLocaleTimeString();
    }
  } else {
    notConnectedBlock.style.display = 'block';
    connectedBlock.style.display = 'none';
  }
}

function connectGitHub() {
  window.location.href = '/api/github/authorize';
}

async function disconnectGitHub() {
  if (!confirm('Disconnect GitHub? Your token will be removed. ' +
               'Existing repositories on GitHub will not be affected.')) {
    return;
  }

  try {
    const response = await fetch('/api/github/disconnect', { method: 'POST' });
    if (!response.ok) {
      throw new Error('Server returned ' + response.status);
    }
    await loadGitHubStatus();
    showGitHubMessage('Disconnected from GitHub.', 'success');
  } catch (err) {
    console.error('Failed to disconnect:', err);
    showGitHubMessage('Failed to disconnect. Check console for details.', 'error');
  }
}

function showGitHubMessage(text, type) {
  const messageEl = document.getElementById('github-message');
  messageEl.textContent = text;
  messageEl.className = 'github-message github-message-' + type;
  messageEl.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageEl.style.display = 'none';
  }, 5000);
}

function handleGitHubCallback() {
  // Parse ?github=... from URL
  const params = new URLSearchParams(window.location.search);
  const githubParam = params.get('github');

  if (!githubParam) return;

  // If we got here, user was redirected from OAuth callback
  // Switch to Settings tab automatically
  switchTab('settings');

  if (githubParam === 'connected') {
    showGitHubMessage('Successfully connected to GitHub!', 'success');
  } else if (githubParam === 'error') {
    const reason = params.get('reason') || 'unknown';
    showGitHubMessage('Connection failed: ' + reason, 'error');
  }

  // Clean URL: remove query params without reload
  const cleanUrl = window.location.pathname;
  window.history.replaceState({}, '', cleanUrl);
}

function setupSettings() {
  const connectBtn = document.getElementById('github-connect-btn');
  if (connectBtn) {
    connectBtn.addEventListener('click', connectGitHub);
  }

  const disconnectBtn = document.getElementById('github-disconnect-btn');
  if (disconnectBtn) {
    disconnectBtn.addEventListener('click', disconnectGitHub);
  }
}