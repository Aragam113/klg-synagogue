export type CsvColumn<T> = [header: string, value: (row: T) => string];

function cell(v: string): string {
  // Защита от формул в Excel (CSV-инъекция): ячейка, начинающаяся с = + - @ \t \r, — текст с префиксом '.
  const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
  // Экранирование кавычек, разделителей («;» и «,») и переводов строк.
  return /[";,\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** CSV для Excel: BOM, разделитель «;», CRLF. */
export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map(([h]) => cell(h)).join(';')];
  for (const row of rows)
    lines.push(columns.map(([, f]) => cell(f(row))).join(';'));
  return '﻿' + lines.join('\r\n') + '\r\n';
}
