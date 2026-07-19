# Cuentas Claras

App de finanzas personales y presupuesto, **100% offline y privada** (sin backend, sin permisos de red, sin cuentas de usuario). Todos los datos viven en el dispositivo, en IndexedDB.

Construida como PWA vanilla (HTML + CSS + JavaScript con módulos ES, sin frameworks ni dependencias externas) para que sea instalable desde el navegador tanto en Android como en iOS/desktop.

## Cómo probarla localmente

No requiere build ni `npm install`. Solo necesita servirse por HTTP (los módulos ES y el service worker no funcionan con `file://`).

```bash
cd cuentas-claras
python3 -m http.server 8080
# abre http://localhost:8080 en el navegador
```

O con Node:

```bash
npx serve .
```

Para instalarla como app: abre el sitio en Chrome/Edge (Android/desktop) o Safari (iOS) y usa "Agregar a pantalla de inicio" / "Instalar app".

## Funcionalidad incluida (v1)

- **Inicio**: resumen de ingresos/gastos/saldo del mes, gráfico circular de gastos por categoría, top 5 categorías con más gasto.
- **Movimientos**: listado agrupado por día con saldo acumulado, alta/edición/borrado de transacciones (ingreso o gasto), selección de cuenta y categoría/subcategoría.
- **Presupuestos**: creación de presupuestos por categoría (y opcionalmente por cuenta), con barra de progreso rojo/verde y recurrencia (única vez / semanal / mensual).
- **Objetivos de ahorro**: metas ligadas a una cuenta, con barra de progreso y estado "Objetivo alcanzado".
- **Resumen**: histórico mensual con saldo acumulado a fin de cada mes y barra ingresos/gastos.
- **Estadística**: totales de ingresos/gastos del período y desglose por categoría y subcategoría.
- **Diagrama**: gráfico de barras y circular por categoría, con sub-tabs y toggle "Mostrar porcentaje".
- **Calendario**: grid mensual con el neto de cada día; al tocar un día se listan sus transacciones.
- **Transacciones recurrentes**: una transacción puede marcarse "Cada semana" o "Mensualmente"; sus repeticiones futuras (y pasadas) se proyectan automáticamente en Movimientos, Inicio, Estadística, Diagrama, Calendario y en el cálculo de "gastado" de Presupuestos, sin necesidad de crear una fila por período. Se muestran con el ícono 🔁. Editar o borrar la transacción afecta a todas sus repeticiones (no hay edición de una ocurrencia individual todavía).
- **Conciliación bancaria**: cada transacción puede marcarse como "Conciliada con el banco" desde su formulario; se indica con "✓ conciliada" en Movimientos. (Aún no hay un filtro dedicado para ver solo conciliadas/pendientes.)
- **Importar/Exportar CSV** de transacciones desde Ajustes, además del backup completo en JSON. El CSV usa el formato propio de la app (columnas: Fecha, Tipo, Monto, Categoria, Cuenta, Nota, Recurrencia, Conciliada); no incluye parsers para formatos bancarios de terceros.
- **Ajustes**: modo claro/oscuro, bloqueo de la app con PIN (hash SHA-256 en `localStorage`, sin enviar nada a ningún servidor), gestión simple de cuentas, datos de ejemplo, exportar/importar copia de seguridad en JSON, exportar/importar transacciones en CSV, borrar todos los datos.
- Selector de mes/año con navegación ← → en todas las pantallas con datos temporales.
- PWA instalable con manifest + service worker (cache del app shell para uso offline).
- Categorías por defecto: Casa (Alquiler, Seguros, Expensas, Internet), Coche (Gasolina, Reparación), Comida y bebida (Alimentos), Ocio, Indumentaria, Electrónica, Otros; e Ingresos (Salario, Subsidio familiar, Intereses).

## Roadmap (v3 — no implementado aún)

- Exportación a **Excel/HTML** (hoy solo CSV y JSON).
- Soporte de importación para formatos CSV específicos de bancos (hoy solo el formato propio de exportación).
- Filtro dedicado de "conciliadas / pendientes" en Movimientos.
- **Copias de seguridad automáticas** (programadas), además de la exportación manual ya disponible.
- **Biometría** (WebAuthn) como alternativa al PIN.
- **Transacciones divididas** (un recibo repartido en varias categorías).
- **Plantillas** de transacciones y entrada rápida vía widget / atajo del ícono.
- **Fotos de recibos** adjuntas a una transacción.
- **Recordatorios** de gastos próximos (Notifications API).
- Edición de una única ocurrencia de una transacción recurrente (hoy editar/borrar afecta a todas).
- Edición de categorías/subcategorías desde la UI (hoy son fijas, definidas en `js/db.js`).
- Colores personalizables por el usuario (hoy son fijos vía variables CSS en `css/styles.css`).

## Estructura del proyecto

```
cuentas-claras/
├── index.html
├── manifest.json
├── sw.js
├── css/
│   └── styles.css
├── js/
│   ├── app.js          # bootstrap, routing por tabs, estado, modales
│   ├── db.js            # capa de datos IndexedDB + seed
│   ├── format.js         # helpers de moneda/fecha
│   ├── charts.js          # gráfico circular (donut) y de barras, sin dependencias
│   ├── analytics.js        # agregación: saldo acumulado, agrupación por categoría, proyección de recurrentes
│   ├── crypto.js           # hash SHA-256 para el PIN
│   ├── csv.js               # export/import de transacciones en CSV
│   └── screens/
│       ├── inicio.js
│       ├── movimientos.js
│       ├── resumen.js
│       ├── estadistica.js
│       ├── diagrama.js
│       ├── calendario.js
│       ├── presupuestos.js
│       ├── objetivos.js
│       └── ajustes.js
└── icons/
    └── icon.svg
```

## Notas de diseño

- Paleta: header en degradado morado (`#6D28D9` → `#5B0FBD`), acento turquesa (`#14B8A6`) para el botón de agregar, verde/rojo para montos positivos/negativos.
- Modo oscuro vía `[data-theme="dark"]` y variables CSS.
- El ícono (`icons/icon.svg`) es un placeholder vectorial; para publicación en tiendas conviene generar PNGs de alta resolución (192×192, 512×512, maskable) a partir de él.
