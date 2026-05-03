/**
 * Mock Agent Manager v2 (v0.3)
 *
 * Returns hardcoded responses without calling OpenRouter API.
 * Architect supports two modes: clarify and spec.
 *
 * Use with RUN_MODE=mock-fast or RUN_MODE=demo
 */

// --- Architect responses ---

const ARCHITECT_CLARIFY = {
  mode: 'clarify',
  thinking: 'The order is ambiguous. Need to understand scope and data requirements.',
  questions: [
    {
      id: 'q1',
      text: 'What type of items do you want to manage?',
      options: [
        'Tasks and to-do items',
        'Notes and documents',
        'Contacts and people'
      ],
      allowOther: true
    },
    {
      id: 'q2',
      text: 'Should data persist between server restarts?',
      options: [
        'No, in-memory is fine (simpler, data lost on restart)',
        'Yes, save to a file on server (survives restart)'
      ],
      allowOther: false
    }
  ],
  progress: 'Just a couple of questions to make sure I build the right thing.'
};

const ARCHITECT_SPEC = {
  mode: 'spec',
  thinking: 'Requirements are clear enough for a simple CRUD app with in-memory storage.',
  appSlug: 'todo-app',
  spec: {
    summary: 'Simple TODO application with in-memory storage',
    features: [
      'Add new tasks with text input',
      'Mark tasks as completed/uncompleted',
      'Delete tasks',
      'Show total and completed task count'
    ],
    screens: [
      'Single page: input form at top, task list below with checkboxes and delete buttons'
    ],
    constraints: [
      'Node.js + Express backend',
      'Vanilla HTML/CSS/JS frontend',
      'Data stored in server memory (array)'
    ],
    warnings: [
      'Data will be lost when server restarts'
    ],
    estimatedCost: '$0.30–0.50',
    estimatedTime: '2–3 min'
  }
};

// --- Developer response (unchanged from v0.2) ---

const DEVELOPER_RESPONSE = {
  thinking: 'Implementing complete TODO application based on spec. Creating Express backend with 4 REST endpoints, serving static files. Frontend with vanilla JavaScript using fetch API.',
  files: [
    {
      path: 'app.js',
      content: "const express = require('express');\nconst app = express();\nconst PORT = process.env.PORT || 8080;\n\napp.use(express.json());\napp.use(express.static('public'));\n\nlet todos = [];\nlet nextId = 1;\n\napp.get('/api/todos', (req, res) => {\n  res.json(todos);\n});\n\napp.post('/api/todos', (req, res) => {\n  const todo = {\n    id: nextId++,\n    text: req.body.text,\n    completed: false\n  };\n  todos.push(todo);\n  res.status(201).json(todo);\n});\n\napp.put('/api/todos/:id', (req, res) => {\n  const id = parseInt(req.params.id);\n  const todo = todos.find(t => t.id === id);\n  if (todo) {\n    todo.completed = !todo.completed;\n    res.json(todo);\n  } else {\n    res.status(404).json({ error: 'Todo not found' });\n  }\n});\n\napp.delete('/api/todos/:id', (req, res) => {\n  const id = parseInt(req.params.id);\n  todos = todos.filter(t => t.id !== id);\n  res.status(204).send();\n});\n\napp.listen(PORT, '0.0.0.0', () => {\n  console.log(`Server running on http://0.0.0.0:${PORT}`);\n});",
      action: 'create'
    },
    {
      path: 'public/index.html',
      content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>TODO App</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <div class="container">\n    <h1>TODO List</h1>\n    <form id="todo-form">\n      <input type="text" id="todo-input" placeholder="Add a new task..." required>\n      <button type="submit">Add</button>\n    </form>\n    <div id="stats"></div>\n    <ul id="todo-list"></ul>\n  </div>\n  <script src="app.js"></script>\n</body>\n</html>',
      action: 'create'
    },
    {
      path: 'public/styles.css',
      content: '* { margin: 0; padding: 0; box-sizing: border-box; }\nbody { font-family: Arial, sans-serif; background: #f5f5f5; padding: 20px; }\n.container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }\nh1 { text-align: center; margin-bottom: 20px; }\n#todo-form { display: flex; gap: 10px; margin-bottom: 20px; }\n#todo-input { flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }\nbutton { padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }\nbutton:hover { background: #0056b3; }\n#todo-list { list-style: none; }\n.todo-item { display: flex; align-items: center; padding: 12px; border-bottom: 1px solid #eee; gap: 10px; }\n.todo-item.completed .todo-text { text-decoration: line-through; color: #999; }\n.todo-text { flex: 1; }\n.delete-btn { background: #dc3545; padding: 5px 10px; font-size: 14px; }',
      action: 'create'
    },
    {
      path: 'public/app.js',
      content: "const form = document.getElementById('todo-form');\nconst input = document.getElementById('todo-input');\nconst list = document.getElementById('todo-list');\nconst stats = document.getElementById('stats');\n\nasync function loadTodos() {\n  const response = await fetch('/api/todos');\n  const todos = await response.json();\n  renderTodos(todos);\n  updateStats(todos);\n}\n\nfunction renderTodos(todos) {\n  list.innerHTML = '';\n  todos.forEach(todo => {\n    const li = document.createElement('li');\n    li.className = 'todo-item' + (todo.completed ? ' completed' : '');\n    li.innerHTML = `\n      <input type=\"checkbox\" ${todo.completed ? 'checked' : ''} onchange=\"toggleTodo(${todo.id})\">\n      <span class=\"todo-text\">${todo.text}</span>\n      <button class=\"delete-btn\" onclick=\"deleteTodo(${todo.id})\">Delete</button>\n    `;\n    list.appendChild(li);\n  });\n}\n\nfunction updateStats(todos) {\n  const total = todos.length;\n  const completed = todos.filter(t => t.completed).length;\n  stats.textContent = `Total: ${total} | Completed: ${completed}`;\n}\n\nform.addEventListener('submit', async (e) => {\n  e.preventDefault();\n  await fetch('/api/todos', {\n    method: 'POST',\n    headers: { 'Content-Type': 'application/json' },\n    body: JSON.stringify({ text: input.value })\n  });\n  input.value = '';\n  loadTodos();\n});\n\nasync function toggleTodo(id) {\n  await fetch(`/api/todos/${id}`, { method: 'PUT' });\n  loadTodos();\n}\n\nasync function deleteTodo(id) {\n  await fetch(`/api/todos/${id}`, { method: 'DELETE' });\n  loadTodos();\n}\n\nloadTodos();",
      action: 'create'
    },
    {
      path: 'package.json',
      content: '{\n  "name": "simple-todo-app",\n  "version": "1.0.0",\n  "description": "Simple TODO application",\n  "main": "app.js",\n  "scripts": {\n    "start": "node app.js"\n  },\n  "engines": {\n    "node": ">=20.0.0"\n  },\n  "dependencies": {\n    "express": "^4.18.0"\n  }\n}',
      action: 'create'
    }
  ],
  questions: [],
  summary: 'Implemented complete TODO application with Express backend, HTML frontend, CSS styling, and client-side JavaScript.',
  next_steps: [
    'Run npm install',
    'Start with node app.js',
    'Test CRUD operations'
  ]
};

// --- Tester response (unchanged from v0.2) ---

const TESTER_RESPONSE = {
  thinking: 'Reviewing TODO application. Code structure is clean, Express server implements all CRUD endpoints correctly. Error handling present. Implementation matches architecture.',
  files: [],
  questions: [],
  summary: 'GOOD - Implementation is functional and follows architecture. Code quality is solid. Application ready to deploy.',
  next_steps: [
    'Test all CRUD operations',
    'Verify application starts correctly',
    'Application is ready for delivery'
  ]
};

// --- Clear order detection ---

const CLEAR_ORDER_PATTERN = /\b(todo|calculator|timer|clock|pomodoro|counter|stopwatch|converter|quiz)\b/i;

class MockAgentManager {
  constructor() {
    const mode = process.env.RUN_MODE || 'production';
    console.log('[MOCK AGENT MANAGER] Initialized in ' + mode + ' mode');
  }

  /**
   * Mock agent call — returns hardcoded response based on agent type.
   *
   * For architect:
   *  - If order matches CLEAR_ORDER_PATTERN → spec immediately
   *  - If user prompt contains "Clarifications So Far" → spec (repeat call)
   *  - Otherwise → clarify
   */
  async callAgent(agentType, systemPrompt, userPrompt, options) {
    console.log('[MOCK] Calling ' + agentType + ' agent...');

    // Simulate delay
    const delay = process.env.RUN_MODE === 'demo' ? 3000 : 1000;
    await this.sleep(delay);

    const time = Math.floor(delay / 1000);

    // Mock costs
    const mockCosts = {
      architect: 0.25,
      developer: 0.35,
      tester: 0.05
    };
    const cost = mockCosts[agentType] || 0;

    // Select response
    let content;

    if (agentType === 'architect') {
      content = this.selectArchitectResponse(userPrompt);
    } else if (agentType === 'developer') {
      content = DEVELOPER_RESPONSE;
    } else if (agentType === 'tester') {
      content = TESTER_RESPONSE;
    } else {
      return {
        success: false,
        agent: agentType,
        error: 'No mock response for agent: ' + agentType,
        time: time,
        cost: 0
      };
    }

    console.log('[MOCK] ' + agentType + ' completed in ' + time + 's, cost: $' + cost.toFixed(2));

    return {
      success: true,
      agent: agentType,
      content: content,
      rawContent: JSON.stringify(content, null, 2),
      cost: cost,
      time: time,
      usage: {
        prompt_tokens: 1000,
        completion_tokens: 500,
        total: 1500
      },
      model: 'mock-' + agentType
    };
  }

  /**
   * Decide which architect response to return.
   */
  selectArchitectResponse(userPrompt) {
    // Repeat call (has history) → always spec
    if (userPrompt.includes('Clarifications So Far')) {
      console.log('[MOCK] Architect: repeat call detected → spec');
      return ARCHITECT_SPEC;
    }

    // Clear order → spec immediately
    if (CLEAR_ORDER_PATTERN.test(userPrompt)) {
      console.log('[MOCK] Architect: clear order detected → spec');
      return ARCHITECT_SPEC;
    }

    // Ambiguous order → clarify
    console.log('[MOCK] Architect: ambiguous order → clarify');
    return ARCHITECT_CLARIFY;
  }

  /**
   * Mock callAgentWithRetry — no retry needed in mock mode.
   */
  async callAgentWithRetry(agentType, systemPrompt, userPrompt, options, maxRetries) {
    return this.callAgent(agentType, systemPrompt, userPrompt, options);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

const mockAgentManager = new MockAgentManager();

export default mockAgentManager;