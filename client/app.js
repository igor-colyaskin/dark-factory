/**
 * Dark Factory v0.1 - Client Application
 * Handles UI interactions and SSE communication with backend
 */
// State
let eventSource = null;
let currentState = null;
let sessionId = null;
let productsCache = [];

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
const actionButtons = document.getElementById('action-buttons');
const approveBtn = document.getElementById('approve-btn');
const askQuestionBtn = document.getElementById('ask-question-btn');
const questionsArea = document.getElementById('questions-area');
const questionsList = document.getElementById('questions-list');
const answersForm = document.getElementById('answers-form');
const answersInput = document.getElementById('answers-input');
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
  connectSSE();
  loadRunMode();
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
  approveBtn.addEventListener('click', handleApprove);
  askQuestionBtn.addEventListener('click', handleAskQuestion);
  answersForm.addEventListener('submit', handleAnswersSubmit);
  newOrderBtn.addEventListener('click', handleNewOrder);
  openPublicBtn.addEventListener('click', handleOpenPublic);
  copyUrlBtn.addEventListener('click', handleCopyUrl);
}

// Setup Tabs
function setupTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  
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
  // Update buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  
  // Update pages
  document.getElementById('page-order').style.display = tabName === 'order' ? 'block' : 'none';
  document.getElementById('page-products').style.display = tabName === 'products' ? 'block' : 'none';
  
  // Load products when switching to that tab
  if (tabName === 'products') {
    loadProducts();
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

function handleDeleteClick(appId) {
  console.log('[Phase 7] Delete clicked for:', appId);
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
      orderInput.disabled = true;
      submitOrderBtn.disabled = true;
      
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

// Handle Approve
async function handleApprove() {
  showLoading('Approving architecture...');
  
  try {
    const response = await fetch('/api/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      showStatus('Architecture approved!', 'success');
      actionButtons.style.display = 'none';
    } else {
      showStatus(result.message || 'Failed to approve', 'error');
      hideLoading();
    }
  } catch (error) {
    console.error('Error approving:', error);
    showStatus('Failed to approve. Please try again.', 'error');
    hideLoading();
  }
}

// Handle Ask Question
function handleAskQuestion() {
  // TODO: Implement question dialog
  showStatus('Question feature coming soon', 'info');
}

// Handle Answers Submit
async function handleAnswersSubmit(e) {
  e.preventDefault();
  
  const answers = answersInput.value.trim();
  
  if (!answers) {
    showStatus('Please provide your answers', 'error');
    return;
  }
  
  showLoading('Submitting answers...');
  
  try {
    const response = await fetch('/api/answers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ answers: [answers] })
    });
    
    const result = await response.json();
    
    if (result.success) {
      showStatus('Answers submitted!', 'success');
      questionsArea.style.display = 'none';
      answersInput.value = '';
    } else {
      showStatus(result.message || 'Failed to submit answers', 'error');
      hideLoading();
    }
  } catch (error) {
    console.error('Error submitting answers:', error);
    showStatus('Failed to submit answers. Please try again.', 'error');
    hideLoading();
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
  
  // Handle state-specific UI
  switch (state.state) {
    case 'IDLE':
      hideLoading();
      deployInfo.style.display = 'none';
      break;
      
    case 'ORDERING':
      showLoading('Processing your order...');
      deployInfo.style.display = 'none';
      break;
      
    case 'ARCH_WORKING':
      showLoading('Architect is designing your application...');
      deployInfo.style.display = 'none';
      break;
      
    case 'CLARIFYING':
      hideLoading();
      showQuestions(state.questions);
      deployInfo.style.display = 'none';
      break;
      
    case 'ARCH_REVIEW':
      hideLoading();
      showApprovalButtons();
      showStatus('Architecture is ready for review', 'info');
      deployInfo.style.display = 'none';
      break;
      
    case 'DEV_WORKING':
      showLoading('Developer is writing code...');
      actionButtons.style.display = 'none';
      deployInfo.style.display = 'none';
      break;
      
    case 'DEV_CHECK':
      showLoading('Checking code quality...');
      deployInfo.style.display = 'none';
      break;
      
    case 'TEST_RUNNING':
      showLoading('Tester is reviewing code...');
      deployInfo.style.display = 'none';
      break;
      
    case 'DELIVERING':
      showLoading('Preparing your application...');
      deployInfo.style.display = 'none';
      break;
      
    case 'DEPLOYING':
      // No full-screen overlay during deploy — deploy-info block is the progress UI
      hideLoading();
      deployInfo.style.display = 'block';
      if (deployStatusText) {
        deployStatusText.textContent = 'Starting deployment...';
      }
      break;
      
    case 'DONE':
      hideLoading();
      deployInfo.style.display = 'none';
      showPickupBlock(state);
      // Refresh products list if it was loaded
      loadProducts();
      break;
      
    case 'ERROR':
      hideLoading();
      showStatus('An error occurred. Please try again.', 'error');
      break;
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

// Show Questions
function showQuestions(questions) {
  if (!questions || questions.length === 0) {
    questionsArea.style.display = 'none';
    return;
  }
  
  questionsList.innerHTML = '';
  
  questions.forEach((question, index) => {
    const div = document.createElement('div');
    div.className = 'question-item';
    div.textContent = `${index + 1}. ${question}`;
    questionsList.appendChild(div);
  });
  
  questionsArea.style.display = 'block';
}

// Show Approval Buttons
function showApprovalButtons() {
  actionButtons.style.display = 'flex';
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
