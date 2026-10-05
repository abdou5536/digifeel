import ExcelJS from 'exceljs';

// Remplace `xlsx` (SheetJS : vulnérabilités hautes sans correctif) avec le sous-ensemble d'API utilisé par l'application.
export type Row = Record<string, unknown>;
export type Book = { SheetNames: string[]; Sheets: Record<string, Row[]> };

// Neutralise l'injection de formules quand le fichier est ouvert dans Excel.
export function safeCell(value: unknown): unknown {
  return typeof value === 'string' && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function parseCsv(text: string): Row[] {
  const records: string[][] = [];
  let record: string[] = [];
  let cell = '';
  let quoted = false;
  const body = text.replace(/^\uFEFF/, '');
  const endRecord = () => {
    record.push(cell);
    cell = '';
    if (record.some(value => value.trim())) records.push(record);
    record = [];
  };
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quoted) {
      if (c === '"' && body[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') quoted = false; else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',' || c === ';') { record.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && body[i + 1] === '\n') i++; endRecord(); }
    else cell += c;
  }
  endRecord();
  const [head = [], ...rows] = records;
  return rows.map(values => Object.fromEntries(head.map((key, i) => [key, values[i] ?? ''])));
}

export const utils = {
  book_new: (): Book => ({ SheetNames: [], Sheets: {} }),
  json_to_sheet: (rows: Row[]): Row[] => rows,
  book_append_sheet: (book: Book, sheet: Row[], name: string) => { book.SheetNames.push(name); book.Sheets[name] = sheet; },
  sheet_to_json: <T = Row>(sheet: Row[], _options?: { defval?: unknown }): T[] => sheet as unknown as T[]
};

export async function bookToBuffer(book: Book): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  for (const name of book.SheetNames) {
    const rows = book.Sheets[name];
    const sheet = workbook.addWorksheet(name.slice(0, 31));
    const columns = [...new Set(rows.flatMap(row => Object.keys(row)))];
    sheet.addRow(columns);
    for (const row of rows) sheet.addRow(columns.map(column => safeCell(row[column] ?? '')));
  }
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}

export async function read(buffer: ArrayBuffer): Promise<Book> {
  const book = utils.book_new();
  const workbook = new ExcelJS.Workbook();
  try {
    await workbook.xlsx.load(buffer);
  } catch {
    utils.book_append_sheet(book, parseCsv(new TextDecoder().decode(buffer)), 'Sheet1');
    return book;
  }
  for (const sheet of workbook.worksheets) {
    const head = (sheet.getRow(1).values as unknown[]).slice(1).map(cell => String(cell ?? ''));
    const rows: Row[] = [];
    sheet.eachRow((row, index) => {
      if (index === 1) return;
      const values = (row.values as unknown[]).slice(1);
      rows.push(Object.fromEntries(head.map((key, i) => {
        const cell = values[i];
        return [key, cell && typeof cell === 'object' && 'text' in cell ? (cell as { text: string }).text : cell ?? ''];
      })));
    });
    utils.book_append_sheet(book, rows, sheet.name);
  }
  return book;
}

export async function writeFile(book: Book, filename: string): Promise<void> {
  const url = URL.createObjectURL(new Blob([await bookToBuffer(book)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}