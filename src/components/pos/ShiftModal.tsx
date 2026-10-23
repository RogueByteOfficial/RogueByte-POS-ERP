import React, { useState } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { translations, Language } from '../../lib/i18n';
import { round, sub } from '../../lib/decimal';
import { Receipt, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ShiftModalProps {
  onClose: () => void;
  lang: Language;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({ onClose, lang }) => {
  const { state, db, formatCurrency, activeBranch } = useDatabase();
  const t = translations[lang];

  const activeShift = state.activeShift;
  const isShiftOpen = activeShift && activeShift.status === 'OPEN';

  const [openingFloat, setOpeningFloat] = useState<number>(50.000);
  const [countedCash, setCountedCash] = useState<number>(
    isShiftOpen ? activeShift.expectedCash : 50.000
  );
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [summaryResult, setSummaryResult] = useState<any>(null);

  const expectedCash = isShiftOpen ? activeShift.expectedCash : 0;
  const discrepancy = round(sub(countedCash, expectedCash, 3), 3);

  const handleOpenShift = () => {
    if (openingFloat < 0) {
      setErrorMsg('Opening float cannot be negative');
      return;
    }
    const registerId = state.registers[0].id;
    db.openShift(registerId, openingFloat, notes);
    onClose();
  };

  const handleCloseShift = () => {
    const res = db.closeShift(countedCash, notes);
    if (res.success && res.shift) {
      setSummaryResult(res);
    } else {
      setErrorMsg('Failed to close shift');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.shift}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {summaryResult ? (
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-neutral-900 dark:text-neutral-100">
                Shift Successfully Reconciled &amp; Closed
              </h4>
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-xs space-y-2 text-left">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cashier:</span>
                  <span className="font-medium">{summaryResult.shift.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Opening Float:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(summaryResult.shift.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Total Cash Sales:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(summaryResult.shift.cashSalesTotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Expected Cash:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(summaryResult.shift.expectedCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Counted Cash:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(summaryResult.shift.countedCash)}</span>
                </div>
                <div className="flex justify-between font-bold border-t border-neutral-200 dark:border-neutral-700 pt-2">
                  <span>Discrepancy:</span>
                  <span className={`font-mono tabular-nums ${summaryResult.discrepancy === 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(summaryResult.discrepancy)}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-full py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded-lg text-xs"
              >
                {t.close}
              </button>
            </div>
          ) : isShiftOpen ? (
            /* CLOSE SHIFT FORM */
            <div className="space-y-4">
              <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3 text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500">Register:</span>
                  <span className="font-semibold">{activeShift.registerId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Cashier:</span>
                  <span className="font-semibold">{activeShift.cashierName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Opened At:</span>
                  <span className="font-mono">{new Date(activeShift.openedAt).toLocaleTimeString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Opening Float:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(activeShift.openingCash)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500">Shift Cash Sales:</span>
                  <span className="font-mono tabular-nums text-emerald-600 font-semibold">+{formatCurrency(activeShift.cashSalesTotal)}</span>
                </div>
                <div className="flex justify-between border-t border-neutral-200 dark:border-neutral-700 pt-1.5 font-bold">
                  <span>{t.expectedCash}:</span>
                  <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(expectedCash)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.countedCash} (OMR)
                </label>
                <input
                  type="number"
                  step="0.050"
                  value={countedCash}
                  onChange={(e) => setCountedCash(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-lg font-mono font-bold border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Live discrepancy calculation */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-xs">
                <span className="font-medium text-neutral-600 dark:text-neutral-400">{t.discrepancy}:</span>
                <span
                  className={`font-mono font-bold tabular-nums ${
                    discrepancy === 0
                      ? 'text-emerald-600'
                      : discrepancy > 0
                      ? 'text-blue-600'
                      : 'text-rose-600'
                  }`}
                >
                  {discrepancy > 0 ? `+${formatCurrency(discrepancy)} (Overage)` : discrepancy < 0 ? `${formatCurrency(discrepancy)} (Shortage)` : '0.000 OMR (Balanced)'}
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Reconciliation Notes / Drawer Handover
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. End of morning shift handover verified"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {errorMsg && (
                <div className="text-xs text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleCloseShift}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  {t.shiftClose}
                </button>
              </div>
            </div>
          ) : (
            /* OPEN SHIFT FORM */
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                Register shift is currently closed. Enter starting cash float to open the cash drawer.
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  {t.openingFloat} (OMR)
                </label>
                <input
                  type="number"
                  step="0.050"
                  min="0"
                  value={openingFloat}
                  onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-lg font-mono font-bold border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
                  Opening Shift Notes
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Verified 50.000 OMR petty float"
                  className="w-full px-3 py-2 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {errorMsg && (
                <div className="text-xs text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleOpenShift}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs"
                >
                  {t.shiftOpen}
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
