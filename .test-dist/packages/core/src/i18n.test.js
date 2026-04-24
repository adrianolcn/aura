"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGroup = void 0;
const strict_1 = __importDefault(require("node:assert/strict"));
const i18n_js_1 = require("./i18n.js");
exports.testGroup = {
    name: 'i18n helpers',
    cases: [
        {
            name: 'falls back to pt-BR when locale is invalid',
            run: () => {
                strict_1.default.equal((0, i18n_js_1.normalizeLocale)('es-ES'), 'pt-BR');
            },
        },
        {
            name: 'translates supported keys in english',
            run: () => {
                strict_1.default.equal((0, i18n_js_1.translate)('en-US', 'nav.clients'), 'Clients');
            },
        },
        {
            name: 'interpolates translation parameters',
            run: () => {
                strict_1.default.equal((0, i18n_js_1.translate)('pt-BR', 'dashboard.actingAs', {
                    businessName: 'Studio',
                    tenantId: 'tenant-1',
                }), 'Operando como Studio • tenant tenant-1');
            },
        },
    ],
};
