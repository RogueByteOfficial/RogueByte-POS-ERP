import React, { useState } from 'react';
import { Sale } from '../../types/models';
import { useDatabase } from '../../lib/useDatabase';
import { translations, Language } from '../../lib/i18n';
import { generateEInvoiceTLV } from '../../lib/taxEngine';
import { Printer, Download, X, CheckCircle2 } from 'lucide-react';

interface ReceiptModalProps {
  sale: Sale;
  onClose: () => void;
  lang: Language;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ sale, onClose, lang }) => {
  const { state, formatCurrency } = useDatabase();
  const [format, setFormat] = useState<'80mm' | '58mm' | 'A4'>(state.invoiceSettings.receiptWidth || '80mm');
  const t = translations[lang];

  const branch = state.branches.find((b) => b.id === sale.branchId) || state.branches[0];
  const settings = state.invoiceSettings;

  // Generate e-invoice QR code Base64
  const tlvBase64 = generateEInvoiceTLV(
    settings.companyName,
    settings.taxNumber,
    sale.date,
    sale.grandTotal,
    sale.taxTotal,
    3
  );

  // SVG QR Code generator representation
  const qrSvgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(tlvBase64)}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-2xl border border-neutral-200 dark:border-neutral-800 max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Modal Top Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/50">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">
              {t.taxInvoice} · {sale.invoiceNumber}
            </span>
            <div className="flex items-center bg-neutral-200 dark:bg-neutral-700 rounded-md p-0.5 text-xs">
              <button
                onClick={() => setFormat('80mm')}
                className={`px-2.5 py-1 rounded transition-colors ${format === '80mm' ? 'bg-white dark:bg-neutral-900 font-semibold text-emerald-600 shadow-xs' : 'text-neutral-600 dark:text-neutral-300'}`}
              >
                80 mm POS
              </button>
              <button
                onClick={() => setFormat('58mm')}
                className={`px-2.5 py-1 rounded transition-colors ${format === '58mm' ? 'bg-white dark:bg-neutral-900 font-semibold text-emerald-600 shadow-xs' : 'text-neutral-600 dark:text-neutral-300'}`}
              >
                58 mm POS
              </button>
              <button
                onClick={() => setFormat('A4')}
                className={`px-2.5 py-1 rounded transition-colors ${format === 'A4' ? 'bg-white dark:bg-neutral-900 font-semibold text-emerald-600 shadow-xs' : 'text-neutral-600 dark:text-neutral-300'}`}
              >
                A4 Invoice
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t.print}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-white rounded-md transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable & Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto p-6 bg-neutral-100 dark:bg-neutral-950 flex justify-center">
          
          {/* RECEIPT / INVOICE PAPER CONTAINER */}
          <div
            id="printable-receipt"
            className={`bg-white text-neutral-900 p-6 shadow-sm border border-neutral-300 rounded-sm font-sans text-xs ${
              format === '58mm'
                ? 'w-[260px]'
                : format === '80mm'
                ? 'w-[360px]'
                : 'w-full max-w-[560px]'
            }`}
          >
            {/* Header / Logo */}
            <div className="text-center pb-3 border-b border-neutral-200">
              {settings.logoUrl && (
                <div className="flex justify-center mb-2">
                  <img
                    src={settings.logoUrl}
                    alt="Logo"
                    className="h-12 w-auto object-contain"
                  />
                </div>
              )}
              <h2 className="text-sm font-bold tracking-tight text-neutral-900 uppercase">
                {settings.companyName}
              </h2>
              <div className="text-[11px] text-neutral-700 font-arabic">
                {settings.companyNameAr}
              </div>
              <div className="text-[11px] text-neutral-600 mt-1">
                {branch.name} ({branch.city})
              </div>
              <div className="text-[10px] text-neutral-500">
                CR: {settings.crNumber} · VAT TRN: {branch.taxRegistrationNumber}
              </div>
              <div className="text-[10px] text-neutral-500">
                Tel: {branch.phone}
              </div>
            </div>

            {/* Document Title */}
            <div className="text-center py-2 border-b border-dashed border-neutral-300">
              <span className="font-bold text-xs uppercase tracking-wide">
                TAX INVOICE / فاتورة ضريبية
              </span>
            </div>

            {/* Metadata (Two-column scannable list) */}
            <div className="py-2.5 text-[11px] border-b border-dashed border-neutral-300 space-y-1">
              <div className="flex justify-between">
                <span className="text-neutral-500">Invoice No:</span>
                <span className="font-mono font-semibold">{sale.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Date & Time:</span>
                <span className="font-mono">{new Date(sale.date).toLocaleString('en-GB')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Cashier:</span>
                <span>{sale.cashierName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500">Customer:</span>
                <span className="font-medium">{sale.customerName}</span>
              </div>
            </div>

            {/* Items Table */}
            <div className="py-2 border-b border-neutral-300">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-neutral-200 text-[10px] uppercase text-neutral-500">
                    <th className="py-1">Item</th>
                    <th className="text-center py-1">Qty</th>
                    <th className="text-right py-1">Price</th>
                    <th className="text-right py-1">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 text-[11px]">
                  {sale.items.map((it, idx) => (
                    <tr key={idx} className="py-1">
                      <td className="py-1 pr-1">
                        <div className="font-medium text-neutral-900">{it.name}</div>
                        <div className="text-[10px] text-neutral-600 font-arabic">{it.nameAr}</div>
                        {it.discountAmount > 0 && (
                          <div className="text-[10px] text-emerald-600">Disc: -{formatCurrency(it.discountAmount)}</div>
                        )}
                      </td>
                      <td className="text-center py-1 tabular-nums">{it.quantity}</td>
                      <td className="text-right py-1 tabular-nums font-mono">{formatCurrency(it.unitPrice)}</td>
                      <td className="text-right py-1 tabular-nums font-mono font-semibold">{formatCurrency(it.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Breakdown */}
            <div className="py-2.5 border-b border-dashed border-neutral-300 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-neutral-600">Subtotal (Excl. VAT):</span>
                <span className="font-mono tabular-nums">{formatCurrency(sale.subtotal)}</span>
              </div>
              {sale.discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount Total:</span>
                  <span className="font-mono tabular-nums">-{formatCurrency(sale.discountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-neutral-600">Oman VAT (5.000%):</span>
                <span className="font-mono tabular-nums">{formatCurrency(sale.taxTotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold pt-1 border-t border-neutral-200">
                <span>Grand Total / الإجمالي:</span>
                <span className="font-mono tabular-nums text-emerald-800">{formatCurrency(sale.grandTotal)}</span>
              </div>
            </div>

            {/* Payments breakdown */}
            <div className="py-2 border-b border-dashed border-neutral-300 text-[11px] space-y-1">
              {sale.payments.map((p, i) => (
                <div key={i} className="flex justify-between text-neutral-700">
                  <span>Paid via {p.method}:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(p.amount)}</span>
                </div>
              ))}
              {sale.changeAmount > 0 && (
                <div className="flex justify-between text-neutral-700">
                  <span>Change Returned:</span>
                  <span className="font-mono tabular-nums">{formatCurrency(sale.changeAmount)}</span>
                </div>
              )}
            </div>

            {/* QR Code and Footer Notice */}
            <div className="pt-3 text-center">
              {settings.showQrCode && (
                <div className="flex justify-center mb-2">
                  <div className="p-1 bg-white border border-neutral-300 rounded inline-block">
                    <img
                      src={qrSvgUrl}
                      alt="Oman VAT E-Invoice QR Code"
                      className="w-24 h-24"
                    />
                  </div>
                </div>
              )}
              <div className="text-[10px] text-neutral-500 font-medium">
                {settings.footerText}
              </div>
              <div className="text-[10px] text-neutral-500 font-arabic mt-0.5">
                {settings.footerTextAr}
              </div>
              <div className="text-[9px] text-neutral-400 mt-2 font-mono">
                Powered by RogueByte POS & ERP · Sultanate of Oman
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
