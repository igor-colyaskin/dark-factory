import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const WORKSPACE_DIR = path.join(__dirname, '../workspace');

class FileManager {
  constructor() {
    this.workspaceDir = WORKSPACE_DIR;
  }

  /**
   * Initialize workspace directory
   * Creates the workspace directory if it doesn't exist
   */
  async initWorkspace() {
    try {
      await fs.access(this.workspaceDir);
      console.log('Workspace directory exists');
    } catch {
      await fs.mkdir(this.workspaceDir, { recursive: true });
      console.log('Workspace directory created');
    }
  }

  /**
   * Clear workspace directory
   * Removes all files and subdirectories in workspace
   */
  async clearWorkspace() {
    try {
      const entries = await fs.readdir(this.workspaceDir, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(this.workspaceDir, entry.name);
        
        if (entry.isDirectory()) {
          await fs.rm(fullPath, { recursive: true, force: true });
        } else {
          await fs.unlink(fullPath);
        }
      }
      
      console.log('Workspace cleared');
    } catch (error) {
      console.error('Error clearing workspace:', error.message);
      throw error;
    }
  }

  /**
   * Write files from agent output to workspace
   * @param {Array} files - Array of file objects from agent response
   * @returns {Promise<object>} Result with written files count
   */
  async writeFiles(files) {
    if (!Array.isArray(files)) {
      throw new Error('Files must be an array');
    }

    const results = {
      success: true,
      written: [],
      errors: []
    };

    for (const file of files) {
      try {
        await this.writeFile(file);
        results.written.push(file.path);
      } catch (error) {
        console.error(`Error writing file ${file.path}:`, error.message);
        results.errors.push({
          path: file.path,
          error: error.message
        });
        results.success = false;
      }
    }

    console.log(`Written ${results.written.length} files, ${results.errors.length} errors`);
    return results;
  }

  /**
   * Write a single file to workspace
   * @param {object} file - File object with path, content, and action
   */
  async writeFile(file) {
    if (!file.path || !file.content) {
      throw new Error('File must have path and content properties');
    }

    const action = file.action || 'create';
    const filePath = path.join(this.workspaceDir, file.path);
    const fileDir = path.dirname(filePath);

    // Ensure directory exists
    await fs.mkdir(fileDir, { recursive: true });

    // Handle different actions
    switch (action) {
      case 'create':
      case 'update':
        await fs.writeFile(filePath, file.content, 'utf-8');
        console.log(`${action === 'create' ? 'Created' : 'Updated'}: ${file.path}`);
        break;

      case 'delete':
        try {
          await fs.unlink(filePath);
          console.log(`Deleted: ${file.path}`);
        } catch (error) {
          if (error.code !== 'ENOENT') {
            throw error;
          }
          console.log(`File not found (already deleted): ${file.path}`);
        }
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  /**
   * Read a file from workspace
   * @param {string} relativePath - Path relative to workspace directory
   * @returns {Promise<string>} File content
   */
  async readFile(relativePath) {
    const filePath = path.join(this.workspaceDir, relativePath);
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      throw new Error(`Failed to read file ${relativePath}: ${error.message}`);
    }
  }

  /**
   * Check if a file exists in workspace
   * @param {string} relativePath - Path relative to workspace directory
   * @returns {Promise<boolean>} True if file exists
   */
  async fileExists(relativePath) {
    const filePath = path.join(this.workspaceDir, relativePath);
    
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all files in workspace
   * @param {string} relativePath - Optional subdirectory path
   * @returns {Promise<Array>} Array of file paths
   */
  async listFiles(relativePath = '') {
    const dirPath = path.join(this.workspaceDir, relativePath);
    const files = [];

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const entryPath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          const subFiles = await this.listFiles(entryPath);
          files.push(...subFiles);
        } else {
          files.push(entryPath);
        }
      }
    } catch (error) {
      console.error(`Error listing files in ${relativePath}:`, error.message);
    }

    return files;
  }

  /**
   * Get workspace statistics
   * @returns {Promise<object>} Statistics about workspace
   */
  async getStats() {
    const files = await this.listFiles();
    let totalSize = 0;

    for (const file of files) {
      try {
        const filePath = path.join(this.workspaceDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
      } catch (error) {
        console.error(`Error getting stats for ${file}:`, error.message);
      }
    }

    return {
      fileCount: files.length,
      totalSize: totalSize,
      files: files
    };
  }

  /**
   * Create a backup of workspace
   * @param {string} backupName - Name for the backup
   * @returns {Promise<string>} Path to backup directory
   */
  async createBackup(backupName) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups', `${backupName}_${timestamp}`);

    await fs.mkdir(backupDir, { recursive: true });

    const files = await this.listFiles();
    
    for (const file of files) {
      const sourcePath = path.join(this.workspaceDir, file);
      const destPath = path.join(backupDir, file);
      const destDir = path.dirname(destPath);

      await fs.mkdir(destDir, { recursive: true });
      await fs.copyFile(sourcePath, destPath);
    }

    console.log(`Backup created: ${backupDir}`);
    return backupDir;
  }

  /**
   * Get absolute path to workspace
   * @returns {string} Absolute path
   */
  getWorkspacePath() {
    return this.workspaceDir;
  }
}

// Singleton instance
const fileManager = new FileManager();

export default fileManager;
