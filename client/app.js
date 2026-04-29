/**
 * Dark Factory v0.1 - Client Application
 * Handles UI interactions and SSE communication with backend
 */

// State
let eventSource = null;
let currentState = null;

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
const openAppBtn = document.getElementById('open-app-btn');
const downloadBtn = document.getElementById('download-btn');
const newOrderBtn = document.getElementById('new-order-btn');
const finalCost = document.getElementById('final-cost');
const finalTime = document.getElementById('final-time');
const finalFiles = document.getElementById('final-files');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  connectSSE();
  loadRunMode();
});

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
  openAppBtn.addEventListener('click', handleOpenApp);
  downloadBtn.addEventListener('click', handleDownload);
  newOrderBtn.addEventListener('click', handleNewOrder);
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
  
  // Update loading message
  if (data.message) {
    showLoading(data.message);
  }
  
  // Update deploy status in UI if needed
  const deployStatus = document.getElementById('deploy-status');
  if (deployStatus) {
    deployStatus.textContent = data.message || 'Deploying...';
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
        'Content-Type': 'application/json'
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

// Handle Open App
async function handleOpenApp() {
  showLoading('Getting application info...');
  
  try {
    const response = await fetch('/api/start-app', {
      method: 'POST'
    });
    
    const result = await response.json();
    
    if (result.success) {
      // Show instructions in alert
      const instructions = result.instructions.join('\n');
      alert(`${result.message}\n\n${instructions}\n\nWorkspace: ${result.workspacePath}`);
      showStatus('Instructions displayed', 'info');
    } else {
      showStatus(result.message || 'Failed to get app info', 'error');
    }
  } catch (error) {
    console.error('Error getting app info:', error);
    showStatus('Failed to get app info', 'error');
  } finally {
    hideLoading();
  }
}

// Handle Download
async function handleDownload() {
  showLoading('Preparing download...');
  
  try {
    const response = await fetch('/api/download');
    
    if (response.ok) {
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'application.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showStatus('Download started!', 'success');
    } else {
      showStatus('Failed to download', 'error');
    }
  } catch (error) {
    console.error('Error downloading:', error);
    showStatus('Failed to download. Please try again.', 'error');
  } finally {
    hideLoading();
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
      break;
      
    case 'ORDERING':
      showLoading('Processing your order...');
      break;
      
    case 'ARCH_WORKING':
      showLoading('Architect is designing your application...');
      break;
      
    case 'CLARIFYING':
      hideLoading();
      showQuestions(state.questions);
      break;
      
    case 'ARCH_REVIEW':
      hideLoading();
      showApprovalButtons();
      showStatus('Architecture is ready for review', 'info');
      break;
      
    case 'DEV_WORKING':
      showLoading('Developer is writing code...');
      actionButtons.style.display = 'none';
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
      showLoading('Deploying to cloud...');
      break;
      
    case 'DONE':
      hideLoading();
      showPickupBlock(state);
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
    const costDisplay = us.cost > 0 ? `$${us.cost.toFixed(2)}` : '--';
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
  
  // Show public URL if available (v0.2)
  if (state.publicUrl) {
    const publicUrlElement = document.getElementById('public-url');
    const publicUrlLink = document.getElementById('public-url-link');
    
    if (publicUrlElement && publicUrlLink) {
      publicUrlElement.style.display = 'block';
      publicUrlLink.href = state.publicUrl;
      publicUrlLink.textContent = state.publicUrl;
      
      showStatus(`🎉 Your app is live at ${state.publicUrl}`, 'success');
    }
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
