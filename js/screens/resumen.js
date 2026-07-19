import { cumulativeBalanceByMonth, accountsInitialSum, monthKey } from '../analytics.js';

export async function renderResumen(container, ctx) {
  const { db, money } = ctx;
  const [transactions, accounts] = await Promise.all([db.getAll('transactions'), db.getAll('accounts')]);

  if (transactions.length === 0) {
    container.innerHTML = '<div class="empty-state">Todavía no hay movimientos.<br/>Agrega transacciones para ver tu histórico mensual.</div>';
    return;
  }

  const balanceByMonth = cumulativeBalanceByMonth(transactions, accountsInitialSum(accounts));
  const months = Array.from(new Set(transactions.map((t) => monthKey(t.date)))).sort().reverse();

  const rows = months.map((key) => {
    const [y, m] = key.split('-').map(Number);
    const monthTx = transactions.filter((t) => monthKey(t.date) === key);
    const income = monthTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = monthTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const balance = income - expense;
    const flow = income + expense;
    const expensePct = flow > 0 ? (expense / flow) * 100 : 0;
    const cumBalance = balanceByMonth[key];

    return `
      <div class="progress-card">
        <div class="progress-title-row">
          <div class="progress-title">${String(m).padStart(2, '0')}/${y}</div>
          <div class="progress-title ${cumBalance >= 0 ? 'positive' : 'negative'}">Saldo actual: ${money(cumBalance)}</div>
        </div>
        <div class="progress-track">
          <div class="progress-fill-red" style="width:${expensePct}%"></div>
          <div class="progress-fill-green" style="width:${100 - expensePct}%"></div>
        </div>
        <div class="progress-figures">
          <span class="${balance >= 0 ? 'positive' : 'negative'}">${money(balance)}</span>
          <span class="muted">(${money(income)} / -${money(expense)})</span>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = rows;
}
