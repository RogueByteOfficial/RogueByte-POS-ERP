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

  // Modals for Branches, Warehouses & Users
  const [showAddBranchModal, setShowAddBranchModal] = useState<boolean>(false);
  const [showAddWarehouseModal, setShowAddWarehouseModal] = useState<boolean>(false);
  const [showUserModal, setShowUserModal] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<any>(null);

  // Add Branch Form State
  const [branchCode, setBranchCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [branchNameAr, setBranchNameAr] = useState('');
  const [branchCity, setBranchCity] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [branchPhone, setBranchPhone] = useState('');
  const [branchTaxNo, setBranchTaxNo] = useState('OM1100482938-');
  const [branchPrefix, setBranchPrefix] = useState('INV-');

  // Add Warehouse Form State
  const [whBranchId, setWhBranchId] = useState(state.branches[0]?.id || '');
  const [whCode, setWhCode] = useState('');
  const [whName, setWhName] = useState('');
  const [whNameAr, setWhNameAr] = useState('');
  const [whIsDefault, setWhIsDefault] = useState(false);

  // User / Employee Form State
  const [userFullName, setUserFullName] = useState('');
  const [userUsername, setUserUsername] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<any>('CASHIER');
  const [userBranches, setUserBranches] = useState<string[]>(['*']);
  const [userPermissions, setUserPermissions] = useState<string[]>(['pos.sale', 'pos.shift']);

  const allAvailablePermissions = [
    { key: 'pos.sale', label: 'Create POS Sales & Orders' },
    { key: 'pos.discount', label: 'Apply Cart & Item Discounts' },
    { key: 'pos.refund', label: 'Process Returns & Refunds' },
    { key: 'pos.hold', label: 'Hold & Resume Sales' },
    { key: 'pos.shift', label: 'Open & Close Cash Shift' },
    { key: 'inventory.view', label: 'View Stock Quantities & Catalog' },
    { key: 'inventory.manage', label: 'Add & Edit Product Specifications' },
    { key: 'inventory.transfer', label: 'Request & Approve Stock Transfers' },
    { key: 'inventory.adjust_stock', label: 'Manual Stock Adjustments' },
    { key: 'purchasing.create_po', label: 'Create Purchase Orders' },
    { key: 'purchasing.receive_goods', label: 'Confirm Goods Receipts (GRN)' },
    { key: 'accounting.view', label: 'View Financial Reports & Statements' },
    { key: 'accounting.post', label: 'Post Manual Journal Entries' },
    { key: 'crm.manage_customers', label: 'Manage Customers & Credit Limits' },
    { key: 'settings.manage', label: 'Manage System Settings & Backup' },
  ];

  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserFullName('');
    setUserUsername('');
    setUserEmail('');
    setUserRole('CASHIER');
    setUserBranches([state.branches[0]?.id || '*']);
    setUserPermissions(['pos.sale', 'pos.shift']);
    setShowUserModal(true);
  };

  const handleOpenEditUser = (user: any) => {
    setEditingUser(user);
    setUserFullName(user.fullName);
    setUserUsername(user.username);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserBranches([...user.branchIds]);
    setUserPermissions([...user.permissions]);
    setShowUserModal(true);
  };

  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userFullName || !userUsername) return;

    const userObj = {
      id: editingUser ? editingUser.id : `USR-${Date.now().toString().slice(-4)}`,
      username: userUsername,
      fullName: userFullName,
      email: userEmail || `${userUsername}@roguebyte.om`,
      role: userRole,
      branchIds: userBranches.length === 0 ? ['*'] : userBranches,
      permissions: userRole === 'SUPER_ADMIN' ? ['*'] : userPermissions,
      active: true,
    };

    db.upsertUser(userObj);
    setShowUserModal(false);
    setSaveSuccessNotice(editingUser ? `Updated permissions for ${userFullName}` : `Created employee ${userFullName}`);
    setTimeout(() => setSaveSuccessNotice(''), 3000);
  };

  const handleSaveBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchCode || !branchName) return;

    db.addBranch({
      code: branchCode,
      name: branchName,
      nameAr: branchNameAr || branchName,
      city: branchCity || 'Oman',
      address: branchAddress,
      phone: branchPhone,
      taxRegistrationNumber: branchTaxNo,
      invoicePrefix: branchPrefix.endsWith('-') ? branchPrefix : `${branchPrefix}-`,
    });

    setShowAddBranchModal(false);
    setBranchCode('');
    setBranchName('');
    setBranchNameAr('');
    setSaveSuccessNotice(`Branch ${branchName} and default warehouse registered successfully!`);
    setTimeout(() => setSaveSuccessNotice(''), 3000);
  };

  const handleSaveWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!whCode || !whName) return;

    db.addWarehouse({
      branchId: whBranchId,
      code: whCode,
      name: whName,
      nameAr: whNameAr || whName,
      isDefault: whIsDefault,
    });

    setShowAddWarehouseModal(false);
    setWhCode('');
    setWhName('');
    setWhNameAr('');
    setSaveSuccessNotice(`Warehouse ${whName} created successfully!`);
    setTimeout(() => setSaveSuccessNotice(''), 3000);
  };

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
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Configured Branches ({state.branches.length})
                </h3>
                <p className="text-[11px] text-neutral-500">Each branch maintains isolated POS registers, users, and warehouses.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBranchModal(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                + Add New Branch
              </button>
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
            <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                  Configured Warehouses ({state.warehouses.length})
                </h3>
                <p className="text-[11px] text-neutral-500">Depots and retail floor locations assigned to branches.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddWarehouseModal(true)}
                className="px-3 py-1.5 bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
              >
                + Add Warehouse
              </button>
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
          <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-neutral-900 dark:text-neutral-100">
                System Users &amp; Role-Based Access Control (RBAC)
              </h3>
              <p className="text-[11px] text-neutral-500">Configure employee roles, branch data isolation, and granular module permissions.</p>
            </div>
            <button
              type="button"
              onClick={handleOpenAddUser}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              + Add User / Employee
            </button>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800 text-xs">
            {state.users.map((u) => (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">{u.fullName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                      {u.role.replace('_', ' ')}
                    </span>
                    {state.currentUser.id === u.id && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-bold">
                        Current Session
                      </span>
                    )}
                  </div>
                  <div className="text-neutral-500 mt-0.5">{u.email} · Username: @{u.username}</div>
                  <div className="text-[11px] text-neutral-400 mt-1 font-mono">
                    Assigned Branches: {u.branchIds.includes('*') ? 'All Branches (Consolidated)' : u.branchIds.join(', ')}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1 max-w-xl">
                    <span className="font-semibold text-neutral-600 dark:text-neutral-300">Permissions: </span>
                    {u.permissions.join(' · ')}
                  </div>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenEditUser(u)}
                    className="px-2.5 py-1 text-xs font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded transition-colors"
                  >
                    Edit Permissions
                  </button>
                  {state.currentUser.id !== u.id && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete user ${u.fullName}?`)) {
                          db.deleteUser(u.id);
                        }
                      }}
                      className="px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition-colors"
                    >
                      Delete
                    </button>
                  )}
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

      {/* MODAL: ADD BRANCH */}
      {showAddBranchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleSaveBranch} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Add New Branch (إضافة فرع جديد)
            </h3>
            <p className="text-[11px] text-neutral-500">
              Creating a branch automatically creates its main central storage warehouse and initial POS cashier terminal.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Branch Code (e.g. SLL-04) *</label>
                <input
                  required
                  type="text"
                  value={branchCode}
                  onChange={(e) => setBranchCode(e.target.value)}
                  placeholder="e.g. SLL-04"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">City / Region *</label>
                <input
                  required
                  type="text"
                  value={branchCity}
                  onChange={(e) => setBranchCity(e.target.value)}
                  placeholder="e.g. Nizwa, Dhofar, Muscat"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Branch Name (English) *</label>
                <input
                  required
                  type="text"
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="e.g. Nizwa Heritage Mall Branch"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Branch Name (Arabic)</label>
                <input
                  type="text"
                  value={branchNameAr}
                  onChange={(e) => setBranchNameAr(e.target.value)}
                  placeholder="e.g. فرع نزوى التراثي"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-arabic"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Branch Tax TRN</label>
                <input
                  type="text"
                  value={branchTaxNo}
                  onChange={(e) => setBranchTaxNo(e.target.value)}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Invoice Prefix (e.g. NZW-INV-) *</label>
                <input
                  required
                  type="text"
                  value={branchPrefix}
                  onChange={(e) => setBranchPrefix(e.target.value)}
                  placeholder="NZW-INV-"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Phone Contact</label>
                <input
                  type="text"
                  value={branchPhone}
                  onChange={(e) => setBranchPhone(e.target.value)}
                  placeholder="+968 2541 ..."
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Full Physical Address</label>
                <input
                  type="text"
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="Street / Mall Location"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddBranchModal(false)}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-xs"
              >
                Register Branch
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ADD WAREHOUSE */}
      {showAddWarehouseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleSaveWarehouse} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Add Warehouse / Depot (إضافة مستودع)
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Assigned Branch *</label>
                <select
                  value={whBranchId}
                  onChange={(e) => setWhBranchId(e.target.value)}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  {state.branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name} ({b.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Warehouse Code *</label>
                <input
                  required
                  type="text"
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value)}
                  placeholder="e.g. MCT-SEC-02"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Warehouse Name (English) *</label>
                <input
                  required
                  type="text"
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  placeholder="e.g. Secondary Overflow Depot"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Warehouse Name (Arabic)</label>
                <input
                  type="text"
                  value={whNameAr}
                  onChange={(e) => setWhNameAr(e.target.value)}
                  placeholder="e.g. مستودع التخزين الإضافي"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-arabic"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddWarehouseModal(false)}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-xs"
              >
                Save Warehouse
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: USER & RBAC PERMISSIONS */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleSaveUser} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-xl w-full p-6 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {editingUser ? `Edit Employee Permissions: ${editingUser.fullName}` : 'Add New Employee & Role (إضافة وتعديل صلاحيات الموظف)'}
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Full Name *</label>
                <input
                  required
                  type="text"
                  value={userFullName}
                  onChange={(e) => setUserFullName(e.target.value)}
                  placeholder="e.g. Nasser Al-Kharusi"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Username *</label>
                <input
                  required
                  type="text"
                  value={userUsername}
                  onChange={(e) => setUserUsername(e.target.value)}
                  placeholder="e.g. nasser.pos"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="employee@roguebyte.om"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Role Type (الدور الوظيفي) *</label>
                <select
                  value={userRole}
                  onChange={(e) => {
                    const r = e.target.value;
                    setUserRole(r);
                    if (r === 'SUPER_ADMIN') {
                      setUserPermissions(['*']);
                      setUserBranches(['*']);
                    } else if (r === 'BRANCH_MANAGER') {
                      setUserPermissions(['pos.sale', 'pos.discount', 'pos.refund', 'pos.hold', 'pos.shift', 'inventory.view', 'inventory.transfer', 'purchasing.create_po', 'crm.manage_customers']);
                    } else if (r === 'ACCOUNTANT') {
                      setUserPermissions(['accounting.view', 'accounting.post', 'reports.view']);
                    } else if (r === 'CASHIER') {
                      setUserPermissions(['pos.sale', 'pos.hold', 'pos.shift']);
                    }
                  }}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold"
                >
                  <option value="SUPER_ADMIN">Super Administrator (All Access)</option>
                  <option value="COMPANY_OWNER">Company Owner</option>
                  <option value="BRANCH_MANAGER">Branch Manager</option>
                  <option value="ACCOUNTANT">Chief Accountant</option>
                  <option value="CASHIER">Cashier (Point of Sale)</option>
                  <option value="INVENTORY_MANAGER">Inventory Manager</option>
                  <option value="AUDITOR">Auditor &amp; Compliance</option>
                </select>
              </div>
            </div>

            {/* Branch Assignment */}
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                Branch Data Isolation (الفروع المصرح بها)
              </label>
              <div className="space-y-1.5 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                <label className="flex items-center gap-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={userBranches.includes('*')}
                    onChange={(e) => {
                      if (e.target.checked) setUserBranches(['*']);
                      else setUserBranches([state.branches[0].id]);
                    }}
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <span>All Branches (Consolidated Head Office Access)</span>
                </label>

                {!userBranches.includes('*') && (
                  <div className="pt-2 pl-4 space-y-1 border-t border-neutral-200 dark:border-neutral-700">
                    {state.branches.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={userBranches.includes(b.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserBranches([...userBranches, b.id]);
                            } else {
                              setUserBranches(userBranches.filter((id) => id !== b.id));
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span>{b.name} ({b.code})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Granular Permissions */}
            <div>
              <label className="block font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                Granular Module Permissions (الصلاحيات الدقيقة)
              </label>
              {userRole === 'SUPER_ADMIN' ? (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300">
                  Super Administrator role inherently holds wildcard (<code className="font-mono font-bold">*</code>) full access across every system module.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-neutral-50 dark:bg-neutral-800/50 max-h-48 overflow-y-auto">
                  {allAvailablePermissions.map((perm) => {
                    const isChecked = userPermissions.includes('*') || userPermissions.includes(perm.key);
                    return (
                      <label key={perm.key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUserPermissions([...userPermissions.filter((p) => p !== '*'), perm.key]);
                            } else {
                              setUserPermissions(userPermissions.filter((p) => p !== perm.key && p !== '*'));
                            }
                          }}
                          className="rounded text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px]">{perm.label}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow-xs"
              >
                Save Employee &amp; Permissions
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
