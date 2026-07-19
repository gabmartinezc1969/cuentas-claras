import { renderDonut, renderBars } from '../charts.js';

export async function renderInicio(container, ctx) {
  const { db, money, inMonth, year, month } = ctx;
  const [transactions, categories] = await Promise.all([db.getAll('transactions'), db.getAll('categories')]);
  const periodTx = transactions.filter((t) => inMonth(t.date, year, month));

  const income = periodTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = periodTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - expense;

  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const topLevelOf = (catId) => {
    const c = catById[catId];
    if (!c) return null;
    return c.parentId === null ? c : catById[c.parentId];
  };

  const totalsByTopCategory = new Map();
  for (const t of periodTx.filter((t) => t.type === 'expense')) {
    const top = topLevelOf(t.categoryId);
    if (!top) continue;
    const prev = totalsByTopCategory.get(top.id) || { label: top.name, value: 0, color: top.color };
    prev.value += t.amount;
    totalsByTopCategory.set(top.id, prev);
  }
  const catData = Array.from(totalsByTopCategory.values()).sort((a, b) => b.value - a.value);
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
