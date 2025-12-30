#!/usr/bin/env node

import { run } from '../src/cli/index.js';
import { assertNodeVersion } from '../src/utils/node.js';
import * as log from '../src/utils/log.js';
import { isReportedError } from '../src/utils/errors.js';

async function main() {
  try {
    assertNodeVersion('20.12.0');
  } catch (err) {
    log.error(err && err.message ? err.message : String(err));
    process.exitCode = 1;
    return;
  }

  try {
    await run(process.argv);
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    if (!isReportedError(err)) {
      log.error(message);
    }
    process.exitCode = 1;
  }
}

main();
