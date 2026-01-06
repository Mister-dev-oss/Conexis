import { BrowserWindow } from 'electron';
import { Settings } from '../settings';
import path from 'path';
import { resolveHtmlPath } from '../util';
import { WindowManager } from '../windowmanager';

export default class ChatBarWindow extends BrowserWindow {
  constructor(app: Electron.App, wm: WindowManager, settings: Settings) {

    const offset = 4
    const width = 405
    const height = 85
    const homebarCoordsData = wm.getHomeBarCoords()
    if (!homebarCoordsData) return;

    const {x, y} = homebarCoordsData
    const newX = x - width - offset;
    const newY = y 

    super({
      width: width,
      height: height,
      x: newX,
      y: newY,
      transparent: true,
      frame: false,
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'chatbarPreload.js')
          : path.join(__dirname, '../../.erb/dll/chatbarPreload.js'),
        additionalArguments: [JSON.stringify(settings)],
        partition: 'persist:main'
      },
    });

    this.loadURL(resolveHtmlPath('cbindex.html'));

    this.on('ready-to-show', async() => {
      if (!this) {
        throw new Error('"ChatBarWindow" is not defined');
      }
      if (process.env.START_MINIMIZED) {
        this.minimize();
      } else {
        this.show();
      }
      wm.StartChatbarRag()
    });

    this.on('close', () => {
      const homebar = wm.getHomeBar();
      wm.ChatStopRag()
      if (homebar && !homebar.isDestroyed()) {
        if (homebar.webContents.isLoading()) {
          homebar.webContents.once('did-finish-load', () => {
            homebar.webContents.send('window-closed', 'chatbar');
          });
        } else {
          homebar.webContents.send('window-closed', 'chatbar');
        }
      }
    });
  }
}
