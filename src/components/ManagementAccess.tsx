import React, { useState } from 'react';
import { LockKeyhole, ShieldCheck } from 'lucide-react';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: 'super_admin' | 'owner' | 'manager' | 'kitchen' | 'cashier' | 'viewer';
  restaurantId: string | null;
}

interface ManagementAccessProps {
  onAuthenticated: (user: AuthenticatedUser) => void;
  demoView: 'dashboard' | 'server';
  onDemo: (view: 'dashboard' | 'server') => void;
  error: string | null;
  onRetry: () => void;
  unavailable: boolean;
}

export const ManagementAccess: React.FC<ManagementAccessProps> = ({
  onAuthenticated,
  demoView,
  onDemo,
  error,
  onRetry,
  unavailable
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFormError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const result = await response.json() as { user?: AuthenticatedUser; error?: string };
      if (!response.ok || !result.user) {
        setFormError(result.error || 'Connexion impossible. Vérifiez vos informations et réessayez.');
        return;
      }
      onAuthenticated(result.user);
      setPassword('');
    } catch {
      setFormError('Le service de connexion est indisponible. Vérifiez votre réseau, puis réessayez.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="management-access" aria-labelledby="management-access-title">
      <section className="management-access__card">
        <div className="management-access__mark" aria-hidden="true">
          <ShieldCheck size={22} />
        </div>
        <p className="management-access__eyebrow">Espace sécurisé</p>
        <h1 id="management-access-title">Connexion à votre espace</h1>
        <p className="management-access__description">
          Connectez-vous pour accéder aux outils de gestion de votre établissement.
        </p>

        {unavailable ? (
          <div className="management-access__message" role="alert">
            <p>{error || 'Le service de connexion est indisponible.'}</p>
            <button type="button" onClick={onRetry}>Réessayer</button>
          </div>
        ) : (
          <form className="management-access__form" onSubmit={signIn}>
            <label htmlFor="management-email">Adresse e-mail</label>
            <input
              id="management-email"
              autoComplete="username"
              type="email"
              required
              maxLength={254}
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
            <label htmlFor="management-password">Mot de passe</label>
            <input
              id="management-password"
              autoComplete="current-password"
              type="password"
              required
              maxLength={128}
              value={password}
              onChange={event => setPassword(event.target.value)}
            />
            {(formError || error) && (
              <p className="management-access__error" role="alert">{formError || error}</p>
            )}
            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="management-access__spinner" aria-hidden="true" />
              ) : (
                <LockKeyhole size={16} aria-hidden="true" />
              )}
              <span>{isSubmitting ? 'Connexion…' : 'Se connecter'}</span>
            </button>
          </form>
        )}

        <div className="management-access__demo">
          <span>Vous découvrez Digifeel ?</span>
          <button type="button" onClick={() => onDemo(demoView)}>
            Explorer {demoView === 'server' ? 'l’espace serveur' : 'le tableau de bord'} en démo
          </button>
        </div>

        <p className="management-access__footnote">
          Session privée, protégée par un cookie sécurisé.
        </p>
      </section>
    </main>
  );
};
