/**
 * RogueByte Tax Engine - Oman VAT & GCC Compliant
 * Handles 5.000% standard VAT, tax-inclusive / tax-exclusive math,
 * and standard e-invoice QR code payload generation.
 */

import { round, add, sub, mul, div } from './decimal';

export interface TaxCalculationResult {
  unitPriceNet: number;
  quantity: number;
  discountAmount: number;
  netLineTotal: number;
  taxRate: number;
  taxAmount: number;
  grossLineTotal: number;
}

export function calculateLineTax(
  unitPrice: number,
  quantity: number,
  discount: number = 0,
  taxRate: number = 0.05,
  isTaxInclusive: boolean = false,
  decimals: number = 3
): TaxCalculationResult {
  const qty = quantity || 1;
  const lineSubtotal = mul(unitPrice, qty, decimals);
  const discountedSubtotal = Math.max(0, sub(lineSubtotal, discount, decimals));

  if (taxRate <= 0) {
    return {
      unitPriceNet: unitPrice,
      quantity: qty,
      discountAmount: discount,
      netLineTotal: discountedSubtotal,
      taxRate: 0,
      taxAmount: 0,
      grossLineTotal: discountedSubtotal,
    };
  }

  if (isTaxInclusive) {
    // If inclusive: grossLineTotal = discountedSubtotal
    // netLineTotal = grossLineTotal / (1 + taxRate)
    const netLineTotal = div(discountedSubtotal, 1 + taxRate, decimals);
    const taxAmount = sub(discountedSubtotal, netLineTotal, decimals);
    return {
      unitPriceNet: div(unitPrice, 1 + taxRate, decimals),
      quantity: qty,
      discountAmount: discount,
      netLineTotal,
      taxRate,
      taxAmount,
      grossLineTotal: discountedSubtotal,
    };
  } else {
    // Exclusive: netLineTotal = discountedSubtotal
    // taxAmount = netLineTotal * taxRate
    const taxAmount = mul(discountedSubtotal, taxRate, decimals);
    const grossLineTotal = add(discountedSubtotal, taxAmount, decimals);
    return {
      unitPriceNet: unitPrice,
      quantity: qty,
      discountAmount: discount,
      netLineTotal: discountedSubtotal,
      taxRate,
      taxAmount,
      grossLineTotal,
    };
  }
}

/**
 * Encodes Oman / GCC E-Invoice QR Code TLV (Tag-Length-Value) Base64 String:
 * Tag 1: Seller's Name
 * Tag 2: VAT Registration Number (TRN)
 * Tag 3: Time Stamp (ISO 8601)
 * Tag 4: Invoice Total (with VAT)
 * Tag 5: VAT Total
 */
export function generateEInvoiceTLV(
  sellerName: string,
  taxNumber: string,
  timestamp: string,
  totalAmount: number,
  taxAmount: number,
  decimals: number = 3
): string {
  const encoder = new TextEncoder();
  const tags = [
    { tag: 1, value: sellerName },
    { tag: 2, value: taxNumber },
    { tag: 3, value: timestamp },
    { tag: 4, value: totalAmount.toFixed(decimals) },
    { tag: 5, value: taxAmount.toFixed(decimals) },
  ];

  let totalLength = 0;
  const parts: Uint8Array[] = [];

  for (const item of tags) {
    const valBytes = encoder.encode(item.value);
    const part = new Uint8Array(2 + valBytes.length);
    part[0] = item.tag;
    part[1] = valBytes.length;
    part.set(valBytes, 2);
    parts.push(part);
    totalLength += part.length;
  }

  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    combined.set(part, offset);
    offset += part.length;
  }

  // Base64 encode
  let binary = '';
  for (let i = 0; i < combined.byteLength; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}
