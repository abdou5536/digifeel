'use client';

import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/src/lib/supabase/client';

interface ReturnSession {
  access_token: string;
  refresh_token: string;
  restaurantName: string;
}

/** Bannière affichée quand le super-admin est actuellement « entré » dans un restaurant, pour revenir en un clic. */
export function ImpersonationBanner() {
  const [session, setSession] = useState<ReturnSession | null>(null);
  const [returning, setReturning] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('digifeel_admin_return');
      if (raw) setSession(JSON.parse(raw));
    } catch {
      // Stockage indisponible : pas de bannière.
    }
  }, []);

  if (!session) return null;

  const returnToAdmin = async () => {
    setReturning(true);
    try {
      const { error } = await createSupabaseBrowserClient().auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      });
      sessionStorage.removeItem('digifeel_admin_return');
      if (error) throw error;
      window.location.href = '/admin';
    } catch {
      sessionStorage.removeItem('digifeel_admin_return');
      window.location.href = '/login?next=/admin';
    }
  };

  return (
    <div className="next-impersonation-banner" role="status">
      <span>Connecté en tant que « {session.restaurantName} »</span>
      <button type="button" disabled={returning} onClick={() => void returnToAdmin()}>{returning ? 'Retour…' : 'Revenir en super-admin'}</button>
    </div>
  );
}
