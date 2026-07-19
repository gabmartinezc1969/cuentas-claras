import { transactionsToCSV, csvToTransactions } from '../csv.js';

const STORES = ['accounts', 'categories', 'transactions', 'budgets', 'goals', 'templates', 'reminders'];

export async function renderAjustes(container, ctx) {
  const { db, money, theme, setTheme, sha256, refresh } = ctx;
  const [accounts, categories, templates, reminders, autobackup] = await Promise.all([
    db.getAll('accounts'), db.getAll('categories'), db.getAll('templates'), db.getAll('reminders'), db.getById('autobackup', 1),
  ]);
  const hasPin = !!localStorage.getItem('cc-pin-hash');
  const expenseCategoriesHtml = categories
    .filter((c) => c.kind === 'expense')
    .map((c) => `<option value="${c.id}">${c.parentId === null ? c.name : `${categories.find((p) => p.id === c.parentId)?.name}: ${c.name}`}</option>`)
    .join('');

  const accountRows = accounts.map((a) => `
    <div class="settings-row">
      <span>${a.name}</span>
      <button class="icon-btn" data-del-account="${a.id}" title="Eliminar">🗑</button>
    </div>
  `).join('');

  const templateRows = templates.length
    ? templates.map((t) => `
      <div class="settings-row">
        <span>${t.name} (${money(t.amount)})</span>
        <button class="icon-btn" data-del-template="${t.id}" title="Eliminar">🗑</button>
      </div>
    `).join('')
    : '<p style="font-size:13px;color:var(--text-muted);margin:0">Guarda una plantilla desde el formulario de una transacción.</p>';

  const reminderRows = reminders.length
    ? [...reminders].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).map((r) => `
      <div class="settings-row">
        <span style="${r.done ? 'text-decoration:line-through;color:var(--text-muted)' : ''}">${r.dueDate} — ${r.note} (${money(r.amount)})</span>
        <span style="display:flex;gap:6px">
          <button class="icon-btn" data-done-reminder="${r.id}" title="${r.done ? 'Marcar pendiente' : 'Marcar hecho'}">${r.done ? '↺' : '✓'}</button>
          <button class="icon-btn" data-del-reminder="${r.id}" title="Eliminar">🗑</button>
        </span>
      </div>
    `).join('')
    : '<p style="font-size:13px;color:var(--text-muted);margin:0">Sin recordatorios.</p>';

  const notifPermission = typeof Notification !== 'undefined' ? Notification.permission : 'unsupported';

  container.innerHTML = `
    <div class="card">
      <h3>Apariencia</h3>
      <div class="settings-row">
        <span>Modo oscuro</span>
        <label class="switch">
          <input type="checkbox" id="dark-toggle" ${theme === 'dark' ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
    </div>

    <div class="card">
      <h3>Seguridad</h3>
      <div class="settings-row">
        <span>Bloqueo con PIN</span>
        <label class="switch">
          <input type="checkbox" id="pin-toggle" ${hasPin ? 'checked' : ''} />
          <span class="slider"></span>
        </label>
      </div>
      <p style="font-size:12px;color:var(--text-muted);margin:6px 0 0">
        No es posible la sincronización directa entre varios dispositivos porque la app no usa permisos de Internet.
        Tus datos permanecen sólo en este dispositivo.
      </p>
    </div>

    <div class="card">
      <h3>Cuentas</h3>
      ${accountRows}
      <form id="add-account-form" style="display:flex;gap:8px;margin-top:10px">
        <input type="text" name="name" placeholder="Nueva cuenta" required style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text)" />
        <button type="submit" class="btn btn-primary" style="width:auto;padding:10px 14px">Añadir</button>
      </form>
    </div>

    <div class="card">
      <h3>Plantillas</h3>
      ${templateRows}
    </div>

    <div class="card">
      <h3>Recordatorios de gastos próximos</h3>
      ${reminderRows}
      <form id="add-reminder-form" style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
        <input type="text" name="note" placeholder="Descripción" required style="padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text)" />
        <div style="display:flex;gap:8px">
          <input type="number" step="0.01" min="0" name="amount" placeholder="Monto" required style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text)" />
          <input type="date" name="dueDate" required style="flex:1;padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text)" />
        </div>
        <select name="categoryId" style="padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text)">${expenseCategoriesHtml}</select>
        <button type="submit" class="btn btn-primary">Agregar recordatorio</button>
      </form>
      ${notifPermission !== 'unsupported' ? `
        <div class="settings-row" style="border:none;margin-top:6px">
          <span>Notificaciones ${notifPermission === 'granted' ? 'activadas' : notifPermission === 'denied' ? 'bloqueadas' : 'desactivadas'}</span>
          ${notifPermission === 'default' ? '<button class="btn btn-outline" id="btn-enable-notif" style="width:auto;padding:8px 12px">Activar</button>' : ''}
        </div>
        <p style="font-size:12px;color:var(--text-muted);margin:6px 0 0">
          Las notificaciones solo se disparan mientras la app está abierta (no hay servidor de notificaciones push).
        </p>
      ` : ''}
    </div>

    <div class="card">
      <h3>Copia de seguridad automática</h3>
      <p style="font-size:13px;margin:0 0 10px">
        ${autobackup ? `Última copia automática: ${new Date(autobackup.timestamp).toLocaleString()}` : 'Todavía no se generó ninguna copia automática.'}
      </p>
      <button class="btn btn-outline" id="btn-restore-auto" ${autobackup ? '' : 'disabled'}>Restaurar última copia automática</button>
      <p style="font-size:12px;color:var(--text-muted);margin:6px 0 0">
        Se guarda automáticamente en este dispositivo después de cada cambio. No reemplaza a la exportación manual.
      </p>
    </div>

    <div class="card">
      <h3>Datos</h3>
      <div class="btn-row" style="flex-direction:column;gap:10px">
        <button class="btn btn-outline" id="btn-demo">Cargar datos de ejemplo</button>
        <button class="btn btn-outline" id="btn-export">Exportar copia de seguridad (JSON)</button>
        <label class="btn btn-outline" style="display:flex;align-items:center;justify-content:center">
          Importar copia de seguridad
          <input type="file" id="btn-import" accept="application/json" style="display:none" />
        </label>
        <button class="btn btn-outline" id="btn-export-csv">Exportar transacciones (CSV)</button>
        <label class="btn btn-outline" style="display:flex;align-items:center;justify-content:center">
          Importar transacciones (CSV)
          <input type="file" id="btn-import-csv" accept=".csv,text/csv" style="display:none" />
        </label>
        <button class="btn btn-danger" id="btn-reset">Borrar todos los datos</button>
      </div>
    </div>

    <div class="card">
      <h3>Acerca de</h3>
      <p style="margin:0;font-size:13px;color:var(--text-muted)">
        Cuentas Claras — finanzas personales 100% offline. Todos tus datos se guardan únicamente en este dispositivo.
      </p>
    </div>
  `;

  container.querySelector('#dark-toggle').addEventListener('change', (e) => {
    setTheme(e.target.checked ? 'dark' : 'light');
  });

  container.querySelector('#pin-toggle').addEventListener('change', async (e) => {
    if (e.target.checked) {
      const pin = prompt('Crea un PIN (4 a 8 dígitos):');
      if (!pin || pin.length < 4) {
        e.target.checked = false;
        return;
      }
      localStorage.setItem('cc-pin-hash', await sha256(pin));
      alert('PIN activado. Se pedirá la próxima vez que abras la app.');
    } else {
      localStorage.removeItem('cc-pin-hash');
    }
  });

  container.querySelectorAll('[data-del-account]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar esta cuenta? Las transacciones asociadas no se eliminarán.')) return;
      await db.remove('accounts', parseInt(btn.dataset.delAccount, 10));
      refresh();
    });
  });

  container.querySelector('#add-account-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.put('accounts', { name: fd.get('name'), type: 'otra' });
    refresh();
  });

  container.querySelector('#btn-demo').addEventListener('click', async () => {
    await db.seedDemoData();
    alert('Datos de ejemplo cargados.');
    refresh();
  });

  container.querySelector('#btn-export').addEventListener('click', async () => {
    const dump = {};
    for (const s of STORES) dump[s] = await db.getAll(s);
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuentas-claras-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  container.querySelector('#btn-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Esto reemplazará todos los datos actuales. ¿Continuar?')) { e.target.value = ''; return; }
    const text = await file.text();
    const data = JSON.parse(text);
    for (const s of STORES) {
      await db.clearStore(s);
      for (const record of data[s] || []) await db.put(s, record);
    }
    alert('Copia de seguridad importada.');
    refresh();
  });

  container.querySelector('#btn-export-csv').addEventListener('click', async () => {
    const [transactions, categories, accountsForCsv] = await Promise.all([
      db.getAll('transactions'), db.getAll('categories'), db.getAll('accounts'),
    ]);
    const csv = transactionsToCSV(transactions, categories, accountsForCsv);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuentas-claras-transacciones-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  });

  container.querySelector('#btn-import-csv').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const [categories, accountsForCsv] = await Promise.all([db.getAll('categories'), db.getAll('accounts')]);
    const text = await file.text();
    const { records, errors } = csvToTransactions(text, categories, accountsForCsv);
    for (const record of records) await db.put('transactions', record);
    let message = `${records.length} transacción(es) importada(s).`;
    if (errors.length) {
      message += `\n\n${errors.length} fila(s) omitida(s):\n${errors.slice(0, 10).join('\n')}`;
      if (errors.length > 10) message += `\n… y ${errors.length - 10} más.`;
    }
    alert(message);
    refresh();
  });

  container.querySelectorAll('[data-del-template]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await db.remove('templates', parseInt(btn.dataset.delTemplate, 10));
      refresh();
    });
  });

  container.querySelector('#add-reminder-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    await db.put('reminders', {
      note: fd.get('note'),
      amount: parseFloat(fd.get('amount')),
      dueDate: fd.get('dueDate'),
      categoryId: parseInt(fd.get('categoryId'), 10),
      done: false,
    });
    refresh();
  });

  container.querySelectorAll('[data-done-reminder]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = parseInt(btn.dataset.doneReminder, 10);
      const reminder = await db.getById('reminders', id);
      reminder.done = !reminder.done;
      await db.put('reminders', reminder);
      refresh();
    });
  });

  container.querySelectorAll('[data-del-reminder]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await db.remove('reminders', parseInt(btn.dataset.delReminder, 10));
      refresh();
    });
  });

  const enableNotifBtn = container.querySelector('#btn-enable-notif');
  if (enableNotifBtn) {
    enableNotifBtn.addEventListener('click', async () => {
      await Notification.requestPermission();
      refresh();
    });
  }

  container.querySelector('#btn-restore-auto').addEventListener('click', async () => {
    if (!autobackup) return;
    if (!confirm('Esto reemplazará todos los datos actuales con la última copia automática. ¿Continuar?')) return;
    for (const s of STORES) {
      await db.clearStore(s);
      for (const record of autobackup.data[s] || []) await db.put(s, record);
    }
    alert('Copia automática restaurada.');
    refresh();
  });

  container.querySelector('#btn-reset').addEventListener('click', async () => {
    if (!confirm('Se borrarán TODOS tus datos permanentemente. ¿Estás seguro?')) return;
    for (const s of STORES) await db.clearStore(s);
    await db.ensureSeeded();
    alert('Datos borrados.');
    refresh();
  });
}
