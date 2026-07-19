import { renderDonut, renderBars } from '../charts.js';
import { groupByTopCategory } from '../analytics.js';

const localState = { view: 'bar', percent: false };

export async function renderDiagrama(container, ctx) {
  const { db, inMonth, year, month } = ctx;
  const [transactions, categories] = await Promise.all([db.getAll('transactions'), db.getAll('categories')]);
  const periodTx = transactions.filter((t) => inMonth(t.date, year, month));
  const catData = groupByTopCategory(periodTx, categories, 'expense');
  const total = catData.reduce((s, d) => s + d.value, 0);

  const chartHtml = catData.length === 0
    ? '<div class="empty-state">Sin gastos en este período.</div>'
    : (localState.view === 'bar' ? renderBars(catData, { percent: localState.percent }) : renderDonut(catData, { percent: localState.percent }));

  container.innerHTML = `
    <div class="card">
      <div class="segmented" id="view-toggle">
        <button type="button" class="view-opt ${localState.view === 'bar' ? 'active neutral' : ''}" data-view="bar">Gráfico de barras</button>
        <button type="button" class="view-opt ${localState.view === 'donut' ? 'active neutral' : ''}" data-view="donut">Gráfico circular</button>
      </div>
      <h3 style="margin-top:16px">Categorías principales - Gastos: ${total ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(total) : '$0.00'}</h3>
      ${chartHtml}
      <div class="settings-row" style="border:none;margin-top:10px">
        <span>Mostrar porcentaje</span>
        <label class="switch">
          <input type="checkbox" id="percent-toggle" ${localState.percent ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
    </div>
  `;

  container.querySelectorAll('.view-opt').forEach((btn) => {
    btn.addEventListener('click', () => {
      localState.view = btn.dataset.view;
      renderDiagrama(container, ctx);
    });
  });
  container.querySelector('#percent-toggle').addEventListener('change', (e) => {
    localState.percent = e.target.checked;
    renderDiagrama(container, ctx);
  });
}
