export function monthKey(dateISO) {
  return dateISO.slice(0, 7);
}

export function accountsInitialSum(accounts) {
  return accounts.reduce((sum, a) => sum + (a.initialBalance || 0), 0);
}

export function cumulativeBalanceByDate(transactions, initial = 0) {
  const sorted = [...transactions].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.id - b.id)));
  let running = initial;
  const byDate = {};
  for (const t of sorted) {
    running += t.type === 'income' ? t.amount : -t.amount;
    byDate[t.date] = running;
  }
  return byDate;
}

export function cumulativeBalanceByMonth(transactions, initial = 0) {
  const byDate = cumulativeBalanceByDate(transactions, initial);
  const byMonth = {};
  for (const date of Object.keys(byDate).sort()) {
    byMonth[monthKey(date)] = byDate[date];
  }
  return byMonth;
}

export function topLevelCategoryMap(categories) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  return (catId) => {
    const c = catById[catId];
    if (!c) return null;
    return c.parentId === null ? c : catById[c.parentId];
  };
}

export function groupByTopCategory(transactions, categories, type) {
  const topLevelOf = topLevelCategoryMap(categories);
  const totals = new Map();
  for (const t of transactions.filter((t) => t.type === type)) {
    const top = topLevelOf(t.categoryId);
    if (!top) continue;
    const prev = totals.get(top.id) || { id: top.id, label: top.name, value: 0, color: top.color };
    prev.value += t.amount;
    totals.set(top.id, prev);
  }
  return Array.from(totals.values()).sort((a, b) => b.value - a.value);
}
