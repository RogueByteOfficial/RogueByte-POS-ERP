import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { translations, Language } from '../../lib/i18n';
import { round, add, sub, mul, div } from '../../lib/decimal';
import { 
  BarChart3, 
  TrendingUp, 
  Download, 
  Calendar, 
  Building2, 
  ArrowUpRight, 
  CreditCard,
  Banknote,
  Users,
  Package,
  Layers
} from 'lucide-react';

interface ReportsScreenProps {
  lang: Language;
}

export const ReportsScreen: React.FC<ReportsScreenProps> = ({ lang }) => {
  const { state, formatCurrency, activeBranch } = useDatabase();
  const t = translations[lang];

  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('all');

  // Completed Sales
  const completedSales = useMemo(() => {
    return state.sales.filter((s) => {
      if (state.activeBranchId !== '*' && s.branchId !== state.activeBranchId) return false;
      return s.status === 'COMPLETED';
    });
  }, [state.sales, state.activeBranchId]);

  // Aggregate Metrics
  const grossSales = useMemo(() => {
    return completedSales.reduce((acc, s) => add(acc, s.subtotal, 3), 0);
  }, [completedSales]);

  const discountsTotal = useMemo(() => {
    return completedSales.reduce((acc, s) => add(acc, s.discountTotal, 3), 0);
  }, [completedSales]);

  const netSales = useMemo(() => {
    return sub(grossSales, discountsTotal, 3);
  }, [grossSales, discountsTotal]);

  const taxCollected = useMemo(() => {
    return completedSales.reduce((acc, s) => add(acc, s.taxTotal, 3), 0);
  }, [completedSales]);

  const grandTotal = useMemo(() => {
    return completedSales.reduce((acc, s) => add(acc, s.grandTotal, 3), 0);
  }, [completedSales]);

  const totalCOGS = useMemo(() => {
    return completedSales.reduce((acc, s) => {
      const saleCost = s.items.reduce((cAcc, it) => add(cAcc, mul(it.costPrice, it.quantity, 3), 3), 0);
      return add(acc, saleCost, 3);
    }, 0);
  }, [completedSales]);

  const grossProfit = useMemo(() => {
    return sub(netSales, totalCOGS, 3);
  }, [netSales, totalCOGS]);

  const grossMarginPercent = useMemo(() => {
    if (netSales <= 0) return 0;
    return round((grossProfit / netSales) * 100, 1);
  }, [grossProfit, netSales]);

  // Payment Breakdown
  const paymentMethodSummary = useMemo(() => {
    let cash = 0;
    let card = 0;
    let bank = 0;
    let credit = 0;

    for (const s of completedSales) {
      for (const p of s.payments) {
        if (p.method === 'CASH') cash = add(cash, p.amount, 3);
        else if (p.method === 'CARD') card = add(card, p.amount, 3);
        else if (p.method === 'BANK_TRANSFER') bank = add(bank, p.amount, 3);
        else if (p.method === 'CUSTOMER_CREDIT') credit = add(credit, p.amount, 3);
      }
    }
    return { cash, card, bank, credit };
  }, [completedSales]);

  // Top Selling Products
  const topProducts = useMemo(() => {
    const map: { [prodId: string]: { name: string; quantity: number; revenue: number } } = {};
    for (const s of completedSales) {
      for (const it of s.items) {
        if (!map[it.productId]) {
          map[it.productId] = { name: it.name, quantity: 0, revenue: 0 };
        }
        map[it.productId].quantity += it.quantity;
        map[it.productId].revenue = add(map[it.productId].revenue, it.lineTotal, 3);
      }
    }
    return Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [completedSales]);

  // Cashier Performance
  const cashierStats = useMemo(() => {
    const map: { [name: string]: { transactions: number; total: number } } = {};
    for (const s of completedSales) {
      if (!map[s.cashierName]) {
        map[s.cashierName] = { transactions: 0, total: 0 };
      }
      map[s.cashierName].transactions += 1;
      map[s.cashierName].total = add(map[s.cashierName].total, s.grandTotal, 3);
    }
    return Object.entries(map).map(([name, stat]) => ({ name, ...stat }));
  }, [completedSales]);

  // Multi-Branch Comparison
  const branchComparison = useMemo(() => {
    return state.branches.map((b) => {
      const branchSales = state.sales.filter((s) => s.branchId === b.id && s.status === 'COMPLETED');
      const total = branchSales.reduce((acc, s) => add(acc, s.grandTotal, 3), 0);
      return {
        branch: b,
        transactions: branchSales.length,
        total,
      };
    });
  }, [state.branches, state.sales]);

  // CSV Export Trigger
  const exportCSV = () => {
    const headers = ['Invoice Number', 'Branch', 'Date', 'Customer', 'Cashier', 'Subtotal (OMR)', 'VAT (OMR)', 'Grand Total (OMR)', 'Status'];
    const rows = state.sales.map((s) => [
      s.invoiceNumber,
      s.branchId,
      s.date,
      `"${s.customerName.replace(/"/g, '""')}"`,
      `"${s.cashierName}"`,
      s.subtotal.toFixed(3),
      s.taxTotal.toFixed(3),
      s.grandTotal.toFixed(3),
      s.status,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RogueByte_Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Header and Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            Executive Analytics &amp; Performance Reports
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Consolidated multi-branch financial intelligence, sales velocity, cashier metrics, and gross margin analysis.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
        >
          <Download className="w-3.5 h-3.5" />
          <span>{t.exportCSV}</span>
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Gross Sales Revenue
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
            {formatCurrency(grossSales)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Before discounts &amp; tax
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Net Revenue (صافي الإيراد)
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {formatCurrency(netSales)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Excl. VAT: {formatCurrency(taxCollected)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Gross Profit Margin
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-300 mt-1 tabular-nums">
            {grossMarginPercent}%
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Profit: {formatCurrency(grossProfit)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Oman VAT Collected (5%)
          </div>
          <div className="text-2xl font-bold font-mono text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
            {formatCurrency(taxCollected)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Payable to Oman Tax Authority
          </div>
        </div>
      </div>

      {/* Grid: Payment Method Breakdown & Branch Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment Methods */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4">
          <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-600" />
            <span>Payment Methods Breakdown</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60">
              <div className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-600" />
                <span className="font-medium text-neutral-800 dark:text-neutral-200">Cash on Hand</span>
              </div>
              <span className="font-mono font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                {formatCurrency(paymentMethodSummary.cash)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-neutral-800 dark:text-neutral-200">Card / POS Terminals</span>
              </div>
              <span className="font-mono font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                {formatCurrency(paymentMethodSummary.card)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-neutral-800 dark:text-neutral-200">Customer Account Credit (AR)</span>
              </div>
              <span className="font-mono font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                {formatCurrency(paymentMethodSummary.credit)}
              </span>
            </div>
          </div>
        </div>

        {/* Multi-Branch Consolidated Comparison */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4">
          <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Branch Consolidated Revenue Comparison</span>
          </h3>

          <div className="space-y-3 text-xs">
            {branchComparison.map((item) => (
              <div key={item.branch.id} className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/60 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                    {lang === 'ar' ? item.branch.nameAr : item.branch.name}
                  </div>
                  <div className="text-[11px] text-neutral-400">
                    {item.branch.code} · {item.branch.city} · {item.transactions} Sales
                  </div>
                </div>
                <div className="font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(item.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Grid: Top Selling Products & Cashier Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Selling Products */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4">
          <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-600" />
            <span>Top Performing Products</span>
          </h3>

          <div className="space-y-2 text-xs">
            {topProducts.map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded border border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{p.name}</span>
                  <div className="text-[11px] text-neutral-400">{p.quantity} units sold</div>
                </div>
                <div className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(p.revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Cashier Performance */}
        <div className="p-5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg space-y-4">
          <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Cashier Terminal Performance</span>
          </h3>

          <div className="space-y-2 text-xs">
            {cashierStats.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between p-2.5 rounded border border-neutral-100 dark:border-neutral-800">
                <div>
                  <span className="font-medium text-neutral-900 dark:text-neutral-100">{c.name}</span>
                  <div className="text-[11px] text-neutral-400">{c.transactions} completed transactions</div>
                </div>
                <div className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(c.total)}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
};
