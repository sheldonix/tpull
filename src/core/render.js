import { applyTransform } from './transforms.js';

const VAR_RE = /\{\{\s*([a-zA-Z0-9_-]+)\s*\}\}/g;

function escapeReplacement(value) {
  // Escape $ to avoid replacement backreferences in String.replace.
  return String(value).replace(/\$/g, '$$');
}

function renderTemplate(template, vars, transform) {
  if (typeof template !== 'string') {
    return '';
  }

  return template.replace(VAR_RE, (match, name) => {
    if (!Object.prototype.hasOwnProperty.call(vars, name)) {
      throw new Error(`Unknown variable: ${name}`);
    }
    const value = applyTransform(vars[name], transform);
    return escapeReplacement(value);
  });
}

export {
  renderTemplate,
};
