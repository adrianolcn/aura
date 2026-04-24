import type { AppProps } from 'next/app';

export default function AuraLegacyApp({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} />;
}
