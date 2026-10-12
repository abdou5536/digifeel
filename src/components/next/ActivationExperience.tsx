'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';

export function ActivationExperience({ chipId }: { chipId: string }) {
  const router = useRouter();
  const [activationCode, setActivationCode] = useState('');
  const [name, setName] = useState('');
  const [googleReviewUrl, setGoogleReviewUrl] = useState('');
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!isSupabaseConfigured) {
      setError('L’activation sera disponible après configuration de Supabase.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/chips/activate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chipId, activationCode, name, googleReviewUrl, address })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Cette puce n’a pas pu être activée.');
      router.push('/dashboard');
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Activation impossible.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="next-account-layout">
      <section className="next-glass-card next-surface-card next-account-card">
        <Link className="product-brand" href="/"><img src="/icons/icon.svg" alt="" />DIGIFEEL</Link>
        <div className="next-page-heading">
          <span className="next-kicker">INSTALLATION GUIDÉE</span>
          <h1>Activez votre puce.</h1>
          <p>Il vous faut le code fourni avec la puce et le lien officiel des avis Google de votre restaurant.</p>
        </div>
        <form className="next-form" onSubmit={submit}>
          <label>Code d’activation<input required minLength={24} maxLength={40} autoComplete="one-time-code" value={activationCode} onChange={event => setActivationCode(event.target.value.toUpperCase())} /></label>
          <label>Nom du restaurant<input required minLength={2} maxLength={120} value={name} onChange={event => setName(event.target.value)} /></label>
          <label>Lien d’avis Google<input required type="url" inputMode="url" placeholder="https://g.page/r/…" value={googleReviewUrl} onChange={event => setGoogleReviewUrl(event.target.value)} /></label>
          <label>Adresse (facultatif)<input maxLength={200} value={address} onChange={event => setAddress(event.target.value)} /></label>
          {error && <p className="next-error" role="alert">{error} {error.includes('Connectez-vous') && <Link className="next-link" href={`/login?next=${encodeURIComponent(`/activate/${chipId}`)}`}>Se connecter</Link>}</p>}
          <button className="product-button product-button--full" type="submit" disabled={submitting}>{submitting ? 'Activation…' : 'Activer ma puce'}</button>
        </form>
      </section>
    </div>
  );
}
