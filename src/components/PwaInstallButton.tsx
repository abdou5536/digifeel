import React, { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export const PwaInstallButton: React.FC = () => {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [message, setMessage] = useState('');
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches
      || ('standalone' in navigator && Boolean(navigator.standalone))
  );
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
      setMessage('Application installée.');
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const canInstall = Boolean(installPrompt) || !isInstalled;
  if (isInstalled || (!canInstall && !message)) return null;

  const handleInstall = async () => {
    if (!installPrompt) {
      setMessage(
        isIOS
          ? 'Dans Safari, touchez Partager, puis « Sur l’écran d’accueil ».'
          : 'Dans le menu du navigateur, choisissez « Installer » ou « Ajouter à l’écran d’accueil ».'
      );
      return;
    }

    try {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setIsInstalled(true);
        setMessage('Application installée.');
      } else {
        setMessage('Installation annulée.');
      }
      setInstallPrompt(null);
    } catch {
      setMessage('Installation indisponible pour le moment.');
      setInstallPrompt(null);
    }
  };

  return (
    <div className="flex flex-col items-end">
      {canInstall && (
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-bold text-slate-200 transition-colors hover:bg-white/10"
          aria-label="Installer Digifeel sur cet appareil"
        >
          <Download aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Installer</span>
        </button>
      )}
      {message && (
        <p className="max-w-56 text-right text-xs text-slate-200" role="status" aria-live="polite">
          {message}
        </p>
      )}
    </div>
  );
};
