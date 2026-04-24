"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testGroup = void 0;
const strict_1 = __importDefault(require("node:assert/strict"));
const errors_1 = require("./errors");
exports.testGroup = {
    name: 'error helpers',
    cases: [
        {
            name: 'preserves app errors',
            run: () => {
                const error = new errors_1.AppError({
                    code: 'validation_error',
                    message: 'Bad payload',
                    userMessage: 'Confira os campos obrigatórios.',
                });
                strict_1.default.equal((0, errors_1.toAppError)(error), error);
                strict_1.default.equal((0, errors_1.toUserMessage)(error), 'Confira os campos obrigatórios.');
            },
        },
        {
            name: 'wraps unexpected errors with a friendly message',
            run: () => {
                const wrapped = (0, errors_1.toAppError)(new Error('db exploded'), 'Falha amigável');
                strict_1.default.ok(wrapped instanceof errors_1.AppError);
                strict_1.default.equal(wrapped.userMessage, 'Falha amigável');
                strict_1.default.equal((0, errors_1.toUserMessage)(new Error('db exploded'), 'Falha amigável'), 'Falha amigável');
            },
        },
    ],
};
