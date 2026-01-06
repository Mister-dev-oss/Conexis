import { WindowManager } from '../windowmanager';
import { registerHomebarEvents } from './homebarEvents';
import { registerChatbarEvents } from './chatbarEvents';
import { registerSettingbarEvents } from './settingbarEvents';
import { registerRealTimeAssistantBarEvents } from './realtimeassistantbarEvents';
import { registerRealTimeAnswerBarEvents } from './realtimeanswerbarEvents';
import { registerCommonEvents } from './commonEvents';

export function registerWindowHandlers(wm: WindowManager) {
  registerHomebarEvents(wm);
  registerChatbarEvents(wm);
  registerSettingbarEvents(wm);
  registerRealTimeAssistantBarEvents(wm);
  registerRealTimeAnswerBarEvents(wm)
  registerCommonEvents(wm)
}