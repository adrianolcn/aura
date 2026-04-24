import type { NextPageContext } from 'next';

type AuraErrorPageProps = {
  statusCode?: number;
};

export default function AuraErrorPage({ statusCode }: AuraErrorPageProps) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: '#f5f5f4',
        color: '#1c1917',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <p style={{ fontSize: '0.875rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          AURA
        </p>
        <h1 style={{ fontSize: '2rem', marginTop: '1rem' }}>
          {statusCode ? `Erro ${statusCode}` : 'Erro inesperado'}
        </h1>
      </div>
    </main>
  );
}

AuraErrorPage.getInitialProps = ({ res, err }: NextPageContext): AuraErrorPageProps => ({
  statusCode: res?.statusCode ?? err?.statusCode ?? 500,
});
