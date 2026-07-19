import { money } from './format.js';

export function renderDonut(data) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total <= 0) {
    return '<div class="empty-state">Sin datos para graficar este período.</div>';
  }

  let acc = 0;
  const stops = data.map((d) => {
    const from = (acc / total) * 100;
    acc += d.value;
    const to = (acc / total) * 100;
    return `${d.color} ${from}% ${to}%`;
  }).join(', ');

  const legend = data.map((d) => `
    <div class="legend-item">
      <span class="legend-dot" style="background:${d.color}"></span>
      <span>${d.label}</span>
      <span class="amount">${money(d.value)}</span>
    </div>
  `).join('');

  return `
    <div class="donut-wrap">
      <div class="donut" style="background: conic-gradient(${stops})"></div>
      <div class="legend">${legend}</div>
    </div>
  `;
}

export function renderBars(data) {
  if (data.length === 0) {
    return '<div class="empty-state">Sin datos para graficar este período.</div>';
  }
  const max = Math.max(...data.map((d) => d.value));
  const cols = data.map((d) => {
    const heightPct = max > 0 ? Math.max((d.value / max) * 100, 4) : 4;
    return `
      <div class="bar-col">
        <div class="bar-val">${money(d.value)}</div>
        <div class="bar-fill" style="height:${heightPct}%; background:${d.color}"></div>
        <div class="bar-label">${d.label}</div>
      </div>
    `;
  }).join('');
  return `<div class="bars">${cols}</div>`;
}
