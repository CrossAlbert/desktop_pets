import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, shell } from 'electron';
import icon from '../../resources/icon.png?asset';
import { join, normalize } from 'path';
import fs from 'fs';
import { electronApp, optimizer } from '@electron-toolkit/utils';
import type { } from '@shared/types';
import createManageWindow from './createManageWindow';
import createPetWindow from './createPetWindow';
import getPreviewList from './getPreviewList';
import changeJsonFile from './changeJson';
import { isPathInPetsFileDir } from './isPathInPetsFileDir';
import axios from 'axios';


// 获取单例锁 如果是多次执行的实例 直接关闭
if (!app.requestSingleInstanceLock()) { app.quit() };


// 存储管理页面窗口实例
let manageWindowId: number | null = null;

// 缓存窗口尺寸 用以解决右键移动窗口导致的窗口变大
const windowSizeMap: Map<number, { w: number, h: number }> = new Map();

// 存储桌宠id与桌面窗口id映射 用于后期重新打开管理页面时同步管理
const windowPetMap: Map<string, number> = new Map();


// 创建一个用于存放桌宠文件的目录
const petsFileDir = join(app.getPath('appData'), 'petsFile');


// 检测路径是否存在
if (!fs.existsSync(petsFileDir)) {
  // 路径不存在，新建路径
  fs.mkdirSync(petsFileDir, { recursive: true });
}


// 启动桌宠
const startPet = (infor: PreviewInforIpc) => {
  // 创建桌宠视口，并返回窗口id
  const windowInfor = createPetWindow(infor)

  windowSizeMap.set(
    windowInfor.windowId,
    {
      w: windowInfor.windowWidth,
      h: windowInfor.windowHeight
    }
  )

  windowPetMap.set(infor.id, windowInfor.windowId)

  return windowInfor.windowId
}


// 创建托盘
const createTray = () => {
  const tray = new Tray(icon)
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开控制页',
      click: () => {
        if (manageWindowId === null) {
          manageWindowId = createManageWindow()
        } else {
          const win = BrowserWindow.fromId(manageWindowId)
          if (win === null) {
            manageWindowId = createManageWindow()
          } else {
            win.show()
          }
        }
      }
    },
    { type: 'separator' },
    {
      label: '退出程序',
      click: () => app.quit()
    }
  ])
  tray.setContextMenu(contextMenu)
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
    return await getPreviewList(petsFileDir);
  });



  // 获取读取json
  ipcMain.handle('get-json', (_event, path: string) => {
    try {
      if (!isPathInPetsFileDir(petsFileDir, path)) {
        throw new Error('get-json 获取路径异常');
      }
      const data = fs.readFileSync(normalize(path), 'utf8');
      return JSON.parse(data);
    } catch (error) {
      throw error
    }
  });



  // 获取文件字节流
  ipcMain.handle('get-buffer', (_event, path: string) => {
    try {
      if (!isPathInPetsFileDir(petsFileDir, path)) {
        throw new Error('get-buffer 获取路径异常');
      }
      const buf = fs.readFileSync(normalize(path));
      const buffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      return buffer;
    } catch (error) {
      throw error
    }
  })



  // 开启桌宠窗口
  ipcMain.handle('start-pet', (_event, infor: PreviewInforIpc) => {
    try {
      const windowId = startPet(infor)
      return windowId
    } catch (error) {
      throw error
    }
  });


  // 关闭桌宠窗口
  ipcMain.handle('stop-pet', (_event, windowId: number, petId: string) => {
    try {
      const win = BrowserWindow.fromId(windowId)
      windowPetMap.delete(petId)
      if (!win) { throw new Error('The window pointed to by ID does not exist') }
      win.close()
    } catch (error) {
      throw error
    }
  });


  // 移动窗口
  ipcMain.on('move-window', (event, deltaX: number, deltaY: number) => {
    try {
      const win = BrowserWindow.fromWebContents(event.sender)

      if (!win || win.isDestroyed()) {
        throw new Error('The window pointed to by ID does not exist or is hidden')
      }

      const size = windowSizeMap.get(win.id);
      if (!size) { throw new Error('Unable to obtain preset size') }

      const [x, y] = win.getPosition()
      win.setBounds({
        x: x + deltaX,
        y: y + deltaY,
        width: size.w,
        height: size.h
      })

    } catch (error) {
      throw error
    }
  });



  // 修改默认音量配置
  ipcMain.handle('ipc-change-volume',
    async (_event, windowId: number, volumeNumber: number, previewJsonPath: string) => {
      try {

        if (!isPathInPetsFileDir(petsFileDir, previewJsonPath)) {
          throw new Error('ipc-change-volume 获取路径异常');
        }

        const win = BrowserWindow.fromId(windowId)
        if (!win) { throw new Error('The window pointed to by ID does not exist') }

        // 发送信号 命令指定桌宠页面调整音量
        win.webContents.send('send-change-volume', volumeNumber);
        // 修改配置文件 设置音量
        await changeJsonFile(previewJsonPath, ["volume"], volumeNumber);

      } catch (error) {
        throw error
      }
    })


  // 修改默认启动位置配置
  ipcMain.handle('ipc-change-position',
    async (_event, windowId: number, previewJsonPath: string): Promise<{ x: number, y: number }> => {
      try {

        if (!isPathInPetsFileDir(petsFileDir, previewJsonPath)) {
          throw new Error('ipc-change-position 获取路径异常');
        }

        const win = BrowserWindow.fromId(windowId);
        if (!win) { throw new Error('The window pointed to by ID does not exist') }

        const [x, y] = win.getPosition();

        // 修改配置文件 设置启动位置
        await changeJsonFile(previewJsonPath, ["position"], { x, y });
        return { x, y };

      } catch (error) {
        throw error
      }
    })



  // 修改默认启动位置配置
  ipcMain.handle('ipc-reset-position',
    async (_event, previewJsonPath: string) => {
      try {

        if (!isPathInPetsFileDir(petsFileDir, previewJsonPath)) {
          throw new Error('ipc-reset-position 获取路径异常');
        }

        // 修改配置文件 设置启动位置
        await changeJsonFile(previewJsonPath, ["position"], { x: -100000, y: -100000 });
      } catch (error) {
        throw error
      }
    })


  // 修改是否自启
  ipcMain.handle('ipc-change-self-start',
    async (_event, previewJsonPath: string, flag: boolean) => {
      try {

        if (!isPathInPetsFileDir(petsFileDir, previewJsonPath)) {
          throw new Error('ipc-change-self-start 获取路径异常');
        }

        // 修改配置文件 设置是否自启
        await changeJsonFile(previewJsonPath, ["selfStart"], flag);
      } catch (error) {
        throw error
      }
    })



  // 视图层从主线程同步已有桌宠窗口id
  ipcMain.handle('ipc-synchronous-pet-window-id',
    async (_event) => {
      try {
        return Object.fromEntries(windowPetMap)
      } catch (error) {
        throw error
      }
    })


  // 监听来自渲染进程的开机自启开关请求
  ipcMain.handle('set-auto-launch', async (_event, enable) => {
    app.setLoginItemSettings({
      openAtLogin: enable,
      path: app.getPath('exe'),
    });
  });


  // 监听获取当前状态请求
  ipcMain.handle('get-auto-launch', async () => {
    const settings = app.getLoginItemSettings();
    return settings.openAtLogin;
  });



  ipcMain.handle('open-pet-path', async () => {
    try {
      await shell.openPath(petsFileDir)
    } catch (error) {
      throw error
    }
  });



  // 轮询直播间状态
  ipcMain.handle('ipc-poll-bilibili-live',
    async (_event, roomId: number) => {
      try {

        const { data } = await axios.get(`https://api.live.bilibili.com/room/v1/Room/get_info?room_id=${roomId}`);

        if (data.code !== 0) {
            throw new Error(`API 返回错误`);
        }

        if (!data.data.live_status) {
            throw new Error(`API 返回错误`);
        }

        return {
            flag: data.data.live_status === 1 ? true : false,
            time: data.data.live_time
        }

      } catch (error) {
        return {
          flag: false,
          time: null
        }
      }
    })



  // 创建托盘
  createTray()


  // 获取桌宠列表 并进行相应操作
  getPreviewList(petsFileDir)
    .then(async (previewList) => {

      const filterList = await Promise.all(
        previewList.map(async item => {

          const data = await new Promise<string>((resolve, reject) => {
            if (!isPathInPetsFileDir(petsFileDir, item.previewJsonPath)) {
              reject(new Error('getPreviewList 获取路径异常'));
            }

            fs.readFile(normalize(item.previewJsonPath), 'utf8', (err, data) => {
              if (err) {
                reject(err)
              } else {
                resolve(data)
              }
            });
          })

          const x: PreviewInforIpc = {
            ...JSON.parse(data),
            petFilePath: item.petFilePath
          }

          return x

        })
      )

      // 过滤 保留开启自启功能的桌宠
      const resultList = filterList.filter((item) => item.selfStart);

      if (resultList.length > 0) {
        // 启动桌宠
        resultList.forEach(infor => {
          startPet(infor)
        });
      } else {
        // 创建并启动管理窗口
        manageWindowId = createManageWindow()
      }


    })
    .catch((e) => {
      console.log(e);
    })

})



// 当所有窗口都被关闭时退出应用，但在 macOS 上除外
// 在 macOS 上，应用程序及其菜单栏通常会保持活跃状态
// 直到用户通过 Cmd + Q 明确退出
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})



