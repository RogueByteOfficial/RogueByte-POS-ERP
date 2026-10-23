import React, { useState, useMemo } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { Product, StockTransfer, StockLevel } from '../../types/models';
import { translations, Language } from '../../lib/i18n';
import { round, add, sub, mul } from '../../lib/decimal';
import { 
  Package, 
  ArrowRightLeft, 
  History, 
  AlertTriangle, 
  Plus, 
  Search, 
  Building2, 
  CheckCircle2, 
  XCircle,
  Truck,
  RotateCcw,
  Sliders,
  DollarSign
} from 'lucide-react';

interface InventoryScreenProps {
  lang: Language;
}

export const InventoryScreen: React.FC<InventoryScreenProps> = ({ lang }) => {
  const { state, db, formatCurrency, activeBranch, activeWarehouses, hasPermission } = useDatabase();
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'products' | 'transfers' | 'ledger'>('products');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedWarehouseFilter, setSelectedWarehouseFilter] = useState<string>('ALL');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState<boolean>(false);
  const [selectedProductForAdj, setSelectedProductForAdj] = useState<Product | null>(null);

  // New Product Form State
  const [newSku, setNewSku] = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newName, setNewName] = useState('');
  const [newNameAr, setNewNameAr] = useState('');
  const [newCategory, setNewCategory] = useState(state.categories[0].id);
  const [newBrand, setNewBrand] = useState('RogueByte');
  const [newUnit, setNewUnit] = useState('pcs');
  const [newCostPrice, setNewCostPrice] = useState<number>(5.000);
  const [newSellingPrice, setNewSellingPrice] = useState<number>(8.500);
  const [newMinStock, setNewMinStock] = useState<number>(10);
  const [newInitStockMuscat, setNewInitStockMuscat] = useState<number>(50);

  // Stock Adjustment State
  const [adjWarehouseId, setAdjWarehouseId] = useState(state.warehouses[0].id);
  const [adjNewQuantity, setAdjNewQuantity] = useState<number>(0);
  const [adjReason, setAdjReason] = useState<string>('Physical stock count reconciliation');

  // Stock Transfer Form State
  const [trfSourceWh, setTrfSourceWh] = useState(state.warehouses[0].id);
  const [trfDestWh, setTrfDestWh] = useState(state.warehouses[1]?.id || state.warehouses[0].id);
  const [trfProductId, setTrfProductId] = useState(state.products[0].id);
  const [trfQty, setTrfQty] = useState<number>(10);
  const [trfNotes, setTrfNotes] = useState<string>('Inter-branch store replenishment');

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      if (!p.active) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.nameAr.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q) ||
          p.barcode.includes(q)
        );
      }
      return true;
    });
  }, [state.products, searchQuery]);

  // Aggregate KPI metrics
  const totalStockValuation = useMemo(() => {
    return state.stockLevels.reduce((acc, stock) => {
      const prod = state.products.find((p) => p.id === stock.productId);
      if (!prod) return acc;
      return add(acc, mul(prod.costPrice, stock.quantityOnHand, 3), 3);
    }, 0);
  }, [state.stockLevels, state.products]);

  const lowStockCount = useMemo(() => {
    return state.products.filter((p) => {
      const totalStock = state.stockLevels
        .filter((s) => s.productId === p.id)
        .reduce((sum, s) => sum + s.quantityOnHand, 0);
      return totalStock <= p.minStockAlert;
    }).length;
  }, [state.products, state.stockLevels]);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSku || !newName) return;

    const newProd: Product = {
      id: `PRD-${Date.now()}`,
      sku: newSku,
      barcode: newBarcode || String(Math.floor(100000000000 + Math.random() * 900000000000)),
      name: newName,
      nameAr: newNameAr || newName,
      categoryId: newCategory,
      brand: newBrand,
      unit: newUnit,
      costPrice: round(newCostPrice, 3),
      sellingPrice: round(newSellingPrice, 3),
      taxRate: 0.05,
      minStockAlert: newMinStock,
      hasBatchTracking: false,
      hasExpiryTracking: false,
      active: true,
    };

    db.upsertProduct(newProd, newInitStockMuscat, 0);
    setShowAddProductModal(false);
    // Reset
    setNewSku('');
    setNewBarcode('');
    setNewName('');
    setNewNameAr('');
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductForAdj) return;
    db.adjustStock(selectedProductForAdj.id, adjWarehouseId, adjNewQuantity, adjReason);
    setShowAdjustmentModal(false);
    setSelectedProductForAdj(null);
  };

  const handleCreateTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (trfSourceWh === trfDestWh) {
      alert('Source and destination warehouse must be different!');
      return;
    }
    const prod = state.products.find((p) => p.id === trfProductId);
    if (!prod) return;

    const srcWhObj = state.warehouses.find((w) => w.id === trfSourceWh)!;
    const destWhObj = state.warehouses.find((w) => w.id === trfDestWh)!;

    db.createTransfer(
      srcWhObj.branchId,
      trfSourceWh,
      destWhObj.branchId,
      trfDestWh,
      [{ productId: prod.id, productName: prod.name, quantity: trfQty, unitCost: prod.costPrice }],
      trfNotes
    );

    setShowTransferModal(false);
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Top Banner & KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Total Catalog Products
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
            {state.products.length} Items
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Across {state.categories.length} Categories
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Total Inventory Asset Value
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
            {formatCurrency(totalStockValuation)}
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Cost Basis: {state.company.costingMethod}
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Low Stock Alerts
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 tabular-nums">
            {lowStockCount} Products
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            At or below safety reorder level
          </div>
        </div>

        <div className="p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg">
          <div className="text-xs font-medium text-neutral-500 uppercase tracking-wider">
            Active Warehouses
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 dark:text-neutral-100 mt-1 tabular-nums">
            {state.warehouses.length} Locations
          </div>
          <div className="text-[11px] text-neutral-400 mt-1">
            Assigned to {state.branches.length} Branches
          </div>
        </div>
      </div>

      {/* Navigation Tabs (Single-line interactive segmented control) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-3">
        
        <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'products'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Product Catalog</span>
          </button>

          <button
            onClick={() => setActiveTab('transfers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'transfers'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{t.stockTransfer} ({state.transfers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ledger')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              activeTab === 'ledger'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
                : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t.stockLedger}</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {hasPermission('inventory.transfer') && (
            <button
              onClick={() => setShowTransferModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 dark:bg-neutral-700 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition-colors shadow-xs"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>{t.transferRequest}</span>
            </button>
          )}

          {hasPermission('inventory.manage') && (
            <button
              onClick={() => setShowAddProductModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t.addProduct}</span>
            </button>
          )}
        </div>

      </div>

      {/* TAB 1: PRODUCT CATALOG & STOCK LEVELS */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          
          {/* Search bar */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products by SKU, barcode, or name..."
                className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Table */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Item &amp; SKU</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-center">Muscat Central</th>
                    <th className="py-3 px-4 text-center">Salalah Store</th>
                    <th className="py-3 px-4 text-right">Total Stock</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {filteredProducts.map((p) => {
                    const mctStock = state.stockLevels.find((s) => s.productId === p.id && s.warehouseId === 'WH-MCT-MAIN')?.quantityOnHand || 0;
                    const salStock = state.stockLevels.find((s) => s.productId === p.id && s.warehouseId === 'WH-SAL-STORE')?.quantityOnHand || 0;
                    const total = add(mctStock, salStock, 3);
                    const isLow = total <= p.minStockAlert;

                    return (
                      <tr key={p.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">{p.name}</div>
                          <div className="text-[11px] text-neutral-500 font-arabic">{p.nameAr}</div>
                          <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                            SKU: {p.sku} · Barcode: {p.barcode}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                          {state.categories.find((c) => c.id === p.categoryId)?.name || p.categoryId}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                          {formatCurrency(p.costPrice)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400">
                          {formatCurrency(p.sellingPrice)}
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums">
                          {mctStock} {p.unit}
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums">
                          {salStock} {p.unit}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums font-bold">
                          <span className={isLow ? 'text-amber-600' : 'text-neutral-900 dark:text-neutral-100'}>
                            {total} {p.unit}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {hasPermission('inventory.adjust_stock') && (
                            <button
                              onClick={() => {
                                setSelectedProductForAdj(p);
                                setAdjWarehouseId('WH-MCT-MAIN');
                                setAdjNewQuantity(mctStock);
                                setShowAdjustmentModal(true);
                              }}
                              className="px-2.5 py-1 text-[11px] font-medium bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded transition-colors"
                            >
                              Adjust Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: INTER-BRANCH / INTER-WAREHOUSE TRANSFERS */}
      {activeTab === 'transfers' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Transfer #</th>
                    <th className="py-3 px-4">Route</th>
                    <th className="py-3 px-4">Requested By</th>
                    <th className="py-3 px-4">Items</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-center">Action Lifecycle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {state.transfers.map((trf) => {
                    const srcWh = state.warehouses.find((w) => w.id === trf.sourceWarehouseId)?.name || trf.sourceWarehouseId;
                    const destWh = state.warehouses.find((w) => w.id === trf.destWarehouseId)?.name || trf.destWarehouseId;

                    return (
                      <tr key={trf.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                        <td className="py-3 px-4 font-mono font-semibold text-neutral-900 dark:text-neutral-100">
                          {trf.transferNumber}
                          <div className="text-[10px] text-neutral-400 font-sans">{new Date(trf.createdAt).toLocaleDateString()}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-neutral-900 dark:text-neutral-100">{srcWh}</div>
                          <div className="text-[10px] text-neutral-400">→ {destWh}</div>
                        </td>
                        <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                          {trf.requestedBy}
                        </td>
                        <td className="py-3 px-4">
                          {trf.items.map((it, idx) => (
                            <div key={idx} className="text-[11px]">
                              {it.quantity} × {it.productName}
                            </div>
                          ))}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                            trf.status === 'RECEIVED'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : trf.status === 'DISPATCHED'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                              : trf.status === 'APPROVED'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : 'bg-neutral-100 text-neutral-800 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}>
                            {trf.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {/* 4-Stage Transfer Actions */}
                          {trf.status === 'REQUESTED' && (
                            <button
                              onClick={() => db.updateTransferStatus(trf.id, 'APPROVED')}
                              className="px-2.5 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white font-medium rounded transition-colors"
                            >
                              {t.approve}
                            </button>
                          )}
                          {trf.status === 'APPROVED' && (
                            <button
                              onClick={() => db.updateTransferStatus(trf.id, 'DISPATCHED')}
                              className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white font-medium rounded transition-colors"
                            >
                              {t.dispatch}
                            </button>
                          )}
                          {trf.status === 'DISPATCHED' && (
                            <button
                              onClick={() => db.updateTransferStatus(trf.id, 'RECEIVED')}
                              className="px-2.5 py-1 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded transition-colors"
                            >
                              {t.receive}
                            </button>
                          )}
                          {trf.status === 'RECEIVED' && (
                            <span className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Reconciled
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: IMMUTABLE STOCK LEDGER & MOVEMENTS */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Warehouse</th>
                    <th className="py-3 px-4">Movement Type</th>
                    <th className="py-3 px-4 text-right">Quantity</th>
                    <th className="py-3 px-4 text-right">Unit Cost</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {state.inventoryMovements.map((mov) => (
                    <tr key={mov.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-3 px-4 font-mono text-[11px] text-neutral-500 whitespace-nowrap">
                        {new Date(mov.timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-medium text-neutral-900 dark:text-neutral-100">
                        {mov.productName}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                        {mov.warehouseName}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          mov.quantity > 0
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                          {mov.movementType}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold tabular-nums ${mov.quantity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {mov.quantity > 0 ? `+${mov.quantity}` : mov.quantity}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-neutral-600 dark:text-neutral-400">
                        {formatCurrency(mov.unitCost)}
                      </td>
                      <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                        {mov.performedBy}
                      </td>
                      <td className="py-3 px-4 text-neutral-400 text-[11px]">
                        {mov.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD PRODUCT */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleSaveProduct} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.addProduct}
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">SKU *</label>
                <input
                  required
                  type="text"
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="e.g. COF-ARB-03"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Barcode (EAN/UPC)</label>
                <input
                  type="text"
                  value={newBarcode}
                  onChange={(e) => setNewBarcode(e.target.value)}
                  placeholder="Scan or auto-generate"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Product Name (English) *</label>
                <input
                  required
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Arabian Cardamom Coffee (500g)"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Product Name (Arabic) *</label>
                <input
                  required
                  type="text"
                  value={newNameAr}
                  onChange={(e) => setNewNameAr(e.target.value)}
                  placeholder="e.g. قهوة عربية بالهيل فاخرة (٥٠٠ جم)"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-arabic"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  {state.categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Cost (OMR)</label>
                <input
                  type="number"
                  step="0.050"
                  value={newCostPrice}
                  onChange={(e) => setNewCostPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Selling (OMR)</label>
                <input
                  type="number"
                  step="0.050"
                  value={newSellingPrice}
                  onChange={(e) => setNewSellingPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Safety Alert Level</label>
                <input
                  type="number"
                  value={newMinStock}
                  onChange={(e) => setNewMinStock(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Initial Muscat Stock</label>
                <input
                  type="number"
                  value={newInitStockMuscat}
                  onChange={(e) => setNewInitStockMuscat(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                {t.save} Product
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {showAdjustmentModal && selectedProductForAdj && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleSaveAdjustment} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.adjustStock} · {selectedProductForAdj.name}
            </h3>

            <div className="text-xs space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Warehouse</label>
                <select
                  value={adjWarehouseId}
                  onChange={(e) => {
                    setAdjWarehouseId(e.target.value);
                    const cur = state.stockLevels.find((s) => s.productId === selectedProductForAdj.id && s.warehouseId === e.target.value)?.quantityOnHand || 0;
                    setAdjNewQuantity(cur);
                  }}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  {state.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">New Counted Quantity ({selectedProductForAdj.unit})</label>
                <input
                  type="number"
                  min="0"
                  value={adjNewQuantity}
                  onChange={(e) => setAdjNewQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-lg font-mono font-bold border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Audit Reason</label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Save Adjustment
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CREATE STOCK TRANSFER */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleCreateTransfer} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.transferRequest}
            </h3>

            <div className="text-xs space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Product</label>
                <select
                  value={trfProductId}
                  onChange={(e) => setTrfProductId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  {state.products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Source Warehouse</label>
                  <select
                    value={trfSourceWh}
                    onChange={(e) => setTrfSourceWh(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    {state.warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Destination</label>
                  <select
                    value={trfDestWh}
                    onChange={(e) => setTrfDestWh(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                  >
                    {state.warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Transfer Quantity</label>
                <input
                  type="number"
                  min="1"
                  value={trfQty}
                  onChange={(e) => setTrfQty(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Transfer Reason / Notes</label>
                <input
                  type="text"
                  value={trfNotes}
                  onChange={(e) => setTrfNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Submit Transfer Request
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
