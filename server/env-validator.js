/**
 * Environment variables validator for Dark Factory
 *
 * Policy: combined (C).
 * - Critical vars missing for current RUN_MODE → exit(1) with a clear message.
 * - Non-critical missing vars → warnings, server starts.
 *
 * Requirements per mode:
 *
 *   production  : LLM API key (LLM_API_KEY or ANTHROPIC_AUTH_TOKEN)
 *   mock-full   : none required (mock LLM, local runner)
 *   mock-fast   : none required
 *   demo        : none required
 */

const REQUIREMENTS = {
  'production': {
    required: ['LLM_API_KEY'],
    optional: ['LLM_BASE_URL']
  },
  'mock-full': {
    required: [],
    optional: ['LLM_API_KEY']
  },
  'mock-fast': {
    required: [],
    optional: ['LLM_API_KEY']
  },
  'demo': {
    required: [],
    optional: ['LLM_API_KEY']
  }
};

const HELP_LINKS = {
  LLM_API_KEY: 'Set LLM_API_KEY in .env, or ensure ANTHROPIC_AUTH_TOKEN is set by hai proxy',
  LLM_BASE_URL: 'Default: http://localhost:6655/litellm/v1/chat/completions'
};

function isSet(varName) {
  // LLM_API_KEY has a fallback to ANTHROPIC_AUTH_TOKEN
  if (varName === 'LLM_API_KEY') {
    const v = process.env.LLM_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN;
    return typeof v === 'string' && v.trim().length > 0;
  }
  const v = process.env[varName];
  return typeof v === 'string' && v.trim().length > 0 && !v.includes('your-') && !v.includes('ВСТАВЬ');
}

/**
 * Validate environment for the given run mode.
 * @param {string} modeName - resolved run mode name
 * @returns {{ ok: boolean, missing: string[], warnings: string[] }}
 */
export function validateEnv(modeName) {
  const req = REQUIREMENTS[modeName] || REQUIREMENTS['production'];
  const missing = req.required.filter(v => !isSet(v));
  const warnings = req.optional.filter(v => !isSet(v));

  return { ok: missing.length === 0, missing, warnings };
}

/**
 * Validate and print a report. Exits process if critical vars are missing.
 * @param {string} modeName
 */
export function validateEnvOrExit(modeName) {
  const { ok, missing, warnings } = validateEnv(modeName);

  console.log(`\n🔧 Environment check for mode: ${modeName}`);

  if (missing.length === 0 && warnings.length === 0) {
    console.log('   ✅ All variables set\n');
    return;
  }

  if (missing.length > 0) {
    console.error('   ❌ Missing required variables:');
    for (const v of missing) {
      console.error(`      - ${v}`);
      if (HELP_LINKS[v]) console.error(`        ${HELP_LINKS[v]}`);
    }
    console.error('\n   Add them to your .env file (see .env.example).');
    console.error('   Or switch to a mode that does not require them (e.g. mock-fast, demo).\n');
    process.exit(1);
  }

  if (warnings.length > 0) {
    console.warn('   ⚠  Optional variables not set (ok for this mode):');
    for (const v of warnings) {
      console.warn(`      - ${v}`);
    }
    console.warn('');
  }
}