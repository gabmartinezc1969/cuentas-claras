import { groupByTopCategory } from '../analytics.js';

function breakdownRows(topGroups, transactions, categories, money) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  return topGroups.map((top) => {
    const children = categories.filter((c) => c.parentId === top.id);
    const childRows = children.map((child) => {
      const sum = transactions
        .filter((t) => t.categoryId === child.id)
        .reduce((s, t) => s + t.amount, 0);
      if (sum === 0) return '';
      return `
        <div class="settings-row">
          <span>${child.name}</span>
          <span class="negative">-${money(sum)}</span>
        </div>
      `;
    }).join('');

    return `
      <div class="settings-row">
        <span><strong>${top.label}</strong></span>
        <span class="negative"><strong>-${money(top.value)}</strong></span>
      </div>
      ${childRows}
    `;
  }).join('');
}

export async function renderEstadistica(container, ctx) {
  const { db, money, inMonth, year, month } = ctx;
  const [transactions, categories] = await Promise.all([db.getAll('transactions'), db.getAll('categories')]);
  const periodTx = transactions.filter((t) => inMonth(t.date, year, month));

  const income = periodTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = periodTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  if (periodTx.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay movimientos en este período.</div>';
    return;
  }

  const incomeGroups = groupByTopCategory(periodTx, categories, 'income');
  const expenseGroups = groupByTopCategory(periodTx, categories, 'expense');

  container.innerHTML = `
    <div class="card">
      <div class="settings-row"><span><strong>Ingresos</strong></span><span class="positive"><strong>${money(income)}</strong></span></div>
      <div class="settings-row"><span><strong>Gastos</strong></span><span class="negative"><strong>-${money(expense)}</strong></span></div>
    </div>

    <div class="card">
      <h3>Ingresos</h3>
      ${incomeGroups.map((g) => `
        <div class="settings-row">
          <span>${g.label}</span>
          <span class="positive">${money(g.value)}</span>
        </div>
      `).join('') || '<div class="empty-state">Sin ingresos en este período.</div>'}
    </div>

    <div class="card">
      <h3>Gastos por categoría</h3>
      ${breakdownRows(expenseGroups, periodTx, categories, money) || '<div class="empty-state">Sin gastos en este período.</div>'}
    </div>
  `;
}
