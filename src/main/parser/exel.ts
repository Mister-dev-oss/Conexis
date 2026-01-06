import readXlsxFile from 'read-excel-file/node';
import { readSheetNames, Row } from 'read-excel-file/node';
import Papa from 'papaparse';
// Tipi generici
type ExcelRow = Record<string, string>;
type ExcelData = Record<string, ExcelRow[]>;

// Funzione di normalizzazione dei nomi colonne
function normalizeHeader(name: unknown, idx: number): string {
  if (!name) return `col${idx}`;
  return String(name).trim().toLowerCase().replace(/\s+/g, "_");
}

export async function parseExcelAllSheetsAsString(buffer: Buffer): Promise<string> {
  const sheetNames = await readSheetNames(buffer);
  const result: ExcelData = {};

  for (const sheetName of sheetNames) {
    // Leggi tutte le righe come array
    const rows: Row[] = await readXlsxFile(buffer, { sheet: sheetName });

    if (rows.length === 0) {
      result[sheetName] = [];
      continue;
    }

    // Prima riga come header
    const headerRow: unknown[] = rows[0];
    const headers: string[] = headerRow.map((col, idx) => normalizeHeader(col, idx));

    // Trasforma tutte le righe successive in oggetti {col: value} con stringhe
    const objRows: ExcelRow[] = rows.slice(1).map((row) => {
      const obj: ExcelRow = {};
      headers.forEach((key, idx) => {
        const val = row[idx];
        obj[key] = val !== null && val !== undefined ? String(val) : "";
      });
      return obj;
    });

    result[sheetName] = objRows;
  }

  

  const rawData: ExcelRow[] = Object.values(result).flat();
  const ragText = rowsToRAGText(rawData);
// trasforma in testo leggibile
  return ragText
}


type RowData = Record<string, unknown>;
function rowsToRAGText(rows: RowData[], separator = " | "): string {
  return rows
    .filter(row => Object.values(row).some(v => v !== null && v !== undefined && v !== "" && v !== "//"))
    .map(row => {
      return Object.entries(row)
        .map(([k, v], idx) => {
          const key = k && k.trim() ? capitalize(k) : `Col${idx + 1}`;
          if (v === "//" || v === "" || v === null || v === undefined) return null;
          return `${key}: ${v}`;
        })
        .filter(Boolean)
        .join(separator);
    })
    .join("\n");

  function capitalize(str: string) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export function parseCsvBuffer(buffer: Buffer): string {
  const csvString = buffer.toString('utf-8');

  const result = Papa.parse(csvString, {
    header: true,        // prima riga come header
    skipEmptyLines: true,
  });

  // Tutti i valori come stringhe
  const data = (result.data as Record<string, string>[]).map(row => {
    const obj: Record<string, string> = {};
    Object.entries(row).forEach(([k, v]) => {
      obj[k] = v !== null && v !== undefined ? String(v) : "";
    });
    return obj;
  });

  return rowsToRAGText(data)
}