import { BrowserWindow } from 'electron';
import path from 'path';
import { resolveHtmlPath } from '../util';
import { Settings } from '../settings';
import { WindowManager } from '../windowmanager';

export default class HomeBarWindow extends BrowserWindow {
  constructor(app: Electron.App, wm: WindowManager, settings: Settings) {
    const width = 340;
    const height = 38;
    const { width: screenWidth } = wm.primaryScreen.workArea;
    const x = Math.floor((screenWidth - width) / 2);
    const y = 10;

    super({
      width: width,
      height: height,
      x: x,
      y: y,
      transparent: true,
      frame: false,
      resizable: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: app.isPackaged
          ? path.join(__dirname, 'homebarPreload.js')
          : path.join(__dirname, '../../.erb/dll/homebarPreload.js'),
        additionalArguments: [JSON.stringify(settings)],
        partition: 'persist:main',
      },
    });

    this.loadURL(resolveHtmlPath('hbindex.html'));

    this.on('ready-to-show', async () => {
      if (!this) {
        throw new Error('"HomebarWindow" is not defined');
      }
      if (process.env.START_MINIMIZED) {
        this.minimize();
      } else {
        this.show();
      }
    });

    this.on('close', () => {
      app.quit();
    });
  }
}
