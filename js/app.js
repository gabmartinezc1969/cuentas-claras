import * as db from './db.js';
import { money, MONTH_NAMES, overlapsMonth, inMonth } from './format.js';
import { sha256 } from './crypto.js';
import { renderInicio } from './screens/inicio.js';
import { renderMovimientos } from './screens/movimientos.js';
import { renderPresupuestos } from './screens/presupuestos.js';
import { renderObjetivos } from './screens/objetivos.js';
import { renderAjustes } from './screens/ajustes.js';

const state = {
  tab: 'inicio',
  year: new Date().getFullYear(),
  month: new Date().getMonth(),
  theme: localStorage.getItem('cc-theme') || 'light',
};

const el = {
  main: document.getElementById('main'),
  headerTitle: document.getElementById('header-title'),
  tabbar: document.getElementById('tabbar'),
  periodRow: document.getElementById('period-row'),
  periodMonth: document.getElementById('period-month'),
  periodYear: document.getElementById('period-year'),
  periodPrev: document.getElementById('period-prev'),
  periodNext: document.getElementById('period-next'),
  footer: document.getElementById('footer-totals'),
  footerSaldo: document.getElementById('footer-saldo'),
  footerSaldoActual: document.getElementById('footer-saldo-actual'),
  fab: document.getElementById('fab-add'),
  modalRoot: document.getElementById('modal-root'),
  lockRoot: document.getElementById('lock-root'),
  btnTheme: document.getElementById('btn-theme'),
};

const SCREENS = {
  inicio: { title: 'Cuentas Claras', render: renderInicio, showPeriod: true, showFab: true },
  movimientos: { title: 'Movimientos', render: renderMovimientos, showPeriod: true, showFab: true },
  presupuestos: { title: 'Presupuestos', render: renderPresupuestos, showPeriod: true, showFab: true },
  objetivos: { title: 'Objetivos de ahorro', render: renderObjetivos, showPeriod: true, showFab: true },
  ajustes: { title: 'Ajustes', render: renderAjustes, showPeriod: false, showFab: false },
};

function applyTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  localStorage.setItem('cc-theme', state.theme);
}

el.btnTheme.addEventListener('click', () => {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
});

function closeModal() {
  el.modalRoot.innerHTML = '';
}

function openModal(innerHtml, onMount) {
  el.modalRoot.innerHTML = `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal-sheet">${innerHtml}</div>
    </div>
  `;
  document.getElementById('modal-backdrop').addEventListener('click', (e) => {
    if (e.target.id === 'modal-backdrop') closeModal();
  });
  if (onMount) onMount(el.modalRoot);
}

async function confirmDelete(storeName, id, message) {
  openModal(`
    <h2>¿Eliminar?</h2>
    <p>${message}</p>
    <div class="btn-row">
      <button class="btn btn-outline" id="cancel-del">Cancelar</button>
      <button class="btn btn-danger" id="confirm-del">Eliminar</button>
    </div>
  `, (root) => {
    root.querySelector('#cancel-del').addEventListener('click', closeModal);
    root.querySelector('#confirm-del').addEventListener('click', async () => {
      await db.remove(storeName, id);
      closeModal();
      refresh();
    });
  });
}

async function categoryOptions(kind) {
  const cats = await db.getAll('categories');
  const filtered = cats.filter((c) => c.kind === kind);
  const parents = filtered.filter((c) => c.parentId === null);
  let options = '';
  for (const p of parents) {
    const children = filtered.filter((c) => c.parentId === p.id);
    if (children.length === 0) {
      options += `<option value="${p.id}">${p.name}</option>`;
    } else {
      options += `<optgroup label="${p.name}">`;
      options += `<option value="${p.id}">${p.name} (general)</option>`;
      for (const c of children) {
        options += `<option value="${c.id}">${p.name}: ${c.name}</option>`;
      }
      options += `</optgroup>`;
    }
  }
  return options;
}

async function accountOptions(selectedId, includeEmpty) {
  const accounts = await db.getAll('accounts');
  let options = includeEmpty ? '<option value="">Todas las cuentas</option>' : '';
  for (const a of accounts) {
    options += `<option value="${a.id}" ${a.id === selectedId ? 'selected' : ''}>${a.name}</option>`;
  }
  return options;
}

async function openTransactionModal(existing) {
  const type = existing ? existing.type : 'expense';
  const categoriesHtml = {
    expense: await categoryOptions('expense'),
    income: await categoryOptions('income'),
  };
  const accountsHtml = await accountOptions(existing ? existing.accountId : null, false);
  const today = new Date().toISOString().slice(0, 10);

  openModal(`
    <h2>${existing ? 'Editar' : 'Nueva'} transacción</h2>
    <div class="segmented" id="type-toggle">
      <button type="button" class="type-opt ${type === 'expense' ? 'active expense' : ''}" data-type="expense">Gasto</button>
      <button type="button" class="type-opt ${type === 'income' ? 'active income' : ''}" data-type="income">Ingreso</button>
    </div>
    <form id="tx-form">
      <div class="field" style="margin-top:14px">
        <label>Monto</label>
        <input type="number" step="0.01" min="0" name="amount" required value="${existing ? existing.amount : ''}" />
      </div>
      <div class="field">
        <label>Categoría</label>
        <select name="categoryId" id="tx-category">
          ${categoriesHtml[type]}
        </select>
      </div>
      <div class="field">
        <label>Cuenta</label>
        <select name="accountId">${accountsHtml}</select>
      </div>
      <div class="field">
        <label>Fecha</label>
        <input type="date" name="date" required value="${existing ? existing.date : today}" />
      </div>
      <div class="field">
        <label>Nota</label>
        <input type="text" name="note" placeholder="Descripción" value="${existing ? (existing.note || '') : ''}" />
      </div>
      <div class="btn-row">
        ${existing ? '<button type="button" class="btn btn-danger" id="tx-delete">Eliminar</button>' : ''}
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `, (root) => {
    let currentType = type;
    const catSelect = root.querySelector('#tx-category');
    root.querySelectorAll('.type-opt').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentType = btn.dataset.type;
        root.querySelectorAll('.type-opt').forEach((b) => b.classList.remove('active', 'income', 'expense'));
        btn.classList.add('active', currentType);
        catSelect.innerHTML = categoriesHtml[currentType];
      });
    });
    if (existing) {
      root.querySelector('#tx-delete').addEventListener('click', () => confirmDelete('transactions', existing.id, 'Se eliminará esta transacción.'));
    }
    root.querySelector('#tx-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const record = {
        type: currentType,
        amount: parseFloat(fd.get('amount')),
        categoryId: parseInt(fd.get('categoryId'), 10),
        accountId: parseInt(fd.get('accountId'), 10),
        date: fd.get('date'),
        note: fd.get('note'),
        recurring: existing ? existing.recurring : false,
        reconciled: existing ? existing.reconciled : false,
      };
      if (existing) record.id = existing.id;
      await db.put('transactions', record);
      closeModal();
      refresh();
    });
  });
}

async function openBudgetModal(existing) {
  const categoriesHtml = await categoryOptions('expense');
  const accountsHtml = await accountOptions(existing ? existing.accountId : null, true);
  const today = new Date().toISOString().slice(0, 10);

  openModal(`
    <h2>${existing ? 'Editar' : 'Nuevo'} presupuesto</h2>
    <form id="budget-form">
      <div class="field">
        <label>Categoría</label>
        <select name="categoryId">${categoriesHtml}</select>
      </div>
      <div class="field">
        <label>Cuenta (opcional)</label>
        <select name="accountId">${accountsHtml}</select>
      </div>
      <div class="field">
        <label>Monto presupuestado</label>
        <input type="number" step="0.01" min="0" name="amount" required value="${existing ? existing.amount : ''}" />
      </div>
      <div class="field">
        <label>Desde</label>
        <input type="date" name="startDate" required value="${existing ? existing.startDate : today}" />
      </div>
      <div class="field">
        <label>Hasta</label>
        <input type="date" name="endDate" required value="${existing ? existing.endDate : today}" />
      </div>
      <div class="field">
        <label>Recurrencia</label>
        <select name="recurrence">
          <option value="none" ${existing && existing.recurrence === 'none' ? 'selected' : ''}>Única vez</option>
          <option value="weekly" ${existing && existing.recurrence === 'weekly' ? 'selected' : ''}>Cada semana</option>
          <option value="monthly" ${!existing || existing.recurrence === 'monthly' ? 'selected' : ''}>Mensualmente</option>
        </select>
      </div>
      <div class="btn-row">
        ${existing ? '<button type="button" class="btn btn-danger" id="budget-delete">Eliminar</button>' : ''}
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `, (root) => {
    if (existing) {
      root.querySelector('#budget-delete').addEventListener('click', () => confirmDelete('budgets', existing.id, 'Se eliminará este presupuesto.'));
    }
    root.querySelector('#budget-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const accountId = fd.get('accountId');
      const record = {
        categoryId: parseInt(fd.get('categoryId'), 10),
        accountId: accountId ? parseInt(accountId, 10) : null,
        amount: parseFloat(fd.get('amount')),
        startDate: fd.get('startDate'),
        endDate: fd.get('endDate'),
        recurrence: fd.get('recurrence'),
      };
      if (existing) record.id = existing.id;
      await db.put('budgets', record);
      closeModal();
      refresh();
    });
  });
}

async function openGoalModal(existing) {
  const accountsHtml = await accountOptions(existing ? existing.accountId : null, false);
  const today = new Date().toISOString().slice(0, 10);
  openModal(`
    <h2>${existing ? 'Editar' : 'Nuevo'} objetivo de ahorro</h2>
    <form id="goal-form">
      <div class="field">
        <label>Nombre</label>
        <input type="text" name="name" required value="${existing ? existing.name : ''}" />
      </div>
      <div class="field">
        <label>Cuenta</label>
        <select name="accountId">${accountsHtml}</select>
      </div>
      <div class="field">
        <label>Monto objetivo</label>
        <input type="number" step="0.01" min="0" name="targetAmount" required value="${existing ? existing.targetAmount : ''}" />
      </div>
      <div class="field">
        <label>Desde</label>
        <input type="date" name="startDate" required value="${existing ? existing.startDate : today}" />
      </div>
      <div class="field">
        <label>Hasta</label>
        <input type="date" name="endDate" required value="${existing ? existing.endDate : today}" />
      </div>
      <div class="btn-row">
        ${existing ? '<button type="button" class="btn btn-danger" id="goal-delete">Eliminar</button>' : ''}
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  `, (root) => {
    if (existing) {
      root.querySelector('#goal-delete').addEventListener('click', () => confirmDelete('goals', existing.id, 'Se eliminará este objetivo.'));
    }
    root.querySelector('#goal-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      const record = {
        name: fd.get('name'),
        accountId: parseInt(fd.get('accountId'), 10),
        targetAmount: parseFloat(fd.get('targetAmount')),
        startDate: fd.get('startDate'),
        endDate: fd.get('endDate'),
      };
      if (existing) record.id = existing.id;
      await db.put('goals', record);
      closeModal();
      refresh();
    });
  });
}

async function computeFooterTotals() {
  const [transactions, accounts] = await Promise.all([db.getAll('transactions'), db.getAll('accounts')]);
  const initial = accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
  const currentBalance = initial + transactions.reduce(
    (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0,
  );
  const periodTx = transactions.filter((t) => inMonth(t.date, state.year, state.month));
  const periodIncome = periodTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const periodExpense = periodTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  return { periodBalance: periodIncome - periodExpense, currentBalance, periodIncome, periodExpense };
}

async function updateFooter() {
  const totals = await computeFooterTotals();
  el.footerSaldo.textContent = money(totals.periodBalance);
  el.footerSaldo.className = 'value ' + (totals.periodBalance >= 0 ? 'positive' : 'negative');
  el.footerSaldoActual.textContent = money(totals.currentBalance);
}

function setTheme(theme) {
  state.theme = theme;
  applyTheme();
  refresh();
}

function ctx() {
  return {
    year: state.year,
    month: state.month,
    theme: state.theme,
    setTheme,
    db,
    money,
    overlapsMonth,
    inMonth,
    sha256,
    openTransactionModal,
    openBudgetModal,
    openGoalModal,
    confirmDelete,
    refresh,
  };
}

async function refresh() {
  const screen = SCREENS[state.tab];
  el.headerTitle.textContent = screen.title;
  el.periodRow.style.display = screen.showPeriod ? 'flex' : 'none';
  el.fab.style.display = screen.showFab ? 'flex' : 'none';
  el.footer.style.display = 'flex';
  el.periodMonth.textContent = MONTH_NAMES[state.month];
  el.periodYear.textContent = state.year;

  el.tabbar.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.tab === state.tab);
  });

  await screen.render(el.main, ctx());
  await updateFooter();
}

el.tabbar.addEventListener('click', (e) => {
  const btn = e.target.closest('.tab-btn');
  if (!btn) return;
  state.tab = btn.dataset.tab;
  refresh();
});

el.periodPrev.addEventListener('click', () => {
  state.month -= 1;
  if (state.month < 0) { state.month = 11; state.year -= 1; }
  refresh();
});
el.periodNext.addEventListener('click', () => {
  state.month += 1;
  if (state.month > 11) { state.month = 0; state.year += 1; }
  refresh();
});

el.fab.addEventListener('click', () => {
  if (state.tab === 'presupuestos') return openBudgetModal(null);
  if (state.tab === 'objetivos') return openGoalModal(null);
  return openTransactionModal(null);
});

function showLockScreen(storedHash) {
  el.lockRoot.innerHTML = `
    <div class="lock-screen">
      <div style="font-size:40px">🔒</div>
      <h2 style="margin:0">Cuentas Claras</h2>
      <p>Ingresa tu PIN para continuar</p>
      <input type="password" inputmode="numeric" maxlength="8" id="lock-pin" autofocus />
      <div class="lock-error" id="lock-error"></div>
      <button class="btn btn-primary" style="width:200px" id="lock-submit">Desbloquear</button>
    </div>
  `;
  const pinInput = document.getElementById('lock-pin');
  const submit = async () => {
    const value = pinInput.value;
    const hash = await sha256(value);
    if (hash === storedHash) {
      el.lockRoot.innerHTML = '';
      boot();
    } else {
      document.getElementById('lock-error').textContent = 'PIN incorrecto';
      pinInput.value = '';
    }
  };
  document.getElementById('lock-submit').addEventListener('click', submit);
  pinInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submit(); });
}

async function boot() {
  await db.openDB();
  await db.ensureSeeded();
  applyTheme();
  state.tab = 'inicio';
  el.tabbar.querySelector('[data-tab="inicio"]').classList.add('active');
  await refresh();
}

const lockHash = localStorage.getItem('cc-pin-hash');
if (lockHash) {
  showLockScreen(lockHash);
} else {
  boot();
}
