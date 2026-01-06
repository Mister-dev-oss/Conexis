import { BrowserWindow } from 'electron';
import path from 'path';
import { resolveHtmlPath } from '../util';
import { WindowManager } from '../windowmanager';
import { Settings } from '../settings';

export default class SettingBarWindow extends BrowserWindow {
  constructor(app: Electron.App, wm: WindowManager, settings: Settings) {

    const offset = 1
    const width = 300
    const height = 400
    const homebarCoordsData = wm.getHomeBarCoords()
    if (!homebarCoordsData) return;

    const {x, y, width: homebarwidth} = homebarCoordsData
    const newX = x + homebarwidth + offset;
    const newY = y 
    

    super({
      width: width,
      height: height,
      x: newX,
      y: newY,
      transparent: true,
      frame: false,
      alwaysOnTop: false,
      resizable: true,
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'settingbarPreload.js')
          : path.join(__dirname, '../../.erb/dll/settingbarPreload.js'),
        additionalArguments: [JSON.stringify(settings)],
        partition: 'persist:main'
      },
    });

    this.loadURL(resolveHtmlPath('sbindex.html'));

    this.on('ready-to-show', () => {
      if (!this) {
        throw new Error('"SettingBarWindow" is not defined');
      }
      if (process.env.START_MINIMIZED) {
        this.minimize();
      } else {
        this.show();
      }
    });

    this.on('close', () => {
      const homebar = wm.getHomeBar();
      if (homebar && !homebar.isDestroyed()) {
        if (homebar.webContents.isLoading()) {
          homebar.webContents.once('did-finish-load', () => {
            homebar.webContents.send('window-closed', 'settingbar');
          });
        } else {
          homebar.webContents.send('window-closed', 'settingbar');
        }
      }
    });


  }
}
