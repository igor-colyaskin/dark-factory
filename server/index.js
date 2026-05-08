import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import orchestrator from './orchestrator.js';
import fileManager from './file-manager.js';
import acChecker from './ac-checker.js';
import costTracker from './cost-tracker.js';
import appsStore from './apps-store.js';
import { resolveProfile, setActiveProfile, getAvailableProfiles, getActiveProfileId } from './profiles/index.js';
import { validateEnvOrExit } from './env-validator.js';
import githubAuthRouter from './routes/github-auth.js';
import githubClient from './github-client.js';
import localRunner from './local-runner.js';
import processRegistry from './process-registry.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Determine run mode and select appropriate agent manager
const RUN_MODE = process.env.RUN_MODE || 'production';
console.log(`🏭 Dark Factory starting in ${RUN_MODE.toUpperCase()} mode`);

// Load active profile
const activeProfile = resolveProfile();
console.log(`   Profile: ${activeProfile.id} (${activeProfile.name})`);

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

// SPA fallback: serve index.html for client-side routes
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});
app.get('/my-apps', (req, res) => {
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

// Reset orchestrator to IDLE from any state (used by "Повторить с изменениями" from DONE)
app.post('/api/reset', async (req, res) => {
  await orchestrator.reset();
  res.json({ success: true });
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

// Profile settings endpoints
app.get('/api/settings/profile', (req, res) => {
  res.json({
    activeProfileId: getActiveProfileId(),
    profiles: getAvailableProfiles(),
  });
});

app.post('/api/settings/profile', (req, res) => {
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: 'profileId required' });
  try {
    setActiveProfile(profileId);
    // Update orchestrator's cached profile
    orchestrator.refreshProfile();
    res.json({ activeProfileId: getActiveProfileId() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
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
    const appRecord = await appsStore.getApp(id);

    if (!appRecord) {
      return res.status(404).json({ success: false, message: 'App not found' });
    }

    // 1. Local Runner teardown — non-blocking
    if (appRecord.flyAppName) {
      const proc = processRegistry.get(appRecord.flyAppName);
      if (proc) {
        localRunner.teardown(proc.pid, appRecord.flyAppName);
        processRegistry.remove(appRecord.flyAppName);
      }
    }

    // 2. Fly teardown — non-blocking (VDI may block flyctl)
    const isMock = appRecord.flyAppName && appRecord.flyAppName.startsWith('df-mock-');
    if (!isMock && appRecord.flyAppName) {
      try {
        const flyManager = await import('./fly-manager.js');
        const flyResult = await flyManager.default.destroyApp(appRecord.flyAppName);
        if (!flyResult.success) {
          console.warn(`[DELETE] Fly destroy failed for ${appRecord.flyAppName}: ${flyResult.error} — proceeding anyway`);
        }
      } catch (err) {
        console.warn(`[DELETE] Fly destroy error: ${err.message} — proceeding anyway`);
      }
    }

    // 3. GitHub repo deletion — non-blocking
    if (appRecord.sourceUrl) {
      try {
        const parsed = new URL(appRecord.sourceUrl);
        const parts = parsed.pathname.slice(1).split('/');
        const owner = parts[0];
        const repoName = parts[1];
        if (owner && repoName) {
          const ghResult = await githubClient.deleteRepo(owner, repoName);
          if (!ghResult.success) {
            console.warn(`[DELETE] GitHub repo delete failed: ${ghResult.error} — proceeding anyway`);
          } else {
            console.log(`[DELETE] GitHub repo ${owner}/${repoName} deleted`);
          }
        }
      } catch (err) {
        console.warn(`[DELETE] GitHub repo delete error: ${err.message} — proceeding anyway`);
      }
    }

    // 4. Delete from archive — always
    await appsStore.deleteApp(id);

    console.log(`[DELETE] App ${id} deleted`);
    res.json({ success: true, message: 'App deleted' });

  } catch (error) {
    console.error('Error deleting app:', error);
    res.status(500).json({ success: false, message: 'Failed to delete app' });
  }
});

// Open app on-demand: start if not running, return url
app.post('/api/my-apps/:id/open', async (req, res) => {
  const { id } = req.params;
  try {
    const appRecord = await appsStore.getApp(id);
    if (!appRecord) return res.status(404).json({ success: false, message: 'App not found' });

    const appName = appRecord.flyAppName;
    if (!appName) return res.status(400).json({ success: false, message: 'App has no local workspace' });

    // Already running?
    const existing = processRegistry.get(appName);
    if (existing) {
      return res.json({ success: true, url: `http://localhost:${existing.port}` });
    }

    // Start it
    const { url, pid, port } = await localRunner.deploy(appName, () => {});
    processRegistry.register(appName, { pid, port });
    res.json({ success: true, url });
  } catch (e) {
    console.error('[OPEN]', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// App running status
app.get('/api/my-apps/:id/status', async (req, res) => {
  const { id } = req.params;
  const appRecord = await appsStore.getApp(id).catch(() => null);
  if (!appRecord) return res.status(404).json({ success: false });
  const proc = appRecord.flyAppName ? processRegistry.get(appRecord.flyAppName) : null;
  res.json({ running: !!proc, url: proc ? `http://localhost:${proc.port}` : null });
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
  const profile = orchestrator.profile;
  const systemPrompt = profile.prompts.architect.systemPrompt;
  const userPrompt = profile.prompts.architect.generateUserPrompt(
    state.orderDescription,
    state.clarifyHistory,
    state.clarifyRound,
    state.maxClarifyRounds,
    state.referenceSpec
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
  const profile = orchestrator.profile;

  // v0.3: pass spec directly to developer prompt
  const spec = state.currentSpec || state.agentOutputs[1] || null;

  if (!spec) {
    console.error('Spec/architecture not found!');
    throw new Error('Architecture output not found');
  }

  const systemPrompt = profile.prompts.developer.systemPrompt;
  const userPrompt = profile.prompts.developer.generateUserPrompt(
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
    // Write static files directly from templates (IC profile only — skips LLM token overhead)
    if (typeof profile.prompts.developer.generateStaticFiles === 'function') {
      const staticFiles = profile.prompts.developer.generateStaticFiles(spec.cardSlug);
      const staticResult = await fileManager.writeFiles(staticFiles);
      if (!staticResult.success) {
        console.error('Some static files failed to write:', staticResult.errors);
      }
      // Merge static files into result so Tester agent sees the full workspace
      result.content.files = [...(result.content.files || []), ...staticFiles];
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

  // Integration Card profile has no Node.js app to check — skip nodejs-specific AC
  if (orchestrator.profile.deployer === 'none') {
    console.log('[DEV_CHECK] deployer=none — skipping nodejs AC checks');
    await orchestrator.handleACCheckResult(2, true);
    await runPipeline();
    return;
  }

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
  const profile = orchestrator.profile;
  const architectOutput = state.agentOutputs[1];
  const developerOutput = state.agentOutputs[2];

  if (!architectOutput || !developerOutput) {
    throw new Error('Previous agent outputs not found');
  }

  const systemPrompt = profile.prompts.tester.systemPrompt;
  const userPrompt = profile.prompts.tester.generateUserPrompt(
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
