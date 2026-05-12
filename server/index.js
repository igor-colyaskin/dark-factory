import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { rm, readFile, readdir, writeFile, cp } from 'fs/promises';
import { tmpdir } from 'os';
import { promisify } from 'util';
import AdmZip from 'adm-zip';
import multer from 'multer';
import orchestrator from './orchestrator.js';
import fileManager from './file-manager.js';
import costTracker from './cost-tracker.js';
import cardsRegistry from './cards-registry.js';
import { resolveProfile, setActiveProfile, getAvailableProfiles, getActiveProfileId } from './profiles/index.js';
import { validateEnvOrExit } from './env-validator.js';
import sandboxManager from './sandbox-manager.js';
import deltaArchitect from './prompts/integration-card/delta-architect.js';
import { buildChroniclePrompt } from './prompts/integration-card/chronicle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const execAsync = promisify(exec);

export const CARDS_DIR = path.join(__dirname, '../cards');
mkdirSync(CARDS_DIR, { recursive: true });

// AC error from npm test — passed to developer on retry
let lastACError = null;

// Determine run mode and select appropriate agent manager
const RUN_MODE = process.env.RUN_MODE || 'production';
console.log(`🏭 Dark Factory starting in ${RUN_MODE.toUpperCase()} mode`);

// Load active profile
const activeProfile = resolveProfile();
console.log(`   Profile: ${activeProfile.id} (${activeProfile.name})`);

// Validate environment variables before proceeding
validateEnvOrExit(RUN_MODE);

let agentManager;
let useMockWorkspace = false;

if (RUN_MODE === 'mock-fast' || RUN_MODE === 'demo') {
  const mockAgentManagerModule = await import('./mock-agent-manager.js');
  agentManager = mockAgentManagerModule.default;
  useMockWorkspace = true;
  console.log('   Using pre-built mock-workspace/');
} else if (RUN_MODE === 'mock-full') {
  const mockAgentManagerModule = await import('./mock-agent-manager.js');
  agentManager = mockAgentManagerModule.default;
  useMockWorkspace = false;
  console.log('   Using mock responses, writing to workspace/');
} else {
  const realAgentManagerModule = await import('./agent-manager.js');
  agentManager = realAgentManagerModule.default;
  useMockWorkspace = false;
  console.log('   Using real OpenRouter API');
}

const app = express();
const PORT = process.env.PORT || 3000;

// SSE clients storage
const sseClients = [];

// Middleware
app.use(express.json({ limit: '10mb' }));

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// SPA fallback: serve index.html for client-side routes
app.get(['/settings', '/my-apps'], (req, res) => {
  res.sendFile(path.join(__dirname, '../client/index.html'));
});

// SSE endpoint for real-time updates
app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Add client to list
  sseClients.push(res);

  // Send initial connection message
  res.write('data: {"type":"connected","message":"SSE connection established"}\n\n');

  // Keep connection alive with periodic heartbeat
  const heartbeat = setInterval(() => {
    res.write('data: {"type":"heartbeat"}\n\n');
  }, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(heartbeat);
    const index = sseClients.indexOf(res);
    if (index !== -1) {
      sseClients.splice(index, 1);
    }
    res.end();
  });
});

// Broadcast state updates to all SSE clients
function broadcastState(state) {
  const message = JSON.stringify({
    type: 'state_update',
    state: state
  });

  sseClients.forEach(client => {
    try {
      client.write(`data: ${message}\n\n`);
    } catch (error) {
      console.error('Error broadcasting to client:', error);
    }
  });
}

// Subscribe to orchestrator state changes
orchestrator.subscribe((state) => {
  console.log('State changed:', state.state);
  broadcastState(state);
});

// POST endpoint to accept orders
app.post('/api/order', async (req, res) => {
  const { description, imageData } = req.body;

  if (!description) {
    return res.status(400).json({
      success: false,
      message: 'Order description is required'
    });
  }

  try {
    console.log('Received order:', description);
    console.log('Current orchestrator state BEFORE reset:', orchestrator.state);

    // Always reset orchestrator before new order to ensure clean state
    await orchestrator.reset();
    console.log('Current orchestrator state AFTER reset:', orchestrator.state);
    sandboxManager.stop();
    // Start order processing
    await orchestrator.startOrder(description, imageData || null);
    console.log('Order started successfully, new state:', orchestrator.state);
    
    res.status(200).json({
      success: true,
      message: 'Order received and processing started',
      orderId: Date.now().toString()
    });
    
    // Start the pipeline workflow
    runPipeline().catch(error => {
      console.error('Pipeline error:', error);
      broadcastState({
        ...orchestrator.getState(),
        error: error.message
      });
    });
    
  } catch (error) {
    console.error('Error starting order:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST endpoint to approve architecture
app.post('/api/approve', async (req, res) => {
  try {
    await orchestrator.handleApproval();
    
    res.status(200).json({
      success: true,
      message: 'Architecture approved'
    });
    
    // Continue pipeline
    runPipeline().catch(error => {
      console.error('Pipeline error:', error);
    });
    
  } catch (error) {
    console.error('Error approving:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// POST endpoint to submit answers
app.post('/api/answers', async (req, res) => {
  const { answers } = req.body;

  // answers: array of { id, text, answer }
  if (!answers || !Array.isArray(answers)) {
    return res.status(400).json({
      success: false,
      message: 'Answers array is required'
    });
  }
  
  try {
    await orchestrator.handleAnswers(answers);
    
    res.status(200).json({
      success: true,
      message: 'Answers submitted'
    });
    
    // Continue pipeline
    runPipeline().catch(error => {
      console.error('Pipeline error:', error);
    });
    
  } catch (error) {
    console.error('Error submitting answers:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Reset orchestrator to IDLE from any state (used by "Повторить с изменениями" from DONE)
app.post('/api/reset', async (req, res) => {
  await orchestrator.reset();
  res.json({ success: true });
});

// UX-001: refine spec from SPEC_REVIEW without losing history
app.post('/api/refine', async (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ success: false, message: 'message is required' });
  }
  try {
    await orchestrator.handleRefineRequest(message.trim());
    res.status(200).json({ success: true });
    runPipeline().catch(error => console.error('Pipeline error:', error));
  } catch (error) {
    console.error('Error handling refine request:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// VIZ-001: IC sandbox preview
app.post('/api/sandbox/start', async (req, res) => {
  try {
    const { port } = await sandboxManager.start(fileManager.workspaceDir);
    res.json({ success: true, url: `http://localhost:${port}/test/manual/index.html` });
  } catch (e) {
    console.error('[Sandbox] start error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/sandbox/stop', (req, res) => {
  sandboxManager.stop();
  res.json({ success: true });
});

// ── My Apps: IC cards API (v0.11) ─────────────────────────────────────────────

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

app.get('/api/cards', (req, res) => {
  res.json(cardsRegistry.readRegistry());
});

app.delete('/api/cards/:slug', async (req, res) => {
  const { slug } = req.params;
  try {
    await sandboxManager.stop();
    const cardPath = path.join(CARDS_DIR, slug);
    if (existsSync(cardPath)) {
      await rm(cardPath, { recursive: true, force: true });
    }
    cardsRegistry.removeCard(slug);
    res.json({ success: true });
  } catch (e) {
    console.error('[Cards] delete error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/cards/:slug/preview', async (req, res) => {
  const { slug } = req.params;
  const cardPath = path.join(CARDS_DIR, slug);
  if (!existsSync(cardPath)) {
    return res.status(404).json({ success: false, message: 'Card not found' });
  }
  try {
    sandboxManager.stop();
    const { port } = await sandboxManager.start(cardPath);
    res.json({ success: true, url: `http://localhost:${port}/test/manual/index.html` });
  } catch (e) {
    console.error('[Cards] preview error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/cards/:slug/clone', async (req, res) => {
  const { slug } = req.params;
  const { newSlug } = req.body;

  if (!newSlug || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(newSlug)) {
    return res.status(400).json({ success: false, message: 'Invalid slug format' });
  }

  const sourceDir = path.join(CARDS_DIR, slug);
  const destDir = path.join(CARDS_DIR, newSlug);

  if (!existsSync(sourceDir)) {
    return res.status(404).json({ success: false, message: `Card "${slug}" not found` });
  }
  if (existsSync(destDir)) {
    return res.status(409).json({ success: false, message: `Card "${newSlug}" already exists` });
  }

  try {
    await cp(sourceDir, destDir, { recursive: true });

    const oldDot = slug.replace(/-/g, '.');
    const newDot = newSlug.replace(/-/g, '.');
    const oldSlash = slug.replace(/-/g, '/');
    const newSlash = newSlug.replace(/-/g, '/');

    // Longest forms first to avoid partial matches
    const replacements = [
      [`com.sap.partner.wz.${oldDot}`, `com.sap.partner.wz.${newDot}`],
      [`com/sap/partner/wz/${oldSlash}`, `com/sap/partner/wz/${newSlash}`],
      [slug, newSlug],
    ];

    const TEXT_EXTS = new Set(['.js', '.xml', '.json', '.yaml', '.yml', '.md', '.html', '.css', '.txt']);
    const SKIP_DIRS = new Set(['node_modules', '.git']);

    async function processDir(dir) {
      const entries = await readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) await processDir(path.join(dir, entry.name));
        } else if (entry.isFile() && TEXT_EXTS.has(path.extname(entry.name).toLowerCase())) {
          const filePath = path.join(dir, entry.name);
          try {
            let content = await readFile(filePath, 'utf8');
            let changed = false;
            for (const [from, to] of replacements) {
              if (content.includes(from)) { content = content.split(from).join(to); changed = true; }
            }
            if (changed) await writeFile(filePath, content, 'utf8');
          } catch { /* skip non-utf8 binary */ }
        }
      }
    }

    await processDir(destDir);

    const sourceEntry = cardsRegistry.readRegistry().find(e => e.slug === slug);
    const name = sourceEntry?.name ? `${sourceEntry.name} (clone)` : newSlug;
    cardsRegistry.registerCard({ slug: newSlug, name });

    res.json({ success: true, slug: newSlug, name });
  } catch (e) {
    console.error('[Cards] clone error:', e.message);
    if (existsSync(destDir)) await rm(destDir, { recursive: true, force: true }).catch(() => {});
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/cards/import', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded' });
  }
  const tmpDir = path.join(tmpdir(), `df-import-${Date.now()}`);
  try {
    const zip = new AdmZip(req.file.buffer);
    zip.extractAllTo(tmpDir, true);

    // Locate manifest — support both root-level and nested in one subfolder
    let manifestPath = path.join(tmpDir, 'src', 'manifest.json');
    if (!existsSync(manifestPath)) {
      // Try one level deeper (zip may contain a top-level folder)
      const entries = await readdir(tmpDir, { withFileTypes: true });
      const subdir = entries.find(e => e.isDirectory());
      if (subdir) {
        manifestPath = path.join(tmpDir, subdir.name, 'src', 'manifest.json');
      }
    }
    if (!existsSync(manifestPath)) {
      return res.status(400).json({ success: false, message: 'Invalid card: src/manifest.json not found' });
    }

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const appId = manifest?.['sap.app']?.id || '';
    const slug = appId.split('.').pop().toLowerCase();
    let name = manifest?.['sap.app']?.title || slug;
    // Resolve SAP card i18n binding {{KEY}} from i18n.properties
    const i18nMatch = name.match(/^\{\{([^}]+)\}\}$/);
    if (i18nMatch) {
      try {
        const i18nPath = path.join(path.dirname(manifestPath), 'i18n', 'i18n.properties');
        const i18n = await readFile(i18nPath, 'utf8');
        const hit = i18n.match(new RegExp(`^${i18nMatch[1]}=(.+)$`, 'm'));
        if (hit) name = hit[1].trim();
      } catch { /* fall back to slug below */ }
      if (i18nMatch) name = name.startsWith('{{') ? slug : name;
    }

    if (!slug) {
      return res.status(400).json({ success: false, message: 'Cannot determine card slug from sap.app.id' });
    }

    const destPath = path.join(CARDS_DIR, slug);
    if (existsSync(destPath)) {
      return res.status(409).json({ success: false, message: `Card "${slug}" already exists` });
    }

    const srcRoot = path.dirname(path.dirname(manifestPath)); // parent of src/
    await cp(srcRoot, destPath, { recursive: true });
    cardsRegistry.registerCard({ slug, name });

    res.json({ success: true, slug, name });
  } catch (e) {
    console.error('[Cards] import error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  } finally {
    rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

app.post('/api/cards/import-folder', async (req, res) => {
  const { files } = req.body;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ success: false, message: 'No files provided' });
  }

  const tmpDir = path.join(tmpdir(), `df-import-folder-${Date.now()}`);
  try {
    for (const { path: filePath, content } of files) {
      if (!filePath || typeof filePath !== 'string' || typeof content !== 'string') continue;
      // Prevent path traversal
      const normalized = path.normalize(filePath).replace(/\\/g, '/');
      if (normalized.startsWith('..') || path.isAbsolute(normalized)) continue;
      const dest = path.join(tmpDir, normalized);
      if (!dest.startsWith(tmpDir)) continue;
      mkdirSync(path.dirname(dest), { recursive: true });
      writeFileSync(dest, Buffer.from(content, 'base64'));
    }

    const manifestPath = path.join(tmpDir, 'src', 'manifest.json');
    if (!existsSync(manifestPath)) {
      return res.status(400).json({ success: false, message: 'Invalid card: src/manifest.json not found' });
    }

    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const appId = manifest?.['sap.app']?.id || '';
    const slug = appId.split('.').pop().toLowerCase();
    let name = manifest?.['sap.app']?.title || slug;
    const i18nMatch = name.match(/^\{\{([^}]+)\}\}$/);
    if (i18nMatch) {
      try {
        const i18nPath = path.join(path.dirname(manifestPath), 'i18n', 'i18n.properties');
        const i18n = await readFile(i18nPath, 'utf8');
        const hit = i18n.match(new RegExp(`^${i18nMatch[1]}=(.+)$`, 'm'));
        if (hit) name = hit[1].trim();
      } catch { }
      if (name.startsWith('{{')) name = slug;
    }

    if (!slug) {
      return res.status(400).json({ success: false, message: 'Cannot determine card slug from sap.app.id' });
    }

    const destPath = path.join(CARDS_DIR, slug);
    if (existsSync(destPath)) {
      return res.status(409).json({ success: false, message: `Card "${slug}" already exists` });
    }

    await cp(tmpDir, destPath, { recursive: true });
    cardsRegistry.registerCard({ slug, name });
    res.json({ success: true, slug, name });
  } catch (e) {
    console.error('[Cards] import-folder error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  } finally {
    rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
});

// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/cards/import-path', async (req, res) => {
  const { sourcePath } = req.body;
  if (!sourcePath || typeof sourcePath !== 'string') {
    return res.status(400).json({ success: false, message: 'sourcePath is required' });
  }

  const normalized = path.resolve(sourcePath);
  const manifestPath = path.join(normalized, 'src', 'manifest.json');

  if (!existsSync(manifestPath)) {
    return res.status(400).json({ success: false, message: 'Invalid card: src/manifest.json not found at that path' });
  }

  try {
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const slug = path.basename(normalized);
    let name = manifest?.['sap.app']?.title || slug;
    const i18nMatch = name.match(/^\{\{([^}]+)\}\}$/);
    if (i18nMatch) {
      try {
        const i18nPath = path.join(path.dirname(manifestPath), 'i18n', 'i18n.properties');
        const i18n = await readFile(i18nPath, 'utf8');
        const hit = i18n.match(new RegExp(`^${i18nMatch[1]}=(.+)$`, 'm'));
        if (hit) name = hit[1].trim();
      } catch { }
      if (name.startsWith('{{')) name = slug;
    }

    if (!slug) {
      return res.status(400).json({ success: false, message: 'Cannot determine card slug from sap.app.id' });
    }

    const destPath = path.join(CARDS_DIR, slug);
    if (existsSync(destPath)) {
      return res.status(409).json({ success: false, message: `Card "${slug}" already exists` });
    }

    await cp(normalized, destPath, { recursive: true });
    cardsRegistry.registerCard({ slug, name });
    res.json({ success: true, slug, name });
  } catch (e) {
    console.error('[Cards] import-path error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

// ── Chronicle (DOC-001) ───────────────────────────────────────────────────────

const REPO_ROOT = path.join(__dirname, '..');

function readVersionFromManifest(content) {
  try {
    return JSON.parse(content)?.['sap.app']?.applicationVersion?.version || null;
  } catch { return null; }
}

function readVersionFromPackage(content) {
  try {
    return JSON.parse(content)?.version || null;
  } catch { return null; }
}

function readLastVersionFromReadme(content) {
  // Looks for a markdown table row: | version | date | ... |
  const match = content.match(/\|\s*([\d.]+)\s*\|/g);
  if (!match) return null;
  return match[match.length - 1].match(/[\d.]+/)?.[0] || null;
}

function bumpManifestVersion(content, newVersion) {
  const obj = JSON.parse(content);
  if (obj?.['sap.app']?.applicationVersion) {
    obj['sap.app'].applicationVersion.version = newVersion;
  }
  return JSON.stringify(obj, null, 2);
}

function bumpPackageVersion(content, newVersion) {
  const obj = JSON.parse(content);
  obj.version = newVersion;
  return JSON.stringify(obj, null, 2);
}

function insertReadmeRow(content, newVersion, changelogRow, date) {
  const newRow = `| ${newVersion} | ${date} | ${changelogRow} |`;
  const tableHeader = '| Version | Date | Changes |';
  const tableSep = '|---------|------|---------|';

  if (content.includes('## Version History')) {
    // Table exists — append row after last table row
    const lines = content.split('\n');
    let lastTableLine = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('|')) lastTableLine = i;
    }
    if (lastTableLine >= 0) {
      lines.splice(lastTableLine + 1, 0, newRow);
      return lines.join('\n');
    }
  }
  // No table — append section at end
  const section = `\n## Version History\n\n${tableHeader}\n${tableSep}\n${newRow}\n`;
  return content.trimEnd() + section;
}

app.get('/api/chronicle/info', async (req, res) => {
  const { slug } = req.query;
  if (!slug) return res.status(400).json({ success: false, message: 'slug required' });

  const cardPath = path.join(CARDS_DIR, slug);
  if (!existsSync(cardPath)) {
    return res.status(404).json({ success: false, message: `Card "${slug}" not found` });
  }

  const versions = {};
  try {
    const mf = await readFile(path.join(cardPath, 'src', 'manifest.json'), 'utf8');
    versions.manifest = readVersionFromManifest(mf);
  } catch { versions.manifest = null; }

  try {
    const pk = await readFile(path.join(cardPath, 'package.json'), 'utf8');
    versions.package = readVersionFromPackage(pk);
  } catch { versions.package = null; }

  try {
    const rm = await readFile(path.join(cardPath, 'README.md'), 'utf8');
    versions.readme = readLastVersionFromReadme(rm);
  } catch { versions.readme = null; }

  // Git info: branch + last tag + commits since tag
  let branch = null, lastTag = null, commits = [];
  try {
    const { stdout: b } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd: cardPath });
    branch = b.trim();
    try {
      const { stdout: t } = await execAsync('git describe --tags --abbrev=0', { cwd: cardPath });
      lastTag = t.trim();
    } catch { lastTag = null; }

    const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
    const { stdout: log } = await execAsync(`git log ${range} --oneline`, { cwd: cardPath });
    commits = log.trim() ? log.trim().split('\n') : [];
  } catch { /* no git repo */ }

  res.json({ success: true, versions, branch, lastTag, commits });
});

app.post('/api/chronicle/generate', async (req, res) => {
  const { slug, newVersion } = req.body;
  if (!slug || !newVersion) {
    return res.status(400).json({ success: false, message: 'slug and newVersion required' });
  }

  const cardPath = path.join(CARDS_DIR, slug);
  if (!existsSync(cardPath)) {
    return res.status(404).json({ success: false, message: `Card "${slug}" not found` });
  }

  // Determine range: last tag → HEAD
  let lastTag = null, gitLog = '';
  try {
    try {
      const { stdout: t } = await execAsync('git describe --tags --abbrev=0', { cwd: cardPath });
      lastTag = t.trim();
    } catch { lastTag = null; }

    const range = lastTag ? `${lastTag}..HEAD` : 'HEAD';
    const { stdout } = await execAsync(`git log ${range} --oneline`, { cwd: cardPath });
    gitLog = stdout.trim();
  } catch (e) {
    return res.status(400).json({ success: false, message: `git log failed: ${e.message}` });
  }

  if (!gitLog) {
    return res.status(400).json({ success: false, message: 'No new commits since last tag' });
  }

  const fromRef = lastTag || 'beginning';
  const currentDate = new Date().toISOString().split('T')[0];
  const { system, user } = buildChroniclePrompt({ cardName: slug, fromRef, toRef: 'HEAD', newVersion, gitLog, currentDate });

  let llmResult;
  try {
    llmResult = await agentManager.callAgent('developer', system, user, { max_tokens: 1024, temperature: 0.3 });
  } catch (e) {
    return res.status(500).json({ success: false, message: `LLM error: ${e.message}` });
  }

  const { summary, changelogRow, confluenceSection } = llmResult.content;

  res.json({
    success: true,
    gitLog,
    summary,
    changelogRow,
    confluenceSection,
    newVersion,
    date: currentDate
  });
});

app.post('/api/chronicle/apply', async (req, res) => {
  const { slug, newVersion, changelogRow, confluenceSection, date } = req.body;
  if (!slug || !newVersion || !changelogRow) {
    return res.status(400).json({ success: false, message: 'slug, newVersion, changelogRow required' });
  }

  const cardPath = path.join(CARDS_DIR, slug);
  if (!existsSync(cardPath)) {
    return res.status(404).json({ success: false, message: `Card "${slug}" not found` });
  }

  const applied = [];

  // manifest.json
  try {
    const mfPath = path.join(cardPath, 'src', 'manifest.json');
    const content = await readFile(mfPath, 'utf8');
    await writeFile(mfPath, bumpManifestVersion(content, newVersion), 'utf8');
    applied.push('src/manifest.json');
  } catch { /* file may not exist */ }

  // package.json
  try {
    const pkPath = path.join(cardPath, 'package.json');
    const content = await readFile(pkPath, 'utf8');
    await writeFile(pkPath, bumpPackageVersion(content, newVersion), 'utf8');
    applied.push('package.json');
  } catch { /* file may not exist */ }

  // README.md
  try {
    const rmPath = path.join(cardPath, 'README.md');
    const content = existsSync(rmPath) ? await readFile(rmPath, 'utf8') : '';
    await writeFile(rmPath, insertReadmeRow(content, newVersion, changelogRow, date), 'utf8');
    applied.push('README.md');
  } catch (e) {
    return res.status(500).json({ success: false, message: `README update failed: ${e.message}` });
  }

  // confluence.md
  try {
    const cfPath = path.join(cardPath, 'confluence.md');
    const existing = existsSync(cfPath) ? await readFile(cfPath, 'utf8') : '';
    await writeFile(cfPath, existing.trimEnd() + '\n\n' + (confluenceSection || ''), 'utf8');
    applied.push('confluence.md');
  } catch { /* optional */ }

  res.json({ success: true, applied });
});

// ─────────────────────────────────────────────────────────────────────────────

// ── Edit Card (v0.11) ─────────────────────────────────────────────────────────

app.post('/api/edit/:slug', async (req, res) => {
  const { slug } = req.params;
  const { changeRequest } = req.body;

  if (!changeRequest?.trim()) {
    return res.status(400).json({ success: false, message: 'changeRequest required' });
  }

  const cardPath = path.join(CARDS_DIR, slug);
  if (!existsSync(cardPath)) {
    return res.status(404).json({ success: false, message: 'Card not found' });
  }

  try {
    await orchestrator.reset();
    sandboxManager.stop();

    orchestrator.editMode = true;
    orchestrator.editSlug = slug;
    fileManager.setWorkspace(cardPath);

    await orchestrator.startOrder(changeRequest.trim());

    res.json({ success: true, state: orchestrator.getState() });

    runPipeline().catch(err => {
      console.error('[Edit] Pipeline error:', err);
      broadcastState({ ...orchestrator.getState(), error: err.message });
    });
  } catch (e) {
    console.error('[Edit] start error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────

app.post('/api/cancel', async (req, res) => {
  try {
    await orchestrator.handleCancel();

    res.status(200).json({
      success: true,
      message: 'Order cancelled'
    });
  } catch (error) {
    console.error('Error cancelling:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET endpoint to get server info (including run mode)
app.get('/api/info', (req, res) => {
  res.json({
    runMode: RUN_MODE,
    version: '0.1.0',
    port: PORT
  });
});

// Profile settings endpoints
app.get('/api/settings/profile', (req, res) => {
  res.json({
    activeProfileId: getActiveProfileId(),
    profiles: getAvailableProfiles(),
  });
});

app.post('/api/settings/profile', (req, res) => {
  const { profileId } = req.body;
  if (!profileId) return res.status(400).json({ error: 'profileId required' });
  try {
    setActiveProfile(profileId);
    // Update orchestrator's cached profile
    orchestrator.refreshProfile();
    res.json({ activeProfileId: getActiveProfileId() });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Read all text files from a card directory for delta-architect context
async function readCardFilesForEdit(dirPath) {
  const IGNORE = new Set(['node_modules', '.git', '.DS_Store', 'Thumbs.db']);
  const BINARY_EXT = new Set(['.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.zip']);
  const files = [];

  async function readDir(dir, prefix) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      if (IGNORE.has(entry.name)) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await readDir(path.join(dir, entry.name), rel);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (!BINARY_EXT.has(ext)) {
          try {
            const content = await readFile(path.join(dir, entry.name), 'utf-8');
            files.push({ path: rel, content });
          } catch {}
        }
      }
    }
  }

  await readDir(dirPath, '');
  return files;
}

// Pipeline workflow
async function runPipeline() {
  const state = orchestrator.getState();
  
  try {
    switch (state.state) {
      case 'ARCH_WORKING':
        await runArchitect();
        break;
        
      case 'DEV_WORKING':
        await runDeveloper();
        break;
        
      case 'DEV_CHECK':
        await runDevCheck();
        break;
        
      case 'TEST_RUNNING':
        await runTester();
        break;
        
      case 'DELIVERING':
        await runDelivery();
        break;
    }
  } catch (error) {
    console.error('Pipeline step error:', error);
    throw error;
  }
}

// Run Architect agent
async function runArchitect() {
  console.log('Running Architect agent...');

  const state = orchestrator.getState();
  const profile = orchestrator.profile;

  // Vision pre-pass: run once on first architect call if image was provided
  if (state.imageData && !state.visionAnalysis) {
    console.log('Running vision pre-pass...');
    const visionResult = await agentManager.callVision(state.imageData);
    if (visionResult.success) {
      orchestrator.setVisionAnalysis(visionResult.analysis);
      costTracker.recordEntry({
        usId: 1,
        usName: 'Architecture',
        agent: 'vision',
        model: 'gemini-2.5-flash',
        cost: visionResult.cost,
        time: visionResult.time,
        tokens: visionResult.usage,
        status: 'success'
      });
      await costTracker.save();
      console.log('Vision analysis:', visionResult.analysis.substring(0, 200));
    } else {
      console.warn('Vision pre-pass failed (non-blocking):', visionResult.error);
    }
  }

  let systemPrompt, userPrompt;

  if (orchestrator.editMode) {
    // Edit mode: use delta-architect with existing card files
    const currentFiles = await readCardFilesForEdit(fileManager.workspaceDir);
    systemPrompt = deltaArchitect.systemPrompt;
    userPrompt = deltaArchitect.generateUserPrompt(state.orderDescription, currentFiles);
  } else {
    systemPrompt = profile.prompts.architect.systemPrompt;
    userPrompt = profile.prompts.architect.generateUserPrompt(
      state.orderDescription,
      state.clarifyHistory,
      state.clarifyRound,
      state.maxClarifyRounds,
      state.referenceSpec,
      state.currentSpec,
      orchestrator.visionAnalysis
    );
  }

  const result = await agentManager.callAgentWithRetry(
    'architect',
    systemPrompt,
    userPrompt,
    { max_tokens: 4000 }
  );
  
  // Record cost
  costTracker.recordEntry({
    usId: 1,
    usName: 'Architecture',
    agent: 'architect',
    model: result.model,
    cost: result.cost,
    time: result.time,
    tokens: result.usage,
    status: result.success ? 'success' : 'error'
  });
  
  await costTracker.save();
  
  if (!result.success) {
    throw new Error(`Architect failed: ${result.error}`);
  }
  
  const architectData = {
    ...result.content,
    cost: result.cost,
    time: result.time
  };
  
  await orchestrator.handleAgentComplete(1, architectData);
}

// Run Developer agent
async function runDeveloper() {
  console.log('Running Developer agent...');

  const state = orchestrator.getState();
  const profile = orchestrator.profile;

  // v0.3: pass spec directly to developer prompt
  const spec = state.currentSpec || state.agentOutputs[1] || null;

  if (!spec) {
    console.error('Spec/architecture not found!');
    throw new Error('Architecture output not found');
  }

  // IC profile: write files to cards/{slug}/ (persistent); others use workspace/
  if (profile.deployer === 'none' && spec?.cardSlug) {
    const cardPath = path.join(CARDS_DIR, spec.cardSlug);
    mkdirSync(cardPath, { recursive: true });
    fileManager.setWorkspace(cardPath);
  } else {
    fileManager.resetWorkspace();
  }

  const systemPrompt = profile.prompts.developer.systemPrompt;
  const userPrompt = profile.prompts.developer.generateUserPrompt(
    state.orderDescription,
    spec,
    state.retryCount,
    lastACError
  );

  const result = await agentManager.callAgentWithRetry(
    'developer',
    systemPrompt,
    userPrompt,
    { max_tokens: 16000 }
  );

  // Record cost
  costTracker.recordEntry({
    usId: 2,
    usName: 'Development',
    agent: 'developer',
    model: result.model,
    cost: result.cost,
    time: result.time,
    tokens: result.usage,
    status: result.success ? 'success' : 'error'
  });

  await costTracker.save();

  if (!result.success) {
    throw new Error('Developer failed: ' + result.error);
  }

  // Call 2: generate View.view.xml in a separate focused call (avoids Hyperspace ~8192 token limit)
  if (typeof profile.prompts.developer.viewGeneratorSystemPrompt === 'string') {
    console.log('[IC] Generating View.view.xml (separate LLM call)...');
    const dataHelperFile = result.content.files.find(f => f.path === 'src/helpers/DataHelper.js');
    const viewUserPrompt = profile.prompts.developer.generateViewUserPrompt(spec, dataHelperFile?.content || '');
    const viewResult = await agentManager.callAgentWithRetry(
      'developer',
      profile.prompts.developer.viewGeneratorSystemPrompt,
      viewUserPrompt,
      { max_tokens: 8000 }
    );
    costTracker.recordEntry({
      usId: 2,
      usName: 'Development',
      agent: 'developer-view',
      model: viewResult.model,
      cost: viewResult.cost,
      time: viewResult.time,
      tokens: viewResult.usage,
      status: viewResult.success ? 'success' : 'error'
    });
    await costTracker.save();
    if (viewResult.success && viewResult.content.files?.length > 0) {
      result.content.files = [...(result.content.files || []), ...viewResult.content.files];
      console.log('[IC] View.view.xml generated successfully');
    } else {
      console.error('[IC] View.view.xml generation failed:', viewResult.error);
      throw new Error('View generation failed: ' + viewResult.error);
    }
  }

  // Write files to workspace
  if (useMockWorkspace) {
    console.log('[MOCK-FAST] Copying pre-built mock-workspace/');
    await fileManager.copyMockWorkspace();
  } else {
    await fileManager.initWorkspace();
    const writeResult = await fileManager.writeFiles(result.content.files);
    if (!writeResult.success) {
      console.error('Some files failed to write:', writeResult.errors);
    }
    // Write static files directly from templates (IC profile only — skips LLM token overhead)
    if (typeof profile.prompts.developer.generateStaticFiles === 'function') {
      const staticFiles = profile.prompts.developer.generateStaticFiles(spec.cardSlug, spec);
      const staticResult = await fileManager.writeFiles(staticFiles);
      if (!staticResult.success) {
        console.error('Some static files failed to write:', staticResult.errors);
      }
      // Merge static files into result so Tester agent sees the full workspace
      result.content.files = [...(result.content.files || []), ...staticFiles];
    }

    // Generate DataHelper.qunit.js via separate LLM call (IC profile, generateTests only)
    // Kept separate to avoid hitting Hyperspace ~8192 token output limit with the main developer call
    if (spec.generateTests && typeof profile.prompts.developer.testGeneratorSystemPrompt === 'string') {
      console.log('[IC] Generating DataHelper.qunit.js (separate LLM call)...');
      const dataHelperFile = result.content.files.find(f => f.path === 'src/helpers/DataHelper.js');
      const testsUserPrompt = profile.prompts.developer.generateTestsUserPrompt(spec, dataHelperFile?.content || '');
      const testsResult = await agentManager.callAgentWithRetry(
        'developer',
        profile.prompts.developer.testGeneratorSystemPrompt,
        testsUserPrompt,
        { max_tokens: 4000 }
      );
      if (testsResult.success && testsResult.content.files?.length > 0) {
        const testFiles = testsResult.content.files;
        await fileManager.writeFiles(testFiles);
        result.content.files = [...result.content.files, ...testFiles];
        console.log('[IC] DataHelper.qunit.js generated successfully');
      } else {
        console.error('[IC] DataHelper.qunit.js generation failed — skipping tests');
      }
    }
  }

  const developerData = {
    ...result.content,
    cost: result.cost,
    time: result.time
  };

  await orchestrator.handleAgentComplete(2, developerData);

  // Continue to AC check
  await runPipeline();
}

// Run Development AC Check
async function runDevCheck() {
  console.log('Running Development AC Check...');

  // Integration Card profile: skip Node.js AC but run npm test if tests were generated
  if (orchestrator.profile.deployer === 'none') {
    const spec = orchestrator.currentSpec;
    if (spec && spec.generateTests) {
      console.log('[DEV_CHECK] IC profile — running npm test in workspace');
      try {
        console.log('[DEV_CHECK] Running npm install...');
        await execAsync('npm install', {
          cwd: fileManager.workspaceDir,
          timeout: 120000
        });
        const { stdout, stderr } = await execAsync('npm test', {
          cwd: fileManager.workspaceDir,
          timeout: 120000
        });
        console.log('[DEV_CHECK] npm test passed');
        if (stderr) console.warn('[DEV_CHECK] npm test stderr:', stderr);
        lastACError = null;
        await orchestrator.handleACCheckResult(2, true);
        await runPipeline();
      } catch (err) {
        const output = [err.stdout, err.stderr].filter(Boolean).join('\n');
        console.error('[DEV_CHECK] npm test failed:\n', output);
        lastACError = output;
        await orchestrator.handleACCheckResult(2, false);
        if (orchestrator.retryCount < orchestrator.maxRetries) {
          await runPipeline();
        }
      }
      return;
    }
    console.log('[DEV_CHECK] deployer=none — skipping nodejs AC checks');
    await orchestrator.handleACCheckResult(2, true);
    await runPipeline();
  }
}

// Run Tester agent
async function runTester() {
  console.log('Running Tester agent...');

  const state = orchestrator.getState();
  const profile = orchestrator.profile;
  const architectOutput = state.agentOutputs[1];
  const developerOutput = state.agentOutputs[2];

  if (!architectOutput || !developerOutput) {
    throw new Error('Previous agent outputs not found');
  }

  const systemPrompt = profile.prompts.tester.systemPrompt;
  const userPrompt = profile.prompts.tester.generateUserPrompt(
    state.orderDescription,
    architectOutput,
    developerOutput
  );
  
  const result = await agentManager.callAgentWithRetry(
    'tester',
    systemPrompt,
    userPrompt,
    { max_tokens: 8000 }
  );
  
  // Record cost
  costTracker.recordEntry({
    usId: 3,
    usName: 'Testing',
    agent: 'tester',
    model: result.model,
    cost: result.cost,
    time: result.time,
    tokens: result.usage,
    status: result.success ? 'success' : 'error'
  });
  
  await costTracker.save();
  
  if (!result.success) {
    throw new Error(`Tester failed: ${result.error}`);
  }
  
  console.log(`[COST-DEBUG] Tester result.cost: ${result.cost}, result.time: ${result.time}`);
  console.log(`[COST-DEBUG] Tester result.content.cost: ${result.content.cost}`);
  
  const testerData = {
    ...result.content,
    cost: result.cost,  // Override any cost from content
    time: result.time   // Override any time from content
  };
  
  console.log(`[COST-DEBUG] Passing to orchestrator - cost: ${testerData.cost}, time: ${testerData.time}`);
  
  await orchestrator.handleAgentComplete(3, testerData);
  
  // Continue to delivery
  await runPipeline();
}

// Run Delivery
async function runDelivery() {
  console.log('Running Delivery...');
  
  // Mark as done
  await orchestrator.handleDeliveryComplete();
  
  console.log('Application delivery complete!');
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
