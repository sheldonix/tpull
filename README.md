<div align="center">
  <img src="https://raw.githubusercontent.com/sheldonix/tpull/v1.2.0/docs/logo.svg" alt="tpull logo" width="520" height="120">
  <p>
    <a href="https://www.npmjs.com/package/tpull"><img src="https://img.shields.io/npm/v/tpull.svg" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/tpull"><img src="https://img.shields.io/npm/dm/tpull.svg" alt="npm downloads"></a>
    <a href="https://www.npmjs.com/package/tpull"><img src="https://img.shields.io/node/v/tpull.svg" alt="node version"></a>
    <a href="./LICENSE"><img src="https://img.shields.io/npm/l/tpull.svg" alt="license"></a>
  </p>
</div>

CLI to pull a GitHub template with interactive prompts and variable replacement.

## Features
- Pull templates from GitHub refs (tags/branches/commits) via the tarball API.
- Optional interactive prompts driven by `tpull-config.yaml`.
- Variable replacement with transforms and regex support.
- No scripts executed; output is deterministic for the same inputs.

## Requirements
- Node.js >= 20.12.0

## Install
```bash
npm install -g tpull
```

Or run without installing:
```bash
npx tpull <owner>/<repo>[@<ref>] [project_name] [options]
```

## Usage
```bash
tpull <owner>/<repo>[@<ref>] [project_name] [options]
tpull local [project_name] [options]
```

Examples:
```bash
tpull sheldonix/nuxt-shadcn-template@latest my-nuxt-app
tpull local my-nuxt-app
```

Ref examples:
- `tpull owner/repo@v1.2.3` — tag ref.
- `tpull owner/repo@main` — branch ref.
- `tpull owner/repo@feature/foo` — feature branch ref.
- `tpull owner/repo@a1b2c3d` — commit SHA ref.
- `tpull owner/repo@latest` — latest tag.
- `tpull owner/repo` — default branch (auto-detected, typically `main` or `master`).

If `@<ref>` is omitted, tpull uses the repository default branch. If "@" is present, ref is required.
The special ref `latest` resolves to the most recent tag.

## Options
| Option | Description |
| --- | --- |
| `--set <var=value>` | Set a template variable (repeatable). |
| `--no-prompt` | Skip prompts and use defaults; required values without defaults will error. |
| `--token <token>` | GitHub access token for private repos. |

Environment variables:
- `GH_TOKEN` or `GITHUB_TOKEN` can be used instead of `--token` (in that order).

## Local mode
Run `tpull local` inside a template directory to apply `tpull-config.yaml` to the current working directory. This is useful for quick testing without downloading a repo.

## Template config
If the template repository contains `tpull-config.yaml`, tpull uses it to prompt for variables and run replacements. If the file is missing, the template is copied as-is.
`tpull_version` is required and defines the minimum tpull version for the template.

### Example `tpull-config.yaml`
```yaml
$schema: https://raw.githubusercontent.com/sheldonix/tpull/v1.2.0/schema.json
tpull_version: 1.2.0
name: template-name
template_repo: https://github.com/owner/repo
prompts:
  - var: project_name
    type: input
    message: Project name?
    default: my-tauri-app
    required: true
replacements:
  - files:
      - package.json
    pattern: '/("name"\s*:\s*")[^"]*(")/'
    replace: '$1{{project_name}}$2'
  - files:
      - tpull-config.yaml
    pattern: '/(^name:\s*)template-name/m'
    replace: '$1{{project_name}}'
  - files:
      - tpull-config.yaml
    pattern: '/\)template-name/g'
    replace: '){{project_name}}'
  - files:
      - src-tauri/tauri.conf.json
    pattern: '/("productName"\s*:\s*")[^"]*(")/'
    replace: '$1{{project_name}}$2'
  - files:
      - src-tauri/tauri.conf.json
    pattern: '/("identifier"\s*:\s*"com.app.)[^"]*(")/'
    replace: '$1{{project_name}}$2'
    transform: kebab
  - files:
      - src-tauri/Cargo.toml
    pattern: '/(^name\s*=\s*")template-name(")/m'
    replace: '$1{{project_name}}$2'
  - files:
      - src-tauri/Cargo.toml
    pattern: '/(^name\s*=\s*")template-name(_lib")/m'
    replace: '$1{{project_name}}$2'
    transform: snake
  - files:
      - src-tauri/Cargo.lock
    pattern: '/(^name\s*=\s*")template-name(")/m'
    replace: '$1{{project_name}}$2'
```

### Prompts
Supported prompt fields:
- `var` (required): variable name.
- `type` (required): only supports `input` for now.
- `message` (required): prompt text.
- `default` (optional): default value.
- `required` (optional): `true` or `false` (defaults to `false`).
- `validate` (optional): regex literal (`/^[a-z0-9_-]+$/i`) or a bare regex pattern (`^[A-Za-z0-9_-]+$`).

Prompt values can be overridden with `--set` or the `project_name` positional argument.

### Replacements
Supported replacement fields:
- `files` (required): list of relative paths under the template root (must not be absolute or contain `..`).
- `pattern` (required): plain string or regex literal (`/pattern/flags`).
- `replace` (required): replacement string, supports `{{var}}` placeholders.
- `failIfNoMatch` (optional): error and abort when a file has no matches (defaults to `true`, set `false` to allow skips).
- `transform` (optional): apply a transform to variables in `replace`.

Available transforms (inputs: My App / my-app):

| Transform | My App | my-app |
| --- | --- | --- |
| kebab | my-app | my-app |
| snake | my_app | my_app |
| camel | myApp | myApp |
| pascal | MyApp | MyApp |
| upper | MY APP | MY-APP |
| lower | my app | my-app |
| upper_words | MY APP | MY APP |
| lower_words | my app | my app |
| constant | MY_APP | MY_APP |

### Built-in variables
- `owner`
- `repo`
- `ref`
- `project_name`

`project_name` comes from the positional argument if provided; otherwise it defaults to the repo name and is also used for the output directory.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

[![GitHub](https://img.shields.io/badge/Github-sheldonix%2Ftpull-181717?logo=github)](https://github.com/sheldonix/tpull)

## License
[MIT](./LICENSE)
