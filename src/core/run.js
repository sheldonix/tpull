import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { parseTarget } from './resolve.js';
import { downloadTarball, resolveDefaultBranch, resolveLatestRef } from './fetch.js';
import { extractTarball } from './extract.js';
import { loadConfig } from './config.js';
import { collectAnswers } from './prompt.js';
import { applyReplacements } from './replace.js';
import { ensureEmptyDir, copyTemplate } from './output.js';
import { parseSetPairs } from './vars.js';
import { createDownloadUI, applyBold } from '../utils/ui.js';
import { ReportedError } from '../utils/errors.js';
import { isSemverAtLeast, parseSemverInput } from '../utils/version.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

function assertTpullVersion(minVersion, currentVersion) {
  const current = parseSemverInput(currentVersion);
  const required = parseSemverInput(minVersion);

  const validCurrent = Number.isInteger(current.major)
    && Number.isInteger(current.minor)
    && Number.isInteger(current.patch);
  const validRequired = Number.isInteger(required.major)
    && Number.isInteger(required.minor)
    && Number.isInteger(required.patch);

  if (!validCurrent || !validRequired) {
    throw new Error(`Invalid tpull_version: ${required.raw || minVersion}`);
  }

  if (!isSemverAtLeast(current, required)) {
    throw new Error(
      `tpull >= ${required.raw || minVersion} is required. `
        + `Current: ${current.raw || currentVersion}. `
        + 'Update via "npm install -g tpull".',
    );
  }
}

async function runWorkflow({ target, projectName, sets, skipPrompt, token }) {
  let { owner, repo, ref } = parseTarget(target);
  const authToken = token || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

  if (!ref) {
    ref = await resolveDefaultBranch({ owner, repo, token: authToken });
  } else if (ref === 'latest') {
    ref = await resolveLatestRef({ owner, repo, token: authToken });
  }

  const vars = {
    owner,
    repo,
    ref,
  };

  if (projectName) {
    vars.project_name = String(projectName);
  }

  const setVars = parseSetPairs(sets);
  Object.assign(vars, setVars);

  let destPath = null;

  async function refreshDestination() {
    const destName = vars.project_name || repo;
    if (!destName) {
      throw new Error('Destination name is required.');
    }
    destPath = path.resolve(process.cwd(), destName);
    await ensureEmptyDir(destPath);
  }

  if (Object.prototype.hasOwnProperty.call(vars, 'project_name')) {
    const initialName = String(vars.project_name);
    if (initialName.trim() !== '') {
      await refreshDestination();
    }
  }

  // Use a temp workspace to keep download/extract isolated.
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'tpull-'));
  const archivePath = path.join(workDir, 'archive.tgz');
  const extractDir = path.join(workDir, 'extract');
  let config = null;

  try {
    await fs.mkdir(extractDir, { recursive: true });

    // Download and extract the GitHub tarball.
    const templateRef = `${repo}@${ref}`;
    const emphasizedRef = applyBold(templateRef, process.stderr);
    const pullLabel = `Pulling: ${emphasizedRef}`;
    const downloadUI = createDownloadUI({
      label: `${String.fromCodePoint(0x23ec)} ${pullLabel}`,
      doneLabel: `${String.fromCodePoint(0x2705)} Pull completed: ${emphasizedRef}`,
      errorLabel: `${String.fromCodePoint(0x274c)} ${pullLabel}`,
      stream: process.stderr,
    });
    downloadUI.start();

    try {
      await downloadTarball({
        owner,
        repo,
        ref,
        token: authToken,
        filePath: archivePath,
        onProgress: (progress) => downloadUI.update(progress),
      });
      downloadUI.stop(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      downloadUI.stop(false, message);
      if (err && err.reported) {
        throw err;
      }
      throw new ReportedError(message, { cause: err });
    }

    await extractTarball({ filePath: archivePath, destDir: extractDir });

    // Config is optional; if missing, just copy files as-is.
    config = await loadConfig(extractDir);
    if (config && config.tpull_version) {
      assertTpullVersion(config.tpull_version, pkg.version);
    }
    if (config) {
      await collectAnswers(config.prompts, vars, skipPrompt);
    }
    await refreshDestination();
    if (config) {
      await applyReplacements(extractDir, config.replacements, vars);
    }

    // Destination defaults to project_name, then repo.
    await copyTemplate(extractDir, destPath);
  } finally {
    // Always clean up the temp workspace.
    await fs.rm(workDir, { recursive: true, force: true });
  }
}

async function runLocalWorkflow({ projectName, sets, skipPrompt }) {
  const rootDir = process.cwd();
  const repoName = path.basename(rootDir) || 'local';
  const vars = {
    owner: 'local',
    repo: repoName,
    ref: 'local',
  };

  if (projectName) {
    vars.project_name = String(projectName);
  }

  const setVars = parseSetPairs(sets);
  Object.assign(vars, setVars);

  const config = await loadConfig(rootDir);
  if (!config) {
    throw new Error('Missing tpull-config.yaml in the current directory.');
  }

  if (config.tpull_version) {
    assertTpullVersion(config.tpull_version, pkg.version);
  }

  await collectAnswers(config.prompts, vars, skipPrompt);
  await applyReplacements(rootDir, config.replacements, vars);
}

export {
  runWorkflow,
  runLocalWorkflow,
};
