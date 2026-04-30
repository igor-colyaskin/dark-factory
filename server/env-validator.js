/**
 * Environment variables validator for Dark Factory v0.2
 *
 * Policy: combined (C).
 * - Critical vars missing for current RUN_MODE → exit(1) with a clear message.
 * - Non-critical missing vars → warnings, server starts.
 *
 * Requirements per mode:
 *
 *   production  : OPENROUTER_API_KEY, FLY_API_TOKEN, FLY_ORG_SLUG
 *   mock-full   : FLY_API_TOKEN, FLY_ORG_SLUG (real deploy, mock LLM)
 *   mock-fast   : none required (but missing keys reported as info)
 *   demo        : none required (but missing keys reported as info)
 */

const REQUIREMENTS = {
  'production': {
    required: ['OPENROUTER_API_KEY', 'FLY_API_TOKEN', 'FLY_ORG_SLUG'],
    optional: []
  },
  'mock-full': {
    required: ['FLY_API_TOKEN', 'FLY_ORG_SLUG'],
    optional: ['OPENROUTER_API_KEY']
  },
  'mock-fast': {
    required: [],
    optional: ['OPENROUTER_API_KEY', 'FLY_API_TOKEN', 'FLY_ORG_SLUG']
  },
  'demo': {
    required: [],
    optional: ['OPENROUTER_API_KEY', 'FLY_API_TOKEN', 'FLY_ORG_SLUG']
  }
};

const HELP_LINKS = {
  OPENROUTER_API_KEY: 'Get your key at https://openrouter.ai/keys',
  FLY_API_TOKEN:      'Run: fly auth token   (after: fly auth login)',
  FLY_ORG_SLUG:       'Run: fly orgs list    (use the "Slug" column)'
};

function isSet(varName) {
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