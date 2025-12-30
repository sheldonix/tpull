function parseTarget(target) {
  if (typeof target !== 'string' || target.trim() === '') {
    throw new Error('Target is required. Use <owner>/<repo>[@<ref>].');
  }

  const trimmed = target.trim();
  const atIndex = trimmed.lastIndexOf('@');
  let repoPart = trimmed;
  let ref = '';
  if (atIndex >= 0) {
    repoPart = trimmed.slice(0, atIndex);
    ref = trimmed.slice(atIndex + 1).trim();
    if (!ref) {
      throw new Error('If "@" is present, ref is required.');
    }
  }

  const parts = repoPart.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Target must be <owner>/<repo>[@<ref>].');
  }

  return {
    owner: parts[0],
    repo: parts[1],
    ref,
  };
}

export {
  parseTarget,
};
