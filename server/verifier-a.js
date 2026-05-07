/**
 * VerifierA — structural checks
 *
 * Contract: verifyStructural(url, spec) → StructuralReport
 *
 * Checks:
 *   1. HTTP liveness: GET / → 200, HTML content-type
 *   2. Feature presence: key terms from spec.features found in HTML + linked JS files
 */

/**
 * Extract searchable keywords from a feature description.
 * Strips common filler words, returns lowercase tokens.
 */
function extractKeywords(text) {
  const STOP = new Set([
    'a', 'an', 'the', 'and', 'or', 'with', 'for', 'to', 'of', 'in',
    'on', 'at', 'be', 'is', 'as', 'by', 'it', 'its',
  ]);
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP.has(w));
}

/**
 * Extract src paths of <script src="..."> tags from HTML.
 */
function extractScriptSrcs(html) {
  const srcs = [];
  const re = /<script[^>]+src=["']([^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    if (!m[1].startsWith('http')) srcs.push(m[1]);
  }
  return srcs;
}

/**
 * @param {string} url - Base URL of the running app, e.g. http://localhost:3100
 * @param {object} spec - Architect spec: { summary, features, screens, constraints, warnings }
 * @returns {Promise<object>} StructuralReport
 */
async function verifyStructural(url, spec) {
  const report = {
    url,
    liveness: { ok: false, status: null, latency: null, error: null },
    isHtml: false,
    features: [],
  };

  // 1. HTTP liveness
  const t0 = Date.now();
  let html = '';
  try {
    const resp = await fetch(`${url}/`, { signal: AbortSignal.timeout(10000) });
    report.liveness.status = resp.status;
    report.liveness.latency = Date.now() - t0;
    report.liveness.ok = resp.status === 200;

    const ct = resp.headers.get('content-type') || '';
    report.isHtml = ct.includes('text/html');

    html = await resp.text();
  } catch (e) {
    report.liveness.error = e.message;
    report.liveness.latency = Date.now() - t0;
    return report;
  }

  // 2. Fetch linked JS files to extend searchable content
  let searchable = html;
  const scriptSrcs = extractScriptSrcs(html);
  for (const src of scriptSrcs) {
    try {
      const jsResp = await fetch(`${url}${src.startsWith('/') ? '' : '/'}${src}`,
        { signal: AbortSignal.timeout(5000) });
      if (jsResp.ok) {
        searchable += await jsResp.text();
      }
    } catch (_) {
      // non-blocking — missing JS doesn't fail structural check
    }
  }
  const searchableLower = searchable.toLowerCase();

  // 3. Feature keyword presence
  for (const feature of (spec.features || [])) {
    const keywords = extractKeywords(feature);
    const foundKeywords = keywords.filter(kw => searchableLower.includes(kw));
    const ratio = keywords.length ? foundKeywords.length / keywords.length : 0;

    report.features.push({
      feature,
      keywords,
      foundKeywords,
      // found if ≥1 keyword present (VerifierA checks presence, not completeness — VerifierB covers the rest)
      found: foundKeywords.length >= 1,
      detail: foundKeywords.length
        ? `Found: ${foundKeywords.slice(0, 4).join(', ')}`
        : 'No matching keywords in HTML/JS',
    });
  }

  return report;
}

export default { verifyStructural };
