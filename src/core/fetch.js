import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable, Transform } from 'stream';

function buildGitHubHeaders(token) {
  const headers = {
    'User-Agent': 'tpull',
    Accept: 'application/vnd.github+json',
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  return headers;
}

function formatStatusLine(res) {
  return `${res.status}${res.statusText ? ` ${res.statusText}` : ''}`.trim();
}

async function fetchGitHubJson(url, token, errorPrefix) {
  const res = await fetch(url, { headers: buildGitHubHeaders(token) });
  if (!res.ok) {
    const statusLine = formatStatusLine(res);
    throw new Error(`${errorPrefix} (${statusLine}).`);
  }
  return res.json();
}

async function downloadTarball({ owner, repo, ref, token, filePath, onProgress }) {
  const encodedRef = encodeURIComponent(ref);
  // GitHub tarball endpoint for a specific ref (tag/branch/commit).
  const url = `https://api.github.com/repos/${owner}/${repo}/tarball/${encodedRef}`;

  const res = await fetch(url, { headers: buildGitHubHeaders(token) });
  if (!res.ok) {
    const statusLine = formatStatusLine(res);
    throw new Error(`Download failed (${statusLine})`);
  }

  if (!res.body) {
    throw new Error('Empty response body when downloading tarball');
  }

  const total = Number(res.headers.get('content-length') || 0);
  if (onProgress) {
    onProgress({ loaded: 0, total });
  }

  const source = Readable.fromWeb(res.body);

  if (onProgress) {
    let loaded = 0;
    const progress = new Transform({
      transform(chunk, enc, callback) {
        loaded += chunk.length;
        onProgress({ loaded, total });
        callback(null, chunk);
      },
    });

    await pipeline(source, progress, fs.createWriteStream(filePath));
    return;
  }

  // Stream the tarball to disk to avoid buffering in memory.
  await pipeline(source, fs.createWriteStream(filePath));
}

async function resolveLatestRef({ owner, repo, token }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/tags?per_page=1`;
  const data = await fetchGitHubJson(url, token, 'Resolve latest ref failed');
  if (!Array.isArray(data) || data.length === 0 || !data[0].name) {
    throw new Error('Resolve latest ref failed (no tags found).');
  }

  return data[0].name;
}

async function resolveDefaultBranch({ owner, repo, token }) {
  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const data = await fetchGitHubJson(url, token, 'Resolve default branch failed');
  if (!data || !data.default_branch) {
    throw new Error('Resolve default branch failed (missing default_branch).');
  }

  return data.default_branch;
}

export {
  downloadTarball,
  resolveLatestRef,
  resolveDefaultBranch,
};
