/**
 * Verifier — compositor
 *
 * Contract: run(url, spec) → Report
 *
 * Runs VerifierA (structural) then VerifierB (vision) sequentially.
 * VerifierB failure is non-blocking: report still returns with vision: null.
 *
 * Report shape (derived from VerifierA + VerifierB):
 * {
 *   url,
 *   timestamp,
 *   structural: { ok, status, latency, isHtml },
 *   features: [ { feature, found, detail } ],       // from VerifierA
 *   vision: {                                        // from VerifierB, null if failed
 *     overallAssessment, featuresVisible, uiIssues, summary, model
 *   } | null,
 *   visionError: string | null,
 *   verdict: "PASS" | "PARTIAL" | "FAIL"
 * }
 */

import verifierA from './verifier-a.js';
import verifierB from './verifier-b.js';

function computeVerdict(structuralOk, features, vision) {
  if (!structuralOk) return 'FAIL';

  const featuresFound = features.filter(f => f.found).length;
  const featureRatio = features.length ? featuresFound / features.length : 1;

  // If we have vision, use its overall assessment as the primary signal
  if (vision) {
    if (vision.overallAssessment === 'FAIL') return 'FAIL';
    if (vision.overallAssessment === 'GOOD') return 'PASS';
    if (vision.overallAssessment === 'ACCEPTABLE') return featureRatio >= 0.5 ? 'PASS' : 'PARTIAL';
    return 'PARTIAL'; // NEEDS_WORK
  }

  // No vision — fall back to structural only
  if (featureRatio >= 0.75) return 'PASS';
  if (featureRatio >= 0.5) return 'PARTIAL';
  return 'FAIL';
}

/**
 * @param {string} url - Base URL of the running app
 * @param {object} spec - Architect spec
 * @returns {Promise<object>} Report
 */
async function run(url, spec) {
  const timestamp = new Date().toISOString();

  // Phase A: structural
  const aReport = await verifierA.verifyStructural(url, spec);

  // Phase B: vision — non-blocking
  let vision = null;
  let visionError = null;
  try {
    const bReport = await verifierB.verifyVisual(url, spec);
    if (bReport.error) {
      visionError = bReport.error;
    } else {
      vision = {
        ...bReport.analysis,
        model: bReport.model,
      };
    }
  } catch (e) {
    visionError = e.message;
  }

  const structuralOk = aReport.liveness.ok && aReport.isHtml;

  return {
    url,
    timestamp,
    structural: {
      ok: structuralOk,
      status: aReport.liveness.status,
      latency: aReport.liveness.latency,
      isHtml: aReport.isHtml,
      error: aReport.liveness.error,
    },
    features: aReport.features.map(({ feature, found, detail }) => ({ feature, found, detail })),
    vision,
    visionError,
    verdict: computeVerdict(structuralOk, aReport.features, vision),
  };
}

export default { run };
