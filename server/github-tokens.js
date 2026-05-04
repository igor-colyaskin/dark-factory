// server/github-tokens.js
// Persistence layer for GitHub OAuth tokens.
// Single-user: one token at a time.

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKENS_FILE = path.join(__dirname, '..', 'state', 'github-tokens.json');

/**
 * Save GitHub token and user info after successful OAuth.
 */
async function save({ token, username, userId }) {
  const payload = {
    token,
    username,
    userId,
    connectedAt: new Date().toISOString(),
  };
  await fs.writeFile(TOKENS_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

/**
 * Read current GitHub token info.
 * Returns null if not connected.
 */
async function read() {
  try {
    const content = await fs.readFile(TOKENS_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

/**
 * Remove GitHub token (disconnect).
 */
async function remove() {
  try {
    await fs.unlink(TOKENS_FILE);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      throw err;
    }
  }
}

/**
 * Quick check if GitHub is connected.
 */
async function isConnected() {
  const data = await read();
  return data !== null && !!data.token;
}

export default { save, read, remove, isConnected };