# Fly Manager Documentation

## Overview

Fly Manager is a module that integrates Dark Factory with Fly.io for deploying generated applications to the cloud.

## Features

- **Programmatic app creation** via flyctl CLI
- **Automatic Dockerfile and fly.toml generation** from templates
- **Deployment with retry logic** for transient errors
- **Health monitoring** until app is ready
- **Automatic cleanup** after TTL expiration

## Configuration

Required environment variables in `.env`:

```bash
FLY_API_TOKEN=your-fly-api-token-here
FLY_ORG_SLUG=your-org-slug-here
```

### Getting Credentials

```bash
# Install flyctl
# Windows: https://fly.io/docs/hands-on/install-flyctl/
# Mac/Linux: curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Get API token
flyctl auth token

# Get organization slug
flyctl orgs list
```

## API Reference

### `createApp(appName)`

Creates a new Fly.io application.

**Parameters:**
- `appName` (string): Unique app name

**Returns:**
```javascript
{
  success: boolean,
  appName?: string,
  error?: string
}
```

### `prepareWorkspace(workspacePath, appName)`

Generates Dockerfile and fly.toml in the workspace.

**Parameters:**
- `workspacePath` (string): Path to workspace directory
- `appName` (string): App name for fly.toml

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

### `deploy(workspacePath, appName)`

Deploys the application to Fly.io with retry logic.

**Parameters:**
- `workspacePath` (string): Path to workspace directory
- `appName` (string): App name

**Returns:**
```javascript
{
  success: boolean,
  error?: string,
  duration?: number  // milliseconds
}
```

**Retry behavior:**
- Max retries: 2
- Timeout: 180 seconds
- Exponential backoff on transient errors

### `waitForHealthy(appName, timeoutMs = 60000)`

Waits for the app to become healthy.

**Parameters:**
- `appName` (string): App name
- `timeoutMs` (number): Timeout in milliseconds (default: 60000)

**Returns:**
```javascript
{
  success: boolean,
  url?: string,
  error?: string
}
```

**Polling:**
- Interval: 5 seconds
- Checks machine state via `flyctl status --json`

### `getAppUrl(appName)`

Returns the public URL for the app.

**Parameters:**
- `appName` (string): App name

**Returns:**
- `string`: Public URL (e.g., `https://my-app.fly.dev`)

### `destroyApp(appName)`

Destroys the Fly.io application.

**Parameters:**
- `appName` (string): App name

**Returns:**
```javascript
{
  success: boolean,
  error?: string
}
```

## Transient Error Handling

The following errors are considered transient and will trigger retries:

- "unable to pull image"
- "timeout"
- "connection refused"
- "network error"
- "temporary failure"
- "try again"

Non-transient errors (e.g., validation errors, auth failures) fail immediately.

## Templates

### Dockerfile.template

Located at `server/templates/Dockerfile.template`

Variables:
- `{{NODE_VERSION}}`: Node.js version (default: 22)

### fly.toml.template

Located at `server/templates/fly.toml.template`

Variables:
- `{{APP_NAME}}`: Application name
- `{{INTERNAL_PORT}}`: Internal port (default: 8080)

Configuration:
- Region: `fra` (Frankfurt)
- Memory: 256MB
- CPU: shared-cpu-1x
- Auto-stop: enabled
- Auto-start: enabled
- Min machines: 0

## Testing

### Unit Tests

```bash
node --test test/fly-manager.test.js
```

Tests retry logic, error detection, and URL generation.

### Integration Test

```bash
node test/fly-integration.test.js
```

**Prerequisites:**
- Valid `FLY_API_TOKEN` and `FLY_ORG_SLUG` in `.env`
- `flyctl` installed and authenticated
- Valid Node.js app in `workspace/` directory

**What it does:**
1. Creates a real Fly app
2. Prepares workspace with Dockerfile and fly.toml
3. Deploys the app
4. Waits for it to become healthy
5. Verifies URL is accessible
6. Cleans up (destroys the app)

**Cost:** ~$0.01-0.05 per test run

## Usage Example

```javascript
import flyManager from './server/fly-manager.js';

const appName = 'my-app-123';
const workspacePath = './workspace';

// Create app
const createResult = await flyManager.createApp(appName);
if (!createResult.success) {
  console.error('Failed to create app:', createResult.error);
  return;
}

// Prepare workspace
const prepareResult = await flyManager.prepareWorkspace(workspacePath, appName);
if (!prepareResult.success) {
  console.error('Failed to prepare workspace:', prepareResult.error);
  return;
}

// Deploy
const deployResult = await flyManager.deploy(workspacePath, appName);
if (!deployResult.success) {
  console.error('Failed to deploy:', deployResult.error);
  return;
}

// Wait for healthy
const healthResult = await flyManager.waitForHealthy(appName);
if (!healthResult.success) {
  console.error('App not healthy:', healthResult.error);
  return;
}

console.log('App deployed:', healthResult.url);

// Later: cleanup
await flyManager.destroyApp(appName);
```

## Troubleshooting

### "Unable to pull image" error

This is a transient error. Fly Manager will automatically retry up to 2 times.

### "Authentication failed"

Check that `FLY_API_TOKEN` is set correctly in `.env`.

### "App name already taken"

Choose a different app name. Use timestamp or UUID for uniqueness.

### Deploy timeout

Increase timeout in `deploy()` call or check Fly.io status page.

### Health check fails

- Check app logs: `flyctl logs --app <appName>`
- Verify app listens on `0.0.0.0:8080`
- Verify `process.env.PORT` is used in app code

## Cost Considerations

- **Idle apps:** ~$0 (auto-stop enabled)
- **Active apps:** ~$3/month for 256MB RAM
- **Deploy operations:** ~$0.01-0.05 per deploy
- **TTL:** 24 hours (apps auto-destroyed after)

## Security

- API token stored in `.env` (never committed)
- Token passed via environment variables, not CLI flags
- Logs mask token as `fly_***`

## Limitations (v0.2)

- Single region deployment (fra)
- No custom domains
- No persistent storage
- No database integration
- 24-hour TTL (hard limit)

## Future Enhancements (v0.2.1+)

- Multi-region deployment
- Custom TTL per app
- Persistent volume support
- Database provisioning
- Custom domain mapping
