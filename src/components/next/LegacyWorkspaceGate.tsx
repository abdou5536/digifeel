'use client';

import { Component, Suspense, type ErrorInfo, type ReactNode } from 'react';

interface State { failed: boolean }

/** Protège les écrans annexes : une erreur d'affichage ne doit pas faire tomber toute l'application. */
class Boundary extends Component<{ children: ReactNode }, State> {
  state: State = { failed: false };
  static getDerivedStateFromError(): State { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error('Erreur dans l’espace restaurant', error, info.componentStack); }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="workspace-panel" style={{ margin: '2rem auto', maxWidth: 560, padding: '1.5rem' }}>
        <h2>Cet écran est momentanément indisponible</h2>
        <p>Une erreur est survenue lors de l’affichage. Vos données n’ont pas été modifiées.</p>
        <button type="button" className="product-button product-button--small" onClick={() => this.setState({ failed: false })}>Réessayer</button>
      </div>
    );
  }
}

export function LegacyWorkspaceGate({ children }: { children: ReactNode }) {
  return (
    <Boundary>
      <Suspense fallback={<p role="status" style={{ padding: '2rem', textAlign: 'center' }}>Chargement…</p>}>{children}</Suspense>
    </Boundary>
  );
}