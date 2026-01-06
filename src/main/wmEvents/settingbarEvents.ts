import { ipcMain } from 'electron';
import { WindowManager } from '../windowmanager';
import SettingBarWindow from '../settingbar/settingbar';
import { LanguageSetting, Shortcut, loadLanguages, loadShortcuts} from '../settings';

export function registerSettingbarEvents(wm: WindowManager) {
  ipcMain.on('close-settingbar', async () => {
    wm.closeWindow(SettingBarWindow);
  });

  ipcMain.on('minimize-settingbar', async () => {
    wm.minimizeWindow(SettingBarWindow);
  });

  ipcMain.on('settings-needsupdate', (event, ...args) => {
    const theme = args[0];
    const newSettings = { theme };
    wm.updateSettings(newSettings);
  });

  ipcMain.on('new-shortcut', (event, ...args) => {
    const newShortcut = args[0] as Shortcut;
    wm.updateShortcuts(newShortcut);
  });

  ipcMain.handle('get-initial-shortcuts', () => {
    return {
      shortcuts: loadShortcuts(),
    };
  });

  ipcMain.handle('get-initial-languages', () => {
    return {
      languages: loadLanguages(),
    };
  });

  ipcMain.on('language-update', async (event, language : LanguageSetting) => {
    wm.updateLanguage(language);
  });
}
