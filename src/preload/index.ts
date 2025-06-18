import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// 为渲染进程定义自定义 API
const api = {}


// 如果启用了上下文隔离（context isolation），就使用 `contextBridge` API 将 Electron 的功能暴露给渲染进程；
// 否则，直接添加到全局 DOM 对象中。
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
