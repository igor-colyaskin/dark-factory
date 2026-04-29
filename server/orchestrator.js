import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import flyManager from './fly-manager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(__dirname, '../state/current.json');
const WORKSPACE_PATH = path.join(__dirname, '../workspace');

// State machine states
export const STATES = {
  IDLE: 'IDLE',
  ORDERING: 'ORDERING',
  ARCH_WORKING: 'ARCH_WORKING',
  CLARIFYING: 'CLARIFYING',
  ARCH_REVIEW: 'ARCH_REVIEW',
  DEV_WORKING: 'DEV_WORKING',
  DEV_CHECK: 'DEV_CHECK',
  TEST_RUNNING: 'TEST_RUNNING',
  DELIVERING: 'DELIVERING',
  DEPLOYING: 'DEPLOYING',
  DONE: 'DONE',
  ERROR: 'ERROR'
};

// User stories configuration
const USER_STORIES = [
  {
    id: 1,
    name: 'Architecture',
    agent: 'Arc',
    status: 'waiting',
    cost: 0,
    time: 0
  },
  {
    id: 2,
    name: 'Development',
    agent: 'Dev',
    status: 'waiting',
    cost: 0,
    time: 0
  },
  {
    id: 3,
    name: 'Testing',
    agent: 'Tst',
    status: 'waiting',
    cost: 0,
    time: 0
  }
];

class Orchestrator {
  constructor() {
    this.state = STATES.IDLE;
    this.orderDescription = '';
    this.userStories = [...USER_STORIES];
    this.currentUS = null;
    this.retryCount = 0;
    this.maxRetries = 3;
    this.deployRetryCount = 0;
    this.maxDeployRetries = 2;
    this.deployTimeout = 300000; // 5 minutes
    this.questions = [];
    this.answers = [];
    this.agentOutputs = {};
    this.publicUrl = null;
    this.appName = null;
    this.error = null;
    this.listeners = [];
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners about state change
  notifyListeners() {
    const stateData = this.getState();
    this.listeners.forEach(listener => {
      try {
        listener(stateData);
      } catch (error) {
        console.error('Error notifying listener:', error);
      }
    });
  }

  // Broadcast custom event to listeners
  broadcastEvent(eventData) {
    this.listeners.forEach(listener => {
      try {
        listener(eventData);
      } catch (error) {
        console.error('Error broadcasting event:', error);
      }
    });
  }

  // Get current state snapshot
  getState() {
    return {
      state: this.state,
      orderDescription: this.orderDescription,
      userStories: this.userStories,
      currentUS: this.currentUS,
      questions: this.questions,
      retryCount: this.retryCount,
      deployRetryCount: this.deployRetryCount,
      agentOutputs: this.agentOutputs,
      publicUrl: this.publicUrl,
      appName: this.appName,
      error: this.error,
      totalCost: this.userStories.reduce((sum, us) => sum + us.cost, 0),
      totalTime: this.userStories.reduce((sum, us) => sum + us.time, 0)
    };
  }

  // Save state to file
  async saveState() {
    try {
      const stateData = this.getState();
      await fs.writeFile(STATE_FILE, JSON.stringify(stateData, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }

  // Load state from file
  async loadState() {
    try {
      const data = await fs.readFile(STATE_FILE, 'utf-8');
      const stateData = JSON.parse(data);
      
      this.state = stateData.state;
      this.orderDescription = stateData.orderDescription;
      this.userStories = stateData.userStories;
      this.currentUS = stateData.currentUS;
      this.questions = stateData.questions || [];
      this.retryCount = stateData.retryCount || 0;
      
      console.log('State loaded from file');
    } catch (error) {
      console.log('No previous state found, starting fresh');
    }
  }

  // Transition to new state
  async transition(newState, data = {}) {
    console.log(`State transition: ${this.state} -> ${newState}`);
    this.state = newState;
    
    // Update user story status if provided
    if (data.usId) {
      const us = this.userStories.find(u => u.id === data.usId);
      if (us) {
        if (data.status) us.status = data.status;
        if (data.cost !== undefined) us.cost += data.cost;
        if (data.time !== undefined) us.time += data.time;
      }
    }

    // Store questions if provided
    if (data.questions) {
      this.questions = data.questions;
    }

    // Store agent output if provided
    if (data.agentOutput && data.usId) {
      this.agentOutputs[data.usId] = data.agentOutput;
    }

    await this.saveState();
    this.notifyListeners();
  }

  // Start processing order
  async startOrder(orderDescription) {
    if (this.state !== STATES.IDLE) {
      throw new Error(`Cannot start order in state: ${this.state}`);
    }

    this.orderDescription = orderDescription;
    await this.transition(STATES.ORDERING);
    
    // Move to architecture phase
    await this.transition(STATES.ARCH_WORKING, {
      usId: 1,
      status: 'running'
    });

    return this.getState();
  }

  // Handle agent completion
  async handleAgentComplete(usId, result) {
    const us = this.userStories.find(u => u.id === usId);
    if (!us) {
      throw new Error(`User story ${usId} not found`);
    }

    // Check if agent returned questions
    if (result.questions && result.questions.length > 0) {
      this.currentUS = usId;
      await this.transition(STATES.CLARIFYING, {
        usId,
        questions: result.questions,
        agentOutput: result
      });
      return this.getState();
    }

    // Update US with cost and time
    await this.transition(this.state, {
      usId,
      cost: result.cost || 0,
      time: result.time || 0,
      agentOutput: result
    });

    // Determine next state based on current state
    switch (this.state) {
      case STATES.ARCH_WORKING:
        await this.transition(STATES.ARCH_REVIEW, {
          usId: 1,
          status: 'review',
          agentOutput: result
        });
        break;

      case STATES.DEV_WORKING:
        await this.transition(STATES.DEV_CHECK, {
          usId: 2,
          status: 'checking',
          agentOutput: result
        });
        break;

      case STATES.TEST_RUNNING:
        await this.transition(STATES.DELIVERING, {
          usId: 3,
          status: 'done',
          agentOutput: result
        });
        break;

      default:
        console.warn(`Unexpected state after agent complete: ${this.state}`);
    }

    return this.getState();
  }

  // Handle user approval (for ARCH_REVIEW)
  async handleApproval() {
    if (this.state !== STATES.ARCH_REVIEW) {
      throw new Error(`Cannot approve in state: ${this.state}`);
    }

    await this.transition(STATES.DEV_WORKING, {
      usId: 1,
      status: 'done'
    });

    await this.transition(STATES.DEV_WORKING, {
      usId: 2,
      status: 'running'
    });

    return this.getState();
  }

  // Handle answers to clarifying questions
  async handleAnswers(answers) {
    if (this.state !== STATES.CLARIFYING) {
      throw new Error(`Cannot provide answers in state: ${this.state}`);
    }

    this.answers = answers;
    this.questions = [];

    // Return to the appropriate working state
    if (this.currentUS === 1) {
      await this.transition(STATES.ARCH_WORKING, {
        usId: 1,
        status: 'running'
      });
    }

    return this.getState();
  }

  // Handle AC check result
  async handleACCheckResult(usId, passed) {
    const us = this.userStories.find(u => u.id === usId);
    if (!us) {
      throw new Error(`User story ${usId} not found`);
    }

    if (passed) {
      // AC check passed, move to next phase
      this.retryCount = 0;

      if (usId === 2) {
        // Development check passed, move to testing
        await this.transition(STATES.TEST_RUNNING, {
          usId: 2,
          status: 'done'
        });

        await this.transition(STATES.TEST_RUNNING, {
          usId: 3,
          status: 'running'
        });
      }
    } else {
      // AC check failed
      this.retryCount++;

      if (this.retryCount >= this.maxRetries) {
        // Max retries exceeded
        await this.transition(STATES.ERROR, {
          usId,
          status: 'error'
        });
      } else {
        // Retry agent
        console.log(`AC check failed, retry ${this.retryCount}/${this.maxRetries}`);
        
        if (usId === 2) {
          await this.transition(STATES.DEV_WORKING, {
            usId: 2,
            status: 'running'
          });
        }
      }
    }

    return this.getState();
  }

  // Handle delivery completion
  async handleDeliveryComplete() {
    if (this.state !== STATES.DELIVERING) {
      throw new Error(`Cannot complete delivery in state: ${this.state}`);
    }

    await this.transition(STATES.DEPLOYING);
    
    // Start deployment process
    await this.executeDeploy();
    
    return this.getState();
  }

  // Check if error should trigger retry
  shouldRetryDeploy(errorMessage) {
    const lowerError = errorMessage.toLowerCase();
    
    // Non-retryable errors (configuration issues)
    const nonRetryablePatterns = [
      'organization not found',
      'invalid api token',
      'authentication failed',
      'permission denied'
    ];
    
    if (nonRetryablePatterns.some(pattern => lowerError.includes(pattern))) {
      return false;
    }
    
    // Retryable errors (transient issues)
    const retryablePatterns = [
      'unable to pull image',
      'timeout',
      'network error',
      'connection refused',
      'temporary failure'
    ];
    
    return retryablePatterns.some(pattern => lowerError.includes(pattern));
  }

  // Execute deployment to Fly.io with timeout
  async executeDeploy() {
    console.log('[ORCHESTRATOR] Starting deployment to Fly.io');
    
    // Generate unique app name
    const appName = 'df-' + crypto.randomUUID().slice(0, 8);
    console.log(`[ORCHESTRATOR] Generated app name: ${appName}`);
    
    let appCreated = false;
    let timeoutId;
    
    try {
      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Deployment timeout exceeded (${this.deployTimeout / 1000}s)`));
        }, this.deployTimeout);
      });
      
      // Create deployment promise
      const deployPromise = (async () => {
        // Step 1: Create app
        console.log('[ORCHESTRATOR] Step 1: Creating Fly app');
        this.broadcastEvent({ type: 'deploy_progress', step: 'creating_app', message: 'Creating Fly.io app...' });
        
        const createResult = await flyManager.createApp(appName);
        
        if (!createResult.success) {
          throw new Error(`Failed to create app: ${createResult.error}`);
        }
        
        appCreated = true;
        this.appName = appName;
        
        // Step 2: Prepare workspace
        console.log('[ORCHESTRATOR] Step 2: Preparing workspace');
        this.broadcastEvent({ type: 'deploy_progress', step: 'preparing_workspace', message: 'Preparing deployment files...' });
        
        const prepareResult = await flyManager.prepareWorkspace(WORKSPACE_PATH, appName);
        
        if (!prepareResult.success) {
          throw new Error(`Failed to prepare workspace: ${prepareResult.error}`);
        }
        
        // Step 3: Deploy
        console.log('[ORCHESTRATOR] Step 3: Deploying to Fly.io');
        this.broadcastEvent({ type: 'deploy_progress', step: 'building_image', message: 'Building and deploying image...' });
        
        const deployResult = await flyManager.deploy(WORKSPACE_PATH, appName);
        
        if (!deployResult.success) {
          throw new Error(`Failed to deploy: ${deployResult.error}`);
        }
        
        // Step 4: Wait for healthy
        console.log('[ORCHESTRATOR] Step 4: Waiting for app to become healthy');
        this.broadcastEvent({ type: 'deploy_progress', step: 'waiting_healthy', message: 'Waiting for app to start...' });
        
        const healthResult = await flyManager.waitForHealthy(appName, 60000);
        
        if (!healthResult.success) {
          throw new Error(`App did not become healthy: ${healthResult.error}`);
        }
        
        return true;
      })();
      
      // Race between deployment and timeout
      await Promise.race([deployPromise, timeoutPromise]);
      
      // Clear timeout on success
      clearTimeout(timeoutId);
      
      // Success!
      this.publicUrl = flyManager.getAppUrl(appName);
      this.deployRetryCount = 0;
      this.error = null;
      
      console.log(`[ORCHESTRATOR] Deployment successful: ${this.publicUrl}`);
      await this.transition(STATES.DONE);
      
    } catch (error) {
      // Clear timeout
      if (timeoutId) clearTimeout(timeoutId);
      
      console.error(`[ORCHESTRATOR] Deployment error: ${error.message}`);
      
      // Cleanup: try to destroy app if it was created
      if (appCreated) {
        console.log(`[ORCHESTRATOR] Attempting cleanup: destroying ${appName}`);
        try {
          await flyManager.destroyApp(appName);
          console.log('[ORCHESTRATOR] Cleanup successful');
        } catch (cleanupError) {
          console.error(`[ORCHESTRATOR] Cleanup failed: ${cleanupError.message}`);
        }
      }
      
      // Determine if we should retry
      const shouldRetry = this.shouldRetryDeploy(error.message);
      
      if (shouldRetry && this.deployRetryCount < this.maxDeployRetries) {
        // Retry deployment
        this.deployRetryCount++;
        console.log(`[ORCHESTRATOR] Retrying deployment (${this.deployRetryCount}/${this.maxDeployRetries})`);
        this.notifyListeners();
        
        // Retry after a short delay
        setTimeout(() => this.executeDeploy(), 2000);
      } else {
        // Save error details and transition to ERROR
        this.error = {
          message: error.message,
          phase: 'DEPLOYING',
          appName: appCreated ? appName : null
        };
        
        const reason = shouldRetry
          ? `after ${this.maxDeployRetries} retries`
          : '(non-retryable error)';
        
        console.error(`[ORCHESTRATOR] Deployment failed ${reason}: ${error.message}`);
        await this.transition(STATES.ERROR);
      }
    }
  }

  // Reset orchestrator to initial state
  async reset() {
    console.log('[ORCHESTRATOR] Resetting from state:', this.state);
    this.state = STATES.IDLE;
    this.orderDescription = '';
    this.userStories = USER_STORIES.map(us => ({ ...us }));
    this.currentUS = null;
    this.retryCount = 0;
    this.deployRetryCount = 0;
    this.questions = [];
    this.answers = [];
    this.agentOutputs = {};
    this.publicUrl = null;
    this.appName = null;
    this.error = null;

    await this.saveState();
    this.notifyListeners();
    console.log('[ORCHESTRATOR] Reset complete, new state:', this.state);
  }
}

// Singleton instance
const orchestrator = new Orchestrator();

export default orchestrator;
