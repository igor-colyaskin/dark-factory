import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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
    console.log('[AC Checker] Running checks for Architecture...');
    const results = {
      passed: true,
      checks: [],
      errors: [],
      warnings: []
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

    console.log(`[AC Checker] Architecture: ${results.passed ? 'PASSED' : 'FAILED'}`);
    return results;
  }

  /**
   * Check acceptance criteria for development phase (v0.2 - static checks only)
   * @returns {Promise<object>} Check result
   */
  async checkDevelopment() {
    console.log('[AC Checker] Running checks for Development (v0.2 - static only)...');
    const results = {
      passed: true,
      checks: [],
      errors: [],
      warnings: []
    };

    // Check 1: package.json exists and is valid JSON
    const packageJsonPath = path.join(this.workspaceDir, 'package.json');
    let packageJson = null;

    try {
      const content = await fs.readFile(packageJsonPath, 'utf-8');
      packageJson = JSON.parse(content);
      
      results.checks.push({
        name: 'package.json exists and valid',
        passed: true
      });
    } catch (error) {
      results.passed = false;
      results.checks.push({
        name: 'package.json exists and valid',
        passed: false
      });
      results.errors.push(`package.json error: ${error.message}`);
      return results; // Cannot continue without package.json
    }

    // Check 2: package.json contains scripts.start
    if (packageJson.scripts && packageJson.scripts.start) {
      results.checks.push({
        name: 'package.json has start script',
        passed: true,
        details: packageJson.scripts.start
      });
    } else {
      results.passed = false;
      results.checks.push({
        name: 'package.json has start script',
        passed: false
      });
      results.errors.push('package.json missing scripts.start');
    }

    // Check 3: package.json contains express in dependencies
    const hasExpress = packageJson.dependencies && packageJson.dependencies.express;
    
    if (hasExpress) {
      results.checks.push({
        name: 'express in dependencies',
        passed: true
      });
    } else {
      results.passed = false;
      results.checks.push({
        name: 'express in dependencies',
        passed: false
      });
      results.errors.push('express not found in dependencies');
    }

    // Check 4: package.json contains engines.node (warning only)
    if (packageJson.engines && packageJson.engines.node) {
      results.checks.push({
        name: 'engines.node specified',
        passed: true,
        details: packageJson.engines.node
      });
    } else {
      results.checks.push({
        name: 'engines.node specified',
        passed: true, // Not blocking
        warning: true
      });
      results.warnings.push('engines.node not specified (recommended: >=20.0.0)');
    }

    // Check 5: Entrypoint file exists
    let entrypointFile = null;
    
    if (packageJson.scripts && packageJson.scripts.start) {
      // Parse start script to find entrypoint
      // Examples: "node app.js", "node server.js", "node src/index.js"
      const startScript = packageJson.scripts.start;
      const match = startScript.match(/node\s+([^\s]+)/);
      
      if (match) {
        entrypointFile = match[1];
      }
    }

    if (!entrypointFile) {
      // Fallback: try common names
      const possibleFiles = ['app.js', 'index.js', 'server.js', 'main.js'];
      for (const file of possibleFiles) {
        try {
          await fs.access(path.join(this.workspaceDir, file));
          entrypointFile = file;
          break;
        } catch {
          // Continue
        }
      }
    }

    if (entrypointFile) {
      const entrypointPath = path.join(this.workspaceDir, entrypointFile);
      
      try {
        await fs.access(entrypointPath);
        results.checks.push({
          name: 'Entrypoint file exists',
          passed: true,
          details: entrypointFile
        });
      } catch {
        results.passed = false;
        results.checks.push({
          name: 'Entrypoint file exists',
          passed: false
        });
        results.errors.push(`Entrypoint file not found: ${entrypointFile}`);
        return results; // Cannot continue without entrypoint
      }

      // Check 6: Entrypoint passes node --check (syntax only)
      try {
        await execAsync(`node --check "${entrypointPath}"`);
        results.checks.push({
          name: 'Entrypoint syntax valid',
          passed: true
        });
      } catch (error) {
        results.passed = false;
        results.checks.push({
          name: 'Entrypoint syntax valid',
          passed: false
        });
        results.errors.push(`Syntax error in ${entrypointFile}: ${error.message}`);
      }

      // Check 7: Entrypoint contains process.env.PORT (required for Fly.io)
      try {
        const content = await fs.readFile(entrypointPath, 'utf-8');
        const hasEnvPort = content.includes('process.env.PORT');
        
        if (hasEnvPort) {
          results.checks.push({
            name: 'Uses process.env.PORT',
            passed: true
          });
        } else {
          results.passed = false;
          results.checks.push({
            name: 'Uses process.env.PORT',
            passed: false
          });
          results.errors.push('Entrypoint must use process.env.PORT for Fly.io deployment');
        }
      } catch (error) {
        results.passed = false;
        results.errors.push(`Cannot read entrypoint: ${error.message}`);
      }

      // Check 8: Entrypoint listens on 0.0.0.0 (required for Fly.io)
      try {
        const content = await fs.readFile(entrypointPath, 'utf-8');
        const hasBindAll = content.includes('0.0.0.0');
        
        if (hasBindAll) {
          results.checks.push({
            name: 'Listens on 0.0.0.0',
            passed: true
          });
        } else {
          results.passed = false;
          results.checks.push({
            name: 'Listens on 0.0.0.0',
            passed: false
          });
          results.errors.push('Entrypoint must listen on 0.0.0.0 for Fly.io deployment');
        }
      } catch (error) {
        results.passed = false;
        results.errors.push(`Cannot read entrypoint: ${error.message}`);
      }

    } else {
      results.passed = false;
      results.checks.push({
        name: 'Entrypoint file exists',
        passed: false
      });
      results.errors.push('Cannot determine entrypoint file');
    }

    console.log(`[AC Checker] Development: ${results.passed ? 'PASSED' : 'FAILED'}`);
    if (results.warnings.length > 0) {
      console.log(`[AC Checker] Warnings: ${results.warnings.join(', ')}`);
    }
    
    return results;
  }

  /**
   * Check acceptance criteria for testing phase
   * @returns {Promise<object>} Check result
   */
  async checkTesting() {
    console.log('[AC Checker] Running checks for Testing...');
    const results = {
      passed: true,
      checks: [],
      errors: [],
      warnings: []
    };

    // For v0.2, testing phase just validates that development checks still pass
    // (in case files were modified during testing)
    const devResults = await this.checkDevelopment();
    
    results.passed = devResults.passed;
    results.checks = devResults.checks;
    results.errors = devResults.errors;
    results.warnings = devResults.warnings;

    console.log(`[AC Checker] Testing: ${results.passed ? 'PASSED' : 'FAILED'}`);
    return results;
  }

  /**
   * Run all checks for a given phase
   * @param {string} phase - Phase name ('architecture', 'development', 'testing')
   * @returns {Promise<object>} Check result
   */
  async checkPhase(phase) {
    switch (phase.toLowerCase()) {
      case 'architecture':
        return await this.checkArchitecture();
      case 'development':
        return await this.checkDevelopment();
      case 'testing':
        return await this.checkTesting();
      default:
        throw new Error(`Unknown phase: ${phase}`);
    }
  }
}

// Singleton export
export default new ACChecker();
