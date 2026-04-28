const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const stats = document.getElementById('stats');

async function loadTodos() {
  try {
    const response = await fetch('/api/todos');
    const todos = await response.json();
    renderTodos(todos);
    updateStats(todos);
  } catch (error) {
    console.error('Error loading todos:', error);
  }
}

function renderTodos(todos) {
  list.innerHTML = '';
  todos.forEach(todo => {
    const li = document.createElement('li');
    li.className = 'todo-item' + (todo.completed ? ' completed' : '');
    
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = todo.completed;
    checkbox.onchange = () => toggleTodo(todo.id);
    
    const span = document.createElement('span');
    span.className = 'todo-text';
    span.textContent = todo.text;
    
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = () => deleteTodo(todo.id);
    
    li.appendChild(checkbox);
    li.appendChild(span);
    li.appendChild(deleteBtn);
    list.appendChild(li);
  });
}

function updateStats(todos) {
  const total = todos.length;
  const completed = todos.filter(t => t.completed).length;
  const active = total - completed;
  stats.textContent = `Total: ${total} | Active: ${active} | Completed: ${completed}`;
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  try {
    await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    input.value = '';
    loadTodos();
  } catch (error) {
    console.error('Error adding todo:', error);
  }
});

async function toggleTodo(id) {
  try {
    await fetch(`/api/todos/${id}`, { method: 'PUT' });
    loadTodos();
  } catch (error) {
    console.error('Error toggling todo:', error);
  }
}

async function deleteTodo(id) {
  try {
    await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    loadTodos();
  } catch (error) {
    console.error('Error deleting todo:', error);
  }
}

loadTodos();
