import { formatDayHeader } from '../format.js';
import { cumulativeBalanceByDate, cumulativeAt, accountsInitialSum, expandRecurringForMonth } from '../analytics.js';

function sourceIdOf(t) {
  return typeof t.id === 'string' ? Number(t.id.split(':')[0]) : t.id;
}

export async function renderMovimientos(container, ctx) {
  const { db, money, year, month, openTransactionModal } = ctx;
  const [allTx, categories, accounts] = await Promise.all([
    db.getAll('transactions'), db.getAll('categories'), db.getAll('accounts'),
  ]);

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const catLabel = (catId) => {
    const c = catById[catId];
    if (!c) return '';
    if (c.parentId === null) return c.name;
    const parent = catById[c.parentId];
    return parent ? `${parent.name} (${c.name})` : c.name;
  };

  const cumulativeByDate = cumulativeBalanceByDate(allTx, accountsInitialSum(accounts));

  const periodTx = expandRecurringForMonth(allTx, year, month);
  const dates = Array.from(new Set(periodTx.map((t) => t.date))).sort().reverse();

  if (dates.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay movimientos en este período.<br/>Toca "+" para agregar el primero.</div>';
    return;
  }

  const byId = new Map(periodTx.map((t) => [String(t.id), t]));

  const groups = dates.map((date) => {
    const dayTx = periodTx.filter((t) => t.date === date).sort((a, b) => sourceIdOf(b) - sourceIdOf(a));
    const dayTotal = dayTx.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const { day, dow, full } = formatDayHeader(date);
    const items = dayTx.map((t) => `
      <div class="tx-item" data-tx-id="${t.id}">
        <div class="tx-main">
          <div class="tx-name">${t.recurring && t.recurring !== 'none' ? '🔁 ' : ''}${t.note || catLabel(t.categoryId)}</div>
          <div class="tx-cat">${catLabel(t.categoryId)}, ${accById[t.accountId]?.name || ''}${t.reconciled ? ' · ✓ conciliada' : ''}</div>
        </div>
        <div class="tx-amt ${t.type === 'income' ? 'positive' : 'negative'}">
          ${t.type === 'income' ? '+' : '-'}${money(t.amount)}
        </div>
      </div>
    `).join('');

    return `
      <div class="day-group">
        <div class="day-header">
          <div class="day-num">${day}</div>
          <div class="day-meta">
            <div class="dow">${dow}</div>
            <div class="date">${full.split(', ')[1]}</div>
          </div>
          <div class="day-totals">
            <div class="amt ${dayTotal >= 0 ? 'positive' : 'negative'}">${money(dayTotal)}</div>
            <div class="bal">Saldo actual: ${money(cumulativeAt(cumulativeByDate, date))}</div>
          </div>
        </div>
        ${items}
      </div>
    `;
  }).join('');

  container.innerHTML = groups;

  container.querySelectorAll('.tx-item').forEach((item) => {
    item.addEventListener('click', () => {
      openTransactionModal(byId.get(item.dataset.txId));
    });
  });
}
