# RogueByte POS & ERP
### Complete Multi-Branch Point of Sale, Double-Entry Accounting, Inventory Ledger & Business Management System

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production%20Ready-emerald)]()
[![Precision](https://img.shields.io/badge/Currency-OMR%20(3%20Decimals)-amber)]()
[![Accounting](https://img.shields.io/badge/Engine-Perpetual%20Double--Entry-blue)]()
[![Tax](https://img.shields.io/badge/VAT-Oman%205%25%20Standard-purple)]()
[![Website](https://img.shields.io/badge/Website-roguebyte.online-059669)](https://roguebyte.online/)
[![GitHub](https://img.shields.io/badge/GitHub-RogueByteOfficial-181717?logo=github)](https://github.com/RogueByteOfficial)
[![Support](https://img.shields.io/badge/Ko--fi-Support%20RogueByte-FF5E5B)](https://ko-fi.com/roguebyte)

RogueByte POS & ERP is a complete, production-grade enterprise business management system combining high-speed retail Point of Sale (POS), immutable perpetual inventory ledger, multi-branch and multi-warehouse control, goods receipts, and a strict double-entry financial accounting engine.

---

## 📜 Project Attribution & Provenance

- **Original Project**: POS ERP
- **Original Developer**: Fares Sid Ahmed (Sido)
- **Brand**: RogueByte
- **Official Website**: [https://roguebyte.online/](https://roguebyte.online/)
- **GitHub Organization**: [https://github.com/RogueByteOfficial](https://github.com/RogueByteOfficial)
- **Original Repository URL**: [https://github.com/RogueByteOfficial/RogueByte-POS-ERP](https://github.com/RogueByteOfficial/RogueByte-POS-ERP)
- **Marketing Director**: Mouahdi Adel

### 📬 Direct Communications & Inquiries
- **General Contact**: [contact@roguebyte.online](mailto:contact@roguebyte.online)
- **Support & Help / استفسارات**: [help@roguebyte.online](mailto:help@roguebyte.online)
- **Business & Partnerships**: [business@roguebyte.online](mailto:business@roguebyte.online)
- **Donations & Support**: [https://ko-fi.com/roguebyte](https://ko-fi.com/roguebyte)

---

## 1. System Architecture & Modules

### Point of Sale (POS) & Cashier Drawer
- **USB Barcode Scanner Integration**: Automated fast-keystroke listener buffer (sub-50ms) with audible confirmation and instant cart addition.
- **Keyboard Shortcuts**: `F2` focus product search, `F4` initiate payment modal, `F9` hold current cart.
- **Cart & Tax Engine**: Line-level discounts, cart discounts, 5.000% Oman standard VAT, tax-inclusive and tax-exclusive calculations.
- **Multiple & Split Payments**: Cash, Card, Bank Transfer, Customer Account Credit (with credit limit validation). Split payments across cash and card.
- **Change Calculation**: Real-time cash received input with Omani Rial quick-cash presets (`Exact`, `5 OMR`, `10 OMR`, `20 OMR`, `50 OMR`).
- **Hold & Resume Sales**: Multiple simultaneous held carts preserved across cashier shifts.
- **Cash Drawer & Shifts**: Shift opening float, cash sales tracking, expected vs counted cash, and automated discrepancy reporting.
- **Printable Invoices & Receipts**: 58 mm thermal receipt, 80 mm thermal receipt, and official A4 Tax Invoices with Oman / GCC compliant Base64 TLV QR codes.

### Inventory & Multi-Warehouse Management
- **Multi-Warehouse Support**: Distinct warehouses per branch (e.g. Muscat Central, Muscat Retail Floor, Salalah Store, Sohar Depository).
- **Immutable Movement Ledger**: Traceable ledger recording all stock movements (`SALE`, `SALE_RETURN`, `PURCHASE_RECEIPT`, `TRANSFER_OUT`, `TRANSFER_IN`, `ADJUSTMENT`). Historical movements are never silently edited.
- **Inter-Branch Stock Transfers**: Complete 4-stage lifecycle:
  1. `REQUESTED`
  2. `APPROVED`
  3. `DISPATCHED` (deducts source warehouse, tracks in-transit)
  4. `RECEIVED` (increments destination warehouse, marks reconciled).
- **Valuation Methods**: Weighted Average Costing and FIFO tracking.
- **Negative Stock Prevention**: Strictly enforced by default with authorized configuration overrides.
- **Stock Adjustments**: Physical inventory discrepancies audited with mandatory reason logging.

### Double-Entry Accounting Engine
- **Perpetual Balanced Posting**: Every transaction enforces $\sum \text{Debits} = \sum \text{Credits}$ before posting.
- **Standard Chart of Accounts**:
  - `1010` Cash on Hand (Asset)
  - `1020` Bank Account (Asset)
  - `1100` Accounts Receivable - Trade Debtors (Asset)
  - `1200` Merchandise Inventory Asset (Asset)
  - `2010` Accounts Payable - Trade Creditors (Liability)
  - `2100` VAT Output Payable - Sales Tax (Liability)
  - `2110` VAT Input Credit - Purchases Tax (Asset / Contra-Liability)
  - `3000` Owner Equity & Retained Capital (Equity)
  - `4000` Sales Revenue (Revenue)
  - `4010` Sales Discounts Allowed (Contra-Revenue)
  - `5000` Cost of Goods Sold - COGS (Expense)
  - `6010` Operating Expenses - Overhead (Expense)
- **Automatic Sales Journal**:
  - Debit: Cash / Bank / Accounts Receivable (Grand Total)
  - Debit: Sales Discounts Allowed (if applicable)
  - Credit: Sales Revenue (Subtotal)
  - Credit: VAT Output Payable (5% VAT)
  - Debit: Cost of Goods Sold (Total Cost)
  - Credit: Merchandise Inventory Asset (Total Cost)
- **Financial Statements**:
  - General Ledger with account-level drilldown
  - Trial Balance with live debit/credit balancing
  - Profit & Loss Statement (Gross Sales, Discounts, Net Revenue, COGS, Gross Profit, Operating Expenses, Net Operating Profit)
  - Balance Sheet ($Assets = Liabilities + Equity$).

### Purchasing & Supplier Management
- **Vendor Directory**: Contact information, VAT TRN, payment terms, Accounts Payable balances.
- **Goods Receipt Notes (GRN)**: Strict compliance rule: inventory only increases upon Goods Receipt confirmation, **never** on Purchase Order creation.
- **Automated GRN Accounting**:
  - Debit: Merchandise Inventory Asset (`1200`)
  - Debit: VAT Input Credit (`2110`)
  - Credit: Accounts Payable (`2010`).

### Multi-Branch Governance & RBAC
- **Branch Data Isolation**: Users assigned to specific branches cannot view or modify transactions belonging to another branch.
- **Granular Permissions**: Modules and actions protected by RBAC keys (`pos.sale`, `pos.discount`, `pos.refund`, `inventory.manage`, `inventory.transfer`, `accounting.post`, `settings.manage`).
- **Simulated Roles**: Super Admin, Branch Manager, Chief Accountant, Muscat Cashier, Salalah Cashier, Auditor.

---

## 2. Oman & International Configuration

- **Currency**: Omani Rial (`OMR`), formatted with 3 decimal places (`12.450 OMR`).
- **Precise Decimal Arithmetic**: Custom rounding engine eliminating JavaScript floating-point representation drift.
- **Bilingual Interface**: Arabic RTL (`dir="rtl"`) with Cairo typography and English LTR with Plus Jakarta Sans typography.
- **Electronic Invoicing (E-Invoice)**: QR Code generation compliant with standard Tag-Length-Value (TLV) Base64 encoding.

---

## 3. Installation & Local Setup (Linux / macOS / WSL2)

### Prerequisites
- Node.js 20+ or 22+ LTS
- npm 10+
- (Optional for containerization) Docker and Docker Compose

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/RogueByteOfficial/RogueByte-POS-ERP.git
cd RogueByte-POS-ERP
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

### 3. Start Development Server
```bash
npm run dev
```
Open your browser at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
npm run preview
```

### 5. Run with Docker Compose
```bash
docker-compose up --build -d
```
The application will be live on `http://localhost:3000` with an isolated PostgreSQL 16 container.

---

## 4. Automated Acceptance Test Suite

The system includes an in-app verification runner testing the 12 core acceptance criteria:
1. **Sale Decreases Inventory Correctly** (Verifies stock decrement and immutable ledger movement)
2. **Refund Reverses Stock & Posts Balancing Entries** (Restores inventory and reverses accounting)
3. **Balanced Accounting Entries** (Enforces $\sum \text{Debits} = \sum \text{Credits}$ across all journal entries)
4. **Idempotency Prevents Duplicate Retries** (Guarantees no double charge under retry)
5. **Stock Transfer Lifecycle** (4-stage update: source out, transit, destination in)
6. **RBAC Module Restriction** (Restricts non-privileged roles from financial posting)
7. **Branch Isolation** (Prohibits unauthorized cross-branch data manipulation)
8. **Cashier Permissions** (Verifies discount and refund restrictions)
9. **OMR 3-Decimal Precision** (Validates tax calculations and rounding rules)
10. **Invoice Numbering Uniqueness** (Collision-proof consecutive sequence)
11. **Report Reconciliation** (P&L and General Ledger match underlying transaction records)
12. **Backup Export & Restorative Integrity** (JSON export and validated schema restore).

To execute the test suite at any time:
Click the **"System Verification"** button in the top navigation bar.

---

## 5. Security Architecture

- **Parameterization**: All state operations go through bounded validation methods.
- **Idempotency Keys**: Network retries and double clicks on checkout do not duplicate transactions.
- **Sanitized Exports**: CSV and JSON backup outputs escape special characters.
- **Audit Trail**: High-risk actions (logins, price overrides, stock adjustments, shift reconciliations, refunds) are written to an immutable Audit Log.

---

## 6. Software License & Attribution

This project is licensed under the **MIT License**.

- Full license text and copyright terms: [`LICENSE`](LICENSE)
- Original project provenance and author attribution documentation: [`NOTICE`](NOTICE)

Under the MIT License, the original copyright notice and permission notice must be retained in copies or substantial portions of the software. The accompanying `NOTICE` file documents the project's authorship and history for attribution purposes without adding restrictions beyond the MIT License.

