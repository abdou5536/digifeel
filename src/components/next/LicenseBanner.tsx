import { getAuthenticatedAppUser } from '@/src/lib/supabase/auth';
import { getRestaurantDashboardContext } from '@/src/lib/supabase/dashboard';

const DAY = 86_400_000;

export async function LicenseBanner() {
  const current = await getAuthenticatedAppUser();
  if (!current || !['restaurant_admin', 'server'].includes(current.profile.role)) return null;
  const { subscription } = await getRestaurantDashboardContext(current);
  if (!subscription || subscription.status === 'active') return null;

  const now = Date.now();
  const end = subscription.status === 'trialing' ? subscription.trial_ends_at : subscription.current_period_ends_at;
  const daysLeft = end ? Math.ceil((new Date(end).getTime() - now) / DAY) : 0;
  const manager = current.profile.role === 'restaurant_admin';
  const renew = manager ? 'Renouvelez depuis votre espace.' : 'Prévenez le responsable.';

  if (subscription.status === 'trialing' && daysLeft > 7) return null;
  const expired = daysLeft <= 0;
  const text = subscription.status === 'trialing'
    ? expired ? `Votre mois offert est terminé : l’encaissement est bloqué. ${renew}`
      : `Mois offert : il reste ${daysLeft} jour${daysLeft > 1 ? 's' : ''}. ${renew}`
    : `Abonnement ${subscription.status === 'past_due' ? 'en retard de paiement' : 'inactif'}. ${renew}`;

  return <p className={`pos-license pos-license--${expired ? 'expired' : 'soon'}`} role="status">{text}</p>;
}
