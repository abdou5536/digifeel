'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function PwaInstallButton() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [message, setMessage] = useState('');
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const beforeInstall = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as InstallPromptEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setPromptEvent(null);
      setMessage('');
    };
    window.addEventListener('beforeinstallprompt', beforeInstall);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', beforeInstall);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const install = async () => {
    if (!promptEvent) {
      setMessage('Dans le menu du navigateur, choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».');
      return;
    }
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);
    if (choice.outcome === 'accepted') setMessage('Installation en cours.');
  };

  if (installed) return null;
  return <div className="workspace-install-wrap">
    <button type="button" className="workspace-install-button" onClick={() => void install()}><Download size={15} />Installer</button>
    {message && <span className="workspace-install-message" role="status">{message}</span>}
  </div>;
}
