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

### 7. Running locally

- **Backend**
  - `cd backend`
  - `npm install` (first time)
  - `npm run dev` (starts Express API on port 4000 by default)
- **Frontend**
  - `cd frontend`
  - `npm install` (first time)
  - Set `NEXT_PUBLIC_API_BASE=http://localhost:4000` in a `.env.local` file if you change the backend URL.
  - `npm run dev` (starts NextJS app on port 3000 by default)

Open `http://localhost:3000` to use the inventory dashboard.

---

### 8. Deployment Guide

#### Backend Deployment (Render.com - Recommended)

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy on Render**
   - Go to [render.com](https://render.com) and sign up/login
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` folder (or set Root Directory to `backend`)
   - Configure:
     - **Name**: `insyd-backend` (or any name)
     - **Environment**: `Node`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`
   - Add Environment Variable: `PORT=10000` (Render sets this automatically)
   - Click "Create Web Service"
   - Wait for deployment (2-3 minutes)
   - Copy the service URL (e.g., `https://insyd-backend.onrender.com`)

#### Frontend Deployment (Vercel - Recommended)

1. **Prepare environment variable**
   - Create `frontend/.env.production` (or set in Vercel dashboard):
     ```
     NEXT_PUBLIC_API_BASE=https://your-backend-url.onrender.com
     ```

2. **Deploy on Vercel**
   - Go to [vercel.com](https://vercel.com) and sign up/login
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Next.js (auto-detected)
     - **Root Directory**: `frontend`
     - **Build Command**: `npm run build` (default)
     - **Output Directory**: `.next` (default)
   - Add Environment Variable:
     - Key: `NEXT_PUBLIC_API_BASE`
     - Value: `https://your-backend-url.onrender.com` (use your actual backend URL)
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)
   - Copy the deployment URL (e.g., `https://insyd-frontend.vercel.app`)

#### Alternative: Railway (Backend)

1. Go to [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Select your repository
4. Railway auto-detects Node.js
5. Set Root Directory to `backend`
6. Add Environment Variable: `PORT` (Railway sets this automatically)
7. Deploy

#### Alternative: Netlify (Frontend)

1. Go to [netlify.com](https://netlify.com)
2. Add new site → Import from Git
3. Select repository
4. Configure:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/.next`
5. Add Environment Variable: `NEXT_PUBLIC_API_BASE`
6. Deploy

#### Post-Deployment Checklist

- [ ] Backend is accessible (test `https://your-backend.onrender.com/api/health`)
- [ ] Frontend environment variable points to backend URL
- [ ] CORS is enabled on backend (already configured)
- [ ] Test full workflow: add item → record movement → check metrics

**Note**: Since this uses in-memory storage, data resets on backend restart. For production, you'd need to add a database (PostgreSQL/MongoDB).

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
