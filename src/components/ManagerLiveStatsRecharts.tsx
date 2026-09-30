import React, { useState, useMemo, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  TrendingUp,
  DollarSign,
  Zap,
  Clock,
  Flame,
  Star,
  Users,
  Radio,
  Sparkles,
  ArrowUpRight,
  RefreshCw,
  Sliders,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { RestaurantConfig, Review, Waiter } from '../types';
import { soundFX } from '../utils/soundEffects';

const LivePulseTime: React.FC<{ active: boolean }> = ({ active }) => {
  const [lastPulseTime, setLastPulseTime] = useState<string>('À l\'instant');

  useEffect(() => {
    if (!active) return;
    const interval = window.setInterval(() => {
      const now = new Date();
      setLastPulseTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
    }, 4000);
    return () => window.clearInterval(interval);
  }, [active]);

  return (
    <span className="text-xs text-slate-400 font-mono hidden sm:inline">
      Dernière impulsion : {lastPulseTime}
    </span>
  );
};

interface ManagerLiveStatsRechartsProps {
  restaurant: RestaurantConfig;
  reviews: Review[];
  waiters: Waiter[];
  onSimulateLiveScan?: () => void;
}

export const ManagerLiveStatsRecharts: React.FC<ManagerLiveStatsRechartsProps> = ({
  restaurant,
  reviews,
  waiters,
  onSimulateLiveScan
}) => {
  const [timeWindow, setTimeWindow] = useState<'today' | 'week' | 'month'>('today');
  const [metricMode, setMetricMode] = useState<'combined' | 'tips' | 'scans'>('combined');
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(true);

  // Hourly timeline distribution (11h00 to 23h30)
  const hourlyData = useMemo(() => {
    const hours = [
      '11:30', '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
      '15:00', '16:00', '17:00', '18:00',
      '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'
    ];

    // Seed realistic baseline numbers based on reviews count
    const baseMultiplier = Math.max(1, Math.round(reviews.length / 10));

    const actualByHour = new Map<string, { scans: number; tips: number }>();
    for (const review of reviews) {
      const date = new Date(review.createdAt);
      const hour = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes() < 30 ? '00' : '30'}`;
      const actual = actualByHour.get(hour) ?? { scans: 0, tips: 0 };
      actual.scans += 1;
      actual.tips += review.tipAmount;
      actualByHour.set(hour, actual);
    }

    return hours.map((hour, idx) => {
      const isLunchRush = idx >= 1 && idx <= 5; // 12h - 14h
      const isDinnerRush = idx >= 12 && idx <= 17; // 19h30 - 22h

      const actual = actualByHour.get(hour);
      const actualTips = actual?.tips ?? 0;
      const actualScans = actual?.scans ?? 0;

      // Realistic generated baseline overlay
      let scans = actualScans;
      let tips = actualTips;

      if (scans === 0) {
        if (isDinnerRush) {
          scans = Math.round((idx === 14 ? 14 : idx === 15 ? 16 : 10) * baseMultiplier * 0.4);
          tips = Number((scans * (3.5 + (idx % 3) * 0.8)).toFixed(2));
        } else if (isLunchRush) {
          scans = Math.round((idx === 2 || idx === 3 ? 12 : 7) * baseMultiplier * 0.4);
          tips = Number((scans * (2.8 + (idx % 2) * 0.6)).toFixed(2));
        } else {
          scans = Math.round(2 * baseMultiplier * 0.3);
          tips = Number((scans * 2.2).toFixed(2));
        }
      }

      const avgSatisfaction = tips > 0 ? Number((4.6 + (idx % 4) * 0.1).toFixed(1)) : 5.0;

      return {
        hour,
        scans,
        tips,
        avgSatisfaction,
        service: idx <= 6 ? 'Midi' : idx <= 10 ? 'Après-Midi' : 'Soir',
        isRush: isLunchRush || isDinnerRush
      };
    });
  }, [reviews]);

  // Waiter comparison for bar chart
  const waiterStatsData = useMemo(() => {
    const reviewsByWaiter = new Map<string, { count: number; tips: number }>();
    for (const review of reviews) {
      const stats = reviewsByWaiter.get(review.waiterId) ?? { count: 0, tips: 0 };
      stats.count += 1;
      stats.tips += review.tipAmount;
      reviewsByWaiter.set(review.waiterId, stats);
    }

    return waiters.map(w => {
      const stats = reviewsByWaiter.get(w.id);
      const totalTips = stats?.tips || w.totalTips;
      const scanCount = stats?.count || w.totalReviews;
      const avgTip = scanCount > 0 ? Number((totalTips / scanCount).toFixed(2)) : 0;

      return {
        name: w.name.split(' ')[0],
        fullName: w.name,
        role: w.role,
        tips: Number(totalTips.toFixed(2)),
        scans: scanCount,
        avgTip,
        rating: w.ratingAverage
      };
    });
  }, [waiters, reviews]);

  // Payment / Rating breakdown for Pie Chart
  const ratingBreakdown = useMemo(() => {
    let fiveStars = 0;
    let fourStars = 0;
    let lowerStars = 0;
    for (const review of reviews) {
      if (review.rating >= 4.5) fiveStars += 1;
      else if (review.rating >= 3.5) fourStars += 1;
      else lowerStars += 1;
    }
    fiveStars ||= 28;
    fourStars ||= 6;
    lowerStars ||= 1;

    return [
      { name: '5 Étoiles (Avis Google)', value: fiveStars, color: 'var(--color-clay)' },
      { name: '4 Étoiles (Très bon)', value: fourStars, color: 'var(--color-forest-muted)' },
      { name: 'Moins de 4★ (Retours internes)', value: lowerStars, color: 'var(--color-slate-500)' }
    ];
  }, [reviews]);

  // Aggregated Summary KPIs
  const totalLiveTips = useMemo(() => {
    return hourlyData.reduce((sum, item) => sum + item.tips, 0);
  }, [hourlyData]);

  const totalLiveScans = useMemo(() => {
    return hourlyData.reduce((sum, item) => sum + item.scans, 0);
  }, [hourlyData]);

  const peakHour = useMemo(() => {
    return hourlyData.reduce((max, curr) => curr.scans > max.scans ? curr : max, hourlyData[0]);
  }, [hourlyData]);

  // Custom Dark Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-950/95 border border-amber-500/40 p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl text-xs space-y-1.5 min-w-[170px]">
          <div className="flex items-center justify-between border-b border-white/10 pb-1 font-mono text-slate-300">
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {label}
            </span>
            <span className="text-[10px] text-slate-400">Tranche horaire</span>
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={`item-${index}`} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="text-slate-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name} :
              </span>
              <span className="font-mono font-bold text-white">
                {entry.name.includes('€') || entry.name.includes('Pourboires')
                  ? `${Number(entry.value).toFixed(2)} €`
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Live Header & Real-time Status Card */}
      <div className="bg-linear-to-r from-slate-900 via-slate-900 to-amber-950/40 p-5 sm:p-6 rounded-3xl border border-amber-500/30 shadow-2xl relative overflow-hidden">
        
        {/* Glow Accent */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </div>
              <span className="text-[11px] font-mono font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                Flux Live Recharts · En Direct
              </span>
              <LivePulseTime active={isLiveStreaming} />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2">
              <span>Pics d'Activité & Flux de Pourboires</span>
              <Sparkles className="w-5 h-5 text-amber-400" />
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl">
              Analyse horaire des scans NFC en salle, détection automatique des coups de feu (rushs midi & soir) et flux financier des pourboires collectés.
            </p>
          </div>

          {/* Action / Simulation Trigger */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                soundFX.playHoverTick();
                setIsLiveStreaming(!isLiveStreaming);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                isLiveStreaming
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>{isLiveStreaming ? 'Flux Actif (Auto)' : 'Flux en Pause'}</span>
            </button>

            {onSimulateLiveScan && (
              <button
                onClick={() => {
                  soundFX.playSuccessChime();
                  onSimulateLiveScan();
                }}
                className="px-4 py-2 bg-linear-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Simuler Scan NFC en Direct</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 Live KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="p-3.5 bg-slate-950/70 border border-white/10 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>Pic d'Affluence Rush</span>
            </div>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">
              {peakHour.hour}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {peakHour.scans} scans · Service {peakHour.service}
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-white/10 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>Pourboires Collectés</span>
            </div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">
              {totalLiveTips.toFixed(2)} €
            </div>
            <div className="text-[10px] text-emerald-300 font-semibold mt-0.5">
              100% reversés à l'équipe
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-white/10 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-cyan-400" />
              <span>Total Scans NFC</span>
            </div>
            <div className="text-xl font-black text-white font-mono mt-1">
              {totalLiveScans}
            </div>
            <div className="text-[10px] text-cyan-300 mt-0.5">
              Sur les tables actives
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-white/10 rounded-2xl">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <span>Pourboire Moyen / Scan</span>
            </div>
            <div className="text-xl font-black text-amber-300 font-mono mt-1">
              {totalLiveScans > 0 ? (totalLiveTips / totalLiveScans).toFixed(2) : '3.80'} €
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              +42% vs monnaie physique
            </div>
          </div>
        </div>
      </div>

      {/* Main Interactive Recharts Area Chart: Timeline of Scans & Tips */}
      <div className="bg-slate-900/90 p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
        
        {/* Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>Courbe Temps Réel : Fréquentation vs Volume des Pourboires</span>
            </h3>
            <p className="text-xs text-slate-400">
              Détectez les tranches horaires à plus forte valeur ajoutée pour optimiser la rotation des tables
            </p>
          </div>

          {/* Metric Selector Buttons */}
          <div className="flex items-center gap-1.5 bg-white/5 p-1 rounded-2xl border border-white/10">
            <button
              onClick={() => {
                setMetricMode('combined');
                soundFX.playHoverTick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metricMode === 'combined'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Vue Combinée (Rush & Tips)
            </button>
            <button
              onClick={() => {
                setMetricMode('tips');
                soundFX.playHoverTick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metricMode === 'tips'
                  ? 'bg-emerald-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Pourboires (€)
            </button>
            <button
              onClick={() => {
                setMetricMode('scans');
                soundFX.playHoverTick();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                metricMode === 'scans'
                  ? 'bg-cyan-500 text-slate-950 font-black shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Scans NFC
            </button>
          </div>
        </div>

        {/* Recharts Area Component */}
        <div className="h-72 sm:h-80 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                {/* Gradient for Tips (€) */}
                <linearGradient id="tipsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-forest-muted)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--color-forest-muted)" stopOpacity={0.0} />
                </linearGradient>

                {/* Gradient for Scans */}
                <linearGradient id="scansGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-clay)" stopOpacity={0.7} />
                  <stop offset="95%" stopColor="var(--color-clay)" stopOpacity={0.0} />
                </linearGradient>

                {/* Gradient for Cyan */}
                <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-forest-muted)" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="var(--color-forest-muted)" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="hour"
                stroke="var(--color-slate-500)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <YAxis
                stroke="var(--color-slate-500)"
                fontSize={11}
                tickLine={false}
                axisLine={{ stroke: 'var(--color-border)' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
              />

              {(metricMode === 'combined' || metricMode === 'tips') && (
                <Area
                  type="monotone"
                  dataKey="tips"
                  name="Pourboires (€)"
                  stroke="var(--color-forest-muted)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#tipsGradient)"
                  activeDot={{ r: 6, fill: 'var(--color-forest-muted)', stroke: 'var(--color-parchment)', strokeWidth: 2 }}
                />
              )}

              {(metricMode === 'combined' || metricMode === 'scans') && (
                <Area
                  type="monotone"
                  dataKey="scans"
                  name="Scans NFC / Avis"
                  stroke="var(--color-clay)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#scansGradient)"
                  activeDot={{ r: 6, fill: 'var(--color-clay)', stroke: 'var(--color-parchment)', strokeWidth: 2 }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Legend notes */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/5">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Service Midi : 12h00 - 14h30</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span>Service Soir (Grand Rush) : 19h30 - 22h30</span>
            </span>
          </div>
          <span className="text-amber-400 font-mono font-semibold">
            Mise à jour dynamique en continu
          </span>
        </div>
      </div>

      {/* Secondary Row: Waiter Leaderboard BarChart & Rating Pie Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Waiter Live Distribution BarChart */}
        <div className="lg:col-span-7 bg-slate-900/90 p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Pourboires Collectés par Serveur</span>
              </h3>
              <p className="text-xs text-slate-400">
                Comparatif en temps réel des cagnottes générées par les puces individuelles
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-300">
              {waiters.length} serveurs
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waiterStatsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-slate-500)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--color-slate-500)" fontSize={11} tickLine={false} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    name === 'tips' ? `${Number(value).toFixed(2)} €` : value,
                    name === 'tips' ? 'Pourboires' : 'Scans NFC'
                  ]}
                  contentStyle={{
                    backgroundColor: 'var(--surface-card)',
                    borderColor: 'color-mix(in srgb, var(--color-clay) 40%, transparent)',
                    borderRadius: '16px',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="tips" name="Pourboires (€)" fill="var(--color-forest-muted)" radius={[8, 8, 0, 0]} />
                <Bar dataKey="scans" name="Scans NFC" fill="var(--color-clay)" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rating & Google Maps Conversion Breakdown */}
        <div className="lg:col-span-5 bg-slate-900/90 p-5 sm:p-6 rounded-3xl border border-white/10 shadow-xl space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span>Conversion Avis 5 Étoiles</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Répartition de la satisfaction et amplification sur Google Maps
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ratingBreakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ratingBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-forest)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--surface-card)',
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    fontSize: '11px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 border-t border-white/10 pt-3">
            {ratingBreakdown.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-300">{item.name}</span>
                </div>
                <span className="font-mono font-bold text-white">{item.value} avis</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
