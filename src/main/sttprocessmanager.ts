import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { WindowManager } from './windowmanager';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

class RecorderManager {
  process: ChildProcessWithoutNullStreams | null = null;
  private transcriptBuffer: string[] = [];
  private bufferThreshold = 25;
  private filePath: string | null = null;

  async start(windowManager: WindowManager, language: string): Promise<number> {
    if (this.process) return 0;
    // crea cartella per transcript
    const dir = path.join(app.getPath('userData'), 'transcripts');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    // genera nome file unico
    const fileName = `transcript_${Date.now()}.jsonl`;
    this.filePath = path.join(dir, fileName);
    this.transcriptBuffer = [];

    let exeDir: string
    let exePath: string

    if (app.isPackaged) {
      exeDir = path.dirname(app.getPath('exe'));
      exePath = path.join(exeDir, 'ConexisAudioRecorder.exe');
    } else {
      // In sviluppo: usa la root del progetto o altra cartella
      exeDir = 'C:\\Users\\Alessandro\\Desktop\\ConexisAudioTranscriberWIN\\ConexisAudioRecorder.exe';
      exePath = 'C:\\Users\\Alessandro\\Desktop\\ConexisAudioTranscriberWIN'
    
    }

    try {
      this.process = spawn(
        exeDir,
        [language],
        {
          stdio: ['pipe', 'pipe', 'pipe'],
          cwd: exePath,
          windowsHide: false,
        },
      );
    } catch (err) {
      console.error('[RECORDER] Fallito avvio:', err);
      return 1;
    }

    let errorOccurred = false;

    this.process.stdout.on('data', (data) => {
      const text = data.toString('utf8');
      const lines = text.split(/\r?\n/);
      lines.forEach((line: any) => {
        if (line.startsWith('[TRANSCRIPTION]')) {
          const clean = line.replace('[TRANSCRIPTION]', '').trim();
          this.SendTranscription(clean, windowManager);
          console.log('[TRANSCRIPTION]', clean);
        }
      });
    });

    this.process.stderr.on('data', (data) => {
      const text = data.toString('utf8');
      if (/error/i.test(text)) {
        if (!errorOccurred) {
          errorOccurred = true;
          console.error('[RECORDER ERR]', text);
          this.stop();
        }
      } else {
        console.log('[RECORDER LOG]', text);
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 200));
    return errorOccurred ? 1 : 0;
  }

  private SendTranscription(chunk: string, windowManager: WindowManager) {
    this.transcriptBuffer.push(chunk);
    windowManager.SendTranscription(chunk);

    // flush buffer su file se soglia raggiunta
    if (this.transcriptBuffer.length >= this.bufferThreshold) {
      this.flushBufferToFile();
    }
  }

  private flushBufferToFile() {
    if (!this.filePath || this.transcriptBuffer.length === 0) return;

    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, '');
    }

    const data =
      this.transcriptBuffer
        .map((c) => JSON.stringify({ chunk: c, timestamp: Date.now() }))
        .join('\n') + '\n';
    fs.appendFileSync(this.filePath, data);
    this.transcriptBuffer = [];
  }

  stopAndSave(): Promise<void> {
    // flush finale su file
    this.flushBufferToFile();
    console.log(this.filePath);
    return this.stop();
  }

  stopAndDiscard(): Promise<void> {
    return new Promise(async (resolve) => {
      await this.stop();
      if (this.filePath && fs.existsSync(this.filePath)) {
        fs.unlinkSync(this.filePath);
      }
      this.transcriptBuffer = [];
      this.filePath = null;
      resolve();
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.process) return resolve();

      let exited = false;
      const onExit = () => {
        exited = true;
        this.process = null;
        resolve();
      };
      this.process.once('exit', onExit);

      this.process.stdin.write('STOP\n');

      setTimeout(() => {
        if (!exited && this.process) {
          this.process.kill();
          this.process = null;
          resolve();
        }
      }, 1000);
    });
  }
}

export default RecorderManager;
