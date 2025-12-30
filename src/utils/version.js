function parseSemverInput(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { major: Math.trunc(value), minor: 0, patch: 0, raw: String(value) };
  }
  const raw = String(value ?? '').trim();
  if (!raw) {
    return { major: NaN, minor: NaN, patch: NaN, raw };
  }
  let normalized = raw;
  if (normalized.startsWith('v') || normalized.startsWith('V')) {
    normalized = normalized.slice(1);
  }
  normalized = normalized.split('+')[0].split('-')[0];
  const parts = normalized.split('.');
  const major = Number(parts[0]);
  const minor = Number(parts[1] || 0);
  const patch = Number(parts[2] || 0);
  return { major, minor, patch, raw };
}

function isSemverAtLeast(current, required) {
  if (current.major !== required.major) {
    return current.major > required.major;
  }
  if (current.minor !== required.minor) {
    return current.minor > required.minor;
  }
  return current.patch >= required.patch;
}

export {
  parseSemverInput,
  isSemverAtLeast,
};
