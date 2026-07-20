function escapeField(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCSV(rows) {
  return rows.map((row) => row.map(escapeField).join(',')).join('\r\n');
}

export function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => !(r.length === 1 && r[0] === ''));
}

export function categoryLabel(catById, catId) {
  const c = catById[catId];
  if (!c) return '';
  if (c.parentId === null) return c.name;
  const parent = catById[c.parentId];
  return parent ? `${parent.name}: ${c.name}` : c.name;
}

export function transactionTableData(transactions, categories, accounts) {
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  const accById = Object.fromEntries(accounts.map((a) => [a.id, a]));
  const header = ['Fecha', 'Tipo', 'Monto', 'Categoria', 'Cuenta', 'Nota', 'Recurrencia', 'Conciliada'];
  const rows = transactions.map((t) => [
    t.date,
    t.type === 'income' ? 'Ingreso' : 'Gasto',
    t.amount,
    categoryLabel(catById, t.categoryId),
    accById[t.accountId]?.name || '',
    t.note || '',
    t.recurring || 'none',
    t.reconciled ? 'Si' : 'No',
  ]);
  return { header, rows };
}

export function transactionsToCSV(transactions, categories, accounts) {
  const { header, rows } = transactionTableData(transactions, categories, accounts);
  return toCSV([header, ...rows]);
}

export function csvToTransactions(text, categories, accounts) {
  const catByLabel = new Map();
  const catById = Object.fromEntries(categories.map((c) => [c.id, c]));
  for (const c of categories) {
    catByLabel.set(categoryLabel(catById, c.id).toLowerCase(), c.id);
    catByLabel.set(c.name.toLowerCase(), c.id);
  }
  const accByName = new Map(accounts.map((a) => [a.name.toLowerCase(), a.id]));

  const rows = parseCSV(text.trim());
  const records = [];
  const errors = [];

  const isHeader = (row) => row[0] && row[0].trim().toLowerCase() === 'fecha';
  const dataRows = rows.length && isHeader(rows[0]) ? rows.slice(1) : rows;

  dataRows.forEach((row, idx) => {
    const [date, tipo, monto, categoria, cuenta, nota, recurrencia, conciliada] = row;
    const lineNum = idx + 2;
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      errors.push(`Línea ${lineNum}: fecha inválida ("${date || ''}"), formato esperado AAAA-MM-DD.`);
      return;
    }
    const type = (tipo || '').trim().toLowerCase().startsWith('ingreso') ? 'income' : 'expense';
    const amount = parseFloat(monto);
    if (Number.isNaN(amount)) {
      errors.push(`Línea ${lineNum}: monto inválido ("${monto || ''}").`);
      return;
    }
    const categoryId = catByLabel.get((categoria || '').trim().toLowerCase());
    if (!categoryId) {
      errors.push(`Línea ${lineNum}: categoría no encontrada ("${categoria || ''}").`);
      return;
    }
    const accountId = accByName.get((cuenta || '').trim().toLowerCase());
    if (!accountId) {
      errors.push(`Línea ${lineNum}: cuenta no encontrada ("${cuenta || ''}").`);
      return;
    }
    const recurring = ['weekly', 'monthly'].includes((recurrencia || '').trim().toLowerCase())
      ? recurrencia.trim().toLowerCase() : 'none';

    records.push({
      date: date.trim(),
      type,
      amount: Math.abs(amount),
      categoryId,
      accountId,
      note: (nota || '').trim(),
      recurring,
      reconciled: (conciliada || '').trim().toLowerCase().startsWith('s'),
    });
  });

  return { records, errors };
}
