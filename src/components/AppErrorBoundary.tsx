import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Erreur lors de l’affichage de la page.', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100"
          role="alert"
          aria-live="assertive"
        >
          <div className="max-w-md space-y-4 text-center">
            <h1 className="text-2xl font-bold">Cette page n’a pas pu s’afficher.</h1>
            <p>Rechargez la page. Si le problème continue, réessayez plus tard.</p>
            <button
              type="button"
              className="rounded-xl bg-amber-500 px-5 py-3 font-semibold text-slate-950"
              onClick={() => window.location.reload()}
            >
              Recharger la page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
