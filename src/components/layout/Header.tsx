import React, { useState } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { translations, Language } from '../../lib/i18n';
import { 
  Building2, 
  UserCheck, 
  Moon, 
  Sun, 
  Globe, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  ShieldCheck,
  Receipt,
  RotateCcw
} from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
  lang: Language;
  onToggleLang: () => void;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenShiftModal: () => void;
  onOpenTestModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onNavigate,
  lang,
  onToggleLang,
  isDark,
  onToggleDark,
  onOpenShiftModal,
  onOpenTestModal,
}) => {
  const { state, activeBranch, db } = useDatabase();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showBranchMenu, setShowBranchMenu] = useState(false);
  const t = translations[lang];

  const primaryNavItems = [
    { key: 'pos', label: t.navPOS },
    { key: 'inventory', label: t.navInventory },
    { key: 'accounting', label: t.navAccounting },
    { key: 'purchasing', label: t.navPurchasing },
    { key: 'reports', label: t.navReports },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 transition-colors">
      {/* Universal Top Bar Contract: Zone 1 (Brand) — Zone 2 (4-5 Nav Links) — Zone 3 (Primary Context/Actions) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-6 h-16">
        
        {/* ZONE 1: Single text element wordmark with brand emblem */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-lg overflow-hidden border border-amber-600/30 shadow-sm shrink-0 bg-neutral-950 flex items-center justify-center">
            <img
              src="/src/assets/images/roguebyte_brand_logo_1792715117512.jpg"
              alt="RogueByte"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <button 
            onClick={() => onNavigate('pos')}
            className="text-left font-bold tracking-tight text-neutral-900 dark:text-neutral-100 text-lg whitespace-nowrap hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            RogueByte <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs tracking-wider uppercase ml-1 px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">ERP</span>
          </button>
        </div>

        {/* ZONE 2: 4-5 single-line clean navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-neutral-600 dark:text-neutral-300">
          {primaryNavItems.map((item) => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.key)}
              className={`whitespace-nowrap transition-colors py-1 ${
                currentView === item.key
                  ? 'text-emerald-700 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                  : 'hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            onClick={() => onNavigate('sales')}
            className={`whitespace-nowrap transition-colors py-1 ${
              currentView === 'sales'
                ? 'text-emerald-700 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.navSales}
          </button>
          <button
            onClick={() => onNavigate('customers')}
            className={`whitespace-nowrap transition-colors py-1 ${
              currentView === 'customers'
                ? 'text-emerald-700 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.navCustomers}
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className={`whitespace-nowrap transition-colors py-1 ${
              currentView === 'settings'
                ? 'text-emerald-700 dark:text-emerald-400 font-semibold border-b-2 border-emerald-600 dark:border-emerald-400'
                : 'hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            {t.navSettings}
          </button>
        </nav>

        {/* ZONE 3: Context controls (Branch, Shift, Active User, Verification) */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Branch Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setShowBranchMenu(!showBranchMenu);
                setShowUserMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors whitespace-nowrap"
              title="Switch Active Branch"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">
                {activeBranch ? (lang === 'ar' ? activeBranch.nameAr : activeBranch.name) : t.allBranches}
              </span>
            </button>

            {showBranchMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1.5 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Select Branch
                </div>
                <button
                  onClick={() => {
                    db.switchBranch('*');
                    setShowBranchMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                    state.activeBranchId === '*' ? 'font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-neutral-700 dark:text-neutral-200'
                  }`}
                >
                  <span>{t.allBranches}</span>
                  {state.activeBranchId === '*' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
                {state.branches.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      db.switchBranch(b.id);
                      setShowBranchMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                      state.activeBranchId === b.id ? 'font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{lang === 'ar' ? b.nameAr : b.name}</div>
                      <div className="text-[10px] text-neutral-400">{b.code} · {b.city}</div>
                    </div>
                    {state.activeBranchId === b.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Cashier Shift Status Button */}
          <button
            onClick={onOpenShiftModal}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
              state.activeShift?.status === 'OPEN'
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
            }`}
            title="Cash Register Shift Status"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {state.activeShift?.status === 'OPEN' ? t.shiftStatus + ': ' + t.shiftOpen : t.shiftStatus + ': ' + t.shiftClose}
            </span>
          </button>

          {/* Active User Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowUserMenu(!showUserMenu);
                setShowBranchMenu(false);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-md transition-colors whitespace-nowrap"
              title="Switch Active User Role"
            >
              <UserCheck className="w-3.5 h-3.5 text-neutral-500" />
              <span className="hidden md:inline font-semibold">{state.currentUser.fullName}</span>
              <span className="text-[10px] text-neutral-400">({state.currentUser.role.replace('_', ' ')})</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1.5 z-50">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                  Switch Active Role (RBAC Simulation)
                </div>
                {state.users.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      db.switchUser(u.id);
                      setShowUserMenu(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-neutral-100 dark:hover:bg-neutral-700 ${
                      state.currentUser.id === u.id ? 'font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30' : 'text-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    <div>
                      <div className="font-medium">{u.fullName}</div>
                      <div className="text-[10px] text-neutral-400">{u.role} · {u.branchIds.includes('*') ? 'All Branches' : u.branchIds.join(', ')}</div>
                    </div>
                    {state.currentUser.id === u.id && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Automated System Verification Tests CTA */}
          <button
            onClick={onOpenTestModal}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-md transition-colors shadow-xs whitespace-nowrap"
            title="Execute 12 Acceptance Tests"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{t.navTests}</span>
          </button>

          {/* Language Toggle (AR / EN) */}
          <button
            onClick={onToggleLang}
            className="p-1.5 text-xs font-bold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title="Toggle Arabic / English"
          >
            {lang === 'en' ? 'عربي' : 'EN'}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleDark}
            className="p-1.5 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-md transition-colors"
            title="Toggle Light / Dark Mode"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-neutral-600" />}
          </button>
        </div>

      </div>
    </header>
  );
};
