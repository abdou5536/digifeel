import type { Metadata } from 'next';
import { Landing } from '@/src/components/landing/Landing';

export const metadata: Metadata = {
  title: 'Digifeel : plus d’avis Google pour votre restaurant',
  description: 'Une puce NFC sur la table, et vos clients satisfaits publient leur avis sur votre fiche Google.'
};

export default function HomePage() {
  return <Landing />;
}
