/**
 * Run Modes configuration for Dark Factory v0.2
 *
 * Each mode is a set of boolean flags controlling pipeline behavior.
 * This allows combining features without multiplying string-based branches.
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
  // Mock LLM + real file write + real AC + real deploy.
  // For debugging File Manager, AC Checker, Fly Manager without LLM cost.
  'mock-full': {
    mockLLM: true,
    mockWorkspace: false,
    skipAC: false,
    fakeDeploy: false,
    demoDelays: false
  },
  // Mock everything. For UI/UX/SSE debugging. ~6 seconds, zero cost, no Fly.
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