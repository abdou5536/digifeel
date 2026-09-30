import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export const ConnectionStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const updateStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (isOnline) return null;

  return (
    <p
      className="flex items-center justify-center gap-2 border-b border-amber-300/40 bg-amber-950/60 px-4 py-2 text-center text-sm text-amber-100"
      role="status"
      aria-live="polite"
    >
      <WifiOff aria-hidden="true" className="h-4 w-4 shrink-0" />
      <span>Hors connexion : les données restent sur cet appareil.</span>
    </p>
  );
};
