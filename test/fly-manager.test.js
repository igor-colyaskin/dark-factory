import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';

describe('FlyManager', () => {
  let flyManager;

  beforeEach(async () => {
    // Set test environment variables
    process.env.FLY_API_TOKEN = 'test-token';
    process.env.FLY_ORG_SLUG = 'test-org';
    
    // Dynamic import to get fresh instance
    const module = await import('../server/fly-manager.js');
    flyManager = module.default;
  });

  describe('isTransientError', () => {
    it('should identify "Unable to pull image" as transient', () => {
      const result = flyManager.isTransientError('Unable to pull image');
      assert.strictEqual(result, true);
    });

    it('should identify timeout as transient', () => {
      const result = flyManager.isTransientError('Connection timeout');
      assert.strictEqual(result, true);
    });

    it('should identify network errors as transient', () => {
      const result = flyManager.isTransientError('Network error occurred');
      assert.strictEqual(result, true);
    });

    it('should not identify validation errors as transient', () => {
      const result = flyManager.isTransientError('Invalid app name');
      assert.strictEqual(result, false);
    });

    it('should not identify auth errors as transient', () => {
      const result = flyManager.isTransientError('Authentication failed');
      assert.strictEqual(result, false);
    });
  });

  describe('getAppUrl', () => {
    it('should return correct Fly.io URL format', () => {
      const url = flyManager.getAppUrl('test-app');
      assert.strictEqual(url, 'https://test-app.fly.dev');
    });

    it('should handle app names with hyphens', () => {
      const url = flyManager.getAppUrl('my-test-app-123');
      assert.strictEqual(url, 'https://my-test-app-123.fly.dev');
    });
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        return 'success';
      };

      const result = await flyManager.executeWithRetry(fn, 'test-operation', 2);
      
      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 1);
    });

    it('should retry on transient errors and eventually succeed', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Unable to pull image');
        }
        return 'success';
      };

      const result = await flyManager.executeWithRetry(fn, 'test-operation', 2);
      
      assert.strictEqual(result, 'success');
      assert.strictEqual(attempts, 2);
    });

    it('should not retry on non-transient errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('Invalid configuration');
      };

      await assert.rejects(
        async () => await flyManager.executeWithRetry(fn, 'test-operation', 2),
        (error) => {
          assert.ok(error.message.includes('Invalid configuration'));
          return true;
        }
      );
      
      assert.strictEqual(attempts, 1);
    });

    it('should fail after max retries on persistent transient errors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        throw new Error('timeout');
      };

      await assert.rejects(
        async () => await flyManager.executeWithRetry(fn, 'test-operation', 2),
        (error) => {
          assert.ok(error.message.includes('timeout'));
          return true;
        }
      );
      
      assert.strictEqual(attempts, 3); // initial + 2 retries
    });
  });

  describe('configuration', () => {
    it('should have correct max retries', () => {
      assert.strictEqual(flyManager.maxRetries, 2);
    });

    it('should have API token from environment', () => {
      assert.strictEqual(flyManager.apiToken, 'test-token');
    });

    it('should have org slug from environment', () => {
      assert.strictEqual(flyManager.orgSlug, 'test-org');
    });
  });
});

console.log('\n✓ Unit tests for FlyManager logic');
console.log('Note: Integration tests with real flyctl require FLY_API_TOKEN');
