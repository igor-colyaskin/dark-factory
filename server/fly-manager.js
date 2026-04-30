import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);
const FLY_CMD = process.env.FLY_CMD || 'fly';

class FlyManager {
  constructor() {
    this.apiToken = process.env.FLY_API_TOKEN;
    this.orgSlug = process.env.FLY_ORG_SLUG;
    this.maxRetries = 2; // Max retry attempts for transient errors

    if (!this.apiToken) {
      console.warn('[FlyManager] Warning: FLY_API_TOKEN not set');
    }
    if (!this.orgSlug) {
      console.warn('[FlyManager] Warning: FLY_ORG_SLUG not set');
    }
  }

  /**
   * Check if error is transient and should be retried
   * @param {string} errorMessage - Error message
   * @returns {boolean}
   */
  isTransientError(errorMessage) {
    const transientPatterns = [
      'unable to pull image',
      'timeout',
      'connection refused',
      'network error',
      'temporary failure',
      'try again'
    ];
    
    const lowerError = errorMessage.toLowerCase();
    return transientPatterns.some(pattern => lowerError.includes(pattern));
  }

  /**
   * Execute command with retry logic
   * @param {Function} fn - Async function to execute
   * @param {string} operation - Operation name for logging
   * @param {number} maxRetries - Maximum retry attempts
   * @returns {Promise<any>}
   */
  async executeWithRetry(fn, operation, maxRetries = this.maxRetries) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[FlyManager] Retry ${attempt}/${maxRetries} for ${operation}`);
        }
        
        return await fn();
      } catch (error) {
        lastError = error;
        
        if (attempt < maxRetries && this.isTransientError(error.message)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff, max 10s
          console.log(`[FlyManager] Transient error in ${operation}, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Create a new Fly app
   * @param {string} appName - Unique app name
   * @returns {Promise<{success: boolean, appName?: string, error?: string}>}
   */
  async createApp(appName) {
    try {
      console.log(`[FlyManager] Creating app: ${appName}`);
      
      const cmd = `${FLY_CMD} apps create ${appName} --org ${this.orgSlug}`;
      const env = { ...process.env, FLY_API_TOKEN: this.apiToken };

      await execAsync(cmd, { env });

      console.log(`[FlyManager] App created successfully: ${appName}`);
      return { success: true, appName };
    } catch (error) {
      console.error(`[FlyManager] Failed to create app: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Prepare workspace with Dockerfile and fly.toml
   * @param {string} workspacePath - Path to workspace directory
   * @param {string} appName - App name for fly.toml
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async prepareWorkspace(workspacePath, appName) {
    try {
      console.log(`[FlyManager] Preparing workspace: ${workspacePath}`);

      const templatesDir = join(process.cwd(), 'server', 'templates');
      
      // Copy Dockerfile
      const dockerfileSrc = join(templatesDir, 'Dockerfile.template');
      const dockerfileDest = join(workspacePath, 'Dockerfile');
      
      let dockerfileContent = await readFile(dockerfileSrc, 'utf-8');
      dockerfileContent = dockerfileContent.replace(/\{\{NODE_VERSION\}\}/g, '22');
      
      await writeFile(dockerfileDest, dockerfileContent, 'utf-8');
      console.log(`[FlyManager] Dockerfile created`);

      // Copy and customize fly.toml
      const flyTomlSrc = join(templatesDir, 'fly.toml.template');
      const flyTomlDest = join(workspacePath, 'fly.toml');
      
      let flyTomlContent = await readFile(flyTomlSrc, 'utf-8');
      flyTomlContent = flyTomlContent
        .replace(/\{\{APP_NAME\}\}/g, appName)
        .replace(/\{\{INTERNAL_PORT\}\}/g, '8080');
      
      await writeFile(flyTomlDest, flyTomlContent, 'utf-8');
      console.log(`[FlyManager] fly.toml created`);

      return { success: true };
    } catch (error) {
      console.error(`[FlyManager] Failed to prepare workspace: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Deploy app to Fly.io with retry logic
   * @param {string} workspacePath - Path to workspace directory
   * @param {string} appName - App name
   * @returns {Promise<{success: boolean, error?: string, duration?: number}>}
   */
  async deploy(workspacePath, appName) {
    try {
      console.log(`[FlyManager] Deploying app: ${appName}`);
      const startTime = Date.now();

      await this.executeWithRetry(async () => {
        const cmd = `${FLY_CMD} deploy --app ${appName}`;
        const env = { ...process.env, FLY_API_TOKEN: this.apiToken };

        await execAsync(cmd, {
          env,
          cwd: workspacePath,
          timeout: 180000 // 180 seconds
        });
      }, 'deploy');

      const duration = Date.now() - startTime;
      console.log(`[FlyManager] Deploy completed in ${Math.round(duration / 1000)}s`);

      return { success: true, duration };
    } catch (error) {
      console.error(`[FlyManager] Deploy failed after retries: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Wait for app to become healthy
   * @param {string} appName - App name
   * @param {number} timeoutMs - Timeout in milliseconds (default 60000)
   * @returns {Promise<{success: boolean, url?: string, error?: string}>}
   */
  async waitForHealthy(appName, timeoutMs = 60000) {
    try {
      console.log(`[FlyManager] Waiting for app to become healthy: ${appName}`);
      
      const startTime = Date.now();
      const pollInterval = 5000; // 5 seconds
      const env = { ...process.env, FLY_API_TOKEN: this.apiToken };

      while (Date.now() - startTime < timeoutMs) {
        try {
          const cmd = `${FLY_CMD} status --app ${appName} --json`;
          const { stdout } = await execAsync(cmd, { env });
          
          const status = JSON.parse(stdout);
          
          // Check if any machine is in "started" state
          if (status.Machines && status.Machines.length > 0) {
            const hasStarted = status.Machines.some(m => m.state === 'started');
            
            if (hasStarted) {
              const url = this.getAppUrl(appName);
              console.log(`[FlyManager] App is healthy: ${url}`);
              return { success: true, url };
            }
          }

          console.log(`[FlyManager] App not ready yet, waiting...`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        } catch (pollError) {
          // Status command might fail if app is still deploying
          console.log(`[FlyManager] Status check failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, pollInterval));
        }
      }

      throw new Error(`Timeout waiting for app to become healthy (${timeoutMs}ms)`);
    } catch (error) {
      console.error(`[FlyManager] Health check failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get public URL for app
   * @param {string} appName - App name
   * @returns {string} Public URL
   */
  getAppUrl(appName) {
    return `https://${appName}.fly.dev`;
  }

  /**
   * Destroy app
   * @param {string} appName - App name
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async destroyApp(appName) {
    try {
      console.log(`[FlyManager] Destroying app: ${appName}`);
      
      const cmd = `${FLY_CMD} apps destroy ${appName} --yes`;
      const env = { ...process.env, FLY_API_TOKEN: this.apiToken };

      await execAsync(cmd, { env });

      console.log(`[FlyManager] App destroyed: ${appName}`);
      return { success: true };
    } catch (error) {
      console.error(`[FlyManager] Failed to destroy app: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

// Singleton export
export default new FlyManager();
