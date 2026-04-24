"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.toAppError = toAppError;
exports.toUserMessage = toUserMessage;
exports.logError = logError;
class AppError extends Error {
    code;
    userMessage;
    details;
    constructor(options) {
        super(options.message, {
            cause: options.cause,
        });
        this.name = 'AppError';
        this.code = options.code ?? 'unknown_error';
        this.userMessage = options.userMessage;
        this.details = options.details;
    }
}
exports.AppError = AppError;
function toAppError(reason, fallbackUserMessage = 'Não foi possível concluir a operação.', details) {
    if (reason instanceof AppError) {
        return reason;
    }
    if (reason instanceof Error) {
        return new AppError({
            message: reason.message,
            userMessage: fallbackUserMessage,
            details,
            cause: reason,
        });
    }
    return new AppError({
        message: 'Unexpected error',
        userMessage: fallbackUserMessage,
        details,
        cause: reason,
    });
}
function toUserMessage(reason, fallbackUserMessage = 'Não foi possível concluir a operação.') {
    return toAppError(reason, fallbackUserMessage).userMessage;
}
function logError(reason, context) {
    const error = toAppError(reason);
    console.error('[aura]', {
        code: error.code,
        message: error.message,
        userMessage: error.userMessage,
        details: error.details,
        context,
        cause: error.cause,
    });
    return error;
}
