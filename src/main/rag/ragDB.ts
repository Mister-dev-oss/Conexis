import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { InferenceSession } from 'onnxruntime-node';
import { embeddingFullSegment, embedLongText } from './ragprocessutils';

export type Listener = {
  proc: ChildProcessWithoutNullStreams;
};

// --- Start listener ---
export function startListener(exePath: string): Listener {
  const proc = spawn(exePath);

  proc.stdout.on('data', (data) => {
    console.log('Listener output:', data.toString());
  });

  proc.stderr.on('data', (data) => {
    console.log('Listener error:', data.toString());
  });

  return {
    proc,
  };
}

// --- Push singolo segmento --- //
export async function pushSegmenttoDB(
  listener: Listener,
  segment: string[],
  session: InferenceSession,
) {
  const { text, embedding } = await embeddingFullSegment(segment, session);
  const payload = {
    command: 'push',
    text,
    embedding: Array.from(embedding),
  };
  const jsonString = JSON.stringify(payload);
  const jsonBuffer = Buffer.from(jsonString, 'utf-8');

  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(jsonBuffer.length, 0);
  listener.proc.stdin.write(lenBuf);
  listener.proc.stdin.write(jsonBuffer);

  console.log('Segmento inviato in JSON:', text);
}

// --- Push documento --- //
export async function pushDocumentToDB(
  listener: Listener,
  segment: string,
  session: InferenceSession,
) {
  // 1️⃣ Genera tutti i chunk e embedding
  let chunks: { text: string; embedding: Float32Array }[] = [];

try {
  chunks = await embedLongText(segment, session);
} catch (err) {
  console.log('Errore embedLongText:', err);
}

  // 2️⃣ Funzione helper per scrivere sicuro sullo stdin
  async function writeSafe(buffer: Buffer) {
    if (!listener.proc.stdin.write(buffer)) {
      await new Promise<void>(resolve => listener.proc.stdin.once('drain', () => resolve()));
    }
  }

  // 3️⃣ Itera su tutti i chunk
  for (const { text, embedding } of chunks) {
    console.log(text, embedding)
    const payload = {
      command: 'push',
      text,
      embedding: Array.from(embedding), 
    };

    const jsonBuffer = Buffer.from(JSON.stringify(payload), 'utf-8');

    // 4️⃣ Header di 4 byte con lunghezza del payload
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32LE(jsonBuffer.length, 0);

    // 5️⃣ Scrive header + payload in modo sicuro
    await writeSafe(lenBuf);
    await writeSafe(jsonBuffer);
  }
}

export function clearDB(listener: Listener){
  const payload = { command: 'clear' };
  const jsonString = JSON.stringify(payload);
  const jsonBuffer = Buffer.from(jsonString, 'utf-8');

  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(jsonBuffer.length, 0);
  listener.proc.stdin.write(lenBuf);
  listener.proc.stdin.write(jsonBuffer);
}

// --- Query segment ---
export async function querySegment(
  listener: Listener,
  segment: string[],
  session: InferenceSession,
): Promise<string | null> {
  const { text, embedding } = await embeddingFullSegment(segment, session);
  const payload = {
    command: 'query',
    text,
    embedding: Array.from(embedding),
  };
  const jsonString = JSON.stringify(payload);
  const jsonBuffer = Buffer.from(jsonString, 'utf-8');

  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(jsonBuffer.length, 0);
  listener.proc.stdin.write(lenBuf);
  listener.proc.stdin.write(jsonBuffer);

  console.log('Query inviata in JSON:', text);

  return new Promise<string | null>((resolve) => {
    const onData = (data: Buffer) => {
      const str = data.toString();
      const lines = str.split(/\r?\n/);
      for (const line of lines) {
        if (line.startsWith('[MATCH] ')) {
          const match = line.replace('[MATCH] ', '').trim();
          listener.proc.stdout.off('data', onData);
          resolve(match);
          return;
        }
        if (line.startsWith('[MATCH_NOT_FOUND]')) {
          listener.proc.stdout.off('data', onData);
          resolve(null);
          return;
        }
      }
    };
    listener.proc.stdout.on('data', onData);
  });
}

// --- Stop listener ---
export function stopListener(listener: Listener) {
  const payload = { command: 'stop' };
  const jsonString = JSON.stringify(payload);
  const jsonBuffer = Buffer.from(jsonString, 'utf-8');

  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(jsonBuffer.length, 0);
  listener.proc.stdin.write(lenBuf);
  listener.proc.stdin.write(jsonBuffer);
  listener.proc.stdin.end();

  console.log('Comando di stop inviato, in attesa che il processo termini...');

  // Timeout di sicurezza: se dopo 3 secondi non si chiude, kill forzato
  const timeout = setTimeout(() => {
    if (!listener.proc.killed) {
      console.warn('Listener non risponde, kill forzato.');
      listener.proc.kill('SIGKILL');
    }
  }, 3000);

  listener.proc.on('exit', (code) => {
    clearTimeout(timeout);
    console.log('Listener terminato con codice:', code);
  });
}
