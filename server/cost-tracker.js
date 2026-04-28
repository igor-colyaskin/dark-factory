import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRACKING_FILE = path.join(__dirname, '../state/cost-tracking.json');

class CostTracker {
  constructor() {
    this.entries = [];
    this.totalCost = 0;
    this.totalTime = 0;
  }

  /**
   * Record a new cost entry
   * @param {object} entry - Cost entry data
   * @returns {object} The recorded entry with id
   */
  recordEntry(entry) {
    const record = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      usId: entry.usId,
      usName: entry.usName,
      agent: entry.agent,
      model: entry.model,
      cost: entry.cost || 0,
      time: entry.time || 0,
      tokens: {
        prompt: entry.tokens?.prompt || 0,
        completion: entry.tokens?.completion || 0,
        total: entry.tokens?.total || 0
      },
      status: entry.status || 'success',
      error: entry.error || null
    };

    this.entries.push(record);
    this.totalCost += record.cost;
    this.totalTime += record.time;

    console.log(`Cost tracked: US${record.usId} ${record.agent} - $${record.cost.toFixed(4)} in ${record.time}s`);

    return record;
  }

  /**
   * Get all entries for a specific user story
   * @param {number} usId - User story ID
   * @returns {Array} Array of entries
   */
  getEntriesByUS(usId) {
    return this.entries.filter(entry => entry.usId === usId);
  }

  /**
   * Get cost summary for a specific user story
   * @param {number} usId - User story ID
   * @returns {object} Summary with total cost and time
   */
  getSummaryByUS(usId) {
    const entries = this.getEntriesByUS(usId);
    
    return {
      usId,
      entryCount: entries.length,
      totalCost: entries.reduce((sum, e) => sum + e.cost, 0),
      totalTime: entries.reduce((sum, e) => sum + e.time, 0),
      totalTokens: entries.reduce((sum, e) => sum + e.tokens.total, 0),
      entries
    };
  }

  /**
   * Get overall summary
   * @returns {object} Overall summary
   */
  getOverallSummary() {
    const byUS = {};
    
    for (const entry of this.entries) {
      if (!byUS[entry.usId]) {
        byUS[entry.usId] = {
          usId: entry.usId,
          usName: entry.usName,
          cost: 0,
          time: 0,
          tokens: 0,
          calls: 0
        };
      }
      
      byUS[entry.usId].cost += entry.cost;
      byUS[entry.usId].time += entry.time;
      byUS[entry.usId].tokens += entry.tokens.total;
      byUS[entry.usId].calls += 1;
    }

    return {
      totalCost: this.totalCost,
      totalTime: this.totalTime,
      totalCalls: this.entries.length,
      totalTokens: this.entries.reduce((sum, e) => sum + e.tokens.total, 0),
      byUserStory: Object.values(byUS),
      entries: this.entries
    };
  }

  /**
   * Get the last N entries
   * @param {number} count - Number of entries to retrieve
   * @returns {Array} Array of entries
   */
  getRecentEntries(count = 10) {
    return this.entries.slice(-count);
  }

  /**
   * Format cost for display
   * @param {number} cost - Cost in dollars
   * @returns {string} Formatted cost string
   */
  formatCost(cost) {
    if (cost === 0) return '$0.00';
    if (cost < 0.01) return `$${cost.toFixed(4)}`;
    return `$${cost.toFixed(2)}`;
  }

  /**
   * Format time for display
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Save tracking data to file
   */
  async save() {
    try {
      const data = {
        totalCost: this.totalCost,
        totalTime: this.totalTime,
        entries: this.entries,
        savedAt: new Date().toISOString()
      };

      await fs.writeFile(TRACKING_FILE, JSON.stringify(data, null, 2), 'utf-8');
      console.log('Cost tracking data saved');
    } catch (error) {
      console.error('Error saving cost tracking data:', error.message);
    }
  }

  /**
   * Load tracking data from file
   */
  async load() {
    try {
      const data = await fs.readFile(TRACKING_FILE, 'utf-8');
      const parsed = JSON.parse(data);

      this.entries = parsed.entries || [];
      this.totalCost = parsed.totalCost || 0;
      this.totalTime = parsed.totalTime || 0;

      console.log(`Cost tracking data loaded: ${this.entries.length} entries`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error('Error loading cost tracking data:', error.message);
      }
    }
  }

  /**
   * Reset all tracking data
   */
  reset() {
    this.entries = [];
    this.totalCost = 0;
    this.totalTime = 0;
    console.log('Cost tracking data reset');
  }

  /**
   * Export tracking data for reporting
   * @returns {object} Formatted report data
   */
  exportReport() {
    const summary = this.getOverallSummary();
    
    return {
      summary: {
        totalCost: this.formatCost(summary.totalCost),
        totalTime: this.formatTime(summary.totalTime),
        totalCalls: summary.totalCalls,
        totalTokens: summary.totalTokens.toLocaleString()
      },
      byUserStory: summary.byUserStory.map(us => ({
        usId: us.usId,
        usName: us.usName,
        cost: this.formatCost(us.cost),
        time: this.formatTime(us.time),
        tokens: us.tokens.toLocaleString(),
        calls: us.calls
      })),
      entries: this.entries.map(entry => ({
        timestamp: entry.timestamp,
        usId: entry.usId,
        usName: entry.usName,
        agent: entry.agent,
        model: entry.model,
        cost: this.formatCost(entry.cost),
        time: this.formatTime(entry.time),
        tokens: entry.tokens.total.toLocaleString(),
        status: entry.status
      }))
    };
  }

  /**
   * Get statistics for a specific agent
   * @param {string} agentName - Agent name (architect, developer, tester)
   * @returns {object} Agent statistics
   */
  getAgentStats(agentName) {
    const agentEntries = this.entries.filter(e => e.agent === agentName);
    
    if (agentEntries.length === 0) {
      return {
        agent: agentName,
        calls: 0,
        totalCost: 0,
        totalTime: 0,
        totalTokens: 0,
        avgCost: 0,
        avgTime: 0
      };
    }

    const totalCost = agentEntries.reduce((sum, e) => sum + e.cost, 0);
    const totalTime = agentEntries.reduce((sum, e) => sum + e.time, 0);
    const totalTokens = agentEntries.reduce((sum, e) => sum + e.tokens.total, 0);

    return {
      agent: agentName,
      calls: agentEntries.length,
      totalCost,
      totalTime,
      totalTokens,
      avgCost: totalCost / agentEntries.length,
      avgTime: totalTime / agentEntries.length,
      avgTokens: totalTokens / agentEntries.length
    };
  }
}

// Singleton instance
const costTracker = new CostTracker();

export default costTracker;
