const currencyFmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function money(amount) {
  return currencyFmt.format(amount || 0);
}

export const MONTH_NAMES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const DOW_NAMES = [
  'domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado',
];

export function monthRange(year, monthIndex) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { start, end };
}

export function toISODate(d) {
  return d.toISOString().slice(0, 10);
}

export function overlapsMonth(startISO, endISO, year, monthIndex) {
  const { start, end } = monthRange(year, monthIndex);
  const s = startISO ? new Date(startISO) : start;
  const e = endISO ? new Date(endISO) : end;
  return s <= end && e >= start;
}

export function inMonth(dateISO, year, monthIndex) {
  const d = new Date(dateISO);
  return d.getFullYear() === year && d.getMonth() === monthIndex;
}

export function formatDayHeader(dateISO) {
  const d = new Date(dateISO);
  return {
    day: d.getDate(),
    dow: DOW_NAMES[d.getDay()],
    full: `${DOW_NAMES[d.getDay()].slice(0, 3)}, ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`,
  };
}
