import fs from 'fs/promises';
import path from 'path';
import { applyBold } from '../utils/ui.js';

async function ensureEmptyDir(destDir) {
  try {
    const stat = await fs.stat(destDir);
    if (!stat.isDirectory()) {
      const emphasizedDir = applyBold(destDir, process.stderr);
      throw new Error(`Destination is not a directory: ${emphasizedDir}`);
    }
    const entries = await fs.readdir(destDir);
    if (entries.length > 0) {
      const emphasizedDir = applyBold(destDir, process.stderr);
      throw new Error(`Destination directory is not empty: ${emphasizedDir}`);
    }
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return;
    }
    throw err;
  }
}

async function copyTemplate(srcDir, destDir) {
  await fs.mkdir(destDir, { recursive: true });
  const entries = await fs.readdir(srcDir, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);
    await fs.cp(srcPath, destPath, { recursive: true, force: false, errorOnExist: true });
  }
}

export {
  ensureEmptyDir,
  copyTemplate,
};
