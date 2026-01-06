// Disable no-unused-vars, broken for spread args
/* eslint no-unused-vars: off */
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import { Settings, Shortcut} from '../settings';

export type Channels =
  | 'close-settingbar'
  | 'minimize-settingbar'
  | 'settings-updated'
  | 'settings-needsupdate'
  | 'new-shortcut'
  | 'update-window-dims'
  | 'language-update';

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

const jsonArgs = process.argv.filter(arg => arg.startsWith("{") && arg.endsWith("}"));

let initialSettings: Settings | null = null;


if (jsonArgs[0]) {
  try {
    initialSettings = JSON.parse(jsonArgs[0]);
  } catch (e) {
    console.error("Failed to parse settings", e);
  }
}

contextBridge.exposeInMainWorld("sbelectron", electronHandler);
contextBridge.exposeInMainWorld("settings", initialSettings);

export type ElectronHandler = typeof electronHandler;
export type InitialSettings = typeof initialSettings;
