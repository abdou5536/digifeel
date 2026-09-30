import { RestaurantConfig, Review, Waiter, TableItem, TipSharingConfig, TipSharingMethod, TipPoolCalculationResult, WaiterTipDistribution } from '../types';

export const DEFAULT_TIP_SHARING_CONFIG: TipSharingConfig = {
  enabled: true,
  method: 'hours_worked',
  kitchenSupportCutPercentage: 10, // 10% for kitchen / bar / runners support
  individualRetentionPercentage: 50, // 50% kept directly in hybrid mode
  waiterHours: {
    'waiter-david': 35,
    'waiter-sarah': 28,
    'waiter-lucas': 32,
    'waiter-emma': 21
  },
  waiterCoefficients: {
    'waiter-david': 1.2, // Chef de rang
    'waiter-sarah': 1.0,
    'waiter-lucas': 1.0,
    'waiter-emma': 0.9  // Apprenti / Commis
  },
  payoutFrequency: 'weekly',
  updatedAt: new Date().toISOString()
};

/**
 * Pure calculation function for automated tip distribution
 */
export function calculateTipDistribution(
  config: TipSharingConfig,
  waiters: Waiter[],
  reviews: Review[],
  tables: TableItem[] = []
): TipPoolCalculationResult {
  if (!waiters || waiters.length === 0) {
    return {
      totalGrossTips: 0,
      totalKitchenCut: 0,
      netDistributableTips: 0,
      methodUsed: config.method,
      totalHoursWorked: 0,
      totalTablesServed: 0,
      distributions: []
    };
  }

  // 1. Calculate raw tips collected directly per waiter
  const rawTipsMap: { [waiterId: string]: number } = {};
  const tablesCountMap: { [waiterId: string]: number } = {};

  waiters.forEach(w => {
    rawTipsMap[w.id] = 0;
    tablesCountMap[w.id] = 0;
  });

  // Tally reviews if available, otherwise fallback to waiter totalTips baseline
  if (reviews.length > 0) {
    reviews.forEach(r => {
      if (rawTipsMap[r.waiterId] !== undefined) {
        rawTipsMap[r.waiterId] += r.tipAmount || 0;
        tablesCountMap[r.waiterId] += 1;
      }
    });
  } else {
    waiters.forEach(w => {
      rawTipsMap[w.id] = w.totalTips || 100;
      tablesCountMap[w.id] = w.totalReviews || 20;
    });
  }

  // Ensure reasonable minimums if review counts are 0
  waiters.forEach(w => {
    if (tablesCountMap[w.id] === 0) {
      tablesCountMap[w.id] = w.tablesAssigned?.length || 4;
    }
    if (rawTipsMap[w.id] === 0 && w.totalTips > 0) {
      rawTipsMap[w.id] = w.totalTips;
    }
  });

  const totalGrossTips = Object.values(rawTipsMap).reduce((sum, val) => sum + val, 0);
  const kitchenCutRate = Math.max(0, Math.min(50, config.kitchenSupportCutPercentage || 0)) / 100;
  const totalKitchenCut = totalGrossTips * kitchenCutRate;
  const netDistributableTips = totalGrossTips - totalKitchenCut;

  let totalHoursWorked = 0;
  let totalTablesServed = 0;

  waiters.forEach(w => {
    const hours = config.waiterHours?.[w.id] ?? 35;
    totalHoursWorked += hours;
    totalTablesServed += tablesCountMap[w.id] || 0;
  });

  // Calculate distributions according to the chosen method
  const distributions: WaiterTipDistribution[] = waiters.map(w => {
    const rawTips = rawTipsMap[w.id] || 0;
    const hoursWorked = config.waiterHours?.[w.id] ?? 35;
    const coeff = config.waiterCoefficients?.[w.id] ?? 1.0;
    const tablesServed = tablesCountMap[w.id] || 1;
    const kitchenContribution = rawTips * kitchenCutRate;

    let finalCalculatedPayout = 0;

    switch (config.method) {
      case 'hours_worked': {
        // Prorata based on hours worked * role coefficient
        const weightedHours = hoursWorked * coeff;
        const totalWeightedHours = waiters.reduce((sum, other) => {
          const h = config.waiterHours?.[other.id] ?? 35;
          const c = config.waiterCoefficients?.[other.id] ?? 1.0;
          return sum + h * c;
        }, 0);

        const ratio = totalWeightedHours > 0 ? weightedHours / totalWeightedHours : 1 / waiters.length;
        finalCalculatedPayout = netDistributableTips * ratio;
        break;
      }

      case 'table_volume': {
        // Prorata based on customer volume / tables served
        const totalVolume = totalTablesServed > 0 ? totalTablesServed : waiters.length;
        const ratio = tablesServed / totalVolume;
        finalCalculatedPayout = netDistributableTips * ratio;
        break;
      }

      case 'hybrid_pool': {
        // Hybrid: Waiter keeps individualRetentionPercentage% direct; rest goes to common pool distributed by hours
        const retentionRate = (config.individualRetentionPercentage || 50) / 100;
        const directKept = rawTips * retentionRate;
        const pooledGross = rawTips * (1 - retentionRate);
        const pooledAfterKitchen = pooledGross * (1 - kitchenCutRate);

        // Pool total across all waiters
        const totalPooledAfterKitchen = Object.values(rawTipsMap).reduce((sum, r) => sum + r * (1 - retentionRate) * (1 - kitchenCutRate), 0);
        
        // Distribution of pool by hours worked
        const weightedHours = hoursWorked * coeff;
        const totalWeightedHours = waiters.reduce((sum, other) => {
          const h = config.waiterHours?.[other.id] ?? 35;
          const c = config.waiterCoefficients?.[other.id] ?? 1.0;
          return sum + h * c;
        }, 0);
        const poolRatio = totalWeightedHours > 0 ? weightedHours / totalWeightedHours : 1 / waiters.length;
        
        // Direct retained portion minus its share of kitchen support
        const directNet = directKept * (1 - kitchenCutRate);
        finalCalculatedPayout = directNet + (totalPooledAfterKitchen * poolRatio);
        break;
      }

      case 'equal_split': {
        // 100% equal division among all active waiters
        finalCalculatedPayout = waiters.length > 0 ? netDistributableTips / waiters.length : 0;
        break;
      }

      case 'individual':
      default: {
        // 100% direct retention minus kitchen support cut
        finalCalculatedPayout = rawTips * (1 - kitchenCutRate);
        break;
      }
    }

    const differenceVsRaw = finalCalculatedPayout - rawTips;
    const sharePercentage = totalGrossTips > 0 ? (finalCalculatedPayout / (netDistributableTips || 1)) * 100 : 0;

    return {
      waiterId: w.id,
      waiterName: w.name,
      role: w.role,
      rawTipsCollected: Number(rawTips.toFixed(2)),
      hoursWorked,
      tablesServedCount: tablesServed,
      kitchenContribution: Number(kitchenContribution.toFixed(2)),
      finalCalculatedPayout: Number(finalCalculatedPayout.toFixed(2)),
      differenceVsRaw: Number(differenceVsRaw.toFixed(2)),
      sharePercentage: Number(sharePercentage.toFixed(1))
    };
  });

  return {
    totalGrossTips: Number(totalGrossTips.toFixed(2)),
    totalKitchenCut: Number(totalKitchenCut.toFixed(2)),
    netDistributableTips: Number(netDistributableTips.toFixed(2)),
    methodUsed: config.method,
    totalHoursWorked,
    totalTablesServed,
    distributions
  };
}

/**
 * Generate CSV export for automated tip sharing payroll report
 */
export function generateTipSharingCsv(
  result: TipPoolCalculationResult,
  restaurant: RestaurantConfig
): string {
  const methodLabels: Record<TipSharingMethod, string> = {
    hours_worked: 'Prorata Temps de Service (Heures travaillées)',
    table_volume: 'Prorata Volume de Clients par Table',
    hybrid_pool: 'Modèle Hybride (Direct + Pot Commun)',
    equal_split: 'Pot Commun Égalitaire',
    individual: '100% Individuel Direct'
  };

  const headers = [
    'Nom du Serveur',
    'Poste / Rôle',
    'Pourboires Bruts Collectés (€)',
    'Heures Travaillées',
    'Volume Tables / Clients',
    'Quote-part Calculée (%)',
    'Part Soutien Cuisine/Bar (€)',
    'Versement Net Final (€)',
    'Écart vs Collecte Directe (€)'
  ];

  const rows = result.distributions.map(d => [
    `"${d.waiterName}"`,
    `"${d.role}"`,
    d.rawTipsCollected.toFixed(2).replace('.', ','),
    d.hoursWorked.toString(),
    d.tablesServedCount.toString(),
    `${d.sharePercentage.toFixed(1)}%`,
    d.kitchenContribution.toFixed(2).replace('.', ','),
    d.finalCalculatedPayout.toFixed(2).replace('.', ','),
    (d.differenceVsRaw >= 0 ? `+${d.differenceVsRaw.toFixed(2)}` : d.differenceVsRaw.toFixed(2)).replace('.', ',')
  ]);

  const summary = [
    [],
    ['=== RECAPITULATIF REPARTITION DIGIFEEL ==='],
    ['Etablissement', `"${restaurant.name}"`],
    ['Regle de Partage Appliquee', `"${methodLabels[result.methodUsed]}"`],
    ['Total Brut Collecte', `${result.totalGrossTips.toFixed(2).replace('.', ',')} €`],
    ['Part Prelevee Cuisine / Bar', `${result.totalKitchenCut.toFixed(2).replace('.', ',')} €`],
    ['Total Net Redistribue a l\'Equipe', `${result.netDistributableTips.toFixed(2).replace('.', ',')} €`],
    ['Total Heures de Service', `${result.totalHoursWorked} h`],
    ['Total Tables Servies', `${result.totalTablesServed} tables`],
    ['Date du Calcul', `"${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}"`],
    ['Cadre Fiscal', '"Exonération de cotisations sociales et d\'impôt sur le revenu (Loi de Finances / URSSAF)"']
  ];

  const csvContent = '\uFEFF' + [
    headers.join(';'),
    ...rows.map(r => r.join(';')),
    ...summary.map(s => s.join(';'))
  ].join('\r\n');

  return csvContent;
}

/**
 * Download CSV helper
 */
export function downloadTipSharingCsv(
  result: TipPoolCalculationResult,
  restaurant: RestaurantConfig
) {
  const csvData = generateTipSharingCsv(result, restaurant);
  const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeName = restaurant.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `repartition_pourboires_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
