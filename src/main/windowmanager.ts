// windowManager.ts
import {
  app,
  BrowserWindow,
  screen,
  Display,
  globalShortcut,
  dialog,
} from 'electron';
import fs from 'fs';
import {
  loadShortcuts,
  Shortcut,
  saveSettings,
  Settings,
  updateShortcut,
  loadLanguages,
  LanguageSetting,
  updateLanguage,
} from './settings';
import ChatBarWindow from './chatbar/chatbar';
import HomeBarWindow from './homebar/homebar';
import SettingBarWindow from './settingbar/settingbar';
import { loadSettings } from './settings';
import { ChatMessage } from '../renderer/api/chatResponse';
import RealTimeAssistantBarWindow from './realtimeassistantbar/realtimeassistantbar';
import RecorderManager from './sttprocessmanager';
import RealTimeAnswerBarWindow from './realtimeanswerbar/realtimeanswerbar';
import { RagManager } from './rag/ragprocessmanager';
import { RecorderOptions } from './wmEvents/homebarEvents';

export class WindowManager {
  private windows: Map<string, BrowserWindow> = new Map();

  private typeToName = new Map([
    [ChatBarWindow, 'chatbarWin'],
    [HomeBarWindow, 'homebarWin'],
    [SettingBarWindow, 'settingbarWin'],
    [RealTimeAssistantBarWindow, 'realtimeassistantbar'],
    [RealTimeAnswerBarWindow, 'realtimeanswerbar'],
  ]);

  public primaryScreen: Display;
  public RecorderOpt: RecorderOptions = { type: '', saving: false };
  private settings = loadSettings();
  private languages = loadLanguages()
  private shortcuts = loadShortcuts();
  private state: 'showing' | 'hided';
  private dialogOpen = false;
  private sttManager: RecorderManager = new RecorderManager();
  private ragManager: RagManager = new RagManager();
  private chatragManager: RagManager = new RagManager();

  constructor(initialState: 'showing' | 'hided' = 'showing') {
    this.state = initialState;

    this.primaryScreen = screen.getPrimaryDisplay();
    this.registerShortcuts(this.shortcuts);
  }

  private registerShortcuts(shortcuts: Shortcut[]) {
    globalShortcut.unregisterAll();

    shortcuts.forEach((shortcut) => {
      const accelerator = shortcut.keys.join('+');
      if (shortcut.name === 'Open Chat') {
        globalShortcut.register(accelerator, () => {
          const homebar = this.getHomeBar();
          if (homebar && !this.windows.has('chatbarWin')) {
            homebar.webContents.send('window-opened', 'chatbar');
          }

          this.WindowOpenClose(ChatBarWindow);
        });
      } else if (shortcut.name === 'Hide/Show') {
        globalShortcut.register(accelerator, () => {
          this.HideShowWindows();
        });
      }
    });
  }

  updateShortcuts(newShortcut: Shortcut) {
    globalShortcut.unregisterAll();

    updateShortcut(newShortcut.name, newShortcut.keys);
    const newShortcuts = loadShortcuts();
    this.shortcuts = newShortcuts;

    newShortcuts.forEach((shortcut) => {
      if (shortcut.name === 'Open Chat') {
        const accelerator = shortcut.keys.join('+');
        globalShortcut.register(accelerator, () => {
          this.WindowOpenClose(ChatBarWindow);
          const homebar = this.getHomeBar();
          if (!homebar) return;
          homebar.webContents.send('window-opened', 'chatbar');
        });
      } else if (shortcut.name === 'Hide/Show') {
        const accelerator = shortcut.keys.join('+');
        globalShortcut.register(accelerator, () => {
          this.HideShowWindows();
        });
      }
    });
  }

  public updateSettings(newSettings: Settings) {
    Object.assign(this.settings, newSettings);
    saveSettings(newSettings);

    this.windows.forEach((win, name) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings-updated', this.settings);
      }
    });
  }

  public updateLanguage(newLanguages: LanguageSetting) {
    Object.assign(this.languages, newLanguages);
    updateLanguage(newLanguages.language, newLanguages.audioContextLanguage);

    /*this.windows.forEach((win, name) => {
      if (win && !win.isDestroyed()) {
        win.webContents.send('settings-updated', this.settings);
      }
    });*/
  }


  public updateDimensions(
    type:
      | typeof ChatBarWindow
      | typeof HomeBarWindow
      | typeof SettingBarWindow
      | typeof RealTimeAssistantBarWindow
      | typeof RealTimeAnswerBarWindow,
    height?: number,
    width?: number,
  ) {
    const name = this.typeToName.get(type);
    if (!name) return;

    const win = this.getWindow(name);
    if (!win) return;

    const bounds = win.getBounds();

    win.setBounds({
      x: bounds.x,
      y: bounds.y,
      width: width ?? bounds.width,
      height: height ?? bounds.height,
    });
  }

  HideShowWindows() {
    if (this.state === 'showing') {
      this.windows.forEach((win, _) => {
        win.hide();
        this.state = 'hided';
      });
    } else {
      this.windows.forEach((win, _) => {
        win.show();
        this.state = 'showing';
      });
    }
  }

  getHomeBarCoords(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    const homebar = this.getHomeBar();

    if (!homebar || homebar.isDestroyed()) return null;

    const bounds = homebar.getBounds();
    return {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
    };
  }

  WindowOpenClose(
    type:
      | typeof ChatBarWindow
      | typeof HomeBarWindow
      | typeof SettingBarWindow
      | typeof RealTimeAssistantBarWindow
      | typeof RealTimeAnswerBarWindow,
  ) {
    const name = this.typeToName.get(type);
    if (!name) throw new Error('Tipo di finestra non valido');

    const existing = this.windows.get(name);
    if (existing && !existing.isDestroyed()) {
      existing.close();
      this.windows.delete(name);
      return;
    }

    const win = new type(app, this, this.settings);
    this.windows.set(name, win);

    win.on('closed', () => {
      this.windows.delete(name);
    });

    return win;
  }

  getWindow(name: string): BrowserWindow | undefined {
    return this.windows.get(name);
  }

  getHomeBar(): BrowserWindow | undefined {
    return this.windows.get('homebarWin');
  }

  getTypeByName(name: string): any | undefined {
    for (const [key, value] of this.typeToName.entries()) {
      if (value === name) return key;
    }
    return undefined;
  }

  minimizeWindow(
    type:
      | typeof ChatBarWindow
      | typeof HomeBarWindow
      | typeof SettingBarWindow
      | typeof RealTimeAssistantBarWindow
      | typeof RealTimeAnswerBarWindow,
  ) {
    const name = this.typeToName.get(type);
    if (!name) throw new Error('Tipo di finestra non valido');

    const win = this.windows.get(name);
    if (!win || win.isDestroyed()) return;

    if (process.platform === 'win32') {
      const steps = 10; // meno step = più rapido
      const intervalTime = 12; // ~120ms totali
      let currentStep = 0;

      const fade = setInterval(() => {
        currentStep++;

        // Ease-out quadratic (curva non lineare)
        const t = currentStep / steps;
        const opacity = 1 - Math.pow(t, 2);

        win.setOpacity(opacity);

        if (currentStep >= steps) {
          clearInterval(fade);
          win.minimize();
          win.setOpacity(1); // reset per il restore
        }
      }, intervalTime);
    } else {
      win.minimize();
    }
  }

  closeWindow(
    type:
      | typeof ChatBarWindow
      | typeof HomeBarWindow
      | typeof SettingBarWindow
      | typeof RealTimeAssistantBarWindow
      | typeof RealTimeAnswerBarWindow,
  ) {
    const name = this.typeToName.get(type);
    if (!name) throw new Error('Tipo di finestra non valido');

    const win = this.windows.get(name);
    if (win && !win.isDestroyed()) {
      win.close();
      this.windows.delete(name);
    }
  }

  // CHATBAR SECTION //
  async OpenChatSaverDialog(messages: ChatMessage[]) {
    if (this.dialogOpen) return;
    this.dialogOpen = true;

    try {
      const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Salva chat',
        defaultPath: 'ConexisAI-chat.txt',
        filters: [{ name: 'Text File', extensions: ['txt'] }],
      });

      if (!canceled && filePath) {
        const content = messages.map((m) => `${m.from}: ${m.text}`).join('\n');
        fs.writeFileSync(filePath, content, 'utf-8');
      }
    } finally {
      this.dialogOpen = false;
    }
  }

  // Real Time Assistant Section //

  SendTranscription(data: string) {
    const window = this.getWindow('realtimeassistantbar');
    if (!window) return;
    window.webContents.send('transcript', data);

    if (this.RecorderOpt.type === 'Rag') {
      this.PushSegment(data);
      console.log('push segment a buffer vectordb');
    }
  }

  // NO RAG //
  async StartRecorder() {
    const errCode = await this.sttManager.start(this, this.languages.audioContextLanguage);
    if (errCode !== 0) {
      return 1;
    } else {
      return 0;
    }
  }

  async SaveAndStopRecorder() {
    await this.sttManager.stopAndSave();
  }

  async DiscardAndStopRecorder() {
    await this.sttManager.stopAndDiscard();
  }

  // RAG //
  async StartRag() {
    await this.ragManager.startRagListenerWithSession();
  }

  async RagDbQuery(query: string) {
    const formattedQuery = [query];
    const response = await this.ragManager.pushQuery(formattedQuery);
    if (!response) {
      return '';
    }
    return response;
  }

  async PushSegment(segment: string) {
    await this.ragManager.pushSegment(segment);
  }

  StopRag() {
    this.ragManager.closeRagListnerWithSession();
  }

  // CHATBAR RAG //
  async StartChatbarRag() {
    await this.chatragManager.startRagListenerWithSession();
  }

  async ChatRagDbQuery(query: string) {
    const formattedQuery = [query];
    const response = await this.chatragManager.pushQuery(formattedQuery);
    if (!response) {
      return '';
    }
    return response;
  }

  async PushDocument(document: string) {
    await this.chatragManager.pushDocument(document);
  }

  ClearChatDB(){
    this.chatragManager.clearVectorDB()
  }

  ChatStopRag() {
    this.chatragManager.closeRagListnerWithSession();
  }
  
}
