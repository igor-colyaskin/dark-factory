// server/routes/github-auth.js
// GitHub OAuth endpoints: authorize, callback, status, disconnect.

import express from 'express';
import crypto from 'crypto';
import githubTokens from '../github-tokens.js';

const router = express.Router();

// CSRF protection: map of state -> expiresAt (ms since epoch)
// State lives from /authorize until /callback, typically seconds.
const pendingStates = new Map();
const STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Remove expired states. Called opportunistically on each authorize.
 */
function cleanupExpiredStates() {
  const now = Date.now();
  for (const [state, expiresAt] of pendingStates.entries()) {
    if (expiresAt < now) {
      pendingStates.delete(state);
    }
  }
}

/**
 * GET /api/github/authorize
 * Generates OAuth state and redirects user to GitHub authorization page.
 */
router.get('/authorize', (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).send('GITHUB_CLIENT_ID not configured on server');
  }

  cleanupExpiredStates();

  const state = crypto.randomBytes(16).toString('hex');
  pendingStates.set(state, Date.now() + STATE_TTL_MS);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: 'http://localhost:3000/api/github/callback',
    scope: 'repo',
    state,
  });

  const githubAuthUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
  res.redirect(githubAuthUrl);
});

/**
 * GET /api/github/callback
 * Receives code from GitHub, exchanges for access token,
 * fetches user info, saves token.
 */
router.get('/callback', async (req, res) => {
  const { code, state, error: githubError } = req.query;

  // User denied on GitHub authorization page
  if (githubError) {
    return res.redirect(`/settings?github=error&reason=${encodeURIComponent(githubError)}`);
  }

  if (!code || !state) {
    return res.redirect('/settings?github=error&reason=missing_params');
  }

  // CSRF check
  if (!pendingStates.has(state)) {
    return res.redirect('/settings?github=error&reason=invalid_state');
  }
  pendingStates.delete(state);

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error('GitHub token exchange failed:', tokenResponse.status);
      return res.redirect('/settings?github=error&reason=token_exchange_failed');
    }

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('GitHub token error:', tokenData.error_description);
      return res.redirect(`/settings?github=error&reason=${encodeURIComponent(tokenData.error)}`);
    }

    const accessToken = tokenData.access_token;
    if (!accessToken) {
      return res.redirect('/settings?github=error&reason=no_token');
    }

    // Fetch user info
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Dark-Factory',
      },
    });

    if (!userResponse.ok) {
      console.error('GitHub user fetch failed:', userResponse.status);
      return res.redirect('/settings?github=error&reason=user_fetch_failed');
    }

    const userData = await userResponse.json();

    // Save token
    await githubTokens.save({
      token: accessToken,
      username: userData.login,
      userId: userData.id,
    });

    console.log(`GitHub connected as @${userData.login}`);
    res.redirect('/settings?github=connected');

  } catch (err) {
    console.error('GitHub OAuth callback error:', err);
    res.redirect('/settings?github=error&reason=internal');
  }
});

/**
 * GET /api/github/status
 * Returns current connection status for UI.
 */
router.get('/status', async (req, res) => {
  try {
    const data = await githubTokens.read();
    if (!data) {
      return res.json({ connected: false });
    }
    res.json({
      connected: true,
      username: data.username,
      connectedAt: data.connectedAt,
    });
  } catch (err) {
    console.error('GitHub status error:', err);
    res.status(500).json({ error: 'Failed to read token status' });
  }
});

/**
 * POST /api/github/disconnect
 * Removes stored GitHub token.
 */
router.post('/disconnect', async (req, res) => {
  try {
    await githubTokens.remove();
    res.json({ success: true });
  } catch (err) {
    console.error('GitHub disconnect error:', err);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

export default router;