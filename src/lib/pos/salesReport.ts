import type { SupabaseClient } from '@supabase/supabase-js';

export interface SalesReportLine {
  product_name: string;
  category: string | null;
  quantity: number;
  unit_price_dzd: number;
  line_total_dzd: number;
}

export interface SalesReportSale {
  id: string;
  ticket_no: number;
  lines?: SalesReportLine[];
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
  to: Date,
  options: { includeLines?: boolean } = {}
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

  const linesBySale = new Map<string, SalesReportLine[]>();
  if (options.includeLines && rows.length) {
    const items: Array<{ sale_id: string; product_id: string; product_name: string; quantity: number; unit_price_dzd: number; line_total_dzd: number | string }> = [];
    for (let i = 0; i < rows.length; i += 100) {
      const { data, error } = await rlsClient
        .from('pos_sale_items')
        .select('sale_id,product_id,product_name,quantity,unit_price_dzd,line_total_dzd')
        .in('sale_id', rows.slice(i, i + 100).map(row => row.id));
      if (error) throw error;
      items.push(...(data ?? []));
    }
    const categories = new Map<string, string>();
    const productIds = [...new Set(items.map(item => item.product_id))];
    for (let i = 0; i < productIds.length; i += 100) {
      const { data, error } = await rlsClient.from('pos_products').select('id,category').in('id', productIds.slice(i, i + 100));
      if (error) throw error;
      for (const product of data ?? []) categories.set(product.id, product.category);
    }
    for (const item of items) {
      const list = linesBySale.get(item.sale_id) ?? [];
      list.push({
        product_name: item.product_name,
        category: categories.get(item.product_id) ?? null,
        quantity: item.quantity,
        unit_price_dzd: item.unit_price_dzd,
        line_total_dzd: Number(item.line_total_dzd)
      });
      linesBySale.set(item.sale_id, list);
    }
  }

  const chronological = [...rows].sort((a, b) => a.sold_at.localeCompare(b.sold_at));
  const ticketNumbers = new Map(chronological.map((row, index) => [row.id, index + 1]));
  const sales = rows.map(row => ({
    id: row.id,
    ticket_no: ticketNumbers.get(row.id) ?? 0,
    ...(options.includeLines ? { lines: linesBySale.get(row.id) ?? [] } : {}),
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
