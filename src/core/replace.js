import fs from 'fs/promises';
import { renderTemplate } from './render.js';
import { looksLikeRegexLiteral, parseRegexLiteral } from '../utils/regex.js';
import { resolveFromRoot } from '../utils/path.js';
import { printAccent } from '../utils/ui.js';

function isBinary(buffer) {
  return buffer.includes(0);
}

function countStringMatches(content, pattern) {
  let count = 0;
  let index = 0;
  while (true) {
    const nextIndex = content.indexOf(pattern, index);
    if (nextIndex === -1) {
      break;
    }
    count += 1;
    index = nextIndex + pattern.length;
  }
  return count;
}

function countMatches(content, pattern, regex) {
  if (regex) {
    if (!regex.flags.includes('g')) {
      return regex.test(content) ? 1 : 0;
    }
    const counter = new RegExp(regex.source, regex.flags);
    let count = 0;
    let match = counter.exec(content);
    while (match) {
      count += 1;
      if (match[0] === '') {
        counter.lastIndex += 1;
      }
      match = counter.exec(content);
    }
    return count;
  }

  return countStringMatches(content, pattern);
}

async function applyReplacements(rootDir, replacements, vars) {
  const totalsByFile = new Map();
  const filesInOrder = [];
  for (const replacement of replacements) {
    const files = replacement.files || [];
    const pattern = replacement.pattern;
    const failIfNoMatch = replacement.failIfNoMatch !== false;

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
        throw new Error(`Binary file detected: ${relativePath}`);
      }

      const content = buffer.toString('utf8');
      const matchCount = countMatches(content, pattern, regex);
      if (failIfNoMatch && matchCount === 0) {
        throw new Error(`No matches for pattern [${pattern}] in file: ${relativePath}`);
      }
      if (!totalsByFile.has(relativePath)) {
        totalsByFile.set(relativePath, 0);
        filesInOrder.push(relativePath);
      }
      totalsByFile.set(relativePath, totalsByFile.get(relativePath) + matchCount);
      // Use regex replace when provided, otherwise do a simple string replace.
      const updated = regex
        ? content.replace(regex, replacementValue)
        : content.replaceAll(pattern, replacementValue);

      if (updated !== content) {
        await fs.writeFile(filePath, updated, 'utf8');
      }
    }
  }

  for (const relativePath of filesInOrder) {
    const total = totalsByFile.get(relativePath) || 0;
    printAccent(`🧩 Replaced ${total} occurrence(s) in ${relativePath}`);
  }
}

export {
  applyReplacements,
};
