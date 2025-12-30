import * as tar from 'tar';

async function extractTarball({ filePath, destDir }) {
  await tar.x({
    file: filePath,
    cwd: destDir,
    strip: 1,
  });
}

export {
  extractTarball,
};
