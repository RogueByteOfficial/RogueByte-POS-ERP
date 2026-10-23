import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { Sale } from '../../types/models';
import { translations, Language } from '../../lib/i18n';
import { ReceiptModal } from '../pos/ReceiptModal';
import { 
  FileText, 
  RotateCcw, 
  Printer, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Calendar
} from 'lucide-react';

interface SalesScreenProps {
  lang: Language;
}

export const SalesScreen: React.FC<SalesScreenProps> = ({ lang }) => {
  const { state, db, formatCurrency, activeBranch, hasPermission } = useDatabase();
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSaleForPrint, setSelectedSaleForPrint] = useState<Sale | null>(null);
  const [selectedSaleForRefund, setSelectedSaleForRefund] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState<string>('Customer returned goods in original condition');
  const [refundError, setRefundError] = useState<string>('');

  const filteredSales = useMemo(() => {
    return state.sales.filter((s) => {
      if (state.activeBranchId !== '*' && s.branchId !== state.activeBranchId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.invoiceNumber.toLowerCase().includes(q) ||
          s.customerName.toLowerCase().includes(q) ||
          s.cashierName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [state.sales, state.activeBranchId, searchQuery]);

  const handleExecuteRefund = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSaleForRefund) return;
    setRefundError('');

    const res = db.processRefund(selectedSaleForRefund.id, refundReason);
    if (res.success) {
      setSelectedSaleForRefund(null);
    } else {
      setRefundError(res.error || 'Failed to process refund');
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {t.navSales}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Audit sales transactions, reprint thermal receipts or tax invoices, and process controlled returns.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search invoice #, customer..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cashier</th>
                <th className="py-3 px-4">Date &amp; Time</th>
                <th className="py-3 px-4 text-right">Subtotal</th>
                <th className="py-3 px-4 text-right">VAT (5%)</th>
                <th className="py-3 px-4 text-right">Grand Total</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredSales.map((sale) => {
                const branch = state.branches.find((b) => b.id === sale.branchId);
                const isRefunded = sale.status === 'REFUNDED';

                return (
                  <tr key={sale.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {sale.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                      {branch ? branch.code : sale.branchId}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                      {sale.customerName}
                    </td>
                    <td className="py-3 px-4 text-neutral-500">
                      {sale.cashierName}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px] whitespace-nowrap">
                      {new Date(sale.date).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(sale.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                      {formatCurrency(sale.taxTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(sale.grandTotal)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        isRefunded
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {sale.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedSaleForPrint(sale)}
                          className="p-1.5 text-neutral-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                          title="Print / View Invoice"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {hasPermission('pos.refund') && !isRefunded && (
                          <button
                            onClick={() => setSelectedSaleForRefund(sale)}
                            className="p-1.5 text-neutral-500 hover:text-rose-600 transition-colors"
                            title="Process Return & Refund"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* RECEIPT / TAX INVOICE MODAL */}
      {selectedSaleForPrint && (
        <ReceiptModal
          sale={selectedSaleForPrint}
          onClose={() => setSelectedSaleForPrint(null)}
          lang={lang}
        />
      )}

      {/* REFUND MODAL */}
      {selectedSaleForRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleExecuteRefund} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Process Return / Refund
            </h3>
            <div className="bg-neutral-50 dark:bg-neutral-800 p-3 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Invoice:</span>
                <span className="font-mono font-semibold">{selectedSaleForRefund.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Customer:</span>
                <span>{selectedSaleForRefund.customerName}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Refund Amount:</span>
                <span className="font-mono text-rose-600">{formatCurrency(selectedSaleForRefund.grandTotal)}</span>
              </div>
            </div>

            <div className="text-xs space-y-2">
              <label className="block font-medium text-neutral-700 dark:text-neutral-300">
                Return Reason / Inspection Notes
              </label>
              <textarea
                required
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <p className="text-[11px] text-neutral-500">
                Notice: Approving this refund will automatically return items to warehouse stock and create a balanced reversing journal entry in the General Ledger.
              </p>
            </div>

            {refundError && (
              <div className="text-xs text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{refundError}</span>
              </div>
            )}

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSelectedSaleForRefund(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Confirm Return &amp; Refund
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
