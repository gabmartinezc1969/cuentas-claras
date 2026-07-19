const STORES = ['accounts', 'categories', 'transactions', 'budgets', 'goals'];

export async function renderAjustes(container, ctx) {
  const { db, theme, setTheme, sha256, refresh } = ctx;
  const accounts = await db.getAll('accounts');
  const hasPin = !!localStorage.getItem('cc-pin-hash');

  const accountRows = accounts.map((a) => `
    <div class="settings-row">
      <span>${a.name}</span>
      <button class="icon-btn" data-del-account="${a.id}" title="Eliminar">🗑</button>
    </div>
  `).join('');

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
      <h3>Datos</h3>
      <div class="btn-row" style="flex-direction:column;gap:10px">
        <button class="btn btn-outline" id="btn-demo">Cargar datos de ejemplo</button>
        <button class="btn btn-outline" id="btn-export">Exportar copia de seguridad (JSON)</button>
        <label class="btn btn-outline" style="display:flex;align-items:center;justify-content:center">
          Importar copia de seguridad
          <input type="file" id="btn-import" accept="application/json" style="display:none" />
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

  container.querySelector('#btn-reset').addEventListener('click', async () => {
    if (!confirm('Se borrarán TODOS tus datos permanentemente. ¿Estás seguro?')) return;
    for (const s of STORES) await db.clearStore(s);
    await db.ensureSeeded();
    alert('Datos borrados.');
    refresh();
  });
}
