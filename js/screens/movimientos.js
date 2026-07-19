import { formatDayHeader } from '../format.js';

export async function renderMovimientos(container, ctx) {
  const { db, money, inMonth, year, month, openTransactionModal } = ctx;
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

  const sorted = [...allTx].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id - b.id)));
  let running = 0;
  const cumulativeByDate = {};
  for (const t of sorted) {
    running += t.type === 'income' ? t.amount : -t.amount;
    cumulativeByDate[t.date] = running;
  }

  const periodTx = allTx.filter((t) => inMonth(t.date, year, month));
  const dates = Array.from(new Set(periodTx.map((t) => t.date))).sort().reverse();

  if (dates.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay movimientos en este período.<br/>Toca "+" para agregar el primero.</div>';
    return;
  }

  const groups = dates.map((date) => {
    const dayTx = periodTx.filter((t) => t.date === date).sort((a, b) => b.id - a.id);
    const dayTotal = dayTx.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const { day, dow, full } = formatDayHeader(date);
    const items = dayTx.map((t) => `
      <div class="tx-item" data-tx-id="${t.id}">
        <div class="tx-main">
          <div class="tx-name">${t.note || catLabel(t.categoryId)}</div>
          <div class="tx-cat">${catLabel(t.categoryId)}, ${accById[t.accountId]?.name || ''}</div>
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
            <div class="bal">Saldo actual: ${money(cumulativeByDate[date] ?? 0)}</div>
          </div>
        </div>
        ${items}
      </div>
    `;
  }).join('');

  container.innerHTML = groups;

  container.querySelectorAll('.tx-item').forEach((item) => {
    item.addEventListener('click', () => {
      const id = parseInt(item.dataset.txId, 10);
      const existing = allTx.find((t) => t.id === id);
      openTransactionModal(existing);
    });
  });
}
