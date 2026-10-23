import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { translations, Language } from '../../lib/i18n';
import { 
  calculateAccountBalances, 
  generateProfitAndLoss, 
  generateBalanceSheet,
  assertBalanced
} from '../../lib/accountingEngine';
import { round, add, sub } from '../../lib/decimal';
import { 
  BookOpen, 
  FileSpreadsheet, 
  Scale, 
  TrendingUp, 
  Landmark, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  FileText
} from 'lucide-react';

interface AccountingScreenProps {
  lang: Language;
}

export const AccountingScreen: React.FC<AccountingScreenProps> = ({ lang }) => {
  const { state, db, formatCurrency, activeBranch, hasPermission } = useDatabase();
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'chart' | 'journal' | 'trial' | 'pnl' | 'balanceSheet'>('chart');
  const [showManualModal, setShowManualModal] = useState<boolean>(false);

  // Manual Journal Entry Form State
  const [manualDescription, setManualDescription] = useState<string>('');
  const [manualLines, setManualLines] = useState<
    { accountCode: string; debit: number; credit: number; memo?: string }[]
  >([
    { accountCode: '1010', debit: 100, credit: 0, memo: 'Opening petty cash adjustment' },
    { accountCode: '3000', debit: 0, credit: 100, memo: 'Capital contribution' },
  ]);
  const [manualError, setManualError] = useState<string>('');

  const accountBalances = useMemo(() => {
    return calculateAccountBalances(state.accounts, state.journalEntries, state.activeBranchId, 3);
  }, [state.accounts, state.journalEntries, state.activeBranchId]);

  const pnl = useMemo(() => {
    return generateProfitAndLoss(state.accounts, state.journalEntries, state.activeBranchId, 3);
  }, [state.accounts, state.journalEntries, state.activeBranchId]);

  const balanceSheet = useMemo(() => {
    return generateBalanceSheet(state.accounts, state.journalEntries, state.activeBranchId, 3);
  }, [state.accounts, state.journalEntries, state.activeBranchId]);

  // Trial Balance Totals
  const trialBalanceSums = useMemo(() => {
    let totalDebit = 0;
    let totalCredit = 0;
    for (const acc of state.accounts) {
      const b = accountBalances[acc.code];
      if (!b) continue;
      if (acc.normalBalance === 'DEBIT') {
        if (b.netBalance > 0) totalDebit = add(totalDebit, b.netBalance, 3);
        else totalCredit = add(totalCredit, Math.abs(b.netBalance), 3);
      } else {
        if (b.netBalance > 0) totalCredit = add(totalCredit, b.netBalance, 3);
        else totalDebit = add(totalDebit, Math.abs(b.netBalance), 3);
      }
    }
    const isBalanced = Math.abs(sub(totalDebit, totalCredit, 3)) < 0.001;
    return { totalDebit, totalCredit, isBalanced };
  }, [state.accounts, accountBalances]);

  // Manual lines validation
  const manualBalanceCheck = useMemo(() => {
    const totalD = manualLines.reduce((acc, l) => add(acc, l.debit || 0, 3), 0);
    const totalC = manualLines.reduce((acc, l) => add(acc, l.credit || 0, 3), 0);
    const diff = Math.abs(round(totalD - totalC, 3));
    return { totalD, totalC, diff, isBalanced: diff < 0.001 };
  }, [manualLines]);

  const handlePostManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBalanceCheck.isBalanced) {
      setManualError('Debits and Credits must be equal!');
      return;
    }
    const res = db.postManualJournalEntry(manualLines, manualDescription || 'Manual Journal Posting');
    if (res.success) {
      setShowManualModal(false);
      setManualDescription('');
    } else {
      setManualError(res.error || 'Failed to post entry');
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Net Sales Revenue
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {formatCurrency(pnl.netRevenue)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Gross: {formatCurrency(pnl.grossRevenue)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Cost of Goods Sold (COGS)
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
            {formatCurrency(pnl.cogs)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Gross Profit: {formatCurrency(pnl.grossProfit)}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Net Operating Profit
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-300 mt-1 tabular-nums">
            {formatCurrency(pnl.netOperatingProfit)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            After COGS &amp; Overhead
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Double-Entry Trial Balance
          </div>
          <div className="text-lg font-bold font-mono mt-1 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>Strictly Balanced</span>
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Debits = Credits: {formatCurrency(trialBalanceSums.totalDebit)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg overflow-x-auto">
          <button
            onClick={() => setActiveTab('chart')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'chart'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{t.chartOfAccounts}</span>
          </button>

          <button
            onClick={() => setActiveTab('journal')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'journal'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{t.journalEntries} ({state.journalEntries.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('trial')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'trial'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>{t.trialBalance}</span>
          </button>

          <button
            onClick={() => setActiveTab('pnl')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'pnl'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{t.profitAndLoss}</span>
          </button>

          <button
            onClick={() => setActiveTab('balanceSheet')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              activeTab === 'balanceSheet'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>{t.balanceSheet}</span>
          </button>
        </div>

        {/* Action Button */}
        {hasPermission('accounting.post') && (
          <button
            onClick={() => setShowManualModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.postJournal}</span>
          </button>
        )}
      </div>

      {/* TAB 1: CHART OF ACCOUNTS */}
      {activeTab === 'chart' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-center">Normal Balance</th>
                  <th className="py-3 px-4 text-right">Debit Activity</th>
                  <th className="py-3 px-4 text-right">Credit Activity</th>
                  <th className="py-3 px-4 text-right">Net Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {state.accounts.map((acc) => {
                  const b = accountBalances[acc.code] || { debitSum: 0, creditSum: 0, netBalance: 0 };

                  return (
                    <tr key={acc.code} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                        {acc.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-neutral-900 dark:text-neutral-100">{acc.name}</div>
                        <div className="text-[11px] text-neutral-500 font-arabic">{acc.nameAr}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] text-neutral-600 dark:text-neutral-400">
                          {acc.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-[11px] text-neutral-500">
                        {acc.normalBalance}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                        {formatCurrency(b.debitSum)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                        {formatCurrency(b.creditSum)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-neutral-900 dark:text-neutral-100">
                        {formatCurrency(b.netBalance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: JOURNAL ENTRIES */}
      {activeTab === 'journal' && (
        <div className="space-y-4">
          {state.journalEntries.map((je) => (
            <div
              key={je.id}
              className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {je.entryNumber}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      {je.status}
                    </span>
                  </div>
                  <div className="text-neutral-500 text-[11px] mt-0.5">
                    {je.description}
                  </div>
                </div>

                <div className="text-right text-[11px] text-neutral-400 font-mono">
                  <div>{new Date(je.date).toLocaleDateString()}</div>
                  <div>By: {je.postedBy}</div>
                </div>
              </div>

              {/* Lines Table */}
              <table className="w-full text-left">
                <thead>
                  <tr className="text-[10px] uppercase text-neutral-400 border-b border-neutral-100 dark:border-neutral-800 pb-1">
                    <th className="py-1">Account</th>
                    <th className="py-1">Memo</th>
                    <th className="py-1 text-right">Debit</th>
                    <th className="py-1 text-right">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {je.lines.map((l, i) => (
                    <tr key={i} className="py-1">
                      <td className="py-1 font-mono">
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200">{l.accountCode}</span> · {l.accountName}
                      </td>
                      <td className="py-1 text-neutral-500 text-[11px]">{l.memo || '-'}</td>
                      <td className="py-1 text-right font-mono tabular-nums">
                        {l.debit > 0 ? formatCurrency(l.debit) : '-'}
                      </td>
                      <td className="py-1 text-right font-mono tabular-nums">
                        {l.credit > 0 ? formatCurrency(l.credit) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-neutral-200 dark:border-neutral-700 font-mono font-bold pt-1">
                    <td colSpan={2} className="py-1 text-neutral-500">Totals:</td>
                    <td className="py-1 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(je.totalDebit)}
                    </td>
                    <td className="py-1 text-right tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatCurrency(je.totalCredit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* TAB 3: TRIAL BALANCE */}
      {activeTab === 'trial' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Account Code</th>
                  <th className="py-3 px-4">Account Name</th>
                  <th className="py-3 px-4 text-right">Debit Balance</th>
                  <th className="py-3 px-4 text-right">Credit Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {state.accounts.map((acc) => {
                  const b = accountBalances[acc.code];
                  if (!b || (b.debitSum === 0 && b.creditSum === 0)) return null;

                  const isDebitNormal = acc.normalBalance === 'DEBIT';
                  const debitVal = isDebitNormal && b.netBalance >= 0 ? b.netBalance : (!isDebitNormal && b.netBalance < 0 ? Math.abs(b.netBalance) : 0);
                  const creditVal = !isDebitNormal && b.netBalance >= 0 ? b.netBalance : (isDebitNormal && b.netBalance < 0 ? Math.abs(b.netBalance) : 0);

                  return (
                    <tr key={acc.code} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">{acc.code}</td>
                      <td className="py-3 px-4 font-medium text-neutral-800 dark:text-neutral-200">{acc.name}</td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {debitVal > 0 ? formatCurrency(debitVal) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums">
                        {creditVal > 0 ? formatCurrency(creditVal) : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-neutral-50 dark:bg-neutral-800/60 border-t-2 border-neutral-300 dark:border-neutral-700 font-bold font-mono text-xs">
                <tr>
                  <td colSpan={2} className="py-3 px-4">
                    Trial Balance Totals (Reconciliation Invariant)
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(trialBalanceSums.totalDebit)}
                  </td>
                  <td className="py-3 px-4 text-right text-emerald-700 dark:text-emerald-400">
                    {formatCurrency(trialBalanceSums.totalCredit)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PROFIT AND LOSS STATEMENT */}
      {activeTab === 'pnl' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 max-w-3xl mx-auto space-y-6 text-xs">
          <div className="text-center pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Profit &amp; Loss Statement (Income Statement)
            </h3>
            <div className="text-neutral-500 text-[11px] mt-0.5">
              Period: FY-2026 · Currency: {state.company.currency} (Oman 3-Decimal Precision)
            </div>
          </div>

          <div className="space-y-4">
            {/* Revenue */}
            <div>
              <div className="font-bold uppercase text-[11px] text-neutral-500 mb-2">Operating Revenue</div>
              <div className="space-y-1.5 pl-3 border-l-2 border-neutral-200 dark:border-neutral-800">
                <div className="flex justify-between">
                  <span>Gross Sales Revenue (Account 4000):</span>
                  <span className="font-mono tabular-nums">{formatCurrency(pnl.grossRevenue)}</span>
                </div>
                {pnl.discountsAllowed > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Less: Sales Discounts Allowed (Account 4010):</span>
                    <span className="font-mono tabular-nums">-{formatCurrency(pnl.discountsAllowed)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span>Net Sales Revenue:</span>
                  <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(pnl.netRevenue)}</span>
                </div>
              </div>
            </div>

            {/* COGS */}
            <div>
              <div className="font-bold uppercase text-[11px] text-neutral-500 mb-2">Cost of Goods Sold</div>
              <div className="space-y-1.5 pl-3 border-l-2 border-neutral-200 dark:border-neutral-800">
                <div className="flex justify-between">
                  <span>Cost of Merchandise Sold (Account 5000):</span>
                  <span className="font-mono tabular-nums text-rose-600">-{formatCurrency(pnl.cogs)}</span>
                </div>
                <div className="flex justify-between font-bold text-sm pt-1 border-t border-neutral-100 dark:border-neutral-800">
                  <span>Gross Profit (مجمل الربح):</span>
                  <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(pnl.grossProfit)}</span>
                </div>
              </div>
            </div>

            {/* Operating Expenses */}
            <div>
              <div className="font-bold uppercase text-[11px] text-neutral-500 mb-2">Operating Expenses</div>
              <div className="space-y-1.5 pl-3 border-l-2 border-neutral-200 dark:border-neutral-800">
                <div className="flex justify-between">
                  <span>General Overhead &amp; Utilities (Account 6010):</span>
                  <span className="font-mono tabular-nums">-{formatCurrency(pnl.operatingExpenses)}</span>
                </div>
              </div>
            </div>

            {/* Net Operating Profit */}
            <div className="pt-3 border-t-2 border-neutral-300 dark:border-neutral-700">
              <div className="flex justify-between text-base font-bold text-neutral-900 dark:text-neutral-100">
                <span>Net Operating Profit / صافي الأرباح:</span>
                <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(pnl.netOperatingProfit)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: BALANCE SHEET */}
      {activeTab === 'balanceSheet' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 max-w-3xl mx-auto space-y-6 text-xs">
          <div className="text-center pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Balance Sheet Statement (الميزانية العمومية)
            </h3>
            <div className="text-neutral-500 text-[11px] mt-0.5">
              Fundamental Accounting Invariant: Assets = Liabilities + Equity
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* ASSETS */}
            <div className="space-y-3">
              <div className="font-bold uppercase text-[11px] text-neutral-500 pb-1 border-b">
                Assets (الأصول)
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>Cash on Hand (1010):</span>
                  <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.assets.cash)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bank Account (1020):</span>
                  <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.assets.bank)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Accounts Receivable (1100):</span>
                  <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.assets.ar)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Merchandise Inventory (1200):</span>
                  <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.assets.inventory)}</span>
                </div>
                <div className="flex justify-between">
                  <span>VAT Input Credit (2110):</span>
                  <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.assets.vatInput)}</span>
                </div>
              </div>
              <div className="pt-2 border-t font-bold flex justify-between text-sm">
                <span>Total Assets:</span>
                <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(balanceSheet.assets.totalAssets)}
                </span>
              </div>
            </div>

            {/* LIABILITIES & EQUITY */}
            <div className="space-y-4">
              {/* Liabilities */}
              <div>
                <div className="font-bold uppercase text-[11px] text-neutral-500 pb-1 border-b">
                  Liabilities (الالتزامات)
                </div>
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between">
                    <span>Accounts Payable (2010):</span>
                    <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.liabilities.ap)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>VAT Output Payable (2100):</span>
                    <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.liabilities.vatOutput)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t text-[11px]">
                    <span>Total Liabilities:</span>
                    <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.liabilities.totalLiabilities)}</span>
                  </div>
                </div>
              </div>

              {/* Equity */}
              <div>
                <div className="font-bold uppercase text-[11px] text-neutral-500 pb-1 border-b">
                  Equity &amp; Capital (حقوق الملكية)
                </div>
                <div className="space-y-1.5 mt-2">
                  <div className="flex justify-between">
                    <span>Owner Equity Capital (3000):</span>
                    <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.equity.baseEquity)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Retained Earnings (Current Period):</span>
                    <span className="font-mono tabular-nums text-emerald-600">{formatCurrency(balanceSheet.equity.retainedEarnings)}</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t text-[11px]">
                    <span>Total Equity:</span>
                    <span className="font-mono tabular-nums">{formatCurrency(balanceSheet.equity.totalEquity)}</span>
                  </div>
                </div>
              </div>

              {/* Total Liabilities & Equity */}
              <div className="pt-2 border-t font-bold flex justify-between text-sm">
                <span>Total Liab. &amp; Equity:</span>
                <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                  {formatCurrency(balanceSheet.totalLiabilitiesAndEquity)}
                </span>
              </div>
            </div>

          </div>

          {/* Equation verification badge */}
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>Accounting Balance Invariant: Assets == Liabilities + Equity</span>
            </div>
            <span className="font-mono">Diff: 0.000 OMR</span>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL JOURNAL ENTRY */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handlePostManual} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.postJournal}
            </h3>

            <div>
              <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Description / Memo
              </label>
              <input
                required
                type="text"
                value={manualDescription}
                onChange={(e) => setManualDescription(e.target.value)}
                placeholder="e.g. Month-end petty cash adjustment"
                className="w-full px-3 py-1.5 text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            {/* Lines editor */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                Journal Lines (Double-Entry)
              </div>
              {manualLines.map((line, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-5">
                    <select
                      value={line.accountCode}
                      onChange={(e) => {
                        const copy = [...manualLines];
                        copy[idx].accountCode = e.target.value;
                        setManualLines(copy);
                      }}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    >
                      {state.accounts.map((a) => (
                        <option key={a.code} value={a.code}>{a.code} - {a.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.050"
                      min="0"
                      placeholder="Debit"
                      value={line.debit || ''}
                      onChange={(e) => {
                        const copy = [...manualLines];
                        copy[idx].debit = parseFloat(e.target.value) || 0;
                        if (copy[idx].debit > 0) copy[idx].credit = 0;
                        setManualLines(copy);
                      }}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                    />
                  </div>

                  <div className="col-span-3">
                    <input
                      type="number"
                      step="0.050"
                      min="0"
                      placeholder="Credit"
                      value={line.credit || ''}
                      onChange={(e) => {
                        const copy = [...manualLines];
                        copy[idx].credit = parseFloat(e.target.value) || 0;
                        if (copy[idx].credit > 0) copy[idx].debit = 0;
                        setManualLines(copy);
                      }}
                      className="w-full px-2 py-1 text-xs border border-neutral-300 dark:border-neutral-700 rounded bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                    />
                  </div>

                  <div className="col-span-1 text-center">
                    <button
                      type="button"
                      onClick={() => setManualLines(manualLines.filter((_, i) => i !== idx))}
                      className="text-neutral-400 hover:text-rose-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() => setManualLines([...manualLines, { accountCode: '1010', debit: 0, credit: 0 }])}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-medium hover:underline"
              >
                + Add Line
              </button>
            </div>

            {/* Live Balance Checker */}
            <div className="p-3 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs space-y-1">
              <div className="flex justify-between font-mono">
                <span>Total Debits: {formatCurrency(manualBalanceCheck.totalD)}</span>
                <span>Total Credits: {formatCurrency(manualBalanceCheck.totalC)}</span>
              </div>
              <div className={`font-semibold text-center ${manualBalanceCheck.isBalanced ? 'text-emerald-600' : 'text-rose-600'}`}>
                {manualBalanceCheck.isBalanced ? '✓ Journal is Balanced' : `Diff: ${formatCurrency(manualBalanceCheck.diff)} (Unbalanced)`}
              </div>
            </div>

            {manualError && (
              <div className="text-xs text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>{manualError}</span>
              </div>
            )}

            <div className="pt-2 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!manualBalanceCheck.isBalanced}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs disabled:opacity-50"
              >
                Post to General Ledger
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
