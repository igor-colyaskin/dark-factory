// Agent configurations
const AGENTS = {
  architect: {
    name: 'Architect',
    model: 'anthropic/claude-opus-4',
    role: 'Architecture and planning'
  },
  developer: {
    name: 'Developer',
    model: 'anthropic/claude-sonnet-4',
    role: 'Code implementation'
  },
  tester: {
    name: 'Tester',
    model: 'google/gemini-2.5-flash',
    role: 'Code review and testing'
  }
};

class AgentManager {
  constructor() {
    this.apiKey = process.env.OPENROUTER_API_KEY;
    this.apiUrl = 'https://openrouter.ai/api/v1/chat/completions';

    if (!this.apiKey) {
      console.warn('WARNING: OPENROUTER_API_KEY not set in environment variables');
    }
  }

  /**
   * Call an agent with the given prompt
   * @param {string} agentType - 'architect', 'developer', or 'tester'
   * @param {string} systemPrompt - System prompt for the agent
   * @param {string} userPrompt - User prompt with task description
   * @param {object} options - Additional options (temperature, max_tokens, etc.)
   * @returns {Promise<object>} Agent response with parsed data
   */
  async callAgent(agentType, systemPrompt, userPrompt, options = {}) {
    const agent = AGENTS[agentType];
    if (!agent) {
      throw new Error(`Unknown agent type: ${agentType}`);
    }

    if (!this.apiKey) {
      throw new Error('OPENROUTER_API_KEY is not configured');
    }

    console.log(`Calling ${agent.name} agent (${agent.model})...`);
    const startTime = Date.now();

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://dark-factory.local',
          'X-Title': 'Dark Factory v0.1'
        },
        body: JSON.stringify({
          model: agent.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user',
              content: userPrompt
            }
          ],
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 8192,
          stream: false,
          ...options
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}\n${errorText}`);
      }

      const data = await response.json();

      // Diagnostic logging
      const finishReason = data.choices?.[0]?.finish_reason;
      const contentLength = data.choices?.[0]?.message?.content?.length;
      console.log(`Finish reason: ${finishReason}, Content length: ${contentLength}`);

      if (finishReason === 'length') {
        throw new Error('Response truncated: max_tokens too low. Increase max_tokens.');
      }

      const endTime = Date.now();
      const elapsedTime = Math.round((endTime - startTime) / 1000); // seconds

      // Extract content from response
      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content in API response');
      }

      // Parse JSON from content
      const parsedContent = this.parseAgentResponse(content);

      // Extract cost information
      const cost = this.extractCost(data);

      console.log(`${agent.name} completed in ${elapsedTime}s, cost: $${cost.toFixed(4)}`);

      return {
        success: true,
        agent: agentType,
        content: parsedContent,
        rawContent: content,
        cost: cost,
        time: elapsedTime,
        usage: data.usage || {},
        model: agent.model
      };

    } catch (error) {
      const endTime = Date.now();
      const elapsedTime = Math.round((endTime - startTime) / 1000);

      console.error(`${agent.name} failed after ${elapsedTime}s:`, error.message);

      return {
        success: false,
        agent: agentType,
        error: error.message,
        time: elapsedTime,
        cost: 0
      };
    }
  }

  /**
   * Parse agent response - expects JSON format
   * @param {string} content - Raw content from agent
   * @returns {object} Parsed JSON object
   */
  parseAgentResponse(content) {
    // Try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonContent = jsonMatch ? jsonMatch[1] : content;

    try {
      const parsed = JSON.parse(jsonContent.trim());
      
      // Validate required fields
      if (!parsed.thinking) {
        console.warn('Warning: Agent response missing "thinking" field');
      }
      if (!parsed.files) {
        console.warn('Warning: Agent response missing "files" field');
        parsed.files = [];
      }
      if (!parsed.summary) {
        console.warn('Warning: Agent response missing "summary" field');
      }

      return parsed;
    } catch (firstError) {
      // Fix unescaped newlines inside JSON string values
      try {
        const fixed = jsonContent.replace(
          /"([^"\\]|\\.)*(?:\n)([^"\\]|\\.)*"/g,
          (match) => match.replace(/\n/g, '\\n')
        );
        const parsed = JSON.parse(fixed.trim());
        
        // Validate required fields
        if (!parsed.thinking) {
          console.warn('Warning: Agent response missing "thinking" field');
        }
        if (!parsed.files) {
          console.warn('Warning: Agent response missing "files" field');
          parsed.files = [];
        }
        if (!parsed.summary) {
          console.warn('Warning: Agent response missing "summary" field');
        }

        return parsed;
      } catch (secondError) {
        console.error('Failed to parse even after fix:', secondError.message);
        console.error('Content:', jsonContent.substring(0, 500));
        throw new Error(`Invalid JSON response from agent: ${firstError.message}`);
      }
    }
  }

  /**
   * Extract cost from OpenRouter API response
   * @param {object} data - API response data
   * @returns {number} Cost in dollars
   */
  extractCost(data) {
    // OpenRouter may provide cost directly
    if (data.usage?.total_cost) {
      return data.usage.total_cost;
    }

    // Fallback: calculate from tokens if pricing info available
    if (data.usage?.prompt_tokens && data.usage?.completion_tokens) {
      // These are approximate prices, actual prices may vary
      const modelPricing = {
        'anthropic/claude-opus-4': { input: 15 / 1_000_000, output: 75 / 1_000_000 },
        'anthropic/claude-sonnet-4': { input: 3 / 1_000_000, output: 15 / 1_000_000 },
        'google/gemini-2.0-flash-exp:free': { input: 0, output: 0 }
      };

      const model = data.model || '';
      const pricing = Object.entries(modelPricing).find(([key]) => model.includes(key))?.[1];

      if (pricing) {
        const inputCost = data.usage.prompt_tokens * pricing.input;
        const outputCost = data.usage.completion_tokens * pricing.output;
        return inputCost + outputCost;
      }
    }

    return 0;
  }

  /**
   * Retry agent call with error feedback
   * @param {string} agentType - Agent type
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @param {string} errorMessage - Error message from previous attempt
   * @param {number} attemptNumber - Current attempt number
   * @param {object} options - Additional options
   * @returns {Promise<object>} Agent response
   */
  async retryAgent(agentType, systemPrompt, userPrompt, errorMessage, attemptNumber, options = {}) {
    console.log(`Retrying ${agentType} agent (attempt ${attemptNumber})...`);

    const retryPrompt = `${userPrompt}\n\n---\nPREVIOUS ATTEMPT FAILED:\n${errorMessage}\n\nPlease fix the issue and provide a valid response.`;

    return this.callAgent(agentType, systemPrompt, retryPrompt, options);
  }

  /**
   * Call agent with automatic retry on JSON parse errors
   * @param {string} agentType - Agent type
   * @param {string} systemPrompt - System prompt
   * @param {string} userPrompt - User prompt
   * @param {object} options - Additional options
   * @param {number} maxRetries - Maximum number of retries (default: 3)
   * @returns {Promise<object>} Agent response
   */
  async callAgentWithRetry(agentType, systemPrompt, userPrompt, options = {}, maxRetries = 3) {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = attempt === 1
          ? await this.callAgent(agentType, systemPrompt, userPrompt, options)
          : await this.retryAgent(agentType, systemPrompt, userPrompt, lastError, attempt, options);

        if (result.success) {
          return result;
        }

        lastError = result.error;
      } catch (error) {
        lastError = error.message;
        console.error(`Attempt ${attempt} failed:`, error.message);
      }

      if (attempt < maxRetries) {
        console.log(`Will retry in 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    throw new Error(`Agent ${agentType} failed after ${maxRetries} attempts. Last error: ${lastError}`);
  }
}

// Singleton instance
const agentManager = new AgentManager();

export default agentManager;
