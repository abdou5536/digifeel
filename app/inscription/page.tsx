import type { Metadata } from 'next';
import { RestaurantRegistration } from '@/src/components/next/RestaurantRegistration';

export const metadata: Metadata = {
  title: 'Inscription restaurant',
  description: 'Ouvrez votre espace de gestion Digifeel.'
};

export default function RestaurantRegistrationPage() {
  return <RestaurantRegistration />;
}
