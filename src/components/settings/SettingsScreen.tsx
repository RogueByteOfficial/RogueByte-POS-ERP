import React, { useState } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { translations, Language } from '../../lib/i18n';
import { InvoiceSettings, Company } from '../../types/models';
import { 
  Settings, 
  Building2, 
  Users, 
  FileText, 
  ShieldCheck, 
  Database, 
  Upload, 
  Download, 
  RotateCcw,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface SettingsScreenProps {
  lang: Language;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ lang }) => {
  const { state, db, formatCurrency, hasPermission } = useDatabase();
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'branding' | 'branches' | 'rbac' | 'backup' | 'audit'>('branding');
  
  // Branding & Invoice Settings Form
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceSettings>({ ...state.invoiceSettings });
  const [companySettings, setCompanySettings] = useState<Company>({ ...state.company });
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string>('');

  // Backup & Restore State
  const [restoreJson, setRestoreJson] = useState<string>('');
  const [restoreStatus, setRestoreStatus] = useState<string>('');

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    db.updateInvoiceSettings(invoiceSettings);
    db.updateCompany(companySettings);
    setSaveSuccessNotice('Settings and invoice customization saved successfully!');
    setTimeout(() => setSaveSuccessNotice(''), 3000);
  };

  const handleDownloadBackup = () => {
    const json = db.exportBackup();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RogueByte_Backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackup = () => {
    if (!restoreJson.trim()) {
      setRestoreStatus('Please paste backup JSON content first');
      return;
    }
    const res = db.restoreBackup(restoreJson);
    if (res.success) {
      setRestoreStatus('✓ Backup verified and database state restored successfully!');
      setRestoreJson('');
    } else {
      setRestoreStatus(`Error: ${res.error}`);
    }
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
          {t.navSettings} &amp; Enterprise Governance
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Configure multi-branch taxation, invoice layout templates, granular RBAC permissions, audit trail, and JSON disaster recovery.
        </p>
      </div>

      {saveSuccessNotice && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'branding'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Invoicing &amp; Branding</span>
        </button>

        <button
          onClick={() => setActiveTab('branches')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'branches'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Branches &amp; Warehouses</span>
        </button>

        <button
          onClick={() => setActiveTab('rbac')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'rbac'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Users &amp; RBAC Roles</span>
        </button>

        <button
          onClick={() => setActiveTab('backup')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'backup'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Backup &amp; Disaster Recovery</span>
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            activeTab === 'audit'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Audit Logs ({state.auditLogs.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('developer' as any)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
            (activeTab as any) === 'developer'
              ? 'bg-white dark:bg-neutral-900 text-emerald-600 dark:text-emerald-400 font-semibold shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Developer &amp; Team</span>
        </button>
      </div>

      {/* TAB 1: INVOICING & BRANDING */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 max-w-4xl space-y-6 text-xs">
          
          <div className="flex items-center justify-between pb-4 border-b border-neutral-200 dark:border-neutral-800">
            <div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                Invoice Template &amp; Brand Customization
              </h3>
              <p className="text-neutral-500 text-[11px]">
                Branded receipt headers, official stamp, VAT tax breakdown, QR code formatting, and thermal printer dimensions.
              </p>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-xs transition-colors"
            >
              Save Configuration
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Business Name (English)</label>
              <input
                type="text"
                value={invoiceSettings.companyName}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, companyName: e.target.value })}
                className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Business Name (Arabic)</label>
              <input
                type="text"
                value={invoiceSettings.companyNameAr}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, companyNameAr: e.target.value })}
                className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-arabic"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Oman VAT TRN</label>
              <input
                type="text"
                value={invoiceSettings.taxNumber}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, taxNumber: e.target.value })}
                className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Commercial Registration (CR)</label>
              <input
                type="text"
                value={invoiceSettings.crNumber}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, crNumber: e.target.value })}
                className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Default Receipt Format</label>
              <select
                value={invoiceSettings.receiptWidth}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, receiptWidth: e.target.value as any })}
                className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-medium"
              >
                <option value="80mm">80 mm Thermal POS</option>
                <option value="58mm">58 mm Thermal POS</option>
                <option value="A4">A4 Full Tax Invoice</option>
              </select>
            </div>
          </div>

          {/* Logo preview */}
          <div>
            <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-2">Current Brand Logo</label>
            <div className="flex items-center gap-4 p-3 border border-neutral-200 dark:border-neutral-800 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
              <img
                src={invoiceSettings.logoUrl}
                alt="Logo Preview"
                className="w-16 h-16 object-cover rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-950"
              />
              <div className="text-xs">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Official Brand Monogram</div>
                <div className="text-[11px] text-neutral-500">Asset: {invoiceSettings.logoUrl}</div>
                <div className="text-[10px] text-emerald-600 mt-1">✓ Active on all printed receipts and A4 invoices</div>
              </div>
            </div>
          </div>

          {/* Footers and Disclaimers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Receipt Footer Note (English)</label>
              <textarea
                rows={2}
                value={invoiceSettings.footerText}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footerText: e.target.value })}
                className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Receipt Footer Note (Arabic)</label>
              <textarea
                rows={2}
                value={invoiceSettings.footerTextAr}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, footerTextAr: e.target.value })}
                className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-arabic"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={invoiceSettings.showQrCode}
                onChange={(e) => setInvoiceSettings({ ...invoiceSettings, showQrCode: e.target.checked })}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="font-medium text-neutral-700 dark:text-neutral-300">
                Include Electronic Invoice QR Code on Receipts
              </span>
            </label>
          </div>
        </form>
      )}

      {/* TAB 2: BRANCHES & WAREHOUSES */}
      {activeTab === 'branches' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-sm">
              Configured Branches ({state.branches.length})
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
              {state.branches.map((b) => (
                <div key={b.id} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{b.name}</div>
                    <div className="text-[11px] text-neutral-500 font-arabic">{b.nameAr}</div>
                    <div className="text-neutral-400 text-[11px] mt-1 font-mono">
                      Code: {b.code} · Prefix: {b.invoicePrefix} · Tax TRN: {b.taxRegistrationNumber} · City: {b.city}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-sm">
              Configured Warehouses ({state.warehouses.length})
            </div>
            <div className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
              {state.warehouses.map((w) => {
                const branch = state.branches.find((b) => b.id === w.branchId);
                return (
                  <div key={w.id} className="p-4 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">{w.name}</div>
                      <div className="text-[11px] text-neutral-500 font-arabic">{w.nameAr}</div>
                      <div className="text-neutral-400 text-[11px] mt-0.5 font-mono">
                        Code: {w.code} · Branch: {branch ? branch.name : w.branchId} {w.isDefault ? '· (Default Receiving Store)' : ''}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                      Active
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: USERS & RBAC */}
      {activeTab === 'rbac' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 font-bold text-sm">
            System Users &amp; Role-Based Access Control (RBAC)
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
            {state.users.map((u) => (
              <div key={u.id} className="p-4 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{u.fullName}</div>
                  <div className="text-neutral-500">{u.email} · Username: @{u.username}</div>
                  <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                    Assigned Branches: {u.branchIds.includes('*') ? 'All Branches (Consolidated)' : u.branchIds.join(', ')}
                  </div>
                  <div className="text-[10px] text-neutral-400 mt-0.5">
                    Permissions: {u.permissions.join(', ')}
                  </div>
                </div>
                <div className="text-right">
                  <span className="px-2.5 py-1 rounded text-xs font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                    {u.role.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 max-w-3xl space-y-6 text-xs">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Database Backup &amp; Disaster Recovery
            </h3>
            <p className="text-neutral-500 text-[11px]">
              Export full persistent database snapshots or restore from valid JSON backup files.
            </p>
          </div>

          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg space-y-3">
            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
              Export Full Database Backup
            </div>
            <p className="text-neutral-500 text-[11px]">
              Exports all relational entities: branches, warehouses, products, inventory ledger, double-entry journals, sales, customers, suppliers, and audit logs.
            </p>
            <button
              onClick={handleDownloadBackup}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup</span>
            </button>
          </div>

          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg space-y-3">
            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
              Restore Database from JSON
            </div>
            <textarea
              rows={4}
              value={restoreJson}
              onChange={(e) => setRestoreJson(e.target.value)}
              placeholder="Paste JSON backup text here..."
              className="w-full px-3 py-2 font-mono text-xs border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
            />
            {restoreStatus && (
              <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                {restoreStatus}
              </div>
            )}
            <button
              onClick={handleRestoreBackup}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Verify &amp; Restore</span>
            </button>
          </div>

          <div className="p-4 border border-rose-200 dark:border-rose-900 bg-rose-50/50 dark:bg-rose-950/20 rounded-lg flex items-center justify-between">
            <div>
              <div className="font-semibold text-rose-800 dark:text-rose-300">Factory Reset Database</div>
              <div className="text-[11px] text-rose-600/80">Re-seeds system to initial production demo state.</div>
            </div>
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset the database to factory seed data?')) {
                  db.resetToDefault();
                  alert('Database reset to clean factory state.');
                }
              }}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-md shadow-xs transition-colors"
            >
              Factory Reset
            </button>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT LOGS */}
      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Module</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Event Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {state.auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                      {log.userName}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono text-[11px]">
                      {log.module}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-semibold px-2 py-0.5 rounded text-[10px] bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: DEVELOPER & TEAM CREDITS */}
      {(activeTab as any) === 'developer' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg p-6 max-w-3xl space-y-6 text-xs">
          <div>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              RogueByte Systems · Developer &amp; Team Information
            </h3>
            <p className="text-neutral-500 text-[11px]">
              Official development, marketing, business, and inquiry contact channels.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg space-y-2">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                System Architect &amp; Developer
              </div>
              <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Fares sidahmed (roguebyte)
              </div>
              <div className="text-neutral-500 text-[11px]">
                Lead Software Architect &amp; Engineering
              </div>
              <div className="pt-2 flex flex-wrap gap-2">
                <a
                  href="https://roguebyte.online"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-medium transition-colors"
                >
                  roguebyte.online
                </a>
                <a
                  href="https://ko-fi.com/roguebyte"
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-[#FF5E5B] hover:opacity-90 text-white rounded text-[11px] font-medium transition-colors"
                >
                  Support on Ko-fi
                </a>
              </div>
            </div>

            <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg space-y-2">
              <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Marketing &amp; Growth
              </div>
              <div className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Mouahdi Adel
              </div>
              <div className="text-neutral-500 text-[11px]">
                Marketing Director &amp; Commercial Relations
              </div>
            </div>
          </div>

          <div className="p-4 bg-neutral-50 dark:bg-neutral-800/60 rounded-lg space-y-3">
            <div className="font-semibold text-neutral-800 dark:text-neutral-200">
              Official Contact &amp; Inquiry Channels
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">General Contact</div>
                <a href="mailto:contact@roguebyte.online" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline block mt-1">
                  contact@roguebyte.online
                </a>
              </div>

              <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">Help &amp; Inquiries / استفسار</div>
                <a href="mailto:help@roguebyte.online" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline block mt-1">
                  help@roguebyte.online
                </a>
              </div>

              <div className="p-3 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-lg">
                <div className="text-[10px] text-neutral-400 uppercase font-semibold">Business Partnerships</div>
                <a href="mailto:business@roguebyte.online" className="text-emerald-600 dark:text-emerald-400 font-medium hover:underline block mt-1">
                  business@roguebyte.online
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
