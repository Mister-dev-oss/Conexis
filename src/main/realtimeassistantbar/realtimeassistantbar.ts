import { BrowserWindow } from 'electron';
import path from 'path';
import { resolveHtmlPath } from '../util';
import { WindowManager } from '../windowmanager';
import { Settings } from '../settings';

export default class RealTimeAssistantBarWindow extends BrowserWindow {
  constructor(app: Electron.App, wm: WindowManager, settings: Settings) {
    const offset = 1;
    const width = 510;
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
          ? path.join(__dirname, 'realtimeassistantbarPreload.js')
          : path.join(
              __dirname,
              '../../.erb/dll/realtimeassistantbarPreload.js',
            ),
        additionalArguments: [JSON.stringify(settings)],
        partition: 'persist:main',
      },
    });

    this.loadURL(resolveHtmlPath('raindex.html'));

    this.on('ready-to-show', async () => {
      let errCode = 0;
      if (wm.RecorderOpt.type === 'Rag') {
        await wm.StartRag();
        await wm.StartRecorder();
      } else if (wm.RecorderOpt.type === 'Standard') {
        errCode = await wm.StartRecorder();
      }
      this.webContents.send('RecorderOpt', wm.RecorderOpt.type)
      if (errCode !== 0) {
        this.close();
        return;
      }

      if (process.env.START_MINIMIZED) {
        this.minimize();
      } else {
        this.show();
      }
    });

    this.on('close', async () => {
      const homebar = wm.getHomeBar();
      if (wm.RecorderOpt.type === 'Rag') {
        wm.StopRag();
        if (wm.RecorderOpt.saving === true) {
          await wm.SaveAndStopRecorder();
        } else if (wm.RecorderOpt.saving === false) {
          wm.DiscardAndStopRecorder();
        }
      } else if (wm.RecorderOpt.type === 'Standard') {
        if (wm.RecorderOpt.saving === true) {
          await wm.SaveAndStopRecorder();
        } else if (wm.RecorderOpt.saving === false) {
          await wm.DiscardAndStopRecorder();
        }
      }
      wm.RecorderOpt = {type: "", saving: false}

      if (homebar && !homebar.isDestroyed()) {
        if (homebar.webContents.isLoading()) {
          homebar.webContents.once('did-finish-load', () => {
            homebar.webContents.send('window-closed', 'realtimeassistantbar');
          });
        } else {
          homebar.webContents.send('window-closed', 'realtimeassistantbar');
        }
      }
    });
  }
}
