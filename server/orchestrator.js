import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'node:crypto';
import { resolveProfile } from './profiles/index.js';
import verifierC from './verifier-c.js';
import fileManager from './file-manager.js';
import cardsRegistry from './cards-registry.js';

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
  SPEC_REVIEW: 'SPEC_REVIEW',
  DEV_WORKING: 'DEV_WORKING',
  DEV_CHECK: 'DEV_CHECK',
  TEST_RUNNING: 'TEST_RUNNING',
  DELIVERING: 'DELIVERING',
  DEPLOYING: 'DEPLOYING',
  VERIFYING: 'VERIFYING',
  GITHUB_PUSH: 'GITHUB_PUSH',
  DONE: 'DONE',
  ERROR: 'ERROR'
};

/**
 * Sanitize and validate app slug.
 * @param {string|undefined} raw - Raw slug from architect
 * @returns {string|null} - Clean slug or null if invalid/empty
 */
function sanitizeSlug(raw) {
  if (!raw || typeof raw !== 'string') return null;
  
  // Lowercase, keep only allowed chars
  let slug = raw.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  
  // Collapse multiple hyphens
  slug = slug.replace(/-+/g, '-');
  
  // Trim hyphens from edges
  slug = slug.replace(/^-+|-+$/g, '');
  
  // Must start with a letter
  if (!/^[a-z]/.test(slug)) {
    slug = 'app-' + slug;
  }
  
  // Length: 3-20
  if (slug.length < 3) return null;
  if (slug.length > 20) slug = slug.substring(0, 20).replace(/-+$/, '');
  
  return slug;
}

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
  },
  {
    id: 4,
    name: 'Verification',
    agent: 'Ver',
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
    // v0.3: negotiate fields
    this.clarifyHistory = [];
    this.clarifyRound = 0;
    this.maxClarifyRounds = 3;
    this.currentSpec = null;
    // UX-001: spec refinement
    this.refineRound = 0;
    this.maxRefineRounds = 3;
    this.agentOutputs = {};
    this.publicUrl = null;
    this.sourceUrl = null;
    this.appName = null;
    this.error = null;
    this.runMode = { name: 'production', fakeDeploy: false, demoDelays: false };
    this.profile = resolveProfile();
    this.listeners = [];
    // v0.5: reference spec from past order
    this.referenceSpec = null;
    // v0.7: verification report
    this.verificationReport = null;
    // v0.11: edit mode
    this.editMode = false;
    this.editSlug = null;
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

  // Broadcast custom event to listeners (includes full state)
  broadcastEvent(eventData) {
    const fullData = {
      ...this.getState(),
      ...eventData
    };

    this.listeners.forEach(listener => {
      try {
        listener(fullData);
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
      sourceUrl: this.sourceUrl,
      appName: this.appName,
      error: this.error,
      totalCost: this.userStories.reduce((sum, us) => sum + us.cost, 0),
      totalTime: this.userStories.reduce((sum, us) => sum + us.time, 0),
      isFakeDeploy: this.runMode.fakeDeploy,
      runMode: this.runMode.name,
      profileId: this.profile.id,
      // v0.3
      clarifyHistory: this.clarifyHistory,
      clarifyRound: this.clarifyRound,
      maxClarifyRounds: this.maxClarifyRounds,
      currentSpec: this.currentSpec,
      // UX-001
      refineRound: this.refineRound,
      maxRefineRounds: this.maxRefineRounds,
      // v0.5
      referenceSpec: this.referenceSpec,
      // v0.7
      verificationReport: this.verificationReport,
      // v0.11
      editMode: this.editMode,
      editSlug: this.editSlug,
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
        console.log(`[COST-DEBUG] Updating US${data.usId} - before: cost=${us.cost}, time=${us.time}`);
        console.log(`[COST-DEBUG] Incoming data - cost=${data.cost}, time=${data.time}, status=${data.status}`);
        
        if (data.status) us.status = data.status;
        if (data.cost !== undefined) us.cost += data.cost;
        if (data.time !== undefined) us.time += data.time;
        
        console.log(`[COST-DEBUG] Updating US${data.usId} - after: cost=${us.cost}, time=${us.time}`);
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

  /**
   * Detect "На основе #N:" prefix, look up the referenced app and read its SPEC.md.
   * Non-blocking: returns null on any failure so the order proceeds normally.
   * @returns {Promise<string|null>} spec content or null
   */
  async resolveReferenceSpec(orderDescription) {
    return null; // appsStore removed — reference feature not supported in IC profile
  }

  // Start processing order
  async startOrder(orderDescription) {
    if (this.state !== STATES.IDLE) {
      throw new Error(`Cannot start order in state: ${this.state}`);
    }

    this.orderDescription = orderDescription;
    this.referenceSpec = await this.resolveReferenceSpec(orderDescription);

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
      throw new Error('User story ' + usId + ' not found');
    }

    // Update US with cost and time
    await this.transition(this.state, {
      usId,
      cost: result.cost || 0,
      time: result.time || 0,
      agentOutput: result
    });

    // --- Architect (US 1) — v0.3 negotiate logic ---
    if (usId === 1) {
      const mode = result.mode;

      if (mode === 'clarify') {
        // Architect wants to ask questions
        this.questions = result.questions || [];
        await this.transition(STATES.CLARIFYING, {
          usId: 1,
          status: 'clarifying'
        });
        return this.getState();
      }

      if (mode === 'spec') {
        // Architect produced a spec — go to review
        this.currentSpec = result.spec || null;
        this.questions = [];
        await this.transition(STATES.SPEC_REVIEW, {
          usId: 1,
          status: 'review',
          agentOutput: result
        });
        return this.getState();
      }

      if (mode === 'patch') {
        // Delta-architect produced a patch-spec for edit mode
        this.currentSpec = result;
        this.questions = [];
        await this.transition(STATES.SPEC_REVIEW, {
          usId: 1,
          status: 'review',
          agentOutput: result
        });
        return this.getState();
      }

      // Unknown mode — treat as error
      console.error('Unknown architect mode:', mode);
      throw new Error('Architect returned unknown mode: ' + mode);
    }

    // --- Developer (US 2) ---
    if (usId === 2) {
      await this.transition(STATES.DEV_CHECK, {
        usId: 2,
        status: 'checking',
        agentOutput: result
      });
      return this.getState();
    }

    // --- Tester (US 3) ---
    if (usId === 3) {
      await this.transition(STATES.DELIVERING, {
        usId: 3,
        status: 'done',
        agentOutput: result
      });
      return this.getState();
    }

    console.warn('Unexpected usId in handleAgentComplete:', usId);
    return this.getState();
  }

  // Handle user approval (for SPEC_REVIEW)
  async handleApproval() {
    if (this.state !== STATES.SPEC_REVIEW) {
      throw new Error('Cannot approve in state: ' + this.state);
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
  async handleAnswers(answeredQuestions) {
    if (this.state !== STATES.CLARIFYING) {
      throw new Error('Cannot provide answers in state: ' + this.state);
    }

    // answeredQuestions: array of { id, text, answer }
    // Store in history
    this.clarifyHistory.push({ questions: answeredQuestions });
    this.clarifyRound++;
    this.questions = [];

    // Return to architect
    await this.transition(STATES.ARCH_WORKING, {
      usId: 1,
      status: 'running'
    });

    return this.getState();
  }

  // UX-001: return to architect from SPEC_REVIEW with a refinement message
  async handleRefineRequest(message) {
    if (this.state !== STATES.SPEC_REVIEW) {
      throw new Error('Cannot refine in state: ' + this.state);
    }
    if (this.refineRound >= this.maxRefineRounds) {
      throw new Error('Refinement limit reached (' + this.maxRefineRounds + ')');
    }

    this.clarifyHistory.push({ refine: true, message });
    this.clarifyRound = 0;
    this.refineRound++;
    this.questions = [];

    await this.transition(STATES.ARCH_WORKING, { usId: 1, status: 'running' });
    return this.getState();
  }

  async handleCancel() {
    if (this.state !== STATES.SPEC_REVIEW && this.state !== STATES.CLARIFYING) {
      throw new Error('Cannot cancel in state: ' + this.state);
    }

    console.log('[ORCHESTRATOR] Order cancelled by user from state:', this.state);
    await this.reset();
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

    // deployer:'none' takes priority over run mode (integration cards have no server)
    if (this.profile.deployer === 'none') {
      await this.executeNoDeploy();
    }

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

  /**
   * Archive completed app to apps-store.
   * Called before transitioning to DONE state.
   * Errors are logged but don't prevent order completion.
   */
  async archiveApp(options = {}) {
    try {
      // IC profile: register in cards-registry
      const cardSlug = this.currentSpec?.cardSlug;
      const cardName = this.currentSpec?.cardTitle || cardSlug;
      if (cardSlug) {
        cardsRegistry.registerCard({ slug: cardSlug, name: cardName || cardSlug });
        console.log(`[orchestrator] IC card registered: ${cardSlug}`);
      }
    } catch (err) {
      console.error(`[orchestrator] Failed to archive app: ${err.message}`);
    }
  }

  /**
   * Read all text files from workspace/ for GitHub commit.
   * Recursive — includes subdirectories (needed for Integration Card src/ structure).
   * Skips node_modules, .git, .env, and binary-looking files.
   * @returns {Promise<Array<{path: string, content: string}>>}
   */
  async readWorkspaceFiles() {
    const IGNORE = new Set(['node_modules', '.git', '.env', 'fly.toml']);
    const files = [];

    const readDir = async (dir, prefix) => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch (err) {
        console.warn('[ORCHESTRATOR] Cannot read workspace:', err.message);
        return;
      }
      for (const entry of entries) {
        if (IGNORE.has(entry.name)) continue;
        const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          await readDir(path.join(dir, entry.name), relativePath);
        } else if (entry.isFile()) {
          try {
            const content = await fs.readFile(path.join(dir, entry.name), 'utf-8');
            files.push({ path: relativePath, content });
          } catch (err) {
            console.warn(`[ORCHESTRATOR] Skipping ${relativePath}: ${err.message}`);
          }
        }
      }
    };

    await readDir(fileManager.workspaceDir, '');
    return files;
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
    this.clarifyHistory = [];
    this.clarifyRound = 0;
    this.currentSpec = null;
    this.refineRound = 0;
    this.agentOutputs = {};
    this.publicUrl = null;
    this.sourceUrl = null;
    this.appName = null;
    this.error = null;
    this.runMode = { name: 'production', fakeDeploy: false, demoDelays: false }; // Re-read run mode from environment
    this.profile = resolveProfile();  // Re-read profile from environment
    this.referenceSpec = null;
    this.verificationReport = null;
    this.editMode = false;
    this.editSlug = null;

    await this.saveState();
    this.notifyListeners();
    console.log('[ORCHESTRATOR] Reset complete, new state:', this.state);
  }

  refreshProfile() {
    this.profile = resolveProfile();
    console.log(`[ORCHESTRATOR] Profile refreshed: ${this.profile.id}`);
  }
}

// Singleton instance
const orchestrator = new Orchestrator();

export default orchestrator;
