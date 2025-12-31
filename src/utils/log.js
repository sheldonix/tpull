function colorEnabled() {
  if (!process.stderr.isTTY) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(process.env, 'NO_COLOR')) {
    return false;
  }
  return true;
}

function formatLine(prefix, message) {
  const text = String(message ?? '').replace(/[\r\n]+/g, ' ').trim();
  return `${prefix} ${text}`;
}

function print(prefix, message, stream, color) {
  const line = formatLine(prefix, message);
  if (colorEnabled() && color) {
    stream.write(`${color}${line}\x1b[0m\n`);
  } else {
    stream.write(`${line}\n`);
  }
}

function info(message) {
  print('Info:', message, process.stdout, '\x1b[1;36m');
}

function warn(message) {
  print('Warn:', message, process.stderr, '\x1b[1;33m');
}

function error(message) {
  print('Error:', message, process.stderr, '\x1b[31m');
}

export {
  info,
  warn,
  error,
};
