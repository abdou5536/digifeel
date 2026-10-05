import type { Metadata } from 'next';
import { TableBill } from '@/src/components/next/TableBill';

export const metadata: Metadata = {
  title: 'Votre table · Digifeel',
  description: 'Consultez votre addition et partagez votre avis.',
  robots: { index: false, follow: false }
};

export default async function GuestTablePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <TableBill code={code} />;
}
