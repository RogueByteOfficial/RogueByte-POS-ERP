/**
 * RogueByte POS & ERP - Core Domain Models & Schemas
 */

export type CurrencyCode = 'OMR' | 'USD' | 'AED' | 'SAR' | 'EUR';

export interface Company {
  id: string;
  name: string;
  nameAr: string;
  taxNumber: string; // VAT TRN
  crNumber: string; // Commercial Registration Number
  phone: string;
  email: string;
  address: string;
  addressAr: string;
  currency: CurrencyCode;
  currencySymbol: string;
  decimalPlaces: number; // 3 for OMR, 2 for USD/EUR
  logoUrl: string;
  allowNegativeStock: boolean;
  costingMethod: 'FIFO' | 'WEIGHTED_AVERAGE';
}

export interface Branch {
  id: string;
  companyId: string;
  code: string; // e.g. "MCT-01"
  name: string;
  nameAr: string;
  city: string;
  address: string;
  phone: string;
  taxRegistrationNumber: string;
  invoicePrefix: string;
  active: boolean;
}

export interface Warehouse {
  id: string;
  branchId: string;
  code: string;
  name: string;
  nameAr: string;
  isDefault: boolean;
  active: boolean;
}

export interface CashRegister {
  id: string;
  branchId: string;
  code: string;
  name: string;
  active: boolean;
}

export type RoleType =
  | 'SUPER_ADMIN'
  | 'COMPANY_OWNER'
  | 'HEAD_OFFICE_MANAGER'
  | 'BRANCH_MANAGER'
  | 'ACCOUNTANT'
  | 'CASHIER'
  | 'INVENTORY_MANAGER'
  | 'WAREHOUSE_EMPLOYEE'
  | 'PURCHASING_OFFICER'
  | 'AUDITOR';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: RoleType;
  branchIds: string[]; // Branches this user is assigned to ('*' for all)
  permissions: string[];
  active: boolean;
  avatarUrl?: string;
}

export interface CashShift {
  id: string;
  registerId: string;
  branchId: string;
  cashierId: string;
  cashierName: string;
  openedAt: string;
  closedAt?: string;
  openingCash: number;
  expectedCash: number;
  countedCash?: number;
  discrepancy?: number;
  cashSalesTotal: number;
  cardSalesTotal: number;
  status: 'OPEN' | 'CLOSED';
  notes?: string;
}

export interface ProductCategory {
  id: string;
  name: string;
  nameAr: string;
  icon?: string;
}

export interface Product {
  id: string;
  sku: string;
  barcode: string;
  name: string;
  nameAr: string;
  categoryId: string;
  brand: string;
  unit: string; // 'pcs', 'box', 'kg', 'set'
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  taxRate: number; // e.g., 0.05 for 5% VAT
  minStockAlert: number;
  hasBatchTracking: boolean;
  hasExpiryTracking: boolean;
  active: boolean;
  imageUrl?: string;
}

export interface StockLevel {
  id: string;
  productId: string;
  warehouseId: string;
  quantityOnHand: number;
  quantityReserved: number;
  batchNumber?: string;
  expiryDate?: string;
  lastUpdated: string;
}

export type MovementType =
  | 'OPENING_STOCK'
  | 'SALE'
  | 'SALE_RETURN'
  | 'PURCHASE_RECEIPT'
  | 'PURCHASE_RETURN'
  | 'TRANSFER_OUT'
  | 'TRANSFER_IN'
  | 'ADJUSTMENT_ADD'
  | 'ADJUSTMENT_SUB'
  | 'DAMAGED_SCRAP';

export interface InventoryMovement {
  id: string;
  timestamp: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  movementType: MovementType;
  quantity: number; // Positive or negative
  unitCost: number;
  totalCost: number;
  referenceType: 'SALE' | 'RETURN' | 'TRANSFER' | 'PURCHASE' | 'ADJUSTMENT';
  referenceId: string;
  performedBy: string;
  notes?: string;
}

export type TransferStatus = 'REQUESTED' | 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED';

export interface StockTransferItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
}

export interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceBranchId: string;
  sourceWarehouseId: string;
  destBranchId: string;
  destWarehouseId: string;
  status: TransferStatus;
  requestedBy: string;
  approvedBy?: string;
  dispatchedBy?: string;
  receivedBy?: string;
  createdAt: string;
  dispatchedAt?: string;
  receivedAt?: string;
  items: StockTransferItem[];
  notes?: string;
}

export interface Customer {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  creditLimit: number;
  currentBalance: number;
  loyaltyPoints: number;
  paymentTermsDays: number;
  active: boolean;
}

export interface Supplier {
  id: string;
  code: string;
  name: string;
  nameAr?: string;
  phone: string;
  email?: string;
  address?: string;
  taxNumber?: string;
  contactPerson: string;
  currentBalance: number; // Accounts Payable
  paymentTermsDays: number;
  active: boolean;
}

export interface SaleItem {
  productId: string;
  sku: string;
  barcode: string;
  name: string;
  nameAr: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
}

export type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'CUSTOMER_CREDIT';

export interface PaymentLine {
  method: PaymentMethod;
  amount: number;
  reference?: string;
}

export interface Sale {
  id: string;
  invoiceNumber: string;
  branchId: string;
  warehouseId: string;
  registerId: string;
  cashierId: string;
  cashierName: string;
  customerId: string;
  customerName: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  paidAmount: number;
  changeAmount: number;
  payments: PaymentLine[];
  status: 'COMPLETED' | 'REFUNDED' | 'PARTIALLY_REFUNDED' | 'VOIDED';
  refundedAmount?: number;
  originalSaleId?: string; // If this transaction is a refund
  notes?: string;
  idempotencyKey?: string;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  branchId: string;
  warehouseId: string;
  orderDate: string;
  expectedDate?: string;
  status: 'DRAFT' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED';
  items: PurchaseOrderItem[];
  subtotal: number;
  taxTotal: number;
  grandTotal: number;
  notes?: string;
  createdBy: string;
}

export interface GoodsReceiptItem {
  productId: string;
  productName: string;
  quantityOrdered: number;
  quantityReceived: number;
  unitCost: number;
}

export interface GoodsReceipt {
  id: string;
  grnNumber: string;
  purchaseOrderId: string;
  supplierId: string;
  supplierName: string;
  warehouseId: string;
  receivedDate: string;
  receivedBy: string;
  items: GoodsReceiptItem[];
  notes?: string;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

export interface Account {
  code: string;
  name: string;
  nameAr: string;
  type: AccountType;
  normalBalance: 'DEBIT' | 'CREDIT';
  balance: number;
  description: string;
}

export interface JournalLine {
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  memo?: string;
}

export interface JournalEntry {
  id: string;
  entryNumber: string;
  date: string;
  referenceType: 'SALE' | 'SALE_RETURN' | 'PURCHASE' | 'CUSTOMER_PAYMENT' | 'SUPPLIER_PAYMENT' | 'MANUAL' | 'EXPENSE';
  referenceId: string;
  description: string;
  branchId: string;
  lines: JournalLine[];
  totalDebit: number;
  totalCredit: number;
  isBalanced: boolean;
  status: 'POSTED' | 'DRAFT';
  postedBy: string;
  postedAt: string;
}

export interface Expense {
  id: string;
  expenseNumber: string;
  branchId: string;
  category: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  date: string;
  paidVia: PaymentMethod;
  paidTo: string;
  description: string;
  approvedBy: string;
  status: 'PAID' | 'PENDING' | 'REJECTED';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  branchId?: string;
  action: string;
  module: string;
  details: string;
  ipAddress?: string;
}

export interface InvoiceSettings {
  companyName: string;
  companyNameAr: string;
  logoUrl: string;
  logoWidth: number;
  headerText: string;
  headerTextAr: string;
  footerText: string;
  footerTextAr: string;
  termsAndConditions: string;
  termsAndConditionsAr: string;
  taxNumber: string;
  crNumber: string;
  bankName: string;
  bankIban: string;
  receiptWidth: '58mm' | '80mm' | 'A4';
  language: 'en' | 'ar' | 'bilingual';
  showQrCode: boolean;
  showTaxBreakdown: boolean;
  primaryColor: string;
}
