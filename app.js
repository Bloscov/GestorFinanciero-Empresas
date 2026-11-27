/* =========================================================
SIN NOMBRE ERP — LOGIN, MULTICUENTA, ESTADO Y SIMULACIÓN
   ========================================================= */

const AUTH_STORAGE_KEY = "sin_nombre_erp_auth_v2";

function createCompanyState(companyName, initialBalance = 250000, isDemo = false) {
  if (isDemo) {
    return {
      activeView: "dashboard",
      activeObTab: "receivables",
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
        { id: "tx-4", title: "Suscripción Anual — NorteSys", sub: "Contrato SaaS", type: "income", category: "Ventas B2B", account: "BBVA Empresarial", date: "11 Nov 2026", amount: 168000 },
        { id: "tx-5", title: "Renta Oficina & Servicios", sub: "Parque Corporativo", type: "expense", category: "Operación", account: "Santander PyME", date: "05 Nov 2026", amount: 64200 }
      ],
      receivables: [
        { id: "rc-1", client: "Grupo Alfa", concept: "Factura #F-1048 — Soporte Q4", dueDate: "30 Nov 2026", amount: 86500, status: "Pendiente" },
        { id: "rc-2", client: "Logística del Valle", concept: "Factura #F-1049 — Licencia anual", dueDate: "05 Dic 2026", amount: 62000, status: "Pendiente" }
      ],
      payables: [
        { id: "py-1", vendor: "CloudFlare & Hosting", concept: "Servicios de red Noviembre", dueDate: "29 Nov 2026", amount: 19200, status: "Pendiente" },
        { id: "py-2", vendor: "Despacho Contable Fiscal", concept: "Cierre mensual y nómina", dueDate: "30 Nov 2026", amount: 24500, status: "Pendiente" }
      ],
      simulation: { expenseChangePct: 0, salesChangePct: 0, extraPayroll: 0, newDebt: 0, priceIncreasePct: 0 }
    };
  }

  return {
    activeView: "dashboard",
    activeObTab: "receivables",
    period: "Mes",
    accounts: [
      { id: "acc-1", name: `Cuenta Principal ${companyName}`, type: "Cuenta de Cheques", number: "•••• 1001", balance: initialBalance, currency: "MXN" }
    ],
    transactions: [
      { id: "tx-init", title: "Aportación inicial de capital", sub: "Apertura de cuenta", type: "income", category: "Ventas B2B", account: `Cuenta Principal ${companyName}`, date: "Hoy", amount: initialBalance }
    ],
    receivables: [],
    payables: [],
    simulation: { expenseChangePct: 0, salesChangePct: 0, extraPayroll: 0, newDebt: 0, priceIncreasePct: 0 }
  };
}

const PERIOD_MULTIPLIERS = {
  "Día": 0.04,
  "Semana": 0.26,
  "Mes": 1,
  "Trimestre": 2.9,
  "Año": 11.4
};

const defaultAuthStore = {
  currentUserEmail: null,
  users: [
    {
      email: "admin@tecnocloud.mx",
      password: "123456",
      company: "TecnoCloud S.A.",
      data: createCompanyState("TecnoCloud S.A.", 0, true)
    },
    {
      email: "finanzas@nortesys.mx",
      password: "123456",
      company: "NorteSys Corp.",
      data: createCompanyState("NorteSys Corp.", 540000, false)
    }
  ]
};

let authStore = loadAuthStore();

function loadAuthStore() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return structuredClone(defaultAuthStore);
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.users) || parsed.users.length === 0) return structuredClone(defaultAuthStore);
    return parsed;
  } catch {
    return structuredClone(defaultAuthStore);
  }
}

function saveAuthStore() {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authStore));
}

function getCurrentUser() {
  return authStore.users.find((u) => u.email === authStore.currentUserEmail) || null;
}

function getState() {
  const user = getCurrentUser();
  return user ? user.data : null;
}

function formatMoney(num, showSign = false) {
  const absFormatted = Math.abs(num).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (showSign && num > 0) return `+$${absFormatted}`;
  if (num < 0) return `-$${absFormatted}`;
  return `$${absFormatted}`;
}

function escapeHtml(str) {
  return String(str).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function getInitials(name) {
  return name.split(" ").map((w) => w[0]).join("").substring(0, 2).toUpperCase();
}

/* ---------------- AUTENTICACIÓN Y CAMBIO DE CUENTAS ---------------- */
function updateAuthUI() {
  const user = getCurrentUser();
  const authScreen = document.getElementById("auth-screen");
  const appShell = document.getElementById("app-shell");

  if (!user) {
    authScreen.classList.remove("hidden");
    appShell.classList.add("hidden");
    return;
  }

  authScreen.classList.add("hidden");
  appShell.classList.remove("hidden");

  document.getElementById("sidebar-company-avatar").textContent = getInitials(user.company);
  document.getElementById("sidebar-company-name").textContent = user.company;
  document.getElementById("sidebar-company-email").textContent = user.email;
  document.getElementById("topbar-company-name").textContent = user.company;

  renderCompanySwitcherList();
  setActiveView(user.data.activeView || "dashboard");
}

function renderCompanySwitcherList() {
  const container = document.getElementById("company-accounts-list");
  if (!container) return;

  container.innerHTML = authStore.users
    .map(
      (u) => `
      <button type="button" class="dropdown-account-item ${u.email === authStore.currentUserEmail ? "active" : ""}" onclick="switchUserAccount('${u.email}')">
        <span>${escapeHtml(u.company)}</span>
        <span>${u.email === authStore.currentUserEmail ? "✓" : ""}</span>
      </button>
    `
    )
    .join("");
}

function switchUserAccount(email) {
  authStore.currentUserEmail = email;
  saveAuthStore();
  document.getElementById("company-dropdown")?.classList.remove("open");
  updateAuthUI();
}

function logoutUser(openRegister = false) {
  authStore.currentUserEmail = null;
  saveAuthStore();
  document.getElementById("company-dropdown")?.classList.remove("open");
  updateAuthUI();
  switchAuthTab(openRegister ? "register" : "login");
}

function switchAuthTab(tabName) {
  document.querySelectorAll(".auth-tab").forEach((b) => b.classList.toggle("active", b.dataset.authTab === tabName));
  document.getElementById("login-form").classList.toggle("active", tabName === "login");
  document.getElementById("register-form").classList.toggle("active", tabName === "register");
  document.getElementById("login-error").textContent = "";
  document.getElementById("register-error").textContent = "";
}

/* ---------------- CÁLCULOS FINANCIEROS ---------------- */
function getFinancialMetrics() {
  const state = getState();
  const mult = PERIOD_MULTIPLIERS[state.period] || 1;
  const totalBalance = state.accounts.reduce((acc, a) => acc + a.balance, 0);

  const baseIncome = state.transactions.filter((t) => t.type === "income").reduce((acc, t) => acc + t.amount, 0);
  const baseExpense = state.transactions.filter((t) => t.type === "expense").reduce((acc, t) => acc + t.amount, 0);

  const periodIncome = Math.round(baseIncome * mult);
  const periodExpense = Math.round(baseExpense * mult);
  const netCashFlow = periodIncome - periodExpense;

  const pendingReceivables = state.receivables.filter((r) => r.status !== "Cobrado").reduce((acc, r) => acc + r.amount, 0);
  const pendingPayables = state.payables.filter((p) => p.status !== "Pagado").reduce((acc, p) => acc + p.amount, 0);

  const categoryTotals = { Nómina: 0, Software: 0, Operación: 0 };
  state.transactions.filter((t) => t.type === "expense").forEach((t) => {
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
    pctNomina,
    pctSoftware,
    pctOperacion,
    runwayMonths: periodExpense > 0 ? (totalBalance / periodExpense).toFixed(1) : "24.0"
  };
}

function getSimulatedMetrics(realMetrics) {
  const { expenseChangePct, salesChangePct, extraPayroll, newDebt, priceIncreasePct } = getState().simulation;
  const effectiveSalesMultiplier = (1 + salesChangePct / 100) * (1 + (priceIncreasePct / 100) * 0.75);
  const simIncome = Math.round(realMetrics.periodIncome * effectiveSalesMultiplier);
  const simExpense = Math.round(realMetrics.periodExpense * (1 + expenseChangePct / 100) + extraPayroll);
  const simNetFlow = simIncome - simExpense;
  const simBalance = Math.round(realMetrics.totalBalance + simNetFlow + newDebt);
  return { simIncome, simExpense, simNetFlow, simBalance, deltaBalance: simBalance - realMetrics.totalBalance };
}

/* ---------------- NAVEGACIÓN Y RENDERIZADO ---------------- */
function setActiveView(viewName) {
  const state = getState();
  if (!state) return;

  state.activeView = viewName;
  saveAuthStore();

  document.querySelectorAll(".sidebar-nav .nav-item").forEach((link) => {
    link.classList.toggle("active", link.getAttribute("href")?.replace("#", "") === viewName);
  });

  document.querySelectorAll(".app-view").forEach((view) => {
    view.classList.toggle("active", view.id === `view-${viewName}`);
  });

  renderCurrentView();
}

function setActiveObTab(tabName) {
  const state = getState();
  if (!state) return;
  state.activeObTab = tabName;
  saveAuthStore();

  document.querySelectorAll(".module-tab").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.obPanel === tabName);
  });
  document.querySelectorAll(".ob-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === `ob-panel-${tabName}`);
  });
}

function renderCurrentView() {
  const state = getState();
  if (!state) return;
  const metrics = getFinancialMetrics();

  document.querySelectorAll(".period-filter .filter-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.period === state.period);
  });

  renderDashboard(metrics);
  renderSimulator(metrics);
  renderAccounts(metrics);
  renderTransactions();
  renderObligations(metrics);
  populateAccountSelect();
}

function renderDashboard(m) {
  const state = getState();
  const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };

  setText("kpi-balance-value", formatMoney(m.totalBalance));
  setText("kpi-accounts-count", `Distribuido en ${state.accounts.length} cuenta(s) bancaria(s)`);
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

  const margin = m.periodIncome > 0 ? (((m.periodIncome - m.periodExpense) / m.periodIncome) * 100).toFixed(1) : "0.0";
  setText("kpi-margin-text", `Margen operativo neto: ${margin}%`);

  setText("ob-receivables-amount", formatMoney(m.pendingReceivables));
  setText("ob-payables-amount", formatMoney(m.pendingPayables));
  setText("flow-summary-line", `Nómina (${m.pctNomina}%) • Software (${m.pctSoftware}%) • Operación (${m.pctOperacion}%)`);

  const dashTxBody = document.getElementById("dashboard-tx-body");
  if (dashTxBody) {
    dashTxBody.innerHTML = state.transactions.slice(0, 4).map(renderTxRow).join("");
  }
}

function renderTxRow(tx) {
  return `
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
  `;
}

function renderSimulator(m) {
  const state = getState();
  const sim = getSimulatedMetrics(m);

  const syncSlider = (inputId, labelId) => {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const val = state.simulation[input.dataset.simKey];
    if (input) input.value = val;
    if (label) label.textContent = `${val > 0 ? "+" : ""}${val}%`;
  };

  syncSlider("sim-expense-pct", "sim-expense-pct-val");
  syncSlider("sim-sales-pct", "sim-sales-pct-val");
  syncSlider("sim-price-pct", "sim-price-pct-val");

  document.getElementById("sim-extra-payroll").value = state.simulation.extraPayroll;
  document.getElementById("sim-new-debt").value = state.simulation.newDebt;
  document.getElementById("sim-real-balance").textContent = formatMoney(m.totalBalance);
  document.getElementById("sim-proj-balance").textContent = formatMoney(sim.simBalance);

  const deltaEl = document.getElementById("sim-delta-balance");
  deltaEl.textContent = formatMoney(sim.deltaBalance, true);
  deltaEl.className = `mono ${sim.deltaBalance >= 0 ? "positive-text" : "negative-text"}`;

  document.getElementById("sim-proj-income").textContent = formatMoney(sim.simIncome);
  document.getElementById("sim-proj-expense").textContent = formatMoney(sim.simExpense);
  document.getElementById("sim-proj-flow").textContent = formatMoney(sim.simNetFlow, true);

  const maxVal = Math.max(m.totalBalance, sim.simBalance, 1);
  document.getElementById("sim-bar-real").style.width = `${Math.min(100, Math.round((m.totalBalance / maxVal) * 100))}%`;
  const projBar = document.getElementById("sim-bar-proj");
  projBar.style.width = `${Math.min(100, Math.max(4, Math.round((Math.max(0, sim.simBalance) / maxVal) * 100)))}%`;
  projBar.classList.toggle("danger", sim.simBalance < m.totalBalance);

  const verdict = document.getElementById("sim-verdict-banner");
  if (sim.simNetFlow < 0) {
    verdict.className = "sim-verdict alert-danger";
    verdict.textContent = "⚠️ Escenario con flujo negativo: tus egresos simulados superan los ingresos proyectados.";
  } else if (sim.deltaBalance < 0) {
    verdict.className = "sim-verdict alert-warn";
    verdict.textContent = "📉 Impacto moderado: el flujo sigue positivo, pero reduce el balance acumulado.";
  } else {
    verdict.className = "sim-verdict alert-ok";
    verdict.textContent = "✅ Escenario favorable: la simulación fortalece o mantiene tu liquidez sin alterar los datos reales.";
  }
}

function renderAccounts(m) {
  const state = getState();
  document.getElementById("accounts-total-balance").textContent = formatMoney(m.totalBalance);
  document.getElementById("accounts-grid").innerHTML = state.accounts
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

function populateAccountSelect() {
  const select = document.getElementById("new-tx-account");
  if (!select) return;
  select.innerHTML = getState().accounts
    .map((acc) => `<option value="${escapeHtml(acc.name)}">${escapeHtml(acc.name)}</option>`)
    .join("");
}

function renderTransactions() {
  const tbody = document.getElementById("all-tx-body");
  if (!tbody) return;
  const filterType = document.getElementById("tx-filter-type")?.value || "all";
  const searchTerm = (document.getElementById("tx-search-input")?.value || "").toLowerCase().trim();

  const filtered = getState().transactions.filter((tx) => {
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesText = !searchTerm || tx.title.toLowerCase().includes(searchTerm) || tx.category.toLowerCase().includes(searchTerm) || tx.account.toLowerCase().includes(searchTerm);
    return matchesType && matchesText;
  });

  tbody.innerHTML = filtered.map(renderTxRow).join("");
}

function renderObligations(m) {
  const state = getState();
  document.getElementById("tab-receivables-total").textContent = formatMoney(m.pendingReceivables);
  document.getElementById("tab-payables-total").textContent = formatMoney(m.pendingPayables);
  setActiveObTab(state.activeObTab || "receivables");

  document.getElementById("receivables-body").innerHTML = state.receivables
    .map(
      (item) => `
      <tr>
        <td><strong>${escapeHtml(item.client)}</strong></td>
        <td>${escapeHtml(item.concept)}</td>
        <td>${escapeHtml(item.dueDate)}</td>
        <td><span class="badge ${item.status === "Cobrado" ? "badge-income" : "badge-warning"}">${escapeHtml(item.status)}</span></td>
        <td class="text-right mono">${formatMoney(item.amount)}</td>
        <td class="text-right">
          ${item.status !== "Cobrado" ? `<button class="btn-secondary" onclick="markReceivablePaid('${item.id}')">Registrar cobro</button>` : `<span class="tx-sub">Conciliado</span>`}
        </td>
      </tr>
    `
    )
    .join("");

  document.getElementById("payables-body").innerHTML = state.payables
    .map(
      (item) => `
      <tr>
        <td><strong>${escapeHtml(item.vendor)}</strong></td>
        <td>${escapeHtml(item.concept)}</td>
        <td>${escapeHtml(item.dueDate)}</td>
        <td><span class="badge ${item.status === "Pagado" ? "badge-income" : "badge-neutral"}">${escapeHtml(item.status)}</span></td>
        <td class="text-right mono">${formatMoney(item.amount)}</td>
        <td class="text-right">
          ${item.status !== "Pagado" ? `<button class="btn-secondary" onclick="markPayablePaid('${item.id}')">Pagar ahora</button>` : `<span class="tx-sub">Liquidado</span>`}
        </td>
      </tr>
    `
    )
    .join("");
}

/* ---------------- ACCIONES DEL USUARIO ---------------- */
function markReceivablePaid(id) {
  const state = getState();
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

  saveAuthStore();
  renderCurrentView();
}

function markPayablePaid(id) {
  const state = getState();
  const item = state.payables.find((p) => p.id === id);
  if (!item || item.status === "Pagado") return;

  const targetAcc = state.accounts[1] || state.accounts[0];
  item.status = "Pagado";
  targetAcc.balance -= item.amount;
  state.transactions.unshift({
    id: `tx-${Date.now()}`,
    title: `Pago ${item.vendor} — ${item.concept}`,
    sub: "Obligación cubierta",
    type: "expense",
    category: "Operación",
    account: targetAcc.name,
    date: "Hoy",
    amount: item.amount
  });

  saveAuthStore();
  renderCurrentView();
}

function toggleModal(modalId, open = true) {
  document.getElementById(modalId)?.classList.toggle("open", open);
}

/* ---------------- EVENTOS ---------------- */
document.addEventListener("DOMContentLoaded", () => {
  // Tabs de Login / Registro
  document.querySelectorAll(".auth-tab").forEach((btn) => {
    btn.addEventListener("click", () => switchAuthTab(btn.dataset.authTab));
  });

  // Botones rápidos demo
  document.querySelectorAll(".demo-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      document.getElementById("login-email").value = chip.dataset.demoEmail;
      document.getElementById("login-password").value = "123456";
    });
  });

  // Submit Login
  document.getElementById("login-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("login-email").value.trim().toLowerCase();
    const password = document.getElementById("login-password").value;
    const found = authStore.users.find((u) => u.email.toLowerCase() === email && u.password === password);
    if (!found) {
      document.getElementById("login-error").textContent = "Correo o contraseña incorrectos.";
      return;
    }
    authStore.currentUserEmail = found.email;
    saveAuthStore();
    e.target.reset();
    updateAuthUI();
  });

  // Submit Registro
  document.getElementById("register-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const company = document.getElementById("reg-company").value.trim();
    const email = document.getElementById("reg-email").value.trim().toLowerCase();
    const password = document.getElementById("reg-password").value;
    const balance = parseFloat(document.getElementById("reg-balance").value) || 0;

    if (authStore.users.some((u) => u.email.toLowerCase() === email)) {
      document.getElementById("register-error").textContent = "Ese correo ya está registrado.";
      return;
    }

    authStore.users.push({ email, password, company, data: createCompanyState(company, balance, false) });
    authStore.currentUserEmail = email;
    saveAuthStore();
    e.target.reset();
    updateAuthUI();
  });

  // Dropdown cambiar cuenta
  document.getElementById("btn-company-switcher").addEventListener("click", () => {
    document.getElementById("company-dropdown").classList.toggle("open");
  });
  document.getElementById("btn-add-login-account").addEventListener("click", () => logoutUser(true));
  document.getElementById("btn-logout").addEventListener("click", () => logoutUser(false));

  // Navegación SPA
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const targetView = link.getAttribute("href").replace("#", "");
      if (document.getElementById(`view-${targetView}`)) {
        e.preventDefault();
        if (link.dataset.obTab) getState().activeObTab = link.dataset.obTab;
        setActiveView(targetView);
      }
    });
  });

  // Tabs del módulo de Obligaciones
  document.querySelectorAll(".module-tab").forEach((btn) => {
    btn.addEventListener("click", () => setActiveObTab(btn.dataset.obPanel));
  });

  // Filtro de periodo
  document.querySelectorAll(".period-filter .filter-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      getState().period = btn.dataset.period;
      saveAuthStore();
      renderCurrentView();
    });
  });

  // Abrir / cerrar modales
  document.getElementById("btn-open-modal").addEventListener("click", () => toggleModal("tx-modal", true));
  document.getElementById("btn-open-account-modal").addEventListener("click", () => toggleModal("account-modal", true));
  document.getElementById("btn-open-ob-modal").addEventListener("click", () => toggleModal("ob-modal", true));

  document.querySelectorAll("[data-close-modal]").forEach((btn) => {
    btn.addEventListener("click", () => toggleModal(btn.dataset.closeModal, false));
  });

  document.querySelectorAll(".modal-backdrop").forEach((backdrop) => {
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) backdrop.classList.remove("open");
    });
  });

  // Nuevo movimiento
  document.getElementById("new-tx-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const state = getState();
    const title = document.getElementById("new-tx-title").value.trim();
    const type = document.getElementById("new-tx-type").value;
    const category = document.getElementById("new-tx-category").value;
    const accountName = document.getElementById("new-tx-account").value;
    const amount = parseFloat(document.getElementById("new-tx-amount").value);
    if (!title || isNaN(amount) || amount <= 0) return;

    const acc = state.accounts.find((a) => a.name === accountName) || state.accounts[0];
    acc.balance += type === "income" ? amount : -amount;
    state.transactions.unshift({ id: `tx-${Date.now()}`, title, sub: "Registro manual", type, category, account: acc.name, date: "Hoy", amount });

    saveAuthStore();
    e.target.reset();
    toggleModal("tx-modal", false);
    renderCurrentView();
  });

  // Nueva cuenta bancaria
  document.getElementById("new-account-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const state = getState();
    state.accounts.push({
      id: `acc-${Date.now()}`,
      name: document.getElementById("new-acc-name").value.trim(),
      type: document.getElementById("new-acc-type").value.trim(),
      number: `•••• ${document.getElementById("new-acc-number").value.trim()}`,
      balance: parseFloat(document.getElementById("new-acc-balance").value) || 0,
      currency: "MXN"
    });
    saveAuthStore();
    e.target.reset();
    toggleModal("account-modal", false);
    renderCurrentView();
  });

  // Nueva obligación
  document.getElementById("new-ob-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const state = getState();
    const kind = document.getElementById("new-ob-kind").value;
    const entity = document.getElementById("new-ob-entity").value.trim();
    const concept = document.getElementById("new-ob-concept").value.trim();
    const dueDate = document.getElementById("new-ob-date").value;
    const amount = parseFloat(document.getElementById("new-ob-amount").value);

    if (kind === "receivable") {
      state.receivables.unshift({ id: `rc-${Date.now()}`, client: entity, concept, dueDate, amount, status: "Pendiente" });
      state.activeObTab = "receivables";
    } else {
      state.payables.unshift({ id: `py-${Date.now()}`, vendor: entity, concept, dueDate, amount, status: "Pendiente" });
      state.activeObTab = "payables";
    }

    saveAuthStore();
    e.target.reset();
    toggleModal("ob-modal", false);
    renderCurrentView();
  });

  // Filtros transacciones
  document.getElementById("tx-filter-type").addEventListener("change", renderTransactions);
  document.getElementById("tx-search-input").addEventListener("input", renderTransactions);

  // Simulador
  document.querySelectorAll("[data-sim-key]").forEach((ctrl) => {
    ctrl.addEventListener("input", (e) => {
      getState().simulation[e.target.dataset.simKey] = parseFloat(e.target.value) || 0;
      renderSimulator(getFinancialMetrics());
    });
  });

  document.getElementById("btn-reset-sim").addEventListener("click", () => {
    getState().simulation = { expenseChangePct: 0, salesChangePct: 0, extraPayroll: 0, newDebt: 0, priceIncreasePct: 0 };
    renderSimulator(getFinancialMetrics());
  });

  // Reiniciar datos de la empresa actual
  document.getElementById("btn-reset-demo").addEventListener("click", () => {
    const user = getCurrentUser();
    if (!user) return;
    user.data = createCompanyState(user.company, 250000, user.email === "admin@tecnocloud.mx");
    saveAuthStore();
    renderCurrentView();
  });

  updateAuthUI();
});