import React, { useState } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { Customer, PaymentMethod, PaymentLine, Sale } from '../../types/models';
import { translations, Language } from '../../lib/i18n';
import { round, add, sub } from '../../lib/decimal';
import { CreditCard, Banknote, Building, UserCheck, X, CheckCircle2, AlertCircle } from 'lucide-react';

interface PaymentModalProps {
  grandTotal: number;
  subtotal: number;
  taxTotal: number;
  discountTotal: number;
  cartItems: any[];
  selectedCustomer: Customer;
  warehouseId: string;
  onClose: () => void;
  onSaleSuccess: (sale: Sale) => void;
  lang: Language;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  grandTotal,
  subtotal,
  taxTotal,
  discountTotal,
  cartItems,
  selectedCustomer,
  warehouseId,
  onClose,
  onSaleSuccess,
  lang,
}) => {
  const { state, formatCurrency, activeBranch, db } = useDatabase();
  const t = translations[lang];

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [cashReceived, setCashReceived] = useState<number>(grandTotal);
  const [splitCardAmount, setSplitCardAmount] = useState<number>(0);
  const [isSplit, setIsSplit] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Quick cash buttons based on Omani Rial bank notes
  const quickCashOptions = [grandTotal, 5, 10, 20, 50].filter(
    (val, idx, arr) => val >= grandTotal || idx === 0
  );

  const totalPaid = isSplit ? add(cashReceived, splitCardAmount, 3) : cashReceived;
  const changeDue = Math.max(0, sub(totalPaid, grandTotal, 3));
  const remainingDue = Math.max(0, sub(grandTotal, totalPaid, 3));

  const handleCompleteSale = () => {
    setErrorMsg('');

    if (totalPaid < grandTotal && paymentMethod !== 'CUSTOMER_CREDIT') {
      setErrorMsg(`Payment amount is insufficient! Remaining due: ${formatCurrency(remainingDue)}`);
      return;
    }

    // Customer Credit Limit check
    if (paymentMethod === 'CUSTOMER_CREDIT') {
      if (selectedCustomer.code === 'CUST-WALK') {
        setErrorMsg('Walk-in customer cannot purchase on credit. Please select a registered corporate customer.');
        return;
      }
      const newBalance = add(selectedCustomer.currentBalance, grandTotal, 3);
      if (newBalance > selectedCustomer.creditLimit) {
        setErrorMsg(
          `Customer credit limit exceeded! Current Balance: ${formatCurrency(selectedCustomer.currentBalance)}, Limit: ${formatCurrency(selectedCustomer.creditLimit)}`
        );
        return;
      }
    }

    setIsSubmitting(true);

    const payments: PaymentLine[] = [];
    if (isSplit) {
      if (cashReceived > 0) payments.push({ method: 'CASH', amount: sub(cashReceived, changeDue, 3) });
      if (splitCardAmount > 0) payments.push({ method: 'CARD', amount: splitCardAmount, reference: 'SPLIT-POS-CARD' });
    } else {
      if (paymentMethod === 'CASH') {
        payments.push({ method: 'CASH', amount: grandTotal });
      } else {
        payments.push({ method: paymentMethod, amount: grandTotal });
      }
    }

    const salePayload = {
      branchId: activeBranch ? activeBranch.id : state.branches[0].id,
      warehouseId,
      registerId: state.registers[0].id,
      cashierId: state.currentUser.id,
      cashierName: state.currentUser.fullName,
      customerId: selectedCustomer.id,
      customerName: selectedCustomer.name,
      date: new Date().toISOString(),
      items: cartItems,
      subtotal,
      discountTotal,
      taxTotal,
      grandTotal,
      paidAmount: totalPaid,
      changeAmount: changeDue,
      payments,
      status: 'COMPLETED' as const,
      idempotencyKey: `POS-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    };

    const result = db.processSale(salePayload);
    setIsSubmitting(false);

    if (result.success && result.sale) {
      onSaleSuccess(result.sale);
    } else {
      setErrorMsg(result.error || 'Failed to process sale');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.payment}
            </h3>
            <div className="text-xs text-neutral-500">
              Customer: <span className="font-medium text-neutral-700 dark:text-neutral-300">{selectedCustomer.name}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 flex-1 overflow-y-auto">
          {/* Total Banner */}
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg p-4 text-center">
            <div className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
              {t.total} Due
            </div>
            <div className="text-3xl font-bold font-mono tabular-nums text-emerald-900 dark:text-emerald-200 mt-1">
              {formatCurrency(grandTotal)}
            </div>
            <div className="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1">
              Subtotal: {formatCurrency(subtotal)} · 5% VAT: {formatCurrency(taxTotal)}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div>
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider mb-2">
              {t.paymentMethod}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('CASH');
                  setIsSplit(false);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'CASH' && !isSplit
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Banknote className="w-5 h-5 mb-1.5 text-emerald-600 dark:text-emerald-400" />
                <span>{t.cash}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('CARD');
                  setIsSplit(false);
                  setCashReceived(grandTotal);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'CARD' && !isSplit
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <CreditCard className="w-5 h-5 mb-1.5 text-blue-600 dark:text-blue-400" />
                <span>{t.card}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('BANK_TRANSFER');
                  setIsSplit(false);
                  setCashReceived(grandTotal);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'BANK_TRANSFER' && !isSplit
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <Building className="w-5 h-5 mb-1.5 text-purple-600 dark:text-purple-400" />
                <span>{t.bankTransfer}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPaymentMethod('CUSTOMER_CREDIT');
                  setIsSplit(false);
                  setCashReceived(grandTotal);
                }}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all ${
                  paymentMethod === 'CUSTOMER_CREDIT' && !isSplit
                    ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 font-semibold'
                    : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <UserCheck className="w-5 h-5 mb-1.5 text-amber-600 dark:text-amber-400" />
                <span>{t.customerCredit}</span>
              </button>
            </div>

            {/* Split Payment Toggle */}
            <div className="mt-2 text-right">
              <button
                type="button"
                onClick={() => {
                  setIsSplit(!isSplit);
                  if (!isSplit) {
                    setPaymentMethod('CASH');
                    setCashReceived(round(grandTotal / 2, 3));
                    setSplitCardAmount(sub(grandTotal, round(grandTotal / 2, 3), 3));
                  }
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
              >
                {isSplit ? 'Cancel Split Payment' : '+ Split across Cash & Card'}
              </button>
            </div>
          </div>

          {/* Cash Received & Quick Cash (if Cash or Split) */}
          {(paymentMethod === 'CASH' || isSplit) && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  {t.cashReceived} (OMR)
                </label>
                <input
                  type="number"
                  step="0.050"
                  min="0"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-lg font-mono font-semibold border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Quick Cash Buttons */}
              <div className="flex flex-wrap gap-2">
                <span className="text-xs text-neutral-500 py-1">{t.quickCash}:</span>
                {quickCashOptions.map((amount, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCashReceived(round(amount, 3))}
                    className="px-2.5 py-1 text-xs font-mono font-medium rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 transition-colors"
                  >
                    {idx === 0 ? 'Exact' : `${amount} OMR`}
                  </button>
                ))}
              </div>

              {/* If split, card portion */}
              {isSplit && (
                <div>
                  <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Card Portion (OMR)
                  </label>
                  <input
                    type="number"
                    step="0.050"
                    min="0"
                    value={splitCardAmount}
                    onChange={(e) => setSplitCardAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-lg font-mono font-semibold border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Change due breakdown */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 text-xs">
                <span className="font-medium text-neutral-600 dark:text-neutral-400">{t.changeDue}:</span>
                <span className="font-mono font-bold text-base text-emerald-700 dark:text-emerald-400 tabular-nums">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            </div>
          )}

          {/* Customer Credit Terms Banner */}
          {paymentMethod === 'CUSTOMER_CREDIT' && (
            <div className="p-3 rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/40 text-xs space-y-1">
              <div className="font-semibold text-amber-800 dark:text-amber-300">
                Accounts Receivable Credit Sale
              </div>
              <div className="text-amber-700 dark:text-amber-400">
                Current Balance: <span className="font-mono font-semibold">{formatCurrency(selectedCustomer.currentBalance)}</span> · Credit Limit: <span className="font-mono font-semibold">{formatCurrency(selectedCustomer.creditLimit)}</span>
              </div>
              <div className="text-[11px] text-amber-600/80">
                Payment Terms: {selectedCustomer.paymentTermsDays} days net. Sale will automatically post to General Ledger Account 1100.
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg transition-colors"
          >
            {t.cancel}
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleCompleteSale}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{isSubmitting ? 'Processing...' : t.completeSale}</span>
          </button>
        </div>

      </div>
    </div>
  );
};
