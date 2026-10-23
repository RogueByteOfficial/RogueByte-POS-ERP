import React, { useState } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { PurchaseOrder, GoodsReceipt } from '../../types/models';
import { translations, Language } from '../../lib/i18n';
import { round, add, mul } from '../../lib/decimal';
import { 
  ShoppingBag, 
  FileCheck, 
  Truck, 
  Plus, 
  Building2, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';

interface PurchasingScreenProps {
  lang: Language;
}

export const PurchasingScreen: React.FC<PurchasingScreenProps> = ({ lang }) => {
  const { state, db, formatCurrency, activeBranch, hasPermission } = useDatabase();
  const t = translations[lang];

  const [activeTab, setActiveTab] = useState<'orders' | 'grn' | 'suppliers'>('orders');
  const [showNewPOModal, setShowNewPOModal] = useState<boolean>(false);
  const [selectedPOForGRN, setSelectedPOForGRN] = useState<PurchaseOrder | null>(null);

  // New PO Form
  const [selectedSupplierId, setSelectedSupplierId] = useState(state.suppliers[0].id);
  const [poWarehouseId, setPoWarehouseId] = useState(state.warehouses[0].id);
  const [poItems, setPoItems] = useState([
    { productId: state.products[0].id, quantity: 20, unitCost: state.products[0].costPrice },
  ]);
  const [poNotes, setPoNotes] = useState('');

  // GRN confirmation state
  const [grnWarehouseId, setGrnWarehouseId] = useState(state.warehouses[0].id);
  const [grnReceivedQty, setGrnReceivedQty] = useState<{ [productId: string]: number }>({});
  const [grnNotes, setGrnNotes] = useState('Inspected and received into warehouse');

  const handleCreatePO = (e: React.FormEvent) => {
    e.preventDefault();
    const supplier = state.suppliers.find((s) => s.id === selectedSupplierId)!;

    let subtotal = 0;
    const items = poItems.map((item) => {
      const prod = state.products.find((p) => p.id === item.productId)!;
      const lineCost = mul(item.unitCost, item.quantity, 3);
      subtotal = add(subtotal, lineCost, 3);
      const taxAmount = round(lineCost * 0.05, 3);
      return {
        productId: prod.id,
        productName: prod.name,
        quantity: item.quantity,
        unitCost: item.unitCost,
        taxRate: 0.05,
        taxAmount,
        total: add(lineCost, taxAmount, 3),
      };
    });

    const taxTotal = round(subtotal * 0.05, 3);
    const grandTotal = add(subtotal, taxTotal, 3);

    const poNumber = `PO-${activeBranch ? activeBranch.code : 'MCT'}-2026-${String(state.purchaseOrders.length + 1).padStart(4, '0')}`;
    const newPO: PurchaseOrder = {
      id: `PO-${Date.now()}`,
      poNumber,
      supplierId: supplier.id,
      supplierName: supplier.name,
      branchId: activeBranch ? activeBranch.id : state.branches[0].id,
      warehouseId: poWarehouseId,
      orderDate: new Date().toISOString().split('T')[0],
      status: 'APPROVED',
      items,
      subtotal,
      taxTotal,
      grandTotal,
      notes: poNotes,
      createdBy: state.currentUser.fullName,
    };

    state.purchaseOrders.unshift(newPO);
    db.logAudit(state.currentUser.id, state.currentUser.fullName, 'PO_CREATED', 'PURCHASING', `Created Purchase Order ${poNumber} for ${supplier.name}`);
    setShowNewPOModal(false);
  };

  const handleOpenGRNModal = (po: PurchaseOrder) => {
    setSelectedPOForGRN(po);
    setGrnWarehouseId(po.warehouseId);
    const initialQtyMap: { [productId: string]: number } = {};
    for (const it of po.items) {
      initialQtyMap[it.productId] = it.quantity;
    }
    setGrnReceivedQty(initialQtyMap);
  };

  const handleConfirmGRN = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPOForGRN) return;

    const itemsToReceive = selectedPOForGRN.items.map((it) => ({
      productId: it.productId,
      productName: it.productName,
      quantityReceived: grnReceivedQty[it.productId] ?? it.quantity,
      unitCost: it.unitCost,
    }));

    db.confirmGoodsReceipt(selectedPOForGRN.id, grnWarehouseId, itemsToReceive, grnNotes);
    setSelectedPOForGRN(null);
  };

  return (
    <div className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
      
      {/* Top Banner Notice */}
      <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <div className="text-xs text-emerald-900 dark:text-emerald-200">
            <span className="font-bold">Strict Stock Valuation &amp; Influx Rule:</span> {t.grnNotice}
          </div>
        </div>
        {hasPermission('purchasing.create_po') && (
          <button
            onClick={() => setShowNewPOModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t.newPO}</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'orders'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>{t.purchaseOrders} ({state.purchaseOrders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('grn')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'grn'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
          }`}
        >
          <FileCheck className="w-3.5 h-3.5" />
          <span>{t.goodsReceipts} ({state.goodsReceipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('suppliers')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            activeTab === 'suppliers'
              ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-semibold shadow-xs'
              : 'text-neutral-600 dark:text-neutral-300 hover:text-neutral-900'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>{t.suppliersList} ({state.suppliers.length})</span>
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">PO #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-right">Total (Incl. VAT)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-center">Receipt Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {state.purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {po.poNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                      {po.supplierName}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono">
                      {po.orderDate}
                    </td>
                    <td className="py-3 px-4">
                      {po.items.map((it, idx) => (
                        <div key={idx} className="text-[11px]">
                          {it.quantity} × {it.productName}
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(po.grandTotal)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        po.status === 'RECEIVED'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {po.status !== 'RECEIVED' ? (
                        <button
                          onClick={() => handleOpenGRNModal(po)}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded transition-colors"
                        >
                          {t.receiveGoods}
                        </button>
                      ) : (
                        <span className="text-emerald-600 text-[11px] font-medium flex items-center justify-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Stock Logged
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: GOODS RECEIPT NOTES (GRN) */}
      {activeTab === 'grn' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">GRN #</th>
                  <th className="py-3 px-4">Supplier</th>
                  <th className="py-3 px-4">Received Date</th>
                  <th className="py-3 px-4">Receiver</th>
                  <th className="py-3 px-4">Items Intake</th>
                  <th className="py-3 px-4">Accounting Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {state.goodsReceipts.map((grn) => (
                  <tr key={grn.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 px-4 font-mono font-bold text-neutral-900 dark:text-neutral-100">
                      {grn.grnNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-neutral-800 dark:text-neutral-200">
                      {grn.supplierName}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 font-mono">
                      {grn.receivedDate}
                    </td>
                    <td className="py-3 px-4 text-neutral-600 dark:text-neutral-300">
                      {grn.receivedBy}
                    </td>
                    <td className="py-3 px-4">
                      {grn.items.map((it, idx) => (
                        <div key={idx} className="text-[11px]">
                          +{it.quantityReceived} {it.productName} (@ {formatCurrency(it.unitCost)})
                        </div>
                      ))}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-600 text-xs font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Posted to GL 1200 / 2010
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-800/60 border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Supplier Name</th>
                  <th className="py-3 px-4">Contact Person</th>
                  <th className="py-3 px-4">Phone &amp; Email</th>
                  <th className="py-3 px-4">VAT TRN</th>
                  <th className="py-3 px-4 text-right">Accounts Payable Due</th>
                  <th className="py-3 px-4 text-center">Terms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {state.suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">{s.name}</div>
                      <div className="text-[11px] text-neutral-500 font-arabic">{s.nameAr}</div>
                    </td>
                    <td className="py-3 px-4 text-neutral-700 dark:text-neutral-300">
                      {s.contactPerson}
                    </td>
                    <td className="py-3 px-4 text-neutral-500 text-[11px]">
                      <div>{s.phone}</div>
                      <div>{s.email}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px]">
                      {s.taxNumber}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-bold text-neutral-900 dark:text-neutral-100">
                      {formatCurrency(s.currentBalance)}
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-[11px] text-neutral-500">
                      {s.paymentTermsDays} Days
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE PURCHASE ORDER */}
      {showNewPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleCreatePO} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.newPO}
            </h3>

            <div className="text-xs space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Select Supplier</label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  {state.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Target Receiving Warehouse</label>
                <select
                  value={poWarehouseId}
                  onChange={(e) => setPoWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  {state.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Product Item &amp; Quantity</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <select
                      value={poItems[0].productId}
                      onChange={(e) => {
                        const prod = state.products.find((p) => p.id === e.target.value)!;
                        setPoItems([{ productId: prod.id, quantity: poItems[0].quantity, unitCost: prod.costPrice }]);
                      }}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                    >
                      {state.products.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="1"
                      value={poItems[0].quantity}
                      onChange={(e) => setPoItems([{ ...poItems[0], quantity: parseInt(e.target.value) || 1 }])}
                      className="w-full px-2.5 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Notes / Shipping Terms</label>
                <input
                  type="text"
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  placeholder="e.g. Expedited delivery to Muscat central warehouse"
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowNewPOModal(false)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Create Purchase Order
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: CONFIRM GOODS RECEIPT NOTE (GRN) */}
      {selectedPOForGRN && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <form onSubmit={handleConfirmGRN} className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-lg w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Confirm Goods Receipt (GRN) · {selectedPOForGRN.poNumber}
            </h3>

            <div className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Supplier:</span>
                <span className="font-semibold">{selectedPOForGRN.supplierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Order Total:</span>
                <span className="font-mono">{formatCurrency(selectedPOForGRN.grandTotal)}</span>
              </div>
            </div>

            <div className="text-xs space-y-3">
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Target Receiving Warehouse</label>
                <select
                  value={grnWarehouseId}
                  onChange={(e) => setGrnWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                >
                  {state.warehouses.map((w) => (
                    <option key={w.id} value={w.id}>{w.name}</option>
                  ))}
                </select>
              </div>

              {/* Items received counts */}
              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Quantity Received</label>
                <div className="space-y-2">
                  {selectedPOForGRN.items.map((it) => (
                    <div key={it.productId} className="flex items-center justify-between p-2 border border-neutral-200 dark:border-neutral-700 rounded">
                      <span className="font-medium">{it.productName} (Ordered: {it.quantity})</span>
                      <input
                        type="number"
                        min="1"
                        max={it.quantity * 2}
                        value={grnReceivedQty[it.productId] ?? it.quantity}
                        onChange={(e) => setGrnReceivedQty({
                          ...grnReceivedQty,
                          [it.productId]: parseInt(e.target.value) || 0,
                        })}
                        className="w-20 px-2 py-1 text-right font-mono font-bold border rounded bg-white dark:bg-neutral-800"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">Inspection &amp; Verification Note</label>
                <input
                  type="text"
                  value={grnNotes}
                  onChange={(e) => setGrnNotes(e.target.value)}
                  className="w-full px-3 py-1.5 border border-neutral-300 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100"
                />
              </div>
            </div>

            <div className="pt-3 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSelectedPOForGRN(null)}
                className="px-4 py-2 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg"
              >
                {t.cancel}
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-xs"
              >
                Confirm &amp; Update Inventory
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};
