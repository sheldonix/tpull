function looksLikeRegexLiteral(input) {
  return typeof input === 'string' && input.length > 1 && input[0] === '/' && input.lastIndexOf('/') > 0;
}

function parseRegexLiteral(input) {
  // Parse /pattern/flags while respecting escaped slashes.
  if (typeof input !== 'string' || input.length < 2 || input[0] !== '/') {
    return null;
  }

  let lastSlash = -1;
  for (let i = input.length - 1; i > 0; i -= 1) {
    if (input[i] === '/') {
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && input[j] === '\\') {
        backslashCount += 1;
        j -= 1;
      }
      if (backslashCount % 2 === 0) {
        lastSlash = i;
        break;
      }
    }
  }

  if (lastSlash <= 0) {
    return null;
  }

  const pattern = input.slice(1, lastSlash);
  const flags = input.slice(lastSlash + 1);
  try {
    return new RegExp(pattern, flags);
  } catch (err) {
    return null;
  }
}

export {
  looksLikeRegexLiteral,
  parseRegexLiteral,
};
