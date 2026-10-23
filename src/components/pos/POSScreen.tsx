import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useDatabase } from '../../lib/useDatabase';
import { Product, Customer, SaleItem, Sale } from '../../types/models';
import { translations, Language } from '../../lib/i18n';
import { round, add, sub, mul } from '../../lib/decimal';
import { calculateLineTax } from '../../lib/taxEngine';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';
import { 
  Search, 
  Barcode, 
  Trash2, 
  Plus, 
  Minus, 
  CreditCard, 
  PauseCircle, 
  PlayCircle, 
  User, 
  Layers,
  Percent,
  CheckCircle2,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

interface POSScreenProps {
  lang: Language;
  onOpenShiftModal: () => void;
}

export const POSScreen: React.FC<POSScreenProps> = ({ lang, onOpenShiftModal }) => {
  const { state, defaultWarehouse, formatCurrency, activeBranch, db, hasPermission } = useDatabase();
  const t = translations[lang];

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('CUST-00');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  const [cartDiscountPercent, setCartDiscountPercent] = useState<number>(0);
  
  // Modals
  const [showPaymentModal, setShowPaymentModal] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [showHeldSalesModal, setShowHeldSalesModal] = useState<boolean>(false);
  const [barcodeScanNotification, setBarcodeScanNotification] = useState<string>('');

  const searchInputRef = useRef<HTMLInputElement>(null);
  const barcodeBufferRef = useRef<string>('');
  const lastKeyTimeRef = useRef<number>(0);

  const selectedWarehouse = defaultWarehouse || state.warehouses[0];
  const selectedCustomer = state.customers.find((c) => c.id === selectedCustomerId) || state.customers[0];

  // USB Barcode Scanner listener & Global POS Keyboard Shortcuts (F2 search, F4 payment, F9 hold)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Hotkeys
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (e.key === 'F4') {
        e.preventDefault();
        if (cartItems.length > 0) setShowPaymentModal(true);
        return;
      }
      if (e.key === 'F9') {
        e.preventDefault();
        handleHoldSale();
        return;
      }

      // Barcode Scanner Buffer Detection:
      // Barcode scanners type very rapidly (< 35ms between characters) ending with Enter.
      const now = Date.now();
      const diff = now - lastKeyTimeRef.current;
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        if (barcodeBufferRef.current.length >= 4) {
          const scannedCode = barcodeBufferRef.current.trim();
          handleScannedBarcode(scannedCode);
          barcodeBufferRef.current = '';
        }
      } else if (e.key.length === 1) {
        if (diff < 50 || barcodeBufferRef.current.length === 0) {
          barcodeBufferRef.current += e.key;
        } else {
          // Normal human typing, reset buffer
          barcodeBufferRef.current = e.key;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, state.products]);

  const handleScannedBarcode = (code: string) => {
    const product = state.products.find(
      (p) => p.barcode === code || p.sku.toLowerCase() === code.toLowerCase()
    );
    if (product) {
      addToCart(product);
      setBarcodeScanNotification(`Scanned: ${product.name}`);
      setTimeout(() => setBarcodeScanNotification(''), 2500);
    }
  };

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return state.products.filter((p) => {
      if (!p.active) return false;
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = p.name.toLowerCase().includes(q);
        const matchNameAr = p.nameAr.toLowerCase().includes(q);
        const matchSku = p.sku.toLowerCase().includes(q);
        const matchBarcode = p.barcode.includes(q);
        return matchName || matchNameAr || matchSku || matchBarcode;
      }
      return true;
    });
  }, [state.products, selectedCategory, searchQuery]);

  // Stock lookup for active warehouse
  const getStock = (productId: string): number => {
    const stock = state.stockLevels.find(
      (s) => s.productId === productId && s.warehouseId === selectedWarehouse.id
    );
    return stock ? stock.quantityOnHand : 0;
  };

  const addToCart = (product: Product) => {
    const currentStock = getStock(product.id);
    const existingIndex = cartItems.findIndex((item) => item.productId === product.id);

    if (!state.company.allowNegativeStock) {
      const alreadyInCart = existingIndex >= 0 ? cartItems[existingIndex].quantity : 0;
      if (alreadyInCart + 1 > currentStock) {
        alert(`${t.insufficientStock}: ${currentStock} available in ${selectedWarehouse.name}`);
        return;
      }
    }

    if (existingIndex >= 0) {
      const updated = [...cartItems];
      const newQty = updated[existingIndex].quantity + 1;
      const taxCalc = calculateLineTax(
        updated[existingIndex].unitPrice,
        newQty,
        updated[existingIndex].discountAmount,
        updated[existingIndex].taxRate,
        false,
        3
      );
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        taxAmount: taxCalc.taxAmount,
        lineTotal: taxCalc.grossLineTotal,
      };
      setCartItems(updated);
    } else {
      const taxCalc = calculateLineTax(product.sellingPrice, 1, 0, product.taxRate, false, 3);
      const newItem: SaleItem = {
        productId: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        nameAr: product.nameAr,
        unit: product.unit,
        quantity: 1,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice,
        discountAmount: 0,
        taxRate: product.taxRate,
        taxAmount: taxCalc.taxAmount,
        lineTotal: taxCalc.grossLineTotal,
      };
      setCartItems([newItem, ...cartItems]);
    }
  };

  const updateQuantity = (index: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    const item = cartItems[index];
    const currentStock = getStock(item.productId);

    if (!state.company.allowNegativeStock && newQty > currentStock) {
      alert(`${t.insufficientStock}: ${currentStock} available`);
      return;
    }

    const updated = [...cartItems];
    const taxCalc = calculateLineTax(item.unitPrice, newQty, item.discountAmount, item.taxRate, false, 3);
    updated[index] = {
      ...item,
      quantity: newQty,
      taxAmount: taxCalc.taxAmount,
      lineTotal: taxCalc.grossLineTotal,
    };
    setCartItems(updated);
  };

  const removeFromCart = (index: number) => {
    const updated = cartItems.filter((_, i) => i !== index);
    setCartItems(updated);
  };

  const clearCart = () => {
    setCartItems([]);
    setCartDiscountPercent(0);
  };

  const handleHoldSale = () => {
    if (cartItems.length === 0) return;
    db.holdSale(cartItems, selectedCustomerId, `Held cart with ${cartItems.length} items`);
    clearCart();
  };

  const handleResumeSale = (held: any) => {
    setCartItems(held.items);
    if (held.customerId) setSelectedCustomerId(held.customerId);
    setShowHeldSalesModal(false);
  };

  // Calculations
  const grossSubtotal = useMemo(() => {
    return cartItems.reduce((acc, it) => add(acc, mul(it.unitPrice, it.quantity, 3), 3), 0);
  }, [cartItems]);

  const cartDiscountAmount = useMemo(() => {
    if (cartDiscountPercent <= 0) return 0;
    return round(grossSubtotal * (cartDiscountPercent / 100), 3);
  }, [grossSubtotal, cartDiscountPercent]);

  const netSubtotal = useMemo(() => {
    return Math.max(0, sub(grossSubtotal, cartDiscountAmount, 3));
  }, [grossSubtotal, cartDiscountAmount]);

  const taxTotal = useMemo(() => {
    return round(netSubtotal * 0.05, 3); // 5% Oman Standard VAT
  }, [netSubtotal]);

  const grandTotal = useMemo(() => {
    return add(netSubtotal, taxTotal, 3);
  }, [netSubtotal, taxTotal]);

  const isShiftOpen = state.activeShift && state.activeShift.status === 'OPEN';

  return (
    <div className="flex-1 flex flex-col lg:flex-row h-[calc(100vh-4rem)] overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      
      {/* LEFT / CENTER: Products Catalog & Category Filters */}
      <div className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 border-r border-neutral-200 dark:border-neutral-800">
        
        {/* Top Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.searchProductPlaceholder}
              className="w-full pl-9 pr-10 py-2 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-lg text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-xs"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
                F2
              </span>
            </div>
          </div>

          {/* Barcode scanner banner indicator */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/80 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 shrink-0">
            <Barcode className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden md:inline font-medium">Scanner Ready</span>
          </div>

          {/* Held Sales Trigger */}
          <button
            onClick={() => setShowHeldSalesModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 rounded-lg text-xs font-medium text-neutral-700 dark:text-neutral-200 shadow-xs shrink-0"
          >
            <PlayCircle className="w-3.5 h-3.5 text-amber-500" />
            <span>{t.heldSales} ({state.heldSales.length})</span>
          </button>
        </div>

        {/* Barcode scan notification popup */}
        {barcodeScanNotification && (
          <div className="mb-3 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-md shadow-sm flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4" />
            <span>{barcodeScanNotification}</span>
          </div>
        )}

        {/* Category Filter Pills (Functional Buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2 scrollbar-none shrink-0">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-xs'
                : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50'
            }`}
          >
            {t.allCategories}
          </button>
          {state.categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900 font-semibold shadow-xs'
                  : 'bg-white dark:bg-neutral-900 text-neutral-600 dark:text-neutral-400 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50'
              }`}
            >
              {lang === 'ar' ? cat.nameAr : cat.name}
            </button>
          ))}
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const stock = getStock(product.id);
              const isLowStock = stock <= product.minStockAlert;
              const isOutOfStock = stock <= 0;

              return (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  disabled={isOutOfStock && !state.company.allowNegativeStock}
                  className={`text-left p-3.5 rounded-lg border bg-white dark:bg-neutral-900 transition-all flex flex-col justify-between group ${
                    isOutOfStock && !state.company.allowNegativeStock
                      ? 'opacity-50 cursor-not-allowed border-neutral-200 dark:border-neutral-800'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-emerald-500 dark:hover:border-emerald-500 hover:shadow-sm'
                  }`}
                >
                  <div>
                    {/* Item Metadata (Unboxed text with bullet separators) */}
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 mb-1 font-mono">
                      <span>{product.sku}</span>
                      <span>·</span>
                      <span className={isLowStock ? 'text-amber-600 font-semibold' : ''}>
                        {stock} {product.unit} in stock
                      </span>
                    </div>

                    <div className="font-semibold text-xs text-neutral-900 dark:text-neutral-100 line-clamp-2 leading-snug">
                      {lang === 'ar' ? product.nameAr : product.name}
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between">
                    <span className="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
                      {formatCurrency(product.sellingPrice)}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      +5% VAT
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT: High Efficiency Shopping Cart & Quick Pay */}
      <div className="w-full lg:w-96 xl:w-[420px] flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800 h-full overflow-hidden">
        
        {/* Cart Top Bar: Customer Selector & Shift Banner */}
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 space-y-3">
          
          {/* Shift Warning if Closed */}
          {!isShiftOpen && (
            <div className="flex items-center justify-between p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-800 dark:text-amber-300">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>{t.openShiftPrompt}</span>
              </div>
              <button
                onClick={onOpenShiftModal}
                className="font-semibold underline text-amber-900 dark:text-amber-200"
              >
                {t.shiftOpen}
              </button>
            </div>
          )}

          {/* Customer Selection Dropdown */}
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-neutral-400 shrink-0" />
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="flex-1 py-1.5 px-2.5 text-xs bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
            >
              {state.customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.creditLimit > 0 ? `(Limit: ${formatCurrency(c.creditLimit)})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Cart Header & Clear Button */}
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400">
            <span>{t.cart} ({cartItems.reduce((acc, it) => acc + it.quantity, 0)} items)</span>
            {cartItems.length > 0 && (
              <button
                onClick={clearCart}
                className="text-neutral-400 hover:text-rose-600 transition-colors flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3 h-3" />
                <span>{t.clearCart}</span>
              </button>
            )}
          </div>
        </div>

        {/* Cart Line Items (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {cartItems.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-neutral-400">
              <Barcode className="w-12 h-12 stroke-[1.2] mb-2 text-neutral-300 dark:text-neutral-700" />
              <p className="text-xs max-w-[220px]">{t.cartEmpty}</p>
            </div>
          ) : (
            cartItems.map((item, index) => (
              <div
                key={item.productId}
                className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900 dark:text-neutral-100 truncate">
                    {lang === 'ar' ? item.nameAr : item.name}
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono">
                    {formatCurrency(item.unitPrice)} × {item.quantity} = {formatCurrency(item.lineTotal)}
                  </div>
                </div>

                {/* Qty +/- Controls */}
                <div className="flex items-center gap-1 shrink-0 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md p-0.5">
                  <button
                    onClick={() => updateQuantity(index, item.quantity - 1)}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-mono font-semibold tabular-nums text-neutral-900 dark:text-neutral-100">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(index, item.quantity + 1)}
                    className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded text-neutral-600 dark:text-neutral-300"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <button
                  onClick={() => removeFromCart(index)}
                  className="p-1 text-neutral-400 hover:text-rose-600 transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Cart Summary & Checkout */}
        <div className="p-4 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/30 space-y-3">
          
          {/* Discount Field (Permitted users) */}
          {hasPermission('pos.discount') && cartItems.length > 0 && (
            <div className="flex items-center justify-between text-xs gap-2">
              <span className="text-neutral-500 flex items-center gap-1">
                <Percent className="w-3 h-3" /> {t.cartDiscount}:
              </span>
              <div className="flex items-center gap-1 w-24">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={cartDiscountPercent}
                  onChange={(e) => setCartDiscountPercent(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full text-right px-2 py-0.5 text-xs font-mono border border-neutral-200 dark:border-neutral-700 rounded bg-white dark:bg-neutral-900"
                />
                <span className="text-neutral-400">%</span>
              </div>
            </div>
          )}

          {/* Breakdown Lines */}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-neutral-500">
              <span>{t.subtotal}:</span>
              <span className="font-mono tabular-nums">{formatCurrency(grossSubtotal)}</span>
            </div>
            {cartDiscountAmount > 0 && (
              <div className="flex justify-between text-emerald-600">
                <span>{t.discount}:</span>
                <span className="font-mono tabular-nums">-{formatCurrency(cartDiscountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-neutral-500">
              <span>{t.tax} (5.000%):</span>
              <span className="font-mono tabular-nums">{formatCurrency(taxTotal)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-neutral-900 dark:text-neutral-100 pt-1.5 border-t border-neutral-200 dark:border-neutral-700">
              <span>{t.total}:</span>
              <span className="font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {formatCurrency(grandTotal)}
              </span>
            </div>
          </div>

          {/* Action Buttons: Hold (F9) & Pay (F4) */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={handleHoldSale}
              className="flex-1 py-2.5 px-3 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-800 dark:text-neutral-200 text-xs font-semibold rounded-lg transition-colors disabled:opacity-40 flex items-center justify-center gap-1.5"
            >
              <PauseCircle className="w-3.5 h-3.5" />
              <span>{t.holdSale} (F9)</span>
            </button>

            <button
              type="button"
              disabled={cartItems.length === 0}
              onClick={() => setShowPaymentModal(true)}
              className="flex-[2] py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              <span>{t.payment} (F4)</span>
            </button>
          </div>

        </div>

      </div>

      {/* Payment Processing Modal */}
      {showPaymentModal && (
        <PaymentModal
          grandTotal={grandTotal}
          subtotal={netSubtotal}
          taxTotal={taxTotal}
          discountTotal={cartDiscountAmount}
          cartItems={cartItems}
          selectedCustomer={selectedCustomer}
          warehouseId={selectedWarehouse.id}
          onClose={() => setShowPaymentModal(false)}
          onSaleSuccess={(sale) => {
            setShowPaymentModal(false);
            setCompletedSale(sale);
            clearCart();
          }}
          lang={lang}
        />
      )}

      {/* Receipt & Tax Invoice Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
          lang={lang}
        />
      )}

      {/* Held Sales Resume Modal */}
      {showHeldSalesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-md w-full p-6 space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {t.heldSales}
            </h3>
            {state.heldSales.length === 0 ? (
              <p className="text-xs text-neutral-500 py-4 text-center">No sales currently on hold.</p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {state.heldSales.map((h) => (
                  <div
                    key={h.id}
                    className="p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                        {h.note || 'Held Sale'}
                      </div>
                      <div className="text-[11px] text-neutral-500">
                        {h.items.length} items · {new Date(h.date).toLocaleTimeString()}
                      </div>
                    </div>
                    <button
                      onClick={() => handleResumeSale(h)}
                      className="px-3 py-1 bg-emerald-600 text-white rounded font-medium hover:bg-emerald-500 transition-colors"
                    >
                      {t.resumeSale}
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => setShowHeldSalesModal(false)}
              className="w-full py-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-xs font-semibold rounded-lg"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
