import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="next-account-layout">
      <section className="next-glass-card next-surface-card next-account-card">
        <span className="next-kicker">PAGE INTROUVABLE</span>
        <h1 className="next-page-heading">Ce lien ne mène nulle part.</h1>
        <p className="next-muted">Vérifiez l’adresse ou revenez à la présentation Digifeel.</p>
        <Link className="product-button" href="/">Retour à l’accueil</Link>
      </section>
    </main>
  );
}
