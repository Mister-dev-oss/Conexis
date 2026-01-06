import { ipcMain } from 'electron';
import { WindowManager } from '../windowmanager';
import ChatBarWindow from '../chatbar/chatbar';
import SettingBarWindow from '../settingbar/settingbar';
import RealTimeAssistantBarWindow from '../realtimeassistantbar/realtimeassistantbar';

export type RecorderOptions = {
  type : 'Rag' | 'Standard' | '' 
  saving : boolean
}


export function registerHomebarEvents(wm: WindowManager) {
  ipcMain.on('openclose-chatbar', async () => {
    wm.WindowOpenClose(ChatBarWindow);
  });

  ipcMain.on('openclose-settingbar', async () => {
    wm.WindowOpenClose(SettingBarWindow);
  });

  ipcMain.on('openclose-realtimeassistantbar', async (event, option : RecorderOptions) => {
  wm.RecorderOpt.saving = option.saving
  wm.RecorderOpt.type = option.type
  wm.WindowOpenClose(RealTimeAssistantBarWindow);
  
});
}
