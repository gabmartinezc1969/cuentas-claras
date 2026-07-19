import { expandRecurringForMonth } from '../analytics.js';

const localState = { selectedDate: null };

const DOW_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export async function renderCalendario(container, ctx) {
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

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();

  const periodTx = expandRecurringForMonth(allTx, year, month);
  const byDate = {};
  for (const t of periodTx) {
    if (!byDate[t.date]) byDate[t.date] = [];
    byDate[t.date].push(t);
  }
  const byId = new Map(periodTx.map((t) => [String(t.id), t]));

  const pad2 = (n) => String(n).padStart(2, '0');
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push('<div class="cal-cell empty"></div>');
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${pad2(month + 1)}-${pad2(day)}`;
    const dayTx = byDate[dateStr] || [];
    const net = dayTx.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    const isToday = dateStr === new Date().toISOString().slice(0, 10);
    const isSelected = dateStr === localState.selectedDate;
    cells.push(`
      <button type="button" class="cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}" data-date="${dateStr}">
        <span class="cal-day">${day}</span>
        ${dayTx.length ? `<span class="cal-amt ${net >= 0 ? 'positive' : 'negative'}">${money(net)}</span>` : ''}
      </button>
    `);
  }

  const dow = DOW_SHORT.map((d) => `<div class="cal-dow">${d}</div>`).join('');

  let dayListHtml = '';
  if (localState.selectedDate && byDate[localState.selectedDate]) {
    const items = byDate[localState.selectedDate].map((t) => `
      <div class="tx-item" data-tx-id="${t.id}">
        <div class="tx-main">
          <div class="tx-name">${t.recurring && t.recurring !== 'none' ? '🔁 ' : ''}${t.note || catLabel(t.categoryId)}</div>
          <div class="tx-cat">${catLabel(t.categoryId)}, ${accById[t.accountId]?.name || ''}</div>
        </div>
        <div class="tx-amt ${t.type === 'income' ? 'positive' : 'negative'}">
          ${t.type === 'income' ? '+' : '-'}${money(t.amount)}
        </div>
      </div>
    `).join('');
    dayListHtml = `<div class="card" style="padding:0;overflow:hidden"><div class="day-header" style="border-radius:14px 14px 0 0"><strong>${localState.selectedDate}</strong></div>${items}</div>`;
  }

  container.innerHTML = `
    <div class="card">
      <div class="cal-grid">${dow}${cells.join('')}</div>
    </div>
    ${dayListHtml}
  `;

  container.querySelectorAll('.cal-cell[data-date]').forEach((cell) => {
    cell.addEventListener('click', () => {
      const date = cell.dataset.date;
      localState.selectedDate = localState.selectedDate === date ? null : date;
      renderCalendario(container, ctx);
    });
  });

  container.querySelectorAll('.tx-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      openTransactionModal(byId.get(item.dataset.txId));
    });
  });
}
