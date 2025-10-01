import { CubismDefaultParameterId } from '@framework/cubismdefaultparameterid';
import { CubismModelSettingJson } from '@framework/cubismmodelsettingjson';
import { BreathParameterData, CubismBreath } from '@framework/effect/cubismbreath';
import { CubismEyeBlink } from '@framework/effect/cubismeyeblink';
import { ICubismModelSetting } from '@framework/icubismmodelsetting';
import { CubismIdHandle } from '@framework/id/cubismid';
import { CubismFramework } from '@framework/live2dcubismframework';
import { CubismMatrix44 } from '@framework/math/cubismmatrix44';
import { CubismUserModel } from '@framework/model/cubismusermodel';
import { ACubismMotion, FinishedMotionCallback } from '@framework/motion/acubismmotion';
import { CubismMotion } from '@framework/motion/cubismmotion';
import { CubismMotionQueueEntryHandle, InvalidMotionQueueEntryHandleValue } from '@framework/motion/cubismmotionqueuemanager';
import { csmMap } from '@framework/type/csmmap';
import { csmRect } from '@framework/type/csmrectf';
import { csmString } from '@framework/type/csmstring';
import { csmVector } from '@framework/type/csmvector';
import { CSM_ASSERT, CubismLogInfo } from '@framework/utils/cubismdebug';
import { CubismMoc } from '@framework/model/cubismmoc';


import type { Clock } from './clock';





/**
 * 用户实际使用的模型实现类
 * 进行模型生成、功能组件生成、更新处理和渲染的调用。
 */
export class Model extends CubismUserModel {


  /**
   * 根据model3.json文件名 请求node层返回buffer 生成模型
   * 存储文件引入路径 用于后续配置内容引入
   * @param petFilePath  存储被指定桌宠的文件路径
   * @param live2dFolder  live2d文件夹名称
   * @param modelJsonName  live2d配置json文件名
   */
  public async loadAssets(petFilePath: string, live2dFolder: string, modelJsonName: string): Promise<void> {
    try {
      const path = `${petFilePath}/${live2dFolder}`;

      // live2d 模型文件路径
      this._modelHomeDir = path;


      // 读取文件buffer
      const arrayBuffer = await window.electron.ipcRenderer.invoke('get-buffer', `${path}/${modelJsonName}`);
      // 启用sdk 获取配置
      const setting: ICubismModelSetting = new CubismModelSettingJson(arrayBuffer, arrayBuffer.byteLength);
      // 生成模型
      await this.setupModel(setting);

    } catch (error) {
      console.log(error);
      console.log("启动模型失败");
    }
  }



  /**
   * 从model3.json生成模型。
   * 根据model3.json的描述，进行模型生成、运动、物理运算等组件生成。
   *
   * @param setting ICubismModelSetting实例
   */
  private async setupModel(setting: ICubismModelSetting): Promise<void> {
    try {
      const modelSetting = setting;
      this._modelSetting = modelSetting;


      // 获取模型文件名
      const modelFileName = modelSetting.getModelFileName();
      // 如果模型名不存在
      if (modelFileName === '') {
        throw new Error('Model data does not exist');
      }

      const modelFileBuffer = await window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${modelFileName}`);
      this.loadModel(modelFileBuffer!, this._mocConsistency);


      // 获取表情总数
      const expressionCount: number = modelSetting.getExpressionCount();
      // 如果总数大于0 加载表情
      if (expressionCount > 0) {

        await Promise.all(
          Array.from({ length: expressionCount }, (_, index) => index).map(async (index: number) => {

            // 获取表情名
            const expressionName = modelSetting.getExpressionName(index);
            // 获取表情文件名(json)
            const expressionFileName = modelSetting.getExpressionFileName(index);

            const expressionFileBuffer = await window.electron.ipcRenderer.invoke(
              'get-buffer',
              `${this._modelHomeDir}/${expressionFileName}`
            );

            // 表情数据的加载
            const motion: ACubismMotion = this.loadExpression(
              expressionFileBuffer,
              expressionFileBuffer.byteLength,
              expressionName
            );


            if (this._expressions.getValue(expressionName) != null) {
              ACubismMotion.delete(
                this._expressions.getValue(expressionName)
              );
            }

            this._expressions.setValue(expressionName, motion);



          })

        )

      }



      // 获取物理运算设置文件的名称
      const physicsFileName = modelSetting.getPhysicsFileName();
      // 如果存在文件 加载
      if (physicsFileName !== '') {
        const physicsFileBuffer = await window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${physicsFileName}`);
        this.loadPhysics(physicsFileBuffer!, physicsFileBuffer!.byteLength);
      }



      // 获取部件切换设置文件的名称
      const poseFileName = modelSetting.getPoseFileName();
      // 如果存在文件 加载
      if (poseFileName !== '') {
        const poseFileBuffer = await window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${poseFileName}`)
        this.loadPose(poseFileBuffer, poseFileBuffer.byteLength);
      }



      // 获取与眨眼相关联的参数数量
      if (modelSetting.getEyeBlinkParameterCount() > 0) {
        this._eyeBlink = CubismEyeBlink.create(this._modelSetting);
      }



      // 设置呼吸效果
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



      // 获取用户数据的文件名
      const userDataFile = modelSetting.getUserDataFile();
      // 如果存在文件 加载
      if (userDataFile !== '') {
        const userDataBuffer = await window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${userDataFile}`);
        this.loadUserData(userDataBuffer, userDataBuffer.byteLength);
      }



      // 获取与眨眼相关联的参数数量
      const eyeBlinkIdCount: number = modelSetting.getEyeBlinkParameterCount();
      // 如果总数大于0 加载表情
      if (eyeBlinkIdCount > 0) {
        for (let i = 0; i < eyeBlinkIdCount; ++i) {
          this._eyeBlinkIds.pushBack(modelSetting.getEyeBlinkParameterId(i));
        }
      }



      // 获取与唇同步相关联的参数数量
      const lipSyncIdCount = modelSetting.getLipSyncParameterCount();
      // 如果总数大于0 加载表情
      if (lipSyncIdCount > 0) {
        for (let i = 0; i < lipSyncIdCount; ++i) {
          this._lipSyncIds.pushBack(modelSetting.getLipSyncParameterId(i));
        }
      }



      const layout: csmMap<string, number> = new csmMap<string, number>();
      if (this._modelSetting == null || this._modelMatrix == null) {
        throw new Error('Failed to setup Layout')
      }


      this._modelSetting.getLayoutMap(layout);
      this._modelMatrix.setupFromLayout(layout);
      this._model.saveParameters();


      // 获取动作组的数量
      const motionGroupCount: number = modelSetting.getMotionGroupCount();

      const group: string[] = [];

      if (motionGroupCount > 0) {
        await Promise.all(
          Array.from({ length: motionGroupCount }, (_, index) => index).map(async (index: number) => {
            // 获取动作组的名称
            group[index] = modelSetting.getMotionGroupName(index);
            // 获取动作组中包含的动作数量
            await this.preLoadMotionGroup(group[index]);
          })
        )
      }



      const gl = this._canvas.getContext('webgl2') as WebGL2RenderingContext;

      this._motionManager.stopAllMotions();
      this.createRenderer();
      await this.setupTextures();
      this.getRenderer().startUp(gl);


    } catch (error) {
      throw error;
    }
  }




  /**
   * 从组名中批量加载运动数据。
   * 从内部的模型设置中获取运动数据的名称。
   *
   * @param group 运动数据组名称
   */
  public async preLoadMotionGroup(group: string): Promise<void> {
    if (this._modelSetting == null) {
      return;
    }

    for (let i = 0; i < this._modelSetting.getMotionCount(group); i++) {
      const motionFileName = this._modelSetting.getMotionFileName(group, i);

      const name = `${group}_${i}`;

      const motionFileBuffer = await window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${motionFileName}`)
      // 读取动作数据 返回动作数据类
      const tmpMotion: CubismMotion = this.loadMotion(motionFileBuffer, motionFileBuffer.byteLength, name);

      if (tmpMotion == null) {
        continue;
      }

      // 获取动作开始时的淡入处理时间。
      const fadeInTime = this._modelSetting.getMotionFadeInTimeValue(group, i);
      if (fadeInTime >= 0.0) {
        tmpMotion.setFadeInTime(fadeInTime);
      }

      // 获取动作开始时的淡出处理时间。
      const fadeOutTime = this._modelSetting!.getMotionFadeOutTimeValue(group, i);
      if (fadeOutTime >= 0.0) {
        tmpMotion.setFadeOutTime(fadeOutTime);
      }


      tmpMotion.setEffectIds(this._eyeBlinkIds, this._lipSyncIds);


      if (this._motions.getValue(name) != null) {
        ACubismMotion.delete(this._motions.getValue(name));
      }

      this._motions.setValue(name, tmpMotion);

    }

  }




  /**
   * 将纹理加载到纹理单元
   */
  private async setupTextures(): Promise<void> {
    try {
      const usePremultiply = true;

      const modelSetting = this._modelSetting;
      if (modelSetting == null) {
        return;
      }

      // 获取纹理总数
      const textureCount: number = modelSetting.getTextureCount();

      if (textureCount <= 0) {
        throw new Error('missing textureFileName');
      }

      await Promise.all(
        Array.from({ length: textureCount }, (_, index) => index).map(async (index: number) => {

          // 如果纹理名称为空字符串，则跳过加载和绑定处理
          if (modelSetting.getTextureFileName(index) == '') {
            console.log('getTextureFileName null');
            return;
          }

          //将纹理加载到WebGL的纹理单元中
          const texturePath = `${this._modelHomeDir}/${modelSetting.getTextureFileName(index)}`;

          const canvas = this._canvas;
          const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;


          const imageBuffer = await window.electron.ipcRenderer.invoke('get-buffer', texturePath);
          const imageBlob = new Blob([imageBuffer], { type: 'image/png' });
          const imageUrl = URL.createObjectURL(imageBlob);


          const img = new Image();
          img.src = imageUrl;



          const texId = await new Promise<WebGLTexture>((resolve, reject) => {

            img.addEventListener('load', () => {
              try {


                // 创建纹理对象
                const tex: WebGLTexture = gl.createTexture();

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

                resolve(tex);
              } catch (error) {
                reject(error);
              }
            }, { passive: true }
            );

          })


          this.getRenderer().bindTexture(index, texId);

          // 获取渲染器, 乘法α启用或禁用设置为真，禁用设置为假
          this.getRenderer().setIsPremultipliedAlpha(usePremultiply);

        })
      );

    } catch (error) {
      throw error;
    }

  }





  /**
   * 重建渲染器
   */
  public async reloadRenderer(): Promise<void> {
    this.deleteRenderer();
    this.createRenderer();
    await this.setupTextures();
  }





  /**
   * 更新
   */
  public update(): void {

    const deltaTimeSeconds: number = this._clock.getDeltaTime();
    this._userTimeSeconds += deltaTimeSeconds;

    this._dragManager.update(deltaTimeSeconds);
    this._dragX = this._dragManager.getX();
    this._dragY = this._dragManager.getY();



    // 是否通过运动进行参数更新
    let motionUpdated = false;

    // 加载已保存的参数
    this._model.loadParameters();

    // 确认所有动作是否结束 
    if (!this._motionManager.isFinished()) {
      // 更新动作，并将时间增量应用到模型上。
      // 如果已更新则返回 true；如果未更新（如动作已结束或暂停）则返回 false
      motionUpdated = this._motionManager.updateMotion(
        this._model,
        deltaTimeSeconds
      );


    }

    // 保存参数
    this._model.saveParameters();


    // 已无动作运行 同时有眨眼参数 执行眨眼
    if (!motionUpdated && this._eyeBlink != null) {
      this._eyeBlink.updateParameters(this._model, deltaTimeSeconds); // 眨眼睛
    }


    if (this._expressionManager != null) {
      // 更新动作并应用参数到模型
      this._expressionManager.updateMotion(this._model, deltaTimeSeconds);
    }



    // 拖动更改
    // 通过拖动调整脸部朝向
    this._model.addParameterValueById(this._idParamAngleX, this._dragX * 30);
    this._model.addParameterValueById(this._idParamAngleY, this._dragY * 30);
    this._model.addParameterValueById(this._idParamAngleZ, this._dragX * this._dragY * -30);

    // 进行的身体方向调整
    this._model.addParameterValueById(this._idParamBodyAngleX, this._dragX * 10);

    // 进行的眼球方向调整
    this._model.addParameterValueById(this._idParamEyeBallX, this._dragX);
    this._model.addParameterValueById(this._idParamEyeBallY, this._dragY);

    // 呼吸
    if (this._breath != null) {
      this._breath.updateParameters(this._model, deltaTimeSeconds);
    }

    // 物理演算设定
    if (this._physics != null) {
      this._physics.evaluate(this._model, deltaTimeSeconds);
    }

    // 如果模型有唇同步相关参数
    if (this._lipsync) {
      // 当实时进行唇部同步时，从系统获取音量，并在0到1的范围内输入值。
      let value = 0.0;

      // 此处需要一个音频分析库 用于获取当前时间节点音频振幅

      for (let i = 0; i < this._lipSyncIds.getSize(); ++i) {
        this._model.addParameterValueById(this._lipSyncIds.at(i), value, 0.8);
      }
    }

    // 设定姿势
    if (this._pose != null) {
      this._pose.updateParameters(this._model, deltaTimeSeconds);
    }

    this._model.update();
  }




  /**
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
    // 设置保留运动的优先级。
    this._motionManager.setReservePriority(priority);

    if (!this._motionManager.reserveMotion(priority)) {
      console.log("[APP]can't start motion.");
      return InvalidMotionQueueEntryHandleValue;
    }

    // 从组名和索引值获取运动文件名
    // 获取预设动画文件名及相对路径
    const motionFileName = this._modelSetting!.getMotionFileName(group, no);


    const name = `${group}_${no}`;
    let motion: CubismMotion = this._motions.getValue(name) as CubismMotion;
    let autoDelete = false;

    if (motion == null) {

      // 模型设置所在的目录 + 预设动画文件名及相对路径 获取资源
      window.electron.ipcRenderer.invoke('get-buffer', `${this._modelHomeDir}/${motionFileName}`)
        .then((arrayBuffer) => {
          // 获取字节流 导入运动数据 获取运动类实例
          motion = this.loadMotion(
            arrayBuffer!,
            arrayBuffer!.byteLength,
            motionFileName,
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
          autoDelete = true;
        })
        
    } else {
      // 注册运动播放结束回调
      motion.setFinishedMotionHandler(onFinishedMotionHandler!);
    }


    console.log(`[APP]start motion: [${group}_${no}`);


    // 以已经设置的优先级 开始指定的运动
    return this._motionManager.startMotionPriority(
      motion,
      autoDelete,
      priority
    );
  }




  /**
   * 设置参数指定的表情运动
   *
   * @param expressionId 表情运动ID
   */
  public setExpression(expressionId: string): void {
    const motion: ACubismMotion = this._expressions.getValue(expressionId);

    if (motion != null) {
      this._expressionManager.startMotion(motion, false);
    } else {
      console.log(`[APP]expression[${expressionId}] is null`);
    }
  }




  /**
   * 指定模型中某一部件透明化
   */
  public setPartOpacity(partName: string, opacity: number): void {
    const model = this.getModel();
    const id = CubismFramework.getIdManager().getId(partName);
    model.setPartOpacityById(id, opacity);
  }




  /**
   * 运动事件触发
   */
  public motionEventFired(eventValue: csmString): void {
    CubismLogInfo('{0} is fired on LAppModel!!', eventValue.s);
  }




  // 拖动屏幕时的操作
  public onDrag(x: number, y: number): void {
    this.setDragging(x, y);
  }




  /**
   * 点击画面时的处理,判断点击坐标是否在指定部件上
   * @param x
   * @param y
   */
  public onTap(drawableId: number, x: number, y: number): boolean {
    // 使用getDrawableId获取当前模型管理器对对应的drawableId的命名id
    const id = this.getModel().getDrawableId(drawableId);
    // 判断点击坐标是否在对应图形组件上
    return this.isHit(id, x, y);
  }




  // 释放资源
  public releaseResources(): void {
    this._expressions.clear();
    this._motions.clear();
  }



  // 绘制模型的过程。传递要绘制模型的空间的视图投影矩阵。
  public draw(matrix: CubismMatrix44): void {
    if (this._model == null) {
      return;
    }

    // 各读取结束后
    matrix.multiplyByMatrix(this._modelMatrix);
    // 类继承方法
    this.getRenderer().setMvpMatrix(matrix);

    // 传递画布大小
    const canvas = this._canvas;
    const gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
    const frameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING)

    const viewport: number[] = [0, 0, canvas.width, canvas.height];

    this.getRenderer().setRenderState(frameBuffer, viewport);
    this.getRenderer().drawModel();

  }





  /**
   * 更新画面时的处理
   * 进行模型更新处理及描绘处理
   */
  public onUpdate(): void {
    const { width, height } = this._canvas;

    const projection: CubismMatrix44 = new CubismMatrix44();

    if (this.getModel().getCanvasWidth() > 1.0 && width < height) {
      // 在纵向窗口中显示横向较长的模型时，根据模型的横向尺寸计算scale
      this.getModelMatrix().setWidth(2.0);
      projection.scale(1.0, width / height);
    } else {
      projection.scale(height / width, 1.0);
    }

    // 在此处进行乘法运算
    if (this._viewMatrix != null) {
      projection.multiplyByMatrix(this._viewMatrix);
    }


    this.update();
    this.draw(projection);

  }




  public setViewMatrix(m: CubismMatrix44) {
    for (let i = 0; i < 16; i++) {
      this._viewMatrix.getArray()[i] = m.getArray()[i];
    }
  }




  //  检查Moc文件的一致性
  public async hasMocConsistencyFromFile() {
    CSM_ASSERT(this._modelSetting!.getModelFileName().localeCompare(``));
    const modelFileName = this._modelSetting!.getModelFileName();

    if (modelFileName == '') {
      throw new Error('Model data does not exist')
    }

    const modelFileBuffer = await window.electron.ipcRenderer.invoke('get_buffer', this._modelHomeDir, modelFileName)

    this._consistency = CubismMoc.hasMocConsistency(modelFileBuffer);
    this._consistency ? CubismLogInfo('Consistent MOC3.') : CubismLogInfo('Inconsistent MOC3.');

    return this._consistency;
  }




  public constructor(canvas: HTMLCanvasElement, clock: Clock) {
    super();


    this._canvas = canvas;
    this._modelHomeDir = null;

    this._viewMatrix = new CubismMatrix44();

    this._clock = clock;


    this._modelSetting = null;
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

    // 开启一致性验证
    this._mocConsistency = true;


    this._textureCount = 0;

    this._consistency = false;
  }

  _modelSetting: ICubismModelSetting | null; // 模型设置信息
  _modelHomeDir: string | null; // 模型相关文件所在的目录
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


  _textureCount: number; // 纹理计数


  _consistency: boolean; // MOC3一致性检查是否通过

  _canvas: HTMLCanvasElement;

  _viewMatrix: CubismMatrix44;

  _clock: Clock;
}

