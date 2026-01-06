import { ipcMain } from 'electron';
import { WindowManager } from '../windowmanager';
import RealTimeAssistantBarWindow from '../realtimeassistantbar/realtimeassistantbar';
import RealTimeAnswerBarWindow from '../realtimeanswerbar/realtimeanswerbar';

export function registerRealTimeAssistantBarEvents(wm: WindowManager) {
  ipcMain.on('close-realtimeassistantbar', async () => {
    wm.closeWindow(RealTimeAssistantBarWindow);
  });

  ipcMain.on('minimize-realtimeassistantbar', async () => {
    wm.minimizeWindow(RealTimeAssistantBarWindow);
  });

  ipcMain.on('open-answerbar', async () => {
    const win = wm.getWindow('realtimeanswerbar');
    if (!win) {
      wm.WindowOpenClose(RealTimeAnswerBarWindow);
    } else {
      win.show();
    }
  });

  ipcMain.on('transfer-prompt-answerbar', (event, request) => {
    let win = wm.getWindow('realtimeanswerbar');
    if (!win) {
      wm.WindowOpenClose(RealTimeAnswerBarWindow);
      win = wm.getWindow('realtimeanswerbar');
      win?.once('ready-to-show', () => {
        win!.webContents.send('answerBarRequest', request);
      });
    }
    win?.webContents.send('answerBarRequest', request);
  });

  ipcMain.handle('RagQuery', async (event, request) => {
    if (wm.RecorderOpt.type === 'Rag') {
      const response = await wm.RagDbQuery(request)
      return response
    }
    return ''
  })
}
