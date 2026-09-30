import { Review, Waiter } from '../types';

export type TimeGranularity = 'daily' | 'weekly' | 'monthly';

export interface DataPoint {
  id: string;
  date: Date;
  label: string;
  shortLabel: string;
  subLabel?: string;
  tipRevenue: number;
  reviewCount: number;
  avgRating: number;
  googleClicks: number;
  satisfactionScore: number; // Percentage (0-100%)
  serverBreakdown: {
    [waiterId: string]: {
      waiterName: string;
      tips: number;
      reviews: number;
      avgRating: number;
    };
  };
}

export interface AnalyticsSummary {
  totalTips: number;
  totalReviews: number;
  avgRating: number;
  tipGrowthRate: number; // percentage change vs previous period
  ratingGrowth: number; // absolute change vs baseline or previous period
  topServerName: string;
  topServerTips: number;
  peakDayLabel: string;
  peakDayTips: number;
  googleConversionRate: number;
}

// Generate realistic historical review seed data spanning the last 180 days (6 months)
export const generateRealisticHistoricalReviews = (
  restaurantId: string,
  waiters: Waiter[],
  baselineRating: number = 2.0
): Review[] => {
  const reviews: Review[] = [];
  const now = new Date();
  
  // 180 days timeline
  const totalDays = 180;
  
  // Comments sample bank
  const positiveComments = [
    'Service exceptionnel et très souriant !',
    'Très bonne recommandation pour le vin et les desserts.',
    'Ambiance chaleureuse et prise en charge rapide avec le sans contact.',
    'David et son équipe ont été aux petits soins du début à la fin.',
    'Parfait pour notre dîner professionnel, tout était fluide.',
    'Serveur très prévenant et discret, merci beaucoup !',
    'La terrasse est top et le service impeccable.',
    'Le paiement du pourboire en NFC est ultra pratique !'
  ];

  const midComments = [
    'Bon repas dans l’ensemble, un peu d’attente au début mais serveur agréable.',
    'Cadre très sympathique, plats de qualité.',
    'Service correct et soigné.'
  ];

  const complimentsList = [
    ['Sourire & Accueil chaleureux', 'Service ultra-rapide'],
    ['Excellents conseils vins & plats', 'Très attentionné & pro'],
    ['Ambiance au top', 'Sourire & Accueil chaleureux'],
    ['Discret et efficace', 'Excellents conseils vins & plats'],
    ['Très attentionné & pro', 'Service ultra-rapide']
  ];

  const waiterPool = waiters.length > 0 ? waiters : [
    { id: 'waiter-david', name: 'David' },
    { id: 'waiter-sarah', name: 'Sarah' },
    { id: 'waiter-lucas', name: 'Lucas' }
  ];

  for (let day = totalDays; day >= 1; day--) {
    const date = new Date(now.getTime() - day * 24 * 60 * 60 * 1000);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6;

    // Progression ratio from 0 (6 months ago) to 1 (today)
    const progress = (totalDays - day) / totalDays;
    
    // Rating progresses from baseline (2.0-2.5) up to 4.85-5.0
    const currentBaseRating = baselineRating + (4.9 - baselineRating) * Math.pow(progress, 0.7);

    // Number of reviews per day (more on weekends and higher later in time as NFC adoption grew)
    const baseCount = isWeekend ? 3 + Math.floor(Math.random() * 3) : 1 + Math.floor(Math.random() * 3);
    const reviewCountToday = Math.max(1, Math.round(baseCount * (0.6 + 0.5 * progress)));

    for (let r = 0; r < reviewCountToday; r++) {
      const waiter = waiterPool[(day + r) % waiterPool.length];
      const tableNumber = 1 + ((day * 3 + r * 5) % 16);

      // Add noise to rating
      const ratingVariance = (Math.random() - 0.3) * 0.8;
      let rating = Math.min(5, Math.max(1, Math.round((currentBaseRating + ratingVariance) * 2) / 2));
      if (progress > 0.6 && Math.random() > 0.25) {
        rating = Math.random() > 0.3 ? 5 : 4.5;
      }

      // Tip amount scales with rating and progress
      let tip = 0;
      if (rating >= 4) {
        const tipChances = [2, 3, 5, 5, 8, 10];
        tip = tipChances[Math.floor(Math.random() * tipChances.length)];
      } else if (rating >= 3) {
        tip = Math.random() > 0.5 ? 2 : 0;
      }

      const isGoogleClicked = rating >= 4.5 && Math.random() > 0.35;
      const hour = 12 + (r % 2 === 0 ? Math.floor(Math.random() * 3) : 7 + Math.floor(Math.random() * 3));
      const minute = Math.floor(Math.random() * 60);
      const reviewDate = new Date(date);
      reviewDate.setHours(hour, minute, 0, 0);

      const comment = rating >= 4.5
        ? (Math.random() > 0.5 ? positiveComments[Math.floor(Math.random() * positiveComments.length)] : undefined)
        : (rating >= 3 ? midComments[Math.floor(Math.random() * midComments.length)] : undefined);

      reviews.push({
        id: `hist-rev-${day}-${r}`,
        restaurantId,
        waiterId: waiter.id,
        waiterName: waiter.name,
        tableNumber,
        rating,
        compliments: complimentsList[(day + r) % complimentsList.length],
        comment,
        tipAmount: tip,
        createdAt: reviewDate.toISOString(),
        googleReviewClicked: isGoogleClicked
      });
    }
  }

  return reviews;
};

// Aggregate reviews by Granularity (daily, weekly, monthly)
export const aggregateReviewData = (
  reviews: Review[],
  waiters: Waiter[],
  granularity: TimeGranularity,
  serverFilter: string = 'all',
  customDaysCount: number = 30
): { dataPoints: DataPoint[]; summary: AnalyticsSummary } => {
  const filtered = reviews.filter(r => {
    if (serverFilter !== 'all' && r.waiterId !== serverFilter) return false;
    return true;
  });

  const now = new Date();
  const dataPoints: DataPoint[] = [];

  if (granularity === 'daily') {
    // Generate buckets for the last N days (default 30 days)
    const daysCount = customDaysCount || 30;
    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const bucketReviews = filtered.filter(r => {
        const rDate = new Date(r.createdAt);
        return rDate >= startOfDay && rDate <= endOfDay;
      });

      const tipRevenue = bucketReviews.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
      const reviewCount = bucketReviews.length;
      const avgRating = reviewCount > 0
        ? Number((bucketReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2))
        : 5.0;
      const googleClicks = bucketReviews.filter(r => r.googleReviewClicked).length;
      const satisfactionScore = Math.round((avgRating / 5) * 100);

      const serverBreakdown: DataPoint['serverBreakdown'] = {};
      waiters.forEach(w => {
        const wRevs = bucketReviews.filter(r => r.waiterId === w.id);
        const wTips = wRevs.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
        const wAvg = wRevs.length > 0
          ? Number((wRevs.reduce((sum, r) => sum + r.rating, 0) / wRevs.length).toFixed(1))
          : 5.0;
        serverBreakdown[w.id] = {
          waiterName: w.name,
          tips: wTips,
          reviews: wRevs.length,
          avgRating: wAvg
        };
      });

      const dayFormat = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const weekdayFormat = d.toLocaleDateString('fr-FR', { weekday: 'short' });

      dataPoints.push({
        id: `d-${i}`,
        date: d,
        label: `${weekdayFormat} ${dayFormat}`,
        shortLabel: dayFormat,
        subLabel: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
        tipRevenue,
        reviewCount,
        avgRating,
        googleClicks,
        satisfactionScore,
        serverBreakdown
      });
    }
  } else if (granularity === 'weekly') {
    // Generate buckets for the last 12 weeks
    const weeksCount = 12;
    for (let w = weeksCount - 1; w >= 0; w--) {
      const endOfWeek = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000);
      const startOfWeek = new Date(endOfWeek.getTime() - 6 * 24 * 60 * 60 * 1000);
      startOfWeek.setHours(0, 0, 0, 0);
      endOfWeek.setHours(23, 59, 59, 999);

      const bucketReviews = filtered.filter(r => {
        const rDate = new Date(r.createdAt);
        return rDate >= startOfWeek && rDate <= endOfWeek;
      });

      const tipRevenue = bucketReviews.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
      const reviewCount = bucketReviews.length;
      const avgRating = reviewCount > 0
        ? Number((bucketReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2))
        : 5.0;
      const googleClicks = bucketReviews.filter(r => r.googleReviewClicked).length;
      const satisfactionScore = Math.round((avgRating / 5) * 100);

      const serverBreakdown: DataPoint['serverBreakdown'] = {};
      waiters.forEach(waiter => {
        const wRevs = bucketReviews.filter(r => r.waiterId === waiter.id);
        const wTips = wRevs.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
        const wAvg = wRevs.length > 0
          ? Number((wRevs.reduce((sum, r) => sum + r.rating, 0) / wRevs.length).toFixed(1))
          : 5.0;
        serverBreakdown[waiter.id] = {
          waiterName: waiter.name,
          tips: wTips,
          reviews: wRevs.length,
          avgRating: wAvg
        };
      });

      const startFmt = startOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
      const endFmt = endOfWeek.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

      dataPoints.push({
        id: `w-${w}`,
        date: endOfWeek,
        label: `Sem. ${weeksCount - w} (${startFmt} - ${endFmt})`,
        shortLabel: `S${weeksCount - w}`,
        subLabel: `${startFmt} au ${endFmt}`,
        tipRevenue,
        reviewCount,
        avgRating,
        googleClicks,
        satisfactionScore,
        serverBreakdown
      });
    }
  } else {
    // Monthly: last 6 months
    const monthsCount = 6;
    for (let m = monthsCount - 1; m >= 0; m--) {
      const d = new Date(now.getFullYear(), now.getMonth() - m, 1);
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);

      const bucketReviews = filtered.filter(r => {
        const rDate = new Date(r.createdAt);
        return rDate >= startOfMonth && rDate <= endOfMonth;
      });

      const tipRevenue = bucketReviews.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
      const reviewCount = bucketReviews.length;
      const avgRating = reviewCount > 0
        ? Number((bucketReviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2))
        : 4.8;
      const googleClicks = bucketReviews.filter(r => r.googleReviewClicked).length;
      const satisfactionScore = Math.round((avgRating / 5) * 100);

      const serverBreakdown: DataPoint['serverBreakdown'] = {};
      waiters.forEach(waiter => {
        const wRevs = bucketReviews.filter(r => r.waiterId === waiter.id);
        const wTips = wRevs.reduce((sum, r) => sum + (r.tipAmount || 0), 0);
        const wAvg = wRevs.length > 0
          ? Number((wRevs.reduce((sum, r) => sum + r.rating, 0) / wRevs.length).toFixed(1))
          : 4.8;
        serverBreakdown[waiter.id] = {
          waiterName: waiter.name,
          tips: wTips,
          reviews: wRevs.length,
          avgRating: wAvg
        };
      });

      const monthName = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      const shortMonth = d.toLocaleDateString('fr-FR', { month: 'short' });

      dataPoints.push({
        id: `m-${m}`,
        date: d,
        label: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        shortLabel: shortMonth.charAt(0).toUpperCase() + shortMonth.slice(1),
        subLabel: d.toLocaleDateString('fr-FR', { year: 'numeric' }),
        tipRevenue,
        reviewCount,
        avgRating,
        googleClicks,
        satisfactionScore,
        serverBreakdown
      });
    }
  }

  // Calculate Summary metrics
  const totalTips = dataPoints.reduce((sum, d) => sum + d.tipRevenue, 0);
  const totalReviews = dataPoints.reduce((sum, d) => sum + d.reviewCount, 0);
  const avgRating = totalReviews > 0
    ? Number((dataPoints.reduce((sum, d) => sum + d.avgRating * d.reviewCount, 0) / totalReviews).toFixed(2))
    : 5.0;

  // Compare first half with second half of dataPoints for growth calculation
  const halfLen = Math.floor(dataPoints.length / 2);
  const firstHalfTips = dataPoints.slice(0, halfLen).reduce((s, d) => s + d.tipRevenue, 0);
  const secondHalfTips = dataPoints.slice(halfLen).reduce((s, d) => s + d.tipRevenue, 0);
  const tipGrowthRate = firstHalfTips > 0
    ? Math.round(((secondHalfTips - firstHalfTips) / firstHalfTips) * 100)
    : 45;

  const firstRating = dataPoints[0]?.avgRating || 2.5;
  const lastRating = dataPoints[dataPoints.length - 1]?.avgRating || 4.9;
  const ratingGrowth = Number((lastRating - firstRating).toFixed(1));

  // Find peak day/period
  let peakPoint = dataPoints[0] || { label: '', tipRevenue: 0 };
  dataPoints.forEach(dp => {
    if (dp.tipRevenue > peakPoint.tipRevenue) {
      peakPoint = dp;
    }
  });

  // Top server calculations
  const waiterTotals: { [id: string]: { name: string; tips: number } } = {};
  dataPoints.forEach(dp => {
    Object.entries(dp.serverBreakdown).forEach(([wId, info]) => {
      if (!waiterTotals[wId]) {
        waiterTotals[wId] = { name: info.waiterName, tips: 0 };
      }
      waiterTotals[wId].tips += info.tips;
    });
  });

  let topServerName = waiters[0]?.name || 'Équipe';
  let topServerTips = 0;
  Object.values(waiterTotals).forEach(w => {
    if (w.tips > topServerTips) {
      topServerTips = w.tips;
      topServerName = w.name;
    }
  });

  const totalGoogleClicks = dataPoints.reduce((sum, d) => sum + d.googleClicks, 0);
  const googleConversionRate = totalReviews > 0
    ? Math.round((totalGoogleClicks / totalReviews) * 100)
    : 72;

  return {
    dataPoints,
    summary: {
      totalTips,
      totalReviews,
      avgRating,
      tipGrowthRate,
      ratingGrowth,
      topServerName,
      topServerTips,
      peakDayLabel: peakPoint.label || 'Semaine passée',
      peakDayTips: peakPoint.tipRevenue || 0,
      googleConversionRate
    }
  };
};
