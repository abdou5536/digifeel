import type { SupabaseClient } from '@supabase/supabase-js';

export interface SalesReportSale {
  id: string;
  sold_at: string;
  total_dzd: number;
  payment_method: string;
  cashier_name: string;
}

export interface SalesReport {
  totalDzd: number;
  salesCount: number;
  sales: SalesReportSale[];
  byServer: Array<{ name: string; total_dzd: number; count: number }>;
  byMonth: Array<{ month: string; total_dzd: number; count: number; servers: Array<{ name: string; total_dzd: number; count: number }> }>;
}

const PAGE_SIZE = 1000;
const monthKey = (iso: string) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Algiers', year: 'numeric', month: '2-digit' }).format(new Date(iso)).slice(0, 7);

export async function buildSalesReport(
  rlsClient: SupabaseClient,
  serviceClient: SupabaseClient,
  restaurantId: string,
  from: Date,
  to: Date
): Promise<SalesReport> {
  const rows: Array<{ id: string; sold_at: string; total_dzd: number | string; payment_method: string; cashier_user_id: string }> = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await rlsClient
      .from('pos_sales')
      .select('id,sold_at,total_dzd,payment_method,cashier_user_id')
      .eq('restaurant_id', restaurantId)
      .gte('sold_at', from.toISOString())
      .lt('sold_at', to.toISOString())
      .order('sold_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) break;
  }

  const names = new Map<string, string>();
  const cashierIds = [...new Set(rows.map(row => row.cashier_user_id))];
  if (cashierIds.length) {
    const { data: users, error } = await serviceClient
      .from('app_users')
      .select('id,display_name,servers(name)')
      .eq('restaurant_id', restaurantId)
      .in('id', cashierIds);
    if (error) throw error;
    for (const user of users ?? []) {
      const linked = Array.isArray(user.servers) ? user.servers[0]?.name : (user.servers as { name?: string } | null)?.name;
      names.set(user.id, linked || user.display_name || 'Caisse');
    }
  }

  const sales = rows.map(row => ({
    id: row.id,
    sold_at: row.sold_at,
    total_dzd: Number(row.total_dzd),
    payment_method: row.payment_method,
    cashier_name: names.get(row.cashier_user_id) ?? 'Caisse'
  }));

  const serverTotals = new Map<string, { total_dzd: number; count: number }>();
  const monthTotals = new Map<string, { total_dzd: number; count: number; servers: Map<string, { total_dzd: number; count: number }> }>();
  for (const sale of sales) {
    const server = serverTotals.get(sale.cashier_name) ?? { total_dzd: 0, count: 0 };
    server.total_dzd += sale.total_dzd;
    server.count += 1;
    serverTotals.set(sale.cashier_name, server);

    const key = monthKey(sale.sold_at);
    const month = monthTotals.get(key) ?? { total_dzd: 0, count: 0, servers: new Map() };
    month.total_dzd += sale.total_dzd;
    month.count += 1;
    const monthServer = month.servers.get(sale.cashier_name) ?? { total_dzd: 0, count: 0 };
    monthServer.total_dzd += sale.total_dzd;
    monthServer.count += 1;
    month.servers.set(sale.cashier_name, monthServer);
    monthTotals.set(key, month);
  }

  const toList = (map: Map<string, { total_dzd: number; count: number }>) =>
    [...map.entries()].map(([name, value]) => ({ name, ...value })).sort((a, b) => b.total_dzd - a.total_dzd);

  return {
    totalDzd: sales.reduce((sum, sale) => sum + sale.total_dzd, 0),
    salesCount: sales.length,
    sales,
    byServer: toList(serverTotals),
    byMonth: [...monthTotals.entries()]
      .map(([month, value]) => ({ month, total_dzd: value.total_dzd, count: value.count, servers: toList(value.servers) }))
      .sort((a, b) => b.month.localeCompare(a.month))
  };
}
