export async function parseTxtBuffer(buffer: Buffer): Promise<string> {
  try {
    return buffer.toString("utf-8").trim();
  } catch (err: any) {
    throw new Error(`Errore nel parsing TXT: ${err.message || err}`);
  }
}
