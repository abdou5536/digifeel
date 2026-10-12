import type { Metadata } from 'next';
import { TableBill } from '@/src/components/next/TableBill';

export const metadata: Metadata = {
  title: 'Votre addition · Digifeel',
  robots: { index: false, follow: false },
  referrer: 'no-referrer'
};

export default async function TablePage({ params }: { params: Promise<{ code: string }> }) {
  return <TableBill code={(await params).code} />;
}