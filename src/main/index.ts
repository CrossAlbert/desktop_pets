import { app, BrowserWindow, globalShortcut, ipcMain } from 'electron'
import { join, normalize } from 'path'
import fs from 'fs'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import type { } from '@shared/types'
import createManageWindow from './createManageWindow'
import createPetWindow from './createPetWindow'
import getPreviewList from './getPreviewList'


// 缓存窗口尺寸 用以解决右键移动窗口导致的窗口变大
const windowSizeMap: Map<number, { w: number, h: number }> = new Map();


// 创建一个用于存放桌宠文件的目录
const petsFileDir = join(app.getPath('appData'), 'petsFile');


// 检测路径是否存在
if (!fs.existsSync(petsFileDir)) {
  // 路径不存在，新建路径
  fs.mkdirSync(petsFileDir, { recursive: true });
}


// 当 Electron 完成初始化并准备好创建浏览器窗口时
// 这个方法将会被调用
// 有些 API 只有在该事件发生后才能使用
app.whenReady().then(() => {
  // 为windows设置应用程序用户模型id
  electronApp.setAppUserModelId('com.electron')

  // 在开发环境下，默认使用 F12 打开或关闭开发者工具（DevTools）
  // 在生产环境下则忽略 CommandOrControl + R（刷新快捷键）
  // 详见：https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })


  // 禁用刷新快捷键
  globalShortcut.register('CommandOrControl+R', () => { });
  globalShortcut.register('F5', () => { });



  // 获取预览列表
  ipcMain.handle('get-preview-list', async (_event) => {
    return getPreviewList(petsFileDir);
  });



  // 获取读取json
  ipcMain.handle('get-json', (_event, path: string) => {
    try {
      const data = fs.readFileSync(normalize(path), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.log(error);
      return null;
    }
  });



  // 获取文件字节流
  ipcMain.handle('get-buffer', (_event, path: string) => {
    try {
      const buf = fs.readFileSync(normalize(path));
      const buffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return buffer;
    } catch (error) {
      console.log(error);
      return '';
    }
  })



  // 开启桌宠窗口
  ipcMain.handle('start-pet', (_event, infor: PreviewInforIpc) => {
    try {
      // 创建桌宠视口，并返回窗口id
      const windowInfor = createPetWindow(infor);
      windowSizeMap.set(
        windowInfor.windowId,
        {
          w: windowInfor.windowWidth,
          h: windowInfor.windowHeight
        }
      )
      return windowInfor.windowId;
    } catch (error) {
      console.log(error);
      return null;
    }
  });


  // 关闭桌宠窗口
  ipcMain.handle('stop-pet', (_event, id: number) => {
    try {
      const win = BrowserWindow.fromId(id);
      if (win) {
        win.close();
      }
    } catch (error) {
      console.log(error);
    }
  });


  // 移动窗口
  ipcMain.on('move-window', (event, deltaX: number, deltaY: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) {
      return;
    }

    const size = windowSizeMap.get(win.id);
    if (!size) {
      return;
    }

    const [x, y] = win.getPosition();
    win.setBounds({
      x: x + deltaX,
      y: y + deltaY,
      width: size.w,
      height: size.h
    });
  });



  // 创建并启动管理窗口
  createManageWindow()

})



// 当所有窗口都被关闭时退出应用，但在 macOS 上除外
// 在 macOS 上，应用程序及其菜单栏通常会保持活跃状态
// 直到用户通过 Cmd + Q 明确退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


