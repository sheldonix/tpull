import { isSemverAtLeast, parseSemverInput } from './version.js';

function assertNodeVersion(minVersion) {
  const version = process.versions && process.versions.node ? process.versions.node : '';
  const current = parseSemverInput(version);
  const required = parseSemverInput(minVersion);

  const validCurrent = Number.isInteger(current.major)
    && Number.isInteger(current.minor)
    && Number.isInteger(current.patch);
  const validRequired = Number.isInteger(required.major)
    && Number.isInteger(required.minor)
    && Number.isInteger(required.patch);

  if (!validCurrent || !validRequired) {
    throw new Error(`Node.js >= ${required.raw || minVersion} is required. Current: ${version || 'unknown'}`);
  }

  if (!isSemverAtLeast(current, required)) {
    throw new Error(`Node.js >= ${required.raw || minVersion} is required. Current: ${version || 'unknown'}`);
  }
}

export {
  assertNodeVersion,
};
