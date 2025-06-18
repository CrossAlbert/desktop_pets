import { shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'

// 创建桌宠窗口
const createPetWindow = (infor: PreviewInforIpc): number => {
    // 创建浏览器窗口
    const petWindow = new BrowserWindow({
        width: 900,
        height: 670,
        show: false,
        // 应用程序菜单栏将自动隐藏
        autoHideMenuBar: true,
        // 创建一个无边框窗口
        frame: false,
        // 窗口没有背景颜色
        transparent: true,
        // 防止用户调整窗口大小
        resizable: false,
        // 禁止用户将窗口置于全屏模式
        fullscreenable: false,
        // 使窗口的标题栏隐藏
        titleBarStyle: 'hidden',
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    })


    petWindow.on('ready-to-show', () => {
        petWindow.show()
    })


    petWindow.webContents.setWindowOpenHandler((details) => {
        shell.openExternal(details.url)
        return { action: 'deny' }
    })


    // 阻止页面跳转 与刷新
    petWindow.webContents.on('will-navigate', (event) => {
        event.preventDefault();
    });


    // 监听键盘 阻止刷新 
    petWindow.webContents.on('before-input-event', (event, input) => {
        if ((input.type === 'keyDown') && (
            input.key === 'F5' ||
            (input.control && input.key.toLowerCase() === 'r') ||
            (input.meta && input.key.toLowerCase() === 'r')
        )) {
            event.preventDefault();
        }
    });


    if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
        petWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        petWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    // 页面加载完成
    petWindow.webContents.on('did-finish-load', () => {
        const routerMessage: SelectRouterMessage = {
            name: 'pet',
            params: {
                name: infor.name,
                petFilePath: infor.petFilePath,
                liveName: infor.liveName
            }
        }
        // 发送信号切换路由到控制页面
        petWindow.webContents.send('select-router', routerMessage)
    });

    return petWindow.id

}

export default createPetWindow