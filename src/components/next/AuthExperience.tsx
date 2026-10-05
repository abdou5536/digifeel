'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/src/lib/supabase/client';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';

export function AuthExperience({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      if (!isSupabaseConfigured) throw new Error('La connexion sera disponible après configuration de Supabase dans .env.');
      const supabase = createSupabaseBrowserClient();
      if (isSignUp) {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name.trim() },
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`
          }
        });
        if (authError) throw authError;
        if (!data.session) {
          setMessage('Vérifiez votre boîte mail pour confirmer votre adresse, puis connectez-vous.');
        } else {
          router.push(nextPath);
          router.refresh();
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.push(nextPath);
        router.refresh();
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Connexion impossible. Réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="next-account-layout">
      <section className="next-glass-card next-surface-card next-account-card">
        <Link className="product-brand" href="/"><img src="/icons/icon.svg" alt="" />DIGIFEEL</Link>
        <div className="next-page-heading">
          <span className="next-kicker">{isSignUp ? 'NOUVEAU RESTAURANT' : 'ESPACE RESTAURATEUR'}</span>
          <h1>{isSignUp ? 'Créer un compte.' : 'Content de vous revoir.'}</h1>
          <p>{isSignUp ? 'Créez votre accès, puis configurez la caisse de votre restaurant.' : 'Connectez-vous pour ouvrir la caisse de votre restaurant.'}</p>
        </div>
        <form className="next-form" onSubmit={submit}>
          {isSignUp && <label>Votre nom<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} autoComplete="name" /></label>}
          <label>Adresse e-mail<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>Mot de passe<input required type="password" minLength={8} autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={event => setPassword(event.target.value)} /></label>
          {error && <p className="next-error" role="alert">{error}</p>}
          {message && <p className="next-success" role="status">{message}</p>}
          <button className="product-button product-button--full" type="submit" disabled={submitting}>{submitting ? 'Un instant…' : isSignUp ? 'Créer mon compte' : 'Me connecter'}</button>
        </form>
        <p className="next-muted">{isSignUp ? 'Vous avez déjà un compte ?' : 'Vous découvrez Digifeel ?'}{' '}
          <button className="next-link next-switch-button" type="button" onClick={() => { setIsSignUp(value => !value); setError(''); setMessage(''); }}>
            {isSignUp ? 'Se connecter' : 'Créer un compte'}
          </button>
        </p>
        <Link className="next-link" href="/">Retour au site</Link>
      </section>
    </div>
  );
}
