import inquirer from 'inquirer';
import { styleText } from 'node:util';
import { looksLikeRegexLiteral, parseRegexLiteral } from '../utils/regex.js';

const PROMPT_THEME = {
  prefix: {
    // Small blue diamond emoji: 🔹
    idle: String.fromCodePoint(0x1F539),
    // Ballot box with check emoji: ☑️
    done: String.fromCodePoint(0x2611, 0xFE0F),
  },
  style: {
    message: (text) => styleText('cyan', text),
    answer: (text) => styleText('cyan', styleText('bold', text)),
  },
};

function buildPattern(pattern, varName) {
  if (!pattern) {
    return null;
  }

  // Allow regex literals like /foo/i, otherwise treat as a bare pattern.
  const literal = parseRegexLiteral(pattern);
  if (literal) {
    return literal;
  }
  if (looksLikeRegexLiteral(pattern)) {
    throw new Error(`Invalid validate for ${varName}: ${pattern}`);
  }

  try {
    return new RegExp(pattern);
  } catch (err) {
    throw new Error(`Invalid validate for ${varName}: ${pattern}`);
  }
}

function normalizeValidatorRegex(regex) {
  if (!regex) {
    return null;
  }
  // Avoid lastIndex side effects from global or sticky patterns.
  if (!regex.global && !regex.sticky) {
    return regex;
  }
  const flags = regex.flags.replace(/g|y/g, '');
  return new RegExp(regex.source, flags);
}

async function collectAnswers(prompts, vars, skipPrompt) {
  const questions = [];

  for (const prompt of prompts) {
    if (Object.prototype.hasOwnProperty.call(vars, prompt.var)) {
      continue;
    }

    // No-prompt mode uses defaults or errors on missing required values.
    if (skipPrompt) {
      if (prompt.default !== undefined) {
        vars[prompt.var] = String(prompt.default);
      } else if (prompt.required) {
        throw new Error(`Missing required variable: ${prompt.var}`);
      }
      continue;
    }

    const pattern = normalizeValidatorRegex(buildPattern(prompt.validate, prompt.var));

    questions.push({
      name: prompt.var,
      type: 'input',
      message: prompt.message,
      theme: PROMPT_THEME,
      default: prompt.default,
      validate: (input) => {
        const value = String(input || '');
        if (prompt.required && value.trim() === '') {
          return 'This field is required.';
        }
        if (pattern && value.trim() !== '' && !pattern.test(value)) {
          return 'Invalid format.';
        }
        return true;
      },
    });
  }

  if (questions.length > 0) {
    const answers = await inquirer.prompt(questions);
    for (const [key, value] of Object.entries(answers)) {
      vars[key] = String(value);
    }
  }

  return vars;
}

export {
  collectAnswers,
};
