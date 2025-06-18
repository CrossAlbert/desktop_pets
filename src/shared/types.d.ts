declare global {

  /**
   * 主线程通知渲染线程切换路由时 发送的结构
   */
  type SelectRouterMessage = {
    name: string
    params?: {
      [key: string]: any
    }
  }

  /**
   * 主线程发送给渲染线程的预览列表元素
   */
  type PreviewItemIpc = {
    // 预览信息文件路径
    previewJsonPath: string
    // 预览图文件路径
    previewJpgPath: string
    // 桌宠（live2d文件、音频文件、触摸预设文件）文件夹路径
    petFilePath: string
  }


  /**
   * 从文件夹读取的预览json内存储的必要信息
   */
  type PreviewInfor = {
    // 名称
    name: string
    // 版本信息
    infor: string,
    // 位置 random为自动移动 | 固定位置
    position: 'random' | { x: number, y: number }
    // 显示屏幕编号 默认屏幕1
    range: number,
    // live2d文件名称
    liveName: string
  }


  /**
   * 未来用于从控制窗口，发送命令，通过主线程创建桌宠窗口时，传输配置结构
   */
  type PreviewInforIpc = PreviewInfor & {
    // 存储被指定桌宠的文件路径
    petFilePath: string
  }

}

export { };