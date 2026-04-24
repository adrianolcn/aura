export type AppErrorCode =
  | 'auth_required'
  | 'forbidden'
  | 'not_found'
  | 'validation_error'
  | 'storage_error'
  | 'database_error'
  | 'network_error'
  | 'unknown_error';

export class AppError extends Error {
  code: AppErrorCode;
  userMessage: string;
  details?: Record<string, unknown>;

  constructor(options: {
    message: string;
    userMessage: string;
    code?: AppErrorCode;
    details?: Record<string, unknown>;
    cause?: unknown;
  }) {
    super(options.message, {
      cause: options.cause,
    });
    this.name = 'AppError';
    this.code = options.code ?? 'unknown_error';
    this.userMessage = options.userMessage;
    this.details = options.details;
  }
}

export function toAppError(
  reason: unknown,
  fallbackUserMessage = 'Não foi possível concluir a operação.',
  details?: Record<string, unknown>,
) {
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

export function toUserMessage(
  reason: unknown,
  fallbackUserMessage = 'Não foi possível concluir a operação.',
) {
  return toAppError(reason, fallbackUserMessage).userMessage;
}

export function logError(reason: unknown, context?: Record<string, unknown>) {
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
