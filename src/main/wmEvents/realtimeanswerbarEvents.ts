import { ipcMain } from 'electron';
import { WindowManager } from '../windowmanager';
import RealTimeAnswerBarWindow from '../realtimeanswerbar/realtimeanswerbar';

export function registerRealTimeAnswerBarEvents(wm: WindowManager) {
  ipcMain.on('close-realtimeanswerbar', async () => {
    wm.closeWindow(RealTimeAnswerBarWindow);
  });

  ipcMain.on('minimize-realtimeanswerbar', async () => {
    wm.minimizeWindow(RealTimeAnswerBarWindow);
  });
}
