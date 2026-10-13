import { redirect } from 'next/navigation';

// Les comptes sont ouverts uniquement par Digifeel : pas d'inscription publique.
export default function RestaurantRegistrationPage() {
  redirect('/login');
}
