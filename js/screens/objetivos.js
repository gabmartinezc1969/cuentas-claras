import { overlapsMonth } from '../format.js';

export async function renderObjetivos(container, ctx) {
  const { db, money, year, month, openGoalModal } = ctx;
  const [goals, accounts, transactions] = await Promise.all([
    db.getAll('goals'), db.getAll('accounts'), db.getAll('transactions'),
  ]);

  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const accountBalance = (accountId) => {
    const acc = accById[accountId];
    const initial = acc?.initialBalance || 0;
    return initial + transactions
      .filter((t) => t.accountId === accountId)
      .reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
  };

  const periodGoals = goals.filter((g) => overlapsMonth(g.startDate, g.endDate, year, month));

  if (periodGoals.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay objetivos de ahorro en este período.<br/>Toca "+" para crear uno.</div>';
    return;
  }

  const cards = periodGoals.map((g) => {
    const current = accountBalance(g.accountId);
    const pct = g.targetAmount > 0 ? Math.min((current / g.targetAmount) * 100, 100) : 0;
    const achieved = current >= g.targetAmount;
    return `
      <div class="progress-card" data-goal-id="${g.id}">
        <div class="progress-title-row">
          <div>
            <div class="progress-title">${g.name}</div>
            <div class="progress-sub">${g.startDate} → ${g.endDate}</div>
            <div class="progress-sub">Cuenta: ${accById[g.accountId]?.name || ''}</div>
          </div>
        </div>
        <div class="progress-track">
          <div class="progress-fill" style="width:${pct}%"></div>
        </div>
        <div class="progress-figures">
          <span class="positive">${money(current)}</span>
          ${achieved
            ? '<span class="positive">✓ Objetivo alcanzado</span>'
            : `<span class="muted">Objetivo: ${money(g.targetAmount)}</span>`}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = cards;

  container.querySelectorAll('.progress-card').forEach((card) => {
    card.addEventListener('click', () => {
      const id = parseInt(card.dataset.goalId, 10);
      openGoalModal(periodGoals.find((g) => g.id === id));
    });
  });
}
