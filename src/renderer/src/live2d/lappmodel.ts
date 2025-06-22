/**
 * Copyright(c) Live2D Inc. All rights reserved.
 *
 * Use of this source code is governed by the Live2D Open Software license
 * that can be found at https://www.live2d.com/eula/live2d-open-software-license-agreement_en.html.
 */

import { CubismDefaultParameterId } from '@framework/cubismdefaultparameterid';
import { CubismModelSettingJson } from '@framework/cubismmodelsettingjson';
import {
  BreathParameterData,
  CubismBreath
} from '@framework/effect/cubismbreath';
import { CubismEyeBlink } from '@framework/effect/cubismeyeblink';
import { ICubismModelSetting } from '@framework/icubismmodelsetting';
import { CubismIdHandle } from '@framework/id/cubismid';
import { CubismFramework } from '@framework/live2dcubismframework';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismUserModel } from '@framework/model/cubismusermodel';
import {
  ACubismMotion,
  FinishedMotionCallback
} from '@framework/motion/acubismmotion';
import { CubismMotion } from '@framework/motion/cubismmotion';
import {
  CubismMotionQueueEntryHandle,
  InvalidMotionQueueEntryHandleValue
} from '@framework/motion/cubismmotionqueuemanager';
import { csmMap } from '@framework/type/csmmap';
import { csmRect } from '@framework/type/csmrectf';
import { csmString } from '@framework/type/csmstring';
import { csmVector } from '@framework/type/csmvector';
import {
  CSM_ASSERT,
  CubismLogError,
  CubismLogInfo
} from '@framework/utils/cubismdebug';

import { CubismMoc } from '@framework/model/cubismmoc';

// 视图默认参数
import * as LAppDefine from './lappdefine';
// frameBuffer：获取当前帧缓冲区绑定
// LAppDelegate： 应用程序类 管理Cubism SDK。
import { frameBuffer, LAppDelegate } from './lappdelegate';

import { canvas, gl } from './lappglmanager';
/**
 * 实例拥有 
 * 读取文件转换为字节流返回方法 loadFileAsBytes
 * 获取增量时间（与上一帧的差值）getDeltaTime
 * 输出日志消息 printMessage
 */
import { LAppPal } from './lapppal';

import { TextureInfo } from './lapptexturemanager';

// 音频处理类
import { LAppWavFileHandler } from './lappwavfilehandler';


enum LoadStep {
  LoadAssets,
  LoadModel,
  WaitLoadModel,
  LoadExpression,
  WaitLoadExpression,
  LoadPhysics,
  WaitLoadPhysics,
  LoadPose,
  WaitLoadPose,
  SetupEyeBlink,
  SetupBreath,
  LoadUserData,
  WaitLoadUserData,
  SetupEyeBlinkIds,
  SetupLipSyncIds,
  SetupLayout,
  LoadMotion,
  WaitLoadMotion,
  CompleteInitialize,
  CompleteSetupModel,
  LoadTexture,
  WaitLoadTexture,
  CompleteSetup
}

/**
 * 用户实际使用的模型实现类
 * 进行模型生成、功能组件生成、更新处理和渲染的调用。
 */
export class LAppModel extends CubismUserModel {
  /**
   * 根据model3.json所在的目录和文件路径生成模型
   * @param dir
   * @param fileName
   */
  // public loadAssets(dir: string, fileName: string): void {
  //   this._modelHomeDir = dir;

  //   fetch(`${this._modelHomeDir}${fileName}`)
  //     .then(response => response.arrayBuffer())
  //     .then(arrayBuffer => {
  //       const setting: ICubismModelSetting = new CubismModelSettingJson(
  //         arrayBuffer,
  //         arrayBuffer.byteLength
  //       );

  //       // 更新状态
  //       this._state = LoadStep.LoadModel;

  //       // 結果を保存
  //       this.setupModel(setting);
  //     })
  //     .catch(_error => {
  //       // model3.json読み込みでエラーが発生した時点で描画は不可能なので、setupせずエラーをcatchして何もしない
  //       CubismLogError(`Failed to load file ${this._modelHomeDir}${fileName}`);
  //     });
  // }

  /**
   * 根据model3.json文件名 请求node层返回buffer 生成模型
   * 存储文件引入路径 用于后续配置内容引入
   * @param path
   * @param moc3name
   */
  public async loadAssets2(path: string, moc3name: string): Promise<void> {
    this._modelHomeDir = path;
    if (window.electron) {
      // window.electron.ipcRenderer.invoke('get-buffer', `${path}/${moc3name}`)
      //   .then((arrayBuffer) => {
      //     const setting: ICubismModelSetting = new CubismModelSettingJson(
      //       arrayBuffer,
      //       arrayBuffer.byteLength
      //     );

      //     // 更新状态
      //     this._state = LoadStep.LoadModel;

      //     // 結果を保存
      //     this.setupModel(setting);
      //   })
      //   .catch(_error => {
      //     // model3.json読み込みでエラーが発生した時点で描画は不可能なので、setupせずエラーをcatchして何もしない
      //     CubismLogError(`Failed to load file `);
      //   });
      try {
        const arrayBuffer = await window.electron.ipcRenderer.invoke('get-buffer', `${path}/${moc3name}`);
        const setting: ICubismModelSetting = new CubismModelSettingJson(arrayBuffer, arrayBuffer.byteLength);
        // 更新状态
        this._state = LoadStep.LoadModel;
        // 結果を保存
        this.setupModel(setting);
      } catch (error) {
        // model3.json読み込みでエラーが発生した時点で描画は不可能なので、setupせずエラーをcatchして何もしない
        CubismLogError(`Failed to load file `);
      }
    }
  }



  /**
   * 从model3.json生成模型。
   * 根据model3.json的描述，进行模型生成、运动、物理运算等组件生成。
   *
   * @param setting ICubismModelSetting实例
   */
  private setupModel(setting: ICubismModelSetting): void {
    this._updating = true;
    this._initialized = false;

    this._modelSetting = setting;

    // CubismModel
    if (this._modelSetting.getModelFileName() != '') {
      const modelFileName = this._modelSetting.getModelFileName();

      // 原始方法
      // fetch(`${this._modelHomeDir}${modelFileName}`)
      //   .then(response => {
      //     if (response.ok) {
      //       return response.arrayBuffer();
      //     } else if (response.status >= 400) {
      //       CubismLogError(
      //         `Failed to load file ${this._modelHomeDir}${modelFileName}`
      //       );
      //       return new ArrayBuffer(0);
      //     }
      //     return;
      //   })
      //   .then(arrayBuffer => {
      //     this.loadModel(arrayBuffer!, this._mocConsistency);
      //     this._state = LoadStep.LoadExpression;

      //     // callback
      //     loadCubismExpression();
      //   });

      window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${modelFileName}`)
        .then((arrayBuffer) => {
          this.loadModel(arrayBuffer!, this._mocConsistency);
          this._state = LoadStep.LoadExpression;

          // callback
          loadCubismExpression();
        })

      this._state = LoadStep.WaitLoadModel;
    } else {
      LAppPal.printMessage('Model data does not exist.');
    }

    // Expression
    const loadCubismExpression = (): void => {
      if (this._modelSetting!.getExpressionCount() > 0) {
        const count: number = this._modelSetting!.getExpressionCount();

        for (let i = 0; i < count; i++) {
          const expressionName = this._modelSetting!.getExpressionName(i);
          const expressionFileName =
            this._modelSetting!.getExpressionFileName(i);


          // 原始方法
          // fetch(`${this._modelHomeDir}${expressionFileName}`)
          //   .then(response => {
          //     if (response.ok) {
          //       return response.arrayBuffer();
          //     } else if (response.status >= 400) {
          //       CubismLogError(
          //         `Failed to load file ${this._modelHomeDir}${expressionFileName}`
          //       );
          //       // ファイルが存在しなくてもresponseはnullを返却しないため、空のArrayBufferで対応する
          //       return new ArrayBuffer(0);
          //     }
          //     return;
          //   })
          //   .then(arrayBuffer => {
          //     const motion: ACubismMotion = this.loadExpression(
          //       arrayBuffer!,
          //       arrayBuffer!.byteLength,
          //       expressionName
          //     );

          //     if (this._expressions.getValue(expressionName) != null) {
          //       ACubismMotion.delete(
          //         this._expressions.getValue(expressionName)
          //       );
          //       this._expressions.setValue(expressionName, null);
          //     }

          //     this._expressions.setValue(expressionName, motion);

          //     this._expressionCount++;

          //     if (this._expressionCount >= count) {
          //       this._state = LoadStep.LoadPhysics;

          //       // callback
          //       loadCubismPhysics();
          //     }
          //   });


          window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${expressionFileName}`)
            .then((arrayBuffer) => {
              const motion: ACubismMotion = this.loadExpression(
                arrayBuffer!,
                arrayBuffer!.byteLength,
                expressionName
              );

              if (this._expressions.getValue(expressionName) != null) {
                ACubismMotion.delete(
                  this._expressions.getValue(expressionName)
                );
                this._expressions.setValue(expressionName, null);
              }

              this._expressions.setValue(expressionName, motion);

              this._expressionCount++;

              if (this._expressionCount >= count) {
                this._state = LoadStep.LoadPhysics;

                // callback
                loadCubismPhysics();
              }
            })



        }
        this._state = LoadStep.WaitLoadExpression;
      } else {
        this._state = LoadStep.LoadPhysics;

        // callback
        loadCubismPhysics();
      }
    };

    // Physics
    const loadCubismPhysics = (): void => {
      if (this._modelSetting!.getPhysicsFileName() != '') {
        const physicsFileName = this._modelSetting!.getPhysicsFileName();

        // 原始方法
        // fetch(`${this._modelHomeDir}${physicsFileName}`)
        //   .then(response => {
        //     if (response.ok) {
        //       return response.arrayBuffer();
        //     } else if (response.status >= 400) {
        //       CubismLogError(
        //         `Failed to load file ${this._modelHomeDir}${physicsFileName}`
        //       );
        //       return new ArrayBuffer(0);
        //     }
        //     return;
        //   })
        //   .then(arrayBuffer => {
        //     this.loadPhysics(arrayBuffer!, arrayBuffer!.byteLength);

        //     this._state = LoadStep.LoadPose;

        //     // callback
        //     loadCubismPose();
        //   });


        window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${physicsFileName}`)
          .then((arrayBuffer) => {
            this.loadPhysics(arrayBuffer!, arrayBuffer!.byteLength);

            this._state = LoadStep.LoadPose;

            // callback
            loadCubismPose();
          })


        this._state = LoadStep.WaitLoadPhysics;
      } else {
        this._state = LoadStep.LoadPose;

        // callback
        loadCubismPose();
      }
    };

    // Pose
    const loadCubismPose = (): void => {
      if (this._modelSetting!.getPoseFileName() != '') {
        const poseFileName = this._modelSetting!.getPoseFileName();

        // 原始方法
        // fetch(`${this._modelHomeDir}${poseFileName}`)
        //   .then(response => {
        //     if (response.ok) {
        //       return response.arrayBuffer();
        //     } else if (response.status >= 400) {
        //       CubismLogError(
        //         `Failed to load file ${this._modelHomeDir}${poseFileName}`
        //       );
        //       return new ArrayBuffer(0);
        //     }
        //     return;
        //   })
        //   .then(arrayBuffer => {
        //     this.loadPose(arrayBuffer!, arrayBuffer!.byteLength);

        //     this._state = LoadStep.SetupEyeBlink;

        //     // callback
        //     setupEyeBlink();
        //   });


        window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${poseFileName}`)
          .then((arrayBuffer) => {
            this.loadPose(arrayBuffer!, arrayBuffer!.byteLength);

            this._state = LoadStep.SetupEyeBlink;

            // callback
            setupEyeBlink();
          })


        this._state = LoadStep.WaitLoadPose;
      } else {
        this._state = LoadStep.SetupEyeBlink;

        // callback
        setupEyeBlink();
      }
    };

    // EyeBlink
    const setupEyeBlink = (): void => {
      if (this._modelSetting!.getEyeBlinkParameterCount() > 0) {
        this._eyeBlink = CubismEyeBlink.create(this._modelSetting!);
        this._state = LoadStep.SetupBreath;
      }

      // callback
      setupBreath();
    };

    // Breath
    const setupBreath = (): void => {
      this._breath = CubismBreath.create();

      const breathParameters: csmVector<BreathParameterData> = new csmVector();
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleX, 0.0, 15.0, 6.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleY, 0.0, 8.0, 3.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(this._idParamAngleZ, 0.0, 10.0, 5.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(this._idParamBodyAngleX, 0.0, 4.0, 15.5345, 0.5)
      );
      breathParameters.pushBack(
        new BreathParameterData(
          CubismFramework.getIdManager().getId(
            CubismDefaultParameterId.ParamBreath
          ),
          0.5,
          0.5,
          3.2345,
          1
        )
      );

      this._breath.setParameters(breathParameters);
      this._state = LoadStep.LoadUserData;

      // callback
      loadUserData();
    };

    // UserData
    const loadUserData = (): void => {
      if (this._modelSetting!.getUserDataFile() != '') {
        const userDataFile = this._modelSetting!.getUserDataFile();

        // 原始方法
        // fetch(`${this._modelHomeDir}${userDataFile}`)
        //   .then(response => {
        //     if (response.ok) {
        //       return response.arrayBuffer();
        //     } else if (response.status >= 400) {
        //       CubismLogError(
        //         `Failed to load file ${this._modelHomeDir}${userDataFile}`
        //       );
        //       return new ArrayBuffer(0);
        //     }
        //     return;
        //   })
        //   .then(arrayBuffer => {
        //     this.loadUserData(arrayBuffer!, arrayBuffer!.byteLength);

        //     this._state = LoadStep.SetupEyeBlinkIds;

        //     // callback
        //     setupEyeBlinkIds();
        //   });


        window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${userDataFile}`)
          .then((arrayBuffer) => {
            this.loadUserData(arrayBuffer!, arrayBuffer!.byteLength);

            this._state = LoadStep.SetupEyeBlinkIds;

            // callback
            setupEyeBlinkIds();
          })


        this._state = LoadStep.WaitLoadUserData;
      } else {
        this._state = LoadStep.SetupEyeBlinkIds;

        // callback
        setupEyeBlinkIds();
      }
    };

    // EyeBlinkIds
    const setupEyeBlinkIds = (): void => {
      const eyeBlinkIdCount: number =
        this._modelSetting!.getEyeBlinkParameterCount();

      for (let i = 0; i < eyeBlinkIdCount; ++i) {
        this._eyeBlinkIds.pushBack(
          this._modelSetting!.getEyeBlinkParameterId(i)
        );
      }

      this._state = LoadStep.SetupLipSyncIds;

      // callback
      setupLipSyncIds();
    };

    // LipSyncIds
    const setupLipSyncIds = (): void => {
      const lipSyncIdCount = this._modelSetting!.getLipSyncParameterCount();

      for (let i = 0; i < lipSyncIdCount; ++i) {
        this._lipSyncIds.pushBack(this._modelSetting!.getLipSyncParameterId(i));
      }
      this._state = LoadStep.SetupLayout;

      // callback
      setupLayout();
    };

    // Layout
    const setupLayout = (): void => {
      const layout: csmMap<string, number> = new csmMap<string, number>();

      if (this._modelSetting == null || this._modelMatrix == null) {
        CubismLogError('Failed to setupLayout().');
        return;
      }

      this._modelSetting.getLayoutMap(layout);
      this._modelMatrix.setupFromLayout(layout);
      this._state = LoadStep.LoadMotion;

      // callback
      loadCubismMotion();
    };

    // Motion
    const loadCubismMotion = (): void => {
      this._state = LoadStep.WaitLoadMotion;
      this._model.saveParameters();
      this._allMotionCount = 0;
      this._motionCount = 0;
      const group: string[] = [];

      const motionGroupCount: number = this._modelSetting!.getMotionGroupCount();

      // モーションの総数を求める
      for (let i = 0; i < motionGroupCount; i++) {
        group[i] = this._modelSetting!.getMotionGroupName(i);
        this._allMotionCount += this._modelSetting!.getMotionCount(group[i]);
      }

      // モーションの読み込み
      for (let i = 0; i < motionGroupCount; i++) {
        this.preLoadMotionGroup(group[i]);
      }

      // モーションがない場合
      if (motionGroupCount == 0) {
        this._state = LoadStep.LoadTexture;

        // 全てのモーションを停止する
        this._motionManager.stopAllMotions();

        this._updating = false;
        this._initialized = true;

        this.createRenderer();
        this.setupTextures();
        this.getRenderer().startUp(gl!);
      }
    };
  }

  /**
   * 将纹理加载到纹理单元
   */
  private setupTextures(): void {
    // iPhoneでのアルファ品質向上のためTypescriptではpremultipliedAlphaを採用
    const usePremultiply = true;

    if (this._state == LoadStep.LoadTexture) {
      // テクスチャ読み込み用
      const textureCount: number = this._modelSetting!.getTextureCount();

      for (
        let modelTextureNumber = 0;
        modelTextureNumber < textureCount;
        modelTextureNumber++
      ) {
        // テクスチャ名が空文字だった場合はロード・バインド処理をスキップ
        if (this._modelSetting!.getTextureFileName(modelTextureNumber) == '') {
          console.log('getTextureFileName null');
          continue;
        }

        // WebGLのテクスチャユニットにテクスチャをロードする
        let texturePath = `${this._modelHomeDir}${this._modelSetting!.getTextureFileName(modelTextureNumber)}`;

        // 加载完成时调用的回调函数
        const onLoad = (textureInfo: TextureInfo): void => {
          // 获取渲染器, 在WebGL纹理绑定处理CubismRender中设定纹理，将CubismRender内用于参照该图像的Index值作为返回值
          this.getRenderer().bindTexture(modelTextureNumber, textureInfo.id!);

          this._textureCount++;

          if (this._textureCount >= textureCount) {
            // 加载完成
            this._state = LoadStep.CompleteSetup;
          }
        };

        // 読み込み 装入
        LAppDelegate.getInstance()
          .getTextureManager()
          .createTextureFromPngFile(texturePath, usePremultiply, onLoad)
          .then(() => {
            // 获取渲染器, 乘法α启用或禁用设置为真，禁用设置为假
            this.getRenderer().setIsPremultipliedAlpha(usePremultiply);
          })
          .catch((e) => {
            console.log(e);
          })

      }

      this._state = LoadStep.WaitLoadTexture;
    }
  }

  /**
   * 重建渲染器
   */
  public reloadRenderer(): void {
    this.deleteRenderer();
    this.createRenderer();
    this.setupTextures();
  }

  /**
   * 更新
   */
  public update(): void {
    if (this._state != LoadStep.CompleteSetup) return;

    const deltaTimeSeconds: number = LAppPal.getDeltaTime();
    this._userTimeSeconds += deltaTimeSeconds;

    this._dragManager.update(deltaTimeSeconds);
    this._dragX = this._dragManager.getX();
    this._dragY = this._dragManager.getY();

    // 是否通过运动进行参数更新
    let motionUpdated = false;

    //--------------------------------------------------------------------------
    this._model.loadParameters(); // 加载上次保存的状态
    if (this._motionManager.isFinished()) {
      // 没有动作播放时，从待机动作中随机播放
      // 鉴于导入的live2d来源并不统一，这里取消随机播放
      // this.startRandomMotion(
      //   LAppDefine.MotionGroupIdle,
      //   LAppDefine.PriorityIdle
      // );
    } else {
      motionUpdated = this._motionManager.updateMotion(
        this._model,
        deltaTimeSeconds
      ); // 更新运动
    }
    this._model.saveParameters(); // 状態を保存
    //--------------------------------------------------------------------------

    //眨眼
    if (!motionUpdated) {
      if (this._eyeBlink != null) {
        // 没有主运动更新时
        this._eyeBlink.updateParameters(this._model, deltaTimeSeconds); // 眨眼睛
      }
    }

    if (this._expressionManager != null) {
      this._expressionManager.updateMotion(this._model, deltaTimeSeconds); // 表情でパラメータ更新（相対変化）
    }

    // 拖动更改
    // 通过拖动调整脸部朝向
    this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30); // -30から30の値を加える
    this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30);
    this._model.addParameterValueById(
      this._idParamAngleZ,
      this._dragX * this._dragY * -30
    );

    // ドラッグによる体の向きの調整
    this._model.addParameterValueById(
      this._idParamBodyAngleX,
      this._dragX * 10
    ); // -10から10の値を加える

    // ドラッグによる目の向きの調整
    this._model.addParameterValueById(this._idParamEyeBallX, this._dragX); // -1から1の値を加える
    this._model.addParameterValueById(this._idParamEyeBallY, this._dragY);

    // 呼吸など
    if (this._breath != null) {
      this._breath.updateParameters(this._model, deltaTimeSeconds);
    }

    // 物理演算の設定
    if (this._physics != null) {
      this._physics.evaluate(this._model, deltaTimeSeconds);
    }

    // 设置唇同步
    // リップシンクの設定
    if (this._lipsync) {
      // 当实时进行唇部同步时，从系统获取音量，并在0到1的范围内输入值。
      let value = 0.0; // リアルタイムでリップシンクを行う場合、システムから音量を取得して、0~1の範囲で値を入力します。

      this._wavFileHandler.update(deltaTimeSeconds);
      value = this._wavFileHandler.getRms();

      for (let i = 0; i < this._lipSyncIds.getSize(); ++i) {
        this._model.addParameterValueById(this._lipSyncIds.at(i), value, 0.8);
      }
    }

    // ポーズの設定
    if (this._pose != null) {
      this._pose.updateParameters(this._model, deltaTimeSeconds);
    }

    this._model.update();
  }

  /**
   * 目标驱动
   * 开始播放由参数指定的运动 
   * @param group 运动组名称
   * @param no 组中的编号
   * @param priority 優先度
   * @param onFinishedMotionHandler 运动播放结束时调用的回调函数
   * @return 返回已开始运动的标识号。在isFinished（）的参数中使用，isFinished（）判断单独的运动是否结束。无法启动时[-1]
   */
  public startMotion(
    group: string,
    no: number,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): CubismMotionQueueEntryHandle {
    if (priority == LAppDefine.PriorityForce) {
      // 设置保留运动的优先级。
      this._motionManager.setReservePriority(priority);
    } else if (!this._motionManager.reserveMotion(priority)) {
      if (this._debugMode) {
        LAppPal.printMessage("[APP]can't start motion.");
      }
      return InvalidMotionQueueEntryHandleValue;
    }

    // console.log(this._modelSetting);

    // 从组名和索引值获取运动文件名
    // 获取预设动画文件名及相对路径
    const motionFileName = this._modelSetting!.getMotionFileName(group, no);


    // ex) idle_0
    const name = `${group}_${no}`;
    let motion: CubismMotion = this._motions.getValue(name) as CubismMotion;
    let autoDelete = false;

    if (motion == null) {

      // 原始方法
      // 模型设置所在的目录 + 预设动画文件名及相对路径 获取资源
      // fetch(`${this._modelHomeDir}${motionFileName}`)
      //   .then(response => {
      //     // 读取成功返回字节流 失败返回空字节流 并警告
      //     if (response.ok) {
      //       return response.arrayBuffer();
      //     } else if (response.status >= 400) {
      //       CubismLogError(
      //         `Failed to load file ${this._modelHomeDir}${motionFileName}`
      //       );
      //       return new ArrayBuffer(0);
      //     }
      //     return;
      //   })
      //   .then(arrayBuffer => {
      //     // 获取字节流 导入运动数据 获取运动类实例
      //     motion = this.loadMotion(
      //       arrayBuffer!,
      //       arrayBuffer!.byteLength,
      //       null,
      //       onFinishedMotionHandler
      //     );

      //     // 如果字节流为0 此处为空
      //     if (motion == null) {
      //       return;
      //     }

      //     // 获取运动开始时的淡入处理时间
      //     let fadeTime: number = this._modelSetting!.getMotionFadeInTimeValue(
      //       group,
      //       no
      //     );

      //     if (fadeTime >= 0.0) {
      //       motion.setFadeInTime(fadeTime);
      //     }

      //     fadeTime = this._modelSetting!.getMotionFadeOutTimeValue(group, no);
      //     if (fadeTime >= 0.0) {
      //       motion.setFadeOutTime(fadeTime);
      //     }

      //     // 设置带有自动效果的参数标识列表
      //     motion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);
      //     autoDelete = true; // 終了時にメモリから削除
      //   });


      // 模型设置所在的目录 + 预设动画文件名及相对路径 获取资源
      window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${motionFileName}`)
        .then((arrayBuffer) => {
          // 获取字节流 导入运动数据 获取运动类实例
          motion = this.loadMotion(
            arrayBuffer!,
            arrayBuffer!.byteLength,
            null,
            onFinishedMotionHandler
          );

          // 如果字节流为0 此处为空
          if (motion == null) {
            return;
          }

          // 获取运动开始时的淡入处理时间
          let fadeTime: number = this._modelSetting!.getMotionFadeInTimeValue(
            group,
            no
          );

          if (fadeTime >= 0.0) {
            motion.setFadeInTime(fadeTime);
          }

          fadeTime = this._modelSetting!.getMotionFadeOutTimeValue(group, no);
          if (fadeTime >= 0.0) {
            motion.setFadeOutTime(fadeTime);
          }

          // 设置带有自动效果的参数标识列表
          motion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);
          autoDelete = true; // 終了時にメモリから削除
        })

    } else {
      // 注册运动播放结束回调
      motion.setFinishedMotionHandler(onFinishedMotionHandler!);
    }

    //voice
    // 获取与运动相对应的声音文件的名称
    const voice = this._modelSetting!.getMotionSoundFileName(group, no);
    if (voice.localeCompare('') != 0) {
      let path = voice;
      path = this._modelHomeDir + path;
      // 拼接路径 播放声音
      this._wavFileHandler.start(path);
    }

    // 判断模式 是否需要输出日志
    if (this._debugMode) {
      LAppPal.printMessage(`[APP]start motion: [${group}_${no}`);
    }

    // 以已经设置的优先级 开始指定的运动
    return this._motionManager.startMotionPriority(
      motion,
      autoDelete,
      priority
    );
  }

  /**
   * 开始播放随机选择的运动。
   * @param group 运动组名称
   * @param priority 優先度
   * @param onFinishedMotionHandler 运动播放结束时调用的回调函数
   * @return 返回已开始运动的标识号。在isFinished（）的参数中使用，isFinished（）判断单独的运动是否结束。无法启动时[-1]
   */
  public startRandomMotion(
    group: string,
    priority: number,
    onFinishedMotionHandler?: FinishedMotionCallback
  ): CubismMotionQueueEntryHandle {

    // 获取运动组中包含的运动数
    // console.log(this._modelSetting.getMotionCount(group));

    if (this._modelSetting!.getMotionCount(group) == 0) {
      return InvalidMotionQueueEntryHandleValue;
    }

    // 随机获取指定运动组的下标
    const no: number = Math.floor(
      Math.random() * this._modelSetting!.getMotionCount(group)
    );

    // 开始播放由参数指定的运动
    return this.startMotion(group, no, priority, onFinishedMotionHandler);
  }


  /**
   * 目标驱动
   * 设置参数指定的表情运动
   *
   * @param expressionId 表情运动ID
   */
  public setExpression(expressionId: string): void {
    const motion: ACubismMotion = this._expressions.getValue(expressionId);

    if (this._debugMode) {
      LAppPal.printMessage(`[APP]expression: [${expressionId}]`);
    }

    if (motion != null) {
      this._expressionManager.startMotionPriority(
        motion,
        false,
        LAppDefine.PriorityForce
      );
    } else {
      if (this._debugMode) {
        LAppPal.printMessage(`[APP]expression[${expressionId}] is null`);
      }
    }
  }

  /**
   * 设置随机选择的表情运动
   */
  public setRandomExpression(): void {
    if (this._expressions.getSize() == 0) {
      return;
    }

    const no: number = Math.floor(Math.random() * this._expressions.getSize());

    for (let i = 0; i < this._expressions.getSize(); i++) {
      if (i == no) {
        const name: string = this._expressions._keyValues[i].first;
        this.setExpression(name);
        return;
      }
    }
  }

  /**
   * イベントの発火を受け取る
   * 运动事件触发
   */
  public motionEventFired(eventValue: csmString): void {
    CubismLogInfo('{0} is fired on LAppModel!!', eventValue.s);
  }

  /**
   * 命中判定
   * 根据指定ID的顶点列表计算矩形，判定坐标是否在矩形范围内。
   *
   * @param hitArenaName  当たり判定をテストする対象のID
   * @param x             判定を行うX座標
   * @param y             判定を行うY座標
   */
  public hitTest(hitArenaName: string, x: number, y: number): boolean {
    // 透明時は当たり判定無し。
    if (this._opacity < 1) {
      return false;
    }

    const count: number = this._modelSetting!.getHitAreasCount();

    for (let i = 0; i < count; i++) {
      if (this._modelSetting!.getHitAreaName(i) == hitArenaName) {
        const drawId: CubismIdHandle = this._modelSetting!.getHitAreaId(i);
        return this.isHit(drawId, x, y);
      }
    }

    return false;
  }

  /**
   * 从组名中批量加载运动数据。
   * 从内部的模型设置中获取运动数据的名称。
   *
   * @param group 运动数据组名称
   */
  public preLoadMotionGroup(group: string): void {
    for (let i = 0; i < this._modelSetting!.getMotionCount(group); i++) {
      const motionFileName = this._modelSetting!.getMotionFileName(group, i);

      // ex) idle_0
      const name = `${group}_${i}`;
      if (this._debugMode) {
        LAppPal.printMessage(
          `[APP]load motion: ${motionFileName} => [${name}]`
        );
      }

      // 原始方法
      // fetch(`${this._modelHomeDir}${motionFileName}`)
      //   .then(response => {
      //     if (response.ok) {
      //       return response.arrayBuffer();
      //     } else if (response.status >= 400) {
      //       CubismLogError(
      //         `Failed to load file ${this._modelHomeDir}${motionFileName}`
      //       );
      //       return new ArrayBuffer(0);
      //     }
      //     return;
      //   })
      //   .then(arrayBuffer => {
      //     const tmpMotion: CubismMotion = this.loadMotion(
      //       arrayBuffer!,
      //       arrayBuffer!.byteLength,
      //       name
      //     );

      //     if (tmpMotion != null) {
      //       let fadeTime = this._modelSetting!.getMotionFadeInTimeValue(
      //         group,
      //         i
      //       );
      //       if (fadeTime >= 0.0) {
      //         tmpMotion.setFadeInTime(fadeTime);
      //       }

      //       fadeTime = this._modelSetting!.getMotionFadeOutTimeValue(group, i);
      //       if (fadeTime >= 0.0) {
      //         tmpMotion.setFadeOutTime(fadeTime);
      //       }
      //       tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);

      //       if (this._motions.getValue(name) != null) {
      //         ACubismMotion.delete(this._motions.getValue(name));
      //       }

      //       this._motions.setValue(name, tmpMotion);

      //       this._motionCount++;
      //       if (this._motionCount >= this._allMotionCount) {
      //         this._state = LoadStep.LoadTexture;

      //         // 全てのモーションを停止する
      //         this._motionManager.stopAllMotions();

      //         this._updating = false;
      //         this._initialized = true;

      //         this.createRenderer();
      //         this.setupTextures();
      //         this.getRenderer().startUp(gl!);
      //       }
      //     } else {
      //       // loadMotionできなかった場合はモーションの総数がずれるので1つ減らす
      //       this._allMotionCount--;
      //     }
      //   });


      window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${motionFileName}`)
        .then((arrayBuffer) => {
          const tmpMotion: CubismMotion = this.loadMotion(
            arrayBuffer!,
            arrayBuffer!.byteLength,
            name
          );

          if (tmpMotion != null) {
            let fadeTime = this._modelSetting!.getMotionFadeInTimeValue(
              group,
              i
            );
            if (fadeTime >= 0.0) {
              tmpMotion.setFadeInTime(fadeTime);
            }

            fadeTime = this._modelSetting!.getMotionFadeOutTimeValue(group, i);
            if (fadeTime >= 0.0) {
              tmpMotion.setFadeOutTime(fadeTime);
            }
            tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);

            if (this._motions.getValue(name) != null) {
              ACubismMotion.delete(this._motions.getValue(name));
            }

            this._motions.setValue(name, tmpMotion);

            this._motionCount++;
            if (this._motionCount >= this._allMotionCount) {
              this._state = LoadStep.LoadTexture;

              // 全てのモーションを停止する
              this._motionManager.stopAllMotions();

              this._updating = false;
              this._initialized = true;

              this.createRenderer();
              this.setupTextures();
              this.getRenderer().startUp(gl!);
            }
          } else {
            // loadMotionできなかった場合はモーションの総数がずれるので1つ減らす
            this._allMotionCount--;
          }
        })
    }
  }

  /**
   * 释放所有运动数据。
   */
  public releaseMotions(): void {
    this._motions.clear();
  }

  /**
   * 释放所有表情数据。
   */
  public releaseExpressions(): void {
    this._expressions.clear();
  }

  /**
   * 绘制模型的过程。传递要绘制模型的空间的视图投影矩阵。
   */
  public doDraw(): void {
    if (this._model == null) return;

    // 传递画布大小
    const viewport: number[] = [0, 0, canvas!.width, canvas!.height];

    this.getRenderer().setRenderState(frameBuffer!, viewport);
    this.getRenderer().drawModel();
  }

  /**
   * モデルを描画する処理。モデルを描画する空間のView-Projection行列を渡す。
   * 绘制模型的过程。传递要绘制模型的空间的视图投影矩阵。
   */
  public draw(matrix: CubismMatrix44): void {
    if (this._model == null) {
      return;
    }


    // 各读取结束后
    if (this._state == LoadStep.CompleteSetup) {
      matrix.multiplyByMatrix(this._modelMatrix);

      this.getRenderer().setMvpMatrix(matrix);

      this.doDraw();
    }
  }

  public async hasMocConsistencyFromFile() {
    CSM_ASSERT(this._modelSetting!.getModelFileName().localeCompare(``));

    // CubismModel
    if (this._modelSetting!.getModelFileName() != '') {
      const modelFileName = this._modelSetting!.getModelFileName();

      // const response = await fetch(`${this._modelHomeDir}${modelFileName}`);
      // const arrayBuffer = await response.arrayBuffer();

      const arrayBuffer = await window.electron.ipcRenderer.invoke('get_buffer', this._modelHomeDir, modelFileName)

      this._consistency = CubismMoc.hasMocConsistency(arrayBuffer);
      if (!this._consistency) {
        CubismLogInfo('Inconsistent MOC3.');
      } else {
        CubismLogInfo('Consistent MOC3.');
      }

      return this._consistency;
    } else {
      LAppPal.printMessage('Model data does not exist.');
    }
    return;
  }

  /**
   * コンストラクタ
   */
  public constructor() {
    super();

    this._modelSetting = null;
    this._modelHomeDir = null;
    this._userTimeSeconds = 0.0;

    this._eyeBlinkIds = new csmVector<CubismIdHandle>();
    this._lipSyncIds = new csmVector<CubismIdHandle>();

    this._motions = new csmMap<string, ACubismMotion>();
    this._expressions = new csmMap<string, ACubismMotion>();

    this._hitArea = new csmVector<csmRect>();
    this._userArea = new csmVector<csmRect>();

    this._idParamAngleX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleX
    );
    this._idParamAngleY = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleY
    );
    this._idParamAngleZ = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamAngleZ
    );
    this._idParamEyeBallX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamEyeBallX
    );
    this._idParamEyeBallY = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamEyeBallY
    );
    this._idParamBodyAngleX = CubismFramework.getIdManager().getId(
      CubismDefaultParameterId.ParamBodyAngleX
    );

    if (LAppDefine.MOCConsistencyValidationEnable) {
      this._mocConsistency = true;
    }

    this._state = LoadStep.LoadAssets;
    this._expressionCount = 0;
    this._textureCount = 0;
    this._motionCount = 0;
    this._allMotionCount = 0;
    this._wavFileHandler = new LAppWavFileHandler();
    this._consistency = false;
  }

  _modelSetting: ICubismModelSetting | null; // 模型设置信息
  _modelHomeDir: string | null; // 模型设置所在的目录
  _userTimeSeconds: number; // 增量时间累计值[秒]

  _eyeBlinkIds: csmVector<CubismIdHandle>; // 为模型设置的瞬时功能参数ID
  _lipSyncIds: csmVector<CubismIdHandle>; // 为模型设置的唇同步功能参数标识

  _motions: csmMap<string, ACubismMotion>; // 导入的运动列表
  _expressions: csmMap<string, ACubismMotion>; // 导入的表情列表

  _hitArea: csmVector<csmRect>;
  _userArea: csmVector<csmRect>;

  _idParamAngleX: CubismIdHandle; // 参数ID: ParamAngleX
  _idParamAngleY: CubismIdHandle; // 参数ID: ParamAngleY
  _idParamAngleZ: CubismIdHandle; // 参数ID: ParamAngleZ
  _idParamEyeBallX: CubismIdHandle; //参数ID: ParamEyeBallX
  _idParamEyeBallY: CubismIdHandle; // 参数ID: ParamEyeBAllY
  _idParamBodyAngleX: CubismIdHandle; // 参数ID: ParamBodyAngleX

  _state: LoadStep; // 用于当前状态管理
  _expressionCount: number; // 表情数据计数
  _textureCount: number; // 纹理计数
  _motionCount: number; // 运动数据计数
  _allMotionCount: number; // 运动总数
  _wavFileHandler: LAppWavFileHandler; // wav文件处理程序
  _consistency: boolean; // MOC3一貫性チェック管理用
}
