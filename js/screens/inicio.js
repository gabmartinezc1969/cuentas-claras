import { renderDonut, renderBars } from '../charts.js';
import { groupByTopCategory, expandRecurringForMonth } from '../analytics.js';

function daysUntil(dateISO) {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round((new Date(dateISO) - new Date(today)) / 86400000);
}

export async function renderInicio(container, ctx) {
  const { db, money, year, month } = ctx;
  const [transactions, categories, reminders] = await Promise.all([
    db.getAll('transactions'), db.getAll('categories'), db.getAll('reminders'),
  ]);
  const periodTx = expandRecurringForMonth(transactions, year, month);

  const income = periodTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = periodTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const catData = groupByTopCategory(periodTx, categories, 'expense');
  const top5 = catData.slice(0, 5);

  const upcoming = reminders
    .filter((r) => !r.done && daysUntil(r.dueDate) <= 7)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  const remindersCard = upcoming.length ? `
    <div class="card">
      <h3>Recordatorios próximos</h3>
      ${upcoming.map((r) => {
        const d = daysUntil(r.dueDate);
        const label = d < 0 ? `Venció hace ${-d} día(s)` : d === 0 ? 'Hoy' : `En ${d} día(s)`;
        return `
          <div class="settings-row">
            <span>${r.note}<br/><span style="font-size:11px;color:var(--text-muted)">${label}</span></span>
            <span class="negative">${money(r.amount)}</span>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  container.innerHTML = `
    ${remindersCard}
    <div class="card">
      <h3>Resumen del período</h3>
      <div class="summary-grid">
        <div><span class="value positive">${money(income)}</span><span class="label">Ingresos</span></div>
        <div><span class="value negative">${money(expense)}</span><span class="label">Gastos</span></div>
        <div><span class="value ${balance >= 0 ? 'positive' : 'negative'}">${money(balance)}</span><span class="label">Saldo</span></div>
      </div>
    </div>

    <div class="card">
      <h3>Gráfico circular de saldos</h3>
      ${renderDonut(catData.length ? catData : [{ label: 'Sin gastos', value: 0, color: '#ccc' }])}
    </div>

    <div class="card">
      <h3>Top 5 costes por categoría</h3>
      ${renderBars(top5)}
    </div>
  `;
}
