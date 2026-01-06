// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Settings } from '../settings';

export type Channels =
  | 'close-realtimeanswerbar'
  | 'minimize-realtimeanswerbar'
  | 'answerBarRequest'
  | 'settings-updated'
  | 'update-window-dims'
  

const electronHandler = {
  ipcRenderer: {
    send(channel: Channels, ...args: unknown[]) {
      ipcRenderer.send(channel, ...args); 
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
    invoke: <T>(channel: string, ...args: unknown[]): Promise<T> =>
      ipcRenderer.invoke(channel, ...args),
  },
};


const settingsArg = process.argv.find((arg) => arg.startsWith('{'));
let initialSettings: Settings | null = null;
if (settingsArg) {
  try {
    initialSettings = JSON.parse(settingsArg) as Settings;
  } catch (e) {
    console.error('Failed to parse settings from args', e);
  }
}

contextBridge.exposeInMainWorld('rnelectron', electronHandler);
contextBridge.exposeInMainWorld('settings', initialSettings);

export type ElectronHandler = typeof electronHandler;
export type InitialSettings = typeof initialSettings;

