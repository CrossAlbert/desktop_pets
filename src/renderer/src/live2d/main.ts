/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { LAppDelegate } from './lappdelegate';
// 用于管理Cubism SDK示例中使用的WebGL的封装类
import { LAppGlManager } from './lappglmanager';


/**
 * 启动live2d 加入指定容器中
 * @param petFilePath  存储被指定桌宠的文件路径
 * @param live2dFolder  live2d文件夹名称
 * @param modelJsonName  live2d配置json文件名
 */
const live2dStart = (petFilePath: string, live2dFolder: string, modelJsonName: string): { audioId: string, canvasId: string } | null => {

  // 获取WebGL实例
  const result = LAppGlManager.getInstance()
  // 获取Cubism SDK应用程序类，并 初始化画布大小 判断绑定触摸/点击函数，绑定音频播放器， 进行webgl相关设置， 视图容器设置， SDKの初期化
  const idResult = LAppDelegate.getInstance().initialize(petFilePath, live2dFolder, modelJsonName);

  // 判断所需实例创建是否正常
  if (idResult && result) {
    LAppDelegate.getInstance().run();
    return idResult
  } else {
    return null
  }

}



/**
 * 終了時の処理
 */
const live2dEnd = (canvasId: any, audioId: any): void => {
  LAppDelegate.releaseInstance();
  document.getElementById(canvasId)?.remove();
  document.getElementById(audioId)?.remove();
}


/**
 * 更改屏幕大小时的触发重绘
 */
const live2dResize = () => {
  // 调整画布大小并重新初始化视图。
  LAppDelegate.getInstance().onResize();
}


export default {
  live2dStart,
  live2dResize,
  live2dEnd
}