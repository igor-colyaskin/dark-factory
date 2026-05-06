// server/github-client.js
// GitHub REST API client for Dark Factory.
// Creates repos and commits files via Git Data API (atomic single commit).

import githubTokens from './github-tokens.js';

const API_BASE = 'https://api.github.com';
const USER_AGENT = 'Dark-Factory';

/**
 * Make authenticated GitHub API request.
 * @returns {Promise<{ok: boolean, status: number, data: any, headers: Headers}>}
 */
async function githubFetch(path, options = {}) {
  const tokenData = await githubTokens.read();
  if (!tokenData || !tokenData.token) {
    return { ok: false, status: 0, data: null, error: 'not_connected' };
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${tokenData.token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': USER_AGENT,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });

  let data = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await response.json();
  }

  return { ok: response.ok, status: response.status, data, headers: response.headers };
}

/**
 * Classify error from GitHub response.
 * @returns {{ code: string, message: string, retryable: boolean }}
 */
function classifyError(status, data) {
  if (status === 401) {
    return { code: 'token_expired', message: 'GitHub token expired or revoked', retryable: false };
  }
  if (status === 403) {
    // Check rate limit
    return { code: 'forbidden', message: data?.message || 'Forbidden', retryable: false };
  }
  if (status === 422) {
    const msg = data?.message || '';
    if (msg.includes('name already exists')) {
      return { code: 'name_conflict', message: 'Repository name already exists', retryable: false };
    }
    return { code: 'validation', message: msg, retryable: false };
  }
  if (status >= 500) {
    return { code: 'server_error', message: data?.message || 'GitHub server error', retryable: true };
  }
  return { code: 'unknown', message: data?.message || `HTTP ${status}`, retryable: false };
}

/**
 * Get authenticated user info.
 * Use to verify token is still valid.
 * @returns {Promise<{success: boolean, user?: object, error?: string}>}
 */
async function getUser() {
  const res = await githubFetch('/user');

  if (res.error === 'not_connected') {
    return { success: false, error: 'GitHub not connected' };
  }

  if (!res.ok) {
    const err = classifyError(res.status, res.data);
    return { success: false, error: err.message, code: err.code };
  }

  return {
    success: true,
    user: {
      login: res.data.login,
      id: res.data.id,
      name: res.data.name,
      avatarUrl: res.data.avatar_url,
    },
  };
}

/**
 * Create a new repository.
 * @param {string} name - Repository name
 * @param {object} options
 * @param {boolean} [options.private=true] - Private repo
 * @param {string} [options.description=''] - Repo description
 * @returns {Promise<{success: boolean, repo?: object, error?: string, code?: string}>}
 */
async function createRepo(name, { private: isPrivate = true, description = '' } = {}) {
  const res = await githubFetch('/user/repos', {
    method: 'POST',
    body: JSON.stringify({
      name,
      description,
      private: isPrivate,
      auto_init: true, // creates initial commit so Git Data API works immediately
    }),
  });

  if (res.error === 'not_connected') {
    return { success: false, error: 'GitHub not connected' };
  }

  if (!res.ok) {
    const err = classifyError(res.status, res.data);
    return { success: false, error: err.message, code: err.code };
  }

  return {
    success: true,
    repo: {
      name: res.data.name,
      fullName: res.data.full_name,
      url: res.data.html_url,
      private: res.data.private,
      defaultBranch: res.data.default_branch,
    },
  };
}

/**
 * Set topics on a repository.
 * @param {string} owner - Repository owner (username)
 * @param {string} repoName - Repository name
 * @param {string[]} topics - Array of topic strings
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function setTopics(owner, repoName, topics) {
  const res = await githubFetch(`/repos/${owner}/${repoName}/topics`, {
    method: 'PUT',
    body: JSON.stringify({ names: topics }),
  });

  if (!res.ok) {
    console.warn(`[github-client] Failed to set topics: ${res.status}`);
    return { success: false, error: res.data?.message || `HTTP ${res.status}` };
  }

  return { success: true };
}

/**
 * Commit multiple files to a repository in a single atomic commit.
 * Uses Git Data API: create blobs → create tree → create commit → update ref.
 *
 * @param {string} owner - Repository owner (username)
 * @param {string} repoName - Repository name
 * @param {Array<{path: string, content: string}>} files - Files to commit
 * @param {string} commitMessage - Commit message
 * @returns {Promise<{success: boolean, commitSha?: string, error?: string}>}
 */
async function commitFiles(owner, repoName, files, commitMessage, branch = 'main') {
  if (!files || files.length === 0) {
    return { success: false, error: 'No files to commit' };
  }

  const repoBase = `/repos/${owner}/${repoName}`;

  try {
    // Step 0: Get current HEAD of the default branch
    let parentSha = null;
    let baseTreeSha = null;

    const refRes = await githubFetch(`${repoBase}/git/refs/heads/${branch}`);
    if (refRes.ok) {
      parentSha = refRes.data.object.sha;
      const parentCommitRes = await githubFetch(`${repoBase}/git/commits/${parentSha}`);
      if (parentCommitRes.ok) {
        baseTreeSha = parentCommitRes.data.tree.sha;
      }
    }

    // Step 1: Create blobs for each file
    const treeItems = [];

    for (const file of files) {
      const blobRes = await githubFetch(`${repoBase}/git/blobs`, {
        method: 'POST',
        body: JSON.stringify({
          content: file.content,
          encoding: 'utf-8',
        }),
      });

      if (!blobRes.ok) {
        const err = classifyError(blobRes.status, blobRes.data);
        return { success: false, error: `Failed to create blob for ${file.path}: ${err.message}` };
      }

      treeItems.push({
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blobRes.data.sha,
      });
    }

    // Step 2: Create tree (on top of existing tree if repo was auto_init'd)
    const treeBody = { tree: treeItems };
    if (baseTreeSha) treeBody.base_tree = baseTreeSha;

    const treeRes = await githubFetch(`${repoBase}/git/trees`, {
      method: 'POST',
      body: JSON.stringify(treeBody),
    });

    if (!treeRes.ok) {
      const err = classifyError(treeRes.status, treeRes.data);
      return { success: false, error: `Failed to create tree: ${err.message}` };
    }

    // Step 3: Create commit
    const commitBody = {
      message: commitMessage,
      tree: treeRes.data.sha,
      parents: parentSha ? [parentSha] : [],
    };

    const commitRes = await githubFetch(`${repoBase}/git/commits`, {
      method: 'POST',
      body: JSON.stringify(commitBody),
    });

    if (!commitRes.ok) {
      const err = classifyError(commitRes.status, commitRes.data);
      return { success: false, error: `Failed to create commit: ${err.message}` };
    }

    // Step 4: Update existing ref (PATCH) or create new one (POST)
    if (parentSha) {
      const updateRes = await githubFetch(`${repoBase}/git/refs/heads/${branch}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commitRes.data.sha }),
      });
      if (!updateRes.ok) {
        const err = classifyError(updateRes.status, updateRes.data);
        return { success: false, error: `Failed to update ref: ${err.message}` };
      }
    } else {
      const createRefRes = await githubFetch(`${repoBase}/git/refs`, {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: commitRes.data.sha }),
      });
      if (!createRefRes.ok) {
        const err = classifyError(createRefRes.status, createRefRes.data);
        return { success: false, error: `Failed to create ref: ${err.message}` };
      }
    }

    return { success: true, commitSha: commitRes.data.sha };

  } catch (err) {
    return { success: false, error: `Network error: ${err.message}` };
  }
}

/**
 * Delete a repository.
 * @param {string} owner - Repository owner
 * @param {string} repoName - Repository name
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteRepo(owner, repoName) {
  const res = await githubFetch(`/repos/${owner}/${repoName}`, {
    method: 'DELETE',
  });

  if (res.error === 'not_connected') {
    return { success: false, error: 'GitHub not connected' };
  }

  if (!res.ok && res.status !== 404) {
    const err = classifyError(res.status, res.data);
    return { success: false, error: err.message };
  }

  // 204 No Content = success, 404 = already deleted (fine)
  return { success: true };
}

export default { getUser, createRepo, setTopics, commitFiles, deleteRepo };