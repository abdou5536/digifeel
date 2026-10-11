'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Printer } from 'lucide-react';
import { paperCss, readPaperWidth } from '@/src/lib/pos/printer-settings';

type CounterItem = { bill_id: string; table_label: string; product_name: string; quantity: number; sent_at: string };

type DesktopBridge = { printSilent?: (html: string) => Promise<boolean> };

const STORAGE_KEY = 'digifeel-counter-print';
const POLL_MS = 4000;

const esc = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);

function ticketHtml(table: string, items: CounterItem[]) {
  const lines = items.map(item => `<tr><td class="q">${item.quantity} ×</td><td>${esc(item.product_name)}</td></tr>`).join('');
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Commande ${esc(table)}</title>
<style>${paperCss(readPaperWidth())}body{font-family:Arial,sans-serif;font-size:15px;color:#000}h1{font-size:22px;margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:4px 0}.q{width:3em;font-weight:bold}</style></head><body>
<h1>Table ${esc(table)}</h1><div>${esc(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }))}</div><table>${lines}</table></body></html>`;
}

async function printHtml(html: string) {
  const bridge = (window as unknown as { digifeelDesktop?: DesktopBridge }).digifeelDesktop;
  if (bridge?.printSilent) return bridge.printSilent(html);
  return new Promise<boolean>(resolve => {
    const frame = document.createElement('iframe');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;visibility:hidden';
    frame.srcdoc = html;
    frame.onload = () => {
      const view = frame.contentWindow;
      if (!view) { frame.remove(); resolve(false); return; }
      view.addEventListener('afterprint', () => { frame.remove(); resolve(true); }, { once: true });
      view.focus();
      view.print();
    };
    document.body.append(frame);
  });
}

/** Poste de caisse : imprime automatiquement les commandes envoyées par les tablettes des serveurs. */
export function CounterTicketPrinter() {
  const [enabled, setEnabled] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [status, setStatus] = useState('');
  const running = useRef(false);

  useEffect(() => {
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(response => response.json())
      .then((result: { user?: { role?: string } | null }) => setIsAdmin(result.user?.role === 'restaurant_admin'))
      .catch(() => setIsAdmin(false));
  }, []);

  useEffect(() => {
    try { setEnabled(window.localStorage.getItem(STORAGE_KEY) === '1'); } catch { /* stockage indisponible */ }
  }, []);

  const poll = useCallback(async () => {
    if (running.current || !navigator.onLine) return;
    running.current = true;
    try {
      const response = await fetch('/api/pos/counter-tickets', { method: 'POST', cache: 'no-store' });
      if (!response.ok) {
        setStatus(response.status === 402 ? 'Abonnement expiré : impression suspendue.' : 'Réception des commandes impossible.');
        return;
      }
      const { items } = await response.json() as { items: CounterItem[] };
      const byBill = new Map<string, CounterItem[]>();
      for (const item of items) byBill.set(item.bill_id, [...(byBill.get(item.bill_id) ?? []), item]);
      for (const group of byBill.values()) {
        const printed = await printHtml(ticketHtml(group[0].table_label, group));
        setStatus(printed ? `Dernière commande imprimée : table ${group[0].table_label}.` : `Impression échouée pour la table ${group[0].table_label}. Vérifiez l’imprimante.`);
      }
      if (byBill.size === 0) setStatus(current => current.startsWith('Réception') || current.startsWith('Abonnement') ? '' : current);
    } catch {
      setStatus('Réception des commandes impossible.');
    } finally {
      running.current = false;
    }
  }, []);

  useEffect(() => {
    if (!enabled || !isAdmin) return;
    void poll();
    const timer = window.setInterval(() => { void poll(); }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [enabled, isAdmin, poll]);

  const toggle = (value: boolean) => {
    setEnabled(value);
    try { window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0'); } catch { /* stockage indisponible */ }
    setStatus('');
  };

  if (!isAdmin) return null;

  return (
    <section className="workspace-panel" aria-labelledby="counter-print-title" style={{ margin: '1.5rem auto', maxWidth: 720, padding: '1.25rem' }}>
      <h2 id="counter-print-title"><Printer size={18} aria-hidden="true" /> Commandes des serveurs</h2>
      <label style={{ display: 'flex', gap: '.6rem', alignItems: 'center' }}>
        <input type="checkbox" checked={enabled} onChange={event => toggle(event.target.checked)} />
        Imprimer ici automatiquement les commandes envoyées par les tablettes
      </label>
      <p className="next-muted">À activer sur un seul poste : celui qui a l’imprimante du comptoir. Dans l’application Windows, l’impression part sans fenêtre.</p>
      {status && <p role="status">{status}</p>}
    </section>
  );
}
