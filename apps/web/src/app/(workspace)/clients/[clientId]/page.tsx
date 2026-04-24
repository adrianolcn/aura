import { ClientDetailScreen } from '@/features/client-detail-screen';

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;

  return <ClientDetailScreen clientId={clientId} />;
}
