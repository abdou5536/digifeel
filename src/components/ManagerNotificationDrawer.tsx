import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import {
  Bell,
  Star,
  Euro,
  X,
  Trash2,
  Check,
  CheckCheck,
  Sparkles,
  Zap,
  Filter,
  User,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react';
import { soundFX } from '../utils/soundEffects';

interface ManagerNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManagerNotificationDrawer: React.FC<ManagerNotificationDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const {
    managerNotifications,
    clearAllManagerNotifications,
    markNotificationAsRead,
    addReview,
    restaurant,
    waiters
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'reviews' | 'tips'>('all');

  if (!isOpen) return null;

  const isHotel = restaurant.establishmentType === 'hotel';

  const unreadCount = managerNotifications.filter(n => !n.read).length;

  const filteredNotifications = managerNotifications.filter(n => {
    if (filter === 'reviews') return n.type === 'new_review' || n.type === 'review_and_tip';
    if (filter === 'tips') return n.type === 'new_tip' || n.type === 'review_and_tip';
    return true;
  });

  const handleSimulateReviewAndTip = (stars: number, tip: number) => {
    if (waiters.length === 0) return;
    const randomWaiter = waiters[Math.floor(Math.random() * waiters.length)];
    const randomTable = randomWaiter.tablesAssigned && randomWaiter.tablesAssigned.length > 0
      ? randomWaiter.tablesAssigned[Math.floor(Math.random() * randomWaiter.tablesAssigned.length)]
      : Math.floor(Math.random() * 12) + 1;

    const complimentOptions = [
      'Sourire & Accueil chaleureux',
      'Service ultra-rapide',
      'Très bons conseils vin',
      'Attention particulière',
      'Ambiance au top'
    ];
    const commentsList = [
      'Expérience NFC incroyable au restaurant !',
      'Serveur aux petits soins du début à la fin.',
      'Rien à redire, paiement du pourboire rapide et sécurisé.',
      'Excellent moment passé en famille.'
    ];

    addReview({
      restaurantId: restaurant.id,
      waiterId: randomWaiter.id,
      waiterName: randomWaiter.name,
      tableNumber: randomTable,
      rating: stars,
      compliments: [complimentOptions[Math.floor(Math.random() * complimentOptions.length)]],
      comment: commentsList[Math.floor(Math.random() * commentsList.length)],
      tipAmount: tip,
      googleReviewClicked: stars >= 4
    });
  };

  const handleMarkAllRead = () => {
    managerNotifications.forEach(n => markNotificationAsRead(n.id));
    try {
      soundFX.playHoverTick();
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          className="w-screen max-w-md bg-[#0b101d] border-l border-white/10 text-white flex flex-col shadow-2xl relative"
        >
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 relative">
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-bold font-mono text-black flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Centre de Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {unreadCount} non lues
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Alertes en direct : Avis Google & Pourboires
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Quick Simulation Bar */}
          <div className="p-3 bg-amber-500/5 border-b border-white/10 flex flex-col gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              Simuler une alerte client en temps réel
            </span>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => handleSimulateReviewAndTip(5, 0)}
                className="p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-medium flex flex-col items-center justify-center gap-0.5 transition-all text-center"
              >
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>Note 5★</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateReviewAndTip(0, 6)}
                className="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 font-medium flex flex-col items-center justify-center gap-0.5 transition-all text-center"
              >
                <Euro className="w-3.5 h-3.5 text-emerald-400" />
                <span>Pourboire 6€</span>
              </button>

              <button
                type="button"
                onClick={() => handleSimulateReviewAndTip(5, 8.50)}
                className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/20 hover:from-amber-500/30 hover:to-emerald-500/30 border border-amber-400/30 text-white font-medium flex flex-col items-center justify-center gap-0.5 transition-all text-center"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>5★ + 8.50€</span>
              </button>
            </div>
          </div>

          {/* Filters & Actions Bar */}
          <div className="p-3 border-b border-white/10 flex items-center justify-between text-xs bg-black/20">
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filter === 'all' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Tous ({managerNotifications.length})
              </button>
              <button
                onClick={() => setFilter('reviews')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filter === 'reviews' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Avis ⭐
              </button>
              <button
                onClick={() => setFilter('tips')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  filter === 'tips' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Pourboires 💶
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors"
                  title="Tout marquer comme lu"
                >
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                </button>
              )}
              {managerNotifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAllManagerNotifications}
                  className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors"
                  title="Effacer l'historique"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Notifications Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center">
                <Bell className="w-10 h-10 mb-3 text-slate-600 opacity-40" />
                <p className="text-sm font-medium text-slate-400">Aucune notification pour l'instant</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs">
                  Alerte vos restaurateurs dès qu'un client dépose un avis 5★ ou verse un pourboire via la puce NFC.
                </p>
                <button
                  type="button"
                  onClick={() => handleSimulateReviewAndTip(5, 5)}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Générer un Test Live</span>
                </button>
              </div>
            ) : (
              filteredNotifications.map(notif => {
                const isTip = notif.type === 'new_tip' || notif.type === 'review_and_tip';
                const isReview = notif.type === 'new_review' || notif.type === 'review_and_tip';

                return (
                  <div
                    key={notif.id}
                    onClick={() => markNotificationAsRead(notif.id)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden ${
                      !notif.read
                        ? 'bg-slate-900/90 border-amber-500/40 shadow-lg shadow-amber-500/5'
                        : 'bg-white/5 border-white/10 opacity-75 hover:opacity-100'
                    }`}
                  >
                    {!notif.read && (
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-amber-400" />
                    )}

                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border text-xs font-bold ${
                          isTip && isReview
                            ? 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                            : isTip
                            ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-300'
                            : 'bg-amber-500/20 border-amber-400/40 text-amber-300'
                        }`}>
                          {isTip && isReview ? '🎉' : isTip ? '💶' : '⭐'}
                        </div>

                        <div>
                          <div className="text-xs font-bold text-white flex items-center gap-1">
                            <span>{notif.waiterName}</span>
                            <span className="text-slate-400 font-normal">
                              ({isHotel ? `Ch.${notif.tableNumber}` : `Table ${notif.tableNumber}`})
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Pill Badges */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {isReview && notif.rating > 0 && (
                          <span className="text-[11px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-lg border border-amber-500/30 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            {notif.rating.toFixed(1)}
                          </span>
                        )}
                        {isTip && notif.tipAmount > 0 && (
                          <span className="text-[11px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/30 flex items-center gap-0.5">
                            +{notif.tipAmount.toFixed(2)}€
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compliments / Comment */}
                    {notif.compliments && notif.compliments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {notif.compliments.map((c, i) => (
                          <span
                            key={i}
                            className="text-[10px] bg-white/10 text-slate-300 px-2 py-0.5 rounded-md"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    )}

                    {notif.comment && (
                      <p className="mt-2 text-xs text-slate-300 italic bg-black/40 p-2 rounded-xl border border-white/5">
                        "{notif.comment}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
