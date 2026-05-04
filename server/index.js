import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import orchestrator from './orchestrator.js';
import fileManager from './file-manager.js';
import acChecker from './ac-checker.js';
import costTracker from './cost-tracker.js';
import appsStore from './apps-store.js';
import architectPrompts from './prompts/architect.js';
import developerPrompts from './prompts/developer.js';
import testerPrompts from './prompts/tester.js';
import { validateEnvOrExit } from './env-validator.js';
import githubAuthRouter from './routes/github-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine run mode and select appropriate agent manager
const RUN_MODE = process.env.RUN_MODE || 'production';
console.log(`🏭 Dark Factory starting in ${RUN_MODE.toUpperCase()} mode`);

// Validate environment variables before proceeding
validateEnvOrExit(RUN_MODE);

// Initialize apps store
await appsStore.init();

let agentManager;
let useMockWorkspace = false;

if (RUN_MODE === 'mock-fast' || RUN_MODE === 'demo') {
  const mockAgentManagerModule = await import('./mock-agent-manager.js');
  agentManager = mockAgentManagerModule.default;
  useMockWorkspace = true;
  console.log('   Using pre-built mock-workspace/');
} else if (RUN_MODE === 'mock-full') {
  const mockAgentManagerModule = await import('./mock-agent-manager.js');
  agentManager = mockAgentManagerModule.default;
  useMockWorkspace = false;
  console.log('   Using mock responses, writing to workspace/');
} else {
  const realAgentManagerModule = await import('./agent-manager.js');
  agentManager = realAgentManagerModule.default;
  useMockWorkspace = false;
  console.log('   Using real OpenRouter API');
}

const app = express();
const PORT = process.env.PORT || 3000;

// SSE clients storage
const sseClients = [];

// Middleware
app.use(express.json());

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// SPA fallback: /settings etc. serve index.html
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// SSE endpoint for real-time updates
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Add client to list
  sseClients.push(res);

  // Send initial connection message
  res.write('data: {"type":"connected","message":"SSE connection established"}\n\n');

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat"}\n\n');
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
    res.end();
  });
});

// Broadcast state updates to all SSE clients
function broadcastState(state) {
  const message = JSON.stringify({
    type: 'state_update',
    state: state
  });

  sseClients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      console.error('Error broadcasting to client:', error);
    }
  });
}

// Subscribe to orchestrator state changes
orchestrator.subscribe((state) => {
  console.log('State changed:', state.state);
  broadcastState(state);
});

// POST endpoint to accept orders
app.post('/api/order', async (req, res) => {
  const { description } = req.body;
  
  if (!description) {
    return res.status(400).json({
      success: false,
      message: 'Order description is required'
    });
  }
  
  try {
    console.log('Received order:', description);
    console.log('Current orchestrator state BEFORE reset:', orchestrator.state);
    
    // Always reset orchestrator before new order to ensure clean state
    await orchestrator.reset();
    console.log('Current orchestrator state AFTER reset:', orchestrator.state);
    
    // Start order processing
    await orchestrator.startOrder(description);
    console.log('Order started successfully, new state:', orchestrator.state);
    
    res.status(200).json({
      success: true,
      message: 'Order received and processing started',
      orderId: Date.now().toString()
    });
    
    // Start the pipeline workflow
    runPipeline().catch(error => {
      console.error('Pipeline error:', error);
      broadcastState({
        ...orchestrator.getState(),
        error: error.message
      });
    });
    
  } catch (error) {
    console.error('Error starting order:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST endpoint to approve architecture
app.post('/api/approve', async (req, res) => {
  try {
    await orchestrator.handleApproval();
    
    res.status(200).json({
      success: true,
      message: 'Architecture approved'
    });
    
    // Continue pipeline
    runPipeline().catch(error => {
      console.error('Pipeline error:', error);
    });
    
  } catch (error) {
    console.error('Error approving:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST endpoint to submit answers
app.post('/api/answers', async (req, res) => {
  const { answers } = req.body;

  // answers: array of { id, text, answer }
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: 'Answers array is required'
    });
  }
  
  try {
    await orchestrator.handleAnswers(answers);
    
    res.status(200).json({
      success: true,
      message: 'Answers submitted'
    });
    
    // Continue pipeline
    runPipeline().catch(error => {
      console.error('Pipeline error:', error);
    });
    
  } catch (error) {
    console.error('Error submitting answers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

app.post('/api/cancel', async (req, res) => {
  try {
    await orchestrator.handleCancel();

    res.status(200).json({
      success: true,
      message: 'Order cancelled'
    });
  } catch (error) {
    console.error('Error cancelling:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET endpoint to get server info (including run mode)
app.get('/api/info', (req, res) => {
  res.json({
    runMode: RUN_MODE,
    version: '0.1.0',
    port: PORT
  });
});

// GitHub OAuth routes
app.use('/api/github', githubAuthRouter);

// GET endpoint to get all archived apps
app.get('/api/my-apps', async (req, res) => {
  try {
    const apps = await appsStore.getAllApps();
    res.json({ success: true, apps });
  } catch (error) {
    console.error('Error fetching apps:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch apps' });
  }
});

// GET endpoint to get a specific archived app
app.get('/api/my-apps/:id', async (req, res) => {
  try {
    const app = await appsStore.getApp(req.params.id);
    
    if (!app) {
      return res.status(404).json({ success: false, message: 'App not found' });
    }
    
    res.json({ success: true, app });
  } catch (error) {
    console.error('Error fetching app:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch app' });
  }
});

// DELETE endpoint to delete an archived app
app.delete('/api/my-apps/:id', async (req, res) => {
  const { id } = req.params;
  
  try {
    // 1. Check that record exists
    const appRecord = await appsStore.getApp(id);
    
    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'App not found' });
    }
    
    // 2. Delete from Fly.io (skip for fake deploys)
    const isFake = appRecord.flyAppName && appRecord.flyAppName.startsWith('df-mock-');
    
    if (!isFake) {
      const flyManager = await import('./fly-manager.js');
      const flyResult = await flyManager.default.destroyApp(appRecord.flyAppName);
      
      if (!flyResult.success) {
        // Parse: "not found" on Fly is ok, delete from archive anyway
        // Other errors - don't touch archive
        const isNotFound = flyResult.error &&
          flyResult.error.toLowerCase().includes('could not find app');
        
        if (!isNotFound) {
          console.error(`[DELETE] Fly destroy failed for ${id}: ${flyResult.error}`);
          return res.status(502).json({
            success: false,
            message: `Failed to destroy app on Fly.io: ${flyResult.error}`
          });
        }
        
        // App not found on Fly - consider already deleted, continue
        console.log(`[DELETE] App ${appRecord.flyAppName} not found on Fly, proceeding with archive cleanup`);
      }
    } else {
      console.log(`[DELETE] Skipping Fly destroy for mock app: ${appRecord.flyAppName}`);
    }
    
    // 3. Delete from archive
    await appsStore.deleteApp(id);
    
    console.log(`[DELETE] App ${id} fully deleted`);
    res.json({ success: true, message: 'App deleted' });
    
  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({ success: false, message: 'Failed to delete app' });
  }
});

// Serve workspace files (for viewing static files)
app.use('/workspace', express.static(path.join(__dirname, '../workspace')));

// Pipeline workflow
async function runPipeline() {
  const state = orchestrator.getState();
  
  try {
    switch (state.state) {
      case 'ARCH_WORKING':
        await runArchitect();
        break;
        
      case 'DEV_WORKING':
        await runDeveloper();
        break;
        
      case 'DEV_CHECK':
        await runDevCheck();
        break;
        
      case 'TEST_RUNNING':
        await runTester();
        break;
        
      case 'DELIVERING':
        await runDelivery();
        break;
    }
  } catch (error) {
    console.error('Pipeline step error:', error);
    throw error;
  }
}

// Run Architect agent
async function runArchitect() {
  console.log('Running Architect agent...');
  
  const state = orchestrator.getState();
  const systemPrompt = architectPrompts.systemPrompt;
  const userPrompt = architectPrompts.generateUserPrompt(
    state.orderDescription,
    state.clarifyHistory,
    state.clarifyRound,
    state.maxClarifyRounds
  );
  
  const result = await agentManager.callAgentWithRetry(
    'architect',
    systemPrompt,
    userPrompt,
    { max_tokens: 4000 }
  );
  
  // Record cost
  costTracker.recordEntry({
    usId: 1,
    usName: 'Architecture',
    agent: 'architect',
    model: result.model,
    cost: result.cost,
    time: result.time,
    tokens: result.usage,
    status: result.success ? 'success' : 'error'
  });
  
  await costTracker.save();
  
  if (!result.success) {
    throw new Error(`Architect failed: ${result.error}`);
  }
  
  const architectData = {
    ...result.content,
    cost: result.cost,
    time: result.time
  };
  
  await orchestrator.handleAgentComplete(1, architectData);
}

// Run Developer agent
async function runDeveloper() {
  console.log('Running Developer agent...');

  const state = orchestrator.getState();

  // v0.3: pass spec directly to developer prompt
  const spec = state.currentSpec || state.agentOutputs[1] || null;

  if (!spec) {
    console.error('Spec/architecture not found!');
    throw new Error('Architecture output not found');
  }

  const systemPrompt = developerPrompts.systemPrompt;
  const userPrompt = developerPrompts.generateUserPrompt(
    state.orderDescription,
    spec,
    state.retryCount
  );

  const result = await agentManager.callAgentWithRetry(
    'developer',
    systemPrompt,
    userPrompt,
    { max_tokens: 16000 }
  );

  // Record cost
  costTracker.recordEntry({
    usId: 2,
    usName: 'Development',
    agent: 'developer',
    model: result.model,
    cost: result.cost,
    time: result.time,
    tokens: result.usage,
    status: result.success ? 'success' : 'error'
  });

  await costTracker.save();

  if (!result.success) {
    throw new Error('Developer failed: ' + result.error);
  }

  // Write files to workspace
  if (useMockWorkspace) {
    console.log('[MOCK-FAST] Copying pre-built mock-workspace/');
    await fileManager.copyMockWorkspace();
  } else {
    await fileManager.initWorkspace();
    const writeResult = await fileManager.writeFiles(result.content.files);
    if (!writeResult.success) {
      console.error('Some files failed to write:', writeResult.errors);
    }
  }

  const developerData = {
    ...result.content,
    cost: result.cost,
    time: result.time
  };

  await orchestrator.handleAgentComplete(2, developerData);

  // Continue to AC check
  await runPipeline();
}

// Run Development AC Check
async function runDevCheck() {
  console.log('Running Development AC Check...');
  
  const checkResult = await acChecker.checkDevelopment();
  
  await orchestrator.handleACCheckResult(2, checkResult.passed);
  
  if (checkResult.passed) {
    // Continue to testing
    await runPipeline();
  } else {
    // Will retry or go to ERROR state
    if (orchestrator.retryCount < orchestrator.maxRetries) {
      await runPipeline();
    }
  }
}

// Run Tester agent
async function runTester() {
  console.log('Running Tester agent...');
  
  const state = orchestrator.getState();
  const architectOutput = state.agentOutputs[1];
  const developerOutput = state.agentOutputs[2];
  
  if (!architectOutput || !developerOutput) {
    throw new Error('Previous agent outputs not found');
  }
  
  const systemPrompt = testerPrompts.systemPrompt;
  const userPrompt = testerPrompts.generateUserPrompt(
    state.orderDescription,
    architectOutput,
    developerOutput
  );
  
  const result = await agentManager.callAgentWithRetry(
    'tester',
    systemPrompt,
    userPrompt,
    { max_tokens: 8000 }
  );
  
  // Record cost
  costTracker.recordEntry({
    usId: 3,
    usName: 'Testing',
    agent: 'tester',
    model: result.model,
    cost: result.cost,
    time: result.time,
    tokens: result.usage,
    status: result.success ? 'success' : 'error'
  });
  
  await costTracker.save();
  
  if (!result.success) {
    throw new Error(`Tester failed: ${result.error}`);
  }
  
  console.log(`[COST-DEBUG] Tester result.cost: ${result.cost}, result.time: ${result.time}`);
  console.log(`[COST-DEBUG] Tester result.content.cost: ${result.content.cost}`);
  
  const testerData = {
    ...result.content,
    cost: result.cost,  // Override any cost from content
    time: result.time   // Override any time from content
  };
  
  console.log(`[COST-DEBUG] Passing to orchestrator - cost: ${testerData.cost}, time: ${testerData.time}`);
  
  await orchestrator.handleAgentComplete(3, testerData);
  
  // Continue to delivery
  await runPipeline();
}

// Run Delivery
async function runDelivery() {
  console.log('Running Delivery...');
  
  // Mark as done
  await orchestrator.handleDeliveryComplete();
  
  console.log('Application delivery complete!');
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
