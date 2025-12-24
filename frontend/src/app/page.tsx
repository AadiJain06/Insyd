"use client";

import { useEffect, useState } from "react";
import styles from "./page.module.css";

type ItemMetrics = {
  avgDailySales: number;
  daysOfInventory: number | null;
  healthStatus: string;
  damageRate: number | null;
  shouldReorder: boolean;
  reorderQty: number;
};

type Item = {
  id: number;
  name: string;
  sku: string;
  unit: string;
  stock: number;
  metrics?: ItemMetrics;
};

type Site = {
  id: number;
  name: string;
};

type Norm = {
  id: number;
  siteId: number;
  itemId: number;
  expectedMonthlyQty: number;
};

type SiteMetric = {
  siteId: number;
  siteName: string;
  itemId: number;
  itemName: string;
  sku: string;
  expectedQty: number;
  actualQty: number;
  deviation: number | null;
};

type UsageTemplate = {
  id: number;
  itemId: number;
  areaPerQty: number;
  unitLabel: string;
  description?: string;
};

type UsageMetric = {
  siteId: number;
  siteName: string;
  itemId: number;
  itemName: string;
  sku: string;
  unitLabel: string | null;
  totalArea: number;
  actualUsed: number;
  expectedUsed: number | null;
  deviation: number | null;
};

type ActionSuggestion = {
  kind: string;
  message: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sites, setSites] = useState<Site[]>([]);
  const [norms, setNorms] = useState<Norm[]>([]);
  const [siteMetrics, setSiteMetrics] = useState<SiteMetric[]>([]);
  const [actions, setActions] = useState<ActionSuggestion[]>([]);

  const [usageTemplates, setUsageTemplates] = useState<UsageTemplate[]>([]);
  const [usageMetrics, setUsageMetrics] = useState<UsageMetric[]>([]);

  const [newSiteName, setNewSiteName] = useState("");
  const [newNorm, setNewNorm] = useState({
    siteId: "",
    itemId: "",
    expectedMonthlyQty: "",
  });

  const [newItem, setNewItem] = useState({ name: "", sku: "", unit: "box" });
  const [movement, setMovement] = useState({
    itemId: "",
    quantity: "",
    type: "purchase" as "purchase" | "issue" | "damage",
    note: "",
  });

  const [usageTemplateForm, setUsageTemplateForm] = useState({
    itemId: "",
    areaPerQty: "",
    unitLabel: "",
    description: "",
  });

  function sortedByHealth(itemsList: Item[]): Item[] {
    const order: Record<string, number> = {
      fast: 0,
      slow: 1,
      dead: 2,
      neutral: 3,
      unknown: 4,
    };
    return [...itemsList].sort((a, b) => {
      const ha = a.metrics?.healthStatus ?? "unknown";
      const hb = b.metrics?.healthStatus ?? "unknown";
      const oa = order[ha] ?? 99;
      const ob = order[hb] ?? 99;
      if (oa !== ob) return oa - ob;
      return a.name.localeCompare(b.name);
    });
  }

  async function fetchItems() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE}/api/items`);
      if (!res.ok) {
        throw new Error("Failed to load items");
      }
      const data: Item[] = await res.json();
      setItems(data);
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSitesAndNorms() {
    try {
      const [
        sitesRes,
        normsRes,
        metricsRes,
        actionsRes,
        usageTplRes,
        usageMetricsRes,
      ] = await Promise.all([
        fetch(`${API_BASE}/api/sites`),
        fetch(`${API_BASE}/api/norms`),
        fetch(`${API_BASE}/api/sites/metrics`),
        fetch(`${API_BASE}/api/actions`),
        fetch(`${API_BASE}/api/usage-templates`),
        fetch(`${API_BASE}/api/sites/usage-metrics`),
      ]);
      if (
        !sitesRes.ok ||
        !normsRes.ok ||
        !metricsRes.ok ||
        !actionsRes.ok ||
        !usageTplRes.ok ||
        !usageMetricsRes.ok
      ) {
        throw new Error("Failed to load site intelligence data");
      }
      const sitesData: Site[] = await sitesRes.json();
      const normsData: Norm[] = await normsRes.json();
      const metricsData: SiteMetric[] = await metricsRes.json();
      const actionsData: ActionSuggestion[] = await actionsRes.json();
      const usageTplData: UsageTemplate[] = await usageTplRes.json();
      const usageMetricsData: UsageMetric[] = await usageMetricsRes.json();
      setSites(sitesData);
      setNorms(normsData);
      setSiteMetrics(metricsData);
      setActions(actionsData);
      setUsageTemplates(usageTplData);
      setUsageMetrics(usageMetricsData);
    } catch (e: any) {
      // Do not override existing item error; show in same area if needed
      setError((prev) => prev ?? e.message ?? "Failed to load site data");
    }
  }

  useEffect(() => {
    fetchItems();
    fetchSitesAndNorms();
  }, []);

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to create item");
      }
      setNewItem({ name: "", sku: "", unit: "box" });
      await fetchItems();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    }
  }

  async function handleMovement(e: React.FormEvent) {
    e.preventDefault();
    if (!movement.itemId || !movement.quantity) return;
    try {
      setError(null);
      const endpoint =
        movement.type === "purchase"
          ? "/api/transactions/purchase"
          : movement.type === "issue"
          ? "/api/transactions/issue"
          : "/api/transactions/damage";
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: Number(movement.itemId),
          quantity: Number(movement.quantity),
          note: movement.note,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to record movement");
      }
      setMovement({ ...movement, quantity: "", note: "" });
      await fetchItems();
      await fetchSitesAndNorms();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    }
  }

  async function handleAddSite(e: React.FormEvent) {
    e.preventDefault();
    if (!newSiteName) return;
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/sites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSiteName }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to add site");
      }
      setNewSiteName("");
      await fetchSitesAndNorms();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    }
  }

  async function handleAddNorm(e: React.FormEvent) {
    e.preventDefault();
    if (!newNorm.siteId || !newNorm.itemId || !newNorm.expectedMonthlyQty) return;
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/norms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId: Number(newNorm.siteId),
          itemId: Number(newNorm.itemId),
          expectedMonthlyQty: Number(newNorm.expectedMonthlyQty),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to save norm");
      }
      setNewNorm({ siteId: "", itemId: "", expectedMonthlyQty: "" });
      await fetchSitesAndNorms();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    }
  }

  async function handleSaveUsageTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (
      !usageTemplateForm.itemId ||
      !usageTemplateForm.areaPerQty ||
      !usageTemplateForm.unitLabel
    ) {
      return;
    }
    try {
      setError(null);
      const res = await fetch(`${API_BASE}/api/usage-templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: Number(usageTemplateForm.itemId),
          areaPerQty: Number(usageTemplateForm.areaPerQty),
          unitLabel: usageTemplateForm.unitLabel,
          description: usageTemplateForm.description,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || "Failed to save usage template");
      }
      setUsageTemplateForm({
        itemId: "",
        areaPerQty: "",
        unitLabel: "",
        description: "",
      });
      await fetchSitesAndNorms();
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    }
  }

  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>Insyd - AEC Inventory</h1>
          <p className={styles.subtitle}>
            Track items, record purchases and issues, and always know your current stock.
          </p>
          {error && <div className={styles.error}>{error}</div>}
        </header>

        <section className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Add new item</h2>
            </div>
            <form onSubmit={handleAddItem} className={styles.form}>
              <input
                className={styles.input}
                required
                placeholder="Name (e.g. 600x600 matte tile)"
                value={newItem.name}
                onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
              />
              <input
                className={styles.input}
                required
                placeholder="SKU code"
                value={newItem.sku}
                onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
              />
              <input
                className={styles.input}
                required
                placeholder="Unit (box, sqft, pcs)"
                value={newItem.unit}
                onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
              />
              <button type="submit" className={styles.buttonPrimary}>
                Add item
              </button>
            </form>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Record stock movement</h2>
            </div>
            <form onSubmit={handleMovement} className={styles.form}>
              <select
                className={styles.select}
                required
                value={movement.itemId}
                onChange={(e) => setMovement({ ...movement, itemId: e.target.value })}
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
              <input
                className={styles.input}
                required
                type="number"
                min={0}
                step={1}
                placeholder="Quantity"
                value={movement.quantity}
                onChange={(e) =>
                  setMovement({ ...movement, quantity: e.target.value })
                }
              />
              <select
                className={styles.select}
                value={movement.type}
                onChange={(e) =>
                  setMovement({
                    ...movement,
                    type: e.target.value as "purchase" | "issue" | "damage",
                  })
                }
              >
                <option value="purchase">Purchase (inward)</option>
                <option value="issue">Issue (outward)</option>
                <option value="damage">Damage / wastage</option>
              </select>
              <input
                className={styles.input}
                placeholder="Note (optional)"
                value={movement.note}
                onChange={(e) =>
                  setMovement({ ...movement, note: e.target.value })
                }
              />
              <button type="submit" className={styles.buttonPrimary}>
                Record
              </button>
            </form>
          </div>
        </section>

        <section className={styles.grid}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Sites / projects</h2>
            </div>
            <form onSubmit={handleAddSite} className={styles.form}>
              <input
                className={styles.input}
                required
                placeholder="Site / project name"
                value={newSiteName}
                onChange={(e) => setNewSiteName(e.target.value)}
              />
              <button type="submit" className={styles.buttonPrimary}>
                Add site
              </button>
            </form>
            {sites.length > 0 && (
              <ul style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#555" }}>
                {sites.map((s) => (
                  <li key={s.id}>{s.name}</li>
                ))}
              </ul>
            )}
          </div>

          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <h2 className={styles.cardTitle}>Material norms (per month)</h2>
            </div>
            <form onSubmit={handleAddNorm} className={styles.form}>
              <select
                className={styles.select}
                required
                value={newNorm.siteId}
                onChange={(e) => setNewNorm({ ...newNorm, siteId: e.target.value })}
              >
                <option value="">Select site</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                className={styles.select}
                required
                value={newNorm.itemId}
                onChange={(e) => setNewNorm({ ...newNorm, itemId: e.target.value })}
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.sku})
                  </option>
                ))}
              </select>
              <input
                className={styles.input}
                required
                type="number"
                min={0}
                step={1}
                placeholder="Expected monthly qty"
                value={newNorm.expectedMonthlyQty}
                onChange={(e) =>
                  setNewNorm({ ...newNorm, expectedMonthlyQty: e.target.value })
                }
              />
              <button type="submit" className={styles.buttonPrimary}>
                Save norm
              </button>
            </form>
          </div>
        </section>

        <section className={`${styles.card} ${styles.tableCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Usage templates (SiteWise)</h2>
          </div>
          <form onSubmit={handleSaveUsageTemplate} className={styles.form}>
            <select
              className={styles.select}
              required
              value={usageTemplateForm.itemId}
              onChange={(e) =>
                setUsageTemplateForm({ ...usageTemplateForm, itemId: e.target.value })
              }
            >
              <option value="">Select item</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.sku})
                </option>
              ))}
            </select>
            <input
              className={styles.input}
              required
              type="number"
              min={0}
              step={0.01}
              placeholder="Area per 1 unit (e.g. 12 for 1 bag = 12 sqft)"
              value={usageTemplateForm.areaPerQty}
              onChange={(e) =>
                setUsageTemplateForm({ ...usageTemplateForm, areaPerQty: e.target.value })
              }
            />
            <input
              className={styles.input}
              required
              placeholder="Unit of work (e.g. sqft plaster, room tiled)"
              value={usageTemplateForm.unitLabel}
              onChange={(e) =>
                setUsageTemplateForm({ ...usageTemplateForm, unitLabel: e.target.value })
              }
            />
            <input
              className={styles.input}
              placeholder="Description (optional)"
              value={usageTemplateForm.description}
              onChange={(e) =>
                setUsageTemplateForm({ ...usageTemplateForm, description: e.target.value })
              }
            />
            <button type="submit" className={styles.buttonPrimary}>
              Save template
            </button>
          </form>
          {usageTemplates.length > 0 && (
            <ul style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#555" }}>
              {usageTemplates.map((t) => {
                const item = items.find((i) => i.id === t.itemId);
                return (
                  <li key={t.id}>
                    {item ? item.name : "Unknown item"} – 1 {item?.unit ?? "unit"} for{" "}
                    {t.areaPerQty} {t.unitLabel}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={`${styles.card} ${styles.tableCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Current stock</h2>
          </div>
          {loading ? (
            <p className={styles.loading}>Loading items…</p>
          ) : items.length === 0 ? (
            <p className={styles.emptyState}>
              No items yet. Add your first SKU above to start tracking inventory.
            </p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th className={styles.stockCell}>Stock</th>
                    <th>Unit</th>
                    <th>Health</th>
                    <th>Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.sku}</td>
                      <td className={styles.stockCell}>{item.stock}</td>
                      <td>{item.unit}</td>
                      <td>
                        {item.metrics?.healthStatus ?? "-"}
                      </td>
                      <td>
                        {item.metrics?.shouldReorder
                          ? `Reorder ${item.metrics.reorderQty}`
                          : "OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.tableCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>SKU health & analytics</h2>
          </div>
          {loading ? (
            <p className={styles.loading}>Loading metrics…</p>
          ) : items.length === 0 ? (
            <p className={styles.emptyState}>
              No items yet. Once you start recording movements, SKU health will appear here.
            </p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Health</th>
                    <th className={styles.stockCell}>Avg daily sales</th>
                    <th className={styles.stockCell}>Days of inventory</th>
                    <th className={styles.stockCell}>Damage rate</th>
                    <th>Reorder</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedByHealth(items).map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td>{item.metrics?.healthStatus ?? "-"}</td>
                      <td className={styles.stockCell}>
                        {item.metrics ? item.metrics.avgDailySales.toFixed(2) : "-"}
                      </td>
                      <td className={styles.stockCell}>
                        {item.metrics && item.metrics.daysOfInventory != null
                          ? item.metrics.daysOfInventory.toFixed(1)
                          : "-"}
                      </td>
                      <td className={styles.stockCell}>
                        {item.metrics && item.metrics.damageRate != null
                          ? `${(item.metrics.damageRate * 100).toFixed(1)}%`
                          : "-"}
                      </td>
                      <td>
                        {item.metrics?.shouldReorder
                          ? `Reorder ${item.metrics.reorderQty}`
                          : "OK"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.tableCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Site leakage report</h2>
          </div>
          {siteMetrics.length === 0 ? (
            <p className={styles.emptyState}>
              No site usage yet. Define norms and issue to sites to see leakage.
            </p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Item</th>
                    <th className={styles.stockCell}>Expected</th>
                    <th className={styles.stockCell}>Actual</th>
                    <th className={styles.stockCell}>Deviation %</th>
                  </tr>
                </thead>
                <tbody>
                  {siteMetrics.map((m, idx) => (
                    <tr key={`${m.siteId}-${m.itemId}-${idx}`}>
                      <td>{m.siteName}</td>
                      <td>
                        {m.itemName} ({m.sku})
                      </td>
                      <td className={styles.stockCell}>{m.expectedQty}</td>
                      <td className={styles.stockCell}>{m.actualQty}</td>
                      <td className={styles.stockCell}>
                        {m.deviation != null
                          ? `${(m.deviation * 100).toFixed(1)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.tableCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>SiteWise usage report</h2>
          </div>
          {usageMetrics.length === 0 ? (
            <p className={styles.emptyState}>
              No usage data yet. Save a usage template and issue to sites with area completed to
              see this report.
            </p>
          ) : (
            <div className={styles.tableWrapper}>
              <table>
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Item</th>
                    <th className={styles.stockCell}>Area done</th>
                    <th className={styles.stockCell}>Expected use</th>
                    <th className={styles.stockCell}>Actual used</th>
                    <th className={styles.stockCell}>Deviation %</th>
                  </tr>
                </thead>
                <tbody>
                  {usageMetrics.map((m, idx) => (
                    <tr key={`${m.siteId}-${m.itemId}-${idx}`}>
                      <td>{m.siteName}</td>
                      <td>
                        {m.itemName} ({m.sku})
                        {m.unitLabel ? ` per ${m.unitLabel}` : ""}
                      </td>
                      <td className={styles.stockCell}>{m.totalArea}</td>
                      <td className={styles.stockCell}>
                        {m.expectedUsed != null ? m.expectedUsed.toFixed(2) : "-"}
                      </td>
                      <td className={styles.stockCell}>{m.actualUsed}</td>
                      <td className={styles.stockCell}>
                        {m.deviation != null
                          ? `${(m.deviation * 100).toFixed(1)}%`
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className={`${styles.card} ${styles.tableCard}`}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Action center</h2>
          </div>
          {actions.length === 0 ? (
            <p className={styles.emptyState}>
              No suggested actions yet. Once data builds up, you&apos;ll see transfer, flag and
              reorder suggestions here.
            </p>
          ) : (
            <ul style={{ paddingLeft: "1.1rem", fontSize: "0.9rem", color: "#333" }}>
              {actions.map((a, idx) => (
                <li key={idx}>{a.message}</li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
