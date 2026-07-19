import { overlapsMonth } from '../format.js';

export async function renderPresupuestos(container, ctx) {
  const { db, money, year, month, openBudgetModal } = ctx;
  const [budgets, categories, accounts, transactions] = await Promise.all([
    db.getAll('budgets'), db.getAll('categories'), db.getAll('accounts'), db.getAll('transactions'),
  ]);

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const catLabel = (catId) => {
    const c = catById[catId];
    if (!c) return '';
    if (c.parentId === null) return c.name;
    const parent = catById[c.parentId];
    return parent ? `${parent.name}: ${c.name}` : c.name;
  };

  const periodBudgets = budgets.filter((b) => overlapsMonth(b.startDate, b.endDate, year, month));

  if (periodBudgets.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay presupuestos en este período.<br/>Toca "+" para crear uno.</div>';
    return;
  }

  const cards = periodBudgets.map((b) => {
    const spent = transactions
      .filter((t) => t.type === 'expense' && t.categoryId === b.categoryId)
      .filter((t) => t.date >= b.startDate && t.date <= b.endDate)
      .filter((t) => !b.accountId || t.accountId === b.accountId)
      .reduce((s, t) => s + t.amount, 0);

    const remaining = b.amount - spent;
    const redPct = b.amount > 0 ? Math.min((spent / b.amount) * 100, 100) : 100;
    const recurrenceLabel = { none: 'Única vez', weekly: 'Cada semana', monthly: 'Mensualmente' }[b.recurrence] || '';

    return `
      <div class="progress-card" data-budget-id="${b.id}">
        <div class="progress-title-row">
          <div>
            <div class="progress-title">${catLabel(b.categoryId)}</div>
            <div class="progress-sub">${b.startDate} → ${b.endDate}${b.accountId ? ` · ${accById[b.accountId]?.name || ''}` : ''}</div>
          </div>
          <div class="progress-sub">${recurrenceLabel}</div>
        </div>
        <div class="progress-track">
          <div class="progress-fill-red" style="width:${redPct}%"></div>
          <div class="progress-fill-green" style="width:${100 - redPct}%"></div>
        </div>
        <div class="progress-figures">
          <span class="${remaining >= 0 ? 'positive' : 'negative'}">${money(remaining)}</span>
          <span class="muted">(${money(b.amount)} / -${money(spent)})</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cards;

  container.querySelectorAll('.progress-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.budgetId, 10);
      openBudgetModal(periodBudgets.find((b) => b.id === id));
    });
  });
}
