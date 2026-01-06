import {
  pushSegmenttoDB,
  startListener,
  Listener,
  stopListener,
  querySegment,
  pushDocumentToDB,
  clearDB,
} from './ragDB';
import { InferenceSession } from 'onnxruntime-node';
import { loadModel } from './ragprocessutils';
import { app } from 'electron';
import path from 'path';

export class RagManager {
  listener: Listener | null = null;
  session: InferenceSession | null = null;
  segmentBuffer: string[] = [];
  private exePath = 'C:\\Users\\Alessandro\\Desktop\\Vector_db.exe';

  constructor() {
    if (app.isPackaged) {
      const exeDir = path.dirname(app.getPath('exe'));
      this.exePath = path.join(exeDir, 'Vector_db.exe');
    } else {
      this.exePath = 'C:\\Users\\Alessandro\\Desktop\\Vector_db.exe';
    }
  }

  async startRagListenerWithSession() {
    try {
      this.listener = startListener(this.exePath);
      this.session = await loadModel();
    } catch (err) {
      console.log('Errore nell’avvio del listener o caricamento modello:', err);
      this.listener = null;
      this.session = null;
    }
  }

  async pushSegment(segment: string) {
    if (!this.listener || !this.session) return;

    this.segmentBuffer.push(segment);

    if (this.segmentBuffer.length >= 25) {
      await pushSegmenttoDB(this.listener, this.segmentBuffer, this.session);
      this.segmentBuffer = [];
      console.log('pushato segmento al vector db');
    }
  }

  clearVectorDB() {
    if (!this.listener) return;
    clearDB(this.listener);
  }

  async pushDocument(document: string) {
    if (!this.listener || !this.session) return;
    await pushDocumentToDB(this.listener, document, this.session);
    console.log('pushato documento al vector db');
  }

  async pushQuery(query: string[]) {
    if (!this.listener || !this.session) return;
    const match = await querySegment(this.listener, query, this.session);
    return match ?? null;
  }

  closeRagListnerWithSession() {
    if (!this.listener) return;
    stopListener(this.listener);
    this.listener = null;
    this.session = null;
  }
}
