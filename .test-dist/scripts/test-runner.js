"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_process_1 = __importDefault(require("node:process"));
const auth_routing_test_js_1 = require("../apps/web/src/lib/auth-routing.test.js");
const communications_integration_test_js_1 = require("../packages/core/src/communications.integration.test.js");
const edge_functions_integration_test_js_1 = require("../packages/core/src/edge-functions.integration.test.js");
const errors_test_js_1 = require("../packages/core/src/errors.test.js");
const i18n_test_js_1 = require("../packages/core/src/i18n.test.js");
const services_test_js_1 = require("../packages/core/src/services.test.js");
const uploads_test_js_1 = require("../packages/core/src/uploads.test.js");
const whatsapp_test_js_1 = require("../packages/core/src/whatsapp.test.js");
const index_test_js_1 = require("../packages/types/src/index.test.js");
const groups = [
    auth_routing_test_js_1.testGroup,
    communications_integration_test_js_1.testGroup,
    edge_functions_integration_test_js_1.testGroup,
    errors_test_js_1.testGroup,
    i18n_test_js_1.testGroup,
    services_test_js_1.testGroup,
    uploads_test_js_1.testGroup,
    whatsapp_test_js_1.testGroup,
    index_test_js_1.testGroup,
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
            }
            catch (reason) {
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
        node_process_1.default.exitCode = 1;
    }
}
void run();
