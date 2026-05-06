import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import { cp, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { createServer } from 'net';

const execAsync = promisify(exec);

const WORKSPACE_SRC = join(process.cwd(), 'workspace');
const WORKSPACES_DIR = join(process.cwd(), 'workspaces');
const PORT_RANGE_START = 3100;
const PORT_RANGE_END = 3999;
const HEALTH_TIMEOUT_MS = 60000;
const HEALTH_POLL_MS = 500;

async function findFreePort() {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    const free = await isPortFree(port);
    if (free) return port;
  }
  throw new Error('No free port found in range 3100-3999');
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => { server.close(); resolve(true); });
    server.listen(port, '127.0.0.1');
  });
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

class LocalRunner {
  // deploy: copy workspace → workspaces/{appName}/, npm install, npm start
  // returns { url, pid, port }
  async deploy(appName, onProgress) {
    const notify = onProgress || (() => {});
    const appDir = join(WORKSPACES_DIR, appName);

    notify('copying_workspace', `Копирую файлы приложения...`);
    await mkdir(WORKSPACES_DIR, { recursive: true });
    await cp(WORKSPACE_SRC, appDir, { recursive: true });

    notify('installing_deps', `npm install...`);
    await this._run('npm', ['install', '--prefer-offline'], appDir);

    const port = await findFreePort();
    notify('starting_app', `Запускаю приложение на порту ${port}...`);

    const child = spawn('node', ['app.js'], {
      cwd: appDir,
      env: { ...process.env, PORT: String(port) },
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', d => console.log(`[${appName}] ${d.toString().trim()}`));
    child.stderr.on('data', d => console.error(`[${appName}] ${d.toString().trim()}`));

    const url = `http://localhost:${port}`;
    notify('waiting_ready', `Жду готовности ${url}...`);

    const ready = await waitForHttp(url, HEALTH_TIMEOUT_MS);
    if (!ready) {
      child.kill();
      throw new Error(`Приложение ${appName} не ответило за ${HEALTH_TIMEOUT_MS / 1000}с`);
    }

    console.log(`[LocalRunner] ${appName} запущен: ${url} (pid ${child.pid})`);
    return { url, pid: child.pid, port };
  }

  // teardown: убить процесс по pid
  teardown(pid, appName) {
    try {
      process.kill(pid, 'SIGTERM');
      console.log(`[LocalRunner] Процесс ${pid} (${appName}) остановлен`);
    } catch (e) {
      // процесс уже не существует — не ошибка
      console.log(`[LocalRunner] Процесс ${pid} уже завершён`);
    }
  }

  // Запустить команду синхронно, вернуть промис
  _run(cmd, args, cwd) {
    return execAsync(`${cmd} ${args.join(' ')}`, { cwd });
  }
}

export default new LocalRunner();
