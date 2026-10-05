'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { Check, Copy, Radio, Star } from 'lucide-react';
import { isSupabaseConfigured } from '@/src/lib/supabase/config';

interface PublicChip {
  restaurant: { name: string; googleReviewUrl: string; tipEnabled: boolean };
  servers: Array<{ id: string; name: string }>;
}

interface PublicReviewExperienceProps {
  chipId: string;
}

export function PublicReviewExperience({ chipId }: PublicReviewExperienceProps) {
  const [chip, setChip] = useState<PublicChip | null>(null);
  const [error, setError] = useState('');
  const [activationRequired, setActivationRequired] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [serverId, setServerId] = useState('');
  const [tipEuros, setTipEuros] = useState(0);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!isSupabaseConfigured) {
      setError('La page de scan sera disponible après configuration de Supabase.');
      setLoading(false);
      return () => { alive = false; };
    }
    const loadChip = async () => {
      try {
        const response = await fetch(`/api/public/chips/${encodeURIComponent(chipId)}`);
        const result = await response.json();
        if (!response.ok || result.state !== 'ready') {
          if (result.state === 'inactive') setActivationRequired(true);
          throw new Error(result.error || 'La puce n’a pas pu être chargée.');
        }
        if (!alive) return;
        setChip(result);

        const deviceId = getDeviceId();
        const scan = await fetch('/api/public/scan', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ chipId, deviceId })
        });
        if (!scan.ok && scan.status !== 429) {
          const scanResult = await scan.json();
          throw new Error(scanResult.error || 'Le scan n’a pas pu être enregistré.');
        }
      } catch (loadError) {
        if (alive) setError(loadError instanceof Error ? loadError.message : 'Le service est momentanément indisponible.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    void loadChip();
    return () => { alive = false; };
  }, [chipId]);

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!stars) {
      setError('Choisissez une note pour continuer.');
      return;
    }
    setError('');
    setSending(true);
    try {
      const response = await fetch('/api/public/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          chipId,
          stars,
          comment,
          serverId: serverId || null,
          tipAmountMinor: Math.round(tipEuros * 100),
          deviceId: getDeviceId()
        })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Votre avis n’a pas pu être enregistré.');
      setChip(current => current ? {
        ...current,
        restaurant: { ...current.restaurant, googleReviewUrl: result.google_review_url }
      } : current);
      setSubmitted(true);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Votre avis n’a pas pu être enregistré.');
    } finally {
      setSending(false);
    }
  };

  const copyComment = async () => {
    try {
      await navigator.clipboard.writeText(comment);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('La copie automatique n’est pas disponible sur cet appareil.');
    }
  };

  return (
    <div className="next-account-layout">
      <section className="next-glass-card next-surface-card next-account-card" aria-live="polite">
        <Link className="product-brand" href="/"><img src="/icons/icon.svg" alt="" />DIGIFEEL</Link>
        {loading ? (
          <p className="next-muted" role="status">Chargement de la page du restaurant…</p>
        ) : error && !chip ? (
          <div className="next-review-done">
            <span className="next-demo-nfc"><Radio aria-hidden="true" /></span>
            <h1>{activationRequired ? 'Cette puce doit être activée.' : 'Cette puce n’est pas disponible.'}</h1>
            <p className="next-muted">{error}</p>
            {activationRequired
              ? <Link className="product-button" href={`/activate/${encodeURIComponent(chipId)}`}>Activer cette puce</Link>
              : <p className="next-muted">Votre téléphone et vos données sont en sécurité. Demandez au restaurant de vérifier sa puce.</p>}
          </div>
        ) : submitted && chip ? (
          <div className="next-review-done">
            <Check className="next-review-done__check" aria-hidden="true" size={36} />
            <h1>Merci pour votre retour.</h1>
            <p className="next-muted">Votre avis est enregistré pour {chip.restaurant.name}.</p>
            {comment && <button className="product-button product-button--secondary" type="button" onClick={copyComment}><Copy aria-hidden="true" />{copied ? 'Commentaire copié' : 'Copier mon commentaire'}</button>}
            <a className="product-button" href={chip.restaurant.googleReviewUrl} target="_blank" rel="noreferrer">Publier sur Google</a>
            <p className="next-muted">Vous pouvez aussi fermer cette page.</p>
          </div>
        ) : chip ? (
          <>
            <span className="next-kicker">VOTRE RETOUR COMPTE</span>
            <h1>{chip.restaurant.name}</h1>
            <p className="next-muted">Comment s’est passé votre repas ? Votre avis sera partagé avec le restaurant.</p>
            <form className="next-form" onSubmit={submitReview}>
              <fieldset className="next-form">
                <legend>Votre note</legend>
                <div className="next-stars">
                  {[1, 2, 3, 4, 5].map(value => (
                    <button key={value} type="button" aria-label={`${value} ${value === 1 ? 'étoile' : 'étoiles'}`} aria-pressed={stars === value} onClick={() => { setStars(value); setError(''); }}>
                      <Star fill={stars >= value ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                  ))}
                </div>
              </fieldset>
              <label>Un commentaire (facultatif)
                <textarea maxLength={2000} value={comment} onChange={event => setComment(event.target.value)} placeholder="Un plat, un service, un moment que vous avez apprécié…" />
              </label>
              {chip.servers.length > 0 && (
                <label>Votre serveur (facultatif)
                  <select value={serverId} onChange={event => setServerId(event.target.value)}>
                    <option value="">Je ne sais pas / Je préfère ne pas répondre</option>
                    {chip.servers.map(server => <option key={server.id} value={server.id}>{server.name}</option>)}
                  </select>
                </label>
              )}
              {chip.restaurant.tipEnabled && (
                <label>Ajouter un pourboire (non encaissé en mode démo)
                  <select value={tipEuros} onChange={event => setTipEuros(Number(event.target.value))}>
                    <option value={0}>Pas de pourboire</option>
                    <option value={1}>1 €</option>
                    <option value={2}>2 €</option>
                    <option value={5}>5 €</option>
                  </select>
                </label>
              )}
              {error && <p className="next-error" role="alert">{error}</p>}
              <button className="product-button product-button--full" type="submit" disabled={sending}>{sending ? 'Enregistrement…' : 'Continuer'}</button>
              <p className="next-muted">Le lien Google est proposé à tous les clients, quelle que soit leur note.</p>
            </form>
          </>
        ) : null}
      </section>
    </div>
  );
}

function getDeviceId() {
  const key = 'digifeel-device-id';
  let deviceId = window.localStorage.getItem(key);
  if (!deviceId) {
    deviceId = window.crypto.randomUUID();
    window.localStorage.setItem(key, deviceId);
  }
  return deviceId;
}
