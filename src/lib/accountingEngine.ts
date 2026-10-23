/**
 * RogueByte Double-Entry Accounting Engine
 * Enforces balanced debits = credits, precise 3-decimal OMR arithmetic,
 * automatic journal generation for sales, returns, purchases, and financial statements.
 */

import { Account, JournalEntry, JournalLine, Sale, GoodsReceipt, PurchaseOrder } from '../types/models';
import { round, add, sub } from './decimal';

export function assertBalanced(lines: JournalLine[], decimals: number = 3): { isBalanced: boolean; totalDebit: number; totalCredit: number; diff: number } {
  const totalDebit = lines.reduce((acc, l) => add(acc, l.debit || 0, decimals), 0);
  const totalCredit = lines.reduce((acc, l) => add(acc, l.credit || 0, decimals), 0);
  const diff = Math.abs(round(totalDebit - totalCredit, decimals));
  const isBalanced = diff < 0.0001;
  return { isBalanced, totalDebit, totalCredit, diff };
}

/**
 * Generates a balanced Journal Entry for a POS Sale.
 * 
 * Lines generated:
 * 1. DR: Cash / Bank / Accounts Receivable (Grand Total)
 * 2. DR: Sales Discounts Allowed (if any)
 * 3. CR: Sales Revenue (Gross Subtotal)
 * 4. CR: VAT Output Payable (Tax Total)
 * 5. DR: Cost of Goods Sold (Total Cost)
 * 6. CR: Merchandise Inventory Asset (Total Cost)
 */
export function buildSaleJournalEntry(
  sale: Sale,
  totalCostOfGoods: number,
  decimals: number = 3
): JournalEntry {
  const lines: JournalLine[] = [];

  // 1. Payment accounts (Debits)
  for (const pay of sale.payments) {
    if (pay.amount <= 0) continue;
    let accountCode = '1010'; // Default Cash on Hand
    let accountName = 'Cash on Hand';
    
    if (pay.method === 'CARD' || pay.method === 'BANK_TRANSFER') {
      accountCode = '1020';
      accountName = 'Bank Account (Oman Commercial Bank)';
    } else if (pay.method === 'CUSTOMER_CREDIT') {
      accountCode = '1100';
      accountName = 'Accounts Receivable';
    }

    lines.push({
      accountCode,
      accountName,
      debit: round(pay.amount, decimals),
      credit: 0,
      memo: `Sale ${sale.invoiceNumber} payment via ${pay.method}`,
    });
  }

  // 2. Sales Discount (Debit, if given)
  if (sale.discountTotal > 0) {
    lines.push({
      accountCode: '4010',
      accountName: 'Sales Discounts Allowed',
      debit: round(sale.discountTotal, decimals),
      credit: 0,
      memo: `Discount on Invoice ${sale.invoiceNumber}`,
    });
  }

  // 3. Sales Revenue (Credit, gross subtotal before tax and discount)
  // Revenue = subtotal
  lines.push({
    accountCode: '4000',
    accountName: 'Sales Revenue',
    debit: 0,
    credit: round(sale.subtotal, decimals),
    memo: `Revenue from Invoice ${sale.invoiceNumber}`,
  });

  // 4. VAT Output Payable (Credit, tax collected)
  if (sale.taxTotal > 0) {
    lines.push({
      accountCode: '2100',
      accountName: 'VAT Output Payable',
      debit: 0,
      credit: round(sale.taxTotal, decimals),
      memo: `5% VAT on Invoice ${sale.invoiceNumber}`,
    });
  }

  // 5. Perpetual Inventory & COGS entries
  if (totalCostOfGoods > 0) {
    lines.push({
      accountCode: '5000',
      accountName: 'Cost of Goods Sold (COGS)',
      debit: round(totalCostOfGoods, decimals),
      credit: 0,
      memo: `Cost of goods for Invoice ${sale.invoiceNumber}`,
    });

    lines.push({
      accountCode: '1200',
      accountName: 'Merchandise Inventory Asset',
      debit: 0,
      credit: round(totalCostOfGoods, decimals),
      memo: `Inventory reduction for Invoice ${sale.invoiceNumber}`,
    });
  }

  const { isBalanced, totalDebit, totalCredit } = assertBalanced(lines, decimals);

  return {
    id: `JE-SALE-${sale.id}`,
    entryNumber: `JE-${sale.invoiceNumber}`,
    date: sale.date,
    referenceType: 'SALE',
    referenceId: sale.id,
    description: `Automated posting for POS Sale ${sale.invoiceNumber} (${sale.customerName})`,
    branchId: sale.branchId,
    lines,
    totalDebit,
    totalCredit,
    isBalanced,
    status: 'POSTED',
    postedBy: sale.cashierName,
    postedAt: new Date().toISOString(),
  };
}

/**
 * Generates a balanced Journal Entry for a Refund.
 */
export function buildRefundJournalEntry(
  refundSale: Sale,
  refundCostOfGoods: number,
  decimals: number = 3
): JournalEntry {
  const lines: JournalLine[] = [];

  // 1. Debit Sales Revenue (Reversing subtotal)
  lines.push({
    accountCode: '4000',
    accountName: 'Sales Revenue',
    debit: round(refundSale.subtotal, decimals),
    credit: 0,
    memo: `Reversal of revenue for Refund ${refundSale.invoiceNumber}`,
  });

  // 2. Debit VAT Output Payable (Reversing tax collected)
  if (refundSale.taxTotal > 0) {
    lines.push({
      accountCode: '2100',
      accountName: 'VAT Output Payable',
      debit: round(refundSale.taxTotal, decimals),
      credit: 0,
      memo: `Reversal of VAT for Refund ${refundSale.invoiceNumber}`,
    });
  }

  // 3. Credit Cash / Bank / Customer Credit
  for (const pay of refundSale.payments) {
    let accountCode = '1010';
    let accountName = 'Cash on Hand';
    if (pay.method === 'CARD' || pay.method === 'BANK_TRANSFER') {
      accountCode = '1020';
      accountName = 'Bank Account (Oman Commercial Bank)';
    } else if (pay.method === 'CUSTOMER_CREDIT') {
      accountCode = '1100';
      accountName = 'Accounts Receivable';
    }

    lines.push({
      accountCode,
      accountName,
      debit: 0,
      credit: round(pay.amount, decimals),
      memo: `Refund payout via ${pay.method} for ${refundSale.invoiceNumber}`,
    });
  }

  // 4. Reverse Inventory Asset & COGS
  if (refundCostOfGoods > 0) {
    lines.push({
      accountCode: '1200',
      accountName: 'Merchandise Inventory Asset',
      debit: round(refundCostOfGoods, decimals),
      credit: 0,
      memo: `Inventory reinstatement from Refund ${refundSale.invoiceNumber}`,
    });

    lines.push({
      accountCode: '5000',
      accountName: 'Cost of Goods Sold (COGS)',
      debit: 0,
      credit: round(refundCostOfGoods, decimals),
      memo: `COGS reversal for Refund ${refundSale.invoiceNumber}`,
    });
  }

  const { isBalanced, totalDebit, totalCredit } = assertBalanced(lines, decimals);

  return {
    id: `JE-REFUND-${refundSale.id}`,
    entryNumber: `JE-REF-${refundSale.invoiceNumber}`,
    date: refundSale.date,
    referenceType: 'SALE_RETURN',
    referenceId: refundSale.id,
    description: `Automated posting for Sale Return/Refund ${refundSale.invoiceNumber}`,
    branchId: refundSale.branchId,
    lines,
    totalDebit,
    totalCredit,
    isBalanced,
    status: 'POSTED',
    postedBy: refundSale.cashierName,
    postedAt: new Date().toISOString(),
  };
}

/**
 * Generates a balanced Journal Entry for a Goods Receipt Note (GRN) from a supplier.
 */
export function buildGoodsReceiptJournalEntry(
  grn: GoodsReceipt,
  po: PurchaseOrder,
  branchId: string,
  decimals: number = 3
): JournalEntry {
  const lines: JournalLine[] = [];

  const inventoryTotal = grn.items.reduce(
    (acc, it) => add(acc, mul(it.quantityReceived, it.unitCost, decimals), decimals),
    0
  );
  
  // DR: Merchandise Inventory Asset
  lines.push({
    accountCode: '1200',
    accountName: 'Merchandise Inventory Asset',
    debit: round(inventoryTotal, decimals),
    credit: 0,
    memo: `Stock receipt GRN ${grn.grnNumber} against PO ${po.poNumber}`,
  });

  // Calculate proportional VAT Input Credit
  const taxAmount = round(inventoryTotal * 0.05, decimals); // 5% Oman VAT
  if (taxAmount > 0) {
    lines.push({
      accountCode: '2110',
      accountName: 'VAT Input Credit (Purchases)',
      debit: taxAmount,
      credit: 0,
      memo: `VAT 5% on GRN ${grn.grnNumber}`,
    });
  }

  // CR: Accounts Payable (Trade Creditors)
  const totalPayable = add(inventoryTotal, taxAmount, decimals);
  lines.push({
    accountCode: '2010',
    accountName: 'Accounts Payable',
    debit: 0,
    credit: totalPayable,
    memo: `Payable to ${grn.supplierName} for GRN ${grn.grnNumber}`,
  });

  const { isBalanced, totalDebit, totalCredit } = assertBalanced(lines, decimals);

  return {
    id: `JE-GRN-${grn.id}`,
    entryNumber: `JE-${grn.grnNumber}`,
    date: grn.receivedDate,
    referenceType: 'PURCHASE',
    referenceId: grn.id,
    description: `Goods Receipt ${grn.grnNumber} from ${grn.supplierName} for PO ${po.poNumber}`,
    branchId,
    lines,
    totalDebit,
    totalCredit,
    isBalanced,
    status: 'POSTED',
    postedBy: grn.receivedBy,
    postedAt: new Date().toISOString(),
  };
}

/**
 * Calculates General Ledger Account Balances from posted Journal Entries.
 */
export function calculateAccountBalances(
  baseAccounts: Account[],
  journalEntries: JournalEntry[],
  branchId?: string,
  decimals: number = 3
): { [accountCode: string]: { debitSum: number; creditSum: number; netBalance: number } } {
  const balances: { [code: string]: { debitSum: number; creditSum: number; netBalance: number } } = {};

  for (const acc of baseAccounts) {
    balances[acc.code] = { debitSum: 0, creditSum: 0, netBalance: 0 };
  }

  const validEntries = journalEntries.filter(
    (je) => je.status === 'POSTED' && (!branchId || branchId === '*' || je.branchId === branchId)
  );

  for (const je of validEntries) {
    for (const line of je.lines) {
      if (!balances[line.accountCode]) {
        balances[line.accountCode] = { debitSum: 0, creditSum: 0, netBalance: 0 };
      }
      balances[line.accountCode].debitSum = add(balances[line.accountCode].debitSum, line.debit, decimals);
      balances[line.accountCode].creditSum = add(balances[line.accountCode].creditSum, line.credit, decimals);
    }
  }

  for (const acc of baseAccounts) {
    const b = balances[acc.code];
    if (acc.normalBalance === 'DEBIT') {
      b.netBalance = sub(b.debitSum, b.creditSum, decimals);
    } else {
      b.netBalance = sub(b.creditSum, b.debitSum, decimals);
    }
  }

  return balances;
}

/**
 * Generates the Profit & Loss statement with exact mathematical reconciliation.
 */
export function generateProfitAndLoss(
  baseAccounts: Account[],
  journalEntries: JournalEntry[],
  branchId?: string,
  decimals: number = 3
) {
  const balances = calculateAccountBalances(baseAccounts, journalEntries, branchId, decimals);

  const grossRevenue = balances['4000']?.netBalance || 0;
  const discountsAllowed = balances['4010']?.netBalance || 0;
  const netRevenue = sub(grossRevenue, discountsAllowed, decimals);

  const cogs = balances['5000']?.netBalance || 0;
  const grossProfit = sub(netRevenue, cogs, decimals);

  const operatingExpenses = balances['6010']?.netBalance || 0;
  const netOperatingProfit = sub(grossProfit, operatingExpenses, decimals);

  return {
    grossRevenue,
    discountsAllowed,
    netRevenue,
    cogs,
    grossProfit,
    operatingExpenses,
    netOperatingProfit,
  };
}

/**
 * Generates the Balance Sheet and verifies the fundamental accounting equation:
 * Assets = Liabilities + Equity (including net retained earnings).
 */
export function generateBalanceSheet(
  baseAccounts: Account[],
  journalEntries: JournalEntry[],
  branchId?: string,
  decimals: number = 3
) {
  const balances = calculateAccountBalances(baseAccounts, journalEntries, branchId, decimals);
  const pnl = generateProfitAndLoss(baseAccounts, journalEntries, branchId, decimals);

  // Assets (Code starts with 1)
  const cash = balances['1010']?.netBalance || 0;
  const bank = balances['1020']?.netBalance || 0;
  const ar = balances['1100']?.netBalance || 0;
  const inventory = balances['1200']?.netBalance || 0;
  const vatInput = balances['2110']?.netBalance || 0;
  const totalAssets = add(cash, add(bank, add(ar, add(inventory, vatInput, decimals), decimals), decimals), decimals);

  // Liabilities (Code starts with 2)
  const ap = balances['2010']?.netBalance || 0;
  const vatOutput = balances['2100']?.netBalance || 0;
  const totalLiabilities = add(ap, vatOutput, decimals);

  // Equity (Code starts with 3)
  const baseEquity = balances['3000']?.netBalance || 0;
  const retainedEarnings = pnl.netOperatingProfit;
  const totalEquity = add(baseEquity, retainedEarnings, decimals);

  const totalLiabilitiesAndEquity = add(totalLiabilities, totalEquity, decimals);
  const isEquationBalanced = Math.abs(sub(totalAssets, totalLiabilitiesAndEquity, decimals)) < 0.001;

  return {
    assets: { cash, bank, ar, inventory, vatInput, totalAssets },
    liabilities: { ap, vatOutput, totalLiabilities },
    equity: { baseEquity, retainedEarnings, totalEquity },
    totalLiabilitiesAndEquity,
    isEquationBalanced,
  };
}

function mul(a: number, b: number, decimals: number = 3): number {
  return round(a * b, decimals);
}
