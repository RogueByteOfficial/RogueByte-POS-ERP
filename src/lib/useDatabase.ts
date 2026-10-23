/**
 * React hook to bind components reactively to the central DatabaseManager.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { dbManager, DatabaseState } from './storage';
import { formatMoney, round } from './decimal';

export function useDatabase() {
  const [state, setState] = useState<DatabaseState>(() => dbManager.getState());

  useEffect(() => {
    const handleDbChange = (e: any) => {
      setState({ ...e.detail });
    };

    window.addEventListener('roguebyte-db-change', handleDbChange);
    return () => {
      window.removeEventListener('roguebyte-db-change', handleDbChange);
    };
  }, []);

  const activeBranch = useMemo(() => {
    if (state.activeBranchId === '*') return null;
    return state.branches.find((b) => b.id === state.activeBranchId) || state.branches[0];
  }, [state.branches, state.activeBranchId]);

  const activeWarehouses = useMemo(() => {
    if (state.activeBranchId === '*') return state.warehouses;
    return state.warehouses.filter((w) => w.branchId === state.activeBranchId);
  }, [state.warehouses, state.activeBranchId]);

  const defaultWarehouse = useMemo(() => {
    return activeWarehouses.find((w) => w.isDefault) || activeWarehouses[0] || state.warehouses[0];
  }, [activeWarehouses, state.warehouses]);

  const formatCurrency = useCallback(
    (amount: number, locale: string = 'en') => {
      return formatMoney(amount, state.company.currency, state.company.decimalPlaces, locale);
    },
    [state.company.currency, state.company.decimalPlaces]
  );

  const hasPermission = useCallback(
    (permissionKey: string): boolean => {
      if (state.currentUser.role === 'SUPER_ADMIN') return true;
      if (state.currentUser.permissions.includes('*')) return true;
      if (state.currentUser.permissions.includes(permissionKey)) return true;
      const [module] = permissionKey.split('.');
      if (state.currentUser.permissions.includes(`${module}.*`)) return true;
      return false;
    },
    [state.currentUser]
  );

  const canAccessBranch = useCallback(
    (branchId: string): boolean => {
      if (state.currentUser.branchIds.includes('*')) return true;
      return state.currentUser.branchIds.includes(branchId);
    },
    [state.currentUser]
  );

  return {
    state,
    activeBranch,
    activeWarehouses,
    defaultWarehouse,
    formatCurrency,
    hasPermission,
    canAccessBranch,
    db: dbManager,
  };
}
