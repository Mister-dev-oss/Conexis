import { ElectronHandler as HomebarHandler } from '../main/homebar/homebarPreload';
import { ElectronHandler as SettingbarHandler } from '../main/settingbar/settingbarPreload';
import { ElectronHandler as ChatbarHandler } from '../main/chatbar/chatbarPreload';
import { ElectronHandler as RealTimeAssistantBarWindowHandler } from '../main/realtimeassistantbar/realtimeassistantbarPreload';
import { ElectronHandler as RealTimeAnswerBarWindowHandler} from '../main/realtimeanswerbar/realtimeanswerbarPreload'
import type { Settings } from '../main/settings'; 

declare global {
  interface Window {
    hbelectron: HomebarHandler;
    sbelectron: SettingbarHandler;
    cbelectron: ChatbarHandler;
    raelectron: RealTimeAssistantBarWindowHandler
    rnelectron: RealTimeAnswerBarWindowHandler
    settings: Settings;
  }
}

export {};
