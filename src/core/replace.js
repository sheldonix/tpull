import fs from 'fs/promises';
import { renderTemplate } from './render.js';
import { looksLikeRegexLiteral, parseRegexLiteral } from '../utils/regex.js';
import { resolveFromRoot } from '../utils/path.js';
import { warn } from '../utils/log.js';

function isBinary(buffer) {
  return buffer.includes(0);
}

async function applyReplacements(rootDir, replacements, vars) {
  for (const replacement of replacements) {
    const files = replacement.files || [];
    const pattern = replacement.pattern;

    if (typeof pattern !== 'string' || pattern.length === 0) {
      throw new Error('Replacement "pattern" must be a non-empty string.');
    }

    // Render variables once per replacement (before applying to files).
    const replacementValue = renderTemplate(replacement.replace, vars, replacement.transform);
    const regex = parseRegexLiteral(pattern);
    if (!regex && looksLikeRegexLiteral(pattern)) {
      throw new Error(`Invalid regex: ${pattern}`);
    }

    for (const relativePath of files) {
      const filePath = resolveFromRoot(rootDir, relativePath);
      let buffer;
      try {
        buffer = await fs.readFile(filePath);
      } catch (err) {
        if (err && err.code === 'ENOENT') {
          throw new Error(`Replacement file not found: ${relativePath}`);
        }
        throw err;
      }

      if (isBinary(buffer)) {
        warn(`Skip binary file: ${relativePath}`);
        continue;
      }

      const content = buffer.toString('utf8');
      // Use regex replace when provided, otherwise do a simple string replace.
      const updated = regex
        ? content.replace(regex, replacementValue)
        : content.replaceAll(pattern, replacementValue);

      if (updated !== content) {
        await fs.writeFile(filePath, updated, 'utf8');
      }
    }
  }
}

export {
  applyReplacements,
};
