import { BrowserWindow } from 'electron';
import path from 'path';
import { resolveHtmlPath } from '../util';
import { WindowManager } from '../windowmanager';
import { Settings } from '../settings';

export default class RealTimeAnswerBarWindow extends BrowserWindow {
  constructor(app: Electron.App, wm: WindowManager, settings: Settings) {
    const offset = 1;
    const width = 700;
    const height = 400;
    const homebarCoordsData = wm.getHomeBarCoords();
    if (!homebarCoordsData) return;

    const { x, y, width: homebarwidth } = homebarCoordsData;
    const newX = x + homebarwidth + offset;
    const newY = y;

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
          ? path.join(__dirname, 'realtimeanswerbarPreload.js')
          : path.join(
              __dirname,
              '../../.erb/dll/realtimeanswerbarPreload.js',
            ),
        additionalArguments: [JSON.stringify(settings)],
        partition: 'persist:main',
      },
    });

    this.loadURL(resolveHtmlPath('rnindex.html'));

    this.on('ready-to-show', async () => {
      if (process.env.START_MINIMIZED) {
        this.minimize();
      } else {
        this.show();
      }
    });

    this.on('close', async () => {
      const homebar = wm.getHomeBar();

      if (homebar && !homebar.isDestroyed()) {
        if (homebar.webContents.isLoading()) {
          homebar.webContents.once('did-finish-load', () => {
            homebar.webContents.send('window-closed', 'realtimeanswerbar');
          });
        } else {
          homebar.webContents.send('window-closed', 'realtimeanswerbar');
        }
      }
    });
  }
}
