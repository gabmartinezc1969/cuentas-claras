const DB_NAME = 'cuentasClarasDB';
const DB_VERSION = 1;
const STORES = ['accounts', 'categories', 'transactions', 'budgets', 'goals'];

let dbPromise = null;

export function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const name of STORES) {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath: 'id', autoIncrement: true });
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(storeName, mode) {
  return openDB().then((db) => db.transaction(storeName, mode).objectStore(storeName));
}

export async function getAll(storeName) {
  const store = await tx(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getById(storeName, id) {
  const store = await tx(storeName, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function put(storeName, obj) {
  const store = await tx(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.put(obj);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function remove(storeName, id) {
  const store = await tx(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearStore(storeName) {
  const store = await tx(storeName, 'readwrite');
  return new Promise((resolve, reject) => {
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

const DEFAULT_ACCOUNTS = [
  { name: 'Cuenta corriente', type: 'corriente' },
  { name: 'Cuenta de ahorro', type: 'ahorro' },
  { name: 'Efectivo', type: 'efectivo' },
  { name: 'Tarjeta de crédito', type: 'credito' },
];

const DEFAULT_CATEGORY_TREE = [
  { name: 'Salario', kind: 'income', color: '#1B9E4B' },
  { name: 'Subsidio familiar', kind: 'income', color: '#1B9E4B' },
  { name: 'Intereses', kind: 'income', color: '#1B9E4B' },
  {
    name: 'Casa', kind: 'expense', color: '#2196F3',
    children: ['Alquiler', 'Seguros', 'Expensas', 'Internet'],
  },
  {
    name: 'Coche', kind: 'expense', color: '#FF9800',
    children: ['Gasolina', 'Reparación'],
  },
  {
    name: 'Comida y bebida', kind: 'expense', color: '#4CAF50',
    children: ['Alimentos'],
  },
  { name: 'Ocio', kind: 'expense', color: '#3F51B5', children: [] },
  { name: 'Indumentaria', kind: 'expense', color: '#009688', children: [] },
  { name: 'Electrónica', kind: 'expense', color: '#00695C', children: [] },
  { name: 'Otros', kind: 'expense', color: '#9C27B0', children: ['Revistas', 'Seguros'] },
];

export async function ensureSeeded() {
  const [accounts, categories] = await Promise.all([getAll('accounts'), getAll('categories')]);

  if (accounts.length === 0) {
    for (const acc of DEFAULT_ACCOUNTS) await put('accounts', acc);
  }

  if (categories.length === 0) {
    for (const top of DEFAULT_CATEGORY_TREE) {
      const parentId = await put('categories', {
        name: top.name, kind: top.kind, color: top.color, parentId: null,
      });
      for (const childName of top.children || []) {
        await put('categories', {
          name: childName, kind: top.kind, color: top.color, parentId,
        });
      }
    }
  }
}

export async function seedDemoData() {
  const accounts = await getAll('accounts');
  const categories = await getAll('categories');
  const byName = (n) => categories.find((c) => c.name === n);
  const acc = (n) => accounts.find((a) => a.name === n)?.id;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const iso = (d) => new Date(y, m, d).toISOString().slice(0, 10);

  const demoTx = [
    { type: 'income', amount: 2500, categoryName: 'Salario', accountName: 'Cuenta corriente', date: iso(1), note: 'Mi compañía' },
    { type: 'income', amount: 500, categoryName: 'Subsidio familiar', accountName: 'Cuenta corriente', date: iso(1), note: 'Mi compañía' },
    { type: 'income', amount: 20, categoryName: 'Intereses', accountName: 'Cuenta de ahorro', date: iso(1), note: 'Mi banco' },
    { type: 'expense', amount: 800, categoryName: 'Alquiler', accountName: 'Cuenta corriente', date: iso(1), note: 'Mi apartamento' },
    { type: 'expense', amount: 150, categoryName: 'Seguros', accountName: 'Cuenta corriente', date: iso(2), note: 'Seguro de hogar' },
    { type: 'expense', amount: 100, categoryName: 'Expensas', accountName: 'Cuenta corriente', date: iso(1), note: 'Electricidad' },
    { type: 'expense', amount: 50, categoryName: 'Internet', accountName: 'Cuenta corriente', date: iso(3), note: 'Internet' },
    { type: 'expense', amount: 250, categoryName: 'Reparación', accountName: 'Cuenta corriente', date: iso(4), note: 'Taller' },
    { type: 'expense', amount: 100, categoryName: 'Gasolina', accountName: 'Tarjeta de crédito', date: iso(5), note: 'Gasolinera' },
    { type: 'expense', amount: 75, categoryName: 'Alimentos', accountName: 'Efectivo', date: iso(6), note: 'Supermercado' },
    { type: 'expense', amount: 240, categoryName: 'Ocio', accountName: 'Tarjeta de crédito', date: iso(7), note: 'Salidas' },
    { type: 'expense', amount: 230, categoryName: 'Indumentaria', accountName: 'Tarjeta de crédito', date: iso(9), note: 'Ropa' },
    { type: 'expense', amount: 125, categoryName: 'Electrónica', accountName: 'Tarjeta de crédito', date: iso(10), note: 'Accesorios' },
    { type: 'expense', amount: 180, categoryName: 'Revistas', accountName: 'Efectivo', date: iso(12), note: 'Otros' },
  ];

  for (const t of demoTx) {
    const cat = byName(t.categoryName);
    if (!cat) continue;
    await put('transactions', {
      type: t.type,
      amount: t.amount,
      categoryId: cat.id,
      accountId: acc(t.accountName),
      date: t.date,
      note: t.note,
      recurring: false,
      reconciled: false,
    });
  }

  const savingsAcc = acc('Cuenta de ahorro');
  await put('goals', {
    name: 'Mi objetivo de ahorro',
    accountId: savingsAcc,
    targetAmount: 10000,
    startDate: `${y}-01-01`,
    endDate: `${y}-12-31`,
  });

  const casaCat = categories.find((c) => c.name === 'Comida y bebida' && c.parentId === null);
  await put('budgets', {
    categoryId: casaCat ? casaCat.id : byName('Alimentos').id,
    accountId: null,
    amount: 300,
    startDate: `${y}-${String(m + 1).padStart(2, '0')}-01`,
    endDate: `${y}-${String(m + 1).padStart(2, '0')}-28`,
    recurrence: 'monthly',
  });
}
