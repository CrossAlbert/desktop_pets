/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

/**
 * プラットフォーム依存機能を抽象化する Cubism Platform Abstraction Layer.
 *
 * ファイル読み込みや時刻取得等のプラットフォームに依存する関数をまとめる。
 * 
 * 
 * 将平台依存功能抽象化的Cubism Platform Abstraction层。
 * 总结文件读取和时间获取等依赖于平台的函数。
 */
export class LAppPal {
  /**
   * ファイルをバイトデータとして読みこむ
   * 将文件作为字节数据读取
   *
   * @param filePath 读取路径
   * @return
   * {
   *      buffer,   导入的字节数据
   *      size      文件大小
   * }
   */
  public static loadFileAsBytes(
    filePath: string,
    callback: (arrayBuffer: ArrayBuffer, size: number) => void
  ): void {
    if (window.electron) {
      window.electron.ipcRenderer.invoke('get_buffer', filePath, '')
        .then((arrayBuffer) => {
          callback(arrayBuffer, arrayBuffer.byteLength)
        })
        .catch(_error => {

        });
    }
  }

  

  /**
   * デルタ時間（前回フレームとの差分）を取得する
   * 获取增量时间（与上一帧的差值）
   * 
   * 
   * 
   * @return デルタ時間[ms]
   */
  public static getDeltaTime(): number {
    return this.s_deltaTime;
  }

  public static updateTime(): void {
    this.s_currentFrame = Date.now();
    this.s_deltaTime = (this.s_currentFrame - this.s_lastFrame) / 1000;
    this.s_lastFrame = this.s_currentFrame;
  }


  /**
   * メッセージを出力する
   * 输出消息
   * @param message 文字列
   */
  public static printMessage(message: string): void {
    console.log(message);
  }

  static lastUpdate = Date.now();

  static s_currentFrame = 0.0;
  static s_lastFrame = 0.0;
  static s_deltaTime = 0.0;
}
