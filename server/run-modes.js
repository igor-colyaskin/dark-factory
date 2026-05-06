/**
 * Run Modes configuration for Dark Factory v0.6
 *
 * Each mode is a set of boolean flags controlling pipeline behavior.
 * This allows combining features without multiplying string-based branches.
 *
 * fakeDeploy: false → uses Local Runner (localhost, v0.6+)
 * fakeDeploy: true  → uses executeFakeDeploy (mock URL, no real process)
 */

export const RUN_MODES = {
  // Real pipeline end-to-end
  'production': {
    mockLLM: false,
    mockWorkspace: false,
    skipAC: false,
    fakeDeploy: false,
    demoDelays: false
  },
  // Mock LLM + real file write + real AC + Local Runner deploy.
  // For debugging File Manager, AC Checker, Local Runner without LLM cost.
  'mock-full': {
    mockLLM: true,
    mockWorkspace: false,
    skipAC: false,
    fakeDeploy: false,
    demoDelays: false
  },
  // Mock everything. For UI/UX/SSE debugging. ~6 seconds, zero cost, no Local Runner.
  'mock-fast': {
    mockLLM: true,
    mockWorkspace: true,
    skipAC: true,
    fakeDeploy: true,
    demoDelays: false
  },
  // Mock everything + theatrical delays. For presentations.
  'demo': {
    mockLLM: true,
    mockWorkspace: true,
    skipAC: true,
    fakeDeploy: true,
    demoDelays: true
  }
};

/**
 * Resolve run mode flags from process.env.RUN_MODE.
 * Falls back to 'production' if not set or unknown.
 */
export function resolveRunMode() {
  const modeName = process.env.RUN_MODE || 'production';
  const flags = RUN_MODES[modeName];

  if (!flags) {
    console.warn(`[RUN_MODE] Unknown mode "${modeName}", falling back to production`);
    return { name: 'production', ...RUN_MODES.production };
  }

  return { name: modeName, ...flags };
}