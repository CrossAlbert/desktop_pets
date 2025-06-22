/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { ACubismMotion } from '@framework/motion/acubismmotion';
import { csmVector } from '@framework/type/csmvector';
import { CubismFramework } from '@framework/live2dcubismframework';

import * as LAppDefine from './lappdefine';
import { canvas } from './lappglmanager';
import { LAppModel } from './lappmodel';
import { LAppPal } from './lapppal';




export let s_instance: LAppLive2DManager | null = null;

/**
 * サンプルアプリケーションにおいてCubismModelを管理するクラス
 * モデル生成と破棄、タップイベントの処理、モデル切り替えを行う。
 * 
 * 
 * 在示例应用程序中管理CubismModel的类
 * 进行模型生成和废弃、点击事件的处理、模型切换。
 */
export class LAppLive2DManager {
  /**
   * クラスのインスタンス（シングルトン）を返す。
   * インスタンスが生成されていない場合は内部でインスタンスを生成する。
   * 
   * 返回一个类的实例。
   * 如果未生成实例，则在内部生成实例。
   *
   * @return クラスのインスタンス
   */
  public static getInstance(): LAppLive2DManager {
    if (s_instance == null) {
      s_instance = new LAppLive2DManager();
    }

    return s_instance;
  }

  /**
   * クラスのインスタンス（シングルトン）を解放する。
   * 释放一个类的实例（单个）。
   */
  public static releaseInstance(): void {
    if (s_instance != null) {
      s_instance = null;
    }

    s_instance = null;
  }

  /**
   * 現在のシーンで保持しているモデルを返す。
   * 返回当前场景中保留的模型。
   *
   * @param no 模型列表索引值
   * @return 返回模型实例。如果索引值超出范围，则返回空值。
   */
  public getModel(no: number): LAppModel | null {
    if (no < this._models.getSize()) {
      return this._models.at(no);
    }

    return null;
  }

  /**
   * 現在のシーンで保持しているすべてのモデルを解放する
   * 释放当前场景中保留的所有模型
   */
  public releaseAllModel(): void {
    for (let i = 0; i < this._models.getSize(); i++) {
      this._models.at(i).release();
      this._models.set(i, null);
      clearTimeout(this._sleepTime);
      clearTimeout(this._sleepAudioTime);
      clearTimeout(this._setDefaultExpressionTime);
    }

    this._models.clear();
  }


  /**
   * 指定模型中某一部件透明化
   */
  public setPartOpacity(partName: string, opacity: number): void {
    const model: LAppModel | null = this.getModel(0);
    if (model != null && model.getModel()) {
      let id = CubismFramework.getIdManager().getId(partName);
      let oldOpacity = model.getModel().getPartOpacityById(id)
      if (oldOpacity != opacity) {
        model.getModel().setPartOpacityById(id, opacity)
      }
    }
  }


  /**
   * 指定模型中某一Parameter权重
   */
  public setParameterValue(ParameterName: string, value: number): void {
    const model: LAppModel | null = this.getModel(0);
    if (model != null && model.getModel()) {
      let id = CubismFramework.getIdManager().getId(ParameterName);
      // let oldValue = model.getModel().getParameterValueById(id)
      // if (oldValue != value) {
      model.getModel().setParameterValueById(id, value)
      // }
    }
  }


  /**
   * 画面をドラッグした時の処理
   * 拖动屏幕时的操作
   *
   * @param x 画面のX座標
   * @param y 画面のY座標
   */
  public onDrag(x: number, y: number): void {
    for (let i = 0; i < this._models.getSize(); i++) {
      const model: LAppModel = this.getModel(i)!;

      if (model) {
        model.setDragging(x, y);
      }
    }
  }



  setText(text: string) {
    const div = document.getElementById('text_container') as HTMLDivElement;
    if (div) {
      const span = document.createElement('span');
      span.textContent = text;
      span.style.animation = 'fadeIn 0.5s ease forwards';
      div.appendChild(span);

      // 强制重排以确保 transition 生效（可选）
      // void span.offsetWidth;

      return span;
    } else {
      return null;
    }
  }


  cleanText(span: HTMLSpanElement) {
    const div = document.getElementById('text_container') as HTMLDivElement;
    span.style.animation = 'fadeOut 0.5s ease forwards';
    span.addEventListener('animationend', function onEnd() {
      span.removeEventListener('animationend', onEnd);
      div && div.removeChild(span);
    });
  }


  /**
   * 播放音频 执行指定动作
   *
   * @param relationshipItem
   */
  public async startAudioAndExpression(relationshipItem: RelationshipItem) {
    const model: LAppModel | null = this.getModel(0);
    const {
      expressionName,
      audioName,
      text,
      delayed,
    } = relationshipItem;


    if (model != null && model.getModel()) {

      let spanHTMLSpanElement: HTMLSpanElement | null = null;

      // 可以播放媒体文件时
      const canPlayHandler = () => {
        // 设置文本
        spanHTMLSpanElement = this.setText(text!);
        // 自动播放
        this._audioPlayer!.play();
        // 开启对话框
        // this._textFlagStore.setTextFlag(true)
        // 变化表情
        model.setExpression(expressionName)
        // 移除监听
        this._audioPlayer!.removeEventListener('canplay', canPlayHandler);
      }


      // 播放完成后
      const endedHandler = () => {
        let timeoutId = setTimeout(() => {
          // 关闭对话框
          spanHTMLSpanElement && this.cleanText(spanHTMLSpanElement)
          // 回到初始表情
          this._petConfig && model.setExpression(this._petConfig.defaultExpression)
          // 移除 ended 事件监听器
          this._audioPlayer!.removeEventListener('ended', endedHandler);
          // 清除计算器
          clearTimeout(timeoutId);
        }, delayed);

      };


      // 如果存在音频 同时存在音频播放器
      if (audioName !== null && this._audioPlayer !== null) {
        const audioArrayBuffer: NonSharedBuffer = await window.electron.ipcRenderer.invoke('get-buffer', `${this._petFilePath}/audio/${audioName}`);
        const audioBlob = new Blob([audioArrayBuffer], { type: 'audio/mpeg' });
        this._audioPlayer.src = URL.createObjectURL(audioBlob);
        // 设置监听回调
        this._audioPlayer.addEventListener('canplay', canPlayHandler);
        this._audioPlayer.addEventListener('ended', endedHandler);
      } else {
        // 无声执行动作
        model.setExpression(expressionName)
        // 延迟回归默认动作
        const expressionTime = setTimeout(() => {
          // 回到初始表情
          this._petConfig && model.setExpression(this._petConfig.defaultExpression)
          // 清空计时器
          clearTimeout(expressionTime);
        }, delayed);
      }

    }
  }



  /**
   * 目标驱动
   * 
   * 画面をタップした時の処理
   * 点击画面时的处理
   *
   * @param x 画面のX座標
   * @param y 画面のY座標
   */
  public onTap(x: number, y: number) {

    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(`[APP]tap point: {x: ${x.toFixed(2)} y: ${y.toFixed(2)}}`);
    }

    const model: LAppModel | null = this.getModel(0);
    const petConfig = this._petConfig;

    if (model != null && model.getModel() && petConfig !== null && petConfig.touchList) {

      let touchIndex: number | null = null;
      let touchList = petConfig.touchList;

      touchList.forEach((el, index) => {
        // 使用getDrawableId获取当前模型管理器对对应的el.drawableId的命名id
        let id = model.getModel().getDrawableId(el.drawableId);
        // 判断点击坐标是否在对应图形组件上
        // 如果是 设置当前touchList的下标，用于后续提取动作、音频、文字
        if (model.isHit(id, x, y)) {
          touchIndex = index;
        }
      });

      // 如果触摸点无对应配置
      if (touchIndex === null) {
        return;
      }

      // 提取结构
      const touchItem = touchList[touchIndex];
      // 如果该触摸配置下，用于响应的配置结构体不止一个，随机下标，否则使用第一个
      const index = touchItem.relationship.length > 1 ? Math.floor(Math.random() * touchItem.relationship.length) : 0;
      this.startAudioAndExpression(touchItem.relationship[index]).catch(e => console.log(e));

    }
  }



  /**
   * 设置休眠 到达夜间时间时，执行休眠动作
   */
  // public setSleep() {

  // }

  awaken() {

  }


  /**
 * 画面を更新するときの処理
 * モデルの更新処理及び描画処理を行う
 * 
 * 更新画面时的处理
 * 进行模型更新处理及描绘处理
 */
  public onUpdate(): void {
    const { width, height } = canvas!;

    const modelCount: number = this._models.getSize();

    for (let i = 0; i < modelCount; ++i) {
      const projection: CubismMatrix44 = new CubismMatrix44();
      const model: LAppModel = this.getModel(i)!;

      if (model.getModel()) {
        if (model.getModel().getCanvasWidth() > 1.0 && width < height) {
          // 横に長いモデルを縦長ウィンドウに表示する際モデルの横サイズでscaleを算出する
          // 在纵向窗口中显示横向较长的模型时，根据模型的横向尺寸计算scale
          model.getModelMatrix().setWidth(2.0);
          projection.scale(1.0, width / height);
        } else {
          projection.scale(height / width, 1.0);
        }

        // 必要があればここで乗算
        if (this._viewMatrix != null) {
          projection.multiplyByMatrix(this._viewMatrix);
        }
      }

      model.update();
      model.draw(projection); // 参照渡しなのでprojectionは変質する。

    }
  }



  /**
   * 新增方法 生成模型
   * @param petFilePath  存储被指定桌宠的文件路径
   * @param live2dFolder  live2d文件夹名称
   * @param modelJsonName  live2d配置json文件名
   */
  public generateModel(petFilePath: string, live2dFolder: string, modelJsonName: string) {
    if (LAppDefine.DebugLogEnable) {
      LAppPal.printMessage(`[APP]model index: ${this._sceneIndex}`);
    }
    // 释放当前场景中保留的所有模型
    this.releaseAllModel();
    //向容器添加新元素 实例化类（进行模型生成、功能组件生成、更新处理和渲染的调用）
    this._models.pushBack(new LAppModel());
    // loadAssets是使用网络请求加载资源 loadAssets2是使用node的fs模块加载资源
    this._models.at(0).loadAssets2(`${petFilePath}/${live2dFolder}`, modelJsonName)
      .then(async () => {
        // 获取音频播放器
        this._audioPlayer = document.getElementById(`${live2dFolder}audioPlayer`) as HTMLAudioElement;
        // 记录桌宠文件路径
        this._petFilePath = petFilePath;
        // 读取桌宠配置文件
        const jsonData = await window.electron.ipcRenderer.invoke('get-json', `${petFilePath}/config_pet.json`);
        this._petConfig = jsonData as PetConfig;
        // 读取屏蔽部件列表 将指定部件透明度归零
        this._petConfig.shieldPartList.forEach(item => {
          this.setPartOpacity(item, 0);
        })
      }).catch(error => {
        console.error(error);
      });

  }



  public setViewMatrix(m: CubismMatrix44) {
    for (let i = 0; i < 16; i++) {
      this._viewMatrix.getArray()[i] = m.getArray()[i];
    }
  }

  /**
   * コンストラクタ
   */
  constructor() {
    this._viewMatrix = new CubismMatrix44();
    this._models = new csmVector<LAppModel>();
    this._sceneIndex = 0;
    this._petConfig = null;
    this._audioPlayer = null;
    this._petFilePath = null;
    // this._textBoxStore = useTextBoxStore()
    // this._textFlagStore = useTextFlagStore()
    // this._portStore = usePortStore()
    // this.changeScene(this._sceneIndex);
  }
  // 用于模型绘制的视图矩阵
  _viewMatrix: CubismMatrix44;
  // 模型实例容器
  _models: csmVector<LAppModel>;
  // 要显示的场景索引值
  _sceneIndex: number;
  // 桌宠配置
  _petConfig: PetConfig | null;
  // 桌宠文件路径
  _petFilePath: string | null;

  _textBoxStore: any
  _textFlagStore: any
  _portStore: any
  // 休眠计时器
  _sleepTime: any
  // 休眠语音计时器
  _sleepAudioTime: any
  // 播放权dom元素
  _audioPlayer: HTMLAudioElement | null
  // 动作回归计时器
  _setDefaultExpressionTime: any
  // 运动播放结束的回调函数
  _finishedMotion = (self: ACubismMotion): void => {
    LAppPal.printMessage('Motion Finished:');
    console.log(self);

  };
}
