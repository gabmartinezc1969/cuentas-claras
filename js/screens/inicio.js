import { renderDonut, renderBars } from '../charts.js';
import { groupByTopCategory, expandRecurringForMonth } from '../analytics.js';

export async function renderInicio(container, ctx) {
  const { db, money, year, month } = ctx;
  const [transactions, categories] = await Promise.all([db.getAll('transactions'), db.getAll('categories')]);
  const periodTx = expandRecurringForMonth(transactions, year, month);

  const income = periodTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = periodTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const catData = groupByTopCategory(periodTx, categories, 'expense');
  const top5 = catData.slice(0, 5);

  container.innerHTML = `
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
