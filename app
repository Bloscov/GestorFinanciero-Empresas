/* =========================================================
   SIN NOMBRE ERP — MOTOR DE ESTADO, NAVEGACIÓN Y SIMULACIÓN
   ========================================================= */

const STORAGE_KEY = "sin_nombre_erp_state_v1";

const initialState = {
  activeView: "dashboard",
  period: "Mes",
  accounts: [
    { id: "acc-1", name: "BBVA Empresarial", type: "Cuenta de Cheques", number: "•••• 4821", balance: 684500.0, currency: "MXN" },
    { id: "acc-2", name: "Santander PyME", type: "Nómina y Operación", number: "•••• 9104", balance: 392400.0, currency: "MXN" },
    { id: "acc-3", name: "Tarjeta Corporativa", type: "Crédito / Liquidez", number: "•••• 3319", balance: 172000.0, currency: "MXN" }
  ],
  transactions: [
    { id: "tx-1", title: "Pago Factura #F-1042 — Grupo Alfa", sub: "Transferencia SPEI", type: "income", category: "Ventas B2B", account: "BBVA Empresarial", date: "25 Nov 2026", amount: 95400 },
    { id: "tx-2", title: "Amazon Web Services (AWS)", sub: "Cargo recurrente", type: "expense", category: "Software", account: "Tarjeta Corporativa", date: "24 Nov 2026", amount: 18250 },
    { id: "tx-3", title: "Dispersión Nómina Quincenal", sub: "12 colaboradores", type: "expense", category: "Nómina", account: "Santander PyME", date: "15 Nov 2026", amount: 142000 },
    { id: "tx-4", title: "Suscripción Anual — Cliente NorteSys", sub: "Contrato SaaS", type: "income", category: "Ventas B2B", account: "BBVA Empresarial", date: "11 Nov 2026", amount: 168000 },
    { id: "tx-5", title: "Renta Oficina & Servicios", sub: "Parque Corporativo", type: "expense", category: "Operación", account: "Santander PyME", date: "05 Nov 2026", amount: 64200 },
    { id: "tx-6", title: "Consultoría Implementación — RetailMx", sub: "Proyecto especial", type: "income", category: "Consultoría", account: "BBVA Empresarial", date: "02 Nov 2026", amount: 218900 }
  ],
  receivables: [
    { id: "rc-1", client: "Grupo Alfa", concept: "Factura #F-1048 — Soporte Q4", dueDate: "30 Nov 2026", amount: 86500, status: "Pendiente" },
    { id: "rc-2", client: "Logística del Valle", concept: "Factura #F-1049 — Licencia anual", dueDate: "05 Dic 2026", amount: 62000, status: "Pendiente" },
    { id: "rc-3", client: "Clínica San Ángel", concept: "Factura #F-1050 — Módulo analítica", dueDate: "12 Dic 2026", amount: 36000, status: "Por vencer" }
  ],
  payables: [
    { id: "py-1", vendor: "CloudFlare & Hosting", concept: "Servicios de red Noviembre", dueDate: "29 Nov 2026", amount: 19200, status: "Pendiente" },
    { id: "py-2", vendor: "Despacho Contable Fiscal", concept: "Cierre mensual y nómina", dueDate: "30 Nov 2026", amount: 24500, status: "Pendiente" },
    { id: "py-3", vendor: "Seguros Empresariales", concept: "Póliza equipo y oficina", dueDate: "04 Dic 2026", amount: 32500, status: "Programado" }
  ],
  periodMultipliers: {
    "Día": { factor: 0.04, label: "Hoy" },
    "Semana": { factor: 0.26, label: "Últimos 7 días" },
    "Mes": { factor: 1, label: "Noviembre 2026" },
    "Trimestre": { factor: 2.9, label: "Q4 2026" },
    "Año": { factor: 11.4, label: "Año Fiscal 2026" }
  },
  simulation: {
    expenseChangePct: 0,
    salesChangePct: 0,
    extraPayroll: 0,
    newDebt: 0,
    priceIncreasePct: 0
  }
};

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return structuredClone(initialState);
    const parsed = JSON.parse(saved);
    return {
      ...structuredClone(initialState),
      ...parsed,
      simulation: { ...initialState.simulation, ...(parsed.simulation || {}) }
    };
  } catch {
    return structuredClone(initialState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatMoney(num, showSign = false) {
  const absFormatted = Math.abs(num).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  if (showSign && num > 0) return `+$${absFormatted}`;
  if (num < 0) return `-$${absFormatted}`;
  return `$${absFormatted}`;
}

/* ---------------- CÁLCULOS FINANCIEROS CENTRALES ---------------- */
function getFinancialMetrics() {
  const mult = state.periodMultipliers[state.period]?.factor || 1;
  const totalBalance = state.accounts.reduce((acc, a) => acc + a.balance, 0);

  const baseIncome = state.transactions
    .filter((t) => t.type === "income")
    .reduce((acc, t) => acc + t.amount, 0);

  const baseExpense = state.transactions
    .filter((t) => t.type === "expense")
    .reduce((acc, t) => acc + t.amount, 0);

  const periodIncome = Math.round(baseIncome * mult);
  const periodExpense = Math.round(baseExpense * mult);
  const netCashFlow = periodIncome - periodExpense;

  const pendingReceivables = state.receivables
    .filter((r) => r.status !== "Cobrado")
    .reduce((acc, r) => acc + r.amount, 0);

  const pendingPayables = state.payables
    .filter((p) => p.status !== "Pagado")
    .reduce((acc, p) => acc + p.amount, 0);

  const categoryTotals = { Nómina: 0, Software: 0, Operación: 0 };
  state.transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      if (t.category === "Nómina") categoryTotals["Nómina"] += t.amount;
      else if (t.category === "Software") categoryTotals["Software"] += t.amount;
      else categoryTotals["Operación"] += t.amount;
    });

  const totalCat = Object.values(categoryTotals).reduce((a, b) => a + b, 0) || 1;
  const pctNomina = Math.round((categoryTotals["Nómina"] / totalCat) * 100);
  const pctSoftware = Math.round((categoryTotals["Software"] / totalCat) * 100);
  const pctOperacion = Math.max(0, 100 - pctNomina - pctSoftware);

  return {
    totalBalance,
    periodIncome,
    periodExpense,
    netCashFlow,
    pendingReceivables,
    pendingPayables,
    categoryTotals,
    pctNomina,
    pctSoftware,
    pctOperacion,
    runwayMonths: periodExpense > 0 ? (totalBalance / periodExpense).toFixed(1) : "24.0"
  };
}

function getSimulatedMetrics(realMetrics) {
  const { expenseChangePct, salesChangePct, extraPayroll, newDebt, priceIncreasePct } = state.simulation;

  // Efecto combinado de volumen de ventas y ajuste de precios (con leve elasticidad)
  const effectiveSalesMultiplier =
    (1 + salesChangePct / 100) * (1 + (priceIncreasePct / 100) * 0.75);

  const simIncome = Math.round(realMetrics.periodIncome * effectiveSalesMultiplier);
  const simExpense = Math.round(
    realMetrics.periodExpense * (1 + expenseChangePct / 100) + extraPayroll
  );
  const simNetFlow = simIncome - simExpense;
  const simBalance = Math.round(realMetrics.totalBalance + simNetFlow + newDebt);
  const deltaBalance = simBalance - realMetrics.totalBalance;

  return {
    simIncome,
    simExpense,
    simNetFlow,
    simBalance,
    deltaBalance
  };
}

/* ---------------- NAVEGACIÓN ENTRE VISTAS ---------------- */
function setActiveView(viewName) {
  state.activeView = viewName;
  saveState();

  document.querySelectorAll(".sidebar-nav .nav-item").forEach((link) => {
    const target = link.getAttribute("href")?.replace("#", "");
    link.classList.toggle("active", target === viewName);
  });

  document.querySelectorAll(".app-view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });

  renderCurrentView();
}

function renderCurrentView() {
  const metrics = getFinancialMetrics();

  // Actualizar botones de periodo activos
  document.querySelectorAll(".period-filter .filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.period === state.period);
  });

  renderDashboard(metrics);
  renderMoneyFlow(metrics);
  renderSimulator(metrics);
  renderAccounts(metrics);
  renderTransactions();
  renderReceivables(metrics);
  renderPayables(metrics);
}

/* ---------------- RENDER: DASHBOARD ---------------- */
function renderDashboard(m) {
  const setText = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText("kpi-balance-value", formatMoney(m.totalBalance));
  setText("kpi-income-value", formatMoney(m.periodIncome));
  setText("kpi-expense-value", formatMoney(m.periodExpense));

  const flowEl = document.getElementById("kpi-flow-value");
  if (flowEl) {
    flowEl.textContent = formatMoney(m.netCashFlow, true);
    flowEl.classList.toggle("positive-text", m.netCashFlow >= 0);
    flowEl.classList.toggle("negative-text", m.netCashFlow < 0);
  }

  setText("kpi-flow-badge", formatMoney(m.netCashFlow, true));
  setText("kpi-runway-text", `Runway estimado: ${m.runwayMonths} meses • Periodo: ${state.period}`);

  const margin = m.periodIncome > 0
    ? (((m.periodIncome - m.periodExpense) / m.periodIncome) * 100).toFixed(1)
    : "0.0";
  setText("kpi-margin-text", `Margen operativo neto: ${margin}%`);

  setText("ob-receivables-amount", formatMoney(m.pendingReceivables));
  setText("ob-payables-amount", formatMoney(m.pendingPayables));
  setText(
    "flow-summary-line",
    `Nómina (${m.pctNomina}%) • Software (${m.pctSoftware}%) • Operación (${m.pctOperacion}%)`
  );

  // Últimas 4 transacciones en el dashboard
  const dashTxBody = document.getElementById("dashboard-tx-body");
  if (dashTxBody) {
    dashTxBody.innerHTML = state.transactions
      .slice(0, 4)
      .map(
        (tx) => `
        <tr>
          <td>
            <div class="tx-entity">
              <span class="tx-icon ${tx.type === "income" ? "in" : "out"}">${tx.type === "income" ? "↓" : "↑"}</span>
              <div>
                <strong>${escapeHtml(tx.title)}</strong>
                <span class="tx-sub">${escapeHtml(tx.sub)}</span>
              </div>
            </div>
          </td>
          <td><span class="badge ${tx.type === "income" ? "badge-income" : "badge-neutral"}">${escapeHtml(tx.category)}</span></td>
          <td>${escapeHtml(tx.account)}</td>
          <td>${escapeHtml(tx.date)}</td>
          <td class="text-right mono ${tx.type === "income" ? "positive-text" : ""}">${tx.type === "income" ? "+" : "-"}${formatMoney(tx.amount)}</td>
        </tr>
      `
      )
      .join("");
  }
}

/* ---------------- RENDER: MONEY FLOW (DIAGRAMA INTERACTIVO) ---------------- */
function renderMoneyFlow(m) {
  const container = document.getElementById("money-flow-diagram");
  if (!container) return;

  const totalOut = Math.max(m.periodExpense, 1);
  const nominaAmt = Math.round(m.periodExpense * (m.pctNomina / 100));
  const softwareAmt = Math.round(m.periodExpense * (m.pctSoftware / 100));
  const operacionAmt = Math.max(0, m.periodExpense - nominaAmt - softwareAmt);

  container.innerHTML = `
    <div class="flow-columns">
      <div class="flow-col">
        <h3>1. Fuentes de Ingreso</h3>
        <button class="flow-node income-node" onclick="inspectFlowNode('Ventas B2B y Contratos', ${Math.round(m.periodIncome * 0.68)}, 'Ingreso recurrente por clientes empresariales y suscripciones.')">
          <span>Ventas B2B y Contratos</span>
          <strong class="mono">${formatMoney(Math.round(m.periodIncome * 0.68))}</strong>
        </button>
        <button class="flow-node income-node" onclick="inspectFlowNode('Consultoría y Proyectos', ${Math.round(m.periodIncome * 0.32)}, 'Ingresos por implementaciones y proyectos especializados.')">
          <span>Consultoría y Proyectos</span>
          <strong class="mono">${formatMoney(Math.round(m.periodIncome * 0.32))}</strong>
        </button>
      </div>

      <div class="flow-col center-hub">
        <div class="flow-pipe">→ Flujo Consolidado →</div>
        <div class="hub-card" onclick="inspectFlowNode('Caja Operativa TecnoCloud', ${m.periodIncome}, 'Total de entradas captadas en el periodo ${state.period}.')">
          <span class="hub-tag">NÚCLEO FINANCIERO</span>
          <strong class="mono">${formatMoney(m.periodIncome)}</strong>
          <small>Entradas del periodo (${state.period})</small>
        </div>
        <div class="flow-pipe">→ Distribución →</div>
      </div>

      <div class="flow-col">
        <h3>2. Destino del Capital</h3>
        <button class="flow-node expense-node" onclick="inspectFlowNode('Nómina y Talento (${m.pctNomina}%)', ${nominaAmt}, 'Sueldos, prestaciones y dispersión quincenal.')">
          <span>Nómina (${m.pctNomina}%)</span>
          <strong class="mono">${formatMoney(nominaAmt)}</strong>
        </button>
        <button class="flow-node expense-node" onclick="inspectFlowNode('Software e Infraestructura (${m.pctSoftware}%)', ${softwareAmt}, 'Servidores cloud, licencias SaaS y herramientas.')">
          <span>Software (${m.pctSoftware}%)</span>
          <strong class="mono">${formatMoney(softwareAmt)}</strong>
        </button>
        <button class="flow-node expense-node" onclick="inspectFlowNode('Operación y Oficina (${m.pctOperacion}%)', ${operacionAmt}, 'Arrendamiento, servicios, contabilidad y gastos generales.')">
          <span>Operación (${m.pctOperacion}%)</span>
          <strong class="mono">${formatMoney(operacionAmt)}</strong>
        </button>
        <button class="flow-node reserve-node" onclick="inspectFlowNode('Retención / Flujo Neto', ${m.netCashFlow}, 'Capital remanente tras cubrir egresos operativos del periodo.')">
          <span>Flujo Neto / Reserva</span>
          <strong class="mono">${formatMoney(m.netCashFlow, true)}</strong>
        </button>
      </div>
    </div>
  `;
}

function inspectFlowNode(title, amount, description) {
  const detailBox = document.getElementById("flow-node-inspector");
  if (!detailBox) return;
  detailBox.innerHTML = `
    <div>
      <span class="inspector-kicker">DETALLE DE FLUJO SELECCIONADO</span>
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(description)}</p>
    </div>
    <div class="inspector-amount mono">${formatMoney(amount, true)}</div>
  `;
}

/* ---------------- RENDER: SIMULADOR FINANCIERO ---------------- */
function renderSimulator(m) {
  const sim = getSimulatedMetrics(m);

  const syncSlider = (inputId, labelId, suffix = "") => {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    if (input) input.value = state.simulation[input.dataset.simKey];
    if (label) label.textContent = `${state.simulation[input.dataset.simKey] > 0 && suffix === "%" ? "+" : ""}${state.simulation[input.dataset.simKey]}${suffix}`;
  };

  syncSlider("sim-expense-pct", "sim-expense-pct-val", "%");
  syncSlider("sim-sales-pct", "sim-sales-pct-val", "%");
  syncSlider("sim-price-pct", "sim-price-pct-val", "%");

  const payrollInput = document.getElementById("sim-extra-payroll");
  const debtInput = document.getElementById("sim-new-debt");
  if (payrollInput) payrollInput.value = state.simulation.extraPayroll;
  if (debtInput) debtInput.value = state.simulation.newDebt;

  document.getElementById("sim-real-balance").textContent = formatMoney(m.totalBalance);
  document.getElementById("sim-proj-balance").textContent = formatMoney(sim.simBalance);

  const deltaEl = document.getElementById("sim-delta-balance");
  deltaEl.textContent = formatMoney(sim.deltaBalance, true);
  deltaEl.className = `mono ${sim.deltaBalance >= 0 ? "positive-text" : "negative-text"}`;

  document.getElementById("sim-proj-income").textContent = formatMoney(sim.simIncome);
  document.getElementById("sim-proj-expense").textContent = formatMoney(sim.simExpense);
  document.getElementById("sim-proj-flow").textContent = formatMoney(sim.simNetFlow, true);

  // Barras comparativas
  const maxVal = Math.max(m.totalBalance, sim.simBalance, 1);
  const realBar = document.getElementById("sim-bar-real");
  const projBar = document.getElementById("sim-bar-proj");
  if (realBar) realBar.style.width = `${Math.min(100, Math.round((m.totalBalance / maxVal) * 100))}%`;
  if (projBar) {
    projBar.style.width = `${Math.min(100, Math.max(4, Math.round((Math.max(0, sim.simBalance) / maxVal) * 100)))}%`;
    projBar.classList.toggle("danger", sim.simBalance < m.totalBalance);
  }

  const verdict = document.getElementById("sim-verdict-banner");
  if (verdict) {
    if (sim.simNetFlow < 0) {
      verdict.className = "sim-verdict alert-danger";
      verdict.textContent = "⚠️ Escenario con flujo negativo: tus egresos simulados superan los ingresos proyectados. Revisa costos o precios.";
    } else if (sim.deltaBalance < 0) {
      verdict.className = "sim-verdict alert-warn";
      verdict.textContent = "📉 Impacto moderado: el flujo del periodo sigue positivo, pero reduce el balance acumulado frente al escenario actual.";
    } else {
      verdict.className = "sim-verdict alert-ok";
      verdict.textContent = "✅ Escenario favorable: la simulación fortalece o mantiene tu liquidez sin modificar los datos reales de TecnoCloud S.A.";
    }
  }
}

/* ---------------- RENDER: CUENTAS, TRANSACCIONES, COBRAR Y PAGAR ---------------- */
function renderAccounts(m) {
  const grid = document.getElementById("accounts-grid");
  const totalEl = document.getElementById("accounts-total-balance");
  if (totalEl) totalEl.textContent = formatMoney(m.totalBalance);
  if (!grid) return;

  grid.innerHTML = state.accounts
    .map(
      (acc) => `
      <article class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-label">${escapeHtml(acc.type)}</span>
          <span class="badge badge-neutral">${escapeHtml(acc.number)}</span>
        </div>
        <h3 style="font-size: 16px; margin-bottom: 6px;">${escapeHtml(acc.name)}</h3>
        <div class="kpi-value mono">${formatMoney(acc.balance)}</div>
        <div class="kpi-subtext">Moneda: ${escapeHtml(acc.currency)} • Activa</div>
      </article>
    `
    )
    .join("");
}

function renderTransactions() {
  const tbody = document.getElementById("all-tx-body");
  if (!tbody) return;

  const filterType = document.getElementById("tx-filter-type")?.value || "all";
  const searchTerm = (document.getElementById("tx-search-input")?.value || "").toLowerCase().trim();

  const filtered = state.transactions.filter((tx) => {
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesText =
      !searchTerm ||
      tx.title.toLowerCase().includes(searchTerm) ||
      tx.category.toLowerCase().includes(searchTerm) ||
      tx.account.toLowerCase().includes(searchTerm);
    return matchesType && matchesText;
  });

  tbody.innerHTML = filtered
    .map(
      (tx) => `
      <tr>
        <td>
          <div class="tx-entity">
            <span class="tx-icon ${tx.type === "income" ? "in" : "out"}">${tx.type === "income" ? "↓" : "↑"}</span>
            <div>
              <strong>${escapeHtml(tx.title)}</strong>
              <span class="tx-sub">${escapeHtml(tx.sub)}</span>
            </div>
          </div>
        </td>
        <td><span class="badge ${tx.type === "income" ? "badge-income" : "badge-neutral"}">${escapeHtml(tx.category)}</span></td>
        <td>${escapeHtml(tx.account)}</td>
        <td>${escapeHtml(tx.date)}</td>
        <td class="text-right mono ${tx.type === "income" ? "positive-text" : ""}">${tx.type === "income" ? "+" : "-"}${formatMoney(tx.amount)}</td>
      </tr>
    `
    )
    .join("");
}

function renderReceivables(m) {
  const tbody = document.getElementById("receivables-body");
  const totalEl = document.getElementById("receivables-total");
  if (totalEl) totalEl.textContent = formatMoney(m.pendingReceivables);
  if (!tbody) return;

  tbody.innerHTML = state.receivables
    .map(
      (item) => `
      <tr>
        <td><strong>${escapeHtml(item.client)}</strong></td>
        <td>${escapeHtml(item.concept)}</td>
        <td>${escapeHtml(item.dueDate)}</td>
        <td><span class="badge ${item.status === "Cobrado" ? "badge-income" : "badge-warning"}">${escapeHtml(item.status)}</span></td>
        <td class="text-right mono">${formatMoney(item.amount)}</td>
        <td class="text-right">
          ${
            item.status !== "Cobrado"
              ? `<button class="btn-secondary" onclick="markReceivablePaid('${item.id}')">Registrar cobro</button>`
              : `<span class="tx-sub">Conciliado</span>`
          }
        </td>
      </tr>
    `
    )
    .join("");
}

function renderPayables(m) {
  const tbody = document.getElementById("payables-body");
  const totalEl = document.getElementById("payables-total");
  if (totalEl) totalEl.textContent = formatMoney(m.pendingPayables);
  if (!tbody) return;

  tbody.innerHTML = state.payables
    .map(
      (item) => `
      <tr>
        <td><strong>${escapeHtml(item.vendor)}</strong></td>
        <td>${escapeHtml(item.concept)}</td>
        <td>${escapeHtml(item.dueDate)}</td>
        <td><span class="badge ${item.status === "Pagado" ? "badge-income" : "badge-neutral"}">${escapeHtml(item.status)}</span></td>
        <td class="text-right mono">${formatMoney(item.amount)}</td>
        <td class="text-right">
          ${
            item.status !== "Pagado"
              ? `<button class="btn-secondary" onclick="markPayablePaid('${item.id}')">Pagar ahora</button>`
              : `<span class="tx-sub">Liquidado</span>`
          }
        </td>
      </tr>
    `
    )
    .join("");
}

/* ---------------- ACCIONES REALES DEL USUARIO ---------------- */
function markReceivablePaid(id) {
  const item = state.receivables.find((r) => r.id === id);
  if (!item || item.status === "Cobrado") return;

  item.status = "Cobrado";
  state.accounts[0].balance += item.amount;
  state.transactions.unshift({
    id: `tx-${Date.now()}`,
    title: `Cobro ${item.client} — ${item.concept}`,
    sub: "Cuenta por cobrar conciliada",
    type: "income",
    category: "Ventas B2B",
    account: state.accounts[0].name,
    date: "Hoy",
    amount: item.amount
  });

  saveState();
  renderCurrentView();
}

function markPayablePaid(id) {
  const item = state.payables.find((p) => p.id === id);
  if (!item || item.status === "Pagado") return;

  item.status = "Pagado";
  state.accounts[1].balance -= item.amount;
  state.transactions.unshift({
    id: `tx-${Date.now()}`,
    title: `Pago ${item.vendor} — ${item.concept}`,
    sub: "Obligación cubierta",
    type: "expense",
    category: "Operación",
    account: state.accounts[1].name,
    date: "Hoy",
    amount: item.amount
  });

  saveState();
  renderCurrentView();
}

function openModal(open = true) {
  const modal = document.getElementById("tx-modal");
  if (modal) modal.classList.toggle("open", open);
}

function handleNewTransaction(e) {
  e.preventDefault();
  const title = document.getElementById("new-tx-title").value.trim();
  const type = document.getElementById("new-tx-type").value;
  const category = document.getElementById("new-tx-category").value;
  const accountName = document.getElementById("new-tx-account").value;
  const amount = parseFloat(document.getElementById("new-tx-amount").value);

  if (!title || isNaN(amount) || amount <= 0) return;

  const acc = state.accounts.find((a) => a.name === accountName) || state.accounts[0];
  if (type === "income") {
    acc.balance += amount;
  } else {
    acc.balance -= amount;
  }

  state.transactions.unshift({
    id: `tx-${Date.now()}`,
    title,
    sub: "Registro manual en ERP",
    type,
    category,
    account: acc.name,
    date: "Hoy",
    amount
  });

  saveState();
  e.target.reset();
  openModal(false);
  renderCurrentView();
}

function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY);
  state = structuredClone(initialState);
  renderCurrentView();
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ---------------- INICIALIZACIÓN DE EVENTOS ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Navegación del sidebar y enlaces internos con hash
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetView = link.getAttribute("href").replace("#", "");
      const viewExists = document.getElementById(`view-${targetView}`);
      if (viewExists) {
        e.preventDefault();
        setActiveView(targetView);
      }
    });
  });

  // Botones de periodo (Día, Semana, Mes, Trimestre, Año)
  document.querySelectorAll(".period-filter .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.period = btn.dataset.period;
      saveState();
      renderCurrentView();
    });
  });

  // Botón + Nuevo Movimiento y Modal
  document.getElementById("btn-open-modal")?.addEventListener("click", () => openModal(true));
  document.getElementById("btn-close-modal")?.addEventListener("click", () => openModal(false));
  document.getElementById("tx-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "tx-modal") openModal(false);
  });
  document.getElementById("new-tx-form")?.addEventListener("submit", handleNewTransaction);

  // Filtros de transacciones
  document.getElementById("tx-filter-type")?.addEventListener("change", renderTransactions);
  document.getElementById("tx-search-input")?.addEventListener("input", renderTransactions);

  // Controles del Simulador Financiero
  document.querySelectorAll("[data-sim-key]").forEach((ctrl) => {
    ctrl.addEventListener("input", (e) => {
      const key = e.target.dataset.simKey;
      state.simulation[key] = parseFloat(e.target.value) || 0;
      renderSimulator(getFinancialMetrics());
    });
  });

  document.getElementById("btn-reset-sim")?.addEventListener("click", () => {
    state.simulation = {
      expenseChangePct: 0,
      salesChangePct: 0,
      extraPayroll: 0,
      newDebt: 0,
      priceIncreasePct: 0
    };
    renderSimulator(getFinancialMetrics());
  });

  document.getElementById("btn-reset-demo")?.addEventListener("click", resetDemoData);

  // Render inicial
  setActiveView(state.activeView || "dashboard");
});
