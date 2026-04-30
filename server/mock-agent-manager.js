/**
 * Mock Agent Manager for development/debugging
 * Returns hardcoded responses without calling OpenRouter API
 * Use with RUN_MODE=mock or RUN_MODE=demo
 */

// Mock responses for different scenarios
const MOCK_RESPONSES = {
  // Standard successful responses
  standard: {
    architect: {
      thinking: 'User wants a TODO application with add, complete, and delete functionality. I will design a simple Express backend with REST API endpoints and a vanilla JavaScript frontend. Data will be stored in-memory using an array.',
      files: [
        {
          path: 'ARCHITECTURE.md',
          description: 'Architecture document with system design and API specifications'
        },
        {
          path: 'app.js',
          description: 'Express server with REST API endpoints for CRUD operations'
        },
        {
          path: 'public/index.html',
          description: 'Single page with todo input form and task list'
        },
        {
          path: 'public/styles.css',
          description: 'CSS styling for clean, responsive UI'
        },
        {
          path: 'public/app.js',
          description: 'Client-side JavaScript for API calls and DOM manipulation'
        }
      ],
      questions: [],
      summary: 'Designed a simple TODO application with Express backend serving REST API, vanilla JavaScript frontend, and in-memory storage.',
      next_steps: [
        'Create Express server with CRUD endpoints',
        'Build HTML structure',
        'Implement client-side JavaScript',
        'Add CSS styling'
      ]
    },

    developer: {
      thinking: 'Implementing complete TODO application based on architecture. Creating Express backend with 4 REST endpoints, serving static files. Frontend with vanilla JavaScript using fetch API. In-memory storage using array.',
      files: [
        {
          path: 'app.js',
          content: `const express = require('express');
const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static('public'));

let todos = [];
let nextId = 1;

app.get('/api/todos', (req, res) => {
  res.json(todos);
});

app.post('/api/todos', (req, res) => {
  const todo = {
    id: nextId++,
    text: req.body.text,
    completed: false
  };
  todos.push(todo);
  res.status(201).json(todo);
});

app.put('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const todo = todos.find(t => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    res.json(todo);
  } else {
    res.status(404).json({ error: 'Todo not found' });
  }
});

app.delete('/api/todos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  todos = todos.filter(t => t.id !== id);
  res.status(204).send();
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Server running on http://0.0.0.0:\${PORT}\`);
});`,
          action: 'create'
        },
        {
          path: 'public/index.html',
          content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TODO App</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="container">
    <h1>📝 TODO List</h1>
    <form id="todo-form">
      <input type="text" id="todo-input" placeholder="Add a new task..." required>
      <button type="submit">Add</button>
    </form>
    <div id="stats"></div>
    <ul id="todo-list"></ul>
  </div>
  <script src="app.js"></script>
</body>
</html>`,
          action: 'create'
        },
        {
          path: 'public/styles.css',
          content: `* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }
.container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
h1 { text-align: center; margin-bottom: 20px; }
#todo-form { display: flex; gap: 10px; margin-bottom: 20px; }
#todo-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
button { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
button:hover { background: #0056b3; }
#todo-list { list-style: none; }
.todo-item { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #eee; gap: 10px; }
.todo-item.completed .todo-text { text-decoration: line-through; color: #999; }
.todo-text { flex: 1; }
.delete-btn { background: #dc3545; padding: 5px 10px; font-size: 14px; }`,
          action: 'create'
        },
        {
          path: 'public/app.js',
          content: `const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const stats = document.getElementById('stats');

async function loadTodos() {
  const response = await fetch('/api/todos');
  const todos = await response.json();
  renderTodos(todos);
  updateStats(todos);
}

function renderTodos(todos) {
  list.innerHTML = '';
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    li.innerHTML = \`
      <input type="checkbox" \${todo.completed ? 'checked' : ''} onchange="toggleTodo(\${todo.id})">
      <span class="todo-text">\${todo.text}</span>
      <button class="delete-btn" onclick="deleteTodo(\${todo.id})">Delete</button>
    \`;
    list.appendChild(li);
  });
}

function updateStats(todos) {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  stats.textContent = \`Total: \${total} | Completed: \${completed}\`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await fetch('/api/todos', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: input.value })
  });
  input.value = '';
  loadTodos();
});

async function toggleTodo(id) {
  await fetch(\`/api/todos/\${id}\`, { method: 'PUT' });
  loadTodos();
}

async function deleteTodo(id) {
  await fetch(\`/api/todos/\${id}\`, { method: 'DELETE' });
  loadTodos();
}

loadTodos();`,
          action: 'create'
        },
        {
          path: 'package.json',
          content: `{
  "name": "simple-todo-app",
  "version": "1.0.0",
  "description": "Simple TODO application",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "dependencies": {
    "express": "^4.18.0"
  }
}`,
          action: 'create'
        }
      ],
      questions: [],
      summary: 'Implemented complete TODO application with Express backend, HTML frontend, CSS styling, and client-side JavaScript. All files are complete and ready to run.',
      next_steps: [
        'Run npm install',
        'Start with node app.js',
        'Test CRUD operations',
        'Application ready for delivery'
      ]
    },

    tester: {
      thinking: 'Reviewing TODO application. Code structure is clean, Express server implements all CRUD endpoints correctly, client-side uses fetch API properly. Error handling present. CSS functional. Implementation matches architecture.',
      files: [],
      questions: [],
      summary: 'GOOD - Implementation is functional and follows architecture. Code quality is solid. Application ready to deploy.',
      next_steps: [
        'Test all CRUD operations',
        'Verify application starts correctly',
        'Application is ready for delivery'
      ]
    }
  },

  // Demo scenario with questions
  demo_with_questions: {
    architect: {
      thinking: 'User wants a TODO application. Need clarification on some features.',
      files: [],
      questions: [
        'Should the application support user authentication?',
        'Do you want to persist data or is in-memory storage acceptable?'
      ],
      summary: 'Need clarification before proceeding with architecture design.',
      next_steps: ['Wait for user answers']
    }
  }
};

class MockAgentManager {
  constructor() {
    const mode = process.env.RUN_MODE || 'production';
    console.log(`[MOCK AGENT MANAGER] Initialized in ${mode} mode`);
    this.scenario = 'standard'; // Can be changed to 'demo_with_questions'
  }

  /**
   * Set mock scenario
   */
  setScenario(scenario) {
    this.scenario = scenario;
    console.log(`[MOCK] Scenario set to: ${scenario}`);
  }

  /**
   * Mock agent call - returns hardcoded response
   */
  async callAgent(agentType, systemPrompt, userPrompt, options = {}) {
    console.log(`[MOCK] Calling ${agentType} agent...`);
    
    // Simulate API delay (shorter for mock)
    const delay = process.env.RUN_MODE === 'demo' ? 3000 : 1000;
    await this.sleep(delay);
    
    const responses = MOCK_RESPONSES[this.scenario];
    const mockResponse = responses?.[agentType];
    
    if (!mockResponse) {
      console.error(`[MOCK] No response for agent: ${agentType} in scenario: ${this.scenario}`);
      return {
        success: false,
        agent: agentType,
        error: `No mock response for agent: ${agentType}`,
        time: 1,
        cost: 0
      };
    }

    const time = Math.floor(delay / 1000);

    // Mock costs for display purposes
    const mockCosts = {
      architect: 0.25,
      developer: 0.35,
      tester: 0.05
    };

    const cost = mockCosts[agentType] || 0;

    console.log(`[MOCK] ${agentType} completed in ${time}s, cost: $${cost.toFixed(2)}`);

    return {
      success: true,
      agent: agentType,
      content: mockResponse,
      rawContent: JSON.stringify(mockResponse, null, 2),
      cost: cost,
      time: time,
      usage: {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total: 1500
      },
      model: `mock-${agentType}`
    };
  }

  /**
   * Mock agent call with retry (no retry needed in mock mode)
   */
  async callAgentWithRetry(agentType, systemPrompt, userPrompt, options = {}, maxRetries = 3) {
    return this.callAgent(agentType, systemPrompt, userPrompt, options);
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const mockAgentManager = new MockAgentManager();

export default mockAgentManager;
