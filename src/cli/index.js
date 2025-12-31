import { Command } from 'commander';
import { createRequire } from 'module';
import { runWorkflow, runLocalWorkflow } from '../core/run.js';
import { printBanner, applyGradient, printSuccess } from '../utils/ui.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

const BOX = {
  topLeft: '╭',
  topRight: '╮',
  bottomLeft: '╰',
  bottomRight: '╯',
  horizontal: '─',
  vertical: '│',
};

const GRADIENT_STOPS = [
  [0, 200, 120],
  [0, 210, 150],
  [0, 220, 180],
  [0, 230, 210],
  [0, 210, 235],
  [0, 175, 245],
  [0, 130, 255],
];
const ERROR_COLOR = '\x1b[31m';
const COLOR_RESET = '\x1b[0m';

function buildInfoLine() {
  const description = pkg.description ? ` - ${pkg.description}` : '';
  return `${pkg.name} v${pkg.version}${description}`;
}

function printBoxedLine(text, stream = process.stdout) {
  const width = text.length + 2;
  const top = `${BOX.topLeft}${BOX.horizontal.repeat(width)}${BOX.topRight}`;
  const middle = `${BOX.vertical} ${text} ${BOX.vertical}`;
  const bottom = `${BOX.bottomLeft}${BOX.horizontal.repeat(width)}${BOX.bottomRight}`;
  stream.write(`${applyGradient(top, GRADIENT_STOPS, stream)}\n`);
  stream.write(`${applyGradient(middle, GRADIENT_STOPS, stream)}\n`);
  stream.write(`${applyGradient(bottom, GRADIENT_STOPS, stream)}\n\n`);
}

function collect(value, previous) {
  const list = previous || [];
  list.push(value);
  return list;
}

function formatDuration(ms) {
  const totalMs = Math.max(0, Number(ms) || 0);
  const totalSeconds = totalMs / 1000;
  if (totalSeconds < 60) {
    const seconds = Math.floor(totalSeconds * 100) / 100;
    return `${seconds.toFixed(2)}s`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const remainderSeconds = Math.floor(totalSeconds - minutes * 60);
  return `${minutes}m ${remainderSeconds}s`;
}

function isCommanderColorEnabled() {
  if (!process.stderr.isTTY) {
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

function colorizeError(text) {
  if (!isCommanderColorEnabled()) {
    return text;
  }
  return `${ERROR_COLOR}${text}${COLOR_RESET}`;
}

function formatCommanderError(text) {
  const value = String(text ?? '');
  return value.replace(/^(\s*)error:/i, '$1Error:');
}

async function run(argv) {
  const program = new Command();

  printBanner();
  printBoxedLine(buildInfoLine());

  program
    .name('tpull')
    .argument('<target>', 'Format: <owner>/<repo>[@<ref>] or "local"')
    .argument('[project_name]', 'Project name')
    .option('--set <var=value>', 'Set a template variable (repeatable)', collect, [])
    .option('--no-prompt', 'Skip prompts and use defaults')
    .option('--token <token>', 'GitHub access token')
    .showHelpAfterError()
    .configureOutput({
      outputError: (str, write) => write(colorizeError(formatCommanderError(str))),
    })
    .parse(argv);

  const opts = program.opts();
  const args = program.args;
  const target = args[0];
  const projectName = args[1];

  const startedAt = process.hrtime.bigint();

  if (target === 'local') {
    if (args.length > 2) {
      throw new Error('When using target "local", provide at most one positional argument for project_name.');
    }
    await runLocalWorkflow({
      projectName,
      sets: opts.set || [],
      skipPrompt: opts.prompt === false,
    });
    const elapsedMs = Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6);
    printSuccess(`✅ Done in ${formatDuration(elapsedMs)}`);
    return;
  }

  await runWorkflow({
    target,
    projectName,
    sets: opts.set || [],
    skipPrompt: opts.prompt === false,
    token: opts.token,
  });
  const elapsedMs = Math.round(Number(process.hrtime.bigint() - startedAt) / 1e6);
  printSuccess(`✅ Done in ${formatDuration(elapsedMs)}`);
}

export {
  run,
};
