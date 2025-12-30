import fs from 'fs/promises';
import path from 'path';
import yaml from 'yaml';
import { z } from 'zod';
import { TRANSFORMS } from './transforms.js';

// Schema keeps config flexible while validating required fields.
const promptSchema = z
  .object({
    var: z.string().min(1),
    type: z.literal('input'),
    message: z.string().min(1),
    default: z.any().optional(),
    required: z.boolean().optional(),
    validate: z.string().optional(),
  })
  .strict();

const replacementSchema = z
  .object({
    files: z.array(z.string().min(1)).min(1),
    pattern: z.string().min(1),
    replace: z.string(),
    // Validate transform values early to catch typos.
    transform: z
      .enum(Object.keys(TRANSFORMS))
      .optional(),
  })
  .strict();

const configSchema = z
  .object({
    $schema: z.string().optional(),
    name: z.string().optional(),
    template_repo: z.string().optional(),
    tpull_version: z.string().min(1),
    prompts: z.array(promptSchema).optional(),
    replacements: z.array(replacementSchema).optional(),
  })
  .strict();

function parseConfigContent(content, sourceName = 'tpull-config.yaml') {
  let parsed;
  try {
    parsed = yaml.parse(content) || {};
  } catch (err) {
    throw new Error(`Failed to parse ${sourceName}: ${err.message}`);
  }

  const result = configSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid ${sourceName}: ${result.error.message}`);
  }

  const prompts = (result.data.prompts || []).map((prompt) => ({
    var: prompt.var,
    type: prompt.type,
    message: prompt.message,
    default: prompt.default,
    required: Boolean(prompt.required),
    validate: typeof prompt.validate === 'string' ? prompt.validate : '',
  }));

  const seen = new Set();
  for (const prompt of prompts) {
    if (seen.has(prompt.var)) {
      throw new Error(`Duplicate prompt var: ${prompt.var}`);
    }
    seen.add(prompt.var);
  }

  return {
    tpull_version: result.data.tpull_version,
    prompts,
    replacements: result.data.replacements || [],
  };
}

async function loadConfig(rootDir) {
  const configPath = path.join(rootDir, 'tpull-config.yaml');

  try {
    await fs.access(configPath);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      // Config is optional; return null when missing.
      return null;
    }
    throw err;
  }

  const content = await fs.readFile(configPath, 'utf8');
  const parsed = parseConfigContent(content, 'tpull-config.yaml');

  return {
    configPath,
    ...parsed,
  };
}

export {
  loadConfig,
  parseConfigContent,
};
