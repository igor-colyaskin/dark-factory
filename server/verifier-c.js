/**
 * VerifierC — structural manifest.json check for Integration Card profiles.
 *
 * Contract: run(workspacePath, spec) → Report
 *
 * Report shape (compatible with renderVerificationReport in client/app.js):
 * {
 *   timestamp,
 *   features: [ { feature, found, detail } ],
 *   vision: null,
 *   verdict: "PASS" | "PARTIAL" | "FAIL" | "ERROR"
 * }
 */

import fs from 'fs/promises';
import path from 'path';

// Required manifest fields and how to reach them
const REQUIRED_CHECKS = [
  {
    feature: 'sap.app.id present',
    check: (m) => m?.['sap.app']?.id,
    detail: (m) => m?.['sap.app']?.id || null,
  },
  {
    feature: 'sap.card.type present',
    check: (m) => m?.['sap.card']?.type,
    detail: (m) => m?.['sap.card']?.type || null,
  },
  {
    feature: 'sap.card.header present',
    // Component cards render via View.xml — header/content in manifest not applicable
    check: (m) => m?.['sap.card']?.type === 'Component' || m?.['sap.card']?.header,
    detail: (m) => m?.['sap.card']?.type === 'Component' ? 'n/a (Component type)' : (m?.['sap.card']?.header ? 'object present' : null),
  },
  {
    feature: 'sap.card.content present',
    check: (m) => m?.['sap.card']?.type === 'Component' || m?.['sap.card']?.content,
    detail: (m) => m?.['sap.card']?.type === 'Component' ? 'n/a (Component type)' : (m?.['sap.card']?.content ? 'object present' : null),
  },
  {
    feature: 'namespace matches com.sap.partner.wz.*',
    check: (m) => /^com\.sap\.partner\.wz\./.test(m?.['sap.app']?.id || ''),
    detail: (m) => m?.['sap.app']?.id || null,
  },
  {
    feature: 'destination configured',
    // destination is inside sap.card.configuration.destinations
    check: (m) => {
      const destinations = m?.['sap.card']?.configuration?.destinations;
      return destinations && Object.keys(destinations).length > 0;
    },
    detail: (m) => {
      const destinations = m?.['sap.card']?.configuration?.destinations;
      return destinations ? Object.keys(destinations).join(', ') : null;
    },
  },
];

/**
 * Find manifest.json in workspacePath — checks root then src/ subdirectory.
 */
async function findManifest(workspacePath) {
  const candidates = [
    path.join(workspacePath, 'manifest.json'),
    path.join(workspacePath, 'src', 'manifest.json'),
  ];

  for (const candidate of candidates) {
    try {
      const content = await fs.readFile(candidate, 'utf-8');
      return { path: candidate, content };
    } catch {
      // not found at this path
    }
  }
  return null;
}

/**
 * @param {string} workspacePath - Path to workspace directory
 * @param {object} _spec - Architect spec (reserved for future field-level checks)
 * @returns {Promise<object>} Report
 */
async function run(workspacePath, _spec) {
  const timestamp = new Date().toISOString();

  const found = await findManifest(workspacePath);

  if (!found) {
    return {
      timestamp,
      features: [{ feature: 'manifest.json found', found: false, detail: 'Not found in workspace root or src/' }],
      vision: null,
      verdict: 'FAIL',
    };
  }

  let manifest;
  try {
    manifest = JSON.parse(found.content);
  } catch (e) {
    return {
      timestamp,
      features: [{ feature: 'manifest.json valid JSON', found: false, detail: e.message }],
      vision: null,
      verdict: 'FAIL',
    };
  }

  const features = [
    { feature: 'manifest.json found', found: true, detail: found.path.split(/[\\/]/).slice(-2).join('/') },
    ...REQUIRED_CHECKS.map(({ feature, check, detail }) => {
      const ok = Boolean(check(manifest));
      return { feature, found: ok, detail: ok ? (detail(manifest) || 'ok') : 'missing' };
    }),
  ];

  const passCount = features.filter(f => f.found).length;
  const ratio = passCount / features.length;
  const verdict = ratio === 1 ? 'PASS' : ratio >= 0.6 ? 'PARTIAL' : 'FAIL';

  return { timestamp, features, vision: null, verdict };
}

export default { run };
