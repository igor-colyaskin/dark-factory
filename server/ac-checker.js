import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.join(__dirname, '../workspace');

class ACChecker {
  constructor() {
    this.workspaceDir = WORKSPACE_DIR;
  }

  /**
   * Check acceptance criteria for architecture phase
   * @returns {Promise<object>} Check result
   */
  async checkArchitecture() {
    console.log('Running AC checks for Architecture...');
    const results = {
      passed: true,
      checks: [],
      errors: []
    };

    // Check 1: ARCHITECTURE.md exists
    const archFilePath = path.join(this.workspaceDir, 'ARCHITECTURE.md');
    try {
      await fs.access(archFilePath);
      results.checks.push({
        name: 'ARCHITECTURE.md exists',
        passed: true
      });
    } catch {
      results.passed = false;
      results.checks.push({
        name: 'ARCHITECTURE.md exists',
        passed: false
      });
      results.errors.push('ARCHITECTURE.md file not found');
    }

    // Check 2: ARCHITECTURE.md length > 500 characters
    try {
      const content = await fs.readFile(archFilePath, 'utf-8');
      const length = content.length;
      const passed = length > 500;

      results.checks.push({
        name: 'ARCHITECTURE.md length > 500 chars',
        passed,
        details: `Length: ${length} chars`
      });

      if (!passed) {
        results.passed = false;
        results.errors.push(`ARCHITECTURE.md too short: ${length} chars (minimum 500)`);
      }
    } catch (error) {
      results.passed = false;
      results.checks.push({
        name: 'ARCHITECTURE.md length > 500 chars',
        passed: false
      });
      results.errors.push(`Cannot read ARCHITECTURE.md: ${error.message}`);
    }

    console.log(`Architecture AC: ${results.passed ? 'PASSED' : 'FAILED'}`);
    return results;
  }

  /**
   * Check acceptance criteria for development phase
   * @returns {Promise<object>} Check result
   */
  async checkDevelopment() {
    console.log('Running AC checks for Development...');
    const results = {
      passed: true,
      checks: [],
      errors: []
    };

    // Check 1: Find main application file (app.js or index.js)
    const possibleFiles = ['app.js', 'index.js', 'server.js', 'main.js'];
    let mainFile = null;

    for (const file of possibleFiles) {
      const filePath = path.join(this.workspaceDir, file);
      try {
        await fs.access(filePath);
        mainFile = file;
        break;
      } catch {
        // File doesn't exist, try next
      }
    }

    if (mainFile) {
      results.checks.push({
        name: 'Main application file exists',
        passed: true,
        details: `Found: ${mainFile}`
      });
    } else {
      results.passed = false;
      results.checks.push({
        name: 'Main application file exists',
        passed: false
      });
      results.errors.push('No main application file found (app.js, index.js, server.js, or main.js)');
      return results;
    }

    // Check 2: node --check passes
    const syntaxCheck = await this.runNodeCheck(mainFile);
    results.checks.push({
      name: 'Node.js syntax check',
      passed: syntaxCheck.passed,
      details: syntaxCheck.output
    });

    if (!syntaxCheck.passed) {
      results.passed = false;
      results.errors.push(`Syntax check failed: ${syntaxCheck.output}`);
    }

    // Check 3: package.json exists (optional, but if exists, check npm install)
    const packageJsonPath = path.join(this.workspaceDir, 'package.json');
    try {
      await fs.access(packageJsonPath);
      results.checks.push({
        name: 'package.json exists',
        passed: true
      });

      // Run npm install
      const npmInstall = await this.runNpmInstall();
      results.checks.push({
        name: 'npm install completes',
        passed: npmInstall.passed,
        details: npmInstall.output
      });

      if (!npmInstall.passed) {
        results.passed = false;
        results.errors.push(`npm install failed: ${npmInstall.output}`);
      }
    } catch {
      results.checks.push({
        name: 'package.json exists',
        passed: true,
        details: 'Not required (no package.json)'
      });
    }

    console.log(`Development AC: ${results.passed ? 'PASSED' : 'FAILED'}`);
    return results;
  }

  /**
   * Check acceptance criteria for testing phase
   * @returns {Promise<object>} Check result
   */
  async checkTesting() {
    console.log('Running AC checks for Testing...');
    const results = {
      passed: true,
      checks: [],
      errors: []
    };

    // Find main file
    const possibleFiles = ['app.js', 'index.js', 'server.js', 'main.js'];
    let mainFile = null;

    for (const file of possibleFiles) {
      const filePath = path.join(this.workspaceDir, file);
      try {
        await fs.access(filePath);
        mainFile = file;
        break;
      } catch {
        // File doesn't exist, try next
      }
    }

    if (!mainFile) {
      results.passed = false;
      results.errors.push('No main application file found');
      return results;
    }

    // Check 1: Application starts without crash
    const startCheck = await this.startApplication(mainFile);
    results.checks.push({
      name: 'Application starts without crash',
      passed: startCheck.passed,
      details: startCheck.output
    });

    if (!startCheck.passed) {
      results.passed = false;
      results.errors.push(`Application failed to start: ${startCheck.output}`);
      return results;
    }

    const { process: appProcess, port } = startCheck;

    // Check 2: Application responds on localhost
    await this.sleep(3000); // Wait 3 seconds for app to be ready

    const responseCheck = await this.checkHttpResponse(port);
    results.checks.push({
      name: 'Application responds on localhost',
      passed: responseCheck.passed,
      details: responseCheck.output
    });

    if (!responseCheck.passed) {
      results.passed = false;
      results.errors.push(`Application not responding: ${responseCheck.output}`);
    }

    // Check 3: Process can be killed cleanly
    const killCheck = await this.killProcess(appProcess);
    results.checks.push({
      name: 'Process can be killed cleanly',
      passed: killCheck.passed,
      details: killCheck.output
    });

    if (!killCheck.passed) {
      results.passed = false;
      results.errors.push(`Failed to kill process: ${killCheck.output}`);
    }

    console.log(`Testing AC: ${results.passed ? 'PASSED' : 'FAILED'}`);
    return results;
  }

  /**
   * Run node --check on a file
   * @param {string} filename - File to check
   * @returns {Promise<object>} Check result
   */
  async runNodeCheck(filename) {
    return new Promise((resolve) => {
      const filePath = path.join(this.workspaceDir, filename);
      const proc = spawn('node', ['--check', filePath]);

      let output = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          passed: code === 0,
          output: output || 'Syntax check passed'
        });
      });

      proc.on('error', (error) => {
        resolve({
          passed: false,
          output: error.message
        });
      });
    });
  }

  /**
   * Run npm install in workspace
   * @returns {Promise<object>} Install result
   */
  async runNpmInstall() {
    return new Promise((resolve) => {
      const proc = spawn('npm', ['install'], {
        cwd: this.workspaceDir,
        shell: true
      });

      let output = '';

      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        resolve({
          passed: code === 0,
          output: code === 0 ? 'npm install completed successfully' : output
        });
      });

      proc.on('error', (error) => {
        resolve({
          passed: false,
          output: error.message
        });
      });
    });
  }

  /**
   * Start the application and detect port
   * @param {string} filename - Main file to run
   * @returns {Promise<object>} Start result with process and port
   */
  async startApplication(filename) {
    return new Promise((resolve) => {
      const filePath = path.join(this.workspaceDir, filename);
      const proc = spawn('node', [filePath], {
        cwd: this.workspaceDir
      });

      let output = '';
      let port = 3000; // Default port

      const timeout = setTimeout(() => {
        resolve({
          passed: true,
          process: proc,
          port,
          output: 'Application started'
        });
      }, 3000);

      proc.stdout.on('data', (data) => {
        const text = data.toString();
        output += text;

        // Try to detect port from output
        const portMatch = text.match(/(?:port|listening on|running on).*?(\d{4,5})/i);
        if (portMatch) {
          port = parseInt(portMatch[1]);
        }
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        clearTimeout(timeout);
        if (code !== 0) {
          resolve({
            passed: false,
            output: `Process exited with code ${code}: ${output}`
          });
        }
      });

      proc.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          passed: false,
          output: error.message
        });
      });
    });
  }

  /**
   * Check if application responds on HTTP
   * @param {number} port - Port to check
   * @returns {Promise<object>} Response check result
   */
  async checkHttpResponse(port) {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        timeout: 5000
      });

      return {
        passed: response.status === 200,
        output: `HTTP ${response.status} ${response.statusText}`
      };
    } catch (error) {
      return {
        passed: false,
        output: error.message
      };
    }
  }

  /**
   * Kill a process
   * @param {object} proc - Process to kill
   * @returns {Promise<object>} Kill result
   */
  async killProcess(proc) {
    return new Promise((resolve) => {
      if (!proc || proc.killed) {
        resolve({
          passed: true,
          output: 'Process already terminated'
        });
        return;
      }

      proc.on('close', () => {
        resolve({
          passed: true,
          output: 'Process killed successfully'
        });
      });

      proc.kill('SIGTERM');

      // Force kill after 5 seconds
      setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL');
          resolve({
            passed: true,
            output: 'Process force killed'
          });
        }
      }, 5000);
    });
  }

  /**
   * Sleep utility
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise<void>}
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
const acChecker = new ACChecker();

export default acChecker;
