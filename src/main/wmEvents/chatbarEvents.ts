import { ipcMain } from 'electron';
import { WindowManager } from '../windowmanager';
import ChatBarWindow from '../chatbar/chatbar';
import { FileInfo, processFile } from '../parser/validator';

export function registerChatbarEvents(wm: WindowManager) {
  ipcMain.on('close-chatbar', async () => {
    wm.closeWindow(ChatBarWindow);
  });

  ipcMain.on('minimize-chatbar', async () => {
    wm.minimizeWindow(ChatBarWindow);
  });

  ipcMain.on('expand-chatbar', async () => {
    wm.updateDimensions(ChatBarWindow, 455, 405);
  });

  ipcMain.on('save-chat', async (event, messages) => {
    wm.OpenChatSaverDialog(messages);
  });

  ipcMain.on('clear-vDB', async () => {
    wm.ClearChatDB();
  });

  ipcMain.handle('validate-dropped-file', async (event, file : FileInfo) => {
    try {
      const fileTxt = await processFile(file)
      console.log('giusto', file)
      wm.PushDocument(fileTxt)
      return true
    } catch (err: any) {
      console.log(err)
      return false
    }
    
  });

  ipcMain.handle('DBQuery', async (event, request) => {
      const response = await wm.ChatRagDbQuery(request)
      return response
  })
}
