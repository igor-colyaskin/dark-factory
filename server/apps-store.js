import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STATE_DIR = path.join(__dirname, '../state');
const APPS_FILE = path.join(STATE_DIR, 'apps.json');
const APPS_FILE_TMP = path.join(STATE_DIR, 'apps.json.tmp');

/**
 * Initialize the apps store.
 * Creates state directory and apps.json file if they don't exist.
 * Validates existing file or creates backup if corrupted.
 * @returns {Promise<void>}
 */
async function init() {
  try {
    // Create state directory if it doesn't exist
    await fs.mkdir(STATE_DIR, { recursive: true });
    console.log('apps-store: state directory ready');

    // Check if apps.json exists
    try {
      const fileContent = await fs.readFile(APPS_FILE, 'utf-8');
      
      // Try to parse and validate structure
      try {
        const data = JSON.parse(fileContent);
        
        // Validate structure
        if (
          typeof data.version === 'number' &&
          typeof data.nextNumber === 'number' &&
          Array.isArray(data.apps)
        ) {
          console.log('apps-store: initialized, found valid apps.json');
          return;
        } else {
          // Invalid structure
          throw new Error('Invalid structure');
        }
      } catch (parseError) {
        // Parsing failed or structure invalid - create backup
        const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\./g, '-');
        const backupFile = path.join(STATE_DIR, `apps.json.corrupt-${timestamp}`);
        
        await fs.copyFile(APPS_FILE, backupFile);
        console.log(`apps-store: corrupt file backed up to ${backupFile}`);
        
        // Create new empty file
        await writeAppsFile(getInitialState());
        console.log('apps-store: created new apps.json after corruption');
      }
    } catch (error) {
      // File doesn't exist - create it
      if (error.code === 'ENOENT') {
        await writeAppsFile(getInitialState());
        console.log('apps-store: created new apps.json');
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('apps-store: initialization error:', error);
    throw error;
  }
}

/**
 * Get initial state structure
 * @returns {Object}
 */
function getInitialState() {
  return {
    version: 1,
    nextNumber: 1,
    apps: []
  };
}

/**
 * Read apps.json file
 * @returns {Promise<Object>}
 */
async function readAppsFile() {
  const content = await fs.readFile(APPS_FILE, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write apps.json file atomically
 * @param {Object} data - Data to write
 * @returns {Promise<void>}
 */
async function writeAppsFile(data) {
  // Write to temporary file first
  await fs.writeFile(APPS_FILE_TMP, JSON.stringify(data, null, 2), 'utf-8');
  
  // Atomically rename to actual file
  await fs.rename(APPS_FILE_TMP, APPS_FILE);
}

/**
 * Add a new app to the store
 * @param {Object} appData - App data
 * @param {string} appData.id - Fly app name (e.g., "df-abc123")
 * @param {string} appData.flyAppName - Fly app name (usually same as id)
 * @param {string} [appData.createdAt] - ISO timestamp (defaults to now)
 * @param {string} appData.order - Original order text
 * @param {string} appData.architectOutput - Full architect response
 * @param {string} appData.url - Deployed app URL
 * @param {Object} appData.metrics - Order metrics
 * @returns {Promise<Object>} - Added app record with assigned number
 */
async function addApp(appData) {
  const state = await readAppsFile();
  
  // Check for duplicate id
  const existingApp = state.apps.find(app => app.id === appData.id);
  if (existingApp) {
    throw new Error(`App with id ${appData.id} already exists`);
  }
  
  // Create app record
  const appRecord = {
    number: state.nextNumber,
    id: appData.id,
    flyAppName: appData.flyAppName,
    createdAt: appData.createdAt || new Date().toISOString(),
    order: appData.order,
    architectOutput: appData.architectOutput,
    url: appData.url,
    metrics: appData.metrics
  };
  
  // Increment nextNumber
  state.nextNumber++;
  
  // Add to apps array
  state.apps.push(appRecord);
  
  // Write atomically
  await writeAppsFile(state);
  
  console.log(`apps-store: added app ${appRecord.id} with number ${appRecord.number}`);
  
  return appRecord;
}

/**
 * Get all apps, sorted by createdAt DESC (newest first)
 * @returns {Promise<Array>}
 */
async function getAllApps() {
  const state = await readAppsFile();
  
  // Sort by createdAt DESC
  const sortedApps = [...state.apps].sort((a, b) => {
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
  
  return sortedApps;
}

/**
 * Get a single app by id
 * @param {string} id - App id
 * @returns {Promise<Object|null>} - App record or null if not found
 */
async function getApp(id) {
  const state = await readAppsFile();
  const app = state.apps.find(app => app.id === id);
  return app || null;
}

/**
 * Delete an app by id
 * @param {string} id - App id
 * @returns {Promise<boolean>} - true if deleted, false if not found
 */
async function deleteApp(id) {
  const state = await readAppsFile();
  
  const index = state.apps.findIndex(app => app.id === id);
  
  if (index === -1) {
    return false;
  }
  
  // Remove from array
  state.apps.splice(index, 1);
  
  // Write atomically (nextNumber is NOT rolled back)
  await writeAppsFile(state);
  
  console.log(`apps-store: deleted app ${id}`);
  
  return true;
}

export default {
  init,
  addApp,
  getAllApps,
  getApp,
  deleteApp
};
