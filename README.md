## Insyd AEC Inventory Assignment – Option 1 (Inventory)

### 1. Business context & key problems

Assume a mid-sized tile & sanitaryware distributor in India supplying 50–100 projects/month. They stock ~3,000 SKUs across tiles, sanitary fittings, adhesives and accessories, with a mix of fast-moving and long-tail items. Today, inventory is tracked in spreadsheets and WhatsApp, with periodic manual stock counts.

**Observed problems**
- **Dead and slow-moving inventory**: Old designs and odd sizes sit for months because there is no ageing view or reorder discipline.
- **Stockouts of fast movers**: Sales team “promises” items to architects/contractors without a live stock view, leading to lost orders or emergency procurement.
- **Damages and location mismatches**: Material is stored in multiple godowns; cartons get damaged or misplaced, and physical counts rarely match records.
- **Low management visibility**: Owner doesn’t have a daily/weekly view of stock health, blocked capital, or which SKUs to push/clear.

### 2. Root causes

- **No single source of truth for stock**: Data lives in Tally, Excel, WhatsApp and people’s memory; none is real-time.
- **Process gaps**: GRN (goods receipt), issues to site, returns and damages are not standardized; same SKU is described differently by different people.
- **No SKU-level performance insight**: No ABC analysis, ageing, or margin view per SKU → buying and stocking decisions are gut-driven.
- **Tech that doesn’t fit workflows**: Existing tools (Tally/ERPs) are not optimised for AEC material operations (project/site-wise tracking, design-variant handling, etc.).

### 3. Solution approach (tech + process)

**3.1 Process foundations (non-tech)**
- **Standardize item master**: Define SKU codes, units (boxes, sq.ft, pieces), pack sizes and locations; freeze a single naming convention.
- **Simple stock movement slips**: Paper/WhatsApp forms for:
  - GRN (inward from vendor)
  - Issue to project/site
  - Return from site
  - Damage/adjustment
- **Cycle counting discipline**: Weekly counts of high-value/high-movement SKUs instead of one massive annual audit.

**3.2 Tech foundations**
- **Central inventory service**:
  - Item master with current stock per location.
  - Transaction ledger (inward, outward, adjustment) with timestamps and references (PO, project, reason).
- **Basic analytics on top of clean data**:
  - ABC classification (based on movement or value).
  - Ageing by SKU and by vendor.
  - Simple alerts: low stock, long-stagnant stock.
- **Lightweight UX for adoption**:
  - Web-based UI that works on laptop and mobile.
  - Minimal fields required at each step.

### 4. Concrete problems addressed by this implementation

In this assignment, the implemented system focuses on **making inventory levels visible and trustworthy** without over-engineering:

- **Problem A – No live stock visibility**
  - **Fix**: Item list with current stock, filter/search by SKU, and clear units.
- **Problem B – Unrecorded stock movements**
  - **Fix**: Simple endpoints and UI to record purchases (inward) and issues (outward), automatically adjusting stock.
- **Problem C – Lack of accountability on adjustments**
  - **Fix**: Every stock change is saved as a transaction with a type (`purchase`, `issue`, `adjustment`) and an optional note.

The system is intentionally built with in-memory data for the assignment, but structured as if it would later plug into a database (PostgreSQL/MySQL) and an auth layer.

### 5. System design (NextJS + ExpressJS)

**High-level architecture**
- **Backend (`backend` – ExpressJS)**:
  - Exposes REST APIs under `/api`:
    - `GET /api/items` – list all items with current stock.
    - `POST /api/items` – create a new item.
    - `POST /api/transactions/purchase` – record purchase/inward.
    - `POST /api/transactions/issue` – record issue/outward.
  - Maintains:
    - `items` store: basic fields like `id`, `name`, `sku`, `unit`, `stock`.
    - `transactions` store: `id`, `itemId`, `type`, `quantity`, `note`, `timestamp`.
- **Frontend (`frontend` – NextJS)**:
  - Simple dashboard page:
    - Table of items and current stock.
    - Form to add new items.
    - Quick forms to record purchase/issue for a selected SKU.

**Assumptions**
- One company, single warehouse (locations can be added later as another dimension).
- No user authentication for this assignment; in production, roles (admin, store, sales) would be required.
- In-memory storage is sufficient to demonstrate flows; in production this would be replaced by a relational DB.

### 6. How this helps an AEC material business scale

- **Reduces dead inventory**: Visibility on slow-moving SKUs (via movement history and stock levels) enables discounting or bundling decisions.
- **Prevents stockouts of winners**: Sales/planning can see current stock and recent issues, making better commitment decisions to architects and contractors.
- **Improves trust in numbers**: Clear, simple flows for every stock movement make it easier to align physical and system stock in cycle counts.
- **Scales with more projects and locations**: As projects and warehouses grow, this central inventory service can be extended with multi-location stock, project tagging and integration with accounting tools.

This document pairs with the implementation in `backend` (ExpressJS API) and `frontend` (NextJS dashboard) to demonstrate one coherent, minimal but meaningful slice of an inventory system for AEC material businesses.

---

### 9. How this implementation maps to the InvenSight concept

**Central Inventory Dashboard**
- Implemented by the main Next.js page:
  - View all SKUs with live stock.
  - Add new SKUs.
  - Record purchases, issues and damage.

**SKU Performance Scoring**
- Express backend computes per-SKU metrics over a recent window:
  - `avgDailySales`, `daysOfInventory`, `damageRate`, `healthStatus`.
- Frontend shows:
  - Health + reorder hints in the **Current stock** table.
  - A separate **SKU health & analytics** table sorted by health.

**Smart Reorder Recommendation**
- Backend logic:
  - If `currentStock < avgDailySales × leadTime`, `shouldReorder = true`.
  - Reorder quantity based on `avgDailySales × (leadTime + bufferDays) − currentStock`.
- Frontend displays this as plain text: `Reorder X` or `OK`.

**Damage & Wastage Logging**
- Dedicated API `POST /api/transactions/damage`.
- UI option **“Damage / wastage”** in the stock movement form.
- Damage is included when computing `damageRate` in analytics.

**Assumptions**
- Single warehouse, in-memory storage, no authentication.
- Movements are recorded manually via the UI (no IoT, no external integrations).

This gives a thin but coherent slice of the proposed **InvenSight – Simple Inventory Intelligence Platform**, focused on visibility, SKU health, reorder guidance and damage logging.
