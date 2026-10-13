'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/src/lib/supabase/client';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';

const highlights = [
  { icon: '🧾', title: 'Caisse & tickets', text: 'Encaissez, imprimez et clôturez en quelques gestes.' },
  { icon: '📱', title: 'QR & puces NFC', text: 'Vos clients commandent et laissent un avis depuis leur table.' },
  { icon: '📊', title: 'Gestion en direct', text: 'Ventes, serveurs, pourboires et exports comptables.' },
];

export function AuthExperience({ nextPath, initialSuperAdmin = false, setupPassword = false, linkError = false }: { nextPath: string; initialSuperAdmin?: boolean; setupPassword?: boolean; linkError?: boolean }) {
  const router = useRouter();
  const [superAdmin, setSuperAdmin] = useState(initialSuperAdmin);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [error, setError] = useState(linkError ? 'Ce lien est invalide ou a expiré. Demandez un nouveau lien ci-dessous.' : '');
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
      if (resetMode) {
        const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/login?setup=1')}`;
        await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
        setMessage('Si cette adresse est connue, un e-mail de réinitialisation vient d’être envoyé. Pensez à vérifier vos spams.');
        return;
      }
      if (setupPassword) {
        if (newPassword.length < 8 || newPassword.length > 72) throw new Error('Le mot de passe doit contenir entre 8 et 72 caractères.');
        if (newPassword !== confirmPassword) throw new Error('Les deux mots de passe ne correspondent pas.');
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
        if (updateError) throw new Error('Le mot de passe n’a pas pu être défini. Le lien est peut-être expiré.');
        router.push(nextPath);
        router.refresh();
        return;
      }
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

  const heading = setupPassword ? 'Sécurisez votre espace.' : resetMode ? 'Mot de passe oublié ?' : 'Content de vous revoir.';
  const subheading = setupPassword
    ? 'Choisissez un mot de passe personnel pour activer votre compte.'
    : resetMode
      ? 'Saisissez votre e-mail : nous vous envoyons un lien pour en choisir un nouveau.'
      : superAdmin
        ? 'Connectez-vous pour créer et gérer les restaurants.'
        : 'Connectez-vous pour retrouver votre caisse et votre gestion.';

  return (
    <div className="next-account-layout next-auth-split">
      <aside className="next-auth-aside" aria-hidden="true">
        <Link className="product-brand" href="/" tabIndex={-1}><img src="/icons/icon.svg" alt="" />DIGIFEEL</Link>
        <h2>Le logiciel de votre restaurant, simple et complet.</h2>
        <ul>
          {highlights.map(item => <li key={item.title}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.text}</small></div></li>)}
        </ul>
        <p className="next-auth-aside__note">Accès sécurisé · Données chiffrées · Support Digifeel</p>
      </aside>
      <section className="next-glass-card next-surface-card next-account-card next-auth-card">
        <Link className="product-brand next-auth-card__brand" href="/"><img src="/icons/icon.svg" alt="" />DIGIFEEL</Link>
        <div className="next-page-heading">
          <span className="next-kicker">{superAdmin ? 'SUPER-ADMIN' : 'ESPACE RESTAURANT'}</span>
          <h1>{heading}</h1>
          <p>{subheading}</p>
        </div>
        <form className="next-form" onSubmit={submit}>
          {setupPassword ? <>
            <label>Nouveau mot de passe<input required type="password" minLength={8} maxLength={72} autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
            <label>Confirmer le mot de passe<input required type="password" minLength={8} maxLength={72} autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
          </> : <>
            <label>Adresse e-mail<input required type="email" autoComplete="email" autoFocus placeholder="vous@restaurant.fr" value={email} onChange={event => setEmail(event.target.value)} /></label>
            {!resetMode && <label>Mot de passe
              <span className="next-password-field">
                <input aria-label="Mot de passe" required type={showPassword ? 'text' : 'password'} minLength={8} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
                <button type="button" className="next-password-toggle" aria-pressed={showPassword} onClick={() => setShowPassword(value => !value)}>{showPassword ? 'Masquer' : 'Afficher'}</button>
              </span>
            </label>}
            {!resetMode && <label className="next-checkbox-label"><input type="checkbox" checked={superAdmin} onChange={event => setSuperAdmin(event.target.checked)} />Je suis le super-admin Digifeel</label>}
          </>}
          {error && <p className="next-error" role="alert">{error}</p>}
          {message && <p className="next-success" role="status">{message}</p>}
          <button className="product-button product-button--full" type="submit" disabled={submitting}>{submitting ? 'Un instant…' : setupPassword ? 'Définir mon mot de passe' : resetMode ? 'Envoyer le lien' : 'Me connecter'}</button>
        </form>
        {!setupPassword && <button type="button" className="next-link next-auth-switch" onClick={() => { setResetMode(value => !value); setError(''); setMessage(''); }}>{resetMode ? '← Retour à la connexion' : 'Mot de passe oublié ?'}</button>}
        {!setupPassword && !resetMode && <p className="next-muted">Pas encore d’accès ? Contactez Digifeel pour ouvrir votre espace.</p>}
        <Link className="next-link" href="/">Retour au site</Link>
      </section>
    </div>
  );
}
