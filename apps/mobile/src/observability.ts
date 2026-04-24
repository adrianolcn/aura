import { captureError, configureObservability } from '@aura/core';

let initialized = false;

export function initializeMobileObservability() {
  if (initialized) {
    return;
  }

  initialized = true;

  configureObservability({
    app: 'mobile',
    enabled: process.env.EXPO_PUBLIC_OBSERVABILITY_ENABLED === 'true',
    provider:
      process.env.EXPO_PUBLIC_OBSERVABILITY_PROVIDER === 'sentry'
        ? 'sentry'
        : 'http',
    endpoint: process.env.EXPO_PUBLIC_OBSERVABILITY_ENDPOINT,
    sentryDsn: process.env.EXPO_PUBLIC_OBSERVABILITY_SENTRY_DSN,
    environment: process.env.EXPO_PUBLIC_APP_ENV ?? 'local',
    release: process.env.EXPO_PUBLIC_RELEASE_VERSION ?? 'dev',
  });

  const errorUtils = (
    globalThis as {
      ErrorUtils?: {
        getGlobalHandler?: () => (error: Error, isFatal?: boolean) => void;
        setGlobalHandler?: (handler: (error: Error, isFatal?: boolean) => void) => void;
      };
    }
  ).ErrorUtils;

  if (!errorUtils?.setGlobalHandler) {
    return;
  }

  const previousHandler = errorUtils.getGlobalHandler?.();

  errorUtils.setGlobalHandler((error, isFatal) => {
    void captureError(error, {
      isFatal,
      surface: 'mobile-global-handler',
    });

    previousHandler?.(error, isFatal);
  });
}
