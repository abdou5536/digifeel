import { Download } from 'lucide-react';
import styles from './Portfolio.module.css';

export function DownloadPortfolioButton({ compact = false }: { compact?: boolean }) {
  return (
    <span className={`${styles.downloadControl} ${compact ? styles.downloadControlCompact : ''}`}>
      <a
        className={styles.downloadButton}
        href="/portfolio-files/Digifeel-Portfolio-client.pdf"
        download="Digifeel-Portfolio-client.pdf"
        aria-label={compact ? 'Télécharger le portfolio PDF' : 'Télécharger le portfolio complet (PDF)'}
      >
        <Download size={16} />
        {compact ? 'Portfolio PDF' : 'Télécharger le portfolio complet (PDF)'}
      </a>
    </span>
  );
}
