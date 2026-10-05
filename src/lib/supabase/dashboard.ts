import { createSupabaseServerClient, createSupabaseServiceClient } from './server';
import type { AuthenticatedAppUser } from './auth';

export interface RestaurantDashboardContext {
  restaurant: {
    id: string;
    name: string;
    address: string | null;
    google_review_url: string | null;
    tip_enabled: boolean;
  } | null;
  subscription: {
    status: string;
    trial_ends_at: string | null;
    current_period_ends_at: string | null;
  } | null;
}

export async function getRestaurantDashboardContext(
  current: AuthenticatedAppUser
): Promise<RestaurantDashboardContext> {
  const restaurantId = current.profile.restaurant_id;
  if (!restaurantId) return { restaurant: null, subscription: null };

  const supabase = await createSupabaseServerClient();
  const dataClient = current.profile.role === 'server' ? createSupabaseServiceClient() : supabase;
  const [restaurantResult, subscriptionResult] = await Promise.all([
    dataClient.from('restaurants')
      .select('id,name,address,google_review_url,tip_enabled')
      .eq('id', restaurantId)
      .maybeSingle(),
    dataClient.from('subscriptions')
      .select('status,trial_ends_at,current_period_ends_at')
      .eq('restaurant_id', restaurantId)
      .maybeSingle()
  ]);
  if (restaurantResult.error) throw restaurantResult.error;
  if (subscriptionResult.error) throw subscriptionResult.error;

  return { restaurant: restaurantResult.data, subscription: subscriptionResult.data };
}

export function hasActiveDashboardAccess(
  subscription: RestaurantDashboardContext['subscription'],
  now = Date.now()
) {
  if (!subscription) return false;
  if (subscription.status === 'active') return true;
  return subscription.status === 'trialing' &&
    Boolean(subscription.trial_ends_at && new Date(subscription.trial_ends_at).getTime() > now);
}
