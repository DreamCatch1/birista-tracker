import { useState, useEffect } from "react";

// ─── CONFIG ──────────────────────────────────────────────────────────────────
// After setting up your Apps Script, paste your Web App URL here:
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxQ38P_iurc8nhd6aUV7zZ_L-Q1W-h5vWO3ElYN2rvXoEcRHFCXr62CU6zs6eJNlYCF/exec";

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const uid = (prefix, n = 3) => `${prefix}-${String(Math.floor(Math.random() * 900 + 100)).padStart(n, "0")}`;
const fmt = (n) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

async function sheetPost(sheet, row) {
  if (!APPS_SCRIPT_URL) {
    return { ok: true, demo: true };
  }
  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ sheet, row }),
    });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data;
  } catch (err) {
    return { ok: false, error: err.message || "Network error — check your Apps Script deployment" };
  }
}

async function sheetGet(sheet) {
  if (!APPS_SCRIPT_URL) {
    return [];
  }
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?sheet=${sheet}`);
    if (!res.ok) throw new Error(`Server returned ${res.status}`);
    return res.json();
  } catch (err) {
    return [];
  }
}

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const C = {
  bg: "#0F1117",
  surface: "#1A1D27",
  card: "#222535",
  border: "#2E3347",
  accent: "#F5A623",
  accentDim: "#F5A62320",
  accentHover: "#E8962A",
  green: "#2ECC71",
  red: "#E74C3C",
  blue: "#5B8DEF",
  text: "#F0F2F8",
  muted: "#8891AA",
  white: "#FFFFFF",
};

// ─── SHARED UI COMPONENTS ─────────────────────────────────────────────────────
const Label = ({ children }) => (
  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.muted, textTransform: "uppercase", marginBottom: 6 }}>
    {children}
  </div>
);

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <Label>{label}</Label>}
    <input
      {...props}
      style={{
        width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14,
        outline: "none", transition: "border 0.15s",
        ...(props.style || {})
      }}
      onFocus={e => e.target.style.borderColor = C.accent}
      onBlur={e => e.target.style.borderColor = C.border}
    />
  </div>
);

const Select = ({ label, options = [], ...props }) => (
  <div style={{ marginBottom: 16 }}>
    {label && <Label>{label}</Label>}
    <select
      {...props}
      style={{
        width: "100%", boxSizing: "border-box", background: C.bg, border: `1px solid ${C.border}`,
        borderRadius: 8, padding: "10px 12px", color: C.text, fontSize: 14, outline: "none",
        ...(props.style || {})
      }}
    >
      <option value="">— Select —</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

const Btn = ({ children, variant = "primary", loading, ...props }) => (
  <button
    {...props}
    disabled={loading || props.disabled}
    style={{
      background: variant === "primary" ? C.accent : "transparent",
      color: variant === "primary" ? "#000" : C.muted,
      border: variant === "ghost" ? `1px solid ${C.border}` : "none",
      borderRadius: 8, padding: "11px 20px", fontSize: 14, fontWeight: 700,
      cursor: loading ? "wait" : "pointer", transition: "all 0.15s",
      opacity: loading ? 0.7 : 1,
      ...(props.style || {})
    }}
  >
    {loading ? "Saving…" : children}
  </button>
);

const Toast = ({ msg, ok }) => msg ? (
  <div style={{
    position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
    background: ok ? C.green : C.red, color: "#fff", borderRadius: 10,
    padding: "10px 20px", fontSize: 13, fontWeight: 600, zIndex: 999,
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)", whiteSpace: "nowrap"
  }}>{msg}</div>
) : null;

const Card = ({ children, style }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16, marginBottom: 12, ...style }}>
    {children}
  </div>
);

const SectionTitle = ({ title, sub }) => (
  <div style={{ marginBottom: 20 }}>
    <div style={{ fontSize: 20, fontWeight: 800, color: C.text }}>{title}</div>
    {sub && <div style={{ fontSize: 13, color: C.muted, marginTop: 3 }}>{sub}</div>}
  </div>
);

const KpiCard = ({ label, value, color = C.accent }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", flex: 1, minWidth: 120 }}>
    <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
    <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
  </div>
);

const Divider = () => <div style={{ height: 1, background: C.border, margin: "20px 0" }} />;

// ─── MODULES ─────────────────────────────────────────────────────────────────

// PROCUREMENT
function ProcurementModule({ toast }) {
  const [tab, setTab] = useState("po");
  const [loading, setLoading] = useState(false);
  const [po, setPo] = useState({ date: today(), supplier: "", variety: "", grade: "", qty: "", rate: "", transport: "", expected: "" });
  const [grn, setGrn] = useState({ date: today(), poNo: "", supplier: "", vehicle: "", qtyReceived: "", shortage: "0", damage: "0", moisture: "", location: "Warehouse-A" });

  const submitPO = async () => {
    if (!po.supplier || !po.qty || !po.rate) return toast("Fill Supplier, Qty & Rate", false);
    setLoading(true);
    const id = uid("PO");
    const result = await sheetPost("Purchase_Orders", [id, po.date, po.supplier, po.variety, po.grade, po.qty, po.rate, po.transport || 0, po.expected, "Pending"]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast(`${id} created ✓`, true);
    setPo({ date: today(), supplier: "", variety: "", grade: "", qty: "", rate: "", transport: "", expected: "" });
    setLoading(false);
  };

  const submitGRN = async () => {
    if (!grn.supplier || !grn.qtyReceived) return toast("Fill Supplier & Qty Received", false);
    setLoading(true);
    const lotId = "LOT-" + Date.now().toString().slice(-6);
    const accepted = Number(grn.qtyReceived) - Number(grn.shortage || 0) - Number(grn.damage || 0);
    const result = await sheetPost("Raw_Lots", [lotId, grn.date, grn.poNo, grn.supplier, grn.vehicle, grn.qtyReceived, grn.shortage, grn.damage, accepted, grn.moisture, grn.location, "Active"]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast(`${lotId} logged ✓`, true);
    setGrn({ date: today(), poNo: "", supplier: "", vehicle: "", qtyReceived: "", shortage: "0", damage: "0", moisture: "", location: "Warehouse-A" });
    setLoading(false);
  };

  const tabs = [{ id: "po", label: "New PO" }, { id: "grn", label: "Goods Receipt" }];

  return (
    <div>
      <SectionTitle title="Procurement" sub="Raise purchase orders & log incoming onions" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === t.id ? C.accent : C.card, color: tab === t.id ? "#000" : C.muted,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "po" && (
        <Card>
          <Input label="Date" type="date" value={po.date} onChange={e => setPo({ ...po, date: e.target.value })} />
          <Input label="Supplier Name" placeholder="e.g. Raju Farms" value={po.supplier} onChange={e => setPo({ ...po, supplier: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="Onion Variety" value={po.variety} onChange={e => setPo({ ...po, variety: e.target.value })}
              options={["Nasik Red", "Bangalore Rose", "Puna Fursungi", "Local"]} />
            <Select label="Grade" value={po.grade} onChange={e => setPo({ ...po, grade: e.target.value })}
              options={["A Grade", "B Grade", "C Grade"]} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Qty (kg)" type="number" placeholder="500" value={po.qty} onChange={e => setPo({ ...po, qty: e.target.value })} />
            <Input label="Rate (₹/kg)" type="number" placeholder="25" value={po.rate} onChange={e => setPo({ ...po, rate: e.target.value })} />
          </div>
          <Input label="Transport Cost (₹)" type="number" placeholder="0" value={po.transport} onChange={e => setPo({ ...po, transport: e.target.value })} />
          <Input label="Expected Delivery Date" type="date" value={po.expected} onChange={e => setPo({ ...po, expected: e.target.value })} />
          {po.qty && po.rate && (
            <div style={{ background: C.accentDim, border: `1px solid ${C.accent}40`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.accent }}>
              Total Value: {fmt(po.qty * po.rate + Number(po.transport || 0))}
            </div>
          )}
          <Btn loading={loading} onClick={submitPO}>Create Purchase Order</Btn>
        </Card>
      )}

      {tab === "grn" && (
        <Card>
          <Input label="Date Received" type="date" value={grn.date} onChange={e => setGrn({ ...grn, date: e.target.value })} />
          <Input label="PO Number (optional)" placeholder="PO-001" value={grn.poNo} onChange={e => setGrn({ ...grn, poNo: e.target.value })} />
          <Input label="Supplier Name" placeholder="e.g. Raju Farms" value={grn.supplier} onChange={e => setGrn({ ...grn, supplier: e.target.value })} />
          <Input label="Vehicle Number" placeholder="MH12AB1234" value={grn.vehicle} onChange={e => setGrn({ ...grn, vehicle: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Input label="Qty Received (kg)" type="number" value={grn.qtyReceived} onChange={e => setGrn({ ...grn, qtyReceived: e.target.value })} />
            <Input label="Shortage (kg)" type="number" value={grn.shortage} onChange={e => setGrn({ ...grn, shortage: e.target.value })} />
            <Input label="Damaged (kg)" type="number" value={grn.damage} onChange={e => setGrn({ ...grn, damage: e.target.value })} />
          </div>
          <Input label="Moisture %" type="number" placeholder="12" value={grn.moisture} onChange={e => setGrn({ ...grn, moisture: e.target.value })} />
          <Select label="Warehouse Location" value={grn.location} onChange={e => setGrn({ ...grn, location: e.target.value })}
            options={["Warehouse-A", "Warehouse-B", "Cold Storage"]} />
          {grn.qtyReceived && (
            <div style={{ background: C.accentDim, border: `1px solid ${C.accent}40`, borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: C.accent }}>
              Accepted: {Number(grn.qtyReceived) - Number(grn.shortage || 0) - Number(grn.damage || 0)} kg
            </div>
          )}
          <Btn loading={loading} onClick={submitGRN}>Log Goods Receipt (Create Lot)</Btn>
        </Card>
      )}
    </div>
  );
}

// PRODUCTION
function ProductionModule({ toast }) {
  const [tab, setTab] = useState("batch");
  const [loading, setLoading] = useState(false);
  const [batch, setBatch] = useState({ date: today(), lotId: "", inputQty: "", outputQty: "", shift: "Morning", supervisor: "", oilUsed: "", notes: "" });
  const [waste, setWaste] = useState({ date: today(), batchId: "", type: "", qty: "", reason: "" });

  const yieldPct = batch.inputQty && batch.outputQty
    ? ((batch.outputQty / batch.inputQty) * 100).toFixed(1)
    : null;

  const submitBatch = async () => {
    if (!batch.lotId || !batch.inputQty || !batch.outputQty) return toast("Fill Lot ID, Input & Output Qty", false);
    setLoading(true);
    const id = uid("BR");
    const result = await sheetPost("Production_Batches", [id, batch.date, batch.lotId, batch.inputQty, batch.oilUsed || 0, batch.outputQty, yieldPct, batch.shift, batch.supervisor, batch.notes, "Completed"]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast(`${id} saved ✓`, true);
    setBatch({ date: today(), lotId: "", inputQty: "", outputQty: "", shift: "Morning", supervisor: "", oilUsed: "", notes: "" });
    setLoading(false);
  };

  const submitWaste = async () => {
    if (!batch.date || !waste.type || !waste.qty) return toast("Fill Batch, Type & Qty", false);
    setLoading(true);
    const result = await sheetPost("Wastage_Log", [waste.date, waste.batchId, waste.type, waste.qty, waste.reason]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast("Wastage logged ✓", true);
    setWaste({ date: today(), batchId: "", type: "", qty: "", reason: "" });
    setLoading(false);
  };

  const tabs = [{ id: "batch", label: "New Batch" }, { id: "waste", label: "Log Wastage" }];

  return (
    <div>
      <SectionTitle title="Production" sub="Record batches, yield & wastage" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === t.id ? C.accent : C.card, color: tab === t.id ? "#000" : C.muted,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "batch" && (
        <Card>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Date" type="date" value={batch.date} onChange={e => setBatch({ ...batch, date: e.target.value })} />
            <Select label="Shift" value={batch.shift} onChange={e => setBatch({ ...batch, shift: e.target.value })}
              options={["Morning", "Afternoon", "Night"]} />
          </div>
          <Input label="Raw Lot ID" placeholder="LOT-001 (from Procurement)" value={batch.lotId} onChange={e => setBatch({ ...batch, lotId: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Onion Input (kg)" type="number" placeholder="250" value={batch.inputQty} onChange={e => setBatch({ ...batch, inputQty: e.target.value })} />
            <Input label="Oil Used (kg)" type="number" placeholder="20" value={batch.oilUsed} onChange={e => setBatch({ ...batch, oilUsed: e.target.value })} />
          </div>
          <Input label="Birista Output (kg)" type="number" placeholder="100" value={batch.outputQty} onChange={e => setBatch({ ...batch, outputQty: e.target.value })} />
          <Input label="Supervisor" placeholder="Name" value={batch.supervisor} onChange={e => setBatch({ ...batch, supervisor: e.target.value })} />
          <Input label="Notes" placeholder="Any issues, observations..." value={batch.notes} onChange={e => setBatch({ ...batch, notes: e.target.value })} />

          {yieldPct && (
            <div style={{
              background: Number(yieldPct) >= 38 ? "#2ECC7120" : "#E74C3C20",
              border: `1px solid ${Number(yieldPct) >= 38 ? C.green : C.red}40`,
              borderRadius: 8, padding: "12px 14px", marginBottom: 16
            }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 2 }}>YIELD</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: Number(yieldPct) >= 38 ? C.green : C.red }}>{yieldPct}%</div>
              <div style={{ fontSize: 12, color: C.muted }}>Standard: 38–42% · {Number(yieldPct) >= 38 ? "✓ Good" : "⚠ Below standard"}</div>
            </div>
          )}
          <Btn loading={loading} onClick={submitBatch}>Save Production Batch</Btn>
        </Card>
      )}

      {tab === "waste" && (
        <Card>
          <Input label="Date" type="date" value={waste.date} onChange={e => setWaste({ ...waste, date: e.target.value })} />
          <Input label="Batch ID" placeholder="BR-001" value={waste.batchId} onChange={e => setWaste({ ...waste, batchId: e.target.value })} />
          <Select label="Wastage Type" value={waste.type} onChange={e => setWaste({ ...waste, type: e.target.value })}
            options={["Burnt", "Broken", "Moisture Loss", "Contaminated", "Over-fried", "Other"]} />
          <Input label="Qty (kg)" type="number" placeholder="5" value={waste.qty} onChange={e => setWaste({ ...waste, qty: e.target.value })} />
          <Input label="Reason / Notes" placeholder="What happened?" value={waste.reason} onChange={e => setWaste({ ...waste, reason: e.target.value })} />
          <Btn loading={loading} onClick={submitWaste}>Log Wastage</Btn>
        </Card>
      )}
    </div>
  );
}

// SALES
function SalesModule({ toast }) {
  const [tab, setTab] = useState("order");
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState({ date: today(), customer: "", type: "Distributor", sku: "", qty: "", rate: "", discount: "0", batchNo: "", notes: "" });
  const [ret, setRet] = useState({ date: today(), customer: "", invoiceNo: "", batchNo: "", qty: "", reason: "" });

  const gross = order.qty && order.rate ? order.qty * order.rate : 0;
  const net = gross - (gross * (order.discount || 0) / 100);

  const submitOrder = async () => {
    if (!order.customer || !order.sku || !order.qty || !order.rate) return toast("Fill Customer, SKU, Qty & Rate", false);
    setLoading(true);
    const id = uid("SO");
    const inv = uid("INV");
    const result = await sheetPost("Sales_Orders", [id, inv, order.date, order.customer, order.type, order.sku, order.qty, order.rate, order.discount, gross.toFixed(2), net.toFixed(2), order.batchNo, order.notes, "Dispatched"]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast(`${id} / ${inv} saved ✓`, true);
    setOrder({ date: today(), customer: "", type: "Distributor", sku: "", qty: "", rate: "", discount: "0", batchNo: "", notes: "" });
    setLoading(false);
  };

  const submitReturn = async () => {
    if (!ret.customer || !ret.qty) return toast("Fill Customer & Qty", false);
    setLoading(true);
    const id = uid("RET");
    const result = await sheetPost("Sales_Returns", [id, ret.date, ret.customer, ret.invoiceNo, ret.batchNo, ret.qty, ret.reason]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast(`${id} logged ✓`, true);
    setRet({ date: today(), customer: "", invoiceNo: "", batchNo: "", qty: "", reason: "" });
    setLoading(false);
  };

  const tabs = [{ id: "order", label: "New Order" }, { id: "return", label: "Returns" }];

  return (
    <div>
      <SectionTitle title="Sales & Dispatch" sub="Log orders, invoices and returns" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === t.id ? C.accent : C.card, color: tab === t.id ? "#000" : C.muted,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "order" && (
        <Card>
          <Input label="Date" type="date" value={order.date} onChange={e => setOrder({ ...order, date: e.target.value })} />
          <Input label="Customer Name" placeholder="e.g. Sharma Traders" value={order.customer} onChange={e => setOrder({ ...order, customer: e.target.value })} />
          <Select label="Customer Type" value={order.type} onChange={e => setOrder({ ...order, type: e.target.value })}
            options={["Distributor", "Wholesaler", "Retailer", "Hotel", "Restaurant", "Caterer", "Online", "Modern Trade"]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="SKU / Pack Size" value={order.sku} onChange={e => setOrder({ ...order, sku: e.target.value })}
              options={["Birista 100g", "Birista 250g", "Birista 500g", "Birista 1kg", "Birista 5kg (Bulk)"]} />
            <Input label="Batch No" placeholder="BR-001" value={order.batchNo} onChange={e => setOrder({ ...order, batchNo: e.target.value })} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Input label="Qty (units)" type="number" value={order.qty} onChange={e => setOrder({ ...order, qty: e.target.value })} />
            <Input label="Rate (₹/unit)" type="number" value={order.rate} onChange={e => setOrder({ ...order, rate: e.target.value })} />
            <Input label="Discount %" type="number" value={order.discount} onChange={e => setOrder({ ...order, discount: e.target.value })} />
          </div>
          <Input label="Notes / LR No" placeholder="Transport details, remarks..." value={order.notes} onChange={e => setOrder({ ...order, notes: e.target.value })} />
          {gross > 0 && (
            <div style={{ background: C.accentDim, border: `1px solid ${C.accent}40`, borderRadius: 8, padding: "10px 14px", marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.muted }}>
                <span>Gross</span><span>{fmt(gross)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800, color: C.accent, marginTop: 4 }}>
                <span>Net Payable</span><span>{fmt(net)}</span>
              </div>
            </div>
          )}
          <Btn loading={loading} onClick={submitOrder}>Save Order & Invoice</Btn>
        </Card>
      )}

      {tab === "return" && (
        <Card>
          <Input label="Date" type="date" value={ret.date} onChange={e => setRet({ ...ret, date: e.target.value })} />
          <Input label="Customer Name" placeholder="e.g. Sharma Traders" value={ret.customer} onChange={e => setRet({ ...ret, customer: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Input label="Invoice No" placeholder="INV-001" value={ret.invoiceNo} onChange={e => setRet({ ...ret, invoiceNo: e.target.value })} />
            <Input label="Batch No" placeholder="BR-001" value={ret.batchNo} onChange={e => setRet({ ...ret, batchNo: e.target.value })} />
          </div>
          <Input label="Return Qty (units)" type="number" value={ret.qty} onChange={e => setRet({ ...ret, qty: e.target.value })} />
          <Select label="Reason" value={ret.reason} onChange={e => setRet({ ...ret, reason: e.target.value })}
            options={["Quality Issue", "Wrong Product", "Damaged in Transit", "Expired", "Customer Cancelled", "Other"]} />
          <Btn loading={loading} onClick={submitReturn}>Log Return</Btn>
        </Card>
      )}
    </div>
  );
}

// INVENTORY
function InventoryModule({ toast }) {
  const [tab, setTab] = useState("pkg");
  const [loading, setLoading] = useState(false);
  const [pkg, setPkg] = useState({ date: today(), item: "", unit: "Pcs", received: "", used: "", balance: "", reorder: "" });
  const [cons, setCons] = useState({ date: today(), item: "", unit: "Kg", purchased: "", used: "", balance: "" });

  const submitPkg = async () => {
    if (!pkg.item || !pkg.received) return toast("Fill Item & Qty Received", false);
    setLoading(true);
    const result = await sheetPost("Packaging_Inventory", [pkg.date, pkg.item, pkg.unit, pkg.received, pkg.used || 0, pkg.balance, pkg.reorder]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast("Packaging stock updated ✓", true);
    setPkg({ date: today(), item: "", unit: "Pcs", received: "", used: "", balance: "", reorder: "" });
    setLoading(false);
  };

  const submitCons = async () => {
    if (!cons.item || !cons.purchased) return toast("Fill Item & Qty Purchased", false);
    setLoading(true);
    const result = await sheetPost("Consumables_Inventory", [cons.date, cons.item, cons.unit, cons.purchased, cons.used || 0, cons.balance]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast("Consumable stock updated ✓", true);
    setCons({ date: today(), item: "", unit: "Kg", purchased: "", used: "", balance: "" });
    setLoading(false);
  };

  const tabs = [{ id: "pkg", label: "Packaging" }, { id: "cons", label: "Consumables" }];

  return (
    <div>
      <SectionTitle title="Inventory" sub="Track packaging materials & consumables" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === t.id ? C.accent : C.card, color: tab === t.id ? "#000" : C.muted,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "pkg" && (
        <Card>
          <Input label="Date" type="date" value={pkg.date} onChange={e => setPkg({ ...pkg, date: e.target.value })} />
          <Select label="Packaging Item" value={pkg.item} onChange={e => setPkg({ ...pkg, item: e.target.value })}
            options={["PET Jar 100g", "PET Jar 250g", "PET Jar 500g", "PET Jar 1kg", "Pouch 100g", "Pouch 250g", "Label", "Carton Box", "Sealing Film", "Shrink Wrap"]} />
          <Select label="Unit" value={pkg.unit} onChange={e => setPkg({ ...pkg, unit: e.target.value })}
            options={["Pcs", "Roll", "Box", "Kg"]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Input label="Received" type="number" value={pkg.received} onChange={e => setPkg({ ...pkg, received: e.target.value })} />
            <Input label="Used" type="number" value={pkg.used} onChange={e => setPkg({ ...pkg, used: e.target.value })} />
            <Input label="Balance" type="number" value={pkg.balance} onChange={e => setPkg({ ...pkg, balance: e.target.value })} />
          </div>
          <Input label="Reorder Level" type="number" placeholder="Min stock before reorder" value={pkg.reorder} onChange={e => setPkg({ ...pkg, reorder: e.target.value })} />
          <Btn loading={loading} onClick={submitPkg}>Update Packaging Stock</Btn>
        </Card>
      )}

      {tab === "cons" && (
        <Card>
          <Input label="Date" type="date" value={cons.date} onChange={e => setCons({ ...cons, date: e.target.value })} />
          <Select label="Consumable Item" value={cons.item} onChange={e => setCons({ ...cons, item: e.target.value })}
            options={["Refined Oil", "LPG Cylinder", "Cleaning Chemical", "Gloves", "Hairnets", "Aprons", "Tissue", "Salt"]} />
          <Select label="Unit" value={cons.unit} onChange={e => setCons({ ...cons, unit: e.target.value })}
            options={["Kg", "Litre", "Cylinder", "Box", "Pcs"]} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Input label="Purchased" type="number" value={cons.purchased} onChange={e => setCons({ ...cons, purchased: e.target.value })} />
            <Input label="Used" type="number" value={cons.used} onChange={e => setCons({ ...cons, used: e.target.value })} />
            <Input label="Balance" type="number" value={cons.balance} onChange={e => setCons({ ...cons, balance: e.target.value })} />
          </div>
          <Btn loading={loading} onClick={submitCons}>Update Consumable Stock</Btn>
        </Card>
      )}
    </div>
  );
}

// FINANCE
function FinanceModule({ toast }) {
  const [tab, setTab] = useState("payment");
  const [loading, setLoading] = useState(false);
  const [pay, setPay] = useState({ date: today(), type: "Received", party: "", mode: "UPI", ref: "", amount: "", notes: "" });
  const [exp, setExp] = useState({ date: today(), category: "", description: "", amount: "", paidBy: "Cash" });

  const submitPayment = async () => {
    if (!pay.party || !pay.amount) return toast("Fill Party & Amount", false);
    setLoading(true);
    const id = uid("PAY");
    const result = await sheetPost("Payments", [id, pay.date, pay.type, pay.party, pay.mode, pay.ref, pay.amount, pay.notes]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast(`${id} saved ✓`, true);
    setPay({ date: today(), type: "Received", party: "", mode: "UPI", ref: "", amount: "", notes: "" });
    setLoading(false);
  };

  const submitExpense = async () => {
    if (!exp.category || !exp.amount) return toast("Fill Category & Amount", false);
    setLoading(true);
    const id = uid("EXP");
    const result = await sheetPost("Expenses", [id, exp.date, exp.category, exp.description, exp.amount, exp.paidBy]);
    if (result.ok === false) { toast(result.error, false); setLoading(false); return; }
    toast(`${id} saved ✓`, true);
    setExp({ date: today(), category: "", description: "", amount: "", paidBy: "Cash" });
    setLoading(false);
  };

  const tabs = [{ id: "payment", label: "Payments" }, { id: "expense", label: "Expenses" }];

  return (
    <div>
      <SectionTitle title="Finance" sub="Log payments received & daily expenses" />
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "8px 16px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 600, cursor: "pointer",
            background: tab === t.id ? C.accent : C.card, color: tab === t.id ? "#000" : C.muted,
          }}>{t.label}</button>
        ))}
      </div>

      {tab === "payment" && (
        <Card>
          <Input label="Date" type="date" value={pay.date} onChange={e => setPay({ ...pay, date: e.target.value })} />
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {["Received", "Paid"].map(t => (
              <button key={t} onClick={() => setPay({ ...pay, type: t })} style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
                background: pay.type === t ? (t === "Received" ? C.green : C.red) : C.bg,
                color: pay.type === t ? "#fff" : C.muted,
              }}>{t === "Received" ? "💰 Money In" : "💸 Money Out"}</button>
            ))}
          </div>
          <Input label={pay.type === "Received" ? "Received From" : "Paid To"} placeholder="Customer / Supplier name" value={pay.party} onChange={e => setPay({ ...pay, party: e.target.value })} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Select label="Payment Mode" value={pay.mode} onChange={e => setPay({ ...pay, mode: e.target.value })}
              options={["UPI", "NEFT/RTGS", "Cheque", "Cash", "Bank Transfer"]} />
            <Input label="Reference No" placeholder="UTR / Cheque No" value={pay.ref} onChange={e => setPay({ ...pay, ref: e.target.value })} />
          </div>
          <Input label="Amount (₹)" type="number" placeholder="0" value={pay.amount} onChange={e => setPay({ ...pay, amount: e.target.value })} />
          <Input label="Notes / Invoice Ref" placeholder="Against INV-001" value={pay.notes} onChange={e => setPay({ ...pay, notes: e.target.value })} />
          <Btn loading={loading} onClick={submitPayment}>Save Payment</Btn>
        </Card>
      )}

      {tab === "expense" && (
        <Card>
          <Input label="Date" type="date" value={exp.date} onChange={e => setExp({ ...exp, date: e.target.value })} />
          <Select label="Category" value={exp.category} onChange={e => setExp({ ...exp, category: e.target.value })}
            options={["Rent", "Electricity", "LPG / Fuel", "Salary", "Transport / Freight", "Marketing", "Packaging", "Repairs & Maintenance", "Misc"]} />
          <Input label="Description" placeholder="Brief details" value={exp.description} onChange={e => setExp({ ...exp, description: e.target.value })} />
          <Input label="Amount (₹)" type="number" value={exp.amount} onChange={e => setExp({ ...exp, amount: e.target.value })} />
          <Select label="Paid By" value={exp.paidBy} onChange={e => setExp({ ...exp, paidBy: e.target.value })}
            options={["Cash", "UPI", "Bank Account", "Credit Card"]} />
          <Btn loading={loading} onClick={submitExpense}>Save Expense</Btn>
        </Card>
      )}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardModule() {
  const configured = !!APPS_SCRIPT_URL;

  const steps = [
    { n: "1", title: "Create a Google Sheet", desc: "Open sheets.google.com and create a new blank spreadsheet. Name it 'Birista Tracker'." },
    { n: "2", title: "Open Apps Script", desc: "In your sheet, go to Extensions → Apps Script." },
    { n: "3", title: "Paste the script", desc: "Delete all existing code, paste the Apps Script code provided below, then Save." },
    { n: "4", title: "Deploy as Web App", desc: "Click Deploy → New Deployment → Web App. Set 'Execute as: Me' and 'Who has access: Anyone'. Click Deploy and copy the URL." },
    { n: "5", title: "URL already connected", desc: "This copy already has your Apps Script URL wired in — no further edits needed." },
  ];

  return (
    <div>
      <SectionTitle title="Birista Tracker" sub="Food manufacturing · Batch traceability · Real-time Google Sheets sync" />

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
        <KpiCard label="Status" value={configured ? "✓ Live" : "Setup Needed"} color={configured ? C.green : C.accent} />
        <KpiCard label="Sheets" value="8 tabs" color={C.blue} />
        <KpiCard label="Modules" value="5 active" color={C.accent} />
      </div>

      <div style={{ background: C.accentDim, border: `1px solid ${C.accent}50`, borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.accent, marginBottom: 4 }}>
          {configured ? "✓ Connected to Google Sheets" : "⚡ Setup Required"}
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>
          {configured
            ? "All form submissions are syncing live to your Google Sheet."
            : "Follow the 5 steps below to connect this app to your Google Sheet."}
        </div>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Setup Steps</div>

      {steps.map(s => (
        <div key={s.n} style={{ display: "flex", gap: 12, marginBottom: 14 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%", background: C.accent, color: "#000",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, flexShrink: 0
          }}>{s.n}</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{s.title}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{s.desc}</div>
          </div>
        </div>
      ))}

      <Divider />

      <div style={{ fontSize: 15, fontWeight: 700, color: C.text, marginBottom: 14 }}>Data Flow</div>
      {[
        ["🧅 Procurement", "Supplier → PO → Raw Lot (LOT-xxx)"],
        ["🏭 Production", "Lot → Batch (BR-xxx) → Yield %"],
        ["📦 Sales", "Batch → Order → Invoice (INV-xxx)"],
        ["📊 Inventory", "Packaging & Consumable stock levels"],
        ["💰 Finance", "Payments in/out · Daily expenses"],
      ].map(([mod, flow]) => (
        <div key={mod} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
          <span style={{ color: C.text, fontWeight: 600 }}>{mod}</span>
          <span style={{ color: C.muted }}>{flow}</span>
        </div>
      ))}
    </div>
  );
}

// ─── ROOT APP ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: "home", icon: "⚡", label: "Home" },
  { id: "procurement", icon: "🧅", label: "Buy" },
  { id: "production", icon: "🏭", label: "Produce" },
  { id: "sales", icon: "📦", label: "Sell" },
  { id: "inventory", icon: "🗃️", label: "Stock" },
  { id: "finance", icon: "💰", label: "Finance" },
];

export default function App() {
  const [page, setPage] = useState("home");
  const [toast, setToast] = useState({ msg: "", ok: true });

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast({ msg: "", ok: true }), 3000);
  };

  const renderPage = () => {
    const props = { toast: showToast };
    switch (page) {
      case "procurement": return <ProcurementModule {...props} />;
      case "production": return <ProductionModule {...props} />;
      case "sales": return <SalesModule {...props} />;
      case "inventory": return <InventoryModule {...props} />;
      case "finance": return <FinanceModule {...props} />;
      default: return <DashboardModule />;
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>
      {/* Header */}
      <div style={{
        position: "sticky", top: 0, zIndex: 100, background: C.surface,
        borderBottom: `1px solid ${C.border}`, padding: "12px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: C.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🧅</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, lineHeight: 1 }}>Birista Tracker</div>
            <div style={{ fontSize: 11, color: C.muted }}>Food Manufacturing ERP</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: !APPS_SCRIPT_URL ? C.accent : C.green, fontWeight: 700 }}>
          {!APPS_SCRIPT_URL ? "⚠ Demo Mode" : "● Live"}
        </div>
      </div>

      {/* Page Content */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "20px 16px 90px" }}>
        {renderPage()}
      </div>

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, background: C.surface,
        borderTop: `1px solid ${C.border}`, display: "flex", zIndex: 100
      }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id)} style={{
            flex: 1, background: "none", border: "none", padding: "10px 4px 8px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
            <div style={{ fontSize: 18, lineHeight: 1, opacity: page === n.id ? 1 : 0.5 }}>{n.icon}</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.04em", color: page === n.id ? C.accent : C.muted }}>
              {n.label.toUpperCase()}
            </div>
            {page === n.id && <div style={{ width: 18, height: 2, background: C.accent, borderRadius: 2 }} />}
          </button>
        ))}
      </div>

      <Toast msg={toast.msg} ok={toast.ok} />
    </div>
  );
}
