import type { Model } from './model';
import type { CoordTransform } from './coordTransform';
import { noAudio, haveAudio } from './petTool';
import { evaluate } from 'mathjs';


export class ClickManage {
    // 开始点击时的y的值
    _startY: number;
    // 开始点击时的x的值
    _startX: number;
    // 结束点击时的y的值
    _lastY: number;
    // 结束点击时的x的值
    _lastX: number;
    // 鼠标左键是否是按下状态
    private _isPress: boolean;
    // 模型实例
    private _model: null | Model;
    // 坐标转换工具
    private _tool: CoordTransform
    // 画布id
    private _modelCanvas: HTMLCanvasElement;
    // 桌宠配置
    private _petConfig: PetConfig;
    // 存储被指定桌宠的文件路径
    private _petFilePath: string;
    // 音频ID
    private _audioId: string;
    // 画布物理像素缩放值
    // 以作为实现超采样手段 因为部分live2d文件存在不明原因的轻微模糊
    private _physicalScale: number

    constructor(model: Model, tool: CoordTransform, canvas: HTMLCanvasElement,
        petConfig: PetConfig, petFilePath: string, audioId: string, physicalScale: number
    ) {
        this._startY = 0;
        this._startX = 0;
        this._lastY = 0;
        this._lastX = 0;
        this._model = model;
        this._tool = tool;
        this._isPress = false;
        this._modelCanvas = canvas;
        this._petConfig = petConfig;
        this._petFilePath = petFilePath;
        this._audioId = audioId;
        this._physicalScale = physicalScale;
    }




    public clickStart(e: PointerEvent) {
        // 仅限左键
        if (e.button !== 0) { return; }

        this._modelCanvas.setPointerCapture(e.pointerId);
        this._startX = e.pageX;
        this._startY = e.pageY;
        this._lastX = e.pageX;
        this._lastY = e.pageY;
        this._isPress = true;
    }


    /**
     * 当鼠标指针移动时
     */
    public clickMove(e: PointerEvent) {
        if (this._isPress == false) { return; }

        // 变换坐标
        const { x, y } = this._tool.transformView(this._lastX, this._lastY);

        // 如果存在模型 执行拖拽操作
        if (this._model !== null) {
            this._model.onDrag(x, y);
        }


        // 鼠标点击/移动位置在目标元素内部的从元素左边开始算方向距离
        const rect = (e.target as Element).getBoundingClientRect();
        const posX: number = e.clientX - rect.left;
        const posY: number = e.clientY - rect.top;

        // 更新坐标
        this._lastX = posX;
        this._lastY = posY;

    }


    public async clickEnd(e: PointerEvent) {
        this._isPress = false;
        // 仅限左键
        if (e.button !== 0) { return; }
        this._modelCanvas.releasePointerCapture(e.pointerId)


        // 获取屏幕缩放比
        const devicePixelRatio = window.devicePixelRatio || 1;
        // 处理画布因系统缩放比 超采样 导致的坐标偏移
        const adjustX = evaluate(`${this._lastX} * ${devicePixelRatio} * ${this._physicalScale}`)
        const adjustY = evaluate(`${this._lastY} * ${devicePixelRatio} * ${this._physicalScale}`)

        // 变换坐标
        const { x, y } = this._tool.transformScreen(adjustX, adjustY);

        // 如果存在模型 结束拖拽操作 验证点击
        if (this._model !== null) {
            this._model.onDrag(0, 0);

            for (const item of this._petConfig?.touchList) {
                const flag = this._model.onTap(item.drawableId, x, y);
                if (flag) {
                    // 计算加权下标
                    const relationship = item.relationship;
                    // 随机动作
                    const index = relationship.length > 1 ? Math.floor(Math.random() * relationship.length) : 0;
                    // 暂存结构
                    const relationshipItem = item.relationship[index];
                    if (relationshipItem.audioName) {
                        await haveAudio(
                            this._model,
                            relationshipItem,
                            this._petConfig.defaultExpression,
                            this._petFilePath,
                            this._audioId
                        );
                    } else {
                        noAudio(this._model, relationshipItem, this._petConfig.defaultExpression);
                    }

                    break;

                }
            }

        }

        const rect = (e.target as Element).getBoundingClientRect();
        const posX: number = e.clientX - rect.left;
        const posY: number = e.clientY - rect.top;


        // 更新坐标
        this._lastX = posX;
        this._lastY = posY;

    }


}
