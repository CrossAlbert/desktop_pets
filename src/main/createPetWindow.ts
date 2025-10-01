import { shell, BrowserWindow, BrowserWindowConstructorOptions, screen } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
// import setDesktopChild from '../setDesktopChild/Release/setDesktopChild.node'

// 创建桌宠窗口
const createPetWindow = (infor: PreviewInforIpc): PetWindowInfor => {
    const options: BrowserWindowConstructorOptions = {
        width: infor.size.width,
        height: infor.size.height,
        show: false,
        // 应用程序菜单栏将自动隐藏
        autoHideMenuBar: true,
        // 创建一个无边框窗口
        frame: false,
        // 窗口没有背景颜色
        transparent: true,
        thickFrame: false,
        // 防止用户调整窗口大小
        resizable: false,
        // 禁止用户将窗口置于全屏模式
        fullscreenable: false,
        // 使窗口的标题栏隐藏
        titleBarStyle: 'hidden',
        // 窗口不在任务栏显示
        skipTaskbar: true,
        title: `桌宠窗口-${infor.name}`,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false
        }
    }


    // 判断是否有预设位置
    if (infor.position.x !== -100000 && infor.position.y !== -100000) {
        options.x = infor.position.x
        options.y = infor.position.y
    } else {
        const primaryDisplay = screen.getPrimaryDisplay();
        const { width, height } = primaryDisplay.workAreaSize;
        const x = Math.floor(width / 2 - infor.size.width / 2);
        const y = Math.floor(height / 2 - infor.size.height / 2);

        options.x = x;
        options.y = y;
    }


    // 创建浏览器窗口
    const petWindow = new BrowserWindow(options)


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
                live2dFolder: infor.live2dFolder,
                modelJsonName: infor.modelJsonName,
                volume: infor.volume,
                roomName: infor.roomName,
                roomId: infor.roomId
            }
        }
        // 发送信号切换路由到控制页面
        petWindow.webContents.send('select-router', routerMessage)
    });

    // 获取句柄
    // const hwndBuffer = petWindow.getNativeWindowHandle()
    // const hwndEec = hwndBuffer.readUInt32LE(0)
    // 将窗口置于桌面内作为子窗口
    // setDesktopChild.setDesktopChild(hwndEec)

    return {
        windowId: petWindow.id,
        windowWidth: infor.size.width,
        windowHeight: infor.size.height
    }

}

export default createPetWindow