'use client';

import { useEffect, type PropsWithChildren } from 'react';

import { captureError, configureObservability } from '@aura/core';

export function ObservabilityProvider({ children }: PropsWithChildren) {
  useEffect(() => {
    configureObservability({
      app: 'web',
      enabled: process.env.NEXT_PUBLIC_OBSERVABILITY_ENABLED === 'true',
      provider:
        process.env.NEXT_PUBLIC_OBSERVABILITY_PROVIDER === 'sentry'
          ? 'sentry'
          : 'http',
      endpoint: process.env.NEXT_PUBLIC_OBSERVABILITY_ENDPOINT,
      authToken: process.env.NEXT_PUBLIC_OBSERVABILITY_AUTH_TOKEN,
      sentryDsn: process.env.NEXT_PUBLIC_OBSERVABILITY_SENTRY_DSN,
      environment: process.env.NEXT_PUBLIC_APP_ENV ?? 'local',
      release: process.env.NEXT_PUBLIC_RELEASE_VERSION ?? 'dev',
    });

    const handleError = (event: ErrorEvent) => {
      void captureError(event.error ?? new Error(event.message), {
        surface: 'web-window-error',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      void captureError(event.reason, {
        surface: 'web-unhandled-rejection',
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return children;
}
