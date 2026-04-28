import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_FILE = path.join(__dirname, '../state/current.json');

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
    this.questions = [];
    this.answers = [];
    this.agentOutputs = {};
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

  // Get current state snapshot
  getState() {
    return {
      state: this.state,
      orderDescription: this.orderDescription,
      userStories: this.userStories,
      currentUS: this.currentUS,
      questions: this.questions,
      retryCount: this.retryCount,
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
          status: 'review'
        });
        break;

      case STATES.DEV_WORKING:
        await this.transition(STATES.DEV_CHECK, {
          usId: 2,
          status: 'checking'
        });
        break;

      case STATES.TEST_RUNNING:
        await this.transition(STATES.DELIVERING, {
          usId: 3,
          status: 'done'
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

    await this.transition(STATES.DONE);
    return this.getState();
  }

  // Reset orchestrator to initial state
  async reset() {
    this.state = STATES.IDLE;
    this.orderDescription = '';
    this.userStories = USER_STORIES.map(us => ({ ...us }));
    this.currentUS = null;
    this.retryCount = 0;
    this.questions = [];
    this.answers = [];
    this.agentOutputs = {};

    await this.saveState();
    this.notifyListeners();
  }
}

// Singleton instance
const orchestrator = new Orchestrator();

export default orchestrator;
