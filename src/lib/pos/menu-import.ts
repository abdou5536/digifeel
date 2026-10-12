import { parseMoneyInput, type PosCurrency } from './currency';

export type MenuRow = { name: string; category: string; priceMinor: number };
export type MenuParseResult = { rows: MenuRow[]; errors: string[] };

const NAME_KEYS = ['nom', 'name', 'produit', 'article', 'plat', 'designation', 'désignation'];
const CATEGORY_KEYS = ['categorie', 'catégorie', 'category', 'famille', 'rubrique'];
const PRICE_KEYS = ['prix', 'price', 'tarif', 'montant'];

export const MENU_IMPORT_LIMIT = 500;

function splitLine(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') { current += '"'; index += 1; } else quoted = !quoted;
    } else if (char === delimiter && !quoted) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

/** Convertit un tableau de cellules (CSV ou Excel) en produits ; la première ligne peut être un en-tête. */
export function parseMenuTable(table: string[][], currency: PosCurrency): MenuParseResult {
  const lines = table.filter(row => row.some(cell => cell.trim() !== ''));
  const errors: string[] = [];
  if (lines.length === 0) return { rows: [], errors: ['Le fichier est vide.'] };

  const header = lines[0].map(cell => cell.toLowerCase().trim());
  const find = (keys: string[]) => header.findIndex(cell => keys.includes(cell));
  let nameIndex = find(NAME_KEYS);
  let categoryIndex = find(CATEGORY_KEYS);
  let priceIndex = find(PRICE_KEYS);
  let body = lines.slice(1);
  if (nameIndex === -1 || priceIndex === -1) {
    nameIndex = 0;
    categoryIndex = lines[0].length >= 3 ? 1 : -1;
    priceIndex = lines[0].length >= 3 ? 2 : 1;
    body = lines;
  }

  const rows: MenuRow[] = [];
  body.forEach((cells, offset) => {
    const lineNumber = offset + (body === lines ? 1 : 2);
    const name = (cells[nameIndex] ?? '').trim();
    const category = categoryIndex >= 0 ? (cells[categoryIndex] ?? '').trim() : '';
    const priceMinor = parseMoneyInput((cells[priceIndex] ?? '').replace(/[^\d.,]/g, ''), currency);
    if (name.length < 1 || name.length > 120) { errors.push(`Ligne ${lineNumber} : nom manquant ou trop long.`); return; }
    if (category.length > 60) { errors.push(`Ligne ${lineNumber} : catégorie trop longue.`); return; }
    if (priceMinor === null) { errors.push(`Ligne ${lineNumber} : prix illisible pour « ${name} ».`); return; }
    rows.push({ name, category: category || 'Divers', priceMinor });
  });

  if (rows.length > MENU_IMPORT_LIMIT) {
    return { rows: rows.slice(0, MENU_IMPORT_LIMIT), errors: [...errors, `Seules les ${MENU_IMPORT_LIMIT} premières lignes sont importées.`] };
  }
  return { rows, errors };
}

export function parseMenuCsv(text: string, currency: PosCurrency): MenuParseResult {
  const clean = text.replace(/^\uFEFF/, '');
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = [';', '\t', ','].reduce((best, candidate) =>
    firstLine.split(candidate).length > firstLine.split(best).length ? candidate : best, ';');
  return parseMenuTable(clean.split(/\r?\n/).map(line => splitLine(line, delimiter)), currency);
}
