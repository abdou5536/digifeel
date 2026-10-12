import type { Metadata } from 'next';
import { Landing } from '@/src/components/landing/Landing';

export const metadata: Metadata = {
  title: 'Digifeel : caisse, avis Google et gestion complète de votre restaurant',
  description: 'Caisse encaissement avec annulation sécurisée, rapports PDF/Excel, avis Google automatisés par puce NFC et pilotage multi-établissements : Digifeel réunit tout votre restaurant dans un seul logiciel.'
};

export default function HomePage() {
  return <Landing />;
}
