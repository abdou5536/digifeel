import React, { useCallback, useEffect, useState } from 'react';
import { Download, FileSpreadsheet, FileText, Plus, RefreshCw, Save, ShieldCheck, Users } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { INSTALLATION_PACKS, PRODUCT_PRICING } from '../config/product';
import { ScanTargetManager } from './ScanTargetManager';

type Analytics = {
  days: number;
  scans: number;
  reviewCount: number;
  averageRating: number;
  activity: Array<{ day: string; scans: number }>;
  reviews: Array<{ id: string; rating: number; comment: string; waiter_id: string | null; created_at: string }>;
};

type Staff = { id: string; name: string; role: string; assigned_tables: number[]; status: 'active' | 'disabled' };
type ManualDetails = {
  accountName: string; ccpNumber: string; ccpKey: string; baridimobRip: string; phone: string; exchangeRate: number | null;
};
type PaymentTransaction = {
  id: string; transaction_type: string; status: string; amount_minor: number; currency: string;
  description: string; created_at: string; provider_reference: string | null;
};

const errorMessage = async (response: Response): Promise<string> => {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || `La requête a échoué (${response.status}).`;
};

const LiveManagerWorkspace: React.FC = () => {
  const { restaurant, updateRestaurant, hydrateWaiters, waiters } = useApp();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [days, setDays] = useState<7 | 30>(7);
  const [dashboardLocked, setDashboardLocked] = useState(false);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState('Serveur');
  const [googleUrl, setGoogleUrl] = useState(restaurant.googleReviewUrl);
  const [name, setName] = useState(restaurant.name);
  const [tipEnabled, setTipEnabled] = useState(restaurant.tipEnabled || false);
  const [billingDetails, setBillingDetails] = useState<ManualDetails | null>(null);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [selectedPack, setSelectedPack] = useState<string>(INSTALLATION_PACKS[0].id);
  const [manualTransactionType, setManualTransactionType] = useState<'installation' | 'subscription'>('installation');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [message, setMessage] = useState(() => {
    const payment = new URLSearchParams(window.location.search).get('payment');
    return payment === 'processing'
      ? 'Paiement reçu par Stripe. Le statut sera confirmé après traitement du webhook.'
      : payment === 'cancelled' ? 'Paiement annulé. Aucun statut n’a été modifié.' : '';
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const loadAnalytics = useCallback(async () => {
    setError('');
    try {
      const response = await fetch(`/api/manager/analytics?days=${days}`, { credentials: 'same-origin', cache: 'no-store' });
      if (response.status === 402) {
        setDashboardLocked(true);
        setAnalytics(null);
        return;
      }
      if (!response.ok) throw new Error(await errorMessage(response));
      setDashboardLocked(false);
      setAnalytics(await response.json() as Analytics);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Les statistiques ne sont pas disponibles.');
    }
  }, [days]);

  const loadTeam = useCallback(async () => {
    try {
      const response = await fetch('/api/manager/team', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json() as { staff: Staff[] };
      setStaff(result.staff);
      hydrateWaiters(result.staff.filter(person => person.status === 'active').map(person => ({
        id: person.id, name: person.name, role: person.role, tablesAssigned: person.assigned_tables
      })));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'L’équipe n’a pas pu être chargée.');
    }
  }, [hydrateWaiters]);

  const loadTransactions = useCallback(async () => {
    try {
      const response = await fetch('/api/payments/history', { credentials: 'same-origin', cache: 'no-store' });
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json() as { transactions: PaymentTransaction[] };
      setTransactions(result.transactions);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'L’historique de paiement n’a pas pu être chargé.');
    }
  }, []);

  useEffect(() => {
    void loadAnalytics();
    void loadTeam();
    void loadTransactions();
    void fetch('/api/payments/manual-details', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error(await errorMessage(response));
        setBillingDetails(await response.json() as ManualDetails);
      })
      .catch(loadError => setError(loadError instanceof Error ? loadError.message : 'Les moyens de paiement ne sont pas disponibles.'));
  }, [loadAnalytics, loadTeam, loadTransactions]);

  const saveSetup = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/manager/restaurant', {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, googleReviewUrl: googleUrl, address: restaurant.address, city: restaurant.city,
          phone: restaurant.phone || '', tableCount: restaurant.tableCount, tipEnabled
        })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json() as { restaurant: { name: string; google_review_url: string; tip_enabled: boolean } };
      updateRestaurant({ name: result.restaurant.name, googleReviewUrl: result.restaurant.google_review_url, tipEnabled: result.restaurant.tip_enabled });
      setMessage('Configuration enregistrée.');
      await loadAnalytics();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'La configuration n’a pas pu être enregistrée.');
    } finally {
      setBusy(false);
    }
  };

  const createStaff = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('');
    try {
      const response = await fetch('/api/manager/team', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStaffName, role: newStaffRole, assignedTables: [] })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      setNewStaffName('');
      setMessage('Membre de l’équipe ajouté.');
      await loadTeam();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'Le membre n’a pas pu être ajouté.');
    } finally { setBusy(false); }
  };

  const toggleStaff = async (person: Staff) => {
    setBusy(true); setError('');
    try {
      const response = await fetch(`/api/manager/team/${encodeURIComponent(person.id)}`, {
        method: 'PATCH', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: person.status === 'active' ? 'disabled' : 'active' })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      await loadTeam();
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : 'Le statut n’a pas pu être modifié.');
    } finally { setBusy(false); }
  };

  const startStripeCheckout = async (transactionType: 'installation' | 'subscription') => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/payments/stripe/checkout', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionType, packId: selectedPack })
      });
      if (!response.ok) throw new Error(await errorMessage(response));
      const result = await response.json() as { checkoutUrl: string };
      window.location.assign(result.checkoutUrl);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Le paiement Stripe n’a pas pu démarrer.');
      setBusy(false);
    }
  };

  const sendManualPayment = async () => {
    if (!proofFile || !paymentReference.trim()) {
      setError('Ajoutez une preuve image et la référence du paiement.');
      return;
    }
    setBusy(true); setError(''); setMessage('');
    try {
      const created = await fetch('/api/payments/manual/transactions', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionType: manualTransactionType, packId: selectedPack })
      });
      if (!created.ok) throw new Error(await errorMessage(created));
      const { transactionId } = await created.json() as { transactionId: string };
      const submitted = await fetch(`/api/payments/manual/proofs/${encodeURIComponent(transactionId)}`, {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': proofFile.type, 'X-Payment-Reference': paymentReference.trim() },
        body: proofFile
      });
      if (!submitted.ok) throw new Error(await errorMessage(submitted));
      setMessage('Preuve envoyée. Le paiement sera activé après validation.');
      setProofFile(null);
      setPaymentReference('');
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'La preuve n’a pas pu être envoyée.');
    } finally { setBusy(false); }
  };

  const exportCsv = () => {
    if (!analytics) return;
    const lines = [
      ['Date', 'Scans', 'Note', 'Commentaire'],
      ...analytics.reviews.map(review => [new Date(review.created_at).toLocaleDateString('fr-FR'), '', String(review.rating), review.comment]),
      ...analytics.activity.map(item => [item.day, String(item.scans), '', ''])
    ];
    const csv = `\uFEFF${lines.map(line => line.map(value => {
      const safeValue = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
      return `"${safeValue.replaceAll('"', '""')}"`;
    }).join(';')).join('\r\n')}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `digifeel-${days}-jours.csv`; link.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async () => {
    if (!analytics) return;
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      pdf.text(`Rapport Digifeel - ${restaurant.name}`, 14, 18);
      pdf.text(`Période : ${days} jours | Scans : ${analytics.scans} | Avis : ${analytics.reviewCount} | Moyenne : ${analytics.averageRating}/5`, 14, 30, { maxWidth: 180 });
      analytics.reviews.slice(0, 25).forEach((review, index) => {
        const text = `${new Date(review.created_at).toLocaleDateString('fr-FR')} - ${review.rating}/5 - ${review.comment || 'Sans commentaire'}`;
        pdf.text(text, 14, 44 + index * 8, { maxWidth: 180 });
      });
      pdf.save(`digifeel-${days}-jours.pdf`);
    } catch (exportError) {
      console.error('La création du PDF a échoué.', exportError);
      setError('Le PDF n’a pas pu être créé. Réessayez.');
    }
  };

  const copyPaymentDetails = async () => {
    if (!billingDetails) return;
    const details = [
      billingDetails.accountName && `Titulaire : ${billingDetails.accountName}`,
      billingDetails.ccpNumber && `CCP : ${billingDetails.ccpNumber}`,
      billingDetails.ccpKey && `Clé : ${billingDetails.ccpKey}`,
      billingDetails.baridimobRip && `RIP : ${billingDetails.baridimobRip}`,
      billingDetails.phone && `Téléphone : ${billingDetails.phone}`
    ].filter(Boolean).join('\n');
    try { await navigator.clipboard.writeText(details); setMessage('Coordonnées copiées.'); }
    catch (copyError) { console.error('La copie des coordonnées a échoué.', copyError); setError('Copie impossible dans ce navigateur.'); }
  };

  const downloadReceipt = async (transaction: PaymentTransaction) => {
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF();
      pdf.text('Reçu de paiement Digifeel', 14, 20);
      pdf.text(`Établissement : ${restaurant.name}`, 14, 34);
      pdf.text(`Offre : ${transaction.description}`, 14, 44);
      pdf.text(`Montant : ${(transaction.amount_minor / 100).toLocaleString('fr-FR')} ${transaction.currency.toUpperCase()}`, 14, 54);
      pdf.text(`Statut : ${transaction.status}`, 14, 64);
      pdf.text(`Date : ${new Date(transaction.created_at).toLocaleString('fr-FR')}`, 14, 74);
      pdf.text(`Référence : ${transaction.provider_reference || transaction.id}`, 14, 84);
      pdf.save(`recu-digifeel-${transaction.id.slice(0, 8)}.pdf`);
    } catch (receiptError) {
      console.error('La création du reçu a échoué.', receiptError);
      setError('Le reçu n’a pas pu être créé. Réessayez.');
    }
  };

  return (
    <main className="mx-auto max-w-6xl space-y-6 px-4 py-8 text-slate-100 sm:px-6" aria-labelledby="live-manager-title">
      <header className="rounded-3xl border border-white/10 bg-slate-900/80 p-6">
        <p className="flex items-center gap-2 text-sm text-emerald-300"><ShieldCheck size={18} /> Espace restaurateur connecté</p>
        <h1 id="live-manager-title" className="mt-2 text-3xl font-bold">{restaurant.name}</h1>
        <p className="mt-2 text-slate-300">Les statistiques et avis présentés ici proviennent de vos scans enregistrés.</p>
      </header>

      {(error || message) && <p className={`rounded-xl border p-4 ${error ? 'border-red-400/40 bg-red-950/40 text-red-100' : 'border-emerald-400/40 bg-emerald-950/40 text-emerald-100'}`} role={error ? 'alert' : 'status'}>{error || message}</p>}

      <section className="grid gap-5 lg:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="text-xl font-semibold">Mise en service</h2>
          <p className="mt-1 text-slate-300">Ajoutez la page Google de votre restaurant pour activer les liens de scan.</p>
          <form className="mt-4 grid gap-3" onSubmit={event => void saveSetup(event)}>
            <label className="grid gap-1">Nom de l’établissement<input className="rounded-lg bg-slate-800 p-3" value={name} maxLength={120} required onChange={event => setName(event.target.value)} /></label>
            <label className="grid gap-1">Lien d’avis Google<input className="rounded-lg bg-slate-800 p-3" type="url" value={googleUrl} required placeholder="https://g.page/…" onChange={event => setGoogleUrl(event.target.value)} /></label>
            <label className="flex min-h-11 items-center gap-3"><input type="checkbox" checked={tipEnabled} onChange={event => setTipEnabled(event.target.checked)} /> Activer les pourboires depuis la page de scan</label>
            <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 font-bold text-slate-950 disabled:opacity-50" type="submit" disabled={busy}><Save size={17} /> Enregistrer la configuration</button>
          </form>
        </article>

        <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
          <h2 className="flex items-center gap-2 text-xl font-semibold"><Users size={20} /> Équipe</h2>
          <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={event => void createStaff(event)}>
            <input className="min-h-11 min-w-0 flex-1 rounded-lg bg-slate-800 p-3" placeholder="Nom du membre" value={newStaffName} maxLength={120} required onChange={event => setNewStaffName(event.target.value)} />
            <input className="min-h-11 min-w-0 rounded-lg bg-slate-800 p-3 sm:w-36" aria-label="Rôle" value={newStaffRole} maxLength={80} onChange={event => setNewStaffRole(event.target.value)} />
            <button className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 font-bold text-slate-950" disabled={busy}><Plus size={17} /> Ajouter</button>
          </form>
          <ul className="mt-4 divide-y divide-white/10">
            {staff.length ? staff.map(person => (
              <li key={person.id} className="flex items-center justify-between gap-3 py-3">
                <span>{person.name} <small className="text-slate-400">· {person.role}</small></span>
                <button className="min-h-11 rounded-lg border border-white/20 px-3 text-sm" type="button" disabled={busy} onClick={() => void toggleStaff(person)}>{person.status === 'active' ? 'Désactiver' : 'Réactiver'}</button>
              </li>
            )) : <li className="py-4 text-slate-400">Aucun membre enregistré.</li>}
          </ul>
          <p className="mt-2 text-sm text-slate-400">{waiters.length} membre(s) actif(s) proposés dans les liens NFC.</p>
        </article>
      </section>

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-xl font-semibold">Activité et avis</h2><p className="mt-1 text-slate-300">Données des liens NFC et QR, regroupées par période.</p></div>
          <div className="flex flex-wrap gap-2">
            <select className="min-h-11 rounded-lg bg-slate-800 px-3" aria-label="Période" value={days} onChange={event => setDays(Number(event.target.value) as 7 | 30)}><option value={7}>7 jours</option><option value={30}>30 jours</option></select>
            <button type="button" className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-3" onClick={() => void loadAnalytics()}><RefreshCw size={16} /> Actualiser</button>
          </div>
        </div>
        {dashboardLocked ? (
          <div className="mt-5 rounded-xl border border-amber-400/30 bg-amber-950/30 p-4">
            <h3 className="font-semibold">Tableau de bord suspendu</h3>
            <p className="mt-1 text-slate-200">Vos puces continuent de rediriger vers Google. Les statistiques et exports reprennent avec l’abonnement de {PRODUCT_PRICING.monthlySubscriptionEuros} € / mois.</p>
          </div>
        ) : analytics ? (
          <>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <Metric label="Scans" value={analytics.scans} />
              <Metric label="Avis reçus" value={analytics.reviewCount} />
              <Metric label="Note moyenne" value={`${analytics.averageRating}/5`} />
            </div>
            <div className="mt-5 rounded-xl border border-white/10 bg-slate-950/50 p-4">
              <h3 className="font-semibold">Scans par jour</h3>
              {analytics.activity.length ? (
                <div className="mt-3 grid grid-cols-7 gap-2" aria-label={`Évolution des scans sur ${days} jours`}>
                  {analytics.activity.map(item => {
                    const maximum = Math.max(...analytics.activity.map(day => Number(day.scans)), 1);
                    const height = Math.max(8, Math.round(Number(item.scans) / maximum * 100));
                    return <div className="flex min-w-0 flex-col items-center gap-1" key={item.day} title={`${item.day} : ${item.scans} scans`}><span className="text-xs text-slate-300">{item.scans}</span><span className="w-full rounded-t bg-emerald-500" style={{ height: `${height}px` }} /><span className="text-center text-[11px] text-slate-400">{new Date(item.day).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}</span></div>;
                  })}
                </div>
              ) : <p className="mt-2 text-slate-400">Aucun scan sur cette période.</p>}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <button className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold" onClick={() => void exportPdf()}><FileText size={17} /> Exporter en PDF</button>
              <button className="flex min-h-11 items-center gap-2 rounded-xl bg-emerald-700 px-4 font-semibold" onClick={exportCsv}><FileSpreadsheet size={17} /> Exporter en Excel (CSV)</button>
            </div>
            <ul className="mt-4 divide-y divide-white/10">
              {analytics.reviews.map(review => <li key={review.id} className="py-3"><p className="font-semibold">{review.rating}/5 <span className="font-normal text-slate-400">· {new Date(review.created_at).toLocaleString('fr-FR')}</span></p><p className="mt-1 text-slate-200">{review.comment || 'Aucun commentaire.'}</p></li>)}
              {!analytics.reviews.length && <li className="py-4 text-slate-400">Aucun avis sur cette période.</li>}
            </ul>
          </>
        ) : <p className="mt-5 text-slate-300" role="status">Chargement des statistiques…</p>}
      </section>
      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h2 className="text-xl font-semibold">Historique et reçus</h2>
        <ul className="mt-3 divide-y divide-white/10">
          {transactions.map(transaction => (
            <li key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <p className="font-semibold">{transaction.description} · {(transaction.amount_minor / 100).toLocaleString('fr-FR')} {transaction.currency.toUpperCase()}</p>
                <p className="text-sm text-slate-400">{new Date(transaction.created_at).toLocaleString('fr-FR')} · {transaction.status}</p>
              </div>
              {transaction.status === 'paid' && <button type="button" className="flex min-h-11 items-center gap-2 rounded-lg border border-white/20 px-3" onClick={() => void downloadReceipt(transaction)}><Download size={16} /> Reçu PDF</button>}
            </li>
          ))}
          {!transactions.length && <li className="py-4 text-slate-400">Aucun paiement enregistré.</li>}
        </ul>
      </section>

      {restaurant.googleReviewUrl && <ScanTargetManager />}

      <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
        <h2 className="text-xl font-semibold">Paiements et abonnement</h2>
        <p className="mt-1 text-slate-300">Le paiement par carte reste en mode test. Votre espace s’active uniquement après confirmation serveur.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="space-y-3 rounded-xl border border-white/10 p-4">
            <label className="grid gap-1">Pack d’installation<select className="min-h-11 rounded-lg bg-slate-800 p-2" value={selectedPack} onChange={event => setSelectedPack(event.target.value)}>{INSTALLATION_PACKS.map(pack => <option key={pack.id} value={pack.id}>{pack.name} — {pack.priceEuros} €</option>)}</select></label>
            <button className="min-h-11 w-full rounded-xl bg-amber-500 px-4 font-bold text-slate-950" type="button" disabled={busy} onClick={() => void startStripeCheckout('installation')}>Payer le pack par carte</button>
            <button className="min-h-11 w-full rounded-xl border border-white/20 px-4" type="button" disabled={busy} onClick={() => void startStripeCheckout('subscription')}>Activer l’essai de {PRODUCT_PRICING.subscriptionTrialDays} jours puis {PRODUCT_PRICING.monthlySubscriptionEuros} € / mois</button>
            <button className="min-h-11 w-full rounded-xl border border-white/20 px-4" type="button" onClick={async () => {
              setBusy(true); setError('');
              try {
                const response = await fetch('/api/payments/stripe/portal', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
                if (!response.ok) throw new Error(await errorMessage(response));
                const result = await response.json() as { url: string }; window.location.assign(result.url);
              } catch (portalError) { setError(portalError instanceof Error ? portalError.message : 'Le portail est indisponible.'); setBusy(false); }
            }}>Gérer mon abonnement et ma carte</button>
          </div>
          <div className="space-y-3 rounded-xl border border-white/10 p-4">
            <h3 className="font-semibold">Paiement manuel CCP / Baridimob</h3>
            {billingDetails && (
              <>
                <dl className="space-y-1 text-sm text-slate-200">
                  {billingDetails.accountName && <Detail label="Titulaire" value={billingDetails.accountName} />}
                  {billingDetails.ccpNumber && <Detail label="CCP" value={`${billingDetails.ccpNumber}${billingDetails.ccpKey ? ` — clé ${billingDetails.ccpKey}` : ''}`} />}
                  {billingDetails.baridimobRip && <Detail label="RIP" value={billingDetails.baridimobRip} />}
                  {billingDetails.phone && <Detail label="Téléphone" value={billingDetails.phone} />}
                </dl>
                <button className="min-h-11 rounded-lg border border-white/20 px-3" type="button" onClick={() => void copyPaymentDetails()}>Copier les coordonnées</button>
                {billingDetails.exchangeRate ? (
                  <>
                    <p className="text-sm text-slate-300">Conversion appliquée : 1 € = {billingDetails.exchangeRate} DZD.</p>
                    <label className="grid gap-1">Type de paiement<select className="min-h-11 rounded-lg bg-slate-800 p-2" value={manualTransactionType} onChange={event => setManualTransactionType(event.target.value === 'subscription' ? 'subscription' : 'installation')}><option value="installation">Pack d’installation</option><option value="subscription">Abonnement mensuel</option></select></label>
                    <label className="grid gap-1">Référence du virement<input className="min-h-11 rounded-lg bg-slate-800 p-3" value={paymentReference} maxLength={80} onChange={event => setPaymentReference(event.target.value)} /></label>
                    <label className="grid gap-1">Preuve (JPEG, PNG ou WebP, 5 Mo maximum)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setProofFile(event.target.files?.[0] || null)} /></label>
                    <button className="min-h-11 w-full rounded-xl bg-emerald-700 px-4 font-semibold" type="button" disabled={busy} onClick={() => void sendManualPayment()}>Envoyer la preuve de paiement</button>
                  </>
                ) : <p className="text-sm text-amber-200">Ce mode de paiement est désactivé tant que le taux EUR/DZD n’est pas défini dans la configuration serveur.</p>}
              </>
            )}
          </div>
        </div>
      </section>
      <p className="text-center text-xs text-slate-400">Paiement par carte en mode test. Aucune donnée de carte n’est enregistrée par Digifeel.</p>
    </main>
  );
};

const Metric: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <article className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><p className="text-sm text-slate-400">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></article>
);

const Detail: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex flex-wrap gap-2"><dt className="font-semibold">{label} :</dt><dd>{value}</dd></div>
);

export default LiveManagerWorkspace;
