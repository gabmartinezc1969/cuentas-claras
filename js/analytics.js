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

export function cumulativeAt(byDateMap, dateISO) {
  let result = 0;
  for (const key of Object.keys(byDateMap).sort()) {
    if (key <= dateISO) result = byDateMap[key]; else break;
  }
  return result;
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

// All date math here is done in UTC: transaction dates are plain "YYYY-MM-DD"
// strings, which `new Date(str)` already parses as UTC midnight. Mixing that
// with locally-constructed Date objects would shift results by the user's
// timezone offset, so every helper below stays on the UTC getters/setters.
function toISO(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addDays(d, days) {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function addMonthsClamped(anchor, monthsToAdd, dayOfMonth) {
  const target = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() + monthsToAdd, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(dayOfMonth, lastDay));
  return target;
}

/**
 * Returns the transactions that fall within [rangeStart, rangeEnd], expanding
 * any recurring transaction (weekly/monthly) into virtual occurrences. Virtual
 * occurrences are not persisted; editing one opens the original source rule.
 */
export function expandRecurringInRange(transactions, rangeStart, rangeEnd) {
  const results = [];

  for (const t of transactions) {
    const freq = t.recurring || 'none';
    if (freq === 'none') {
      const d = new Date(t.date);
      if (d >= rangeStart && d <= rangeEnd) results.push(t);
      continue;
    }

    const anchor = new Date(t.date);
    if (anchor > rangeEnd) continue;

    if (freq === 'weekly') {
      let occ = new Date(anchor);
      const diffDays = Math.floor((rangeStart - occ) / 86400000);
      if (diffDays > 0) occ = addDays(occ, Math.floor(diffDays / 7) * 7);
      while (occ < rangeStart) occ = addDays(occ, 7);
      while (occ <= rangeEnd) {
        results.push(materializeOccurrence(t, occ));
        occ = addDays(occ, 7);
      }
    } else if (freq === 'monthly') {
      const dayOfMonth = anchor.getUTCDate();
      let monthsToAdd = (rangeStart.getUTCFullYear() - anchor.getUTCFullYear()) * 12 + (rangeStart.getUTCMonth() - anchor.getUTCMonth());
      if (monthsToAdd < 0) monthsToAdd = 0;
      let occ = addMonthsClamped(anchor, monthsToAdd, dayOfMonth);
      if (occ < rangeStart) occ = addMonthsClamped(anchor, monthsToAdd + 1, dayOfMonth);
      if (occ <= rangeEnd) results.push(materializeOccurrence(t, occ));
    }
  }

  return results;
}

export function expandRecurringForMonth(transactions, year, month) {
  return expandRecurringInRange(
    transactions,
    new Date(Date.UTC(year, month, 1)),
    new Date(Date.UTC(year, month + 1, 0)),
  );
}

function materializeOccurrence(source, date) {
  const iso = toISO(date);
  if (iso === source.date) return source;
  return {
    ...source,
    id: `${source.id}:${iso}`,
    date: iso,
    virtual: true,
    sourceId: source.id,
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
