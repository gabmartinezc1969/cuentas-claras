import { transactionTableData } from './csv.js';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function tableRows(header, rows) {
  const head = `<tr>${header.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;
  const body = rows.map((r) => `<tr>${r.map((cell) => `<td>${escapeHtml(cell)}</td>`).join('')}</tr>`).join('');
  return `<table border="1" cellspacing="0" cellpadding="4">${head}${body}</table>`;
}

/**
 * Excel opens an .xls file that is actually HTML just fine (it detects the
 * content and shows a one-time format warning) — this avoids depending on a
 * real xlsx-writing library while still giving a spreadsheet-ready file.
 */
export function transactionsToXLS(transactions, categories, accounts) {
  const { header, rows } = transactionTableData(transactions, categories, accounts);
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <!--[if gte mso 9]><xml>
    <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>Transacciones</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
  </xml><![endif]-->
</head>
<body>${tableRows(header, rows)}</body>
</html>`;
}

export function transactionsToHTML(transactions, categories, accounts) {
  const { header, rows } = transactionTableData(transactions, categories, accounts);
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<title>Cuentas Claras — Transacciones</title>
<style>
  body { font-family: -apple-system, Arial, sans-serif; margin: 24px; color: #1B1B22; }
  h1 { font-size: 20px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
  th { background: #5B0FBD; color: #fff; }
  tr:nth-child(even) { background: #f7f6fb; }
</style>
</head>
<body>
  <h1>Cuentas Claras — Transacciones</h1>
  <p>Exportado el ${new Date().toLocaleString()}</p>
  ${tableRows(header, rows)}
</body>
</html>`;
}
