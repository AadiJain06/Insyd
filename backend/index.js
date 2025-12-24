const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// In-memory data stores for assignment purposes
let items = [];
let transactions = [];
let nextItemId = 1;
let nextTxnId = 1;

// Sites / projects and material norms (for Site Usage Intelligence)
let sites = [];
let norms = []; // simple per-site, per-item expected monthly usage
let nextSiteId = 1;
let nextNormId = 1;

// Usage templates for SiteWise-style material predictors
// e.g. 1 bag cement = 12 sqft plaster -> areaPerQty = 12, unitLabel = 'sqft plaster'
let usageTemplates = [];
let nextUsageTemplateId = 1;

// Helpers
function findItem(id) {
  return items.find((it) => it.id === id);
}

// Basic SKU health + reorder logic over a recent window
const METRIC_WINDOW_DAYS = 30;
const LEAD_TIME_DAYS = 7;
const BUFFER_DAYS = 3;

function computeMetricsForItem(item) {
  const now = Date.now();
  const windowMs = METRIC_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  const itemTxns = transactions.filter((t) => t.itemId === item.id);
  const recentSales = itemTxns.filter(
    (t) =>
      t.type === 'issue' &&
      now - new Date(t.timestamp).getTime() <= windowMs,
  );
  const recentDamages = itemTxns.filter(
    (t) =>
      t.type === 'damage' &&
      now - new Date(t.timestamp).getTime() <= windowMs,
  );

  const soldQty = recentSales.reduce((sum, t) => sum + t.quantity, 0);
  const damagedQty = recentDamages.reduce((sum, t) => sum + t.quantity, 0);

  const avgDailySales =
    METRIC_WINDOW_DAYS > 0 ? soldQty / METRIC_WINDOW_DAYS : 0;

  let daysOfInventory = null;
  if (avgDailySales > 0) {
    daysOfInventory = item.stock / avgDailySales;
  }

  let healthStatus = 'unknown';
  if (avgDailySales === 0 && item.stock > 0) {
    healthStatus = 'dead';
  } else if (daysOfInventory === null) {
    healthStatus = 'neutral';
  } else if (daysOfInventory > 90) {
    healthStatus = 'dead';
  } else if (daysOfInventory > 30) {
    healthStatus = 'slow';
  } else {
    healthStatus = 'fast';
  }

  let damageRate = null;
  const totalOut = soldQty + damagedQty;
  if (totalOut > 0) {
    damageRate = damagedQty / totalOut;
  }

  const reorderPoint = avgDailySales * LEAD_TIME_DAYS;
  const shouldReorder = avgDailySales > 0 && item.stock < reorderPoint;
  let reorderQty = 0;
  if (shouldReorder) {
    const target = avgDailySales * (LEAD_TIME_DAYS + BUFFER_DAYS);
    reorderQty = Math.max(0, Math.round(target - item.stock));
  }

  return {
    avgDailySales,
    daysOfInventory,
    healthStatus, // 'dead' | 'slow' | 'fast' | 'neutral' | 'unknown'
    damageRate,
    shouldReorder,
    reorderQty,
  };
}

// Site usage / leakage metrics
function computeSiteMetrics() {
  const now = Date.now();
  const windowMs = METRIC_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // siteItemKey: `${siteId}-${itemId}`
  const usageMap = new Map();

  transactions.forEach((t) => {
    if (t.type !== 'issue_site') return;
    if (now - new Date(t.timestamp).getTime() > windowMs) return;
    const key = `${t.siteId}-${t.itemId}`;
    const current = usageMap.get(key) || 0;
    usageMap.set(key, current + t.quantity);
  });

  const results = [];

  sites.forEach((site) => {
    items.forEach((item) => {
      const key = `${site.id}-${item.id}`;
      const actualQty = usageMap.get(key) || 0;

      const norm = norms.find((n) => n.siteId === site.id && n.itemId === item.id);
      const expectedQty = norm ? norm.expectedMonthlyQty : 0;

      let deviation = null;
      if (expectedQty > 0) {
        deviation = (actualQty - expectedQty) / expectedQty;
      }

      if (expectedQty === 0 && actualQty === 0) {
        return;
      }

      results.push({
        siteId: site.id,
        siteName: site.name,
        itemId: item.id,
        itemName: item.name,
        sku: item.sku,
        expectedQty,
        actualQty,
        deviation,
      });
    });
  });

  return results;
}

// SiteWise-style usage metrics based on area completed and usage templates
function computeUsageMetrics() {
  const now = Date.now();
  const windowMs = METRIC_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  // Aggregate per site+item: total issued quantity and area completed
  const aggMap = new Map();
  transactions.forEach((t) => {
    if (t.type !== 'issue_site') return;
    if (now - new Date(t.timestamp).getTime() > windowMs) return;
    const key = `${t.siteId}-${t.itemId}`;
    const current = aggMap.get(key) || { qty: 0, area: 0 };
    current.qty += t.quantity;
    if (typeof t.areaCompleted === 'number') {
      current.area += t.areaCompleted;
    }
    aggMap.set(key, current);
  });

  const results = [];

  aggMap.forEach((value, key) => {
    const [siteIdStr, itemIdStr] = key.split('-');
    const siteId = Number(siteIdStr);
    const itemId = Number(itemIdStr);
    const site = sites.find((s) => s.id === siteId);
    const item = items.find((it) => it.id === itemId);
    if (!site || !item) return;

    const template = usageTemplates.find((t) => t.itemId === itemId);
    const actualUsed = value.qty;
    const totalArea = value.area;

    let expectedUsed = null;
    let deviation = null;

    if (template && totalArea > 0 && template.areaPerQty > 0) {
      expectedUsed = totalArea / template.areaPerQty;
      if (expectedUsed > 0) {
        deviation = (actualUsed - expectedUsed) / expectedUsed;
      }
    }

    // Only include rows where we have at least some actual or expected usage
    if (actualUsed === 0 && (expectedUsed === null || expectedUsed === 0)) {
      return;
    }

    results.push({
      siteId,
      siteName: site.name,
      itemId,
      itemName: item.name,
      sku: item.sku,
      unitLabel: template ? template.unitLabel : null,
      totalArea,
      actualUsed,
      expectedUsed,
      deviation,
    });
  });

  return results;
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// List all items with basic health + reorder metrics
app.get('/api/items', (req, res) => {
  const enriched = items.map((item) => ({
    ...item,
    metrics: computeMetricsForItem(item),
  }));
  res.json(enriched);
});

// Create a new item
app.post('/api/items', (req, res) => {
  const { name, sku, unit } = req.body || {};

  if (!name || !sku || !unit) {
    return res.status(400).json({ error: 'name, sku and unit are required' });
  }

  const exists = items.some((it) => it.sku === sku);
  if (exists) {
    return res.status(409).json({ error: 'Item with this SKU already exists' });
  }

  const newItem = {
    id: nextItemId++,
    name,
    sku,
    unit,
    stock: 0,
  };
  items.push(newItem);

  res.status(201).json(newItem);
});

// Record a purchase (inward)
app.post('/api/transactions/purchase', (req, res) => {
  const { itemId, quantity, note } = req.body || {};
  const qty = Number(quantity);

  if (!itemId || !Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'itemId and positive quantity are required' });
  }

  const item = findItem(Number(itemId));
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  item.stock += qty;

  const txn = {
    id: nextTxnId++,
    itemId: item.id,
    type: 'purchase',
    quantity: qty,
    note: note || '',
    timestamp: new Date().toISOString(),
  };
  transactions.push(txn);

  res.status(201).json({ item, transaction: txn });
});

// Record an issue (outward)
app.post('/api/transactions/issue', (req, res) => {
  const { itemId, quantity, note } = req.body || {};
  const qty = Number(quantity);

  if (!itemId || !Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'itemId and positive quantity are required' });
  }

  const item = findItem(Number(itemId));
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (item.stock < qty) {
    return res.status(400).json({ error: 'Not enough stock to issue' });
  }

  item.stock -= qty;

  const txn = {
    id: nextTxnId++,
    itemId: item.id,
    type: 'issue',
    quantity: qty,
    note: note || '',
    timestamp: new Date().toISOString(),
  };
  transactions.push(txn);

  res.status(201).json({ item, transaction: txn });
});

// Record damage / wastage (outward, marked as damage)
app.post('/api/transactions/damage', (req, res) => {
  const { itemId, quantity, note } = req.body || {};
  const qty = Number(quantity);

  if (!itemId || !Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'itemId and positive quantity are required' });
  }

  const item = findItem(Number(itemId));
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  if (item.stock < qty) {
    return res.status(400).json({ error: 'Not enough stock to mark as damage' });
  }

  item.stock -= qty;

  const txn = {
    id: nextTxnId++,
    itemId: item.id,
    type: 'damage',
    quantity: qty,
    note: note || '',
    timestamp: new Date().toISOString(),
  };
  transactions.push(txn);

  res.status(201).json({ item, transaction: txn });
});

// List transactions (optional for debugging/insight)
app.get('/api/transactions', (req, res) => {
  res.json(transactions);
});

// --- Sites & norms APIs (Site Usage Intelligence) ---

app.get('/api/sites', (req, res) => {
  res.json(sites);
});

app.post('/api/sites', (req, res) => {
  const { name } = req.body || {};
  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }
  const newSite = { id: nextSiteId++, name };
  sites.push(newSite);
  res.status(201).json(newSite);
});

app.get('/api/norms', (req, res) => {
  res.json(norms);
});

app.post('/api/norms', (req, res) => {
  const { siteId, itemId, expectedMonthlyQty } = req.body || {};
  const site = sites.find((s) => s.id === Number(siteId));
  const item = findItem(Number(itemId));
  const expected = Number(expectedMonthlyQty);

  if (!site || !item || !Number.isFinite(expected) || expected <= 0) {
    return res.status(400).json({ error: 'valid siteId, itemId and positive expectedMonthlyQty are required' });
  }

  const existing = norms.find(
    (n) => n.siteId === site.id && n.itemId === item.id,
  );
  if (existing) {
    existing.expectedMonthlyQty = expected;
    return res.json(existing);
  }

  const norm = {
    id: nextNormId++,
    siteId: site.id,
    itemId: item.id,
    expectedMonthlyQty: expected,
  };
  norms.push(norm);
  res.status(201).json(norm);
});

// Issue to site (reduces stock, tagged with siteId; can include areaCompleted for SiteWise)
app.post('/api/transactions/issueToSite', (req, res) => {
  const { itemId, siteId, quantity, areaCompleted, note } = req.body || {};
  const qty = Number(quantity);

  if (!itemId || !siteId || !Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: 'itemId, siteId and positive quantity are required' });
  }

  const item = findItem(Number(itemId));
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  const site = sites.find((s) => s.id === Number(siteId));
  if (!site) {
    return res.status(404).json({ error: 'Site not found' });
  }

  if (item.stock < qty) {
    return res.status(400).json({ error: 'Not enough stock to issue to site' });
  }

  item.stock -= qty;

  const area = areaCompleted != null ? Number(areaCompleted) : null;

  const txn = {
    id: nextTxnId++,
    itemId: item.id,
    siteId: site.id,
    type: 'issue_site',
    quantity: qty,
    areaCompleted: Number.isFinite(area) ? area : undefined,
    note: note || '',
    timestamp: new Date().toISOString(),
  };
  transactions.push(txn);

  res.status(201).json({ item, transaction: txn });
});

// Site leakage report (monthly quantity norms)
app.get('/api/sites/metrics', (req, res) => {
  const metrics = computeSiteMetrics();
  res.json(metrics);
});

// SiteWise usage report (area-based predictors)
app.get('/api/sites/usage-metrics', (req, res) => {
  const metrics = computeUsageMetrics();
  res.json(metrics);
});

// Usage templates CRUD (very simple)
app.get('/api/usage-templates', (req, res) => {
  res.json(usageTemplates);
});

app.post('/api/usage-templates', (req, res) => {
  const { itemId, areaPerQty, unitLabel, description } = req.body || {};
  const item = findItem(Number(itemId));
  const area = Number(areaPerQty);
  if (!item || !Number.isFinite(area) || area <= 0 || !unitLabel) {
    return res.status(400).json({
      error: 'valid itemId, positive areaPerQty and unitLabel are required',
    });
  }

  const existing = usageTemplates.find((t) => t.itemId === item.id);
  if (existing) {
    existing.areaPerQty = area;
    existing.unitLabel = unitLabel;
    existing.description = description || existing.description || '';
    return res.json(existing);
  }

  const tpl = {
    id: nextUsageTemplateId++,
    itemId: item.id,
    areaPerQty: area,
    unitLabel,
    description: description || '',
  };
  usageTemplates.push(tpl);
  res.status(201).json(tpl);
});

// --- Action Layer: simple decision suggestions ---
app.get('/api/actions', (req, res) => {
  const actions = [];
  const siteMetrics = computeSiteMetrics();
  const usageMetrics = computeUsageMetrics();

  // Flag sites based on monthly norms deviation
  const bySite = new Map();
  siteMetrics.forEach((m) => {
    if (m.deviation == null) return;
    const list = bySite.get(m.siteId) || [];
    list.push(m);
    bySite.set(m.siteId, list);
  });

  bySite.forEach((list, siteId) => {
    const site = sites.find((s) => s.id === siteId);
    const worst = list.reduce(
      (acc, m) => (acc == null || (m.deviation || 0) > (acc.deviation || 0) ? m : acc),
      null,
    );
    if (worst && worst.deviation > 0.1) {
      actions.push({
        kind: 'flag-site',
        siteId,
        message: `Site ${site ? site.name : siteId} shows high over-usage for ${worst.itemName} (monthly norm deviation ${(worst.deviation * 100).toFixed(1)}%)`,
      });
    }
  });

  // Flag sites based on SiteWise usage deviation (area-based)
  usageMetrics.forEach((m) => {
    if (m.deviation == null || m.deviation <= 0.08) return; // 8% threshold
    const site = sites.find((s) => s.id === m.siteId);
    actions.push({
      kind: 'flag-site-usage',
      siteId: m.siteId,
      message: `Site ${site ? site.name : m.siteId} shows material leakage for ${m.itemName} (${m.sku}): used ${m.actualUsed.toFixed(1)} ${items.find((it) => it.id === m.itemId)?.unit || 'units'} for ${m.totalArea.toFixed(0)} ${m.unitLabel || 'units'}, expected ${m.expectedUsed.toFixed(1)} (deviation ${(m.deviation * 100).toFixed(1)}%)`,
    });
  });

  // Transfer suggestions for dead SKUs with some site demand
  items.forEach((item) => {
    const metrics = computeMetricsForItem(item);
    if (metrics.healthStatus !== 'dead') return;
    const demandSite = siteMetrics.find(
      (m) => m.itemId === item.id && m.expectedQty > 0,
    );
    if (demandSite && item.stock > 0) {
      const site = sites.find((s) => s.id === demandSite.siteId);
      actions.push({
        kind: 'transfer',
        itemId: item.id,
        message: `Dead stock for ${item.name} (${item.sku}). Consider transferring some stock to ${site ? site.name : 'demand site'}.`,
      });
    }
  });

  // Reorder actions for fast SKUs
  items.forEach((item) => {
    const metrics = computeMetricsForItem(item);
    if (metrics.healthStatus === 'fast' && metrics.shouldReorder) {
      actions.push({
        kind: 'reorder',
        itemId: item.id,
        message: `Reorder ${metrics.reorderQty} of fast-moving SKU ${item.name} (${item.sku}).`,
      });
    }
  });

  res.json(actions);
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Inventory API server listening on port ${PORT}`);
});


