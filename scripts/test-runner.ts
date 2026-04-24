import process from 'node:process';

import type { TestGroup } from './test-types.js';

import { testGroup as authRoutingGroup } from '../apps/web/src/lib/auth-routing.test.js';
import { testGroup as communicationsIntegrationGroup } from '../packages/core/src/communications.integration.test.js';
import { testGroup as edgeFunctionsIntegrationGroup } from '../packages/core/src/edge-functions.integration.test.js';
import { testGroup as errorsGroup } from '../packages/core/src/errors.test.js';
import { testGroup as servicesGroup } from '../packages/core/src/services.test.js';
import { testGroup as uploadsGroup } from '../packages/core/src/uploads.test.js';
import { testGroup as whatsappGroup } from '../packages/core/src/whatsapp.test.js';
import { testGroup as typesGroup } from '../packages/types/src/index.test.js';

const groups: TestGroup[] = [
  authRoutingGroup,
  communicationsIntegrationGroup,
  edgeFunctionsIntegrationGroup,
  errorsGroup,
  servicesGroup,
  uploadsGroup,
  whatsappGroup,
  typesGroup,
];

async function run() {
  let failed = 0;
  let executed = 0;

  for (const group of groups) {
    console.log(`\n${group.name}`);

    for (const testCase of group.cases) {
      executed += 1;

      try {
        await testCase.run();
        console.log(`  PASS ${testCase.name}`);
      } catch (reason) {
        failed += 1;
        const message = reason instanceof Error ? reason.stack ?? reason.message : String(reason);
        console.error(`  FAIL ${testCase.name}`);
        console.error(`    ${message.split('\n').join('\n    ')}`);
      }
    }
  }

  console.log(`\nExecuted: ${executed}`);
  console.log(`Passed: ${executed - failed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

void run();
