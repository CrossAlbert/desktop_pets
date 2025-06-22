/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

// Live 2D Cubism SDK Original Workflow SDK的入口点
// 开始使用时，初始化类 CubismFramework.initialize（）
import { CubismFramework, Option } from '@framework/live2dcubismframework';
// 默认参数
import * as LAppDefine from './lappdefine';
// 进行模型生成和废弃、点击事件的处理、模型切换。
import { LAppLive2DManager } from './lapplive2dmanager';
/**
 * 实例拥有 
 * 读取文件转换为字节流返回方法 loadFileAsBytes
 * 获取增量时间（与上一帧的差值）getDeltaTime
 * 输出日志消息 printMessage
 */
import { LAppPal } from './lapppal';

// live2d文件的纹理管理类
import { LAppTextureManager } from './lapptexturemanager';

// 容器类
import { LAppView } from './lappview';

// gl:已初始化的webgl实例
import { canvas, gl } from './lappglmanager';


export let s_instance: LAppDelegate | null = null;
export let frameBuffer: WebGLFramebuffer | null = null;

/**
 * 应用程序类。
 * 管理Cubism SDK。
 */
export class LAppDelegate {
  /**
   * 返回类的实例（单个）。
   * 如果无实例，则在内部生成实例，再返回。
   *
   * @return 类实例
   */
  public static getInstance(): LAppDelegate {
    if (s_instance == null) {
      s_instance = new LAppDelegate();
    }

    return s_instance;
  }

  /**
   * 释放一个类的实例（单个）。
   */
  public static releaseInstance(): void {
    if (s_instance != null) {
      s_instance.release();
    }

    s_instance = null;
  }


  /**
   * 初始化APP所需的东西。
   * @param petFilePath  存储被指定桌宠的文件路径
   * @param live2dFolder  live2d文件夹名称
   * @param modelJsonName  live2d配置json文件名
   */
  public initialize(petFilePath: string, live2dFolder: string, modelJsonName: string): boolean {

    if (canvas == null || gl == null) {
      console.log('live2d画布获取失败');
      return false
    }

    // 获取画布容器
    const canvasContainer = document.getElementById("canvas_container");

    if (canvasContainer === null) {
      console.log("容器获取失败");
      return false
    }


    // 添加画布
    canvasContainer.appendChild(canvas);
    canvas.setAttribute('id', 'live2d_canvas_wallpaper');
    // 将预先设定好的画布大小设置到画布
    canvas.width = canvasContainer.clientWidth;
    canvas.height = canvasContainer.clientHeight;


    // 添加音频播放器
    const audioEelement = document.createElement('audio') as HTMLAudioElement;
    audioEelement.setAttribute('id', `${live2dFolder}audioPlayer`);
    audioEelement.style.display = 'none';
    canvasContainer.appendChild(audioEelement);


    if (!frameBuffer) {
      // 获取当前帧缓冲区绑定
      frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
    }


    // 透過設定 用于对该上下文开启某种特性 https://developer.mozilla.org/zh-CN/docs/Web/API/WebGLRenderingContext/enable
    gl.enable(gl.BLEND);
    // 定义了一个用于混合像素算法的函数 https://developer.mozilla.org/zh-CN/docs/Web/API/WebGLRenderingContext/blendFunc
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);


    // 鼠标关联回调函数注册
    canvas.addEventListener('mousedown', onClickBegan, { passive: true });
    canvas.addEventListener('mousemove', onMouseMoved, { passive: true });
    canvas.addEventListener('mouseup', onClickEnded, { passive: true });


    // AppViewの初期化
    this._view!.initialize();
    // Cubism SDKの初期化
    this.initializeCubism(petFilePath, live2dFolder, modelJsonName);

    return true;
  }

  /**
   * 调整画布大小并重新初始化视图。
   */
  public onResize(): void {
    this._resizeCanvas();
    this._view!.initialize();
    this._view!.initializeSprite();
  }

  /**
   * 解放する。
   */
  public release(): void {
    this._textureManager!.release();
    this._textureManager = null;

    this._view!.release();
    this._view = null;

    LAppLive2DManager.getInstance().releaseAllModel()
    LAppLive2DManager.releaseInstance();
    // リソースを解放
    LAppLive2DManager.releaseInstance();

    // Cubism SDKの解放
    CubismFramework.dispose();
  }

  /**
   * 执行动画
   */
  public run(): void {
    // 循环函数
    const loop = (): void => {
      if (s_instance == null || gl == null) {
        return;
      }

      // 時間更新
      LAppPal.updateTime();

      // 画面の初期化 设置canvas的背景颜色
      gl.clearColor(0.0, 0.0, 0.0, 0);

      // 深度テストを有効化 
      // 启用深度测试
      gl.enable(gl.DEPTH_TEST);

      // 近くにある物体は、遠くにある物体を覆い隠す
      // 附近的物体会掩盖远处的物体
      gl.depthFunc(gl.LEQUAL);

      // カラーバッファや深度バッファをクリアする
      // 清除颜色缓冲区和深度缓冲区
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.clearDepth(1.0);

      // 透過設定
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      if (this._view != null) {
        // 描画更新
        this._view.render();
      }

      // 循环的递归调用
      requestAnimationFrame(loop);
    };

    // 循环的递归调用
    loop();
  }

  /**
   * シェーダーを登録する。
   */
  public createShader(): WebGLProgram | null {
    if (gl == null) {
      return null;
    }
    // バーテックスシェーダーのコンパイル
    const vertexShaderId = gl.createShader(gl.VERTEX_SHADER);

    if (vertexShaderId == null) {
      LAppPal.printMessage('failed to create vertexShader');
      return null;
    }

    const vertexShader: string =
      'precision mediump float;' +
      'attribute vec3 position;' +
      'attribute vec2 uv;' +
      'varying vec2 vuv;' +
      'void main(void)' +
      '{' +
      '   gl_Position = vec4(position, 1.0);' +
      '   vuv = uv;' +
      '}';

    gl.shaderSource(vertexShaderId, vertexShader);
    gl.compileShader(vertexShaderId);

    // フラグメントシェーダのコンパイル
    const fragmentShaderId = gl.createShader(gl.FRAGMENT_SHADER);

    if (fragmentShaderId == null) {
      LAppPal.printMessage('failed to create fragmentShader');
      return null;
    }

    const fragmentShader: string =
      'precision mediump float;' +
      'varying vec2 vuv;' +
      'uniform sampler2D texture;' +
      'void main(void)' +
      '{' +
      '   gl_FragColor = texture2D(texture, vuv);' +
      '}';

    gl.shaderSource(fragmentShaderId, fragmentShader);
    gl.compileShader(fragmentShaderId);

    // プログラムオブジェクトの作成
    const programId = gl.createProgram()!;
    gl.attachShader(programId, vertexShaderId);
    gl.attachShader(programId, fragmentShaderId);

    gl.deleteShader(vertexShaderId);
    gl.deleteShader(fragmentShaderId);

    // リンク
    gl.linkProgram(programId);

    gl.useProgram(programId);

    return programId;
  }

  /**
   * View情報を取得する。
   */
  public getView(): LAppView {
    return this._view!;
  }

  public getTextureManager(): LAppTextureManager {
    return this._textureManager!;
  }


  /**
   * Cubism SDKの初期化
   * @param petFilePath  存储被指定桌宠的文件路径
   * @param live2dFolder  live2d文件夹名称
   * @param modelJsonName  live2d配置json文件名
   */
  public initializeCubism(petFilePath: string, live2dFolder: string, modelJsonName: string): void {
    // setup cubism

    // 绑定日志输出方法
    this._cubismOption.logFunction = LAppPal.printMessage;
    // 绑定从框架输出的日志级别设置
    this._cubismOption.loggingLevel = LAppDefine.CubismLoggingLevel;

    // 获取 CubismFramework 实例
    CubismFramework.startUp(this._cubismOption);

    // 初始化Cubism框架中的资源，分配内存
    CubismFramework.initialize();

    // 初始化模型类.  输入路径导入执行模型生成
    LAppLive2DManager.getInstance().generateModel(petFilePath, live2dFolder, modelJsonName);

    // 更新增量时间
    LAppPal.updateTime();

    // 初始化容器类中 背景图像信息
    if (this._view != null) {
      this._view.initializeSprite();
    }
  }

  /**
   * 调整画布大小以填充屏幕。
   */
  private _resizeCanvas(): void {
    const canvasContainer = document.getElementById("canvas_container");
    if (canvas != null && gl != null && canvasContainer != null) {
      canvas.width = canvasContainer.clientWidth;
      canvas.height = canvasContainer.clientHeight;
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
  }

  /**
  * 构造函数
  */
  constructor() {
    this._captured = false;
    this._mouseX = 0.0;
    this._mouseY = 0.0;
    this._isEnd = false;

    this._cubismOption = new Option();
    this._view = new LAppView();
    this._textureManager = new LAppTextureManager();
  }


  _cubismOption: Option; // Cubism SDK选项
  _view: LAppView | null; // View信息
  _captured: boolean; // 是否单击
  _mouseX: number; // 鼠标X坐标
  _mouseY: number; // 鼠标Y坐标
  _isEnd: boolean; // APP是否结束
  _textureManager: LAppTextureManager | null; // 纹理管理器
}

/**
 * 点击时触发
 */
function onClickBegan(e: MouseEvent): void {
  // 仅限左键
  if (e.button !== 0) { return; }
  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }
  LAppDelegate.getInstance()._captured = true;

  const posX: number = e.pageX;
  const posY: number = e.pageY;


  LAppDelegate.getInstance()._view!.onTouchesBegan(posX, posY);

}

/**
 * 当鼠标指针移动时
 */
function onMouseMoved(e: MouseEvent): void {
  // 仅限左键
  if (e.button !== 0) { return; }
  if (!LAppDelegate.getInstance()._captured) {
    return;
  }

  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }

  const rect = (e.target as Element).getBoundingClientRect();
  const posX: number = e.clientX - rect.left;
  const posY: number = e.clientY - rect.top;

  LAppDelegate.getInstance()._view!.onTouchesMoved(posX, posY);
}

/**
 * 点击结束后触发
 */
function onClickEnded(e: MouseEvent): void {
  // 仅限左键
  if (e.button !== 0) { return; }
  LAppDelegate.getInstance()._captured = false;
  if (!LAppDelegate.getInstance()._view) {
    LAppPal.printMessage('view notfound');
    return;
  }

  // 其提供了元素的大小及其相对于视口的位置
  const rect = (e.target as Element).getBoundingClientRect();
  const posX: number = e.clientX - rect.left;
  const posY: number = e.clientY - rect.top;

  LAppDelegate.getInstance()._view!.onTouchesEnded(posX, posY);
}





