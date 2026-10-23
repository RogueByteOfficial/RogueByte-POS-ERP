/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { POSScreen } from './components/pos/POSScreen';
import { InventoryScreen } from './components/inventory/InventoryScreen';
import { SalesScreen } from './components/sales/SalesScreen';
import { AccountingScreen } from './components/accounting/AccountingScreen';
import { PurchasingScreen } from './components/purchasing/PurchasingScreen';
import { CRMScreen } from './components/crm/CRMScreen';
import { ReportsScreen } from './components/reports/ReportsScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { ShiftModal } from './components/pos/ShiftModal';
import { TestRunnerModal } from './components/testing/TestRunnerModal';
import { Language } from './lib/i18n';

export default function App() {
  const [currentView, setCurrentView] = useState<string>('pos');
  const [lang, setLang] = useState<Language>('en');
  const [isDark, setIsDark] = useState<boolean>(false);
  const [showShiftModal, setShowShiftModal] = useState<boolean>(false);
  const [showTestModal, setShowTestModal] = useState<boolean>(false);

  // Sync RTL and lang attribute
  useEffect(() => {
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  // Sync dark class on html root
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 transition-colors">
      
      {/* Top Header conforming to the 3-zone Top Bar Contract */}
      <Header
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        lang={lang}
        onToggleLang={() => setLang(lang === 'en' ? 'ar' : 'en')}
        isDark={isDark}
        onToggleDark={() => setIsDark(!isDark)}
        onOpenShiftModal={() => setShowShiftModal(true)}
        onOpenTestModal={() => setShowTestModal(true)}
      />

      {/* Main Viewport Content Area */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        {currentView === 'pos' && (
          <POSScreen
            lang={lang}
            onOpenShiftModal={() => setShowShiftModal(true)}
          />
        )}
        {currentView === 'inventory' && <InventoryScreen lang={lang} />}
        {currentView === 'sales' && <SalesScreen lang={lang} />}
        {currentView === 'accounting' && <AccountingScreen lang={lang} />}
        {currentView === 'purchasing' && <PurchasingScreen lang={lang} />}
        {currentView === 'customers' && <CRMScreen lang={lang} />}
        {currentView === 'reports' && <ReportsScreen lang={lang} />}
        {currentView === 'settings' && <SettingsScreen lang={lang} />}
      </main>

      {/* Global Cash Register Shift Modal */}
      {showShiftModal && (
        <ShiftModal
          onClose={() => setShowShiftModal(false)}
          lang={lang}
        />
      )}

      {/* Automated Invariant Verification Test Runner Modal */}
      {showTestModal && (
        <TestRunnerModal
          onClose={() => setShowTestModal(false)}
          lang={lang}
        />
      )}

    </div>
  );
}
