function parseSetPairs(pairs) {
  const vars = {};
  for (const pair of pairs || []) {
    const index = pair.indexOf('=');
    if (index <= 0) {
      throw new Error(`Invalid --set value: ${pair}`);
    }
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1);
    if (!key) {
      throw new Error(`Invalid --set key: ${pair}`);
    }
    vars[key] = String(value);
  }
  return vars;
}

export {
  parseSetPairs,
};
