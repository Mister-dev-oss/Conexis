import { extractRawText } from "mammoth";

export async function parseDocxBuffer(buffer: Buffer): Promise<string> {
  try {
    const result = await extractRawText({ buffer });
    return result.value.trim();
  } catch (err: any) {
    throw new Error(`Errore nel parsing DOCX: ${err.message || err}`);
  }
}
