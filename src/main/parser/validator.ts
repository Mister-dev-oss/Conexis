import { parseTxtBuffer } from "./txt";
import { parseDocxBuffer } from "./word";
import { parseCsvBuffer, parseExcelAllSheetsAsString } from "./exel";

export type FileInfo = {
    arraybuffer: ArrayBuffer
    name: string
    size: number
    type: string
}

function validateFile(file: FileInfo) {
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error("Tipo file non supportato");
  }
  if (file.size <= 0) {
    throw new Error("File vuoto");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("File troppo grande");
  }
}


const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_LENGTH = 50000; // max 50k caratteri
const ALLOWED_TYPES = [
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

function validateText(text: string) {
  if (text.length === 0) throw new Error("Il file non contiene testo leggibile");
  if (text.length > MAX_TEXT_LENGTH) throw new Error("Testo troppo lungo per il RAG DB");
}

export async function parseFileBuffer(buffer: Buffer, fileType: string, fileName: string): Promise<string> {
  try {
    switch (fileType) {
      case "text/plain":
        return await parseTxtBuffer(buffer);
      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        // Nuovo case per Excel
        const excelData = await parseExcelAllSheetsAsString(buffer);
        return JSON.stringify(excelData);
      case "text/csv":
        return parseCsvBuffer(buffer);
      case "application/msword":
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return await parseDocxBuffer(buffer);
      default:
        throw new Error(`Tipo file non supportato: ${fileType}`);
    }
  } catch (err: any) {
    throw new Error(`Errore nel parsing del file "${fileName}": ${err.message || err}`);
  }
}


export async function processFile(file: FileInfo): Promise<string> { 
  try {
    const buffer = Buffer.from(file.arraybuffer);
    validateFile(file);

    const text = await parseFileBuffer(buffer , file.type, file.name);

    validateText(text);

    return text;

  } catch (err: any) {
   
    throw new Error(`Impossibile processare il file "${file.name}": ${err.message || err}`)
}
}