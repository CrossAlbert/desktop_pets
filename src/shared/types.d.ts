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
    // 桌宠（live2d文件、音频文件、触摸预设文件、预览信息、 预览图）文件夹路径
    petFilePath: string
  }


  /**
   * 从文件夹读取的预览json内存储的必要信息
   */
  type PreviewInfor = {
    id: string
    // 名称
    name: string
    // 版本信息
    infor: string,
    // 位置 random为自动移动 | 固定位置
    position: { x: number, y: number }
    // 窗口尺寸
    size: {
      width: number, height: number
    }
    // 音量
    volume: number
    // live2d文件夹名称
    live2dFolder: string
    // live2d配置json文件名
    modelJsonName: string
    // 是否自启
    selfStart: boolean
    // 需要轮询开播状态的直播间ID
    roomId: number | null
    // 需要轮询开播状态的直播间名称
    roomName: string | null
  }


  /**
   * 未来用于从控制窗口，发送命令，通过主线程创建桌宠窗口时，传输配置结构
   */
  type PreviewInforIpc = PreviewInfor & {
    // 存储被指定桌宠的文件路径
    petFilePath: string
  }

  /**
   * 桌宠页面创建后返回的信息
   */
  type PetWindowInfor = {
    windowId: number
    windowWidth: number
    windowHeight: number
  }


  // -----------------------------------------------------------------------------------


  // 用于描述每个动作、音频、文本、结束延时之间的关系的结构体
  type RelationshipItem = {
    type: "Expression"
    expressionName: string
    audioName: string | null
    text: string | null
    delayed: number
  }


  // 休眠动作配置
  type SleepItem = RelationshipItem


  // 休眠后被唤醒动作
  type AwakenItem = RelationshipItem


  // 触碰配置
  type TouchItem = {
    // 请使用Cubism Viewer打开moc3文件后
    // 点击左侧文件栏中xxx.moc3后
    // 将下方"参数"选项卡调整为"图形网格"
    // drawableId为选项卡中的index
    drawableId: number
    // drawableName为选项卡中的ID
    // 用来绑定点击位置
    drawableName: string
    relationship: Array<RelationshipItem>
  }


  // 桌宠配置config_pet.json内结构
  type PetConfig = {
    // 默认待机
    defaultExpression: string
    // 屏蔽的部件（透明度调整为0）
    // 请使用Cubism Viewer打开moc3文件后
    // 点击左侧文件栏中xxx.moc3后
    // 将下方"参数"选项卡调整为"部件"
    // 将要透明化的部件名称写入列表
    shieldPartList: Array<string>
    // 休眠动画和语音
    sleep: Array<SleepItem> | null
    // 唤醒动画和语音
    awaken: Array<AwakenItem> | null
    // 触摸动画列表
    touchList: Array<TouchItem>
  }


  // -----------------------------------------------------------------------------------


  // live2d启动所需参数
  type live2dStartParame = {
    // 存储被指定桌宠的文件路径 （音频 触摸位置 文本 相关设定）
    petFilePath: string
    // live2d文件夹名称
    live2dFolder: string
    // live2d配置json文件名
    modelJsonName: string
    // 容器id
    containerId: string
  }


  // live2d启动后返回的特定元素id
  type live2dStartResult = {
    // 音频播放器id
    audioId: string,
    // live2d绘制画布id
    canvasId: string
  }

}




export { };