/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismViewMatrix } from '@framework/math/cubismviewmatrix';

import * as LAppDefine from './lappdefine';
// import { LAppDelegate } from './lappdelegate';
import { canvas, gl } from './lappglmanager';
import { LAppLive2DManager } from './lapplive2dmanager';
import { LAppPal } from './lapppal';
import { LAppSprite } from './lappsprite';
// import { TextureInfo } from './lapptexturemanager';
import { TouchManager } from './touchmanager';

/**
 * 容器类
 */
export class LAppView {

  constructor() {
    this._programId = null;
    this._back = null;
    this._gear = null;

    // 触摸事件管理
    this._touchManager = new TouchManager();

    // 用于将设备坐标转换为屏幕坐标
    this._deviceToScreen = new CubismMatrix44();

    // 进行画面的显示的放大缩小和移动的变换的行列
    this._viewMatrix = new CubismViewMatrix();
  }

  /**
   * 初期化する。
   */
  public initialize(): void {
    if (canvas == null || this._viewMatrix == null || this._deviceToScreen == null) {
      return;
    }

    const { width, height } = canvas;

    const ratio: number = width / height;
    const left: number = -ratio;
    const right: number = ratio;
    const bottom: number = LAppDefine.ViewLogicalLeft;
    const top: number = LAppDefine.ViewLogicalRight;

    this._viewMatrix.setScreenRect(left, right, bottom, top); // 与设备相对应的屏幕范围。X左端、X右端、Y下端、Y上端
    this._viewMatrix.scale(LAppDefine.ViewScale, LAppDefine.ViewScale);

    this._deviceToScreen.loadIdentity();
    if (width > height) {
      const screenW: number = Math.abs(right - left);
      this._deviceToScreen.scaleRelative(screenW / width, -screenW / width);
    } else {
      const screenH: number = Math.abs(top - bottom);
      this._deviceToScreen.scaleRelative(screenH / height, -screenH / height);
    }
    this._deviceToScreen.translateRelative(-width * 0.5, -height * 0.5);

    // 表示範囲の設定
    this._viewMatrix.setMaxScale(LAppDefine.ViewMaxScale); // 限界拡張率
    this._viewMatrix.setMinScale(LAppDefine.ViewMinScale); // 限界縮小率

    // 表示できる最大範囲
    this._viewMatrix.setMaxScreenRect(
      LAppDefine.ViewLogicalMaxLeft,
      LAppDefine.ViewLogicalMaxRight,
      LAppDefine.ViewLogicalMaxBottom,
      LAppDefine.ViewLogicalMaxTop
    );
  }

  /**
   * 释放实例
   */
  public release(): void {
    this._viewMatrix = null;
    this._touchManager = null;
    this._deviceToScreen = null;

    if (this._gear != null) {
      this._gear.release();
      this._gear = null;
    }

    if (this._back != null) {
      this._back.release();
      this._back = null;
    }

    gl!.deleteProgram(this._programId);
    this._programId = null;
  }





  /**
   * 绘制
   */
  public render(): void {
    if (gl == null) {
      return;
    }
    // 将定义好的WebGLProgram 对象添加到当前的渲染状态中。
    gl.useProgram(this._programId);

    if (this._back) {
      this._back.render(this._programId!);
    }
    if (this._gear) {
      this._gear.render(this._programId!);
    }

    gl.flush();

    const live2DManager: LAppLive2DManager = LAppLive2DManager.getInstance();


    // 设置视图矩阵
    live2DManager.setViewMatrix(this._viewMatrix!);

    live2DManager.onUpdate();
  }


  public initializeSprite(): void { }


  /**
   * 被触摸的时触发。
   *
   * @param pointX スクリーンX座標
   * @param pointY スクリーンY座標
   */
  public onTouchesBegan(pointX: number, pointY: number): void {
    this._touchManager!.touchesBegan(
      pointX * 2,
      pointY * 2
    );
  }


  /**
   * 触摸的时候指针移动的话
   *
   * @param pointX スクリーンX座標
   * @param pointY スクリーンY座標
   */
  public onTouchesMoved(pointX: number, pointY: number): void {
    if (this._touchManager == null) {
      return;
    }

    const viewX: number = this.transformViewX(this._touchManager.getX());
    const viewY: number = this.transformViewY(this._touchManager.getY());

    this._touchManager.touchesMoved(
      pointX * 2,
      pointY * 2
    );

    const live2DManager: LAppLive2DManager = LAppLive2DManager.getInstance();
    live2DManager.onDrag(viewX, viewY);
  }


  /**
   * 目标驱动
   * 
   * タッチが終了したら呼ばれる。
   * 触摸结束后。
   *
   * @param pointX スクリーンX座標
   * @param pointY スクリーンY座標
   */
  public onTouchesEnded(pointX: number, pointY: number): void {
    // 触摸结束
    const live2DManager: LAppLive2DManager = LAppLive2DManager.getInstance();
    live2DManager.onDrag(0.0, 0.0);


    // シングルタップ
    let pointX2 = pointX * 2;
    let pointY2 = pointY * 2;

    // 获取逻辑坐标转换后的坐标。
    const x: number = this._deviceToScreen!.transformX(pointX2);
    const y: number = this._deviceToScreen!.transformY(pointY2);

    if (LAppDefine.DebugTouchLogEnable) {
      LAppPal.printMessage(`[APP]touchesEnded x: ${x} y: ${y}`);
    }

    // 点击画面时的处理
    live2DManager.onTap(x, y);
  }

  /**
   * X座標をView座標に変換する。
   *
   * @param deviceX デバイスX座標
   */
  public transformViewX(deviceX: number): number {
    const screenX: number = this._deviceToScreen!.transformX(deviceX); // 論理座標変換した座標を取得。
    return this._viewMatrix!.invertTransformX(screenX); // 拡大、縮小、移動後の値。
  }

  /**
   * Y座標をView座標に変換する。
   *
   * @param deviceY デバイスY座標
   */
  public transformViewY(deviceY: number): number {
    const screenY: number = this._deviceToScreen!.transformY(deviceY); // 論理座標変換した座標を取得。
    return this._viewMatrix!.invertTransformY(screenY);
  }

  /**
   * X座標をScreen座標に変換する。
   * @param deviceX デバイスX座標
   */
  public transformScreenX(deviceX: number): number {
    return this._deviceToScreen!.transformX(deviceX);
  }

  /**
   * Y座標をScreen座標に変換する。
   *
   * @param deviceY デバイスY座標
   */
  public transformScreenY(deviceY: number): number {
    return this._deviceToScreen!.transformY(deviceY);
  }

  _touchManager: TouchManager | null; // 触摸管理器
  _deviceToScreen: CubismMatrix44 | null; // 从设备到屏幕的矩阵
  _viewMatrix: CubismViewMatrix | null; // 视图矩阵
  _programId: WebGLProgram | null; // 着色器标识
  _back: LAppSprite | null; // 背景画像
  _gear: LAppSprite | null; // 齿轮图片（切换设置按钮图片
  _changeModel!: boolean; // 模型切换标志
  _isClick!: boolean; // 单击
}
