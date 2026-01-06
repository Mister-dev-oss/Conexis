import { ipcMain } from "electron";
import { WindowManager } from "../windowmanager";


export function registerCommonEvents(wm: WindowManager){
ipcMain.on(
  "update-window-dims",
  (event, { windowType, height, width
  }: { windowType: string, height: number, width: number }) => {
    console.log('dimensioni ricevute', windowType, height, width)
    
    const win = wm.getTypeByName(windowType)
    if (win) {
      wm.updateDimensions(win, height, width)
    } else {
        console.log('errore con dimensioni')
        return} 
  }
);
}