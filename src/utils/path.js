import path from 'path';

function normalizeRelativePath(input) {
  if (typeof input !== 'string' || input.trim() === '') {
    throw new Error('File path must be a non-empty string.');
  }

  const cleaned = input.replace(/\\/g, '/').replace(/^\.\//, '');

  // Only allow relative paths within the template root.
  if (/^[A-Za-z]:/.test(cleaned) || cleaned.startsWith('/')) {
    throw new Error(`Absolute paths are not allowed: ${input}`);
  }

  const segments = cleaned.split('/');
  if (segments.includes('..')) {
    throw new Error(`Parent path segments are not allowed: ${input}`);
  }

  return cleaned;
}

function resolveFromRoot(rootDir, relativePath) {
  const normalized = normalizeRelativePath(relativePath);
  return path.join(rootDir, normalized);
}

export {
  normalizeRelativePath,
  resolveFromRoot,
};
