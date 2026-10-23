import React, { useState } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { Customer } from '../../types/models';
import { translations, Language } from '../../lib/i18n';
import { Users, CreditCard, Award, Plus, Search, FileText } from 'lucide-react';

interface CRMScreenProps {
  lang: Language;
}

export const CRMScreen: React.FC<CRMScreenProps> = ({ lang }) => {
  const { state, db, formatCurrency, hasPermission } = useDatabase();
  const t = translations[lang];

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomerForStatement, setSelectedCustomerForStatement] = useState<Customer | null>(null);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState<boolean>(false);

  // New Customer State
  const [name, setName] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState<number>(1000);
  const [terms, setTerms] = useState<number>(30);

  const filteredCustomers = state.customers.filter((c) => {
    if (!c.active) return false;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    const newCust: Customer = {
      id: `CUST-${Date.now()}`,
      code: `CUST-${String(state.customers.length + 1).padStart(3, '0')}`,
      name,
      nameAr,
      phone,
      email,
      taxNumber,
      creditLimit,
      currentBalance: 0,
      loyaltyPoints: 0,
      paymentTermsDays: terms,
      active: true,
    };

    state.customers.push(newCust);
    db.logAudit(state.currentUser.id, state.currentUser.fullName, 'CUSTOMER_CREATED', 'CRM', `Added customer ${name}`);
    setShowAddCustomerModal(false);
    setName('');
    setNameAr('');
    setPhone('');
    setEmail('');
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
            {t.customersList}
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Manage corporate client accounts, credit limits, accounts receivable statements, and loyalty reward tiers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer, phone, code..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {hasPermission('crm.manage_customers') && (
            <button
              onClick={() => setShowAddCustomerModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Customer</span>
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Customer Name &amp; Code</th>
                <th className="py-3 px-4">Contact Details</th>
                <th className="py-3 px-4">VAT Registration</th>
                <th className="py-3 px-4 text-right">Credit Limit</th>
                <th className="py-3 px-4 text-right">Current Balance (AR)</th>
                <th className="py-3 px-4 text-center">Loyalty Points</th>
                <th className="py-3 px-4 text-center">Statement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
              {filteredCustomers.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                  <td className="py-3 px-4">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">{c.name}</div>
                    {c.nameAr && <div className="text-[11px] text-neutral-500 font-arabic">{c.nameAr}</div>}
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">{c.code}</div>
                  </td>
                  <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                    <div>{c.phone}</div>
                    {c.email && <div className="text-neutral-400 text-[11px]">{c.email}</div>}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-neutral-500">
                    {c.taxNumber || 'Non-registered'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                    {c.creditLimit > 0 ? formatCurrency(c.creditLimit) : 'Cash Only'}
                  </td>
                  <td className={`py-3 px-4 text-right font-mono tabular-nums font-bold ${c.currentBalance > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {formatCurrency(c.currentBalance)}
                  </td>
                  <td className="py-3 px-4 text-center font-mono tabular-nums">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                      <Award className="w-3 h-3" />
                      {c.loyaltyPoints} pts
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => setSelectedCustomerForStatement(c)}
                      className="px-2.5 py-1 text-[11px] bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-700 dark:text-neutral-300 rounded font-medium transition-colors"
                    >
                      Statement
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CUSTOMER STATEMENT MODAL */}
      {selectedCustomerForStatement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
                  Account Statement · {selectedCustomerForStatement.name}
                </h3>
                <div className="text-xs text-neutral-400">Code: {selectedCustomerForStatement.code} · VAT: {selectedCustomerForStatement.taxNumber || 'N/A'}</div>
              </div>
              <button
                onClick={() => setSelectedCustomerForStatement(null)}
                className="text-neutral-400 hover:text-neutral-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <span className="text-neutral-400">Approved Credit Limit:</span>
                <div className="font-mono font-bold text-sm text-neutral-900 dark:text-neutral-100 mt-0.5">
                  {formatCurrency(selectedCustomerForStatement.creditLimit)}
                </div>
              </div>

              <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <span className="text-neutral-400">Current Outstanding (AR):</span>
                <div className="font-mono font-bold text-sm text-rose-600 mt-0.5">
                  {formatCurrency(selectedCustomerForStatement.currentBalance)}
                </div>
              </div>
            </div>

            {/* Invoices list */}
            <div className="text-xs space-y-2">
              <div className="font-semibold text-neutral-700 dark:text-neutral-300">
                Recent Invoices for this Account
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1.5 border border-neutral-200 dark:border-neutral-800 rounded-lg p-2">
                {state.sales.filter((s) => s.customerId === selectedCustomerForStatement.id).length === 0 ? (
                  <p className="text-neutral-400 py-3 text-center">No transaction records found for this account.</p>
                ) : (
                  state.sales
                    .filter((s) => s.customerId === selectedCustomerForStatement.id)
                    .map((s) => (
                      <div key={s.id} className="flex justify-between items-center p-2 rounded bg-neutral-50 dark:bg-neutral-800/50">
                        <div>
                          <div className="font-mono font-semibold">{s.invoiceNumber}</div>
                          <div className="text-[10px] text-neutral-400">{new Date(s.date).toLocaleDateString()}</div>
                        </div>
                        <div className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(s.grandTotal)}
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedCustomerForStatement(null)}
              className="w-full py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-semibold rounded-lg"
            >
              Close Statement
            </button>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOMER */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleAddCustomer} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Add New Customer Account
            </h3>

            <div className="text-xs space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Customer / Company Name *</label>
                <input
                  required
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Muscat Tech Services LLC"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Arabic Name</label>
                <input
                  type="text"
                  value={nameAr}
                  onChange={(e) => setNameAr(e.target.value)}
                  placeholder="e.g. شركة مسقط للخدمات التقنية"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-arabic"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+968 9123 4567"
                    className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">VAT TRN</label>
                  <input
                    type="text"
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value)}
                    placeholder="OM1100..."
                    className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Credit Limit (OMR)</label>
                  <input
                    type="number"
                    step="100"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Payment Terms (Days)</label>
                  <input
                    type="number"
                    value={terms}
                    onChange={(e) => setTerms(parseInt(e.target.value) || 30)}
                    className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddCustomerModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Save Customer
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
