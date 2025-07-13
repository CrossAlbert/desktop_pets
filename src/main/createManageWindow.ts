import { shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'


// 创建管理窗口
const createManageWindow = (): number => {
    // 创建浏览器窗口
    const manageWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        autoHideMenuBar: true,
        // 防止用户调整窗口大小
        resizable: false,
        // 禁止用户将窗口置于全屏模式
        fullscreenable: false,
        ...(process.platform === 'linux' ? { icon } : {}),
        title: 'Live2D桌宠管理器',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })

    manageWindow.on('ready-to-show', () => {
        manageWindow.show()
    })


    // 强制外部链接在系统浏览器中打开
    manageWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })


    // 阻止页面跳转 与刷新
    manageWindow.webContents.on('will-navigate', (event) => {
        event.preventDefault();
    });


    // 监听键盘 阻止刷新 
    manageWindow.webContents.on('before-input-event', (event, input) => {
        if ((input.type === 'keyDown') && (
            input.key === 'F5' ||
            (input.control && input.key.toLowerCase() === 'r') ||
            (input.meta && input.key.toLowerCase() === 'r')
        )) {
            event.preventDefault();
        }
    });


    // 基于electronic-vite-cli的渲染器HMR
    // 加载用于开发的远程URL或用于生产的本地html文件
    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        manageWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        manageWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // 页面加载完成
    manageWindow.webContents.on('did-finish-load', () => {
        // 发送信号切换路由到控制页面
        manageWindow.webContents.send('select-router', { name: 'manage' })
    });


    return manageWindow.id

}

export default createManageWindow