# desktop_pets

一个基于 Electron、Vue 和 TypeScript 构建的桌面宠物应用。

> **注意**：本项目仅支持 Windows 10/11 系统，不兼容 macOS 或 Linux。

## 项目结构

本项目基于 [electron-vite](https://cn.electron-vite.org/guide/) 构建，此处仅说明与默认结构的差异。

> `/src/live2dSDK` 目录用于存放 Live2D 官方提供的 Web SDK。  
> 根据 Live2D 的授权政策，SDK 文件不可随项目分发，因此本仓库中未包含实际文件，仅保留目录结构。  
> 请前往 [Live2D 官方网站](https://www.live2d.com/) 下载 SDK 后，手动将文件放入该目录。

> `/src/setDesktopChild` 目录包含一个通过 Node-API 编译的 C++ 扩展模块，用于将窗口嵌入桌面进程，作为桌面子窗口显示（例如显示在桌面图标之下）。  
> 该模块目前仅支持 Windows 10。在 Windows 11 上曾出现未明确定义的崩溃问题，尚未解决。  
> **默认不启用**，使用示例请参考 `src/main/createPetWindow.ts`。

## 推荐 IDE 配置

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## 项目设置

### 安装依赖

```bash
$ pnpm install
```

### 开发模式
```bash
$ pnpm dev
```

### 构建应用

> **注意**：尽管构建脚本支持 macOS 和 Linux，但核心功能仅在 Windows 上经过测试，因此跨平台构建仅形式支持，实际功能受限。

```bash
# 构建 Windows 版本
$ pnpm build:win

# 构建 macOS 版本
$ pnpm build:mac

# 构建 Linux 版本
$ pnpm build:linux
```
