'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/src/lib/supabase/client';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';

export function AuthExperience({ nextPath, initialSuperAdmin = false }: { nextPath: string; initialSuperAdmin?: boolean }) {
  const router = useRouter();
  const [superAdmin, setSuperAdmin] = useState(initialSuperAdmin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (!isSupabaseConfigured) throw new Error('La connexion sera disponible après configuration de Supabase dans .env.');
      const supabase = createSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw new Error('E-mail ou mot de passe incorrect.');
      const { data: profile } = await supabase.from('app_users').select('role').eq('id', data.user.id).maybeSingle();
      const role = profile?.role as string | undefined;
      if (superAdmin && role !== 'super_admin') {
        await supabase.auth.signOut();
        throw new Error("Ce compte n'est pas un compte super-admin.");
      }
      const target = role === 'super_admin' && (superAdmin || nextPath === '/caisse') ? '/admin' : nextPath;
      router.push(target);
      router.refresh();
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
          <span className="next-kicker">{superAdmin ? 'SUPER-ADMIN' : 'ESPACE RESTAURANT'}</span>
          <h1>Content de vous revoir.</h1>
          <p>{superAdmin ? 'Connectez-vous pour créer et gérer les restaurants.' : 'Connectez-vous avec les identifiants fournis par Digifeel.'}</p>
        </div>
        <form className="next-form" onSubmit={submit}>
          <label>Adresse e-mail<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} /></label>
          <label>Mot de passe<input required type="password" minLength={8} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, flexDirection: 'row' }}><input type="checkbox" checked={superAdmin} onChange={event => setSuperAdmin(event.target.checked)} style={{ width: 20, height: 20 }} />Je suis le super-admin Digifeel</label>
          {error && <p className="next-error" role="alert">{error}</p>}
          {message && <p className="next-success" role="status">{message}</p>}
          <button className="product-button product-button--full" type="submit" disabled={submitting}>{submitting ? 'Un instant…' : 'Me connecter'}</button>
        </form>
        <p className="next-muted">Pas encore d’accès ? Contactez Digifeel pour ouvrir votre espace.</p>
        <Link className="next-link" href="/">Retour au site</Link>
      </section>
    </div>
  );
}
