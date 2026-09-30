import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { FaqItem } from '../types';
import {
  HelpCircle,
  Plus,
  Edit3,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Search,
  Sparkles,
  RefreshCw,
  Smartphone,
  ShieldCheck,
  CreditCard,
  Star,
  Utensils,
  Radio,
  Sliders,
  ArrowUpDown,
  BookOpen,
  Copy,
  Info
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

const CATEGORY_CONFIG: Record<
  FaqItem['category'],
  { label: string; icon: React.FC<{ className?: string }>; color: string; badgeClass: string }
> = {
  paiement: {
    label: 'Paiement & Pourboire',
    icon: CreditCard,
    color: 'text-emerald-400',
    badgeClass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
  },
  service: {
    label: 'Service & Liaison NFC',
    icon: Radio,
    color: 'text-cyan-400',
    badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
  },
  reputation: {
    label: 'Avis & Google Maps',
    icon: Star,
    color: 'text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
  },
  restaurant: {
    label: 'Établissement & Facture',
    icon: Utensils,
    color: 'text-purple-400',
    badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30'
  },
  general: {
    label: 'Général & Sécurité',
    icon: ShieldCheck,
    color: 'text-blue-400',
    badgeClass: 'bg-blue-500/15 text-blue-300 border-blue-500/30'
  }
};

const SUGGESTED_TEMPLATES: Array<Omit<FaqItem, 'id' | 'restaurantId' | 'order'>> = [
  {
    question: 'Puis-je utiliser mes Titres-Restaurant ou chèques vacances ?',
    answer: 'Oui, nous acceptons les cartes Titres-Restaurant (Swile, Edenred, Bimpli, etc.) sur notre terminal physique en caisse.',
    category: 'paiement',
    isPublic: true
  },
  {
    question: 'Avez-vous des plats végétariens ou sans gluten au menu ?',
    answer: 'Notre chef propose chaque jour des options végétariennes créatives et signale les allergènes sur simple demande auprès de notre équipe.',
    category: 'restaurant',
    isPublic: true
  },
  {
    question: 'Comment réserver une table pour un groupe (+8 personnes) ?',
    answer: 'Pour les grands groupes et événements d’entreprise, contactez directement la direction par téléphone ou via notre formulaire de contact.',
    category: 'service',
    isPublic: true
  },
  {
    question: 'Mes avis restent-ils anonymes si je signale un point d’amélioration ?',
    answer: 'Oui, vos remarques privées sont transmises confidentiellement au gérant pour nous permettre d’ajuster notre service sans être publiées en ligne.',
    category: 'reputation',
    isPublic: true
  }
];

export const ManagerFaqManager: React.FC = () => {
  const { restaurant, faqItems, addFaqItem, updateFaqItem, deleteFaqItem, resetFaqItems, setMode } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [expandedPreviewId, setExpandedPreviewId] = useState<string | null>(faqItems[0]?.id || null);

  // Form State for Create / Edit
  const [formQuestion, setFormQuestion] = useState<string>('');
  const [formAnswer, setFormAnswer] = useState<string>('');
  const [formCategory, setFormCategory] = useState<FaqItem['category']>('paiement');
  const [formIsPublic, setFormIsPublic] = useState<boolean>(true);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Start Editing an existing FAQ item
  const handleStartEdit = (item: FaqItem) => {
    setEditingItemId(item.id);
    setIsCreatingNew(false);
    setFormQuestion(item.question);
    setFormAnswer(item.answer);
    setFormCategory(item.category);
    setFormIsPublic(item.isPublic);
    soundFX.playHoverTick();
  };

  // Start Creating a new FAQ item
  const handleStartCreate = () => {
    setIsCreatingNew(true);
    setEditingItemId(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormCategory('paiement');
    setFormIsPublic(true);
    soundFX.playHoverTick();
  };

  // Cancel edit or create
  const handleCancelForm = () => {
    setEditingItemId(null);
    setIsCreatingNew(false);
    setFormQuestion('');
    setFormAnswer('');
    soundFX.playHoverTick();
  };

  // Save changes (Create or Update)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formQuestion.trim() || !formAnswer.trim()) return;

    if (isCreatingNew) {
      addFaqItem({
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        category: formCategory,
        isPublic: formIsPublic,
        order: faqItems.length + 1
      });
      setStatusMessage('Nouvelle question ajoutée à la FAQ client !');
    } else if (editingItemId) {
      updateFaqItem(editingItemId, {
        question: formQuestion.trim(),
        answer: formAnswer.trim(),
        category: formCategory,
        isPublic: formIsPublic
      });
      setStatusMessage('Réponse mise à jour avec succès !');
    }

    handleCancelForm();
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Toggle public/private visibility
  const handleToggleVisibility = (item: FaqItem) => {
    updateFaqItem(item.id, { isPublic: !item.isPublic });
  };

  // Apply a suggested template in 1 click
  const handleApplyTemplate = (tmpl: Omit<FaqItem, 'id' | 'restaurantId' | 'order'>) => {
    addFaqItem({
      ...tmpl,
      order: faqItems.length + 1
    });
    soundFX.playSuccessChime();
    setStatusMessage(`Modèle "${tmpl.question.substring(0, 30)}..." ajouté !`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Move item up / down in display order
  const handleMoveOrder = (item: FaqItem, direction: 'up' | 'down') => {
    const currentIndex = faqItems.findIndex(f => f.id === item.id);
    if (currentIndex === -1) return;
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= faqItems.length) return;

    const targetItem = faqItems[targetIndex];
    updateFaqItem(item.id, { order: targetItem.order });
    updateFaqItem(targetItem.id, { order: item.order });
    soundFX.playHoverTick();
  };

  // Filtered list
  const filteredFaqs = faqItems.filter(item => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    const query = searchQuery.toLowerCase().trim();
    const matchesQuery =
      !query ||
      item.question.toLowerCase().includes(query) ||
      item.answer.toLowerCase().includes(query);
    return matchesCategory && matchesQuery;
  });

  const publicFaqsCount = faqItems.filter(f => f.isPublic).length;

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="glass-card-dark rounded-3xl p-6 sm:p-7 border border-amber-500/30 shadow-2xl relative overflow-hidden">
        <div className="hud-bracket-tl"></div>
        <div className="hud-bracket-br"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="text-xs uppercase font-mono tracking-widest text-amber-400 font-bold">
                Gestionnaire de Questions Fréquentes (FAQ Client)
              </span>
              <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-500/30 font-bold">
                {publicFaqsCount} / {faqItems.length} Actives aux clients
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Personnalisez les Réponses Affichées aux Clients de {restaurant.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Répondez d'avance aux interrogations de vos convives sur les pourboires dématérialisés, le sans-contact NFC, la sécurité bancaire, les avis Google et les services de votre restaurant.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleStartCreate}
              className="px-4 py-2.5 bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>Ajouter une Question</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('client');
                soundFX.playNfcTap();
              }}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl border border-white/15 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-amber-400" />
              <span>Tester Vue Client</span>
            </button>
          </div>
        </div>

        {/* Feedback Message */}
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-2 text-xs text-emerald-300 font-semibold"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </motion.div>
        )}
      </div>

      {/* Main 2-Column Layout: Left (Editor & FAQ List), Right (Live Smartphone Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: List & Inline Editor */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Search & Category Filter Pills */}
          <div className="glass-card-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Rechercher une question ou réponse..."
                  className="w-full bg-white/5 border border-white/15 focus:border-amber-400 rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={resetFaqItems}
                className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1.5 transition-colors cursor-pointer px-2 py-1"
                title="Rétablir les questions standards d'origine"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Rétablir Défauts</span>
              </button>
            </div>

            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                  soundFX.playHoverTick();
                }}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap ${
                  selectedCategory === 'all'
                    ? 'bg-amber-500 text-slate-950 shadow-xs'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Toutes ({faqItems.length})
              </button>

              {(Object.keys(CATEGORY_CONFIG) as Array<FaqItem['category']>).map(catKey => {
                const isSelected = selectedCategory === catKey;
                const catInfo = CATEGORY_CONFIG[catKey];
                const count = faqItems.filter(f => f.category === catKey).length;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(catKey);
                      soundFX.playHoverTick();
                    }}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-xs font-black'
                        : 'bg-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <span>{catInfo.label}</span>
                    <span className="text-[10px] opacity-75 font-mono">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Creation / Edit Form Modal Box */}
          <AnimatePresence>
            {(isCreatingNew || editingItemId) && (
              <motion.form
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleSaveForm}
                className="glass-card-dark rounded-3xl p-6 border-2 border-amber-500/50 shadow-2xl bg-linear-to-b from-slate-900 via-slate-950 to-slate-950 space-y-4"
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-black text-white">
                      {isCreatingNew ? 'Créer une Nouvelle Question / Réponse' : 'Modifier la Réponse Client'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Form Fields */}
                <div className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Question posée par le convive :
                    </label>
                    <input
                      type="text"
                      required
                      value={formQuestion}
                      onChange={e => setFormQuestion(e.target.value)}
                      placeholder="Ex: Le pourboire est-il obligatoire ?"
                      className="w-full bg-white/5 border border-white/15 focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-white text-xs outline-none font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-slate-300 font-semibold block mb-1">
                      Réponse affichée au client :
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formAnswer}
                      onChange={e => setFormAnswer(e.target.value)}
                      placeholder="Ex: Non, le pourboire reste à votre libre appréciation pour récompenser l'attention portée par votre serveur..."
                      className="w-full bg-white/5 border border-white/15 focus:border-amber-400 rounded-xl p-3 text-white text-xs outline-none leading-relaxed resize-none font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="text-slate-300 font-semibold block mb-1">
                        Catégorie thématique :
                      </label>
                      <select
                        value={formCategory}
                        onChange={e => setFormCategory(e.target.value as FaqItem['category'])}
                        className="w-full bg-slate-900 border border-white/15 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none font-medium cursor-pointer"
                      >
                        {(Object.keys(CATEGORY_CONFIG) as Array<FaqItem['category']>).map(catKey => (
                          <option key={catKey} value={catKey} className="bg-slate-950 text-white">
                            {CATEGORY_CONFIG[catKey].label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2.5 p-2 bg-white/5 border border-white/10 rounded-xl cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsPublic}
                          onChange={e => setFormIsPublic(e.target.checked)}
                          className="rounded text-amber-500 focus:ring-amber-400 bg-white/10 border-white/20"
                        />
                        <span className="text-xs text-white font-medium">
                          {formIsPublic ? '✓ Visible par les clients' : 'Masqué temporairement'}
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                  <button
                    type="button"
                    onClick={handleCancelForm}
                    className="px-4 py-2 text-xs font-bold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-black text-slate-950 bg-linear-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md transition-all active:scale-95"
                  >
                    {isCreatingNew ? 'Enregistrer la Question' : 'Sauvegarder les Modifications'}
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>

          {/* List of FAQ Cards */}
          <div className="space-y-3">
            {filteredFaqs.length === 0 ? (
              <div className="glass-card-dark rounded-3xl p-8 text-center space-y-3 border border-white/10">
                <HelpCircle className="w-10 h-10 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">Aucune question trouvée</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Aucun élément ne correspond à votre filtre. Cliquez sur "Ajouter une Question" ou choisissez un modèle ci-dessous.
                </p>
                <button
                  type="button"
                  onClick={handleStartCreate}
                  className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow-md"
                >
                  Ajouter ma première question
                </button>
              </div>
            ) : (
              filteredFaqs.map((item, idx) => {
                const catInfo = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general;
                const IconComponent = catInfo.icon;
                const isBeingEdited = editingItemId === item.id;

                return (
                  <motion.div
                    key={item.id}
                    layout
                    className={`glass-card-dark rounded-2xl p-4 sm:p-5 border transition-all ${
                      isBeingEdited
                        ? 'border-amber-400 bg-amber-500/10 shadow-lg'
                        : item.isPublic
                        ? 'border-white/10 hover:border-white/20'
                        : 'border-white/5 opacity-60 bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full border flex items-center gap-1 ${catInfo.badgeClass}`}
                          >
                            <IconComponent className="w-3 h-3" />
                            <span>{catInfo.label}</span>
                          </span>

                          <button
                            type="button"
                            onClick={() => handleToggleVisibility(item)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer ${
                              item.isPublic
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                            title={item.isPublic ? 'Cliquez pour masquer' : 'Cliquez pour publier'}
                          >
                            {item.isPublic ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            <span>{item.isPublic ? 'En Ligne' : 'Masqué'}</span>
                          </button>
                        </div>

                        <h4 className="text-sm font-bold text-white leading-snug">{item.question}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed font-normal">{item.answer}</p>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0 pt-1">
                        {/* Move Up */}
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(item, 'up')}
                          disabled={idx === 0}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-25 transition-colors cursor-pointer"
                          title="Remonter"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>

                        {/* Move Down */}
                        <button
                          type="button"
                          onClick={() => handleMoveOrder(item, 'down')}
                          disabled={idx === filteredFaqs.length - 1}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white disabled:opacity-25 transition-colors cursor-pointer"
                          title="Descendre"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleStartEdit(item)}
                          className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 transition-colors cursor-pointer"
                          title="Modifier la réponse"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm('Voulez-vous supprimer cette question de la FAQ ?')) {
                              deleteFaqItem(item.id);
                            }
                          }}
                          className="p-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-colors cursor-pointer"
                          title="Supprimer la question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>

          {/* Suggested Templates Accordion / Quick Add */}
          <div className="glass-card-dark rounded-3xl p-5 border border-white/10 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Modèles de Questions Fréquentes Prêts à l'Emploi</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Cliquez sur un modèle pour l'ajouter instantanément à votre guide client :
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {SUGGESTED_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyTemplate(tmpl)}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-amber-400/40 rounded-2xl text-left transition-all cursor-pointer group space-y-1"
                >
                  <div className="text-xs font-bold text-white group-hover:text-amber-300 flex items-center justify-between">
                    <span className="truncate">{tmpl.question}</span>
                    <Plus className="w-3.5 h-3.5 text-amber-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2">{tmpl.answer}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Smartphone Client Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card-dark rounded-3xl p-6 border border-white/10 shadow-2xl space-y-4 relative overflow-hidden sticky top-20">
            <div className="hud-bracket-tl"></div>
            <div className="hud-bracket-br"></div>

            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-black text-white">Aperçu Smartphone Client en Direct</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/20 px-2 py-0.5 rounded-full">
                SYNCHRO DIRECTE
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Voici l'accordéon interactif tel qu'il s'affiche sur les smartphones de vos convives après scan du chevalet de table ou du badge NFC :
            </p>

            {/* Smartphone Mockup Container */}
            <div className="p-4 bg-slate-950 rounded-[32px] border-2 border-white/15 shadow-2xl max-w-sm mx-auto space-y-4">
              
              {/* Dynamic Island Header */}
              <div className="h-4 px-3 bg-slate-900 rounded-full mx-auto flex items-center justify-between max-w-[120px]">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span className="text-[7px] font-mono text-slate-400">NFC 13.56M</span>
              </div>

              {/* Restaurant Mini Header */}
              <div className="text-center space-y-1 pb-2 border-b border-white/10">
                <div className="text-[9px] uppercase font-mono tracking-widest text-amber-400 font-bold">
                  {restaurant.name} · Table Client
                </div>
                <h4 className="text-xs font-bold text-white flex items-center justify-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                  <span>Questions Fréquentes & Aide</span>
                </h4>
              </div>

              {/* Client Accordion List in Mockup */}
              <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
                {faqItems.filter(f => f.isPublic).length === 0 ? (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    Aucune question publique active. Activez le bouton "En Ligne" pour les afficher ici.
                  </div>
                ) : (
                  faqItems
                    .filter(f => f.isPublic)
                    .map(item => {
                      const isExpanded = expandedPreviewId === item.id;
                      const catInfo = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.general;
                      const IconComponent = catInfo.icon;

                      return (
                        <div
                          key={item.id}
                          className={`rounded-xl border transition-all overflow-hidden ${
                            isExpanded
                              ? 'border-amber-400/50 bg-amber-500/10'
                              : 'border-white/10 bg-white/5'
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setExpandedPreviewId(isExpanded ? null : item.id);
                              soundFX.playHoverTick();
                            }}
                            className="w-full p-2.5 text-left flex items-center justify-between gap-2 cursor-pointer"
                          >
                            <span className="text-xs font-bold text-white flex items-center gap-1.5">
                              <IconComponent className={`w-3 h-3 ${catInfo.color}`} />
                              <span className="truncate">{item.question}</span>
                            </span>
                            <ChevronDown
                              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                                isExpanded ? 'rotate-180 text-amber-400' : ''
                              }`}
                            />
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="px-2.5 pb-2.5 text-[11px] text-slate-300 leading-relaxed border-t border-white/5 pt-1.5"
                              >
                                {item.answer}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })
                )}
              </div>

              {/* Bottom Home Indicator */}
              <div className="w-20 h-1 bg-slate-700 rounded-full mx-auto mt-2"></div>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode('client')}
                className="text-xs text-amber-400 hover:text-amber-300 font-bold underline cursor-pointer"
              >
                Ouvrir la page client complète en plein écran →
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
