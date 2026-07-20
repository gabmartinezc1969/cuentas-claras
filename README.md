# Cuentas Claras

App de finanzas personales y presupuesto, **100% offline y privada** (sin backend, sin permisos de red, sin cuentas de usuario). Todos los datos viven en el dispositivo, en IndexedDB.

Construida como PWA vanilla (HTML + CSS + JavaScript con módulos ES, sin frameworks ni dependencias externas) para que sea instalable desde el navegador tanto en Android como en iOS/desktop.

**Demo en vivo:** https://gabmartinezc1969.github.io/cuentas-claras/

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
- **Transacciones recurrentes**: una transacción puede marcarse "Cada semana" o "Mensualmente"; sus repeticiones futuras (y pasadas) se proyectan automáticamente en Movimientos, Inicio, Estadística, Diagrama, Calendario y en el cálculo de "gastado" de Presupuestos, sin necesidad de crear una fila por período. Se muestran con el ícono 🔁. Al editar o borrar una repetición proyectada, la app pregunta si el cambio aplica **solo a esa repetición** (se guarda como una excepción sobre la fecha) o **a todas** (edita la regla base); las excepciones se marcan como "modificada" en Movimientos.
- **Conciliación bancaria**: cada transacción puede marcarse como "Conciliada con el banco" desde su formulario; se indica con "✓ conciliada" en Movimientos, que además tiene un filtro Todas / Conciliadas / Pendientes.
- **Transacciones divididas**: al crear una transacción nueva, "Dividir en varias categorías" permite repartir un mismo gasto/ingreso entre 2 o más categorías; se guardan como transacciones independientes ligadas por un `splitGroupId` común (editar una parte solo afecta a esa línea).
- **Plantillas**: desde el formulario de una transacción se puede "Guardar como plantilla"; al crear una nueva transacción se puede elegir una plantilla para prellenar tipo/monto/categoría/cuenta/nota. Se gestionan (listar/borrar) desde Ajustes.
- **Fotos de recibos**: cada transacción admite adjuntar una foto (input de archivo/cámara), guardada como `dataURL` en IndexedDB; se ve como miniatura al editar y con un ícono 📷 en Movimientos.
- **Recordatorios**: alta/baja/marcar-hecho desde Ajustes; los que vencen en los próximos 7 días aparecen en una tarjeta en Inicio. Si el usuario activa las notificaciones del navegador, los recordatorios vencidos disparan una `Notification` mientras la app está abierta (no hay servidor push, así que no llegan con la app cerrada).
- **Copia de seguridad automática**: tras cada cambio se guarda (con un pequeño debounce) una foto completa de los datos en un store interno de IndexedDB; Ajustes muestra la fecha de la última copia y permite restaurarla. No reemplaza la exportación manual en JSON/CSV, que sigue siendo la única forma de sacar una copia fuera del dispositivo.
- **Importar/Exportar CSV** de transacciones desde Ajustes, además del backup completo en JSON. El CSV usa el formato propio de la app (columnas: Fecha, Tipo, Monto, Categoria, Cuenta, Nota, Recurrencia, Conciliada); no incluye parsers para formatos bancarios de terceros.
- **Exportar a Excel y HTML**: además del CSV/JSON, Ajustes permite exportar las transacciones como `.xls` (HTML de tabla que Excel abre nativamente, sin depender de ninguna librería externa) y como una página `.html` autocontenida lista para ver o imprimir.
- **Categorías y subcategorías editables**: alta, recoloreo y borrado de categorías (y subcategorías) desde Ajustes, sin tocar código; ya no dependen únicamente de la semilla fija de `js/db.js`.
- **Colores personalizables**: el color del header y el del acento (botón +) se pueden cambiar desde Ajustes y se guardan en `localStorage`, aplicados vía variables CSS.
- **Bloqueo biométrico (WebAuthn)**: alternativa al PIN usando el sensor del dispositivo (huella/Face ID) a través de un credential de tipo `platform` registrado localmente. Como la app no tiene servidor, no hay verificación criptográfica del lado servidor — la protección real la da el propio sistema operativo al exigir verificación de usuario antes de resolver la promesa de WebAuthn. Se recomienda mantener un PIN como respaldo.
- **Ajustes**: modo claro/oscuro, colores personalizados, bloqueo de la app con PIN y/o biometría, gestión de cuentas y categorías, datos de ejemplo, exportar/importar copia de seguridad en JSON, exportar/importar transacciones en CSV, exportar a Excel/HTML, borrar todos los datos.
- Selector de mes/año con navegación ← → en todas las pantallas con datos temporales.
- PWA instalable con manifest + service worker (cache del app shell para uso offline).
- Categorías por defecto: Casa (Alquiler, Seguros, Expensas, Internet), Coche (Gasolina, Reparación), Comida y bebida (Alimentos), Ocio, Indumentaria, Electrónica, Otros; e Ingresos (Salario, Subsidio familiar, Intereses).

## Roadmap (v5 — fuera de alcance para una PWA vanilla)

Lo que queda pendiente ya no son huecos de producto sino limitaciones estructurales de construir esto como una PWA sin backend ni empaquetado nativo:

- Soporte de importación para formatos CSV específicos de bancos (hoy solo el formato propio de exportación; agregar un banco es viable pero requiere su plantilla exacta de columnas).
- Entrada rápida vía widget de pantalla de inicio / atajo del ícono de la app — requeriría empaquetado nativo (Capacitor, Trusted Web Activity) en lugar de una PWA vanilla.
- Notificaciones de recordatorios con la app cerrada — requeriría un servidor de push (Web Push) que rompería la premisa "sin permisos de Internet" del proyecto.
- Edición de una transacción dividida completa desde un solo formulario (hoy cada línea del split se edita por separado; sí se puede editar/eliminar una repetición recurrente individual).
- Verificación criptográfica del lado servidor para el bloqueo biométrico (no aplica sin backend).

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
│   ├── export-formats.js     # export a Excel (.xls) y HTML
│   ├── webauthn.js            # registro/autenticación biométrica (WebAuthn)
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
