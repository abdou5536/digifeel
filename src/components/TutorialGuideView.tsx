import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BookOpen,
  Radio,
  QrCode,
  Star,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Users,
  CheckCircle2,
  Copy,
  Check,
  Smartphone,
  ExternalLink,
  Target,
  Sparkles,
  Award,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  ThumbsUp,
  Globe,
  Zap,
  Flame,
  Layers,
  Compass
} from 'lucide-react';
import { RestaurantOwnerTutorialModal } from './RestaurantOwnerTutorialModal';

export const TutorialGuideView: React.FC = () => {
  const { setMode, restaurant, restaurants, getRestaurantDashboardUrl, setSelectedTableNumber, setSelectedWaiterId, waiters } = useApp();
  const [activeTab, setActiveTab] = useState<'why_buy' | 'tutorial' | 'sales_strategy' | 'server_script'>('why_buy');
  const [copiedPitch, setCopiedPitch] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [isModalWalkthroughOpen, setIsModalWalkthroughOpen] = useState(false);

  const instagramPitch = `Bonjour ${restaurant.ownerName || 'l’équipe'},
J'ai remarqué votre superbe restaurant à ${restaurant.city || 'Paris'}.
Aujourd’hui, plus de 80% des clients n’ont plus de monnaie sur eux pour laisser un pourboire à vos serveurs, et seulement 1 client sur 50 pense à laisser un avis Google Maps.

J'installe une solution clé en main à 100 € :
1. Des puces électroniques NFC pour vos serveurs (sans contact)
2. Des chevalets QR étanches pour chacune de vos tables
3. Votre dashboard privé pour suivre la satisfaction et booster vos avis 5 étoiles

Le client pose son téléphone ou scanne : il note le service en 5 secondes, donne un pourboire direct et booste votre note Google.

Est-ce que je peux passer 5 minutes demain entre 15h et 17h vous montrer une démo sur votre propre smartphone ?`;

  const serverTableScript = `"Voici votre addition !
Si vous avez apprécié le repas, vous pouvez simplement poser votre téléphone sur mon badge NFC ou scanner le petit chevalet sur votre table.
Cela me permet de recevoir directement votre avis et votre pourboire en 1 clic sans monnaie.
Merci beaucoup et très bonne fin de journée !"`;

  const copyToClipboard = (text: string, isPitch: boolean) => {
    navigator.clipboard.writeText(text);
    if (isPitch) {
      setCopiedPitch(true);
      setTimeout(() => setCopiedPitch(false), 2000);
    } else {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-mesh-dark text-white py-8 px-4 sm:px-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="glass-card-dark rounded-3xl p-6 sm:p-7 border border-white/10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div>
          <div className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-amber-400" />
            <span>Guide Didacticiel & Playbook Opérationnel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
            Didacticiel de Prise en Main du Restaurant
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Comprenez le rôle des puces NFC, du filtrage d'avis 5 étoiles Google Maps et des pourboires sans contact.
          </p>
        </div>

        {/* Action Button: Launch Interactive Modal */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsModalWalkthroughOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md shadow-amber-500/20 cursor-pointer flex items-center gap-2 active:scale-95"
          >
            <Compass className="w-4 h-4" />
            <span>Lancer le Didacticiel Interactif</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10 shadow-inner">
        <button
          onClick={() => setActiveTab('why_buy')}
          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
            activeTab === 'why_buy'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>1. Fonctionnement & Valeur Ajoutée</span>
        </button>
        <button
          onClick={() => setActiveTab('tutorial')}
          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'tutorial'
              ? 'bg-white/20 text-white shadow-xs border border-white/20'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          2. Architecture Cloisonnée par Resto
        </button>
        <button
          onClick={() => setActiveTab('sales_strategy')}
          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'sales_strategy'
              ? 'bg-white/20 text-white shadow-xs border border-white/20'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          3. Pitch & Message Restaurateur
        </button>
        <button
          onClick={() => setActiveTab('server_script')}
          className={`px-3.5 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
            activeTab === 'server_script'
              ? 'bg-white/20 text-white shadow-xs border border-white/20'
              : 'text-slate-300 hover:text-white hover:bg-white/10'
          }`}
        >
          4. Script Serveurs en Salle
        </button>
      </div>

      {/* TAB 0: WHY DO CLIENTS BUY? */}
      {activeTab === 'why_buy' && (
        <div className="space-y-8 animate-in fade-in">
          {/* Main Clarity Banner */}
          <div className="glass-card-dark rounded-3xl p-6 sm:p-8 space-y-3 border border-amber-500/40 shadow-2xl relative overflow-hidden glass-glow-amber">
            <div className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span>Guide Explicatif : Tout comprendre en 3 minutes</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white">
              Pourquoi un restaurant vous paiera 100 € sans hésiter ?
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Vous vous demandez peut-être : <em>« Qu'est-ce qu'il y a sur ma puce NFC ? Pourquoi le patron ne fait pas un simple QR code gratuit ? En quoi mon application lui change la vie ? »</em>
              <br />
              Voici les réponses exactes pour convaincre n'importe quel restaurateur en 30 secondes :
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="glass-card-dark p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                1. Que contient le QR code et la puce NFC ?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Le QR code de table et la puce NFC ouvrent <strong>la page mobile privée du restaurant</strong> (votre application, écran <em>Vue Client</em>), en 1 seconde sans rien télécharger.
              </p>
              <div className="space-y-2 text-xs glass-card-dark p-4 rounded-2xl border border-white/10 text-slate-300">
                <div>• <strong>Sur le badge du serveur (David)</strong> : Le client voit la photo de David et son prénom.</div>
                <div>• <strong>Sur le chevalet (Table 4)</strong> : La Table 4 est liée au serveur de la zone.</div>
                <div>• <strong>Synchronisation avec le site du restaurant ?</strong> : <strong>Non, aucune manipulation technique !</strong> L'application est 100% autonome.</div>
              </div>
            </div>

            {/* Card 2 */}
            <div className="glass-card-dark p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 border border-red-500/40 flex items-center justify-center font-bold">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                2. Le Danger mortel d'un QR code Google gratuit
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Mettre un simple QR code Google direct sur une table est une grave erreur :
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300">
                  <strong>Le piège du QR code Google direct :</strong>
                  <br />
                  Si un client attend 20 minutes ou n'aime pas son plat, il colle <strong>1 étoile en public sur Google Maps</strong> et détruit la note du restaurant.
                </div>
                <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-300">
                  <strong>Le Filtre Intelligent de votre Application :</strong>
                  <br />
                  • <strong>5 étoiles</strong> : Redirection directe sur Google Maps.
                  <br />
                  • <strong>1 à 3 étoiles</strong> : L'avis <strong>reste 100% privé</strong> sur le tableau de bord du patron pour corriger le tir en salle sans abîmer la fiche Google !
                </div>
              </div>
            </div>

            {/* Card 3 */}
            <div className="glass-card-dark p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                3. En quoi payer 100 € lui facilite la vie ?
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                Le restaurateur récupère ses 100 € dès la première semaine :
              </p>
              <div className="space-y-2 text-xs">
                <div className="p-3 glass-card-dark border border-white/10 rounded-xl">
                  <div className="font-bold text-amber-300">A. Pourboires Serveurs sans monnaie (+40%) :</div>
                  <div className="text-slate-300 mt-0.5 text-[11px]">
                    85% des clients n'ont plus de pièces. Vos puces rapportent 150€ à 300€ de pourboires en plus par mois à l'équipe.
                  </div>
                </div>

                <div className="p-3 glass-card-dark border border-white/10 rounded-xl">
                  <div className="font-bold text-cyan-300">B. Explosion d'avis 5★ Google Maps :</div>
                  <div className="text-slate-300 mt-0.5 text-[11px]">
                    Passer de 3.8 à 4.7★ sur Google Maps génère +20% de réservations.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Pitch Checklist */}
          <div className="glass-card-dark border border-amber-500/40 rounded-3xl p-6 sm:p-7 space-y-3">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-amber-400" />
              <span>La Phrase Choc à dire au Patron en 15 secondes :</span>
            </div>
            <blockquote className="text-sm sm:text-base font-semibold text-white italic border-l-4 border-amber-500 pl-4 py-1 leading-relaxed">
              « Pour 100 €, je vous pose des chevalets QR étanches et des puces pour vos serveurs. Vos serveurs gagnent +40% de pourboires sans que ça vous coûte 1 centime, et notre filtre intelligent bloque les mauvais avis en interne tout en envoyant les 5 étoiles sur votre fiche Google Maps. »
            </blockquote>
          </div>
        </div>
      )}

      {/* TAB 1: App Didacticiel */}
      {activeTab === 'tutorial' && (
        <div className="space-y-8 animate-in fade-in">
          <div className="glass-card-dark rounded-3xl p-6 sm:p-7 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Chaque Restaurant a son Propre Dashboard Privé</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Chaque établissement dispose d'un espace 100% isolé avec son propre identifiant, son mot de passe PIN et son lien direct :
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="glass-card-dark p-3.5 rounded-2xl border border-white/10">
                <div className="font-bold text-white">1. URL Unique par Restaurant</div>
                <div className="text-[11px] text-amber-400 font-mono mt-0.5 truncate">
                  {getRestaurantDashboardUrl(restaurant.id)}
                </div>
              </div>
              <div className="glass-card-dark p-3.5 rounded-2xl border border-white/10">
                <div className="font-bold text-white">2. Équipe & Tables Cloisonnées</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  David ne voit que ses serveurs. Vos autres clients restent totalement isolés.
                </div>
              </div>
              <div className="glass-card-dark p-3.5 rounded-2xl border border-white/10">
                <div className="font-bold text-white">3. Portail Super-Admin</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Vous (le fondateur) supervisez tous vos clients en 1 clic.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Sales Strategy */}
      {activeTab === 'sales_strategy' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="glass-card-dark rounded-3xl p-6 border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Message Instagram / WhatsApp Prêt à Envoyer
                </h3>
              </div>
              <button
                onClick={() => copyToClipboard(instagramPitch, true)}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-xs"
              >
                {copiedPitch ? <Check className="w-3.5 h-3.5 text-slate-950" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPitch ? 'Copié !' : 'Copier le message'}</span>
              </button>
            </div>
            <div className="p-4 bg-slate-950 rounded-2xl border border-white/10 text-[11px] font-mono text-slate-300 whitespace-pre-wrap leading-relaxed">
              {instagramPitch}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Waiter Table Script */}
      {activeTab === 'server_script' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="glass-card-dark p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-4 max-w-2xl mx-auto text-center relative overflow-hidden">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              Le Script Parfait pour les Serveurs en Salle
            </h2>
            <p className="text-xs text-slate-400">
              Donnez cette fiche imprimable à l'équipe en salle pour qu'ils sachent exactement quoi dire sans insister.
            </p>

            <div className="p-5 bg-slate-950 rounded-2xl border border-white/10 text-left relative">
              <button
                onClick={() => copyToClipboard(serverTableScript, false)}
                className="absolute top-3 right-3 p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs flex items-center gap-1 cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? 'Copié !' : 'Copier'}</span>
              </button>
              <div className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-2">
                Mot-à-mot en déposant l'addition :
              </div>
              <p className="text-sm font-medium text-slate-200 italic leading-relaxed whitespace-pre-wrap">
                {serverTableScript}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Restaurant Owner Walkthrough Modal */}
      <RestaurantOwnerTutorialModal
        isOpen={isModalWalkthroughOpen}
        onClose={() => setIsModalWalkthroughOpen(false)}
      />
    </div>
  );
};
