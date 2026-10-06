import type { SalesReport } from '@/src/lib/pos/salesReport';
import { PAYMENT_LABELS, dayKey, formatDay, monthKeyOf } from './format';

export interface ReportReview {
  id: string;
  stars: number;
  comment: string;
  created_at: string;
  server_id: string | null;
  server_name: string | null;
  handled?: boolean;
}

export interface ExportData {
  restaurantName: string;
  periodDays: number;
  periodFrom?: string;
  generatedAt: string;
  role?: string;
  demo?: boolean;
  scansCount: number;
  scansByDay: Array<{ date: string; count: number }>;
  reviewCount: number;
  averageRating: number;
  reviews: ReportReview[];
  sales: SalesReport;
}

export interface ReportOrder {
  ticketNo: number;
  soldAt: string;
  day: string;
  server: string;
  payment: string;
  total: number;
  lines: Array<{ product: string; category: string; quantity: number; unitPrice: number; total: number }>;
}

export interface ProductStat {
  name: string;
  category: string;
  quantity: number;
  averagePrice: number;
  revenue: number;
  share: number;
  rankByQuantity: number;
  rankByRevenue: number;
}

export interface ServerStat {
  name: string;
  orders: number;
  revenue: number;
  averageBasket: number | null;
  reviewCount: number;
  averageRating: number | null;
  rank: number | null;
}

export interface ReportModel {
  restaurantName: string;
  isDemo: boolean;
  from: Date;
  to: Date;
  generatedAt: Date;
  periodDays: number;
  fromKey: string;
  toKey: string;

  hasSales: boolean;
  revenue: number;
  orderCount: number;
  averageBasket: number | null;
  itemsSold: number;
  orders: ReportOrder[];
  hasLineDetail: boolean;

  daily: Array<{ day: string; revenue: number; orders: number }>;
  monthly: Array<{ month: string; revenue: number; orders: number; averageBasket: number | null }>;
  trend: { firstHalf: number; secondHalf: number; change: number | null } | null;
  bestDay: { day: string; revenue: number } | null;
  payments: Array<{ label: string; orders: number; revenue: number; share: number }>;

  products: ProductStat[];
  categories: Array<{ name: string; quantity: number; revenue: number; share: number }>;
  topByQuantity: ProductStat | null;
  topByRevenue: ProductStat | null;

  servers: ServerStat[];
  unattributedReviews: number;

  reviews: ReportReview[];
  reviewCount: number;
  averageRating: number | null;
  distribution: Array<{ stars: number; count: number; share: number }>;
  positive: number;
  neutral: number;
  negative: number;
  commented: number;
  pendingReviews: number | null;
  ratingByMonth: Array<{ month: string; average: number; count: number }>;

  scansAvailable: boolean;
  scansCount: number;
  scansByDay: Array<{ date: string; count: number }>;
  scansPerDay: number | null;
  bestScanDay: { day: string; count: number } | null;
  conversion: number | null;
}

const UNKNOWN_SERVER = 'Non attribué';

function sumBy<T>(items: T[], pick: (item: T) => number) {
  return items.reduce((sum, item) => sum + pick(item), 0);
}

function listDays(from: Date, to: Date) {
  const days: string[] = [];
  const last = dayKey(to);
  for (let time = from.getTime(); time <= to.getTime() + 86400000; time += 86400000) {
    const key = dayKey(new Date(time));
    if (key > last) break;
    if (days[days.length - 1] !== key) days.push(key);
  }
  return days;
}

export function buildReportModel(data: ExportData): ReportModel {
  const generatedAt = new Date(data.generatedAt);
  const to = generatedAt;
  const from = data.periodFrom ? new Date(data.periodFrom) : new Date(to.getTime() - (data.periodDays - 1) * 86400000);
  const sales = data.sales ?? { totalDzd: 0, salesCount: 0, sales: [], byServer: [], byMonth: [] };

  const orders: ReportOrder[] = [...sales.sales]
    .sort((a, b) => a.sold_at.localeCompare(b.sold_at))
    .map(sale => ({
      ticketNo: sale.ticket_no,
      soldAt: sale.sold_at,
      day: dayKey(sale.sold_at),
      server: sale.cashier_name || UNKNOWN_SERVER,
      payment: PAYMENT_LABELS[sale.payment_method] ?? sale.payment_method,
      total: sale.total_dzd,
      lines: (sale.lines ?? []).map(line => ({
        product: line.product_name,
        category: line.category ?? '',
        quantity: line.quantity,
        unitPrice: line.unit_price_dzd,
        total: line.line_total_dzd
      }))
    }));

  const revenue = sumBy(orders, order => order.total);
  const orderCount = orders.length;
  const itemsSold = sumBy(orders, order => sumBy(order.lines, line => line.quantity));
  const hasLineDetail = orders.some(order => order.lines.length > 0);

  const dailyMap = new Map<string, { revenue: number; orders: number }>();
  for (const day of listDays(from, to)) dailyMap.set(day, { revenue: 0, orders: 0 });
  for (const order of orders) {
    const entry = dailyMap.get(order.day) ?? { revenue: 0, orders: 0 };
    entry.revenue += order.total;
    entry.orders += 1;
    dailyMap.set(order.day, entry);
  }
  const daily = [...dailyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([day, value]) => ({ day, ...value }));

  const monthlyMap = new Map<string, { revenue: number; orders: number }>();
  for (const order of orders) {
    const key = monthKeyOf(order.soldAt);
    const entry = monthlyMap.get(key) ?? { revenue: 0, orders: 0 };
    entry.revenue += order.total;
    entry.orders += 1;
    monthlyMap.set(key, entry);
  }
  const monthly = [...monthlyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({
    month, ...value, averageBasket: value.orders ? value.revenue / value.orders : null
  }));

  let trend: ReportModel['trend'] = null;
  if (orderCount > 0 && daily.length >= 4) {
    const middle = Math.floor(daily.length / 2);
    const firstHalf = sumBy(daily.slice(0, middle), day => day.revenue);
    const secondHalf = sumBy(daily.slice(middle), day => day.revenue);
    trend = { firstHalf, secondHalf, change: firstHalf > 0 ? (secondHalf - firstHalf) / firstHalf : null };
  }

  const bestDayEntry = daily.reduce<{ day: string; revenue: number } | null>((best, day) => day.revenue > (best?.revenue ?? 0) ? { day: day.day, revenue: day.revenue } : best, null);

  const paymentMap = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    const entry = paymentMap.get(order.payment) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    entry.revenue += order.total;
    paymentMap.set(order.payment, entry);
  }
  const payments = [...paymentMap.entries()]
    .map(([label, value]) => ({ label, ...value, share: revenue > 0 ? value.revenue / revenue : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  const productMap = new Map<string, { name: string; category: string; quantity: number; revenue: number }>();
  for (const order of orders) {
    for (const line of order.lines) {
      const key = `${line.product}\u0000${line.category}`;
      const entry = productMap.get(key) ?? { name: line.product, category: line.category, quantity: 0, revenue: 0 };
      entry.quantity += line.quantity;
      entry.revenue += line.total;
      productMap.set(key, entry);
    }
  }
  const productList = [...productMap.values()];
  const productRevenueTotal = sumBy(productList, product => product.revenue);
  const byQuantity = [...productList].sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue || a.name.localeCompare(b.name));
  const byRevenue = [...productList].sort((a, b) => b.revenue - a.revenue || b.quantity - a.quantity || a.name.localeCompare(b.name));
  const products: ProductStat[] = byRevenue.map((product, index) => ({
    name: product.name,
    category: product.category,
    quantity: product.quantity,
    averagePrice: product.quantity ? product.revenue / product.quantity : 0,
    revenue: product.revenue,
    share: productRevenueTotal > 0 ? product.revenue / productRevenueTotal : 0,
    rankByRevenue: index + 1,
    rankByQuantity: byQuantity.findIndex(other => other.name === product.name && other.category === product.category) + 1
  }));

  const categoryMap = new Map<string, { quantity: number; revenue: number }>();
  for (const product of productList) {
    const key = product.category || 'Sans catégorie';
    const entry = categoryMap.get(key) ?? { quantity: 0, revenue: 0 };
    entry.quantity += product.quantity;
    entry.revenue += product.revenue;
    categoryMap.set(key, entry);
  }
  const categories = [...categoryMap.entries()]
    .map(([name, value]) => ({ name, ...value, share: productRevenueTotal > 0 ? value.revenue / productRevenueTotal : 0 }))
    .sort((a, b) => b.revenue - a.revenue);

  const reviews = [...(data.reviews ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at));
  const reviewCount = reviews.length;
  const averageRating = reviewCount ? sumBy(reviews, review => review.stars) / reviewCount : null;

  const serverMap = new Map<string, { orders: number; revenue: number; reviewCount: number; starSum: number }>();
  const ensureServer = (name: string) => {
    const entry = serverMap.get(name) ?? { orders: 0, revenue: 0, reviewCount: 0, starSum: 0 };
    serverMap.set(name, entry);
    return entry;
  };
  for (const order of orders) {
    const entry = ensureServer(order.server);
    entry.orders += 1;
    entry.revenue += order.total;
  }
  let unattributedReviews = 0;
  for (const review of reviews) {
    if (!review.server_name) {
      unattributedReviews += 1;
      continue;
    }
    const entry = ensureServer(review.server_name);
    entry.reviewCount += 1;
    entry.starSum += review.stars;
  }
  const servers: ServerStat[] = [...serverMap.entries()]
    .map(([name, value]) => ({
      name,
      orders: value.orders,
      revenue: value.revenue,
      averageBasket: value.orders ? value.revenue / value.orders : null,
      reviewCount: value.reviewCount,
      averageRating: value.reviewCount ? value.starSum / value.reviewCount : null,
      rank: null as number | null
    }))
    .sort((a, b) => b.revenue - a.revenue || b.reviewCount - a.reviewCount || a.name.localeCompare(b.name));
  const sellingServers = servers.filter(server => server.orders > 0);
  if (sellingServers.length > 1) sellingServers.forEach((server, index) => { server.rank = index + 1; });

  const distribution = [5, 4, 3, 2, 1].map(stars => {
    const count = reviews.filter(review => review.stars === stars).length;
    return { stars, count, share: reviewCount ? count / reviewCount : 0 };
  });
  const ratingMap = new Map<string, { sum: number; count: number }>();
  for (const review of reviews) {
    const key = monthKeyOf(review.created_at);
    const entry = ratingMap.get(key) ?? { sum: 0, count: 0 };
    entry.sum += review.stars;
    entry.count += 1;
    ratingMap.set(key, entry);
  }
  const ratingByMonth = [...ratingMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, average: value.sum / value.count, count: value.count }));
  const hasHandledInfo = reviews.some(review => typeof review.handled === 'boolean');

  const scansAvailable = (data.scansByDay ?? []).length > 0;
  const scansByDay = scansAvailable ? data.scansByDay.map(day => ({ date: day.date.slice(0, 10), count: day.count })) : [];
  const scansCount = scansAvailable ? data.scansCount : 0;
  const bestScan = scansByDay.reduce<{ day: string; count: number } | null>((best, day) => day.count > (best?.count ?? 0) ? { day: day.date, count: day.count } : best, null);

  return {
    restaurantName: data.restaurantName,
    isDemo: Boolean(data.demo),
    from,
    to,
    generatedAt,
    periodDays: data.periodDays,
    fromKey: dayKey(from),
    toKey: dayKey(to),
    hasSales: orderCount > 0,
    revenue,
    orderCount,
    averageBasket: orderCount ? revenue / orderCount : null,
    itemsSold,
    orders,
    hasLineDetail,
    daily,
    monthly,
    trend,
    bestDay: bestDayEntry,
    payments,
    products,
    categories,
    topByQuantity: products.find(product => product.rankByQuantity === 1) ?? null,
    topByRevenue: products[0] ?? null,
    servers,
    unattributedReviews,
    reviews,
    reviewCount,
    averageRating,
    distribution,
    positive: reviews.filter(review => review.stars >= 4).length,
    neutral: reviews.filter(review => review.stars === 3).length,
    negative: reviews.filter(review => review.stars <= 2).length,
    commented: reviews.filter(review => review.comment.trim().length > 0).length,
    pendingReviews: hasHandledInfo ? reviews.filter(review => !review.handled).length : null,
    ratingByMonth,
    scansAvailable,
    scansCount,
    scansByDay,
    scansPerDay: scansAvailable && data.periodDays > 0 ? scansCount / data.periodDays : null,
    bestScanDay: bestScan,
    conversion: scansAvailable && scansCount > 0 ? reviewCount / scansCount : null
  };
}

export function periodLabel(model: ReportModel) {
  return `Du ${formatDay(model.fromKey)} au ${formatDay(model.toKey)} (${model.periodDays} jours)`;
}
