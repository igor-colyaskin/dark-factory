import { spawn } from 'child_process';
import { createServer } from 'net';
import { promisify } from 'util';
import { exec } from 'child_process';

const execAsync = promisify(exec);

const PORT_RANGE_START = 3100;
const PORT_RANGE_END = 3999;
const HEALTH_TIMEOUT_MS = 30000;
const HEALTH_POLL_MS = 500;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port, '127.0.0.1');
  });
}

async function findFreePort() {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error('No free port found in range 3100-3999');
}

async function waitForHttp(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
      if (res.status < 500) return true;
    } catch {
      // not ready yet
    }
    await new Promise(r => setTimeout(r, HEALTH_POLL_MS));
  }
  return false;
}

class SandboxManager {
  constructor() {
    this._proc = null; // { pid, port, child }
  }

  async start(workspaceDir) {
    if (this._proc) {
      return { port: this._proc.port };
    }

    console.log('[Sandbox] npm install...');
    await execAsync('npm install --prefer-offline', { cwd: workspaceDir, timeout: 120000 });

    const port = await findFreePort();
    console.log(`[Sandbox] Starting ui5 serve on port ${port}...`);

    // shell:true is required on Windows to resolve npx/ui5 from PATH
    const child = spawn('npm', ['run', 'sandbox', '--', '--port', String(port)], {
      cwd: workspaceDir,
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', d => console.log(`[sandbox] ${d.toString().trim()}`));
    child.stderr.on('data', d => console.log(`[sandbox] ${d.toString().trim()}`));
    child.on('exit', (code) => {
      console.log(`[Sandbox] Process exited (code ${code})`);
      this._proc = null;
    });

    const ready = await waitForHttp(`http://localhost:${port}`, HEALTH_TIMEOUT_MS);
    if (!ready) {
      child.kill();
      throw new Error(`ui5 serve не ответил за ${HEALTH_TIMEOUT_MS / 1000}с`);
    }

    console.log(`[Sandbox] Ready at http://localhost:${port}`);
    this._proc = { pid: child.pid, port, child };
    return { port };
  }

  stop() {
    if (this._proc) {
      console.log(`[Sandbox] Stopping pid ${this._proc.pid}`);
      try { this._proc.child.kill('SIGTERM'); } catch {}
      this._proc = null;
    }
  }

  getStatus() {
    return this._proc
      ? { running: true, port: this._proc.port }
      : { running: false };
  }
}

export default new SandboxManager();
