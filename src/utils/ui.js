const COLOR_RESET = '\x1b[0m';
const COLOR_GREEN = '\x1b[32m';
const COLOR_GREEN_LIGHT = '\x1b[92m';
const COLOR_RED = '\x1b[31m';
const COLOR_CYAN = '\x1b[36m';
const COLOR_CYAN_LIGHT = '\x1b[96m';
const COLOR_BLUE = '\x1b[34m';
const COLOR_BLUE_LIGHT = '\x1b[94m';
const COLOR_BOLD = '\x1b[1m';
const COLOR_BOLD_RESET = '\x1b[22m';
const ANSI_RE = /\x1b\[[0-9;]*m/g;

function isColorEnabled(stream) {
  if (!stream || !stream.isTTY) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(process.env, 'NO_COLOR')) {
    return false;
  }
  if (process.env.TERM === 'dumb') {
    return false;
  }
  return true;
}

function colorize(text, color, stream) {
  if (!isColorEnabled(stream)) {
    return text;
  }
  return `${color}${text}${COLOR_RESET}`;
}

function interpolateChannel(start, end, ratio) {
  return Math.round(start + (end - start) * ratio);
}

function mixColors(start, end, ratio) {
  return [
    interpolateChannel(start[0], end[0], ratio),
    interpolateChannel(start[1], end[1], ratio),
    interpolateChannel(start[2], end[2], ratio),
  ];
}

function getGradientColor(stops, ratio) {
  if (stops.length === 1) {
    return stops[0];
  }
  const clamped = Math.min(Math.max(ratio, 0), 1);
  const segment = clamped * (stops.length - 1);
  const index = Math.min(Math.floor(segment), stops.length - 2);
  const local = segment - index;
  return mixColors(stops[index], stops[index + 1], local);
}

function applyGradient(text, stops, stream) {
  if (!isColorEnabled(stream)) {
    return text;
  }
  if (!Array.isArray(stops) || stops.length === 0) {
    return text;
  }
  const chars = Array.from(String(text));
  if (chars.length === 0) {
    return '';
  }
  const total = chars.length;
  let output = '';
  for (let i = 0; i < total; i += 1) {
    const ratio = total === 1 ? 0 : i / (total - 1);
    const [r, g, b] = getGradientColor(stops, ratio);
    output += `\x1b[38;2;${r};${g};${b}m${chars[i]}`;
  }
  return `${output}${COLOR_RESET}`;
}

function applyBold(text, stream) {
  if (!isColorEnabled(stream)) {
    return text;
  }
  return `${COLOR_BOLD}${text}${COLOR_BOLD_RESET}`;
}

function printSuccess(message, stream = process.stdout) {
  const text = String(message ?? '');
  const colored = colorize(text, COLOR_GREEN, stream);
  stream.write(`${colored}\n`);
}

function printAccent(message, stream = process.stdout) {
  const text = String(message ?? '');
  const colored = colorize(text, COLOR_GREEN_LIGHT, stream);
  stream.write(`${colored}\n`);
}

function printBanner(stream = process.stdout) {
  const T = [
    '########',
    '   ##   ',
    '   ##   ',
    '   ##   ',
    '   ##   ',
    '   ##   ',
  ];
  const P = [
    '####### ',
    '##    ##',
    '####### ',
    '##      ',
    '##      ',
    '##      ',
  ];
  const U = [
    '##    ##',
    '##    ##',
    '##    ##',
    '##    ##',
    '##    ##',
    ' ###### ',
  ];
  const L = [
    '##      ',
    '##      ',
    '##      ',
    '##      ',
    '##      ',
    '########',
  ];
  const lines = T.map((_, index) => `${T[index]}  ${P[index]}  ${U[index]}  ${L[index]}  ${L[index]}`);
  const colors = [
    COLOR_GREEN,
    COLOR_GREEN_LIGHT,
    COLOR_CYAN_LIGHT,
    COLOR_CYAN,
    COLOR_BLUE_LIGHT,
    COLOR_BLUE,
  ];

  stream.write('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const color = colors[i % colors.length];
    const colored = colorize(lines[i], color, stream);
    stream.write(`${colored}\n`);
  }
  stream.write('\n');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) {
    return '0 B';
  }
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = Math.max(0, bytes);
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function clearLine(stream) {
  if (!stream.isTTY) {
    return;
  }
  stream.write('\r\x1b[2K');
}

function visibleLength(text) {
  return String(text || '').replace(ANSI_RE, '').length;
}

function hideCursor(stream) {
  if (!stream.isTTY) {
    return;
  }
  stream.write('\x1b[?25l');
}

function showCursor(stream) {
  if (!stream.isTTY) {
    return;
  }
  stream.write('\x1b[?25h');
}

function renderLine(stream, text, state) {
  if (!stream.isTTY) {
    return;
  }
  const line = String(text || '').replace(/[\r\n]+/g, ' ');
  const length = visibleLength(line);
  const prev = state.lastLength || 0;
  const pad = prev > length ? ' '.repeat(prev - length) : '';
  stream.write(`\r${line}${pad}`);
  state.lastLength = Math.max(prev, length);
}

function createSpinner(text, stream = process.stderr, color) {
  const dotFrames = ['', '.', '..', '...'];
  let index = 0;
  let timer = null;
  let label = text;
  const state = { lastLength: 0 };

  function render() {
    const dots = dotFrames[index % dotFrames.length].padEnd(3, ' ');
    const line = `${label} ${dots}`;
    const colored = color ? colorize(line, color, stream) : line;
    renderLine(stream, colored, state);
    index = (index + 1) % dotFrames.length;
  }

  return {
    start() {
      if (!stream.isTTY) {
        return;
      }
      if (timer) {
        return;
      }
      render();
      timer = setInterval(render, 120);
    },
    setText(next) {
      label = next;
    },
    stop(finalText) {
      if (!stream.isTTY) {
        if (finalText) {
          stream.write(`${finalText}\n`);
        }
        return;
      }
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (finalText) {
        renderLine(stream, finalText, state);
        stream.write('\n');
        return;
      }
      clearLine(stream);
    },
  };
}

function createProgressBar(total, label, stream = process.stderr, color, options = {}) {
  const width = 28;
  let current = 0;
  let lastRender = 0;
  const state = { lastLength: 0 };
  const finalTotalOnly = Boolean(options.finalTotalOnly);

  function render(force = false, labelOverride, colorOverride, isFinal = false) {
    if (!stream.isTTY) {
      return;
    }
    const now = Date.now();
    if (!force && now - lastRender < 80) {
      return;
    }
    lastRender = now;
    const ratio = total > 0 ? Math.min(current / total, 1) : 0;
    const filled = Math.round(width * ratio);
    const bar = `${'='.repeat(filled)}${'-'.repeat(width - filled)}`;
    const percent = total > 0 ? Math.round(ratio * 100) : 0;
    const activeLabel = labelOverride || label;
    const detail = isFinal && finalTotalOnly
      ? formatBytes(total)
      : `${formatBytes(current)} / ${formatBytes(total)}`;
    const text = `${activeLabel} [${bar}] ${percent}% (${detail})`;
    const appliedColor = colorOverride || color;
    const colored = appliedColor ? colorize(text, appliedColor, stream) : text;
    renderLine(stream, colored, state);
  }

  return {
    update(next) {
      current = next;
      render(false);
    },
    stop(finalLabel, finalColor) {
      if (!stream.isTTY) {
        return;
      }
      render(true, finalLabel, finalColor, true);
      stream.write('\n');
    },
    fail(finalLabel, finalColor) {
      if (!stream.isTTY) {
        return;
      }
      render(true, finalLabel, finalColor, false);
      stream.write('\n');
    },
  };
}

function createDownloadUI(label = 'Downloading', stream = process.stderr) {
  let activeLabel = label;
  let doneLabel = 'Downloaded';
  let errorLabel = null;
  let activeColor = COLOR_CYAN;
  let doneColor = COLOR_GREEN;
  let errorColor = COLOR_RED;

  if (typeof label === 'object' && label !== null) {
    activeLabel = label.label || 'Downloading';
    doneLabel = label.doneLabel || 'Downloaded';
    errorLabel = label.errorLabel || null;
    stream = label.stream || stream;
    if (label.labelColor) {
      activeColor = label.labelColor;
    }
    if (label.doneColor) {
      doneColor = label.doneColor;
    }
    if (label.errorColor) {
      errorColor = label.errorColor;
    }
  }

  const spinner = createSpinner(activeLabel, stream, activeColor);
  let progress = null;
  let lastLabelUpdate = 0;
  let lastLoaded = 0;

  return {
    start() {
      hideCursor(stream);
      spinner.start();
    },
    update({ loaded, total }) {
      if (total > 0) {
        if (!progress) {
          spinner.stop();
          progress = createProgressBar(total, activeLabel, stream, activeColor, { finalTotalOnly: true });
        }
        progress.update(loaded);
      } else {
        const now = Date.now();
        lastLoaded = loaded;
        if (now - lastLabelUpdate > 200) {
          spinner.setText(`${activeLabel} (${formatBytes(loaded)})`);
          lastLabelUpdate = now;
        }
      }
    },
    stop(success = true, failureMessage) {
      showCursor(stream);
      if (!success) {
        const message = failureMessage ? String(failureMessage).trim() : 'Download failed.';
        const baseLabel = errorLabel || activeLabel;
        const failureLine = message ? `${baseLabel} - ${message}` : baseLabel;
        if (!stream.isTTY) {
          stream.write(`${failureLine}\n`);
          return;
        }
        const colored = colorize(failureLine, errorColor, stream);
        if (progress) {
          clearLine(stream);
          stream.write(`${colored}\n`);
          return;
        }
        spinner.stop(colored);
        return;
      }
      if (progress) {
        progress.stop(doneLabel, doneColor);
        return;
      }
      spinner.stop();
      const total = lastLoaded || 1;
      const finalBar = createProgressBar(total, doneLabel, stream, doneColor, { finalTotalOnly: true });
      finalBar.update(total);
      finalBar.stop();
    },
  };
}

export {
  printBanner,
  applyGradient,
  applyBold,
  printSuccess,
  printAccent,
  createDownloadUI,
  formatBytes,
};
