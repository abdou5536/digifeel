export default function Loading() {
  return (
    <div role="status" aria-live="polite" style={{ minHeight: '60vh', display: 'grid', placeItems: 'center' }}>
      <span>Chargement en cours…</span>
    </div>
  );
}
