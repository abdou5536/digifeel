import type { Metadata } from 'next';
import { ResellerPortal } from '@/src/components/next/ResellerPortal';

export const metadata: Metadata = {
  title: 'Espace revendeur | Digifeel',
  description: 'Suivi de vos restaurants partenaires et de vos commissions Digifeel.'
};

export default function ResellerPage() {
  return <ResellerPortal />;
}
