import { ElectronAPI } from '@electron-toolkit/preload'

declare global {

  declare namespace Live2DCubismCore {
    type Moc = any;
    type Model = any;
    type csmLogFunction = any;
    type csmParameterType = any;
  }

  declare var Live2DCubismCore: any

  interface Window {
    electron: ElectronAPI
    api: unknown
    Live2DCubismCore: any
  }
}
