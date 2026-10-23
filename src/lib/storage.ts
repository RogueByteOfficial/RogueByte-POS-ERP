/**
 * RogueByte POS & ERP - Central Data Storage & Persistence Engine
 * Features:
 * - Persistent LocalStorage with real-time reactive event dispatching
 * - Full multi-branch and multi-warehouse state
 * - Immutable Inventory Movement Ledger
 * - Perpetual double-entry journal integration
 * - Idempotency protection against duplicate sales
 * - Cashier Shift tracking
 * - Complete JSON Backup & Restore verification
 */

import {
  Company,
  Branch,
  Warehouse,
  CashRegister,
  User,
  CashShift,
  ProductCategory,
  Product,
  StockLevel,
  InventoryMovement,
  StockTransfer,
  Customer,
  Supplier,
  Sale,
  PurchaseOrder,
  GoodsReceipt,
  Account,
  JournalEntry,
  Expense,
  AuditLog,
  InvoiceSettings,
} from '../types/models';
import { round, add, sub, mul } from './decimal';
import { buildSaleJournalEntry, buildRefundJournalEntry, buildGoodsReceiptJournalEntry } from './accountingEngine';

export interface DatabaseState {
  company: Company;
  branches: Branch[];
  warehouses: Warehouse[];
  registers: CashRegister[];
  users: User[];
  currentUser: User;
  activeBranchId: string; // Current selected branch context ('*' or branch ID)
  activeShift: CashShift | null;
  categories: ProductCategory[];
  products: Product[];
  stockLevels: StockLevel[];
  inventoryMovements: InventoryMovement[];
  transfers: StockTransfer[];
  customers: Customer[];
  suppliers: Supplier[];
  sales: Sale[];
  heldSales: { id: string; branchId: string; date: string; items: any[]; customerId: string; note: string }[];
  purchaseOrders: PurchaseOrder[];
  goodsReceipts: GoodsReceipt[];
  accounts: Account[];
  journalEntries: JournalEntry[];
  expenses: Expense[];
  auditLogs: AuditLog[];
  invoiceSettings: InvoiceSettings;
}

const STORAGE_KEY = 'roguebyte_erp_database_v2';
const BRAND_LOGO_PATH = '/src/assets/images/roguebyte_brand_logo_1792715117512.jpg';

export const INITIAL_DATABASE: DatabaseState = {
  company: {
    id: 'COMP-01',
    name: 'RogueByte Oman Business Systems LLC',
    nameAr: 'أنظمة روج بايت للأعمال ش.م.م - عمان',
    taxNumber: 'OM1100482938',
    crNumber: 'CR-1049281',
    phone: '+968 2450 1200',
    email: 'info@roguebyte.om',
    address: 'Al Khuwair Commercial District, Way 3502, Building 48, Muscat, Sultanate of Oman',
    addressAr: 'حي الخوير التجاري، شارع ٣٥٠٢، مبنى ٤٨، مسقط، سلطنة عُمان',
    currency: 'OMR',
    currencySymbol: 'OMR',
    decimalPlaces: 3,
    logoUrl: BRAND_LOGO_PATH,
    allowNegativeStock: false,
    costingMethod: 'WEIGHTED_AVERAGE',
  },

  branches: [
    {
      id: 'BR-MCT-01',
      companyId: 'COMP-01',
      code: 'MCT-01',
      name: 'Muscat Main Flagship Store',
      nameAr: 'فرع مسقط الرئيسي',
      city: 'Muscat',
      address: 'Al Khuwair Center, Muscat',
      phone: '+968 2450 1201',
      taxRegistrationNumber: 'OM1100482938-01',
      invoicePrefix: 'MCT-INV-',
      active: true,
    },
    {
      id: 'BR-SAL-02',
      companyId: 'COMP-01',
      code: 'SAL-02',
      name: 'Salalah Dhofar Retail Branch',
      nameAr: 'فرع صلالة ظفار',
      city: 'Salalah',
      address: 'As Sultan Qaboos Street, Salalah',
      phone: '+968 2320 8899',
      taxRegistrationNumber: 'OM1100482938-02',
      invoicePrefix: 'SAL-INV-',
      active: true,
    },
    {
      id: 'BR-SOH-03',
      companyId: 'COMP-01',
      code: 'SOH-03',
      name: 'Sohar Logistics Distribution Hub',
      nameAr: 'مركز صحار للتوزيع واللوجستيات',
      city: 'Sohar',
      address: 'Sohar Industrial Zone, Sohar',
      phone: '+968 2684 5511',
      taxRegistrationNumber: 'OM1100482938-03',
      invoicePrefix: 'SOH-INV-',
      active: true,
    },
  ],

  warehouses: [
    {
      id: 'WH-MCT-MAIN',
      branchId: 'BR-MCT-01',
      code: 'MCT-WH1',
      name: 'Muscat Central Warehouse',
      nameAr: 'مستودع مسقط المركزي',
      isDefault: true,
      active: true,
    },
    {
      id: 'WH-MCT-FRONT',
      branchId: 'BR-MCT-01',
      code: 'MCT-STR',
      name: 'Muscat Retail Floor Storage',
      nameAr: 'مستودع صالة عرض مسقط',
      isDefault: false,
      active: true,
    },
    {
      id: 'WH-SAL-STORE',
      branchId: 'BR-SAL-02',
      code: 'SAL-WH1',
      name: 'Salalah Branch Warehouse',
      nameAr: 'مستودع فرع صلالة',
      isDefault: true,
      active: true,
    },
    {
      id: 'WH-SOH-HUB',
      branchId: 'BR-SOH-03',
      code: 'SOH-WH1',
      name: 'Sohar Regional Depository',
      nameAr: 'مستودع صحار الإقليمي',
      isDefault: true,
      active: true,
    },
  ],

  registers: [
    { id: 'REG-MCT-01', branchId: 'BR-MCT-01', code: 'POS-01', name: 'Muscat Main Terminal 1', active: true },
    { id: 'REG-MCT-02', branchId: 'BR-MCT-01', code: 'POS-02', name: 'Muscat Express Counter 2', active: true },
    { id: 'REG-SAL-01', branchId: 'BR-SAL-02', code: 'POS-03', name: 'Salalah Counter Terminal', active: true },
  ],

  users: [
    {
      id: 'USR-01',
      username: 'admin',
      fullName: 'Tariq Al-Balushi',
      email: 'tariq.admin@roguebyte.om',
      role: 'SUPER_ADMIN',
      branchIds: ['*'],
      permissions: ['*'],
      active: true,
    },
    {
      id: 'USR-02',
      username: 'salim.mgr',
      fullName: 'Salim Al-Harthy',
      email: 'salim.h@roguebyte.om',
      role: 'BRANCH_MANAGER',
      branchIds: ['BR-MCT-01'],
      permissions: ['pos.*', 'inventory.*', 'purchasing.*', 'crm.*', 'reports.view'],
      active: true,
    },
    {
      id: 'USR-03',
      username: 'fatima.acc',
      fullName: 'Fatima Al-Lawati',
      email: 'fatima.acc@roguebyte.om',
      role: 'ACCOUNTANT',
      branchIds: ['*'],
      permissions: ['accounting.*', 'reports.*', 'pos.view', 'purchasing.view'],
      active: true,
    },
    {
      id: 'USR-04',
      username: 'ahmed.cashier',
      fullName: 'Ahmed Al-Maamari',
      email: 'ahmed.pos@roguebyte.om',
      role: 'CASHIER',
      branchIds: ['BR-MCT-01'],
      permissions: ['pos.sale', 'pos.hold', 'pos.shift', 'pos.discount'],
      active: true,
    },
    {
      id: 'USR-05',
      username: 'khalid.salalah',
      fullName: 'Khalid Al-Shanfari',
      email: 'khalid.s@roguebyte.om',
      role: 'CASHIER',
      branchIds: ['BR-SAL-02'],
      permissions: ['pos.sale', 'pos.hold', 'pos.shift'],
      active: true,
    },
    {
      id: 'USR-06',
      username: 'maryam.audit',
      fullName: 'Maryam Al-Zedjali',
      email: 'maryam.audit@roguebyte.om',
      role: 'AUDITOR',
      branchIds: ['*'],
      permissions: ['reports.*', 'accounting.view', 'audit.view'],
      active: true,
    },
  ],

  currentUser: {
    id: 'USR-01',
    username: 'admin',
    fullName: 'Tariq Al-Balushi',
    email: 'tariq.admin@roguebyte.om',
    role: 'SUPER_ADMIN',
    branchIds: ['*'],
    permissions: ['*'],
    active: true,
  },

  activeBranchId: 'BR-MCT-01',

  activeShift: {
    id: 'SHIFT-20261022-01',
    registerId: 'REG-MCT-01',
    branchId: 'BR-MCT-01',
    cashierId: 'USR-01',
    cashierName: 'Tariq Al-Balushi',
    openedAt: '2026-10-22T08:00:00.000Z',
    openingCash: 50.000,
    expectedCash: 50.000,
    cashSalesTotal: 0,
    cardSalesTotal: 0,
    status: 'OPEN',
    notes: 'Morning shift float verified and open',
  },

  categories: [
    { id: 'CAT-01', name: 'Specialty Coffee & Roasts', nameAr: 'قهوة ومشروبات مختصة' },
    { id: 'CAT-02', name: 'Omani Frankincense & Luxury Perfumes', nameAr: 'عطور ولبان عماني فاخر' },
    { id: 'CAT-03', name: 'Premium Dates & Confectionery', nameAr: 'تمور وضيافة عمانية' },
    { id: 'CAT-04', name: 'Smart Electronics & Accessories', nameAr: 'أجهزة ذكية وإلكترونيات' },
    { id: 'CAT-05', name: 'Retail Merchandise & Gifts', nameAr: 'هدايا ومستلزمات' },
  ],

  products: [
    {
      id: 'PRD-01',
      sku: 'COF-ETH-01',
      barcode: '608101000101',
      name: 'Single Origin Ethiopian Yirgacheffe (250g)',
      nameAr: 'بن أثيوبي يرجاشيف مختص (٢٥٠ جم)',
      categoryId: 'CAT-01',
      brand: 'Muscat Roastery',
      unit: 'pcs',
      costPrice: 3.200,
      sellingPrice: 5.500,
      wholesalePrice: 4.800,
      taxRate: 0.05,
      minStockAlert: 10,
      hasBatchTracking: true,
      hasExpiryTracking: true,
      active: true,
    },
    {
      id: 'PRD-02',
      sku: 'COF-COL-02',
      barcode: '608101000102',
      name: 'Colombian Geisha Micro-Lot Beans (250g)',
      nameAr: 'بن جيشا كولومبي فاخر (٢٥٠ جم)',
      categoryId: 'CAT-01',
      brand: 'Muscat Roastery',
      unit: 'pcs',
      costPrice: 6.500,
      sellingPrice: 11.200,
      wholesalePrice: 9.800,
      taxRate: 0.05,
      minStockAlert: 8,
      hasBatchTracking: true,
      hasExpiryTracking: true,
      active: true,
    },
    {
      id: 'PRD-03',
      sku: 'FRK-HOJ-01',
      barcode: '608102000201',
      name: 'Royal Green Hojari Frankincense (100g Grade A)',
      nameAr: 'لبان حوجري أخضر ملكي فاخر فرز أول (١٠٠ جم)',
      categoryId: 'CAT-02',
      brand: 'Dhofar Treasures',
      unit: 'pcs',
      costPrice: 8.000,
      sellingPrice: 16.500,
      wholesalePrice: 14.000,
      taxRate: 0.05,
      minStockAlert: 15,
      hasBatchTracking: true,
      hasExpiryTracking: false,
      active: true,
    },
    {
      id: 'PRD-04',
      sku: 'PRF-OUD-02',
      barcode: '608102000202',
      name: 'Sultanate Ambergris & Omani Oud EDP (100ml)',
      nameAr: 'عطر عنبر السلطنة والعود العماني (١٠٠ مل)',
      categoryId: 'CAT-02',
      brand: 'Al-Bustan Parfums',
      unit: 'pcs',
      costPrice: 24.000,
      sellingPrice: 45.000,
      wholesalePrice: 38.000,
      taxRate: 0.05,
      minStockAlert: 5,
      hasBatchTracking: true,
      hasExpiryTracking: false,
      active: true,
    },
    {
      id: 'PRD-05',
      sku: 'DAT-KHL-01',
      barcode: '608103000301',
      name: 'Omani Premium Khalas Dates Box (1 kg)',
      nameAr: 'تمور خلاص عمانية فاخرة (١ كجم)',
      categoryId: 'CAT-03',
      brand: 'Nizwa Palms',
      unit: 'box',
      costPrice: 1.800,
      sellingPrice: 3.500,
      wholesalePrice: 2.900,
      taxRate: 0.05,
      minStockAlert: 20,
      hasBatchTracking: true,
      hasExpiryTracking: true,
      active: true,
    },
    {
      id: 'PRD-06',
      sku: 'DAT-HAL-02',
      barcode: '608103000302',
      name: 'Traditional Royal Omani Halwa Bowl (500g)',
      nameAr: 'حلوى عمانية ملكية بالزعفران والمكسرات (٥٠٠ جم)',
      categoryId: 'CAT-03',
      brand: 'Barakat Nizwa',
      unit: 'box',
      costPrice: 2.200,
      sellingPrice: 4.250,
      wholesalePrice: 3.600,
      taxRate: 0.05,
      minStockAlert: 12,
      hasBatchTracking: true,
      hasExpiryTracking: true,
      active: true,
    },
    {
      id: 'PRD-07',
      sku: 'ELC-CHR-01',
      barcode: '608104000401',
      name: 'RogueByte Fast GaN USB-C 65W Power Adapter',
      nameAr: 'شاحن روج بايت سريع GaN قدرة ٦٥ واط',
      categoryId: 'CAT-04',
      brand: 'RogueByte Tech',
      unit: 'pcs',
      costPrice: 6.000,
      sellingPrice: 12.000,
      wholesalePrice: 9.500,
      taxRate: 0.05,
      minStockAlert: 10,
      hasBatchTracking: false,
      hasExpiryTracking: false,
      active: true,
    },
    {
      id: 'PRD-08',
      sku: 'ELC-CAB-02',
      barcode: '608104000402',
      name: 'Braided Heavy Duty 240W Type-C Cable (2m)',
      nameAr: 'كابل تايب سي مجدول ٢٤٠ واط بطول ٢ متر',
      categoryId: 'CAT-04',
      brand: 'RogueByte Tech',
      unit: 'pcs',
      costPrice: 1.500,
      sellingPrice: 3.750,
      wholesalePrice: 2.800,
      taxRate: 0.05,
      minStockAlert: 15,
      hasBatchTracking: false,
      hasExpiryTracking: false,
      active: true,
    },
  ],

  stockLevels: [
    { id: 'STK-01', productId: 'PRD-01', warehouseId: 'WH-MCT-MAIN', quantityOnHand: 85, quantityReserved: 0, batchNumber: 'BAT-2026-08', expiryDate: '2027-08-30', lastUpdated: '2026-10-20' },
    { id: 'STK-02', productId: 'PRD-01', warehouseId: 'WH-SAL-STORE', quantityOnHand: 25, quantityReserved: 0, batchNumber: 'BAT-2026-08', expiryDate: '2027-08-30', lastUpdated: '2026-10-20' },
    { id: 'STK-03', productId: 'PRD-02', warehouseId: 'WH-MCT-MAIN', quantityOnHand: 42, quantityReserved: 0, batchNumber: 'BAT-2026-09', expiryDate: '2027-09-15', lastUpdated: '2026-10-20' },
    { id: 'STK-04', productId: 'PRD-02', warehouseId: 'WH-SAL-STORE', quantityOnHand: 14, quantityReserved: 0, batchNumber: 'BAT-2026-09', expiryDate: '2027-09-15', lastUpdated: '2026-10-20' },
    { id: 'STK-05', productId: 'PRD-03', warehouseId: 'WH-MCT-MAIN', quantityOnHand: 60, quantityReserved: 0, batchNumber: 'DH-2026-A1', lastUpdated: '2026-10-20' },
    { id: 'STK-06', productId: 'PRD-03', warehouseId: 'WH-SAL-STORE', quantityOnHand: 110, quantityReserved: 0, batchNumber: 'DH-2026-A1', lastUpdated: '2026-10-20' },
    { id: 'STK-07', productId: 'PRD-04', warehouseId: 'WH-MCT-MAIN', quantityOnHand: 35, quantityReserved: 0, batchNumber: 'BST-889', lastUpdated: '2026-10-20' },
    { id: 'STK-08', productId: 'PRD-04', warehouseId: 'WH-SAL-STORE', quantityOnHand: 18, quantityReserved: 0, batchNumber: 'BST-889', lastUpdated: '2026-10-20' },
    { id: 'STK-09', productId: 'PRD-05', warehouseId: 'WH-MCT-MAIN', quantityOnHand: 120, quantityReserved: 0, batchNumber: 'NZ-2026-01', expiryDate: '2027-10-01', lastUpdated: '2026-10-20' },
    { id: 'STK-10', productId: 'PRD-05', warehouseId: 'WH-SAL-STORE', quantityOnHand: 45, quantityReserved: 0, batchNumber: 'NZ-2026-01', expiryDate: '2027-10-01', lastUpdated: '2026-10-20' },
    { id: 'STK-11', productId: 'PRD-06', warehouseId: 'WH-MCT-MAIN', quantityOnHand: 55, quantityReserved: 0, batchNumber: 'HL-2026-44', expiryDate: '2027-04-10', lastUpdated: '2026-10-20' },
    { id: 'STK-12', productId: 'PRD-06', warehouseId: 'WH-SAL-STORE', quantityOnHand: 30, quantityReserved: 0, batchNumber: 'HL-2026-44', expiryDate: '2027-04-10', lastUpdated: '2026-10-20' },
    { id: 'STK-13', productId: 'PRD-07', warehouseId: 'WH-MCT-MAIN', quantityOnHand: 48, quantityReserved: 0, lastUpdated: '2026-10-20' },
    { id: 'STK-14', productId: 'PRD-07', warehouseId: 'WH-SAL-STORE', quantityOnHand: 22, quantityReserved: 0, lastUpdated: '2026-10-20' },
    { id: 'STK-15', productId: 'PRD-08', warehouseId: 'WH-MCT-MAIN', quantityOnHand: 90, quantityReserved: 0, lastUpdated: '2026-10-20' },
    { id: 'STK-16', productId: 'PRD-08', warehouseId: 'WH-SAL-STORE', quantityOnHand: 35, quantityReserved: 0, lastUpdated: '2026-10-20' },
  ],

  inventoryMovements: [
    {
      id: 'MOV-INIT-01',
      timestamp: '2026-10-01T08:00:00Z',
      productId: 'PRD-01',
      productName: 'Single Origin Ethiopian Yirgacheffe (250g)',
      warehouseId: 'WH-MCT-MAIN',
      warehouseName: 'Muscat Central Warehouse',
      movementType: 'OPENING_STOCK',
      quantity: 100,
      unitCost: 3.200,
      totalCost: 320.000,
      referenceType: 'ADJUSTMENT',
      referenceId: 'OPEN-2026',
      performedBy: 'System Initializer',
      notes: 'Initial inventory intake',
    },
    {
      id: 'MOV-INIT-02',
      timestamp: '2026-10-01T08:00:00Z',
      productId: 'PRD-03',
      productName: 'Royal Green Hojari Frankincense (100g Grade A)',
      warehouseId: 'WH-MCT-MAIN',
      warehouseName: 'Muscat Central Warehouse',
      movementType: 'OPENING_STOCK',
      quantity: 80,
      unitCost: 8.000,
      totalCost: 640.000,
      referenceType: 'ADJUSTMENT',
      referenceId: 'OPEN-2026',
      performedBy: 'System Initializer',
      notes: 'Initial inventory intake',
    },
  ],

  transfers: [
    {
      id: 'TRF-001',
      transferNumber: 'TRF-2026-0001',
      sourceBranchId: 'BR-MCT-01',
      sourceWarehouseId: 'WH-MCT-MAIN',
      destBranchId: 'BR-SAL-02',
      destWarehouseId: 'WH-SAL-STORE',
      status: 'RECEIVED',
      requestedBy: 'Salim Al-Harthy',
      approvedBy: 'Tariq Al-Balushi',
      dispatchedBy: 'Salim Al-Harthy',
      receivedBy: 'Khalid Al-Shanfari',
      createdAt: '2026-10-18T10:00:00Z',
      dispatchedAt: '2026-10-19T08:00:00Z',
      receivedAt: '2026-10-20T14:30:00Z',
      items: [
        { productId: 'PRD-01', productName: 'Single Origin Ethiopian Yirgacheffe (250g)', quantity: 15, unitCost: 3.200 },
        { productId: 'PRD-07', productName: 'RogueByte Fast GaN USB-C 65W Power Adapter', quantity: 10, unitCost: 6.000 },
      ],
      notes: 'Replenishment for Salalah retail weekend promotion',
    },
  ],

  customers: [
    {
      id: 'CUST-00',
      code: 'CUST-WALK',
      name: 'Walk-in Cash Customer',
      nameAr: 'عميل نقدي مباشر',
      phone: '-',
      creditLimit: 0,
      currentBalance: 0,
      loyaltyPoints: 0,
      paymentTermsDays: 0,
      active: true,
    },
    {
      id: 'CUST-01',
      code: 'CUST-ZAW',
      name: 'Al-Zawawi Trading & Contracting LLC',
      nameAr: 'شركة الزواوي للتجارة والمقاولات ش.م.م',
      phone: '+968 2470 5500',
      email: 'procurement@zawawi-group.om',
      address: 'CBD Area, Ruwi, Muscat',
      taxNumber: 'OM1100029311',
      creditLimit: 2500.000,
      currentBalance: 420.500,
      loyaltyPoints: 340,
      paymentTermsDays: 30,
      active: true,
    },
    {
      id: 'CUST-02',
      code: 'CUST-MAH',
      name: 'Al-Maha Petroleum Services SAOG',
      nameAr: 'شركة المها لخدمات تسويق النفط ش.م.ع.ع',
      phone: '+968 2461 9000',
      email: 'fleet@almaha.com.om',
      address: 'Madinat Sultan Qaboos, Muscat',
      taxNumber: 'OM1100084722',
      creditLimit: 5000.000,
      currentBalance: 890.000,
      loyaltyPoints: 720,
      paymentTermsDays: 45,
      active: true,
    },
    {
      id: 'CUST-03',
      code: 'CUST-OMN',
      name: 'Oman Sail Foundation',
      nameAr: 'مؤسسة عمان للإبحار',
      phone: '+968 2418 1111',
      email: 'events@omansail.om',
      address: 'Al Mouj Marina, Muscat',
      taxNumber: 'OM1100055219',
      creditLimit: 1500.000,
      currentBalance: 0,
      loyaltyPoints: 150,
      paymentTermsDays: 15,
      active: true,
    },
  ],

  suppliers: [
    {
      id: 'SUP-01',
      code: 'SUP-DHOF',
      name: 'Dhofar Natural Herbs & Frankincense Corp',
      nameAr: 'مؤسسة ظفار للأعشاب واللبان الطبيعي',
      phone: '+968 2329 1100',
      email: 'orders@dhofarherbs.om',
      address: 'Haffa Souq, Salalah',
      taxNumber: 'OM1100034188',
      contactPerson: 'Sheikh Ahmed Al-Shanfari',
      currentBalance: 640.000,
      paymentTermsDays: 30,
      active: true,
    },
    {
      id: 'SUP-02',
      code: 'SUP-COFF',
      name: 'Arabian Peninsula Coffee Importers LLC',
      nameAr: 'شركة مستوردي بن شبه الجزيرة العربية',
      phone: '+968 2459 4433',
      email: 'supply@arabiancoffee.om',
      address: 'Ghala Industrial Area, Muscat',
      taxNumber: 'OM1100049921',
      contactPerson: 'Ziyad Al-Kindi',
      currentBalance: 320.000,
      paymentTermsDays: 45,
      active: true,
    },
  ],

  sales: [
    {
      id: 'SALE-2026-001',
      invoiceNumber: 'MCT-INV-2026-0001',
      branchId: 'BR-MCT-01',
      warehouseId: 'WH-MCT-MAIN',
      registerId: 'REG-MCT-01',
      cashierId: 'USR-01',
      cashierName: 'Tariq Al-Balushi',
      customerId: 'CUST-01',
      customerName: 'Al-Zawawi Trading & Contracting LLC',
      date: '2026-10-21T11:30:00Z',
      items: [
        {
          productId: 'PRD-03',
          sku: 'FRK-HOJ-01',
          barcode: '608102000201',
          name: 'Royal Green Hojari Frankincense (100g Grade A)',
          nameAr: 'لبان حوجري أخضر ملكي فاخر فرز أول (١٠٠ جم)',
          unit: 'pcs',
          quantity: 2,
          unitPrice: 16.500,
          costPrice: 8.000,
          discountAmount: 0,
          taxRate: 0.05,
          taxAmount: 1.650,
          lineTotal: 34.650,
        },
        {
          productId: 'PRD-01',
          sku: 'COF-ETH-01',
          barcode: '608101000101',
          name: 'Single Origin Ethiopian Yirgacheffe (250g)',
          nameAr: 'بن أثيوبي يرجاشيف مختص (٢٥٠ جم)',
          unit: 'pcs',
          quantity: 1,
          unitPrice: 5.500,
          costPrice: 3.200,
          discountAmount: 0,
          taxRate: 0.05,
          taxAmount: 0.275,
          lineTotal: 5.775,
        },
      ],
      subtotal: 38.500,
      discountTotal: 0,
      taxTotal: 1.925,
      grandTotal: 40.425,
      paidAmount: 40.425,
      changeAmount: 0,
      payments: [{ method: 'CARD', amount: 40.425, reference: 'POS-NBO-AUTH-9811' }],
      status: 'COMPLETED',
      idempotencyKey: 'IDEM-INIT-001',
    },
  ],

  heldSales: [],

  purchaseOrders: [
    {
      id: 'PO-2026-001',
      poNumber: 'PO-MCT-2026-0001',
      supplierId: 'SUP-01',
      supplierName: 'Dhofar Natural Herbs & Frankincense Corp',
      branchId: 'BR-MCT-01',
      warehouseId: 'WH-MCT-MAIN',
      orderDate: '2026-10-15',
      expectedDate: '2026-10-25',
      status: 'RECEIVED',
      items: [
        {
          productId: 'PRD-03',
          productName: 'Royal Green Hojari Frankincense (100g Grade A)',
          quantity: 20,
          unitCost: 8.000,
          taxRate: 0.05,
          taxAmount: 8.000,
          total: 168.000,
        },
      ],
      subtotal: 160.000,
      taxTotal: 8.000,
      grandTotal: 168.000,
      notes: 'Autumn replenishment',
      createdBy: 'Salim Al-Harthy',
    },
  ],

  goodsReceipts: [
    {
      id: 'GRN-2026-001',
      grnNumber: 'GRN-2026-0001',
      purchaseOrderId: 'PO-2026-001',
      supplierId: 'SUP-01',
      supplierName: 'Dhofar Natural Herbs & Frankincense Corp',
      warehouseId: 'WH-MCT-MAIN',
      receivedDate: '2026-10-19',
      receivedBy: 'Salim Al-Harthy',
      items: [
        {
          productId: 'PRD-03',
          productName: 'Royal Green Hojari Frankincense (100g Grade A)',
          quantityOrdered: 20,
          quantityReceived: 20,
          unitCost: 8.000,
        },
      ],
      notes: 'All items verified and inspected into Muscat Central Warehouse',
    },
  ],

  accounts: [
    { code: '1010', name: 'Cash on Hand', nameAr: 'النقدية بالصندوق', type: 'ASSET', normalBalance: 'DEBIT', balance: 50.000, description: 'Cash in registers and office safes' },
    { code: '1020', name: 'Bank Account (Oman Commercial Bank)', nameAr: 'الحساب البنكي (البنك التجاري)', type: 'ASSET', normalBalance: 'DEBIT', balance: 14250.000, description: 'Operating checking account' },
    { code: '1100', name: 'Accounts Receivable (Trade Debtors)', nameAr: 'العملاء والمدينون التجاريون', type: 'ASSET', normalBalance: 'DEBIT', balance: 1310.500, description: 'Customer credit sales owed' },
    { code: '1200', name: 'Merchandise Inventory Asset', nameAr: 'مخزون بضاعة التجزئة', type: 'ASSET', normalBalance: 'DEBIT', balance: 3480.000, description: 'Total inventory asset at cost' },
    { code: '2010', name: 'Accounts Payable (Trade Creditors)', nameAr: 'الموردون والدائنون التجاريون', type: 'LIABILITY', normalBalance: 'CREDIT', balance: 960.000, description: 'Amounts owed to suppliers' },
    { code: '2100', name: 'VAT Output Payable (Sales Tax)', nameAr: 'ضريبة القيمة المضافة المحصلة (مخرجات)', type: 'LIABILITY', normalBalance: 'CREDIT', balance: 1.925, description: '5% VAT collected from customers' },
    { code: '2110', name: 'VAT Input Credit (Purchases)', nameAr: 'ضريبة القيمة المضافة المدفوعة (مدخلات)', type: 'ASSET', normalBalance: 'DEBIT', balance: 8.000, description: '5% VAT paid on goods receipts' },
    { code: '3000', name: 'Owner Equity & Retained Capital', nameAr: 'رأس المال والأرباح المبقاة', type: 'EQUITY', normalBalance: 'CREDIT', balance: 18126.900, description: 'Initial paid-up equity' },
    { code: '4000', name: 'Sales Revenue', nameAr: 'إيرادات المبيعات', type: 'REVENUE', normalBalance: 'CREDIT', balance: 38.500, description: 'Gross revenue from retail sales' },
    { code: '4010', name: 'Sales Discounts Allowed', nameAr: 'خصومات المبيعات الممنوحة', type: 'REVENUE', normalBalance: 'DEBIT', balance: 0.000, description: 'Discounts granted on sales' },
    { code: '5000', name: 'Cost of Goods Sold (COGS)', nameAr: 'تكلفة البضاعة المباعة', type: 'EXPENSE', normalBalance: 'DEBIT', balance: 19.200, description: 'Direct acquisition cost of sold items' },
    { code: '6010', name: 'Operating Expenses (Rent & Utilities)', nameAr: 'المصروفات التشغيلية والعمومية', type: 'EXPENSE', normalBalance: 'DEBIT', balance: 0.000, description: 'General overhead and store operations' },
  ],

  journalEntries: [
    {
      id: 'JE-SALE-SALE-2026-001',
      entryNumber: 'JE-MCT-INV-2026-0001',
      date: '2026-10-21T11:30:00Z',
      referenceType: 'SALE',
      referenceId: 'SALE-2026-001',
      description: 'Automated posting for POS Sale MCT-INV-2026-0001 (Al-Zawawi Trading & Contracting LLC)',
      branchId: 'BR-MCT-01',
      lines: [
        { accountCode: '1020', accountName: 'Bank Account (Oman Commercial Bank)', debit: 40.425, credit: 0, memo: 'Card payment via POS-NBO-AUTH-9811' },
        { accountCode: '4000', accountName: 'Sales Revenue', debit: 0, credit: 38.500, memo: 'Revenue from Invoice MCT-INV-2026-0001' },
        { accountCode: '2100', accountName: 'VAT Output Payable', debit: 0, credit: 1.925, memo: '5% VAT on Invoice MCT-INV-2026-0001' },
        { accountCode: '5000', accountName: 'Cost of Goods Sold (COGS)', debit: 19.200, credit: 0, memo: 'Cost of goods for Invoice MCT-INV-2026-0001' },
        { accountCode: '1200', accountName: 'Merchandise Inventory Asset', debit: 0, credit: 19.200, memo: 'Inventory reduction for Invoice MCT-INV-2026-0001' },
      ],
      totalDebit: 59.625,
      totalCredit: 59.625,
      isBalanced: true,
      status: 'POSTED',
      postedBy: 'Tariq Al-Balushi',
      postedAt: '2026-10-21T11:30:01Z',
    },
  ],

  expenses: [],

  auditLogs: [
    {
      id: 'LOG-001',
      timestamp: '2026-10-22T08:00:00Z',
      userId: 'USR-01',
      userName: 'Tariq Al-Balushi',
      branchId: 'BR-MCT-01',
      action: 'SHIFT_OPEN',
      module: 'POS',
      details: 'Opened register shift REG-MCT-01 with 50.000 OMR cash float',
      ipAddress: '192.168.1.10',
    },
  ],

  invoiceSettings: {
    companyName: 'RogueByte Oman Business Systems LLC',
    companyNameAr: 'أنظمة روج بايت للأعمال ش.م.م - عمان',
    logoUrl: BRAND_LOGO_PATH,
    logoWidth: 140,
    headerText: 'Tax Invoice & Official Cash Receipt',
    headerTextAr: 'فاتورة ضريبية وإيصال مالي رسمي',
    footerText: 'Thank you for choosing RogueByte Business Systems. Goods sold can be exchanged within 14 days with original receipt.',
    footerTextAr: 'شكراً لتعاملكم معنا. يمكن استبدال البضائع خلال ١٤ يوماً بشرط وجود الفاتورة الأصلية.',
    termsAndConditions: 'Payment is due per agreed credit terms. Return of defective electronics requires manufacturer inspection.',
    termsAndConditionsAr: 'السداد وفق شروط الائتمان المتفق عليها. تخضع المرتجعات لسياسة الفحص المعتمدة.',
    taxNumber: 'OM1100482938',
    crNumber: 'CR-1049281',
    bankName: 'National Bank of Oman (NBO) / Bank Muscat',
    bankIban: 'OM12NBOB0000010928392810',
    receiptWidth: '80mm',
    language: 'bilingual',
    showQrCode: true,
    showTaxBreakdown: true,
    primaryColor: '#059669', // Emerald
  },
};

class DatabaseManager {
  private state: DatabaseState;

  constructor() {
    this.state = this.loadState();
  }

  private loadState(): DatabaseState {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure critical keys exist
        return { ...INITIAL_DATABASE, ...parsed };
      }
    } catch (e) {
      console.warn('Could not read from localStorage, using initial database', e);
    }
    return INITIAL_DATABASE;
  }

  public getState(): DatabaseState {
    return this.state;
  }

  private saveAndNotify() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Failed to save database to localStorage', e);
    }
    window.dispatchEvent(new CustomEvent('roguebyte-db-change', { detail: this.state }));
  }

  public switchBranch(branchId: string) {
    this.state.activeBranchId = branchId;
    this.saveAndNotify();
  }

  public switchUser(userId: string) {
    const user = this.state.users.find((u) => u.id === userId);
    if (user) {
      this.state.currentUser = user;
      // If user is restricted to a branch and not currently on it, switch
      if (!user.branchIds.includes('*') && !user.branchIds.includes(this.state.activeBranchId)) {
        this.state.activeBranchId = user.branchIds[0];
      }
      this.logAudit(user.id, user.fullName, 'USER_SWITCH', 'AUTH', `Switched active session to ${user.fullName} (${user.role})`);
      this.saveAndNotify();
    }
  }

  public logAudit(userId: string, userName: string, action: string, module: string, details: string) {
    const log: AuditLog = {
      id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      userId,
      userName,
      branchId: this.state.activeBranchId,
      action,
      module,
      details,
      ipAddress: '127.0.0.1',
    };
    this.state.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs.pop();
    }
  }

  /**
   * Process a Completed POS Sale in a single ACID-like atomic operation:
   * 1. Idempotency Check (prevent duplicate submission)
   * 2. Stock Validation (checks sufficient stock per warehouse unless negative stock enabled)
   * 3. Stock Level Deduction & Immutable Movement Ledger Recording
   * 4. Double-Entry Journal Entry Creation & Automatic Posting (Debits == Credits)
   * 5. Customer Credit Balance Update (if credit sale)
   * 6. Shift Cash Sales tracking
   * 7. Audit Log recording
   */
  public processSale(saleData: Omit<Sale, 'id' | 'invoiceNumber'> & { customInvoiceNumber?: string }): { success: boolean; sale?: Sale; error?: string } {
    // 1. Idempotency Check
    if (saleData.idempotencyKey) {
      const existing = this.state.sales.find((s) => s.idempotencyKey === saleData.idempotencyKey);
      if (existing) {
        return { success: true, sale: existing };
      }
    }

    const warehouseId = saleData.warehouseId;
    const branch = this.state.branches.find((b) => b.id === saleData.branchId) || this.state.branches[0];

    // 2. Validate Stock
    if (!this.state.company.allowNegativeStock) {
      for (const item of saleData.items) {
        const stock = this.state.stockLevels.find((s) => s.productId === item.productId && s.warehouseId === warehouseId);
        const currentQty = stock ? stock.quantityOnHand : 0;
        if (currentQty < item.quantity) {
          return {
            success: false,
            error: `Insufficient stock for "${item.name}" in selected warehouse. Available: ${currentQty}, Required: ${item.quantity}`,
          };
        }
      }
    }

    // 3. Generate Sequential Unique Invoice Number
    const count = this.state.sales.filter((s) => s.branchId === saleData.branchId).length + 1;
    const padded = String(count).padStart(5, '0');
    const invoiceNumber = saleData.customInvoiceNumber || `${branch.invoicePrefix}2026-${padded}`;
    const saleId = `SALE-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const sale: Sale = {
      ...saleData,
      id: saleId,
      invoiceNumber,
    };

    // 4. Deduct Stock and create immutable movements
    let totalCostOfGoods = 0;
    const nowIso = new Date().toISOString();
    const warehouse = this.state.warehouses.find((w) => w.id === warehouseId);
    const warehouseName = warehouse ? warehouse.name : 'Store Warehouse';

    for (const item of sale.items) {
      const lineCost = mul(item.costPrice, item.quantity, 3);
      totalCostOfGoods = add(totalCostOfGoods, lineCost, 3);

      let stock = this.state.stockLevels.find((s) => s.productId === item.productId && s.warehouseId === warehouseId);
      if (!stock) {
        stock = {
          id: `STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: item.productId,
          warehouseId,
          quantityOnHand: 0,
          quantityReserved: 0,
          lastUpdated: nowIso,
        };
        this.state.stockLevels.push(stock);
      }

      stock.quantityOnHand = sub(stock.quantityOnHand, item.quantity, 3);
      stock.lastUpdated = nowIso;

      // Add movement
      const movement: InventoryMovement = {
        id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: nowIso,
        productId: item.productId,
        productName: item.name,
        warehouseId,
        warehouseName,
        movementType: 'SALE',
        quantity: -item.quantity,
        unitCost: item.costPrice,
        totalCost: lineCost,
        referenceType: 'SALE',
        referenceId: sale.id,
        performedBy: sale.cashierName,
        notes: `POS Sale Invoice ${sale.invoiceNumber}`,
      };
      this.state.inventoryMovements.unshift(movement);
    }

    // 5. Build Balanced Double-Entry Journal Entry
    const journalEntry = buildSaleJournalEntry(sale, totalCostOfGoods, 3);
    this.state.journalEntries.unshift(journalEntry);

    // Update account balances
    for (const line of journalEntry.lines) {
      const acc = this.state.accounts.find((a) => a.code === line.accountCode);
      if (acc) {
        if (acc.normalBalance === 'DEBIT') {
          acc.balance = add(acc.balance, sub(line.debit, line.credit, 3), 3);
        } else {
          acc.balance = add(acc.balance, sub(line.credit, line.debit, 3), 3);
        }
      }
    }

    // 6. Update Customer Balance if credit sale
    const creditPayment = sale.payments.find((p) => p.method === 'CUSTOMER_CREDIT');
    if (creditPayment && sale.customerId) {
      const customer = this.state.customers.find((c) => c.id === sale.customerId);
      if (customer) {
        customer.currentBalance = add(customer.currentBalance, creditPayment.amount, 3);
      }
    }

    // 7. Update Active Shift totals
    if (this.state.activeShift && this.state.activeShift.status === 'OPEN') {
      const cashPay = sale.payments.find((p) => p.method === 'CASH')?.amount || 0;
      const cardPay = sale.payments.find((p) => p.method === 'CARD')?.amount || 0;
      this.state.activeShift.cashSalesTotal = add(this.state.activeShift.cashSalesTotal, cashPay, 3);
      this.state.activeShift.cardSalesTotal = add(this.state.activeShift.cardSalesTotal, cardPay, 3);
      this.state.activeShift.expectedCash = add(this.state.activeShift.expectedCash, cashPay, 3);
    }

    // 8. Add Sale to database
    this.state.sales.unshift(sale);

    // 9. Audit log
    this.logAudit(
      sale.cashierId,
      sale.cashierName,
      'SALE_COMPLETED',
      'POS',
      `Processed Invoice ${sale.invoiceNumber} for ${sale.customerName} - Grand Total: ${sale.grandTotal} OMR`
    );

    this.saveAndNotify();
    return { success: true, sale };
  }

  /**
   * Process a Return / Refund against an existing sale:
   * 1. Reinstates inventory into the specified warehouse
   * 2. Posts balanced reversing accounting entries
   * 3. Updates customer or cash balance
   */
  public processRefund(saleId: string, reason: string): { success: boolean; error?: string } {
    const sale = this.state.sales.find((s) => s.id === saleId);
    if (!sale) return { success: false, error: 'Sale record not found' };
    if (sale.status === 'REFUNDED') return { success: false, error: 'Sale is already refunded' };

    const nowIso = new Date().toISOString();
    let totalCostOfGoods = 0;

    // Reinstate stock
    for (const item of sale.items) {
      const lineCost = mul(item.costPrice, item.quantity, 3);
      totalCostOfGoods = add(totalCostOfGoods, lineCost, 3);

      const stock = this.state.stockLevels.find((s) => s.productId === item.productId && s.warehouseId === sale.warehouseId);
      if (stock) {
        stock.quantityOnHand = add(stock.quantityOnHand, item.quantity, 3);
        stock.lastUpdated = nowIso;
      }

      const movement: InventoryMovement = {
        id: `MOV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: nowIso,
        productId: item.productId,
        productName: item.name,
        warehouseId: sale.warehouseId,
        warehouseName: 'Store Warehouse',
        movementType: 'SALE_RETURN',
        quantity: item.quantity,
        unitCost: item.costPrice,
        totalCost: lineCost,
        referenceType: 'RETURN',
        referenceId: sale.id,
        performedBy: this.state.currentUser.fullName,
        notes: `Refund for Invoice ${sale.invoiceNumber}: ${reason}`,
      };
      this.state.inventoryMovements.unshift(movement);
    }

    // Build reversing balanced journal entry
    const journalEntry = buildRefundJournalEntry(sale, totalCostOfGoods, 3);
    this.state.journalEntries.unshift(journalEntry);

    // Update account balances
    for (const line of journalEntry.lines) {
      const acc = this.state.accounts.find((a) => a.code === line.accountCode);
      if (acc) {
        if (acc.normalBalance === 'DEBIT') {
          acc.balance = add(acc.balance, sub(line.debit, line.credit, 3), 3);
        } else {
          acc.balance = add(acc.balance, sub(line.credit, line.debit, 3), 3);
        }
      }
    }

    // Reverse customer balance if credit sale
    const creditPayment = sale.payments.find((p) => p.method === 'CUSTOMER_CREDIT');
    if (creditPayment && sale.customerId) {
      const customer = this.state.customers.find((c) => c.id === sale.customerId);
      if (customer) {
        customer.currentBalance = Math.max(0, sub(customer.currentBalance, creditPayment.amount, 3));
      }
    }

    // Reverse cash shift if cash refund
    const cashPay = sale.payments.find((p) => p.method === 'CASH')?.amount || 0;
    if (cashPay > 0 && this.state.activeShift && this.state.activeShift.status === 'OPEN') {
      this.state.activeShift.expectedCash = sub(this.state.activeShift.expectedCash, cashPay, 3);
    }

    sale.status = 'REFUNDED';
    sale.refundedAmount = sale.grandTotal;
    sale.notes = `Refunded: ${reason}`;

    this.logAudit(
      this.state.currentUser.id,
      this.state.currentUser.fullName,
      'SALE_REFUNDED',
      'POS',
      `Refunded Invoice ${sale.invoiceNumber} (${sale.grandTotal} OMR) - Reason: ${reason}`
    );

    this.saveAndNotify();
    return { success: true };
  }

  /**
   * Cash Register Shift Management
   */
  public openShift(registerId: string, openingCash: number, notes?: string): CashShift {
    const shift: CashShift = {
      id: `SHIFT-${Date.now()}`,
      registerId,
      branchId: this.state.activeBranchId,
      cashierId: this.state.currentUser.id,
      cashierName: this.state.currentUser.fullName,
      openedAt: new Date().toISOString(),
      openingCash: round(openingCash, 3),
      expectedCash: round(openingCash, 3),
      cashSalesTotal: 0,
      cardSalesTotal: 0,
      status: 'OPEN',
      notes: notes || 'Register shift opened',
    };
    this.state.activeShift = shift;
    this.logAudit(this.state.currentUser.id, this.state.currentUser.fullName, 'SHIFT_OPEN', 'POS', `Opened shift on register ${registerId} with float ${openingCash} OMR`);
    this.saveAndNotify();
    return shift;
  }

  public closeShift(countedCash: number, notes?: string): { success: boolean; shift?: CashShift; discrepancy: number } {
    if (!this.state.activeShift) return { success: false, discrepancy: 0 };
    const counted = round(countedCash, 3);
    const expected = round(this.state.activeShift.expectedCash, 3);
    const discrepancy = sub(counted, expected, 3);

    this.state.activeShift.closedAt = new Date().toISOString();
    this.state.activeShift.countedCash = counted;
    this.state.activeShift.discrepancy = discrepancy;
    this.state.activeShift.status = 'CLOSED';
    this.state.activeShift.notes = notes || (discrepancy === 0 ? 'Exact balance reconciled' : `Discrepancy: ${discrepancy} OMR`);

    this.logAudit(
      this.state.currentUser.id,
      this.state.currentUser.fullName,
      'SHIFT_CLOSE',
      'POS',
      `Closed shift. Counted: ${counted} OMR, Expected: ${expected} OMR, Discrepancy: ${discrepancy} OMR`
    );

    const closed = { ...this.state.activeShift };
    this.state.activeShift = null;
    this.saveAndNotify();
    return { success: true, shift: closed, discrepancy };
  }

  /**
   * Stock Transfer 4-Stage Lifecycle:
   * 1. REQUESTED
   * 2. APPROVED
   * 3. DISPATCHED (decrements source warehouse, puts in transit)
   * 4. RECEIVED (increments dest warehouse, marks complete)
   */
  public createTransfer(
    sourceBranchId: string,
    sourceWarehouseId: string,
    destBranchId: string,
    destWarehouseId: string,
    items: { productId: string; productName: string; quantity: number; unitCost: number }[],
    notes?: string
  ): StockTransfer {
    const transferNumber = `TRF-2026-${String(this.state.transfers.length + 1).padStart(4, '0')}`;
    const transfer: StockTransfer = {
      id: `TRF-${Date.now()}`,
      transferNumber,
      sourceBranchId,
      sourceWarehouseId,
      destBranchId,
      destWarehouseId,
      status: 'REQUESTED',
      requestedBy: this.state.currentUser.fullName,
      createdAt: new Date().toISOString(),
      items,
      notes,
    };
    this.state.transfers.unshift(transfer);
    this.logAudit(this.state.currentUser.id, this.state.currentUser.fullName, 'TRANSFER_REQUESTED', 'INVENTORY', `Requested stock transfer ${transferNumber}`);
    this.saveAndNotify();
    return transfer;
  }

  public updateTransferStatus(transferId: string, nextStatus: 'APPROVED' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED'): { success: boolean; error?: string } {
    const trf = this.state.transfers.find((t) => t.id === transferId);
    if (!trf) return { success: false, error: 'Transfer not found' };

    const nowIso = new Date().toISOString();
    const user = this.state.currentUser.fullName;

    if (nextStatus === 'APPROVED') {
      trf.status = 'APPROVED';
      trf.approvedBy = user;
    } else if (nextStatus === 'DISPATCHED') {
      // Validate sufficient stock at source warehouse
      for (const item of trf.items) {
        const stock = this.state.stockLevels.find((s) => s.productId === item.productId && s.warehouseId === trf.sourceWarehouseId);
        if (!stock || stock.quantityOnHand < item.quantity) {
          return { success: false, error: `Insufficient stock for ${item.productName} in source warehouse` };
        }
      }

      // Deduct from source warehouse
      for (const item of trf.items) {
        const stock = this.state.stockLevels.find((s) => s.productId === item.productId && s.warehouseId === trf.sourceWarehouseId)!;
        stock.quantityOnHand = sub(stock.quantityOnHand, item.quantity, 3);
        stock.lastUpdated = nowIso;

        this.state.inventoryMovements.unshift({
          id: `MOV-TRF-OUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: nowIso,
          productId: item.productId,
          productName: item.productName,
          warehouseId: trf.sourceWarehouseId,
          warehouseName: 'Source Warehouse',
          movementType: 'TRANSFER_OUT',
          quantity: -item.quantity,
          unitCost: item.unitCost,
          totalCost: mul(item.unitCost, item.quantity, 3),
          referenceType: 'TRANSFER',
          referenceId: trf.id,
          performedBy: user,
          notes: `Dispatched in Transfer ${trf.transferNumber}`,
        });
      }
      trf.status = 'DISPATCHED';
      trf.dispatchedBy = user;
      trf.dispatchedAt = nowIso;
    } else if (nextStatus === 'RECEIVED') {
      // Add to destination warehouse
      for (const item of trf.items) {
        let stock = this.state.stockLevels.find((s) => s.productId === item.productId && s.warehouseId === trf.destWarehouseId);
        if (!stock) {
          stock = {
            id: `STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            productId: item.productId,
            warehouseId: trf.destWarehouseId,
            quantityOnHand: 0,
            quantityReserved: 0,
            lastUpdated: nowIso,
          };
          this.state.stockLevels.push(stock);
        }
        stock.quantityOnHand = add(stock.quantityOnHand, item.quantity, 3);
        stock.lastUpdated = nowIso;

        this.state.inventoryMovements.unshift({
          id: `MOV-TRF-IN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          timestamp: nowIso,
          productId: item.productId,
          productName: item.productName,
          warehouseId: trf.destWarehouseId,
          warehouseName: 'Destination Warehouse',
          movementType: 'TRANSFER_IN',
          quantity: item.quantity,
          unitCost: item.unitCost,
          totalCost: mul(item.unitCost, item.quantity, 3),
          referenceType: 'TRANSFER',
          referenceId: trf.id,
          performedBy: user,
          notes: `Received from Transfer ${trf.transferNumber}`,
        });
      }
      trf.status = 'RECEIVED';
      trf.receivedBy = user;
      trf.receivedAt = nowIso;
    } else if (nextStatus === 'CANCELLED') {
      trf.status = 'CANCELLED';
    }

    this.logAudit(this.state.currentUser.id, user, 'TRANSFER_STATUS_UPDATE', 'INVENTORY', `Updated Transfer ${trf.transferNumber} status to ${nextStatus}`);
    this.saveAndNotify();
    return { success: true };
  }

  /**
   * Confirm Goods Receipt Note (GRN) from a Purchase Order:
   * Rule: Stock only increments when GRN is confirmed, NEVER on PO creation.
   */
  public confirmGoodsReceipt(
    poId: string,
    warehouseId: string,
    receivedItems: { productId: string; productName: string; quantityReceived: number; unitCost: number }[],
    notes?: string
  ): { success: boolean; grn?: GoodsReceipt; error?: string } {
    const po = this.state.purchaseOrders.find((p) => p.id === poId);
    if (!po) return { success: false, error: 'Purchase Order not found' };

    const nowIso = new Date().toISOString();
    const grnNumber = `GRN-2026-${String(this.state.goodsReceipts.length + 1).padStart(4, '0')}`;
    const user = this.state.currentUser.fullName;

    const grn: GoodsReceipt = {
      id: `GRN-${Date.now()}`,
      grnNumber,
      purchaseOrderId: po.id,
      supplierId: po.supplierId,
      supplierName: po.supplierName,
      warehouseId,
      receivedDate: nowIso.split('T')[0],
      receivedBy: user,
      items: receivedItems.map((it) => {
        const poItem = po.items.find((p) => p.productId === it.productId);
        return {
          productId: it.productId,
          productName: it.productName,
          quantityOrdered: poItem ? poItem.quantity : it.quantityReceived,
          quantityReceived: it.quantityReceived,
          unitCost: it.unitCost,
        };
      }),
      notes,
    };

    // Increment inventory & log movements
    for (const item of grn.items) {
      if (item.quantityReceived <= 0) continue;

      let stock = this.state.stockLevels.find((s) => s.productId === item.productId && s.warehouseId === warehouseId);
      if (!stock) {
        stock = {
          id: `STK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          productId: item.productId,
          warehouseId,
          quantityOnHand: 0,
          quantityReserved: 0,
          lastUpdated: nowIso,
        };
        this.state.stockLevels.push(stock);
      }
      stock.quantityOnHand = add(stock.quantityOnHand, item.quantityReceived, 3);
      stock.lastUpdated = nowIso;

      this.state.inventoryMovements.unshift({
        id: `MOV-GRN-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: nowIso,
        productId: item.productId,
        productName: item.productName,
        warehouseId,
        warehouseName: 'Warehouse',
        movementType: 'PURCHASE_RECEIPT',
        quantity: item.quantityReceived,
        unitCost: item.unitCost,
        totalCost: mul(item.unitCost, item.quantityReceived, 3),
        referenceType: 'PURCHASE',
        referenceId: grn.id,
        performedBy: user,
        notes: `Received via ${grn.grnNumber} against PO ${po.poNumber}`,
      });
    }

    // Post balanced accounting entry
    const branchId = po.branchId || this.state.activeBranchId;
    const journalEntry = buildGoodsReceiptJournalEntry(grn, po, branchId, 3);
    this.state.journalEntries.unshift(journalEntry);

    // Update Accounts Payable balance for Supplier
    const supplier = this.state.suppliers.find((s) => s.id === po.supplierId);
    if (supplier) {
      supplier.currentBalance = add(supplier.currentBalance, journalEntry.totalCredit, 3);
    }

    // Mark PO received
    po.status = 'RECEIVED';
    this.state.goodsReceipts.unshift(grn);

    this.logAudit(this.state.currentUser.id, user, 'GRN_CONFIRMED', 'PURCHASING', `Confirmed Goods Receipt ${grn.grnNumber} for PO ${po.poNumber}`);
    this.saveAndNotify();
    return { success: true, grn };
  }

  /**
   * Hold & Resume Sales in POS
   */
  public holdSale(cartItems: any[], customerId: string, note?: string): string {
    const id = `HOLD-${Date.now()}`;
    this.state.heldSales.push({
      id,
      branchId: this.state.activeBranchId,
      date: new Date().toISOString(),
      items: cartItems,
      customerId,
      note: note || `Held by ${this.state.currentUser.fullName}`,
    });
    this.saveAndNotify();
    return id;
  }

  public resumeHeldSale(holdId: string) {
    const index = this.state.heldSales.findIndex((h) => h.id === holdId);
    if (index !== -1) {
      const held = this.state.heldSales[index];
      this.state.heldSales.splice(index, 1);
      this.saveAndNotify();
      return held;
    }
    return null;
  }

  /**
   * Product Management
   */
  public upsertProduct(product: Product, initialStockMuscat: number = 0, initialStockSalalah: number = 0) {
    const index = this.state.products.findIndex((p) => p.id === product.id);
    const nowIso = new Date().toISOString();

    if (index >= 0) {
      this.state.products[index] = product;
    } else {
      this.state.products.push(product);
      // Create stock records
      if (initialStockMuscat > 0) {
        this.state.stockLevels.push({
          id: `STK-${Date.now()}-1`,
          productId: product.id,
          warehouseId: 'WH-MCT-MAIN',
          quantityOnHand: initialStockMuscat,
          quantityReserved: 0,
          lastUpdated: nowIso,
        });
      }
      if (initialStockSalalah > 0) {
        this.state.stockLevels.push({
          id: `STK-${Date.now()}-2`,
          productId: product.id,
          warehouseId: 'WH-SAL-STORE',
          quantityOnHand: initialStockSalalah,
          quantityReserved: 0,
          lastUpdated: nowIso,
        });
      }
    }
    this.saveAndNotify();
  }

  /**
   * Stock Adjustment (manual count correction with audit)
   */
  public adjustStock(productId: string, warehouseId: string, newQuantity: number, reason: string): { success: boolean } {
    const product = this.state.products.find((p) => p.id === productId);
    let stock = this.state.stockLevels.find((s) => s.productId === productId && s.warehouseId === warehouseId);
    const nowIso = new Date().toISOString();

    if (!stock) {
      stock = {
        id: `STK-${Date.now()}`,
        productId,
        warehouseId,
        quantityOnHand: 0,
        quantityReserved: 0,
        lastUpdated: nowIso,
      };
      this.state.stockLevels.push(stock);
    }

    const diff = sub(newQuantity, stock.quantityOnHand, 3);
    if (diff === 0) return { success: true };

    const movementType = diff > 0 ? 'ADJUSTMENT_ADD' : 'ADJUSTMENT_SUB';
    stock.quantityOnHand = newQuantity;
    stock.lastUpdated = nowIso;

    this.state.inventoryMovements.unshift({
      id: `MOV-ADJ-${Date.now()}`,
      timestamp: nowIso,
      productId,
      productName: product ? product.name : 'Unknown Product',
      warehouseId,
      warehouseName: 'Warehouse',
      movementType,
      quantity: diff,
      unitCost: product ? product.costPrice : 0,
      totalCost: mul(product ? product.costPrice : 0, Math.abs(diff), 3),
      referenceType: 'ADJUSTMENT',
      referenceId: `ADJ-${Date.now()}`,
      performedBy: this.state.currentUser.fullName,
      notes: reason,
    });

    this.logAudit(this.state.currentUser.id, this.state.currentUser.fullName, 'STOCK_ADJUSTED', 'INVENTORY', `Adjusted stock for ${product?.name}: diff ${diff} (${reason})`);
    this.saveAndNotify();
    return { success: true };
  }

  /**
   * Update Settings
   */
  public updateInvoiceSettings(settings: InvoiceSettings) {
    this.state.invoiceSettings = { ...settings };
    this.saveAndNotify();
  }

  public updateCompany(company: Company) {
    this.state.company = { ...company };
    this.saveAndNotify();
  }

  /**
   * Manual Journal Entry Posting
   */
  public postManualJournalEntry(lines: { accountCode: string; debit: number; credit: number; memo?: string }[], description: string): { success: boolean; error?: string } {
    const totalDebit = lines.reduce((acc, l) => add(acc, l.debit || 0, 3), 0);
    const totalCredit = lines.reduce((acc, l) => add(acc, l.credit || 0, 3), 0);
    if (Math.abs(sub(totalDebit, totalCredit, 3)) > 0.001) {
      return { success: false, error: 'Debits and Credits must balance!' };
    }

    const journalLines = lines.map((l) => {
      const acc = this.state.accounts.find((a) => a.code === l.accountCode);
      return {
        accountCode: l.accountCode,
        accountName: acc ? acc.name : l.accountCode,
        debit: round(l.debit || 0, 3),
        credit: round(l.credit || 0, 3),
        memo: l.memo,
      };
    });

    const entryNumber = `JE-MAN-2026-${String(this.state.journalEntries.length + 1).padStart(4, '0')}`;
    const entry: JournalEntry = {
      id: `JE-MAN-${Date.now()}`,
      entryNumber,
      date: new Date().toISOString(),
      referenceType: 'MANUAL',
      referenceId: `MAN-${Date.now()}`,
      description,
      branchId: this.state.activeBranchId,
      lines: journalLines,
      totalDebit,
      totalCredit,
      isBalanced: true,
      status: 'POSTED',
      postedBy: this.state.currentUser.fullName,
      postedAt: new Date().toISOString(),
    };

    // Update balances
    for (const l of journalLines) {
      const acc = this.state.accounts.find((a) => a.code === l.accountCode);
      if (acc) {
        if (acc.normalBalance === 'DEBIT') {
          acc.balance = add(acc.balance, sub(l.debit, l.credit, 3), 3);
        } else {
          acc.balance = add(acc.balance, sub(l.credit, l.debit, 3), 3);
        }
      }
    }

    this.state.journalEntries.unshift(entry);
    this.logAudit(this.state.currentUser.id, this.state.currentUser.fullName, 'JOURNAL_POSTED', 'ACCOUNTING', `Posted manual journal entry ${entryNumber}: ${description}`);
    this.saveAndNotify();
    return { success: true };
  }

  /**
   * System Reset to Factory / Clean Seed
   */
  public resetToDefault() {
    this.state = JSON.parse(JSON.stringify(INITIAL_DATABASE));
    this.saveAndNotify();
  }

  /**
   * Full Database JSON Export
   */
  public exportBackup(): string {
    return JSON.stringify(
      {
        version: '2.0',
        system: 'RogueByte POS & ERP',
        exportedAt: new Date().toISOString(),
        data: this.state,
      },
      null,
      2
    );
  }

  /**
   * Verified Database JSON Restore
   */
  public restoreBackup(jsonString: string): { success: boolean; error?: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed.data || !parsed.data.company || !Array.isArray(parsed.data.branches) || !Array.isArray(parsed.data.products)) {
        return { success: false, error: 'Invalid backup file structure: missing critical schema tables.' };
      }
      this.state = { ...INITIAL_DATABASE, ...parsed.data };
      this.saveAndNotify();
      this.logAudit('SYS', 'System', 'BACKUP_RESTORED', 'SYSTEM', 'Database restored and verified successfully from backup file');
      return { success: true };
    } catch (e: any) {
      return { success: false, error: `JSON Parse Error: ${e.message}` };
    }
  }
}

export const dbManager = new DatabaseManager();
