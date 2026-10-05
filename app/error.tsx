'use client';

import Link from 'next/link';

export default function ApplicationError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="next-account-layout">
      <section className="next-glass-card next-surface-card next-account-card">
        <span className="next-kicker">INCIDENT TEMPORAIRE</span>
        <h1 className="next-page-heading">La page n’a pas pu charger.</h1>
        <p className="next-muted">Réessayez dans un instant. Vos informations restent protégées.</p>
        <div className="next-nav__actions">
          <button className="product-button" type="button" onClick={reset}>Réessayer</button>
          <Link className="product-button product-button--secondary" href="/">Accueil</Link>
        </div>
      </section>
    </main>
  );
}
