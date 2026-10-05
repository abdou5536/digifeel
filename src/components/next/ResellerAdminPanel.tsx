'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { BadgePercent, Building2, Check, CircleAlert, CreditCard, Download, HandCoins, ShieldCheck, UserRoundCheck, X } from 'lucide-react';
import {
  approveResellerPayout, getResellerAdministration, markResellerPayoutPaid, setResellerCommissionConfig, setResellerStatus, subscribeRestaurantData,
  validateResellerPlatformPayment, type ResellerCommissionConfig
} from '@/src/services/restaurant';

type AdminData = Awaited<ReturnType<typeof getResellerAdministration>>;

function moneyEUR(amount: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
}

export function ResellerAdminPanel() {
  const [data, setData] = useState<AdminData | null>(null);
  const [config, setConfig] = useState<ResellerCommissionConfig>({ ratePercent: 25, durationMonths: 12, capEUR: null });
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    const next = await getResellerAdministration();
    setData(next);
    setConfig(next.config);
  }, []);

  useEffect(() => {
    void refresh().catch(failure => setError(failure instanceof Error ? failure.message : 'Les données revendeur sont indisponibles.'));
    return subscribeRestaurantData(() => { void refresh(); });
  }, [refresh]);

  const perform = async (id: string, work: () => Promise<unknown>, message: string) => {
    setBusyId(id); setError(''); setNotice('');
    try {
      await work();
      await refresh();
      setNotice(message);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Action impossible.');
    } finally { setBusyId(''); }
  };

  const saveConfig = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await perform('config', () => setResellerCommissionConfig(config), 'Règles de commission enregistrées.');
  };

  const exportXlsx = async () => {
    if (!data) return;
    const XLSX = await import('@/src/lib/xlsxCompat');
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.commissions.map(item => ({
      Revendeur: data.resellers.find(reseller => reseller.id === item.resellerId)?.name ?? '',
      Restaurant: data.customers.find(entry => entry.restaurant.id === item.restaurantId)?.restaurant.name ?? '',
      Période: item.month, Commission: item.amountEUR, Statut: item.status, Référence: item.paymentId
    }))), 'Commissions');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(data.resellers.map(item => ({
      Revendeur: item.name, Email: item.email, Ville: item.city, Statut: item.status, Code: item.code ?? ''
    }))), 'Revendeurs');
    await XLSX.writeFile(workbook, 'digifeel-revendeurs.xlsx');
  };

  const dueGroups = new Map<string, { resellerId: string; month: string; amount: number }>();
  for (const item of data?.commissions ?? []) {
    if (item.status !== 'payable') continue;
    const key = `${item.resellerId}:${item.month}`;
    if (data?.payouts.some(payout => payout.resellerId === item.resellerId && payout.month === item.month)) continue;
    const current = dueGroups.get(key) ?? { resellerId: item.resellerId, month: item.month, amount: 0 };
    current.amount += item.amountEUR;
    dueGroups.set(key, current);
  }

  return <div className="reseller-admin-content">
    {(error || notice) && <div className={`workspace-message ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'}>{error ? <CircleAlert size={16} /> : <Check size={16} />}{error || notice}</div>}
    <form className="workspace-panel reseller-admin-config" onSubmit={saveConfig}>
      <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">POLITIQUE COMMERCIALE</span><h3>Commission partenaire</h3></div><BadgePercent /></div>
      <div className="reseller-admin-config-fields">
        <label>Taux (%)<input aria-label="Taux commission" type="number" min="20" max="30" step="0.5" required value={config.ratePercent} onChange={event => setConfig({ ...config, ratePercent: Number(event.target.value) })} /></label>
        <label>Durée (mois)<input aria-label="Durée commission en mois" type="number" min="1" max="60" step="1" required value={config.durationMonths} onChange={event => setConfig({ ...config, durationMonths: Number(event.target.value) })} /></label>
        <label>Plafond / restaurant (€)<input aria-label="Plafond commission en euros" type="number" min="0" step="0.01" placeholder="Illimité" value={config.capEUR ?? ''} onChange={event => setConfig({ ...config, capEUR: event.target.value === '' ? null : Number(event.target.value) })} /></label>
        <button type="submit" className="workspace-primary-button" disabled={busyId === 'config'}>Enregistrer les règles</button>
      </div>
      <p className="workspace-muted">Taux permis : 20–30 %. Par défaut, 25 % des paiements Digifeel validés pendant les 12 premiers mois. Les ventes du restaurant ne sont pas des paiements Digifeel.</p>
    </form>

    <article className="workspace-panel workspace-admin-list">
      <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">ACCÈS PARTENAIRES</span><h3>Candidatures revendeur · {data?.resellers.filter(item => item.status === 'pending').length ?? 0}</h3></div><UserRoundCheck /></div>
      {!data?.resellers.length ? <p className="workspace-muted">Aucune candidature enregistrée.</p> : <div className="reseller-admin-list">{data.resellers.map(reseller => <div className="reseller-admin-row" key={reseller.id}>
        <div><strong>{reseller.name}</strong><span>{reseller.email} · {reseller.city}</span>{reseller.code && <code>{reseller.code}</code>}</div>
        <span className={`reseller-status is-${reseller.status}`}>{reseller.status === 'approved' ? 'Validé' : reseller.status === 'rejected' ? 'Refusé' : 'À valider'}</span>
        {reseller.status === 'pending' && <div><button type="button" title="Valider la candidature" disabled={busyId === reseller.id} onClick={() => void perform(reseller.id, () => setResellerStatus(reseller.id, 'approved'), 'Revendeur validé et code unique généré.')}><Check size={16} />Valider</button><button type="button" title="Refuser la candidature" disabled={busyId === reseller.id} onClick={() => void perform(reseller.id, () => setResellerStatus(reseller.id, 'rejected'), 'Candidature refusée.')}><X size={16} />Refuser</button></div>}
      </div>)}</div>}
    </article>

    <article className="workspace-panel workspace-admin-list">
      <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">ENCAISSEMENTS PLATEFORME</span><h3>Paiements à valider · {data?.pendingPayments.length ?? 0}</h3></div><CreditCard /></div>
      {data?.pendingPayments.length ? <div className="reseller-admin-list">{data.pendingPayments.map(payment => <div className="reseller-admin-row" key={payment.id}>
        <div><strong>{data.customers.find(item => item.restaurant.id === payment.restaurantId)?.restaurant.name ?? 'Restaurant'} · {moneyEUR(payment.amountEUR)}</strong><span>{data.resellers.find(item => item.id === payment.resellerId)?.name} · {payment.kind} · {payment.reference}</span></div>
        <span>En attente</span>
        <div><button type="button" disabled={busyId === payment.id} onClick={() => void perform(payment.id, () => validateResellerPlatformPayment(payment.id, true), 'Paiement validé ; commission calculée.')}><Check size={16} />Valider paiement</button><button type="button" disabled={busyId === payment.id} onClick={() => void perform(payment.id, () => validateResellerPlatformPayment(payment.id, false), 'Paiement refusé.')}><X size={16} />Refuser</button></div>
      </div>)}</div> : <p className="workspace-muted">Aucun paiement plateforme en attente.</p>}
    </article>

    <article className="workspace-panel workspace-admin-list">
      <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">VERSEMENTS À AUTORISER</span><h3>Commissions dues · {dueGroups.size} périodes</h3></div><HandCoins /></div>
      {dueGroups.size ? <div className="reseller-admin-list">{[...dueGroups.values()].map(group => <div className="reseller-admin-row" key={`${group.resellerId}:${group.month}`}>
        <div><strong>{data?.resellers.find(item => item.id === group.resellerId)?.name} · {group.month}</strong><span>{moneyEUR(group.amount)} à régler manuellement</span></div><span>À payer</span>
        <button type="button" disabled={busyId === group.resellerId + group.month} onClick={() => void perform(group.resellerId + group.month, () => approveResellerPayout(group.resellerId, group.month), 'Versement autorisé. Effectuez le transfert hors application puis confirmez-le dans la section suivante.')}><ShieldCheck size={16} />Autoriser le versement</button>
      </div>)}</div> : <p className="workspace-muted">Aucune commission en attente de versement.</p>}
    </article>

    <article className="workspace-panel workspace-admin-list">
      <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">RÈGLEMENT MANUEL</span><h3>Transferts autorisés · {data?.payouts.filter(item => item.status === 'pending').length ?? 0}</h3></div><HandCoins /></div>
      {data?.payouts.some(item => item.status === 'pending') ? <div className="reseller-admin-list">{data.payouts.filter(item => item.status === 'pending').map(payout => <div className="reseller-admin-row" key={payout.id}>
        <div><strong>{data.resellers.find(item => item.id === payout.resellerId)?.name} · {payout.month}</strong><span>{moneyEUR(payout.amountEUR)} autorisés — transfert externe à effectuer</span></div><span>À verser</span>
        <button type="button" disabled={busyId === payout.id} onClick={() => void perform(payout.id, () => markResellerPayoutPaid(payout.id), 'Versement marqué payé.')}><Check size={16} />Confirmer le virement réalisé</button>
      </div>)}</div> : <p className="workspace-muted">Aucun versement autorisé en attente de confirmation.</p>}
    </article>

    <article className="workspace-panel workspace-admin-list">
      <div className="workspace-panel-heading"><div><span className="workspace-eyebrow">ATTRIBUTION</span><h3>Restaurants liés · {data?.customers.length ?? 0}</h3></div><Building2 /><button type="button" onClick={() => void exportXlsx()} disabled={!data?.commissions.length}><Download size={16} />Excel</button></div>
      <div className="reseller-admin-list">{data?.customers.map(({ restaurant, reseller }) => <div className="reseller-admin-row" key={restaurant.id}><strong>{restaurant.name}</strong><span>{restaurant.city} · {reseller?.name ?? 'Revendeur inconnu'} · {restaurant.subscriptionStatus}</span><span>{moneyEUR(restaurant.installationAmountEUR ?? 0)} pack</span></div>)}</div>
    </article>
  </div>;
}
