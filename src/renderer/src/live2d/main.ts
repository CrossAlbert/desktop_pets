import { CubismFramework, Option } from '@framework/live2dcubismframework';
import { LogLevel } from '@framework/live2dcubismframework';
import { Model } from './model';
import { Clock } from './clock';
import { CoordTransform } from './coordTransform';
import { ClickManage } from './clickManage';


export class live2dManage {
  // live2d文件夹名称
  private _live2dFolder: string;
  // 容器id
  private _containerId: string;
  // 存储被指定桌宠的文件路径
  private _petFilePath: string;
  // live2d配置json文件名
  private _modelJsonName: string;
  // 画布ID
  private _canvasId: string;
  // 音频ID
  private _audioId: string;
  // 模型时钟
  private _modelClock: Clock;
  // 坐标工具
  private _coordTransformTool: CoordTransform;
  // 点击管理类
  private _clickM: ClickManage | null;
  // 模型
  private _model: Model | null;
  // 画布
  private _canvas: HTMLCanvasElement;
  // 动画id
  private _animationId: number | null;
  // 桌宠配置
  private _petConfig: PetConfig | null;
  // 画布物理像素缩放值
  // 使用超采样技术：增大画布的物理分辨率，再通过 context 缩放匹配逻辑尺寸，  
  // 提升渲染精度，解决部分 Live2D 模型在未知的渲染模糊问题
  private _physicalScale: number;
  // 开播状态轮询
  private _pollingTimer: null | NodeJS.Timeout;


  constructor(parme: live2dStartParame) {
    const { petFilePath, live2dFolder, modelJsonName, containerId } = parme;


    this._petFilePath = petFilePath;
    this._live2dFolder = live2dFolder;
    this._modelJsonName = modelJsonName;
    this._containerId = containerId;
    this._physicalScale = 1.25;


    // 建立画布 并同时检测webgl
    this._canvasId = this.createCanvas();
    this._audioId = this.createAudio();


    // 获取Cubism SDK应用程序类，SDK初始化
    const cubismOption = new Option();
    // 绑定日志输出方法
    cubismOption.logFunction = (mess: any) => console.log(mess);
    // 绑定从框架输出的日志级别设置
    cubismOption.loggingLevel = LogLevel.LogLevel_Verbose;
    // 获取 CubismFramework 实例
    CubismFramework.startUp(cubismOption);
    // 初始化Cubism框架中的资源，分配内存
    CubismFramework.initialize();


    // 保存画布
    this._canvas = document.getElementById(this._canvasId) as HTMLCanvasElement;
    // 建立时钟
    this._modelClock = new Clock();
    // 建立坐标系变换工具
    this._coordTransformTool = new CoordTransform(this._canvas);


    // 模型配置文件需要异步读取，使用下方start单独调用
    this._model = null;
    this._clickM = null;
    this._animationId = null;
    this._petConfig = null;
    this._pollingTimer = null;
  }




  /**
   * 创建画布 并检测webgl
   */
  private createCanvas() {
    const canvasId = `live2d_canvas_${this._live2dFolder}`;

    // 获取画布容器
    const container = document.getElementById(this._containerId);
    // 检测容器是否存在
    if (container === null) {
      throw new Error('Container retrieval failed');
    }

    // 创建模型画布
    const modelCanvas = document.createElement('canvas');

    // 设置画布id
    modelCanvas.setAttribute('id', canvasId);

    // 获取屏幕缩放比
    const devicePixelRatio = window.devicePixelRatio || 1;


    // 设置画布渲染大小为物理像素
    modelCanvas.width = container.clientWidth * devicePixelRatio * this._physicalScale;
    modelCanvas.height = container.clientHeight * devicePixelRatio * this._physicalScale;

    // 设置画布大小为容器尺寸（逻辑像素）
    modelCanvas.style.width = `${container.clientWidth}px`;
    modelCanvas.style.height = `${container.clientHeight}px`;

    // 获取webgl实例 检测当前环境是否支持webgl
    const gl = modelCanvas.getContext('webgl2');

    if (gl === null) {
      throw new Error('Unable to enable WebGL');
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    // 将画布添加到容器
    container.appendChild(modelCanvas);

    return canvasId;
  }




  /**
   * 创建音频播放器
   */
  private createAudio() {
    // 获取画布容器
    const container = document.getElementById(this._containerId);
    // 检测容器是否存在
    if (container === null) {
      throw new Error('Container retrieval failed');
    }

    const audioId = `audio_player_${this._live2dFolder}`;
    const audioEelement = document.createElement('audio') as HTMLAudioElement;
    audioEelement.setAttribute('id', audioId);
    audioEelement.style.display = 'none';
    container.appendChild(audioEelement);

    return audioId;
  }




  /**
   * 启动动画循环渲染
   */
  private run(): void {

    const gl = this._canvas.getContext('webgl2') as WebGL2RenderingContext;;
    // 循环函数
    const loop = (): void => {
      // 更新增量时间
      this._modelClock.update();

      //设置canvas的背景颜色
      gl.clearColor(0.0, 0.0, 0.0, 0);

      // 启用深度测试
      gl.enable(gl.DEPTH_TEST);

      // 设置深度测试函数
      gl.depthFunc(gl.LEQUAL);

      // 清除颜色缓冲区和深度缓冲区
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.clearDepth(1.0);

      // 启用混合
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);



      if (this._model) {
        //可能冗余
        this._model.setViewMatrix(this._coordTransformTool.getViewMatrix());
        // 描画更新
        this._model.onUpdate();
      }

      // 循环的递归调用
      this._animationId = requestAnimationFrame(loop);
    };

    // 循环的递归调用
    loop();
  }




  /**
   * 修改音量
   * @param value 
   * @returns 
   */
  public changeVolume(value: number) {
    if (!this._audioId) { return; }
    const audioPlayer = document.getElementById(this._audioId) as HTMLAudioElement | null;
    if (!audioPlayer) { return; }
    audioPlayer.volume = value / 100;
  }








  public async start() {

    // 获取桌宠文件
    this._petConfig = await window.electron.ipcRenderer.invoke('get-json', `${this._petFilePath}/config_pet.json`);

    // 初始化模型类
    this._model = new Model(this._canvas, this._modelClock);

    // 加载模型
    await this._model.loadAssets(this._petFilePath, this._live2dFolder, this._modelJsonName);

    // 读取屏蔽部件列表
    if (this._petConfig.shieldPartList.length > 0) {
      this._petConfig.shieldPartList.forEach(item => {
        this._model.setPartOpacity(item, 0);
      });
    }




    // 动画渲染循环，模型更新
    this._modelClock.update();
    this.run();

    // 执行一次默认表情
    this._model.setExpression(this._petConfig.defaultExpression);

    if (this._petConfig) {
      // 点击管理类
      this._clickM = new ClickManage(
        this._model,
        this._coordTransformTool,
        this._canvas,
        this._petConfig,
        this._petFilePath,
        this._audioId,
        this._physicalScale
      );

      //画布添加click监听 绑定监听
      this._canvas.addEventListener('pointerdown', this._clickM.clickStart.bind(this._clickM));
      this._canvas.addEventListener('pointermove', this._clickM.clickMove.bind(this._clickM));
      this._canvas.addEventListener('pointerup', this._clickM.clickEnd.bind(this._clickM));
    }

  }




  public stop() {
    if (this._animationId) {
      cancelAnimationFrame(this._animationId);
    }

    if (this._pollingTimer) {
      clearInterval(this._pollingTimer);
    }

    // Cubism SDK释放
    CubismFramework.dispose();

    document.getElementById(this._canvasId)?.remove();
    document.getElementById(this._audioId)?.remove();
  }

}



















