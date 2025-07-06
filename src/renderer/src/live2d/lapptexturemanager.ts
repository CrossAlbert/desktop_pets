/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { csmVector, iterator } from '@framework/type/csmvector';

import { gl } from './lappglmanager';

/**
 * テクスチャ管理クラス
 * 画像読み込み、管理を行うクラス。
 * 
 * 纹理管理类
 * 进行图像读取、管理的类
 */
export class LAppTextureManager {

  constructor() {
    this._textures = new csmVector<TextureInfo>();
  }

  /**
   * 释放
   */
  public release(): void {
    if (this._textures == null || gl == null) {
      return;
    }

    for (
      let ite: iterator<TextureInfo> = this._textures.begin();
      ite.notEqual(this._textures.end());
      ite.preIncrement()
    ) {
      gl.deleteTexture(ite.ptr().id);
    }
    this._textures = null;
  }



  /**
   * 图像读取
   *
   * @param fileName 要导入的图像文件路径名
   * @param usePremultiply Premult処理を有効にするか 是否启用预处理
   * @return 图像信息，读取失败时返回null
   */
  public async createTextureFromPngFile(
    fileName: string,
    usePremultiply: boolean,
    callback: (textureInfo: TextureInfo) => void
  ): Promise<void> {
    // 加入img标签的src属性
    // 该方法变为异步

    const imageBuffer = await window.electron.ipcRenderer.invoke('get-buffer', fileName);
    const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
    const imageUrl = URL.createObjectURL(imageBlob);

    if (this._textures == null) {
      return;
    }

    // 搜索已加载纹理
    for (
      // 返回容器的画像情報構造体
      let ite: iterator<TextureInfo> = this._textures.begin();
      ite.notEqual(this._textures.end());
      ite.preIncrement()
    ) {
      if (
        ite.ptr().fileName == fileName &&
        ite.ptr().usePremultply == usePremultiply
      ) {
        // 第二次以后使用缓存（无等待时间）
        // 在WebKit中，需要重新实例化才能再次调用相同图像的onload
        // 詳細：https://stackoverflow.com/a/5024181
        ite.ptr().img = new Image();
        ite
          .ptr()
          .img.addEventListener('load', (): void => callback(ite.ptr()), {
            passive: true
          });
        ite.ptr().img.src = ite.ptr().imageUrl;
        return;
      }
    }

    // 触发数据加载
    const img = new Image();
    img.addEventListener(
      'load',
      (): void => {
        if (gl == null) {
          return;
        }

        // 创建纹理对象
        const tex: WebGLTexture = gl.createTexture()!;

        // 选择纹理
        gl.bindTexture(gl.TEXTURE_2D, tex);

        // 将像素写入纹理
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Premult进行处理
        if (usePremultiply) {
          gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);
        }

        // 将像素写入纹理
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          img
        );

        // 生成中间映射
        gl.generateMipmap(gl.TEXTURE_2D);

        // 绑定纹理
        gl.bindTexture(gl.TEXTURE_2D, null);

        const textureInfo: TextureInfo = new TextureInfo();
        if (textureInfo != null) {
          textureInfo.fileName = fileName;
          textureInfo.width = img.width;
          textureInfo.height = img.height;
          textureInfo.id = tex;
          textureInfo.img = img;
          textureInfo.usePremultply = usePremultiply;
          // 追加属性
          textureInfo.imageUrl = imageUrl
          this._textures!.pushBack(textureInfo);
        }

        callback(textureInfo);
      },
      { passive: true }
    );
    // img.src = fileName;
    img.src = imageUrl;
  }

  /**
   * 画像の解放
   *
   * 配列に存在する画像全てを解放する。
   */
  public releaseTextures(): void {
    if (this._textures == null) {
      return;
    }
    for (let i = 0; i < this._textures.getSize(); i++) {
      this._textures.set(i, null);
    }

    this._textures.clear();
  }

  /**
   * 画像の解放
   *
   * 指定したテクスチャの画像を解放する。
   * @param texture 解放するテクスチャ
   */
  public releaseTextureByTexture(texture: WebGLTexture): void {
    if (this._textures == null) {
      return;
    }
    for (let i = 0; i < this._textures.getSize(); i++) {
      if (this._textures.at(i).id != texture) {
        continue;
      }

      this._textures.set(i, null);
      this._textures.remove(i);
      break;
    }
  }

  /**
   * 画像の解放
   *
   * 指定した名前の画像を解放する。
   * @param fileName 解放する画像ファイルパス名
   */
  public releaseTextureByFilePath(fileName: string): void {
    if (this._textures == null) {
      return;
    }
    for (let i = 0; i < this._textures.getSize(); i++) {
      if (this._textures.at(i).fileName == fileName) {
        this._textures.set(i, null);
        this._textures.remove(i);
        break;
      }
    }
  }

  _textures: csmVector<TextureInfo> | null;
}

/**
 * 画像情報構造体
 */
export class TextureInfo {
  img!: HTMLImageElement; // 画像
  id: WebGLTexture | null = null; // テクスチャ
  width = 0; // 横幅
  height = 0; // 高さ
  usePremultply!: boolean; // Premult処理を有効にするか
  fileName!: string; // ファイル名
  // 追加属性 blob图片url
  imageUrl!: string;
}
