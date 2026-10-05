import React, { useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';
import type { AuthenticatedUser } from './ManagementAccess';

export const AccountSetupPage: React.FC<{
  token: string;
  onAuthenticated: (user: AuthenticatedUser) => void;
}> = ({ token, onAuthenticated }) => {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const acceptInvitation = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (password !== confirmation) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/accept-invitation', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      });
      const result = await response.json() as { user?: AuthenticatedUser; error?: string };
      if (!response.ok || !result.user) {
        setError(result.error || 'Ce lien ne permet pas de créer votre accès.');
        return;
      }
      onAuthenticated(result.user);
    } catch (requestError) {
      console.error('L’activation du compte a échoué.', requestError);
      setError('Le service est indisponible. Vérifiez votre connexion puis réessayez.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="management-access" aria-labelledby="account-setup-title">
      <section className="management-access__card">
        <div className="management-access__mark" aria-hidden="true"><ShieldCheck size={22} /></div>
        <p className="management-access__eyebrow">Bienvenue sur Digifeel</p>
        <h1 id="account-setup-title">Créez votre mot de passe</h1>
        <p className="management-access__description">Il vous servira à retrouver les scans et les avis de votre établissement.</p>
        <form className="management-access__form" onSubmit={event => void acceptInvitation(event)}>
          <label htmlFor="setup-password">Mot de passe (14 caractères minimum)</label>
          <input id="setup-password" autoComplete="new-password" type="password" minLength={14} maxLength={128} required value={password} onChange={event => setPassword(event.target.value)} />
          <label htmlFor="setup-confirmation">Confirmer le mot de passe</label>
          <input id="setup-confirmation" autoComplete="new-password" type="password" minLength={14} maxLength={128} required value={confirmation} onChange={event => setConfirmation(event.target.value)} />
          {error && <p className="management-access__error" role="alert">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? <span className="management-access__spinner" aria-hidden="true" /> : <LockKeyhole size={16} aria-hidden="true" />}
            <span>{busy ? 'Activation…' : 'Activer mon espace'}</span>
          </button>
        </form>
        <p className="management-access__footnote">Le lien d’invitation ne peut être utilisé qu’une fois.</p>
      </section>
    </main>
  );
};
