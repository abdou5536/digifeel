import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowDownRight, ArrowRight, BarChart3, Check, CreditCard, Download, FileSpreadsheet,
  FileText, QrCode, Radio, ShieldCheck, Smartphone, Star, Utensils, Wallet
} from 'lucide-react';
import styles from './Portfolio.module.css';
import { DownloadPortfolioButton } from './DownloadPortfolioButton';
import { DownloadPortfolioVideoButton } from './DownloadPortfolioVideoButton';

export const metadata: Metadata = {
  title: 'Digifeel — Présentation de la solution restaurant',
  description: 'Découvrez Digifeel : QR code et NFC à table, avis clients, caisse, paiements et rapports professionnels PDF et Excel pour les restaurants.'
};

const features = [
  {
    icon: QrCode,
    title: 'Une expérience simple à chaque table',
    text: 'Un QR code ouvre directement l’expérience du restaurant : menu, avis, addition et services utiles, sans application à installer.'
  },
  {
    icon: Star,
    title: 'Des avis qui comptent',
    text: 'Invitez vos clients à partager leur expérience et facilitez l’accès à votre fiche Google après leur visite.'
  },
  {
    icon: Wallet,
    title: 'Des paiements adaptés',
    text: 'Suivez les paiements espèces et BaridiMob. Le paiement carte des additions de table attend encore la confirmation du terminal.'
  },
  {
    icon: BarChart3,
    title: 'Un tableau de bord clair',
    text: 'Suivez l’activité, les avis et les performances de votre restaurant depuis un espace de gestion conçu pour le quotidien.'
  }
];

const steps = [
  ['01', 'Choisissez vos tables', 'Définissez le nombre de tables à équiper. Chaque table reçoit son QR code dédié.'],
  ['02', 'Installez vos supports', 'Placez les QR codes. Des puces NFC pour vos serveurs peuvent être ajoutées sur devis séparé.'],
  ['03', 'Pilotez votre activité', 'Gérez les avis, consultez les résultats et exportez vos rapports professionnels.']
];

export default function PortfolioPage() {
  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true" />
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="Digifeel, accueil">
          <span className={styles.brandMark}><Utensils size={18} /></span>
          <span>DIGIFEEL<small>LA TABLE, EN MIEUX</small></span>
        </Link>
        <nav className={styles.nav} aria-label="Navigation portfolio">
          <a href="#solution">La solution</a>
          <a href="#rapports">Rapports</a>
          <a href="#tarif">Tarif</a>
        </nav>
        <div className={styles.headerActions}>
          <DownloadPortfolioButton compact />
          <DownloadPortfolioVideoButton compact />
          <Link className={styles.headerCta} href="/demo">Voir la démo <ArrowRight size={15} /></Link>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}><span />L’EXPÉRIENCE RESTAURANT, SIMPLIFIÉE</span>
          <h1>Chaque table devient un <em>point de contact.</em></h1>
          <p className={styles.heroText}>
            Digifeel réunit QR code, avis clients, caisse et outils de gestion dans une expérience simple pour vos clients comme pour votre équipe.
          </p>
          <div className={styles.heroActions}>
            <Link className={styles.primaryButton} href="/inscription">Équiper mon restaurant <ArrowRight size={17} /></Link>
            <a className={styles.secondaryButton} href="#solution">Découvrir la solution <ArrowDownRight size={17} /></a>
          </div>
          <div className={styles.heroDownload}>
            <DownloadPortfolioButton />
            <DownloadPortfolioVideoButton />
          </div>
          <div className={styles.heroNote}><ShieldCheck size={16} /> Mise en place par table · Sans application à installer pour vos clients</div>
        </div>

        <div className={styles.preview} aria-label="Aperçu du tableau de bord Digifeel">
          <div className={styles.previewTop}><span><i />DIGIFEEL <small>ESPACE RESTAURANT</small></span><span className={styles.previewStatus}><b /> En ligne</span></div>
          <div className={styles.previewTitle}><div><small>VUE D’ENSEMBLE</small><h2>Bonjour, Le Jardin</h2></div><span>7 derniers jours⌄</span></div>
          <div className={styles.metricGrid}>
            <article><span>Scans clients</span><strong>1 284</strong><small className={styles.positive}>↑ 18,6 % cette semaine</small></article>
            <article><span>Avis recueillis</span><strong>96</strong><small>Sur la période</small></article>
            <article><span>Note moyenne</span><strong>4,8 <i>★</i></strong><small>Expérience client</small></article>
          </div>
          <div className={styles.chartCard}>
            <div><span>Activité de votre restaurant</span><small>Vues et interactions</small></div>
            <div className={styles.chart} aria-hidden="true">
              {[32, 48, 39, 68, 52, 82, 59, 74, 46, 91, 65, 78, 56, 88].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}
            </div>
            <div className={styles.chartDays}><span>LUN</span><span>MAR</span><span>MER</span><span>JEU</span><span>VEN</span><span>SAM</span><span>DIM</span></div>
          </div>
          <div className={styles.previewFooter}><span><QrCode size={15} /> QR actifs <b>24</b></span><span><Star size={15} /> Nouveaux avis <b>+12</b></span><span><CreditCard size={15} /> Paiements suivis</span></div>
          <p className={styles.demoCaption}>Aperçu illustratif · chiffres fictifs</p>
          <div className={styles.previewGlow} aria-hidden="true" />
        </div>
        <div className={styles.heroIndex}><span>01</span><i /> UNE SOLUTION, TOUT AU LONG DU SERVICE</div>
      </section>

      <section className={styles.proofStrip} aria-label="Fonctionnalités Digifeel">
        <span><QrCode /> QR code à chaque table</span>
        <span><Radio /> NFC en option</span>
        <span><CreditCard /> Paiement simplifié</span>
        <span><FileSpreadsheet /> Rapports exportables</span>
      </section>

      <section className={styles.section} id="solution">
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>VOTRE RESTAURANT, CONNECTÉ</span>
          <h2>Les bons outils.<br /><em>Au bon moment.</em></h2>
          <p>Un parcours fluide côté client et une vue utile côté équipe — sans multiplier les outils.</p>
        </div>
        <div className={styles.featureGrid}>
          {features.map(({ icon: Icon, title, text }, index) => (
            <article className={styles.featureCard} key={title}>
              <span className={styles.featureIcon}><Icon size={20} /></span>
              <span className={styles.cardNumber}>0{index + 1}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <ArrowRight className={styles.cardArrow} size={17} />
            </article>
          ))}
        </div>
      </section>

      <section className={styles.journey}>
        <div className={styles.journeyIntro}>
          <span className={styles.eyebrow}>MISE EN PLACE</span>
          <h2>Prêt pour le service.<br /><em>Table après table.</em></h2>
          <p>Un déploiement lisible : le prix s’adapte au nombre de tables, pas à un pack imposé.</p>
          <Link href="/inscription" className={styles.textLink}>Commencer la mise en place <ArrowRight size={16} /></Link>
        </div>
        <div className={styles.steps}>
          {steps.map(([number, title, text]) => (
            <article key={number}><span>{number}</span><div><h3>{title}</h3><p>{text}</p></div><Check size={17} /></article>
          ))}
        </div>
      </section>

      <section className={styles.reports} id="rapports">
        <div className={styles.reportVisual}>
          <div className={styles.reportFile}><span className={styles.fileIcon}><FileText /></span><div><strong>Rapport d’activité</strong><small>PDF · prêt à partager</small></div><span className={styles.fileReady}>PRÊT</span></div>
          <div className={styles.reportFile}><span className={`${styles.fileIcon} ${styles.excelIcon}`}><FileSpreadsheet /></span><div><strong>Analyse des ventes</strong><small>Excel · données exploitables</small></div><span className={styles.fileReady}>XLSX</span></div>
          <div className={styles.reportSummary}><span>VOTRE ACTIVITÉ, LISIBLE</span><div><b>Ventes</b><i /><strong>+12,8 %</strong></div><div><b>Avis clients</b><i /><strong>4,8 / 5</strong></div><div><b>Scans QR</b><i /><strong>1 284</strong></div></div>
          <p className={styles.demoCaption}>Exemples de démonstration · données fictives</p>
          <div className={styles.reportDownloads}>
            <a className={styles.downloadButton} href="/portfolio-files/Digifeel-rapport-client-exemple.pdf" download="Digifeel-rapport-client-exemple.pdf"><Download size={15} />Exemple de rapport PDF</a>
            <a className={styles.downloadButton} href="/portfolio-files/Digifeel-rapport-client-exemple.xlsx" download="Digifeel-rapport-client-exemple.xlsx"><Download size={15} />Exemple Excel</a>
          </div>
        </div>
        <div className={styles.reportCopy}>
          <span className={styles.eyebrow}>DES DONNÉES AUX DÉCISIONS</span>
          <h2>Des rapports soignés.<br /><em>Pas juste des chiffres.</em></h2>
          <p>Retrouvez vos indicateurs dans des exports structurés pour partager un bilan ou approfondir vos résultats dans votre tableur.</p>
          <ul><li><Check size={16} />Rapport PDF clair et prêt à présenter</li><li><Check size={16} />Fichier Excel organisé pour l’analyse</li><li><Check size={16} />Période, ventes, activité et avis réunis</li></ul>
        </div>
      </section>

      <section className={styles.pricing} id="tarif">
        <div className={styles.pricingCopy}>
          <span className={styles.eyebrow}>UN TARIF TRANSPARENT</span>
          <h2>Une table.<br /><em>Un prix clair.</em></h2>
          <p>Pas de formule QR à choisir. Équipez le nombre de tables dont vous avez besoin et gardez les puces NFC en option.</p>
          <div className={styles.priceCard}>
            <div><span>Installation QR</span><small>En une fois · par table</small></div>
            <strong>9 <small>€</small></strong>
            <span className={styles.priceCheck}><Check size={15} /> QR code dédié à chaque table</span>
            <span className={styles.priceCheck}><Check size={15} /> Quantité adaptée à votre salle</span>
            <span className={styles.priceCheck}><Radio size={15} /> NFC serveur : option sur devis séparé</span>
            <Link href="/inscription">Calculer mon installation <ArrowRight size={16} /></Link>
          </div>
          <small className={styles.exchangeNote}>Le prix de référence est en euros. Toute conversion en dinars est indicative et confirmée lors de l’accord.</small>
        </div>
        <div className={styles.priceExample}>
          <span>EXEMPLE D’INSTALLATION</span>
          <div><Smartphone size={20} /><b>12 tables</b><i>×</i><b>9 €</b></div>
          <hr />
          <small>Installation QR, en une fois</small>
          <strong>108 <small>€</small></strong>
          <p>Les équipements NFC ne sont pas inclus dans cet exemple et peuvent être chiffrés séparément.</p>
        </div>
      </section>

      <section className={styles.paymentBand}>
        <div><span className={styles.eyebrow}>PENSÉ POUR VOS CLIENTS</span><h2>Le règlement, sans détour.</h2>        <p>Espèces et BaridiMob selon le flux utilisé. Pour les additions par table, le paiement carte reste en attente de confirmation du terminal.</p></div>
        <div className={styles.paymentOptions}><span><CreditCard />Carte<small>Terminal bancaire à intégrer pour confirmer les paiements de caisse</small></span><span><Wallet />BaridiMob<small>Vérification par l’équipe du restaurant</small></span></div>
      </section>

      <footer className={styles.footer}>
        <Link className={styles.brand} href="/"><span className={styles.brandMark}><Utensils size={18} /></span><span>DIGIFEEL<small>LA TABLE, EN MIEUX</small></span></Link>
        <span>Une expérience plus simple, pour chaque service.</span>
        <div><Link href="/demo">Explorer la démo</Link><Link href="/inscription">Parler installation</Link><Link href="/">Accueil</Link></div>
      </footer>
    </main>
  );
}
